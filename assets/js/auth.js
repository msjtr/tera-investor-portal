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

    // ========== انتظار Supabase ==========
    async function getSupabase() {
        if (window.teraSupabase) return window.teraSupabase;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Supabase timeout')), 15000);
            document.addEventListener('supabase:ready', e => {
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
            device_type: 'computer', device_name: '',
            operating_system: navigator.platform || '',
            browser_name: '', browser_version: '',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language || '', user_agent: ua,
        };
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) result.device_type = /iPad|tablet/i.test(ua) ? 'tablet' : 'mobile';
        if (/Windows NT (\d+\.\d+)/.test(ua)) result.operating_system = `Windows ${RegExp.$1}`;
        else if (/Mac OS X (\d+[._]\d+)/.test(ua)) result.operating_system = `macOS ${RegExp.$1}`;
        if (/Edg\//.test(ua)) { result.browser_name = 'Edge'; result.browser_version = ua.match(/Edg\/(\d+\.\d+)/)[1]; }
        else if (/Firefox\//.test(ua)) { result.browser_name = 'Firefox'; result.browser_version = ua.match(/Firefox\/(\d+\.\d+)/)[1]; }
        else if (/Chrome\//.test(ua)) { result.browser_name = 'Chrome'; result.browser_version = ua.match(/Chrome\/(\d+\.\d+)/)[1]; }
        else if (/Safari\//.test(ua)) { result.browser_name = 'Safari'; result.browser_version = ua.match(/Safari\/(\d+\.\d+)/)[1]; }
        return result;
    }

    // ========== Reverse Geocoding ==========
    async function reverseGeocode(latitude, longitude) {
        try {
            const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            if (data && data.display_name) {
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

    // ========== جلب معلومات الموقع ==========
    function fetchDetailedGeoInfo() {
        return new Promise((resolve) => {
            const callbackName = 'geo_' + Math.random().toString(36).substr(2, 9);
            window[callbackName] = async function(data) {
                document.body.removeChild(script);
                delete window[callbackName];
                if (data && data.ip) {
                    const geoInfo = {
                        ip_address: data.ip, country: data.country_name,
                        country_code: data.country, region: data.region,
                        city: data.city, district: data.district || null,
                        postal_code: data.postal, latitude: data.latitude,
                        longitude: data.longitude, timezone: data.timezone,
                        isp: data.org, asn: data.asn, isp_organization: data.org,
                        hosting_detected: data.hosting || false,
                        proxy_detected: data.proxy || false,
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
            script.src = `https://ipapi.co/jsonp/?callback=${callbackName}`;
            script.onerror = () => { document.body.removeChild(script); delete window[callbackName]; resolve(null); };
            document.body.appendChild(script);
        });
    }

    // ========== طلب GPS ==========
    function requestLocation() {
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

    // ========== إيقاف الخدمة (لحالات VPN فقط وليس لرفض GPS) ==========
    function showDeniedMessage(reason = 'تم اكتشاف نشاط مشبوه') {
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f1f5f9;font-family:Tajawal,sans-serif;">
                <div style="background:#fff;padding:40px;border-radius:16px;text-align:center;max-width:500px;width:90%;">
                    <i class="fas fa-shield-alt" style="font-size:64px;color:#dc2626;"></i>
                    <h2>تم إيقاف الخدمة</h2><p>${reason}</p>
                    <button onclick="location.reload()" style="background:#028090;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-weight:700;">إعادة المحاولة</button>
                </div>
            </div>`;
    }

    // ========== إنهاء الجلسات الأخرى ==========
    async function terminateOtherSessions(client, user, currentSessionNumber) {
        const { data: sessions } = await client.from('user_login_sessions')
            .select('id').eq('user_id', user.id).eq('status', 'active').neq('session_number', currentSessionNumber);
        if (sessions?.length) {
            await client.from('user_login_sessions').update({
                status: 'terminated_by_system', logout_reason: 'تسجيل الدخول من جهاز آخر',
                logout_at: new Date().toISOString(), updated_at: new Date().toISOString()
            }).in('id', sessions.map(s => s.id));
            return sessions.length;
        }
        return 0;
    }

    // ========== تتبع الموقع ==========
    function startLocationTracking(client, userId) { /* ... كما هي ... */ }
    function stopLocationTracking() { /* ... كما هي ... */ }

    // ========== تسجيل جلسة جديدة (GPS اختياري لتجنب الحلقة) ==========
    async function createSession(client, user, requireGps = true) {
        let gps = null;
        if (requireGps) {
            try { gps = await requestLocation(); } catch (e) {
                console.warn('⚠️ فشل GPS الإجباري. متابعة بدونه.');
                // لا نوقف الخدمة، نكمل بدون GPS
            }
        } else {
            try { gps = await requestLocation(); } catch (e) { /* لا شيء */ }
        }

        const geo = await fetchDetailedGeoInfo();
        const device = parseUserAgent();
        const sessionNumber = `SES-${new Date().toISOString().slice(0,10)}-${Math.floor(Math.random()*900000)+100000}`;

        await terminateOtherSessions(client, user, sessionNumber);

        // VPN/Proxy فقط هو الذي يوقف الخدمة
        if (geo && (geo.proxy_detected || geo.tor_detected || geo.hosting_detected)) {
            showDeniedMessage('تم اكتشاف VPN/Proxy. يرجى تعطيلها.');
            throw new Error('VPN_PROXY_DETECTED');
        }

        const { error } = await client.from('user_login_sessions').insert({
            user_id: user.id, session_number: sessionNumber,
            login_at: new Date().toISOString(), status: 'active',
            is_current_session: true, last_activity_at: new Date().toISOString(),
            login_method: 'password', login_status: 'success',
            ...device, ...(geo || {}), ...(gps || {}),
        });

        if (!error) { console.log('✅ جلسة:', sessionNumber); startLocationTracking(client, user.id); }
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

            // تنظيف الجلسات الوهمية
            await this._client.from('user_login_sessions')
                .update({ status: 'terminated_by_system', logout_reason: 'تنظيف تلقائي', logout_at: new Date().toISOString(), is_current_session: false })
                .eq('user_id', user.id).eq('status', 'active');

            // إنشاء جلسة جديدة (GPS إجباري لكن مع fallback)
            await createSession(this._client, user, true);
        },

        login: async function (email, password) {
            if (!this._client) throw new Error('Supabase غير متوفر');
            const { data, error } = await this._client.auth.signInWithPassword({ email, password });
            if (error) throw error;
            this._user = data.user;
            this.updateUI();
            await createSession(this._client, data.user, false);
            return { data, error: null };
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
