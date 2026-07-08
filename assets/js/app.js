/**
 * ==========================================================
 * assets/js/auth.js – مدير المصادقة المركزي (Enterprise v5)
 * ==========================================================
 * - يعتمد على window.teraSupabase من supabase-client.js
 * - يوفر كائن TeraAuth مع دوال: login, logout, getUser, ...
 * - يستمع لتغيرات حالة المصادقة (onAuthStateChange)
 * - يُؤمّن الصفحات ويُحدّث واجهة المستخدم تلقائياً
 * - يسجل جلسات الدخول في user_login_sessions مع تفاصيل الجهاز والموقع
 * - يكتشف VPN/Proxy ويمنع الدخول
 * - ينهي جميع الجلسات الأخرى تلقائياً عند تسجيل الدخول
 * - يراقب تغير الموقع الجغرافي وينهي الجلسة إذا تغير بشكل كبير
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
            language: navigator.language || '',
            user_agent: ua,
            platform: navigator.platform || ''
        };

        if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
            result.device_type = /iPad|tablet/i.test(ua) ? 'tablet' : 'mobile';
        }
        if (/Windows NT (\d+\.\d+)/.test(ua)) {
            result.operating_system = `Windows ${RegExp.$1}`;
        } else if (/Mac OS X (\d+[._]\d+)/.test(ua)) {
            result.operating_system = `macOS ${RegExp.$1}`;
        } else if (/Android (\d+\.\d+)/.test(ua)) {
            result.operating_system = `Android ${RegExp.$1}`;
        } else if (/iPhone|iPad|iPod.* OS (\d+[._]\d+)/.test(ua)) {
            result.operating_system = `iOS ${RegExp.$1}`;
        } else {
            result.operating_system = navigator.platform || '';
        }

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

        if (navigator.userAgentData?.platform) {
            result.device_name = navigator.userAgentData.platform;
        } else if (/Windows/.test(ua)) {
            result.device_name = 'Windows PC';
        } else if (/Macintosh/.test(ua)) {
            result.device_name = 'Mac';
        }

        return result;
    }

    // ========== جلب معلومات الموقع الدقيقة (JSONP - بدون CORS) ==========
    function fetchDetailedGeoInfo() {
        return new Promise((resolve) => {
            const callbackName = 'geo_' + Math.random().toString(36).substr(2, 9);
            window[callbackName] = function(data) {
                document.body.removeChild(script);
                delete window[callbackName];
                if (data && data.ip) {
                    resolve({
                        ip_address: data.ip,
                        country: data.country_name,
                        country_code: data.country,
                        region: data.region,
                        city: data.city,
                        district: data.district || null,
                        postal_code: data.postal,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        timezone: data.timezone,
                        isp: data.org,
                        asn: data.asn,
                        isp_organization: data.org,
                        hosting_detected: data.hosting || false,
                        proxy_detected: data.proxy || false,
                        tor_detected: data.tor || false,
                        network: data.network || null,
                    });
                } else {
                    resolve(null);
                }
            };
            const script = document.createElement('script');
            script.src = `https://ipapi.co/jsonp/?callback=${callbackName}`;
            script.onerror = () => {
                document.body.removeChild(script);
                delete window[callbackName];
                resolve(null);
            };
            document.body.appendChild(script);
        });
    }

    // ========== طلب الموقع الجغرافي (GPS) ==========
    function requestLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation not supported'));
            }
            const timeout = setTimeout(() => reject(new Error('Location timeout')), 10000);
            navigator.geolocation.getCurrentPosition(
                pos => {
                    clearTimeout(timeout);
                    resolve({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    });
                },
                err => {
                    clearTimeout(timeout);
                    reject(err);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    // ========== إيقاف الخدمة (رسالة رفض GPS أو VPN) ==========
    function showDeniedMessage(reason = 'رفض مشاركة الموقع الجغرافي') {
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f1f5f9;font-family:Tajawal,sans-serif;">
                <div style="background:#fff;padding:40px;border-radius:16px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.1);max-width:500px;width:90%;">
                    <i class="fas fa-shield-alt" style="font-size:64px;color:#dc2626;margin-bottom:20px;"></i>
                    <h2 style="color:#0A1B3F;font-size:24px;margin-bottom:12px;">تم إيقاف الخدمة</h2>
                    <p style="color:#475569;font-size:15px;line-height:1.6;margin-bottom:24px;">${reason}</p>
                    <button onclick="location.reload()" style="background:#028090;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;">إعادة المحاولة</button>
                </div>
            </div>`;
    }

    // ========== إنهاء جميع الجلسات الأخرى تلقائياً ==========
    async function terminateOtherSessions(client, user, currentSessionNumber) {
        const { data: sessions } = await client.from('user_login_sessions')
            .select('id, session_number')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .neq('session_number', currentSessionNumber);

        if (sessions && sessions.length > 0) {
            await client.from('user_login_sessions')
                .update({
                    status: 'terminated_by_system',
                    logout_reason: 'تم إنهاء الجلسة تلقائياً بسبب تسجيل الدخول من جهاز آخر',
                    logout_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .in('id', sessions.map(s => s.id));
            return sessions.length;
        }
        return 0;
    }

    // ========== تتبع الموقع المستمر وإنهاء الجلسة عند التغير ==========
    function startLocationTracking(client, userId) {
        if (!navigator.geolocation) return;
        if (window._locationWatchId) navigator.geolocation.clearWatch(window._locationWatchId);

        let lastKnownPosition = null;

        window._locationWatchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                if (lastKnownPosition) {
                    const distance = Math.sqrt(
                        Math.pow(latitude - lastKnownPosition.latitude, 2) +
                        Math.pow(longitude - lastKnownPosition.longitude, 2)
                    );
                    if (distance > 0.5) {
                        await client.from('user_login_sessions')
                            .update({
                                status: 'terminated_by_system',
                                logout_reason: 'تم اكتشاف تغير كبير في الموقع الجغرافي',
                                logout_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .eq('user_id', userId)
                            .eq('status', 'active');
                        stopLocationTracking();
                        showDeniedMessage('تم إنهاء الجلسة بسبب تغير الموقع الجغرافي بشكل مريب.');
                        return;
                    }
                }
                lastKnownPosition = { latitude, longitude };
                await client.from('user_login_sessions')
                    .update({ latitude, longitude, last_activity_at: new Date().toISOString() })
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .eq('is_current_session', true);
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
                    stopLocationTracking();
                    showDeniedMessage('تم فقدان إشارة الموقع الجغرافي.');
                }
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
    }

    function stopLocationTracking() {
        if (window._locationWatchId) {
            navigator.geolocation.clearWatch(window._locationWatchId);
            window._locationWatchId = null;
        }
    }

    // ========== تسجيل جلسة دخول جديدة ==========
    async function recordLoginSession(client, user) {
        if (!client || !user) return;

        try {
            // 1. إنهاء الجلسات النشطة السابقة
            await client.from('user_login_sessions')
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

            // 3. معلومات الموقع الدقيقة (JSONP)
            const geoInfo = await fetchDetailedGeoInfo();

            // 4. توليد رقم الجلسة
            const sessionNumber = `SES-${new Date().toISOString().slice(0,10)}-${Math.floor(Math.random()*900000)+100000}`;

            // 5. إنهاء الجلسات الأخرى تلقائياً
            const terminatedCount = await terminateOtherSessions(client, user, sessionNumber);
            if (terminatedCount > 0) {
                setTimeout(() => {
                    alert(`تم إنهاء ${terminatedCount} جلسة نشطة أخرى تلقائياً لأن الحساب لا يسمح بأكثر من جلسة في نفس الوقت.`);
                }, 500);
            }

            // 6. التحقق من VPN/Proxy
            if (geoInfo && (geoInfo.proxy_detected || geoInfo.tor_detected || geoInfo.hosting_detected)) {
                showDeniedMessage('تم اكتشاف استخدام VPN أو Proxy أو شبكة مشبوهة. يرجى تعطيلها والمحاولة مرة أخرى.');
                throw new Error('VPN_PROXY_DETECTED');
            }

            // 7. بناء كائن الجلسة
            const sessionData = {
                user_id: user.id,
                session_number: sessionNumber,
                login_at: new Date().toISOString(),
                status: 'active',
                is_current_session: true,
                last_activity_at: new Date().toISOString(),
                login_method: 'password',
                login_status: 'success',
                ...deviceInfo,
                ...(geoInfo || {})
            };

            // 8. إدراج الجلسة الجديدة
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
                    } else {
                        // تتبع الموقع للجلسة الحالية
                        startLocationTracking(this._client, this._user.id);
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
                        .eq('status', 'active');
                }

                stopLocationTracking();
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
