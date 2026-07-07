/**
 * ==========================================================
 * assets/js/auth.js – مدير المصادقة المركزي (Enterprise)
 * ==========================================================
 * - يستخدم جداول: user_login_sessions, auth_devices, auth_security_logs
 * - يسجل جلسات الدخول مع تفاصيل الجهاز، الموقع، المخاطر، GPS
 * - يطلب الموقع الجغرافي بشكل إجباري ويوقِف الخدمة عند الرفض
 * - يستخدم FingerprintJS لبصمة الجهاز
 * - يستخدم Edge Function ipinfo لجلب بيانات IP
 */

(function () {
    'use strict';

    const ROUTES = {
        LOGIN: '/auth/auth/login/login.html',
        DASHBOARD: '/pages/dashboard/index.html',
    };

    let fpPromise = null;

    async function waitForSupabase() {
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
            platform: navigator.platform || '',
            cpu_architecture: '',
        };

        if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
            result.device_type = /iPad|tablet/i.test(ua) ? 'tablet' : 'mobile';
        }

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

        if (navigator.userAgentData?.brands) {
            const brand = navigator.userAgentData.brands.find(b => b.brand !== 'Not;A=Brand' && b.brand !== 'Chromium');
            if (brand) {
                result.browser_name = brand.brand;
                result.browser_version = brand.version;
            }
        }
        if (!result.browser_name) {
            if (/Edg\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Edge'; result.browser_version = RegExp.$1; }
            else if (/Firefox\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Firefox'; result.browser_version = RegExp.$1; }
            else if (/Chrome\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Chrome'; result.browser_version = RegExp.$1; }
            else if (/Safari\/(\d+\.\d+)/.test(ua)) { result.browser_name = 'Safari'; result.browser_version = RegExp.$1; }
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

    async function getFingerprint() {
        if (!fpPromise) {
            if (window.FingerprintJS) {
                fpPromise = FingerprintJS.load().then(fp => fp.get());
            } else {
                return null;
            }
        }
        try {
            const result = await fpPromise;
            return result.visitorId;
        } catch (e) {
            return null;
        }
    }

    // استدعاء Edge Function ipinfo
    async function fetchIPInfo(ip) {
        const supabase = window.TeraAuth?._client || await waitForSupabase();
        if (!supabase) return null;
        try {
            const { data, error } = await supabase.functions.invoke('ipinfo', {
                body: { ip: ip || '' }
            });
            if (error) throw error;
            return data;
        } catch (e) {
            console.warn('تعذر جلب معلومات IP عبر Edge Function:', e);
            return null;
        }
    }

    function calculateRisk(ipInfo, isNewDevice, isNewLocation) {
        let score = 0;
        if (ipInfo?.proxy_detected) score += 30;
        if (ipInfo?.tor_detected) score += 40;
        if (ipInfo?.hosting_detected) score += 25;
        if (isNewDevice) score += 20;
        if (isNewLocation) score += 15;
        let level = 'low';
        if (score >= 60) level = 'high';
        else if (score >= 30) level = 'medium';
        return { score, level };
    }

    function requestLocationPermission() {
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

    async function recordLoginSession(client, user, method = 'password', status = 'success') {
        if (!client || !user) return;

        // GPS إجباري (يتم استدعاؤه مسبقاً من enforceLocationPolicy، لكن نحاول هنا أيضاً)
        let gpsCoords = null;
        try { gpsCoords = await requestLocationPermission(); } catch (e) { console.warn('GPS غير متاح أثناء تسجيل الجلسة'); }

        const ipInfo = await fetchIPInfo('');
        const deviceInfo = parseUserAgent();
        const fingerprint = await getFingerprint();

        // التحقق مما إذا كان جهازًا أو موقعًا جديدًا
        let isNewDevice = false;
        let isNewLocation = false;
        try {
            const { data: existingDevices } = await client.from('auth_devices')
                .select('fingerprint')
                .eq('user_id', user.id)
                .eq('fingerprint', fingerprint);
            if (!existingDevices || existingDevices.length === 0) isNewDevice = true;

            const { data: lastSessions } = await client.from('user_login_sessions')
                .select('country, city')
                .eq('user_id', user.id)
                .order('login_at', { ascending: false })
                .limit(1);
            if (lastSessions && lastSessions.length > 0) {
                const last = lastSessions[0];
                if (ipInfo && (ipInfo.country !== last.country || ipInfo.city !== last.city)) {
                    isNewLocation = true;
                }
            }
        } catch (e) {}

        const risk = calculateRisk(ipInfo, isNewDevice, isNewLocation);
        const sessionNumber = `SES-${new Date().toISOString().slice(0,10)}-${Math.floor(Math.random()*900000)+100000}`;

        try {
            // إنهاء الجلسات السابقة
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

            const sessionData = {
                user_id: user.id,
                session_number: sessionNumber,
                login_at: new Date().toISOString(),
                status: 'active',
                is_current_session: true,
                last_activity_at: new Date().toISOString(),
                login_method: method,
                login_status: status,
                ...deviceInfo,
                ...(ipInfo ? {
                    ip_address: ipInfo.ip,
                    country: ipInfo.country_name || ipInfo.country,
                    region: ipInfo.region,
                    city: ipInfo.city,
                    postal_code: ipInfo.postal,
                    latitude: ipInfo.latitude,
                    longitude: ipInfo.longitude,
                    timezone: ipInfo.timezone,
                    isp: ipInfo.org || ipInfo.isp,
                    asn: ipInfo.asn,
                    country_code: ipInfo.country,
                    isp_organization: ipInfo.org,
                    proxy_detected: ipInfo.proxy_detected || false,
                    tor_detected: ipInfo.tor_detected || false,
                    hosting_detected: ipInfo.hosting_detected || false,
                } : {}),
                ...(gpsCoords || {}),
                fingerprint: fingerprint,
                risk_level: risk.level,
                risk_score: risk.score,
                is_new_device: isNewDevice,
                is_new_location: isNewLocation,
                requires_security_review: risk.level === 'high',
            };

            await client.from('user_login_sessions').insert(sessionData);

            // تحديث / إدراج جهاز موثوق
            if (fingerprint) {
                const { data: existingDevice } = await client.from('auth_devices')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('fingerprint', fingerprint)
                    .maybeSingle();

                if (existingDevice) {
                    await client.from('auth_devices')
                        .update({
                            last_login_at: new Date().toISOString(),
                            total_logins: client.raw('total_logins + 1'),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingDevice.id);
                } else {
                    await client.from('auth_devices').insert({
                        user_id: user.id,
                        fingerprint: fingerprint,
                        device_type: deviceInfo.device_type,
                        device_name: deviceInfo.device_name,
                        browser: deviceInfo.browser_name,
                        operating_system: deviceInfo.operating_system,
                        ip_address: ipInfo?.ip,
                        first_login: new Date().toISOString(),
                        last_login_at: new Date().toISOString(),
                        total_logins: 1,
                        is_trusted: false
                    });
                }
            }

            // سجل حدث أمان
            await client.from('auth_security_logs').insert({
                user_id: user.id,
                event_type: 'login',
                event_name: 'تسجيل دخول',
                description: `تسجيل دخول ناجح (${method})`,
                ip_address: ipInfo?.ip,
                risk_level: risk.level,
                metadata: { session_number: sessionNumber, risk_score: risk.score }
            });
        } catch (err) {
            console.error('فشل تسجيل الجلسة:', err);
        }
    }

    window.TeraAuth = {
        _client: null,
        _session: null,
        _user: null,
        _initialized: false,

        init: async function () {
            if (this._initialized) return;
            this._initialized = true;
            try {
                this._client = await waitForSupabase();
            } catch (e) {
                console.warn('⚠️ Supabase غير متوفر');
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
                        this.enforceLocationPolicy().catch(e => console.warn('سياسة الموقع:', e));
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
                    await this.enforceLocationPolicy();
                } catch (error) {
                    // تم عرض رسالة الإيقاف بالفعل
                    return;
                }
            }
            console.log('🔒 [Auth] تم تأمين الواجهة');
        },

        enforceLocationPolicy: async function () {
            try {
                const coords = await requestLocationPermission();
                if (this._user && this._client) {
                    await this._client.from('user_login_sessions')
                        .update({
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                            last_activity_at: new Date().toISOString()
                        })
                        .eq('user_id', this._user.id)
                        .eq('status', 'active')
                        .eq('is_current_session', true);
                }
                if (window.startContinuousLocationWatch) {
                    window.startContinuousLocationWatch();
                }
            } catch (error) {
                console.warn('❌ [Auth] رفض تحديد الموقع');
                showLocationDeniedMessage();
                throw new Error('LOCATION_PERMISSION_DENIED');
            }
        },

        login: async function (email, password) {
            if (!this._client) throw new Error('Supabase غير متوفر');
            try {
                const { data, error } = await this._client.auth.signInWithPassword({ email, password });
                if (error) {
                    // تسجيل فشل الدخول
                    await this._client.from('user_login_sessions').insert({
                        user_id: (await this._client.auth.getUser()).data.user?.id || null,
                        login_at: new Date().toISOString(),
                        login_status: 'failed',
                        login_method: 'password',
                        status: 'failed'
                    }).catch(() => {});
                    return { data: null, error };
                }
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
                    await this._client.from('user_login_sessions')
                        .update({
                            status: 'logged_out',
                            logout_reason: 'تسجيل خروج بواسطة المستخدم',
                            logout_at: new Date().toISOString(),
                            is_current_session: false,
                            updated_at: new Date().toISOString(),
                            logout_type: 'manual'
                        })
                        .eq('user_id', this._user.id)
                        .eq('status', 'active');

                    await this._client.from('auth_security_logs').insert({
                        user_id: this._user.id,
                        event_type: 'logout',
                        event_name: 'تسجيل خروج',
                        description: 'تسجيل خروج يدوي',
                        ip_address: ''
                    });
                }
                if (window.stopContinuousLocationWatch) {
                    window.stopContinuousLocationWatch();
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
