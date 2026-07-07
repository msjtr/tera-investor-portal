/**
 * auth.js – مدير المصادقة المركزي (Enterprise v2)
 * - يسجل جلسات الدخول تلقائياً مع تفاصيل الجهاز، الموقع، ISP
 * - GPS إجباري مع إيقاف الخدمة عند الرفض
 * - تتبع الموقع طوال الجلسة
 * - يستخدم Edge Function ipinfo (مع fallback تلقائي)
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
        if (/Windows NT (\d+\.\d+)/.test(ua)) {
            result.operating_system = `Windows ${RegExp.$1}`;
        } else if (/Mac OS X (\d+[._]\d+)/.test(ua)) {
            result.operating_system = `macOS ${RegExp.$1}`;
        }
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

        return result;
    }

    // ========== جلب IP ومعلومات الموقع (Edge Function أو fallback) ==========
    async function fetchGeoInfo(client) {
        // 1. محاولة استخدام Edge Function ipinfo
        if (client && client.functions) {
            try {
                const { data, error } = await client.functions.invoke('ipinfo', { body: {} });
                if (!error && data && data.ip) {
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
                    };
                }
            } catch (e) {
                console.warn('⚠️ Edge Function ipinfo فشلت، استخدام fallback...');
            }
        }

        // 2. Fallback: استخدام ipapi.co/jsonp (بدون CORS)
        return new Promise((resolve) => {
            const callbackName = 'geo_' + Math.random().toString(36).substr(2, 9);
            window[callbackName] = function(data) {
                document.body.removeChild(script);
                delete window[callbackName];
                resolve({
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
                    asn: null,
                });
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
            if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
            const timeout = setTimeout(() => reject(new Error('Location timeout')), 10000);
            navigator.geolocation.getCurrentPosition(
                pos => {
                    clearTimeout(timeout);
                    resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                },
                err => {
                    clearTimeout(timeout);
                    reject(err);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    // ========== إيقاف الخدمة (رسالة رفض GPS) ==========
    function showDeniedMessage() {
        document.body.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:100vh; background:#f1f5f9; font-family:Tajawal,sans-serif;">
                <div style="background:#fff; padding:40px; border-radius:16px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.1); max-width:500px;">
                    <i class="fas fa-map-marker-alt" style="font-size:64px; color:#dc2626; margin-bottom:20px;"></i>
                    <h2 style="color:#0A1B3F;">تم إيقاف الخدمة</h2>
                    <p style="color:#475569; margin-bottom:24px;">نظرًا لعدم اتباع سياسة المنصة ورفض مشاركة الموقع الجغرافي، لا يمكنك متابعة استخدام الخدمة.</p>
                    <button onclick="location.reload()" style="background:#028090; color:#fff; border:none; padding:12px 32px; border-radius:8px; font-weight:700;">إعادة المحاولة</button>
                </div>
            </div>
        `;
    }

    // ========== تتبع الموقع المستمر ==========
    function startLocationTracking(client, userId) {
        if (!navigator.geolocation) return;
        if (locationWatchId) navigator.geolocation.clearWatch(locationWatchId);

        locationWatchId = navigator.geolocation.watchPosition(
            async (pos) => {
                try {
                    await client.from('user_login_sessions')
                        .update({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            last_activity_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .eq('status', 'active')
                        .eq('is_current_session', true);
                } catch (e) {}
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
                    stopLocationTracking();
                    showDeniedMessage();
                }
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
    }

    function stopLocationTracking() {
        if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
        }
    }

    // ========== تسجيل جلسة جديدة ==========
    async function createSession(client, user) {
        // 1. GPS
        let gps = null;
        try {
            gps = await requestLocation();
        } catch (e) {
            showDeniedMessage();
            throw new Error('LOCATION_DENIED');
        }

        // 2. Geo info
        const geo = await fetchGeoInfo(client);

        // 3. Device info
        const device = parseUserAgent();

        // 4. إنهاء الجلسات النشطة السابقة
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

        // 5. إنشاء رقم جلسة
        const sessionNumber = `SES-${new Date().toISOString().slice(0,10)}-${Math.floor(Math.random()*900000)+100000}`;

        // 6. إدراج الجلسة الجديدة
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

        if (error) {
            console.error('❌ فشل تسجيل الجلسة:', error.message);
        } else {
            console.log('✅ جلسة جديدة:', sessionNumber);
            startLocationTracking(client, user.id);
        }
    }

    // ========== الكائن العام TeraAuth ==========
    window.TeraAuth = {
        _client: null,
        _user: null,
        _initialized: false,

        init: async function () {
            if (this._initialized) return;
            this._initialized = true;

            try {
                this._client = await getSupabase();
                supabaseClient = this._client;
            } catch (e) {
                console.error('Supabase غير متوفر');
                return;
            }

            const { data: { user } } = await this._client.auth.getUser();
            if (!user) {
                this.redirectTo(ROUTES.LOGIN);
                return;
            }

            currentUser = user;
            this._user = user;
            this.updateUI();

            // التحقق من وجود جلسة نشطة حالية
            const { data: activeSessions } = await this._client
                .from('user_login_sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .eq('is_current_session', true);

            if (!activeSessions || activeSessions.length === 0) {
                // إنشاء جلسة جديدة إذا لم توجد
                try {
                    await createSession(this._client, user);
                } catch (e) {
                    // إذا فشل GPS، تم عرض رسالة الإيقاف
                    return;
                }
            } else {
                // تتبع الموقع للجلسة الحالية
                startLocationTracking(this._client, user.id);
            }

            console.log('🔒 TeraAuth جاهز');
        },

        getUser: async function () {
            if (!this._client) return null;
            const { data: { user } } = await this._client.auth.getUser();
            this._user = user;
            currentUser = user;
            this.updateUI();
            return user;
        },

        logout: async function () {
            if (!this._client || !this._user) return;
            await this._client.from('user_login_sessions')
                .update({
                    status: 'logged_out',
                    logout_reason: 'تسجيل خروج',
                    logout_at: new Date().toISOString(),
                    is_current_session: false,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this._user.id)
                .eq('status', 'active')
                .eq('is_current_session', true);

            stopLocationTracking();
            await this._client.auth.signOut();
            this._user = null;
            this.redirectTo(ROUTES.LOGIN);
        },

        redirectTo: (url) => { window.location.replace(url); },

        updateUI: function () {
            const user = this._user;
            if (!user) {
                const hName = document.getElementById('headerUserName');
                const hAvatar = document.getElementById('headerAvatar');
                if (hName) hName.textContent = 'زائر';
                if (hAvatar) hAvatar.textContent = 'ز';
                return;
            }
            const name = user.user_metadata?.full_name || user.email || 'مستخدم';
            document.getElementById('headerUserName').textContent = name;
            document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
        }
    };

    // التهيئة التلقائية عند تحميل الصفحة (باستثناء صفحات الدخول)
    document.addEventListener('DOMContentLoaded', () => {
        const path = window.location.pathname;
        if (!path.includes('/auth/auth/login/') && !path.includes('/auth/register/')) {
            window.TeraAuth.init();
        }
    });
})();
