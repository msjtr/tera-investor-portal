/**
 * ==========================================================
 * assets/js/auth.js – مدير المصادقة المركزي (Enterprise v5.6)
 * ==========================================================
 * - JSONP لجلب IP والموقع (بدون CORS)
 * - Reverse Geocoding عبر LocationIQ
 * - GPS إجباري عند init (مع fallback اختياري لتجنب الحلقة)
 * - تنظيف تلقائي للجلسات الوهمية
 * - تتبع الجلسات وتسجيلها في user_login_sessions
 */

(function () {
    'use strict';

    const ROUTES = {
        LOGIN: '/auth/auth/login/login.html',
        DASHBOARD: '/pages/dashboard/index.html',
    };

    const LOCATIONIQ_API_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';

    let supabaseClient = null;
    let currentUser = null;
    let locationWatchId = null;
    let lastKnownPosition = null;

    async function getSupabase() {
        if (window.teraSupabase) return window.teraSupabase;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Supabase timeout')), 15000);
            document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
        });
    }

    function parseUserAgent() {
        const ua = navigator.userAgent;
        return {
            device_type: /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? (/iPad|tablet/i.test(ua) ? 'tablet' : 'mobile') : 'computer',
            device_name: navigator.userAgentData?.platform || (navigator.platform || ''),
            operating_system: (() => {
                if (/Windows NT (\d+\.\d+)/.test(ua)) return `Windows ${RegExp.$1}`;
                if (/Mac OS X (\d+[._]\d+)/.test(ua)) return `macOS ${RegExp.$1}`;
                return navigator.platform || '';
            })(),
            browser_name: (() => {
                if (/Edg\//.test(ua)) return 'Edge';
                if (/Firefox\//.test(ua)) return 'Firefox';
                if (/Chrome\//.test(ua)) return 'Chrome';
                if (/Safari\//.test(ua)) return 'Safari';
                return '';
            })(),
            browser_version: (() => {
                const match = ua.match(/(?:Edg|Firefox|Chrome|Safari)\/(\d+\.\d+)/);
                return match ? match[1] : '';
            })(),
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language || '',
            user_agent: ua,
        };
    }

    async function reverseGeocode(latitude, longitude) {
        try {
            const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            if (data?.display_name) {
                return {
                    country: data.country || null,
                    country_code: data.country_code?.toUpperCase() || null,
                    city: data.city || null,
                    district: data.neighbourhood || data.suburb || data.district || null,
                    region: data.state || data.province || null,
                    postal_code: data.postcode || null,
                };
            }
            return null;
        } catch (e) { return null; }
    }

    function fetchDetailedGeoInfo() {
        return new Promise((resolve) => {
            const cb = 'geo_' + Math.random().toString(36).substr(2, 9);
            window[cb] = async function(data) {
                document.body.removeChild(script);
                delete window[cb];
                if (data?.ip) {
                    const geoInfo = {
                        ip_address: data.ip, country: data.country_name, country_code: data.country,
                        region: data.region, city: data.city, district: data.district || null,
                        postal_code: data.postal, latitude: data.latitude, longitude: data.longitude,
                        timezone: data.timezone, isp: data.org, asn: data.asn, isp_organization: data.org,
                        hosting_detected: data.hosting || false, proxy_detected: data.proxy || false,
                        tor_detected: data.tor || false,
                    };
                    if (data.latitude && data.longitude) {
                        const improved = await reverseGeocode(data.latitude, data.longitude);
                        if (improved) {
                            geoInfo.country = improved.country || geoInfo.country;
                            geoInfo.country_code = improved.country_code || geoInfo.country_code;
                            geoInfo.city = improved.city || geoInfo.city;
                            geoInfo.district = improved.district || geoInfo.district;
                            geoInfo.region = improved.region || geoInfo.region;
                            geoInfo.postal_code = improved.postal_code || geoInfo.postal_code;
                        }
                    }
                    resolve(geoInfo);
                } else resolve(null);
            };
            const script = document.createElement('script');
            script.src = `https://ipapi.co/jsonp/?callback=${cb}`;
            script.onerror = () => { document.body.removeChild(script); delete window[cb]; resolve(null); };
            document.body.appendChild(script);
        });
    }

    function requestLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                err => reject(err),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    function showDeniedMessage(reason) {
        document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f1f5f9;"><div style="background:#fff;padding:40px;border-radius:16px;text-align:center;max-width:500px;"><h2>تم إيقاف الخدمة</h2><p>${reason}</p><button onclick="location.reload()">إعادة المحاولة</button></div></div>`;
    }

    async function terminateOtherSessions(client, user, currentSessionNumber) {
        const { data: sessions } = await client.from('user_login_sessions')
            .select('id').eq('user_id', user.id).eq('status', 'active').neq('session_number', currentSessionNumber);
        if (sessions?.length) {
            await client.from('user_login_sessions').update({
                status: 'terminated_by_system', logout_reason: 'تسجيل الدخول من جهاز آخر',
                logout_at: new Date().toISOString(), updated_at: new Date().toISOString()
            }).in('id', sessions.map(s => s.id));
        }
    }

    function startLocationTracking(client, userId) {
        if (!navigator.geolocation) return;
        if (locationWatchId) navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                if (lastKnownPosition) {
                    const distance = Math.sqrt(Math.pow(latitude - lastKnownPosition.latitude, 2) + Math.pow(longitude - lastKnownPosition.longitude, 2));
                    if (distance > 0.5) {
                        await client.from('user_login_sessions').update({
                            status: 'terminated_by_system', logout_reason: 'تغير الموقع',
                            logout_at: new Date().toISOString()
                        }).eq('user_id', userId).eq('status', 'active');
                        stopLocationTracking();
                        showDeniedMessage('تم إنهاء الجلسة بسبب تغير الموقع.');
                        return;
                    }
                }
                lastKnownPosition = { latitude, longitude };
                await client.from('user_login_sessions').update({
                    latitude, longitude, last_activity_at: new Date().toISOString()
                }).eq('user_id', userId).eq('status', 'active').eq('is_current_session', true);
            },
            (err) => { if (err.code === 1) { stopLocationTracking(); showDeniedMessage('فقدان إشارة الموقع.'); } },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
    }

    function stopLocationTracking() { if (locationWatchId) { navigator.geolocation.clearWatch(locationWatchId); locationWatchId = null; } }

    // ✅ دالة createSession المُحسَّنة (تُرجع الجلسة المنشأة)
    async function createSession(client, user, requireGps = true) {
        let gps = null;
        try { gps = await requestLocation(); } catch (e) { if (requireGps) console.warn('⚠️ GPS غير متاح.'); }

        const geo = await fetchDetailedGeoInfo();
        const device = parseUserAgent();
        const sessionNumber = `SES-${new Date().toISOString().slice(0,10)}-${Math.floor(Math.random()*900000)+100000}`;

        await terminateOtherSessions(client, user, sessionNumber);

        if (geo?.proxy_detected || geo?.tor_detected || geo?.hosting_detected) {
            showDeniedMessage('تم اكتشاف VPN/Proxy.');
            return null;
        }

        const { data, error } = await client.from('user_login_sessions')
            .insert({
                user_id: user.id, session_number: sessionNumber,
                login_at: new Date().toISOString(), status: 'active',
                is_current_session: true, last_activity_at: new Date().toISOString(),
                login_method: 'password', login_status: 'success',
                ...device, ...(geo || {}), ...(gps || {}),
            })
            .select('*')
            .single();

        if (error) {
            console.error('❌ فشل تسجيل الجلسة:', error.message);
            return null;
        }

        console.log('✅ جلسة جديدة:', sessionNumber);
        startLocationTracking(client, user.id);
        return data;
    }

    // ========== TeraAuth ==========
    window.TeraAuth = {
        _client: null, _user: null, _initialized: false,

        init: async function () {
            if (this._initialized) return;
            this._initialized = true;
            try { this._client = await getSupabase(); } catch (e) { return; }

            const { data: { user } } = await this._client.auth.getUser();
            if (!user) { this.redirectTo(ROUTES.LOGIN); return; }

            this._user = user;
            this.updateUI();

            // تنظيف الجلسات السابقة
            await this._client.from('user_login_sessions')
                .update({ status: 'terminated_by_system', logout_reason: 'تنظيف تلقائي', logout_at: new Date().toISOString(), is_current_session: false })
                .eq('user_id', user.id).eq('status', 'active');

            // إنشاء جلسة جديدة
            await createSession(this._client, user, true);
        },

        login: async function (email, password) {
            if (!this._client) return { data: null, error: new Error('Supabase غير متوفر') };
            try {
                const { data, error } = await this._client.auth.signInWithPassword({ email, password });
                if (error) return { data: null, error };
                this._user = data.user;
                this.updateUI();
                const session = await createSession(this._client, data.user, false);
                return { data: { ...data, session }, error: null };
            } catch (error) { return { data: null, error }; }
        },

        getUser: async function () {
            if (!this._client) return null;
            const { data: { user } } = await this._client.auth.getUser();
            this._user = user;
            this.updateUI();
            return user;
        },

        logout: async function () {
            if (!this._client || !this._user) return;
            await this._client.from('user_login_sessions').update({
                status: 'logged_out', logout_reason: 'تسجيل خروج',
                logout_at: new Date().toISOString(), is_current_session: false
            }).eq('user_id', this._user.id).eq('status', 'active');
            stopLocationTracking();
            await this._client.auth.signOut();
            this._user = null;
            this.redirectTo(ROUTES.LOGIN);
        },

        redirectTo: function (url) { window.location.replace(url); },

        updateUI: function () {
            const user = this._user;
            const hName = document.getElementById('headerUserName');
            const hAvatar = document.getElementById('headerAvatar');
            if (!user) { if (hName) hName.textContent = 'زائر'; if (hAvatar) hAvatar.textContent = 'ز'; return; }
            const name = user.user_metadata?.full_name || user.email || 'مستخدم';
            if (hName) hName.textContent = name;
            if (hAvatar) hAvatar.textContent = name.charAt(0).toUpperCase();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!location.pathname.includes('/auth/auth/login/') && !location.pathname.includes('/auth/register/')) {
            window.TeraAuth.init();
        }
    });
})();
