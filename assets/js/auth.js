/**
 * ==========================================================
 * assets/js/auth.js – مدير المصادقة المركزي (Enterprise)
 * ==========================================================
 * - يعتمد على window.teraSupabase من supabase-client.js
 * - يوفر كائن TeraAuth مع دوال: login, logout, getUser, ...
 * - يستمع لتغيرات حالة المصادقة (onAuthStateChange)
 * - يُؤمّن الصفحات ويُحدّث واجهة المستخدم تلقائياً
 * - متوافق مع verify-otp.js وباقي ملفات النظام
 */

(function () {
    'use strict';

    // ========== انتظار Supabase ==========
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

        /**
         * تهيئة المدير
         */
        init: async function () {
            if (this._initialized) return;
            this._initialized = true;

            try {
                this._client = await waitForSupabase();
            } catch (err) {
                console.warn('⚠️ [Auth] تعذر الاتصال بـ Supabase.');
                return;
            }

            // استمع لتغيرات المصادقة
            const { data: { subscription } } = this._client.auth.onAuthStateChange(
                (event, session) => {
                    console.log(`🔁 [Auth] تغير حالة المصادقة: ${event}`);
                    this._session = session;
                    this._user = session?.user ?? null;

                    // تحديث واجهة المستخدم (إن وُجدت)
                    this._updateUI();

                    // إذا تم تسجيل الدخول، يمكن إطلاق حدث مخصص
                    document.dispatchEvent(new CustomEvent('auth:stateChanged', {
                        detail: { event, session, user: this._user }
                    }));
                }
            );

            // جلب الجلسة الحالية عند التحميل
            const { data: { session } } = await this._client.auth.getSession();
            this._session = session;
            this._user = session?.user ?? null;

            console.log('🔒 [Auth] تم تأمين الواجهة');
        },

        /**
         * هل المستخدم مسجل الدخول؟
         */
        isLoggedIn: function () {
            return !!this._session;
        },

        /**
         * تسجيل الدخول بالبريد وكلمة المرور
         */
        login: async function (email, password) {
            if (!this._client) throw new Error('Supabase غير متوفر');
            const { data, error } = await this._client.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            this._session = data.session;
            this._user = data.user;
            return data;
        },

        /**
         * تسجيل الخروج
         */
        logout: async function () {
            if (!this._client) return;
            await this._client.auth.signOut();
            this._session = null;
            this._user = null;
            window.location.replace('/auth/auth/login/login.html');
        },

        /**
         * إعادة توجيه إلى صفحة
         */
        redirectTo: function (url) {
            window.location.replace(url);
        },

        /**
         * جلب المستخدم الحالي
         */
        getUser: async function () {
            if (!this._client) return null;
            const { data: { user } } = await this._client.auth.getUser();
            this._user = user;
            return user;
        },

        /**
         * جلب الجلسة الحالية
         */
        getSession: async function () {
            if (!this._client) return null;
            const { data: { session } } = await this._client.auth.getSession();
            this._session = session;
            return session;
        },

        /**
         * تحديث واجهة المستخدم (اسم العميل، الصورة الرمزية)
         */
        _updateUI: function () {
            const user = this._user;
            if (!user) return;

            const fullName = user.user_metadata?.full_name || user.email || 'مستخدم';
            const headerName = document.getElementById('headerUserName');
            const headerAvatar = document.getElementById('headerAvatar');

            if (headerName) headerName.textContent = fullName;
            if (headerAvatar) headerAvatar.textContent = fullName.charAt(0).toUpperCase();
        }
    };

    // ========== بدء التهيئة تلقائياً ==========
    document.addEventListener('DOMContentLoaded', function () {
        // لا نُهيئ إذا كنا في صفحة تسجيل الدخول أو صفحات لا تحتاج Auth (اختياري)
        if (!window.location.pathname.includes('/auth/auth/login/')) {
            window.TeraAuth.init();
        }
    });
})();
