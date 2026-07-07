/**
 * assets/js/auth.js – مدير المصادقة المركزي (Enterprise)
 * - يستخدم Edge Function ipinfo لجلب بيانات IP
 * - إجباري GPS مع إيقاف الخدمة عند الرفض
 * - تتبع الموقع طوال الجلسة
 */

(function () {
    'use strict';

    const ROUTES = {
        LOGIN: '/auth/auth/login/login.html',
        DASHBOARD: '/pages/dashboard/index.html',
    };

    let locationWatchId = null;

    async function waitForSupabase() {
        if (window.teraSupabase) return window.teraSupabase;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Supabase timeout')), 15000);
            document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
            document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('Supabase error')); }, { once: true });
        });
    }

    function parseUserAgent() {
        const ua = navigator.userAgent;
        const result = {
            device_type: 'computer', device_name: '', device_brand: '',
            operating_system: '', os_version: '', browser_name: '', browser_version: '',
            screen_resolution: `${window.screen.width}x${window.screen.height}`, language: navigator.language || '',
            user_agent: ua,
            platform: navigator.platform || '',
        };
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) result.device_type = /iPad|tablet/i.test(ua) ? 'tablet' : 'mobile';
        if (/Windows NT (\d+\.\d+)/.test(ua)) result.operating_system = `Windows ${RegExp.$1}`;
        else if (/Mac OS X (\d+[._]\d+[._]?\d*)/.test(ua)) result.operating_system = `macOS ${RegExp.$1.replace(/_/g, '.')}`;
        else if (/Android (\d+\.\d+)/.test(ua)) result.operating_system = `Android ${RegExp.$1}`;
        else if (/iPhone|iPad|iPod.* OS (\d+[._]\d+[._]?\d*)/.test(ua)) result.operating_system = `iOS ${RegExp.$1.replace(/_/g, '.')}`;
        else result.operating_system = navigator.platform || '';
        if (navigator.userAgentData?.brands) {
            const brand = navigator.userAgentData.brands.find(b => b.brand !== 'Not;A=Brand' && b.brand !== 'Chromium');
            if (brand) { result.browser_name = brand.brand; result.browser_version = brand.version; }
        }
        if (!result.browser_name) {
            if (/Edg\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Edge'; result.browser_version = RegExp.$1; }
            else if (/Firefox\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Firefox'; result.browser_version = RegExp.$1; }
            else if (/Chrome\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Chrome'; result.browser_version = RegExp.$1; }
            else if (/Safari\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Safari'; result.browser_version = RegExp.$1; }
        }
        if (navigator.userAgentData?.platform) result.device_name = navigator.userAgentData.platform;
        else if (/Windows/.test(ua)) result.device_name = 'Windows PC';
        else if (/Macintosh/.test(ua)) result.device_name = 'Mac';
        return result;
    }

    // ✅ تم الإصلاح: استخدام client كمعامل
    async function fetchIPInfo(client) {
        try {
            const { data, error } = await client.functions.invoke('ipinfo', { body: {} });
            if (error) throw error;
            return {
                ip_address: data.ip,
                country: data.country_name,
                country_code: data.country,
                region: data.region,
                city: data.city,
                postal_code: data.postal,
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timezone,
                isp: data.org,
                asn: data.asn,
                isp_organization: data.org,
            };
        } catch (e) {
            console.warn('⚠️ فشل جلب IP info:', e);
            return null;
        }
    }

    function requestLocationPermission() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
            const timeout = setTimeout(() => reject(new Error('Location timeout')), 10000);
            navigator.geolocation.getCurrentPosition(
                pos => { clearTimeout(timeout); resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
                err => { clearTimeout(timeout); reject(err); },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    function showLocationDeniedMessage() {
        document.body.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:100vh; background:#f1f5f9; font-family:'Tajawal',sans-serif;">
                <div style="background:#fff; padding:40px; border-radius:16px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.1); max-width:500px;">
                    <i class="fas fa-map-marker-alt" style="font-size:64px; color:#dc2626; margin-bottom:20px;"></i>
                    <h2 style="color:#0A1B3F; margin-bottom:12px;">تم إيقاف الخدمة</h2>
                    <p style="color:#475569; margin-bottom:24px;">نظرًا لعدم اتباع سياسة المنصة ورفض مشاركة الموقع الجغرافي، لا يمكنك متابعة استخدام الخدمة. تحديد الموقع إجباري للامتثال لمتطلبات الأمان والتحقق.</p>
                    <button onclick="location.reload()" style="background:#028090; color:#fff; border:none; padding:12px 32px; border-radius:8px; font-weight:700; cursor:pointer;">إعادة المحاولة</button>
                </div>
            </div>
        `;
    }

    function startLocationWatch(client, userId) {
        if (!navigator.geolocation) return;
        if (locationWatchId) navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    await client.from('user_login_sessions')
                        .update({ latitude, longitude, last_activity_at: new Date().toISOString() })
                        .eq('user_id', userId)
                        .eq('status', 'active')
                        .eq('is_current_session', true);
                } catch (e) {}
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
                    stopLocationWatch();
                    showLocationDeniedMessage();
                }
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
    }

    function stopLocationWatch() {
        if (locationWatchId) { navigator.geolocation.clearWatch(locationWatchId); locationWatchId = null; }
    }

    async function recordLoginSession(client, user) {
        if (!client || !user) return;
        let gpsCoords = null;
        try { gpsCoords = await requestLocationPermission(); } catch (e) {
            showLocationDeniedMessage();
            throw new Error('LOCATION_DENIED');
        }

        // ✅ استدعاء fetchIPInfo مع client
        const ipInfo = await fetchIPInfo(client);
        const deviceInfo = parseUserAgent();
        const sessionNumber = `SES-${new Date().toISOString().slice(0,10)}-${Math.floor(Math.random()*900000)+100000}`;

        try {
            await client.from('user_login_sessions')
                .update({ is_current_session: false, status: 'logged_out', logout_reason: 'تسجيل الدخول من جهاز آخر', logout_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('user_id', user.id).eq('status', 'active');

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
                ...(ipInfo || {}),
                ...(gpsCoords || {}),
            };
            await client.from('user_login_sessions').insert(sessionData);
            startLocationWatch(client, user.id);
        } catch (err) { console.error('فشل تسجيل الجلسة:', err); }
    }

    window.TeraAuth = {
        _client: null, _session: null, _user: null, _initialized: false,

        init: async function () {
            if (this._initialized) return;
            this._initialized = true;
            try { this._client = await waitForSupabase(); } catch (e) { return; }

            const { data: { subscription } } = this._client.auth.onAuthStateChange((event, session) => {
                this._session = session;
                this._user = session?.user ?? null;
                this._updateUI();
                if (event === 'SIGNED_IN' && session?.user) {
                    this.enforceLocationPolicy().catch(e => console.warn('سياسة الموقع:', e));
                    recordLoginSession(this._client, session.user);
                }
            });

            const { data: { session } } = await this._client.auth.getSession();
            this._session = session;
            this._user = session?.user ?? null;
            this._updateUI();

            if (this._user) {
                try { await this.enforceLocationPolicy(); } catch (e) { return; }
            }
        },

        enforceLocationPolicy: async function () {
            try {
                const coords = await requestLocationPermission();
                if (this._user && this._client) {
                    await this._client.from('user_login_sessions')
                        .update({ latitude: coords.latitude, longitude: coords.longitude, last_activity_at: new Date().toISOString() })
                        .eq('user_id', this._user.id).eq('status', 'active').eq('is_current_session', true);
                }
                startLocationWatch(this._client, this._user.id);
            } catch (error) {
                showLocationDeniedMessage();
                throw new Error('LOCATION_DENIED');
            }
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
            if (this._user) {
                await this._client.from('user_login_sessions')
                    .update({ status: 'logged_out', logout_reason: 'تسجيل خروج', logout_at: new Date().toISOString(), is_current_session: false, updated_at: new Date().toISOString() })
                    .eq('user_id', this._user.id).eq('status', 'active');
            }
            stopLocationWatch();
            await this._client.auth.signOut();
            this._session = null; this._user = null; this._updateUI();
            this.redirectTo(ROUTES.LOGIN);
        },

        redirectTo: url => window.location.replace(url),

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

        getSession: async function () { /* ... */ },
        hasRole: role => this._user?.user_metadata?.role === role,

        _updateUI: function () {
            const user = this._user;
            const hName = document.getElementById('headerUserName');
            const hAvatar = document.getElementById('headerAvatar');
            if (!user) {
                if (hName) hName.textContent = 'زائر';
                if (hAvatar) hAvatar.textContent = 'ز';
                return;
            }
            const name = user.user_metadata?.full_name || user.email || 'مستخدم';
            if (hName) hName.textContent = name;
            if (hAvatar) hAvatar.textContent = name.charAt(0).toUpperCase();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const path = window.location.pathname;
        if (!path.includes('/auth/auth/login/') && !path.includes('/auth/register/')) {
            window.TeraAuth.init();
        }
    });
})();
