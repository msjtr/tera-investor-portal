/**
 * ==========================================================
 * assets/js/auth.js – مدير المصادقة المركزي (Enterprise v5.2)
 * ==========================================================
 * - JSONP لجلب IP والموقع (بدون CORS)
 * - Reverse Geocoding لتحسين دقة الدولة والمدينة والحي
 * - GPS إجباري عند تحميل الصفحات المحمية (init)
 * - GPS اختياري عند تسجيل الدخول بعد OTP (login)
 * - تتبع الموقع طوال الجلسة
 * - تسجيل الجلسات في user_login_sessions
 */

(function () {
    'use strict';

    const ROUTES = {
        LOGIN: '/auth/auth/login/login.html',
        DASHBOARD: '/pages/dashboard/index.html',
    };

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
            device_type: 'computer',
            device_name: '',
            operating_system: navigator.platform || '',
            browser_name: '',
            browser_version: '',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language || '',
            user_agent: ua,
        };
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
            result.device_type = /iPad|tablet/i.test(ua) ? 'tablet' : 'mobile';
        }
        if (/Windows NT (\d+\.\d+)/.test(ua)) result.operating_system = `Windows ${RegExp.$1}`;
        else if (/Mac OS X (\d+[._]\d+)/.test(ua)) result.operating_system = `macOS ${RegExp.$1}`;
        if (/Edg\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Edge'; result.browser_version = RegExp.$1; }
        else if (/Firefox\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Firefox'; result.browser_version = RegExp.$1; }
        else if (/Chrome\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Chrome'; result.browser_version = RegExp.$1; }
        else if (/Safari\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Safari'; result.browser_version = RegExp.$1; }
        return result;
    }

    // ========== تحسين الموقع عبر Reverse Geocoding ==========
    async function reverseGeocode(latitude, longitude) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=ar`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            
            if (data && data.address) {
                const addr = data.address;
                return {
                    country: addr.country || null,
                    country_code: addr.country_code ? addr.country_code.toUpperCase() : null,
                    city: addr.city || addr.town || addr.village || addr.state_district || null,
                    district: addr.suburb || addr.city_district || addr.district || null,
                    region: addr.state || addr.region || null,
                    postal_code: addr.postcode || null,
                };
            }
            return null;
        } catch (e) {
            console.warn('⚠️ فشل Reverse Geocoding:', e);
            return null;
        }
    }

    // ========== جلب معلومات الموقع الدقيقة (JSONP + Reverse Geocoding) ==========
    function fetchDetailedGeoInfo() {
        return new Promise((resolve) => {
            const callbackName = 'geo_' + Math.random().toString(36).substr(2, 9);
            window[callbackName] = async function(data) {
                document.body.removeChild(script);
                delete window[callbackName];
                
                if (data && data.ip) {
                    // البيانات الأساسية من IP
                    const geoInfo = {
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
                    };

                    // ✅ إذا كانت الإحداثيات موجودة لكن الدولة/المدينة غير دقيقة، نستخدم Reverse Geocoding
                    if (data.latitude && data.longitude) {
                        const improvedLocation = await reverseGeocode(data.latitude, data.longitude);
                        if (improvedLocation) {
                            // نأخذ المعلومات الأكثر دقة (إذا كانت فارغة من IPApi، أو نستبدلها بالمعلومات الأحدث)
                            geoInfo.country = improvedLocation.country || geoInfo.country;
                            geoInfo.country_code = improvedLocation.country_code || geoInfo.country_code;
                            geoInfo.city = improvedLocation.city || geoInfo.city;
                            geoInfo.district = improvedLocation.district || geoInfo.district;
                            geoInfo.region = improvedLocation.region || geoInfo.region;
                            geoInfo.postal_code = improvedLocation.postal_code || geoInfo.postal_code;
                        }
                    }

                    resolve(geoInfo);
                } else {
                    resolve(null);
                }
            };
            const script = document.createElement('script');
            script.src = `https://ipapi.co/jsonp/?callback=${callbackName}`;
            script.onerror = () => { document.body.removeChild(script); delete window[callbackName]; resolve(null); };
            document.body.appendChild(script);
        });
    }

    // ========== طلب الموقع الجغرافي (GPS) ==========
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

    // ========== إيقاف الخدمة ==========
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

    // ========== إنهاء جميع الجلسات الأخرى ==========
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

    // ========== مراقبة تغير الموقع ==========
    function startLocationTracking(client, userId) {
        if (!navigator.geolocation) return;
        if (locationWatchId) navigator.geolocation.clearWatch(locationWatchId);

        locationWatchId = navigator.geolocation.watchPosition(
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
        if (locationWatchId) { navigator.geolocation.clearWatch(locationWatchId); locationWatchId = null; }
    }

    // ========== تسجيل جلسة جديدة ==========
    async function createSession(client, user, requireGps = true) {
        let gps = null;
        if (requireGps) {
            try { gps = await requestLocation(); } catch (e) { showDeniedMessage(); throw new Error('LOCATION_DENIED'); }
        } else {
            try { gps = await requestLocation(); } catch (e) { console.warn('⚠️ GPS غير متاح.'); }
        }

        const geo = await fetchDetailedGeoInfo();
        const device = parseUserAgent();
        const sessionNumber = `SES-${new Date().toISOString().slice(0,10)}-${Math.floor(Math.random()*900000)+100000}`;

        const terminatedCount = await terminateOtherSessions(client, user, sessionNumber);
        if (terminatedCount > 0) {
            setTimeout(() => {
                alert(`تم إنهاء ${terminatedCount} جلسة نشطة أخرى تلقائياً.`);
            }, 500);
        }

        if (geo && (geo.proxy_detected || geo.tor_detected || geo.hosting_detected)) {
            showDeniedMessage('تم اكتشاف استخدام VPN أو Proxy. يرجى تعطيلها.');
            throw new Error('VPN_PROXY_DETECTED');
        }

        const { error } = await client.from('user_login_sessions').insert({
            user_id: user.id,
            session_number: sessionNumber,
            login_at: new Date().toISOString(),
            status: 'active',
            is_current_session: true,
            last_activity_at: new Date().toISOString(),
            login_method: 'password',
            login_status: 'success',
            ...device,
            ...(geo || {}),
            ...(gps || {}),
        });

        if (error) { console.error('❌ فشل تسجيل الجلسة:', error.message); }
        else {
            console.log('✅ جلسة جديدة:', sessionNumber);
            startLocationTracking(client, user.id);
        }
    }

    // ========== الكائن العام TeraAuth ==========
    window.TeraAuth = {
        _client: null, _user: null, _session: null, _initialized: false,

        init: async function () {
            if (this._initialized) return;
            this._initialized = true;
            try { this._client = await getSupabase(); } catch (e) { return; }

            const { data: { user }, error } = await this._client.auth.getUser();
            if (error || !user) { this.redirectTo(ROUTES.LOGIN); return; }

            currentUser = user;
            this._user = user;
            this.updateUI();

            const { data: activeSessions } = await this._client
                .from('user_login_sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .eq('is_current_session', true);

            if (!activeSessions || activeSessions.length === 0) {
                try { await createSession(this._client, user, true); } catch (e) { return; }
            } else {
                startLocationTracking(this._client, user.id);
            }
        },

        login: async function (email, password) {
            if (!this._client) throw new Error('Supabase غير متوفر');
            try {
                const { data, error } = await this._client.auth.signInWithPassword({ email, password });
                if (error) throw error;
                this._session = data.session;
                this._user = data.user;
                this.updateUI();
                await createSession(this._client, data.user, false);
                return { data, error: null };
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
            await this._client.from('user_login_sessions')
                .update({
                    status: 'logged_out',
                    logout_reason: 'تسجيل خروج بواسطة المستخدم',
                    logout_at: new Date().toISOString(),
                    is_current_session: false,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this._user.id)
                .eq('status', 'active');
            stopLocationTracking();
            await this._client.auth.signOut();
            this._user = null;
            this._session = null;
            this.redirectTo(ROUTES.LOGIN);
        },

        redirectTo: function (url) { window.location.replace(url); },

        updateUI: function () {
            const user = this._user;
            if (!user) {
                document.getElementById('headerUserName').textContent = 'زائر';
                document.getElementById('headerAvatar').textContent = 'ز';
                return;
            }
            const name = user.user_metadata?.full_name || user.email || 'مستخدم';
            document.getElementById('headerUserName').textContent = name;
            document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const path = window.location.pathname;
        if (!path.includes('/auth/auth/login/') && !path.includes('/auth/register/')) {
            window.TeraAuth.init();
        }
    });
})();
