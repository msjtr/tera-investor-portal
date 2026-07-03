/**
 * ==========================================================
 * assets/js/auth.js – مدير المصادقة المركزي (Enterprise)
 * ==========================================================
 * - يعتمد على window.teraSupabase من supabase-client.js
 * - يوفر كائن TeraAuth مع دوال: login, logout, getUser, ...
 * - يستمع لتغيرات حالة المصادقة (onAuthStateChange)
 * - يُؤمّن الصفحات ويُحدّث واجهة المستخدم تلقائياً
 * - متوافق مع verify-otp.js وباقي ملفات النظام
 * - النسخة المُحدَّثة: مسارات ديناميكية، معالجة أخطاء محسّنة، توثيق JSDoc
 */

(function () {
    'use strict';

    // ========== ثوابت المسارات ==========
    const ROUTES = {
        LOGIN: '/auth/auth/login/login.html',
        DASHBOARD: '/pages/dashboard/index.html',
        RESET_PASSWORD: '/auth/reset-password.html',
        CHANGE_MOBILE: '/pages/security/change-mobile.html',
        VERIFY_OTP: '/auth/verify-otp.html',
        HOME: '/'
    };

    // ========== انتظار Supabase ==========
    /**
     * تنتظر حتى يصبح عميل Supabase جاهزاً
     * @returns {Promise<SupabaseClient>}
     */
    async function waitForSupabase() {
        if (window.teraSupabase) return window.teraSupabase;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Supabase timeout')), 15000);
            document.addEventListener('supabase:ready', (e) => {
                clearTimeout(timeout);
                resolve(e.detail.client);
            }, { once: true });
            document.addEventListener('supabase:error', () => {
                clearTimeout(timeout);
                reject(new Error('Supabase error'));
            }, { once: true });
        });
    }

    // ========== كائن TeraAuth العام ==========
    window.TeraAuth = {
        _client: null,
        _session: null,
        _user: null,
        _initialized: false,
        _subscription: null,

        /**
         * تهيئة المدير
         * @returns {Promise<void>}
         */
        init: async function () {
            if (this._initialized) return;
            this._initialized = true;

            try {
                this._client = await waitForSupabase();
            } catch (err) {
                console.warn('⚠️ [Auth] تعذر الاتصال بـ Supabase:', err.message);
                return;
            }

            // استمع لتغيرات المصادقة
            const { data: { subscription } } = this._client.auth.onAuthStateChange(
                (event, session) => {
                    console.log(`🔁 [Auth] تغير حالة المصادقة: ${event}`);
                    this._session = session;
                    this._user = session?.user ?? null;
                    this._updateUI();
                    document.dispatchEvent(new CustomEvent('auth:stateChanged', {
                        detail: { event, session, user: this._user }
                    }));
                }
            );
            this._subscription = subscription;

            // جلب الجلسة الحالية
            const { data: { session } } = await this._client.auth.getSession();
            this._session = session;
            this._user = session?.user ?? null;
            this._updateUI();

            console.log('🔒 [Auth] تم تأمين الواجهة');
        },

        /**
         * هل المستخدم مسجل الدخول؟
         * @returns {boolean}
         */
        isLoggedIn: function () {
            return !!this._session;
        },

        /**
         * تسجيل الدخول بالبريد وكلمة المرور
         * @param {string} email
         * @param {string} password
         * @returns {Promise<{data: any, error: any}>}
         */
        login: async function (email, password) {
            if (!this._client) throw new Error('Supabase غير متوفر');
            try {
                const { data, error } = await this._client.auth.signInWithPassword({ email, password });
                if (error) throw error;
                this._session = data.session;
                this._user = data.user;
                this._updateUI();
                return { data, error: null };
            } catch (error) {
                console.error('❌ [Auth] فشل تسجيل الدخول:', error);
                return { data: null, error };
            }
        },

        /**
         * تسجيل الخروج
         * @returns {Promise<void>}
         */
        logout: async function () {
            if (!this._client) return;
            try {
                await this._client.auth.signOut();
                this._session = null;
                this._user = null;
                this._updateUI();
                this.redirectTo(ROUTES.LOGIN);
            } catch (error) {
                console.error('❌ [Auth] فشل تسجيل الخروج:', error);
            }
        },

        /**
         * إعادة توجيه إلى صفحة
         * @param {string} url
         */
        redirectTo: function (url) {
            window.location.replace(url);
        },

        /**
         * جلب المستخدم الحالي (من الخادم)
         * @returns {Promise<import('@supabase/supabase-js').User|null>}
         */
        getUser: async function () {
            if (!this._client) return null;
            try {
                const { data: { user } } = await this._client.auth.getUser();
                this._user = user;
                this._updateUI();
                return user;
            } catch (error) {
                console.error('❌ [Auth] فشل جلب المستخدم:', error);
                return null;
            }
        },

        /**
         * جلب الجلسة الحالية
         * @returns {Promise<import('@supabase/supabase-js').Session|null>}
         */
        getSession: async function () {
            if (!this._client) return null;
            try {
                const { data: { session } } = await this._client.auth.getSession();
                this._session = session;
                return session;
            } catch (error) {
                console.error('❌ [Auth] فشل جلب الجلسة:', error);
                return null;
            }
        },

        /**
         * تحديث بيانات المستخدم الوصفية (metadata)
         * @param {Object} metadata
         * @returns {Promise<{data: any, error: any}>}
         */
        updateUserMetadata: async function (metadata) {
            if (!this._client) throw new Error('Supabase غير متوفر');
            try {
                const { data, error } = await this._client.auth.updateUser({ data: metadata });
                if (error) throw error;
                this._user = data.user;
                this._updateUI();
                return { data, error: null };
            } catch (error) {
                console.error('❌ [Auth] فشل تحديث البيانات:', error);
                return { data: null, error };
            }
        },

        /**
         * التحقق من صلاحية المستخدم (دور معين)
         * @param {string} role
         * @returns {boolean}
         */
        hasRole: function (role) {
            if (!this._user) return false;
            const userRole = this._user.user_metadata?.role || 'user';
            return userRole === role;
        },

        /**
         * تحديث واجهة المستخدم (اسم العميل، الصورة الرمزية)
         * @private
         */
        _updateUI: function () {
            const user = this._user;
            if (!user) {
                // إخفاء عناصر المستخدم إذا لم يكن مسجلاً
                const headerName = document.getElementById('headerUserName');
                const headerAvatar = document.getElementById('headerAvatar');
                if (headerName) headerName.textContent = 'زائر';
                if (headerAvatar) headerAvatar.textContent = 'ز';
                return;
            }

            const fullName = user.user_metadata?.full_name || user.email || 'مستخدم';
            const headerName = document.getElementById('headerUserName');
            const headerAvatar = document.getElementById('headerAvatar');

            if (headerName) headerName.textContent = fullName;
            if (headerAvatar) headerAvatar.textContent = fullName.charAt(0).toUpperCase();
        }
    };

    // ========== بدء التهيئة تلقائياً ==========
    document.addEventListener('DOMContentLoaded', function () {
        // لا نُهيئ في صفحات تسجيل الدخول أو الصفحات العامة (اختياري)
        const path = window.location.pathname;
        if (!path.includes('/auth/auth/login/') && !path.includes('/auth/register/')) {
            window.TeraAuth.init();
        }
    });
})();
