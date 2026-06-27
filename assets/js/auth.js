/**
 * ============================================================
 * auth.js - محرك المصادقة والحماية الذكي (متوافق مع Supabase)
 * ============================================================
 * - يعتمد على Supabase لإدارة الجلسات والمستخدمين
 * - يتزامن مع localStorage لتوفير توافق مع الأنظمة القائمة
 * - يحسب المسارات النسبية بذكاء لتجنب أخطاء التوجيه
 * - يدعم البيئات المحلية وبيئة الخادم (Render)
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
            _supabaseReady: false,

            // انتظار تحميل عميل Supabase العالمي
            waitForSupabase: function() {
                return new Promise((resolve, reject) => {
                    if (window.teraSupabase) {
                        this._supabaseReady = true;
                        resolve(window.teraSupabase);
                        return;
                    }
                    const handler = (e) => {
                        document.removeEventListener('supabase:ready', handler);
                        document.removeEventListener('supabase:error', errorHandler);
                        this._supabaseReady = true;
                        resolve(e.detail.client);
                    };
                    const errorHandler = () => {
                        document.removeEventListener('supabase:ready', handler);
                        document.removeEventListener('supabase:error', errorHandler);
                        reject(new Error('فشل الاتصال بـ Supabase'));
                    };
                    document.addEventListener('supabase:ready', handler);
                    document.addEventListener('supabase:error', errorHandler);
                    // حد أقصى للانتظار 5 ثوانٍ
                    setTimeout(() => {
                        document.removeEventListener('supabase:ready', handler);
                        document.removeEventListener('supabase:error', errorHandler);
                        reject(new Error('انتهت مهلة انتظار Supabase'));
                    }, 5000);
                });
            },

            // مزامنة جلسة Supabase مع localStorage
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

            // استرجاع الجلسة الحالية من Supabase مباشرة
            getCurrentSession: async function() {
                const supabase = await this.waitForSupabase().catch(() => null);
                if (!supabase) return null;
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) return null;
                return session;
            },

            // ---- وظائف المسارات ----
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

            getRelativePath: function(targetPath) {
                const path = this.getCurrentPath();
                let depth = 0;
                if (path.includes('/pages/')) depth = 2;
                else if (path.includes('/auth/auth/')) depth = 3;
                else if (path.includes('/auth/')) depth = 2;
                return '../'.repeat(depth) + targetPath;
            },

            redirectTo: function(url) {
                if (this.getCurrentPath() === url) return;
                window.location.replace(url);
            },

            // ---- إدارة الجلسة ----
            checkSession: async function() {
                if (this._blockCheck) return;

                const now = Date.now();
                if (this._isChecking || now - this._lastCheckTime < 500) return;

                this._isChecking = true;
                this._lastCheckTime = now;

                try {
                    const currentPath = this.getCurrentPath();
                    const isAuth = this.isAuthPage(currentPath);
                    const isProtected = this.isProtectedPage(currentPath);
                    const isLanding = this.isLandingPage(currentPath);

                    // الحصول على الجلسة الحالية من Supabase
                    const session = await this.getCurrentSession();
                    const loggedIn = !!session;

                    // تحديث بيانات localStorage لتكون متزامنة
                    await this.syncSession(session);

                    if (!loggedIn && isProtected) {
                        console.log('🔐 [Auth] غير مسجل -> تحويل لصفحة الدخول');
                        this.redirectTo(this.getRelativePath('auth/auth/login/login.html'));
                        return;
                    }

                    if (loggedIn && (isAuth || isLanding)) {
                        console.log('🚀 [Auth] مسجل دخول -> تحويل للوحة التحكم');
                        this.redirectTo(this.getRelativePath('pages/dashboard/index.html'));
                        return;
                    }

                    console.log('✅ [Auth] الجلسة آمنة في المسار:', currentPath);
                } catch (error) {
                    console.warn('⚠️ [Auth] خطأ أثناء فحص الجلسة:', error);
                } finally {
                    this._isChecking = false;
                }
            },

            // ---- وظائف تسجيل الدخول / الخروج ----
            login: async function(email, password) {
                const supabase = await this.waitForSupabase();
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                await this.syncSession(data.session);
                this.enableAutoRedirect();
                this.unblockCheck();

                return {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.full_name || '',
                    role: 'partner'
                };
            },

            logout: async function() {
                const supabase = await this.waitForSupabase().catch(() => null);
                if (supabase) {
                    await supabase.auth.signOut();
                }
                localStorage.removeItem('tera_token');
                localStorage.removeItem('tera_user');
                localStorage.removeItem('tera_remember');
                localStorage.removeItem('tera_identifier');
                sessionStorage.clear();
                this.redirectTo(this.getRelativePath('auth/auth/login/login.html'));
            },

            // ---- أدوات التحكم ----
            blockCheck: function() { this._blockCheck = true; },
            unblockCheck: function() { this._blockCheck = false; },
            disableAutoRedirect: function() { this._isChecking = true; },
            enableAutoRedirect: function() { this._isChecking = false; },

            // ---- استعلامات الحالة ----
            isLoggedIn: function() {
                // فحص سريع عبر localStorage (يكفي للفحص الفوري)
                return !!localStorage.getItem('tera_token');
            },

            getCurrentUser: function() {
                try {
                    const userData = localStorage.getItem('tera_user');
                    return userData ? JSON.parse(userData) : null;
                } catch {
                    return null;
                }
            },

            // ---- تحسينات الواجهة ----
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
                    if (icon) icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
                });
                window._passwordToggleInitialized = true;
            }
        };

        // ---- التهيئة عند تحميل الصفحة ----
        async function initAuth() {
            const currentPage = window.location.pathname;

            // انتظر قليلاً حتى يتم تعريف Supabase (إن لم يكن جاهزاً بعد)
            if (!window.teraSupabase) {
                try {
                    await TeraAuth.waitForSupabase();
                } catch (e) {
                    console.error('❌ [Auth] تعذر الاتصال بـ Supabase عند بدء التشغيل');
                    // لا نوقف التطبيق، ربما الصفحة لا تحتاج مصادقة
                }
            }

            // استمع لتغييرات حالة المصادقة من Supabase مستقبلاً
            if (window.teraSupabase) {
                window.teraSupabase.auth.onAuthStateChange(async (event, session) => {
                    console.log(`🔁 [Auth] تغير حالة المصادقة: ${event}`);
                    await TeraAuth.syncSession(session);
                    // إذا حدث تسجيل خروج مفاجئ، نفحص الجلسة مجدداً
                    if (event === 'SIGNED_OUT') {
                        TeraAuth.checkSession();
                    }
                });
            }

            if (TeraAuth.isAuthPage(currentPage)) {
                TeraAuth.disableAutoRedirect();
                TeraAuth.blockCheck();
                console.log('🔒 [Auth] صفحة مصادقة: تم تأمين الواجهة');
            } else {
                TeraAuth.checkSession();
            }

            TeraAuth.initPasswordToggles();
        }

        // تشغيل التهيئة
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAuth);
        } else {
            initAuth();
        }

        // ربط الكائن العام
        window.TeraAuth = TeraAuth;
        window.isUserLoggedIn = TeraAuth.isLoggedIn.bind(TeraAuth);
        window.getCurrentUser = TeraAuth.getCurrentUser.bind(TeraAuth);

    })();
}
