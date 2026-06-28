/**
 * ============================================================
 * auth.js - محرك المصادقة والحماية الذكي (النسخة المؤسسية - Enterprise)
 * ============================================================
 * - ربط حقيقي بـ Supabase Auth دون أي محاكاة أو بيانات وهمية.
 * - مزامنة حية للجلسات وتسجيل حركات الدخول في جدول auth_login.
 * - يعتمد حصراً على المسارات المطلقة (Absolute Paths) لحل مشاكل التوجيه.
 * - يعتمد على window.getTeraSupabase() لضمان الاتصال الآمن والمستقر.
 */
'use strict';

// منع إعادة التحميل في تطبيقات الصفحة الواحدة
if (typeof window.TeraAuth !== 'undefined') {
    console.log('✅ [Auth] تم تحميل المحرك مسبقاً، تم تخطي إعادة التحميل.');
} else {
    (function() {

        const TeraAuth = {
            _isChecking: false,
            _lastCheckTime: 0,
            _blockCheck: false,

            // ---- ١. وظائف المسارات والبيئة ----
            getCurrentPath: function() {
                return window.location.pathname;
            },

            isAuthPage: function(path = this.getCurrentPath()) {
                return path.includes('/auth/');
            },

            isProtectedPage: function(path = this.getCurrentPath()) {
                return path.includes('/pages/');
            },

            isLandingPage: function(path = this.getCurrentPath()) {
                return !this.isAuthPage(path) && !this.isProtectedPage(path);
            },

            /**
             * استخدام المسارات المطلقة لضمان دقة التوجيه من أي مسار فرعي
             * يمنع مشاكل 404 عند استدعاء الملفات
             */
            getAbsolutePath: function(targetPath) {
                return targetPath.startsWith('/') ? targetPath : '/' + targetPath;
            },

            redirectTo: function(url) {
                if (this.getCurrentPath() === url) return; // منع التكرار
                window.location.replace(url);
            },

            // ---- ٢. مزامنة الجلسة الحقيقية مع localStorage ----
            syncSession: async function(session) {
                if (session) {
                    localStorage.setItem('tera_token', session.access_token);
                    const user = session.user;
                    if (user) {
                        // استخراج البيانات الحقيقية من الميتا داتا بدون بيانات وهمية
                        localStorage.setItem('tera_user', JSON.stringify({
                            id: user.id,
                            email: user.email,
                            name: user.user_metadata?.full_name || 'مستثمر',
                            role: user.user_metadata?.role || 'user', // جلب الصلاحية الفعلية
                            status: 'active'
                        }));
                    }
                } else {
                    localStorage.removeItem('tera_token');
                    localStorage.removeItem('tera_user');
                }
            },

            // استرجاع الجلسة الحالية من Supabase الفعلي
            getCurrentSession: async function() {
                if (!window.teraSupabase) return null;
                const { data, error } = await window.teraSupabase.auth.getSession();
                if (error) return null;
                return data.session;
            },

            // ---- ٣. فحص الجلسة والتوجيه الآمن ----
            checkSession: async function() {
                // تجنب التكرار أو الفحص المتزامن
                if (this._blockCheck) {
                    console.log('⛔ [Auth] تم تعليق الفحص لهذه الصفحة');
                    return;
                }

                const now = Date.now();
                if (this._isChecking || now - this._lastCheckTime < 500) return;

                this._isChecking = true;
                this._lastCheckTime = now;

                try {
                    const currentPath = this.getCurrentPath();
                    const isAuth = this.isAuthPage(currentPath);
                    const isProtected = this.isProtectedPage(currentPath);
                    const isLanding = this.isLandingPage(currentPath);

                    const session = await this.getCurrentSession();
                    await this.syncSession(session);

                    const loggedIn = !!session;

                    if (!loggedIn && isProtected) {
                        console.log('🔐 [Auth] غير مسجل → تحويل إلى صفحة الدخول بالمسار المطلق');
                        this.redirectTo(this.getAbsolutePath('auth/login.html'));
                        return;
                    }

                    if (loggedIn && (isAuth || isLanding)) {
                        console.log('🚀 [Auth] مسجل دخول → تحويل إلى لوحة التحكم');
                        this.redirectTo(this.getAbsolutePath('pages/dashboard/index.html'));
                        return;
                    }

                    console.log('✅ [Auth] الجلسة آمنة، المسار:', currentPath);
                } catch (error) {
                    console.error('⚠️ [Auth] خطأ في التحقق من الجلسة المؤسسية:', error);
                } finally {
                    this._isChecking = false;
                }
            },

            // ---- ٤. تسجيل الدخول الحقيقي المؤسسي ----
            login: async function(email, password) {
                if (!window.teraSupabase) throw new Error('Supabase غير جاهز');
                
                // 1. المصادقة الفعلية
                const { data, error } = await window.teraSupabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    // تسجيل محاولة الدخول الفاشلة أمنياً (اختياري إذا رغبت بالاعتماد على الايميل فقط هنا)
                    throw error;
                }

                // 2. تسجيل الحدث الفعلي في جدول auth_login المؤسسي
                const user = data.user;
                try {
                    await window.teraSupabase.from('auth_login').insert([{
                        user_id: user.id,
                        email: user.email,
                        login_status: 'success',
                        browser: navigator.userAgent,
                        operating_system: navigator.platform
                    }]);
                } catch (logError) {
                    console.error('⚠️ [Auth] تعذر كتابة سجل الدخول:', logError);
                }

                // 3. مزامنة وتوجيه
                await this.syncSession(data.session);
                this.unblockCheck();
                this.enableAutoRedirect();

                return {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || '',
                    role: user.user_metadata?.role || 'user'
                };
            },

            logout: async function() {
                if (window.teraSupabase) {
                    await window.teraSupabase.auth.signOut();
                }
                localStorage.removeItem('tera_token');
                localStorage.removeItem('tera_user');
                localStorage.removeItem('tera_remember');
                localStorage.removeItem('tera_identifier');
                sessionStorage.clear();
                
                // توجيه باستخدام مسار مطلق دقيق
                this.redirectTo(this.getAbsolutePath('auth/login.html'));
            },

            // ---- ٥. أدوات تحكم إضافية ----
            blockCheck: function() {
                this._blockCheck = true;
            },

            unblockCheck: function() {
                this._blockCheck = false;
            },

            disableAutoRedirect: function() {
                this._isChecking = true;
            },

            enableAutoRedirect: function() {
                this._isChecking = false;
            },

            // ---- ٦. استعلامات سريعة ----
            isLoggedIn: function() {
                return !!localStorage.getItem('tera_token');
            },

            getCurrentUser: function() {
                try {
                    return JSON.parse(localStorage.getItem('tera_user'));
                } catch {
                    return null;
                }
            },

            // ---- ٧. تحسينات الواجهة (كلمة المرور) ----
            initPasswordToggles: function() {
                if (window._passwordToggleInitialized) return;

                document.addEventListener('click', function(e) {
                    const toggleBtn = e.target.closest('.password-toggle, .toggle-password, .show-password-btn');
                    if (!toggleBtn) return;

                    const wrapper = toggleBtn.closest('.password-wrapper, .input-group, .form-group, .input-wrapper');
                    if (!wrapper) return;

                    const input = wrapper.querySelector('input[type="password"], input[type="text"]');
                    if (!input) return;

                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';

                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
                    }
                });

                window._passwordToggleInitialized = true;
            }
        };

        // ---- ٨. التهيئة التلقائية عند تحميل الصفحة ----
        async function initAuth() {
            const currentPage = window.location.pathname;

            try {
                // انتظار توفر عميل Supabase بشكل آمن ومتزامن
                await window.getTeraSupabase();

                // الاستماع لتغييرات حالة المصادقة من Supabase الفعلي
                window.teraSupabase.auth.onAuthStateChange(async (event, session) => {
                    console.log(`🔁 [Auth] تغير حالة المصادقة: ${event}`);
                    await TeraAuth.syncSession(session);
                    if (event === 'SIGNED_OUT') {
                        TeraAuth.checkSession();
                    }
                });

                // تنفيذ منطق التوجيه الأولي حسب نوع الصفحة
                if (TeraAuth.isAuthPage(currentPage)) {
                    TeraAuth.disableAutoRedirect();
                    TeraAuth.blockCheck();
                    console.log('🔒 [Auth] صفحة مصادقة: تم تأمين الواجهة لمنع التكرار اللانهائي');
                } else {
                    TeraAuth.checkSession();
                }

                // تفعيل زر إظهار كلمة المرور
                TeraAuth.initPasswordToggles();

            } catch (error) {
                console.error('❌ [Auth] تعذر الاتصال بـ Supabase:', error);
            }
        }

        // تشغيل التهيئة
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAuth);
        } else {
            initAuth();
        }

        // ربط النطاق العام للمنصة
        window.TeraAuth = TeraAuth;
        window.isUserLoggedIn = TeraAuth.isLoggedIn.bind(TeraAuth);
        window.getCurrentUser = TeraAuth.getCurrentUser.bind(TeraAuth);

    })();
}
