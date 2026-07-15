/**
 * modules/session-manager.js – إدارة جلسات متكاملة وآمنة (v2)
 * 
 * المميزات:
 * - فحص أمان الشبكة (VPN/Proxy/Tor/Hosting) قبل إنشاء الجلسة
 * - إنهاء جميع الجلسات السابقة فوراً مع إشعار المستخدم
 * - إشعار فوري للجلسات المفتوحة الأخرى عبر BroadcastChannel
 * - إنهاء الجلسة تلقائياً عند إغلاق المتصفح، أو انقطاع الإنترنت، أو الخمول
 * - جمع كافة التفاصيل (موقع، جهاز، شبكة) وتخزينها
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

    async function terminateSession(sessionId, userId) {
        const sb = await getSupabase();
        if (!sb) return { success: false, error: 'Supabase غير متوفر' };
        const { error } = await sb.from('user_login_sessions')
            .update({
                status: 'terminated_by_user',
                logout_at: new Date().toISOString()
            })
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

        let connectionInfo = null;
        try {
            if (window.ConnectionInfo && window.ConnectionInfo.getConnectionInfo) {
                connectionInfo = await window.ConnectionInfo.getConnectionInfo();
            }
        } catch (e) { console.warn('تعذر جمع معلومات الاتصال:', e); }

        const geo = extraData.geo || {};
        const full = extraData.locationIQ || {};
        const gps = extraData.gps || {};

        const core = full.core || {};
        const addrComp = full.address_components || {};
        const addl = full.additional || {};

        const finalLat = full.latitude || full.lat || gps.latitude || geo.lat || connectionInfo?.ip?.lat || null;
        const finalLon = full.longitude || full.lon || gps.longitude || geo.lon || connectionInfo?.ip?.lon || null;
        const finalCity = addrComp.city || full.city || geo.city || connectionInfo?.ip?.city || null;
        const finalCountry = addrComp.country || full.country || geo.country || connectionInfo?.ip?.country || null;
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
            } : null
        };

        Object.keys(record).forEach(key => {
            if (record[key] === undefined) delete record[key];
        });

        const { error } = await sb.from('user_login_sessions').insert(record);
        if (error) {
            console.error('❌ فشل تسجيل الجلسة:', error);
            return false;
        }
        console.log('✅ تم تسجيل الجلسة بنجاح (تم إغلاق ' + closedCount + ' جلسة سابقة)');
        return true;
    }

    function generateSessionNumber() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `SES-${timestamp}-${randomPart}`;
    }

    // ========== حماية الجلسة (إغلاق المتصفح – انقطاع الإنترنت – الخمول) ==========
    let guardActive = false;
    let currentUserIdGuard = null;
    let currentSessionIdGuard = null;

    // إنهاء الجلسة عند إغلاق التبويب/المتصفح (باستخدام pagehide + fetch keepalive)
    async function handleTabClose(event) {
        if (!currentSessionIdGuard || !currentUserIdGuard) return;
        // لا يمكن الاعتماد على async/await هنا بالكامل، لذا نستخدم fetch مع keepalive
        const sb = await getSupabase();
        if (!sb) return;
        try {
            await sb.from('user_login_sessions')
                .update({
                    status: 'logged_out',
                    logout_at: new Date().toISOString(),
                    logout_reason: 'browser_close'
                })
                .eq('id', currentSessionIdGuard)
                .eq('user_id', currentUserIdGuard);
        } catch (e) {}
    }

    // إنهاء الجلسة عند انقطاع الاتصال بالإنترنت
    function handleOffline() {
        if (!currentSessionIdGuard || !currentUserIdGuard) return;
        const message = 'تم فقدان الاتصال بالإنترنت. سيتم إنهاء الجلسة.';
        if (window.UIHelpers && window.UIHelpers.showToast) {
            window.UIHelpers.showToast(message, 'danger', 5000);
        } else {
            alert(message);
        }
        // إنهاء الجلسة ثم التوجيه لصفحة الدخول
        terminateSession(currentSessionIdGuard, currentUserIdGuard)
            .then(() => {
                if (window.Auth?.logout) {
                    window.Auth.logout();
                } else {
                    window.location.href = '/auth/auth/login/login.html?reason=offline';
                }
            })
            .catch(() => {
                window.location.href = '/auth/auth/login/login.html?reason=offline';
            });
    }

    // إنهاء الجلسة عند الخمول (تستدعيها activity-tracker أو الصفحة)
    async function handleIdleTimeout(reason) {
        // reason يمكن أن يكون 'timeout' من activity tracker
        if (!currentSessionIdGuard || !currentUserIdGuard) return;
        await terminateSession(currentSessionIdGuard, currentUserIdGuard);
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

        // مستمع إغلاق التبويب
        window.addEventListener('pagehide', handleTabClose);
        // مستمع انقطاع الإنترنت
        window.addEventListener('offline', handleOffline);
        // يمكن أيضًا ربط الخمول عبر activity-tracker، لكننا نضيف handleIdleTimeout كمرجع
        // (ستستدعيها الصفحة بنفسها)
    }

    function stopSessionGuard() {
        if (!guardActive) return;
        window.removeEventListener('pagehide', handleTabClose);
        window.removeEventListener('offline', handleOffline);
        guardActive = false;
        currentUserIdGuard = null;
        currentSessionIdGuard = null;
    }

    // ========== الواجهة العامة ==========
    window.SessionManager = {
        fetchSessions,
        terminateSession,
        deactivateOtherSessions: deactivateAllActiveSessions,
        createSessionRecord,
        startSessionGuard,
        stopSessionGuard,
        handleIdleTimeout   // لاستخدامها من activity-tracker
    };
})();
