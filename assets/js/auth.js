/**
 * ============================================================
 * auth.js - محرك المصادقة والحماية الذكي (النسخة الكاملة)
 * ============================================================
 * - يدعم Supabase Auth ويتزامن مع localStorage
 * - يحسب المسارات النسبية تلقائياً (يمنع أخطاء 404 و Redirect Loops)
 * - يستمع لتغييرات حالة المصادقة (SIGNED_IN / SIGNED_OUT)
 * - يتوافق مع البيئة المحلية وبيئة الخادم (Render)
 * - صُمم للعمل مع نظام التسجيل عبر Trigger (حالة pending بعد signUp)
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
             * حساب المسار النسبي للوصول إلى ملف معين من أي عمق.
             * يعتمد على تحليل المسار الحالي لتوليد "../../" المناسبة.
             */
            getRelativePath: function(targetPath) {
                const path = this.getCurrentPath();
                let depth = 0;

                if (path.includes('/pages/')) {
                    depth = 2; // مجلد فرعي داخل pages (مثل dashboard)
                } else if (path.includes('/auth/auth/')) {
                    depth = 3; // مجلد مزدوج مثل auth/login
                } else if (path.includes('/auth/')) {
                    depth = 2; // مجلد auth الرئيسي
                }

                return '../'.repeat(depth) + targetPath;
            },

            redirectTo: function(url) {
                if (this.getCurrentPath() === url) return; // منع التكرار
                window.location.replace(url);
            },

            // ---- ٢. مزامنة الجلسة مع localStorage ----
            syncSession: async function(session) {
                if (session) {
                    localStorage.setItem('tera_token', session.access_token);
                    const user = session.user;
                    if (user) {
                        localStorage.setItem('tera_user', JSON.stringify({
                            id: user.id,
                            email: user.email,
                            name: user.user_metadata?.full_name || '',
                            role: 'partner'
                        }));
                    }
                } else {
                    localStorage.removeItem('tera_token');
                    localStorage.removeItem('tera_user');
                }
            },

            // استرجاع الجلسة الحالية من Supabase
            getCurrentSession: async function() {
                if (!window.teraSupabase) return null;
                const { data, error } = await window.teraSupabase.auth.getSession();
                if (error) return null;
                return data.session;
            },

            // ---- ٣. فحص الجلسة والتوجيه ----
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
                        console.log('🔐 [Auth] غير مسجل → تحويل إلى صفحة الدخول');
                        this.redirectTo(this.getRelativePath('auth/auth/login/login.html'));
                        return;
                    }

                    if (loggedIn && (isAuth || isLanding)) {
                        console.log('🚀 [Auth] مسجل دخول → تحويل إلى لوحة التحكم');
                        this.redirectTo(this.getRelativePath('pages/dashboard/index.html'));
                        return;
                    }

                    console.log('✅ [Auth] الجلسة آمنة، المسار:', currentPath);
                } catch (error) {
                    console.warn('⚠️ [Auth] خطأ أثناء فحص الجلسة:', error);
                } finally {
                    this._isChecking = false;
                }
            },

            // ---- ٤. تسجيل الدخول / الخروج ----
            login: async function(email, password) {
                if (!window.teraSupabase) throw new Error('Supabase غير جاهز');
                const { data, error } = await window.teraSupabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                await this.syncSession(data.session);
                this.unblockCheck();
                this.enableAutoRedirect();

                return {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.full_name || '',
                    role: 'partner'
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
                this.redirectTo(this.getRelativePath('auth/auth/login/login.html'));
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

                    const wrapper = toggleBtn.closest('.password-wrapper, .input-group, .form-group');
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

            // انتظار توفر عميل Supabase (في حال لم يكن جاهزاً بعد)
            if (!window.teraSupabase) {
                try {
                    await new Promise((resolve, reject) => {
                        const handler = (e) => resolve(e.detail.client);
                        const errorHandler = () => reject(new Error('supabase:error'));
                        document.addEventListener('supabase:ready', handler, { once: true });
                        document.addEventListener('supabase:error', errorHandler, { once: true });
                        setTimeout(() => reject(new Error('Timeout waiting for Supabase')), 5000);
                    });
                } catch (e) {
                    console.error('❌ [Auth] تعذر الاتصال بـ Supabase:', e);
                }
            }

            // الاستماع لتغييرات حالة المصادقة من Supabase
            if (window.teraSupabase) {
                window.teraSupabase.auth.onAuthStateChange(async (event, session) => {
                    console.log(`🔁 [Auth] تغير حالة المصادقة: ${event}`);
                    await TeraAuth.syncSession(session);
                    if (event === 'SIGNED_OUT') {
                        TeraAuth.checkSession();
                    }
                });
            }

            // تنفيذ منطق التوجيه الأولي حسب نوع الصفحة
            if (TeraAuth.isAuthPage(currentPage)) {
                TeraAuth.disableAutoRedirect();
                TeraAuth.blockCheck();
                console.log('🔒 [Auth] صفحة مصادقة: تم تأمين الواجهة لمنع التكرار');
            } else {
                TeraAuth.checkSession();
            }

            // تفعيل زر إظهار كلمة المرور
            TeraAuth.initPasswordToggles();
        }

        // تشغيل التهيئة
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAuth);
        } else {
            initAuth();
        }

        // ربط النطاق العام
        window.TeraAuth = TeraAuth;
        window.isUserLoggedIn = TeraAuth.isLoggedIn.bind(TeraAuth);
        window.getCurrentUser = TeraAuth.getCurrentUser.bind(TeraAuth);

    })();
}
