/**
 * ==========================================================
 * Tera Investor Portal
 * Enterprise Authentication Engine
 * Version 2.0
 * يعتمد على Supabase JS v2
 * ==========================================================
 */

'use strict';

if (window.TeraAuth) {
    console.log('✅ [Auth] المحرك محمل مسبقاً.');
} else {

(function () {

    const LOGIN_PAGE = '/auth/auth/login/login.html';
    const DASHBOARD_PAGE = '/pages/dashboard/index.html';

    const TeraAuth = {

        supabase: null,

        initialized: false,

        /**
         * انتظار جاهزية Supabase
         */
        async init() {

            if (this.initialized) return;

            this.supabase = await waitForSupabase();

            this.initialized = true;

            console.log('✅ [Auth] تمت تهيئة محرك المصادقة.');

            this.listenAuth();

        },

        /**
         * الصفحة الحالية
         */
        currentPath() {

            return window.location.pathname;

        },

        /**
         * هل الصفحة صفحة تسجيل؟
         */
        isLoginPage() {

            return this.currentPath().includes('/auth/');

        },

        /**
         * هل الصفحة محمية؟
         */
        isProtectedPage() {

            return this.currentPath().includes('/pages/');

        },

        /**
         * تحويل آمن
         */
        redirect(url) {

            if (window.location.pathname === url)
                return;

            window.location.replace(url);

        },

        /**
         * الحصول على الجلسة الحالية
         */
        async getSession() {

            const {

                data,
                error

            } = await this.supabase.auth.getSession();

            if (error)
                return null;

            return data.session;

        },

        /**
         * الحصول على المستخدم الحالي
         */
        async getUser() {

            const session = await this.getSession();

            if (!session)
                return null;

            return session.user;

        },

        /**
         * هل المستخدم مسجل؟
         */
        async isLoggedIn() {

            return !!(await this.getSession());

        },

        /**
         * فحص صلاحية الصفحة
         */
        async checkProtection() {

            const logged = await this.isLoggedIn();

            if (!logged && this.isProtectedPage()) {

                console.warn(
                    '🔐 صفحة محمية بدون جلسة.'
                );

                this.redirect(LOGIN_PAGE);

                return;

            }

            if (logged && this.isLoginPage()) {

                console.log(
                    '🚀 المستخدم مسجل مسبقاً.'
                );

                this.redirect(DASHBOARD_PAGE);

                return;

            }

            console.log(
                '✅ [Auth] الجلسة سليمة.'
            );

        },

                /**
         * ==========================================
         * تسجيل الدخول
         * ==========================================
         */
        async login(email, password) {

            const { data, error } =
                await this.supabase.auth.signInWithPassword({

                    email: email.trim(),

                    password: password

                });

            if (error) {

                console.error(
                    '❌ فشل تسجيل الدخول',
                    error
                );

                throw error;

            }

            console.log(
                '✅ تم تسجيل الدخول',
                data.user.email
            );

            // تسجيل سجل الدخول (اختياري)
            try {

                await this.supabase
                    .from('auth_login')
                    .insert({

                        user_id: data.user.id,

                        email: data.user.email,

                        login_status: 'success',

                        browser: navigator.userAgent,

                        operating_system: navigator.platform

                    });

            } catch (e) {

                console.warn(
                    '⚠️ تعذر تسجيل سجل الدخول',
                    e
                );

            }

            return data.user;

        },

        /**
         * ==========================================
         * تسجيل الخروج
         * ==========================================
         */
        async logout() {

            await this.supabase.auth.signOut();

            console.log(
                '🚪 تم تسجيل الخروج'
            );

            this.redirect(LOGIN_PAGE);

        },

        /**
         * ==========================================
         * المستخدم الحالي
         * ==========================================
         */
        async currentUser() {

            const user =
                await this.getUser();

            if (!user)
                return null;

            return {

                id: user.id,

                email: user.email,

                name:
                    user.user_metadata?.full_name ??
                    'مستخدم',

                role:
                    user.user_metadata?.role ??
                    'user',

                mobile:
                    user.user_metadata?.mobile_number ??
                    null

            };

        },

        /**
         * ==========================================
         * تحديث بيانات المستخدم
         * ==========================================
         */
        async refreshUser() {

            const {

                data,

                error

            } =
            await this.supabase.auth.getUser();

            if (error)
                return null;

            return data.user;

        },

        /**
         * ==========================================
         * تغيير كلمة المرور
         * ==========================================
         */
        async updatePassword(password) {

            const {

                error

            } =
            await this.supabase.auth.updateUser({

                password

            });

            if (error)
                throw error;

            return true;

        },

        /**
         * ==========================================
         * تغيير البريد (الطريقة الرسمية)
         * ==========================================
         */
        async updateEmail(email) {

            const {

                error

            } =
            await this.supabase.auth.updateUser({

                email

            });

            if (error)
                throw error;

            return true;

        },

                /**
         * ==========================================
         * مراقبة تغير حالة المصادقة
         * ==========================================
         */
        listenAuth() {

            this.supabase.auth.onAuthStateChange(async (event, session) => {

                console.log(`🔁 [Auth] ${event}`);

                switch (event) {

                    case 'INITIAL_SESSION':
                        await this.checkProtection();
                        break;

                    case 'SIGNED_IN':
                        console.log('✅ تم تسجيل الدخول');
                        break;

                    case 'SIGNED_OUT':
                        console.log('🚪 تم تسجيل الخروج');

                        if (this.isProtectedPage()) {
                            this.redirect(LOGIN_PAGE);
                        }

                        break;

                    case 'TOKEN_REFRESHED':
                        console.log('🔄 تم تحديث الجلسة');
                        break;

                    case 'USER_UPDATED':
                        console.log('👤 تم تحديث المستخدم');
                        break;
                }

            });

        },

        /**
         * ==========================================
         * إظهار / إخفاء كلمة المرور
         * ==========================================
         */
        initPasswordToggle() {

            document.addEventListener('click', function (e) {

                const btn = e.target.closest(
                    '.password-toggle,.toggle-password,.show-password-btn'
                );

                if (!btn) return;

                const wrapper = btn.closest(
                    '.password-wrapper,.input-group,.form-group,.input-wrapper'
                );

                if (!wrapper) return;

                const input = wrapper.querySelector('input');

                if (!input) return;

                const visible = input.type === 'password';

                input.type = visible ? 'text' : 'password';

                const icon = btn.querySelector('i');

                if (icon) {
                    icon.className = visible
                        ? 'fa-solid fa-eye-slash'
                        : 'fa-solid fa-eye';
                }

            });

        }

    };

    /**
     * ==========================================
     * Bootstrap
     * ==========================================
     */

    async function bootstrap() {

        try {

            await TeraAuth.init();

            await TeraAuth.checkProtection();

            TeraAuth.initPasswordToggle();

            console.log('✅ [Auth] Enterprise Engine Ready');

        } catch (err) {

            console.error('❌ [Auth]', err);

        }

    }

    if (document.readyState === 'loading') {

        document.addEventListener(
            'DOMContentLoaded',
            bootstrap
        );

    } else {

        bootstrap();

    }

    window.TeraAuth = TeraAuth;

    window.isUserLoggedIn = async function () {

        return await TeraAuth.isLoggedIn();

    };

    window.getCurrentUser = async function () {

        return await TeraAuth.currentUser();

    };

})();
}
