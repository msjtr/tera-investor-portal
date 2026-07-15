/**
 * modules/session-manager.js – إدارة جلسات متكاملة وآمنة (v8)
 * 
 * المميزات:
 * - فحص أمان الشبكة (VPN/Proxy/Tor/Hosting) قبل إنشاء الجلسة
 * - إنهاء جميع الجلسات السابقة فوراً مع إشعار المستخدم
 * - إشعار فوري للجلسات المفتوحة الأخرى عبر BroadcastChannel
 * - إنهاء الجلسة تلقائياً عند انقطاع الإنترنت أو الخمول (بدون pagehide)
 * - جمع كافة التفاصيل (موقع، جهاز، شبكة، معلومات الاستعلام) وتخزينها
 * - خطة بديلة قوية لجلب IP العامة عبر ip-api.com + ipinfo.io عند فشل ConnectionInfo
 * - ضمان ظهور مصادر الكشف دائمًا
 */
(function() {
    'use strict';

    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    // ========== دوال الجلسات الأساسية ==========

    async function fetchSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return [];
        const { data, error } = await sb.from('user_login_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('login_at', { ascending: false });
        if (error) {
            console.error('فشل جلب الجلسات:', error);
            return [];
        }
        return data || [];
    }

    async function terminateSession(sessionId, userId, reason = null) {
        const sb = await getSupabase();
        if (!sb) return { success: false, error: 'Supabase غير متوفر' };
        const updateData = {
            status: 'terminated_by_user',
            logout_at: new Date().toISOString()
        };
        if (reason) updateData.logout_reason = reason;

        const { error } = await sb.from('user_login_sessions')
            .update(updateData)
            .eq('id', sessionId)
            .eq('user_id', userId);
        if (error) {
            console.error('فشل إنهاء الجلسة:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    async function deactivateAllActiveSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return 0;

        const { data: activeSessions, error } = await sb.from('user_login_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (error) {
            console.error('فشل جلب الجلسات النشطة:', error);
            return 0;
        }
        if (!activeSessions || activeSessions.length === 0) return 0;

        let terminatedCount = 0;
        for (const session of activeSessions) {
            const { error: updateError } = await sb.from('user_login_sessions')
                .update({
                    status: 'terminated_by_system',
                    logout_at: new Date().toISOString(),
                    logout_reason: 'تم إنهاء الجلسة تلقائياً لوجود جلسة أحدث',
                    is_current_session: false
                })
                .eq('id', session.id)
                .eq('user_id', userId);
            if (!updateError) terminatedCount++;
        }
        return terminatedCount;
    }

    async function terminateAllSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return { success: false, count: 0 };
        const { data: activeSessions, error } = await sb.from('user_login_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (error) return { success: false, count: 0 };
        if (!activeSessions || activeSessions.length === 0) return { success: true, count: 0 };

        let count = 0;
        for (const s of activeSessions) {
            const { error: err } = await sb.from('user_login_sessions')
                .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
                .eq('id', s.id)
                .eq('user_id', userId);
            if (!err) count++;
        }
        return { success: true, count };
    }

    function notifyOtherTabs() {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            const channel = new BroadcastChannel('tera_session_channel');
            channel.postMessage({ action: 'SESSION_TERMINATED_BY_NEW_LOGIN' });
            channel.close();
        } catch (e) {}
    }

    // ========== إنشاء الجلسة ==========

    async function createSessionRecord(userId, extraData = {}) {
        const sb = await getSupabase();
        if (!sb) return false;

        if (window.SecurityEnforcer && window.SecurityEnforcer.enforceSecureConnection) {
            const isSafe = await window.SecurityEnforcer.enforceSecureConnection();
            if (!isSafe) return false;
        }

        const closedCount = await deactivateAllActiveSessions(userId);

        if (closedCount > 0) {
            notifyOtherTabs();
            const message = closedCount === 1
                ? 'تم إغلاق جلسة سابقة واحدة لوجود جلسة أحدث.'
                : `تم إغلاق ${closedCount} جلسات سابقة لوجود جلسة أحدث.`;
            if (window.UIHelpers && window.UIHelpers.showToast) {
                window.UIHelpers.showToast(message, 'info', 4000);
            } else {
                alert(message);
            }
        }

        let deviceInfo = {};
        try {
            if (window.DeviceInfo && window.DeviceInfo.getDeviceAndBrowserInfo) {
                deviceInfo = await window.DeviceInfo.getDeviceAndBrowserInfo();
            }
        } catch (e) { console.warn('تعذر جمع معلومات الجهاز:', e); }

        // ⭐ تجميع معلومات الاتصال (مع خطة بديلة قوية)
        let connectionInfo = null;
        try {
            if (window.ConnectionInfo && window.ConnectionInfo.getConnectionInfo) {
                connectionInfo = await window.ConnectionInfo.getConnectionInfo();
            }
        } catch (e) { console.warn('تعذر جمع معلومات الاتصال:', e); }

        // ⚡ إذا فشل ConnectionInfo أو لم يُعِد IP عام، استخدم الخطط البديلة
        if (!connectionInfo || !connectionInfo.ip?.public) {
            // خطة 1: ip-api.com
            try {
                console.log('🔄 محاولة ip-api.com...');
                const res = await fetch('https://ip-api.com/json/?fields=proxy,hosting,query,isp,org,as,country,countryCode,region,city,timezone');
                if (res.ok) {
                    const d = await res.json();
                    if (d.query) {
                        const browserNet = (window.ConnectionInfo?.getBrowserNetworkInfo) 
                            ? window.ConnectionInfo.getBrowserNetworkInfo() 
                            : { online: navigator.onLine, effectiveType: 'غير معروف', downlink: null, rtt: null, saveData: false, type: 'غير معروف' };
                        connectionInfo = {
                            network: {
                                online: browserNet.online,
                                type: browserNet.type || 'غير معروف',
                                effectiveType: browserNet.effectiveType || 'غير معروف',
                                downlinkSpeed: browserNet.downlink ?? null,
                                latency: browserNet.rtt ?? null,
                                saveData: browserNet.saveData || false
                            },
                            ip: {
                                public: d.query,
                                local: connectionInfo?.ip?.local || null,
                                isp: d.isp || d.org || null,
                                org: d.org || null,
                                asn: d.as || null,
                                country: d.country || null,
                                countryCode: d.countryCode || null,
                                region: d.regionName || d.region || null,
                                city: d.city || null,
                                timezone: d.timezone || null,
                                lat: d.lat || null,
                                lon: d.lon || null
                            },
                            security: {
                                isVPN: d.proxy || d.hosting || false,
                                isProxy: d.proxy || false,
                                isTor: false,
                                isHosting: d.hosting || false,
                                isDatacenter: d.hosting || false,
                                sources: ['ip-api.com'],
                                details: { ip_api: d }
                            }
                        };
                        console.log('✅ تم جلب IP العامة عبر ip-api.com');
                    }
                }
            } catch (e) { console.warn('❌ فشل ip-api.com:', e); }

            // خطة 2: ipinfo.io عام (إذا لم تنجح السابقة)
            if (!connectionInfo || !connectionInfo.ip?.public) {
                try {
                    console.log('🔄 محاولة ipinfo.io...');
                    const res = await fetch('https://ipinfo.io/json');
                    if (res.ok) {
                        const d = await res.json();
                        if (d.ip) {
                            const browserNet = (window.ConnectionInfo?.getBrowserNetworkInfo) 
                                ? window.ConnectionInfo.getBrowserNetworkInfo() 
                                : { online: navigator.onLine, effectiveType: 'غير معروف', downlink: null, rtt: null, saveData: false, type: 'غير معروف' };
                            connectionInfo = {
                                network: {
                                    online: browserNet.online,
                                    type: browserNet.type || 'غير معروف',
                                    effectiveType: browserNet.effectiveType || 'غير معروف',
                                    downlinkSpeed: browserNet.downlink ?? null,
                                    latency: browserNet.rtt ?? null,
                                    saveData: browserNet.saveData || false
                                },
                                ip: {
                                    public: d.ip,
                                    local: connectionInfo?.ip?.local || null,
                                    isp: d.org || null,
                                    org: d.org || null,
                                    asn: d.asn?.replace('AS', '') || null,
                                    country: d.country || null,
                                    countryCode: d.country || null,
                                    region: d.region || null,
                                    city: d.city || null,
                                    timezone: d.timezone || null,
                                    lat: d.loc ? d.loc.split(',')[0] : null,
                                    lon: d.loc ? d.loc.split(',')[1] : null
                                },
                                security: {
                                    isVPN: false,
                                    isProxy: false,
                                    isTor: false,
                                    isHosting: false,
                                    isDatacenter: false,
                                    sources: ['ipinfo.io'],
                                    details: { ipinfo_io: d }
                                }
                            };
                            console.log('✅ تم جلب IP العامة عبر ipinfo.io');
                        }
                    }
                } catch (e) { console.warn('❌ فشل ipinfo.io:', e); }
            }
        }

        // ⚡ إذا ظل connectionInfo فارغًا، أنشئ كائنًا افتراضيًا مع مصدر "غير معروف"
        if (!connectionInfo) {
            const browserNet = (window.ConnectionInfo?.getBrowserNetworkInfo) 
                ? window.ConnectionInfo.getBrowserNetworkInfo() 
                : { online: navigator.onLine, effectiveType: 'غير معروف', downlink: null, rtt: null, saveData: false, type: 'غير معروف' };
            connectionInfo = {
                network: {
                    online: browserNet.online,
                    type: browserNet.type || 'غير معروف',
                    effectiveType: browserNet.effectiveType || 'غير معروف',
                    downlinkSpeed: browserNet.downlink ?? null,
                    latency: browserNet.rtt ?? null,
                    saveData: browserNet.saveData || false
                },
                ip: { public: null, local: null, isp: null, org: null, asn: null, country: null, countryCode: null, region: null, city: null, timezone: null, lat: null, lon: null },
                security: { isVPN: false, isProxy: false, isTor: false, isHosting: false, isDatacenter: false, sources: ['لم يتم تحديد المصدر'], details: {} }
            };
        }

        // ✨ ضمان وجود sources دائمًا
        if (!connectionInfo.security.sources || connectionInfo.security.sources.length === 0) {
            connectionInfo.security.sources = ['لم يتم تحديد المصدر'];
        }

        const geo = extraData.geo || {};
        const full = extraData.locationIQ || {};
        const gps = extraData.gps || {};

        const core = full.core || {};
        const addrComp = full.address_components || {};
        const addl = full.additional || {};

        const finalLat = full.latitude || full.lat || gps.latitude || geo.lat || connectionInfo?.ip?.lat || null;
        const finalLon = full.longitude || full.lon || gps.longitude || geo.lon || connectionInfo?.ip?.lon || null;
        const finalCity = addrComp.city || full.city || connectionInfo?.ip?.city || geo.city || null;
        const finalCountry = addrComp.country || full.country || connectionInfo?.ip?.country || geo.country || null;
        const finalState = addrComp.state || full.state || connectionInfo?.ip?.region || null;
        const finalPostcode = addrComp.postcode || full.postcode || null;

        const ipAddress = connectionInfo?.ip?.public || geo.ip || extraData.ip || null;
        const isp = connectionInfo?.ip?.isp || geo.isp || null;
        const isVPN = connectionInfo?.security?.isVPN || geo.proxy || false;
        const isProxy = connectionInfo?.security?.isProxy || geo.proxy || false;
        const isTor = connectionInfo?.security?.isTor || false;
        const isHosting = connectionInfo?.security?.isHosting || geo.hosting || false;

        const record = {
            user_id: userId,
            session_number: generateSessionNumber(),
            login_at: new Date().toISOString(),
            status: 'active',
            is_current_session: true,

            ip_address: ipAddress,
            isp: isp,
            country: finalCountry,
            country_code: full.country_code || geo.country_code || connectionInfo?.ip?.countryCode || null,
            city: finalCity,
            state: finalState,
            postal_code: finalPostcode,
            province: full.province || finalState || null,
            district: full.district || addrComp.suburb || addrComp.quarter || null,
            neighbourhood: full.neighbourhood || addrComp.suburb || null,
            road: addrComp.road || full.road || null,
            house_number: addrComp.house_number || full.house_number || null,
            quarter: addrComp.quarter || full.quarter || null,
            government: addrComp.government || full.government || null,
            display_name: core.display_name || full.display_name || null,
            latitude: finalLat,
            longitude: finalLon,

            place_id: core.place_id || full.place_id || null,
            licence: core.licence || full.licence || null,
            osm_type: core.osm_type || full.osm_type || null,
            osm_id: core.osm_id || full.osm_id || null,
            match_code: full.match_code || (addl.matchquality ? addl.matchquality.matchcode : null) || null,
            match_type: full.match_type || (addl.matchquality ? addl.matchquality.matchtype : null) || null,
            match_level: full.match_level || (addl.matchquality ? addl.matchquality.matchlevel : null) || null,
            boundingbox: full.boundingbox ? (Array.isArray(full.boundingbox) ? full.boundingbox.join(',') : full.boundingbox) : null,

            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || connectionInfo?.ip?.timezone || null,

            vpn_detected: isVPN,
            proxy_detected: isProxy,
            tor_detected: isTor,
            hosting_detected: isHosting,

            device_type: deviceInfo.device_type || null,
            browser_name: deviceInfo.browser_name || null,
            browser_version: deviceInfo.browser_version || null,
            browser_engine: deviceInfo.browser_engine || null,
            user_agent: deviceInfo.user_agent || null,
            operating_system: deviceInfo.operating_system || null,
            os_version: deviceInfo.os_version || null,
            platform: deviceInfo.platform || null,
            language: deviceInfo.language || null,
            screen_resolution: deviceInfo.screen_resolution || null,
            pixel_ratio: deviceInfo.pixel_ratio || null,
            color_depth: deviceInfo.color_depth || null,
            cpu_architecture: deviceInfo.os_architecture || null,
            device_memory: deviceInfo.device_memory || null,
            touch_supported: deviceInfo.touch_supported || null,
            cookies_enabled: deviceInfo.cookies_enabled || null,
            local_storage: deviceInfo.local_storage || null,
            session_storage: deviceInfo.session_storage || null,
            indexed_db: deviceInfo.indexed_db || null,
            webgl_supported: deviceInfo.browser_features?.webgl || null,
            fingerprint: deviceInfo.fingerprint || null,

            network_type: connectionInfo?.network?.type || null,
            network_online: connectionInfo?.network?.online ?? null,
            network_effective_type: connectionInfo?.network?.effectiveType || null,
            network_downlink: connectionInfo?.network?.downlinkSpeed ?? null,
            network_rtt: connectionInfo?.network?.latency ?? null,
            network_save_data: connectionInfo?.network?.saveData ?? null,

            connection_info: connectionInfo || null,

            extra_device_info: deviceInfo ? {
                battery: deviceInfo.battery,
                browser_features: deviceInfo.browser_features,
                incognito_likely: deviceInfo.incognito_likely,
                plugins: deviceInfo.plugins,
                mime_types: deviceInfo.mime_types,
                touch_points: deviceInfo.max_touch_points
            } : null,

            request_started_at: full.request_started_at || null,
            response_received_at: full.response_received_at || null,
            execution_time_ms: full.execution_time_ms || null,
            gps_source: full.gps_source || null,
            gps_accuracy: full.gps_accuracy || null
        };

        Object.keys(record).forEach(key => {
            if (record[key] === undefined) delete record[key];
        });

        const { data: inserted, error } = await sb.from('user_login_sessions').insert(record).select('id').single();
        if (error) {
            console.error('❌ فشل تسجيل الجلسة:', error);
            return false;
        }
        const sessionId = inserted.id;
        try { sessionStorage.setItem('currentSessionId', sessionId); } catch (e) {}
        console.log('✅ تم تسجيل الجلسة بنجاح – المعرف: ' + sessionId + ' (تم إغلاق ' + closedCount + ' جلسة سابقة)');
        return { success: true, sessionId };
    }

    function generateSessionNumber() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `SES-${timestamp}-${randomPart}`;
    }

    // ========== حماية الجلسة (انقطاع الإنترنت – الخمول) ==========
    let guardActive = false;
    let currentUserIdGuard = null;
    let currentSessionIdGuard = null;

    function handleOffline() {
        if (!currentSessionIdGuard || !currentUserIdGuard) return;
        const message = 'تم فقدان الاتصال بالإنترنت. سيتم إنهاء الجلسة.';
        if (window.UIHelpers && window.UIHelpers.showToast) {
            window.UIHelpers.showToast(message, 'danger', 5000);
        } else {
            alert(message);
        }
        terminateSession(currentSessionIdGuard, currentUserIdGuard, 'network_loss')
            .finally(() => {
                if (window.Auth?.logout) window.Auth.logout();
                else window.location.href = '/auth/auth/login/login.html?reason=offline';
            });
    }

    async function handleIdleTimeout(reason) {
        if (!currentSessionIdGuard || !currentUserIdGuard) return;
        await terminateSession(currentSessionIdGuard, currentUserIdGuard, reason || 'idle');
        if (window.Auth?.logout) {
            await window.Auth.logout();
        } else {
            window.location.href = `/auth/auth/login/login.html?reason=${reason || 'idle'}`;
        }
    }

    function startSessionGuard(userId, sessionId) {
        if (guardActive) stopSessionGuard();
        currentUserIdGuard = userId;
        currentSessionIdGuard = sessionId;
        guardActive = true;
        window.addEventListener('offline', handleOffline);
    }

    function stopSessionGuard() {
        if (!guardActive) return;
        window.removeEventListener('offline', handleOffline);
        guardActive = false;
        currentUserIdGuard = null;
        currentSessionIdGuard = null;
    }

    function getCurrentSessionInfo() {
        return {
            userId: currentUserIdGuard,
            sessionId: currentSessionIdGuard
        };
    }

    // ========== الواجهة العامة ==========
    window.SessionManager = {
        fetchSessions,
        terminateSession,
        deactivateOtherSessions: deactivateAllActiveSessions,
        createSessionRecord,
        terminateAllSessions,
        startSessionGuard,
        stopSessionGuard,
        handleIdleTimeout,
        getCurrentSessionInfo
    };
})();
