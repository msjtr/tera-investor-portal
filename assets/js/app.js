/**
 * ==========================================================
 * assets/js/auth.js – مدير المصادقة المركزي (Enterprise)
 * ==========================================================
 * - يعتمد على window.teraSupabase من supabase-client.js
 * - يوفر كائن TeraAuth مع دوال: login, logout, getUser, ...
 * - يستمع لتغيرات حالة المصادقة (onAuthStateChange)
 * - يُؤمّن الصفحات ويُحدّث واجهة المستخدم تلقائياً
 * - يسجل جلسات الدخول في user_login_sessions مع تفاصيل الجهاز والموقع
 * - متوافق مع verify-otp.js وباقي ملفات النظام
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

    // ========== تحليل User Agent ==========
    function parseUserAgent() {
        const ua = navigator.userAgent;
        const result = {
            device_type: 'computer',
            device_name: '',
            device_brand: '',
            operating_system: '',
            os_version: '',
            browser_name: '',
            browser_version: '',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language || ''
        };

        // نوع الجهاز
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
            result.device_type = /iPad|tablet/i.test(ua) ? 'tablet' : 'mobile';
        }

        // نظام التشغيل
        if (/Windows NT (\d+\.\d+)/.test(ua)) {
            result.operating_system = `Windows ${RegExp.$1}`;
        } else if (/Mac OS X (\d+[._]\d+[._]?\d*)/.test(ua)) {
            result.operating_system = `macOS ${RegExp.$1.replace(/_/g, '.')}`;
        } else if (/Android (\d+\.\d+)/.test(ua)) {
            result.operating_system = `Android ${RegExp.$1}`;
        } else if (/iPhone|iPad|iPod.* OS (\d+[._]\d+[._]?\d*)/.test(ua)) {
            result.operating_system = `iOS ${RegExp.$1.replace(/_/g, '.')}`;
        } else {
            result.operating_system = navigator.platform || '';
        }

        // المتصفح
        if (navigator.userAgentData?.brands) {
            const brand = navigator.userAgentData.brands.find(b => b.brand !== 'Not;A=Brand' && b.brand !== 'Chromium');
            if (brand) {
                result.browser_name = brand.brand;
                result.browser_version = brand.version;
            }
        }
        if (!result.browser_name) {
            if (/Edg\/(\d+\.\d+)/.test(ua)) {
                result.browser_name = 'Edge';
                result.browser_version = RegExp.$1;
            } else if (/Firefox\/(\d+\.\d+)/.test(ua)) {
                result.browser_name = 'Firefox';
                result.browser_version = RegExp.$1;
            } else if (/Chrome\/(\d+\.\d+)/.test(ua)) {
                result.browser_name = 'Chrome';
                result.browser_version = RegExp.$1;
            } else if (/Safari\/(\d+\.\d+)/.test(ua)) {
                result.browser_name = 'Safari';
                result.browser_version = RegExp.$1;
            }
        }

        // اسم الجهاز
        if (navigator.userAgentData?.platform) {
            result.device_name = navigator.userAgentData.platform;
        } else if (/Windows/.test(ua)) {
            result.device_name = 'Windows PC';
        } else if (/Macintosh/.test(ua)) {
            result.device_name = 'Mac';
        }

        return result;
    }

    // ========== جلب معلومات الموقع (بدون إذن GPS) ==========
    async function fetchGeoInfo() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) return null;
            const data = await response.json();
            return {
                ip_address: data.ip || null,
                country: data.country_name || null,
                region: data.region || null,
                city: data.city || null,
                postal_code: data.postal || null,
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                timezone: data.timezone || null,
                isp: data.org || null,
                district: null
            };
        } catch (e) {
            console.warn('⚠️ تعذر جلب معلومات الموقع عبر ipapi.co:', e);
            return null;
        }
    }

    // ========== تسجيل جلسة دخول جديدة ==========
    async function recordLoginSession(client, user) {
        if (!client || !user) return;

        try {
            // 1. إنهاء الجلسات النشطة السابقة
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

            // 2. معلومات الجهاز والمتصفح
            const deviceInfo = parseUserAgent();

            // 3. معلومات الموقع (IP، مدينة، إلخ)
            const geoInfo = await fetchGeoInfo();

            // 4. توليد رقم الجلسة
            const sessionNumber = `SES-${new Date().toISOString().slice(0,10)}-${Math.floor(Math.random()*900000)+100000}`;

            // 5. بناء كائن الجلسة
            const sessionData = {
                user_id: user.id,
                session_number: sessionNumber,
                login_at: new Date().toISOString(),
                status: 'active',
                is_current_session: true,
                last_activity_at: new Date().toISOString(),
                ...deviceInfo,
                ...(geoInfo || {})
            };

            // 6. إدراج الجلسة الجديدة
            const { error } = await client.from('user_login_sessions').insert(sessionData);

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

        init: async function () {
            if (this._initialized) return;
            this._initialized = true;

            try {
                this._client = await waitForSupabase();
            } catch (err) {
                console.warn('⚠️ [Auth] تعذر الاتصال بـ Supabase:', err.message);
                return;
            }

            const { data: { subscription } } = this._client.auth.onAuthStateChange(
                (event, session) => {
                    console.log(`🔁 [Auth] تغير حالة المصادقة: ${event}`);
                    this._session = session;
                    this._user = session?.user ?? null;
                    this._updateUI();
                    document.dispatchEvent(new CustomEvent('auth:stateChanged', {
                        detail: { event, session, user: this._user }
                    }));

                    if (event === 'SIGNED_IN' && session?.user) {
                        recordLoginSession(this._client, session.user);
                    }
                }
            );
            this._subscription = subscription;

            const { data: { session } } = await this._client.auth.getSession();
            this._session = session;
            this._user = session?.user ?? null;
            this._updateUI();

            if (this._user) {
                try {
                    const { data: activeSessions } = await this._client
                        .from('user_login_sessions')
                        .select('id')
                        .eq('user_id', this._user.id)
                        .eq('status', 'active')
                        .eq('is_current_session', true);

                    if (!activeSessions || activeSessions.length === 0) {
                        await recordLoginSession(this._client, this._user);
                    }
                } catch (e) {
                    console.warn('⚠️ [Auth] تعذر التحقق من الجلسات النشطة:', e.message);
                }
            }

            console.log('🔒 [Auth] تم تأمين الواجهة');
        },

        isLoggedIn: function () {
            return !!this._session;
        },

        login: async function (email, password) {
            if (!this._client) throw new Error('Supabase غير متوفر');
            try {
                const { data, error } = await this._client.auth.signInWithPassword({ email, password });
                if (error) throw error;
                this._session = data.session;
                this._user = data.user;
                this._updateUI();
                await recordLoginSession(this._client, data.user);
                return { data, error: null };
            } catch (error) {
                console.error('❌ [Auth] فشل تسجيل الدخول:', error);
                return { data: null, error };
            }
        },

        logout: async function () {
            if (!this._client) return;
            try {
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

        redirectTo: function (url) {
            window.location.replace(url);
        },

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

        hasRole: function (role) {
            if (!this._user) return false;
            const userRole = this._user.user_metadata?.role || 'user';
            return userRole === role;
        },

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

    document.addEventListener('DOMContentLoaded', function () {
        const path = window.location.pathname;
        if (!path.includes('/auth/auth/login/') && !path.includes('/auth/register/')) {
            window.TeraAuth.init();
        }
    });
})();
