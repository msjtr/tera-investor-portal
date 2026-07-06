/**
 * ==========================================================
 * assets/js/auth.js – مدير المصادقة المركزي (Enterprise)
 * ==========================================================
 * - يعتمد على window.teraSupabase من supabase-client.js
 * - يوفر كائن TeraAuth مع دوال: login, logout, getUser, ...
 * - يستمع لتغيرات حالة المصادقة (onAuthStateChange)
 * - يُؤمّن الصفحات ويُحدّث واجهة المستخدم تلقائياً
 * - متوافق مع verify-otp.js وباقي ملفات النظام
 * - النسخة المُحدَّثة: مسارات ديناميكية، معالجة أخطاء محسّنة، تسجيل جلسات الدخول
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

    // ========== توليد رقم الجلسة ==========
    function generateSessionNumber() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const random = Math.floor(Math.random() * 900000) + 100000; // 6 أرقام
        return `SES-${dateStr}-${random}`;
    }

    // ========== تسجيل جلسة دخول جديدة ==========
    /**
     * تسجل دخول المستخدم الحالي في جدول user_login_sessions
     * @param {SupabaseClient} client - عميل Supabase
     * @param {import('@supabase/supabase-js').User} user - المستخدم
     */
    async function recordLoginSession(client, user) {
        if (!client || !user) return;

        try {
            // 1. تعيين الجلسات النشطة السابقة إلى logged_out (أو إنهاء)
            await client
                .from('user_login_sessions')
                .update({
                    is_current_session: false,
                    status: 'logged_out',
                    logout_reason: 'تسجيل الدخول من جهاز آخر',
                    logout_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('status', 'active');

            // 2. إنشاء جلسة جديدة
            const sessionNumber = generateSessionNumber();

            // معلومات الجهاز والمتصفح
            const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' :
                               /tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'computer';
            const browserName = (navigator.userAgentData?.brands?.[0]?.brand) ||
                                (navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/?\s*([\d.]+)/i)?.[1]) ||
                                'غير معروف';
            const browserVersion = navigator.userAgentData?.brands?.[0]?.version ||
                                   navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/?\s*([\d.]+)/i)?.[2] ||
                                   '';
            const os = navigator.platform || '';
            const screenRes = `${window.screen.width}x${window.screen.height}`;
            const lang = navigator.language || '';

            const { error } = await client.from('user_login_sessions').insert({
                user_id: user.id,
                session_number: sessionNumber,
                login_at: new Date().toISOString(),
                status: 'active',
                is_current_session: true,
                device_type: deviceType,
                device_name: navigator.userAgentData?.platform || '',
                device_brand: navigator.userAgentData?.brands?.[0]?.brand || '',
                operating_system: os,
                os_version: '',
                browser_name: browserName,
                browser_version: browserVersion,
                screen_resolution: screenRes,
                language: lang,
                last_activity_at: new Date().toISOString(),
                // سيتم تحديث IP والموقع الجغرافي لاحقاً بخدمة خارجية (اختياري)
            });

            if (error) {
                console.warn('⚠️ [Auth] فشل تسجيل جلسة الدخول:', error.message);
            } else {
                console.log('✅ [Auth] تم تسجيل جلسة دخول جديدة:', sessionNumber);
            }
        } catch (err) {
            console.error('❌ [Auth] خطأ في تسجيل الجلسة:', err);
        }
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

                    // عند تسجيل الدخول (SIGNED_IN) نسجل الجلسة
                    if (event === 'SIGNED_IN' && session?.user) {
                        recordLoginSession(this._client, session.user);
                    }
                }
            );
            this._subscription = subscription;

            // جلب الجلسة الحالية
            const { data: { session } } = await this._client.auth.getSession();
            this._session = session;
            this._user = session?.user ?? null;
            this._updateUI();

            // إذا كانت الجلسة موجودة عند تحميل الصفحة، تحقق من وجود جلسة نشطة مسجلة
            if (this._user) {
                try {
                    const { data: activeSessions } = await this._client
                        .from('user_login_sessions')
                        .select('id')
                        .eq('user_id', this._user.id)
                        .eq('status', 'active')
                        .eq('is_current_session', true);

                    // إذا لم تكن هناك جلسة نشطة حالية، نسجل واحدة جديدة (مثلاً عند إعادة فتح المتصفح)
                    if (!activeSessions || activeSessions.length === 0) {
                        await recordLoginSession(this._client, this._user);
                    }
                } catch (e) {
                    console.warn('⚠️ [Auth] تعذر التحقق من الجلسات النشطة:', e.message);
                }
            }

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
                // تسجيل الجلسة
                await recordLoginSession(this._client, data.user);
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
                // تحديث الجلسة الحالية في قاعدة البيانات قبل الخروج
                if (this._user) {
                    await this._client
                        .from('user_login_sessions')
                        .update({
                            status: 'logged_out',
                            logout_reason: 'تسجيل خروج بواسطة المستخدم',
                            logout_at: new Date().toISOString(),
                            is_current_session: false,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', this._user.id)
                        .eq('status', 'active')
                        .eq('is_current_session', true);
                }

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
        const path = window.location.pathname;
        if (!path.includes('/auth/auth/login/') && !path.includes('/auth/register/')) {
            window.TeraAuth.init();
        }
    });
})();
