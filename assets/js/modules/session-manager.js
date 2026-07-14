/**
 * modules/session-manager.js – إدارة جلسات متكاملة وآمنة
 * - فحص أمان الشبكة (VPN/Proxy/Tor/Hosting) قبل إنشاء الجلسة
 * - دمج معلومات الموقع (LocationIQ) + الجهاز (DeviceInfo) + الشبكة (ConnectionInfo)
 * - تخزين كافة التفاصيل في جدول الجلسات
 */
(function() {
    'use strict';

    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    // ───────────────────────────────────────
    // 1. جلب جميع جلسات المستخدم
    // ───────────────────────────────────────
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

    // ───────────────────────────────────────
    // 2. إنهاء جلسة واحدة (يدوياً)
    // ───────────────────────────────────────
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

    // ───────────────────────────────────────
    // 3. إنهاء جميع الجلسات النشطة السابقة (ما عدا الحالية)
    // ───────────────────────────────────────
    async function deactivateAllActiveSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return false;

        const { data: activeSessions, error } = await sb.from('user_login_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (error) {
            console.error('فشل جلب الجلسات النشطة:', error);
            return false;
        }
        if (!activeSessions || activeSessions.length === 0) return true;

        let allTerminated = true;
        for (const session of activeSessions) {
            const { error: updateError } = await sb.from('user_login_sessions')
                .update({
                    status: 'terminated_by_system',
                    logout_at: new Date().toISOString()
                })
                .eq('id', session.id)
                .eq('user_id', userId);
            if (updateError) {
                console.error('فشل إنهاء الجلسة:', session.id, updateError);
                allTerminated = false;
            }
        }
        return allTerminated;
    }

    // ───────────────────────────────────────
    // 4. إنشاء سجل جلسة جديد (الوظيفة الرئيسية)
    // ───────────────────────────────────────
    async function createSessionRecord(userId, extraData = {}) {
        const sb = await getSupabase();
        if (!sb) return false;

        // 🛡️ 4.0 فحص أمان الشبكة (VPN/Proxy/Tor/Hosting) – إذا كان مشبوهاً، نوقف الجلسة فوراً
        if (window.SecurityEnforcer && window.SecurityEnforcer.enforceSecureConnection) {
            const isSafe = await window.SecurityEnforcer.enforceSecureConnection();
            if (!isSafe) {
                // تم عرض إشعار للمستخدم من داخل security-enforcer.js
                return false;
            }
        }

        // 4.1 إنهاء الجلسات القديمة النشطة
        await deactivateAllActiveSessions(userId);

        // 4.2 جمع معلومات الجهاز والمتصفح
        let deviceInfo = {};
        try {
            if (window.DeviceInfo && window.DeviceInfo.getDeviceAndBrowserInfo) {
                deviceInfo = await window.DeviceInfo.getDeviceAndBrowserInfo();
            }
        } catch (e) {
            console.warn('تعذر جمع معلومات الجهاز:', e);
        }

        // 4.3 جمع معلومات الاتصال (الشبكة والـ IP والأمان)
        let connectionInfo = null;
        try {
            if (window.ConnectionInfo && window.ConnectionInfo.getConnectionInfo) {
                connectionInfo = await window.ConnectionInfo.getConnectionInfo();
            }
        } catch (e) {
            console.warn('تعذر جمع معلومات الاتصال:', e);
        }

        // 4.4 استخراج بيانات الموقع (من Geo IP و LocationIQ و GPS)
        const geo = extraData.geo || {};
        const full = extraData.locationIQ || {};
        const gps = extraData.gps || {};

        const core = full.core || {};
        const addrComp = full.address_components || {};
        const addl = full.additional || {};

        // أفضل إحداثيات متاحة
        const finalLat = full.latitude || full.lat || gps.latitude || geo.lat || connectionInfo?.ip?.lat || null;
        const finalLon = full.longitude || full.lon || gps.longitude || geo.lon || connectionInfo?.ip?.lon || null;

        // أفضل مدينة ودولة
        const finalCity = addrComp.city || full.city || geo.city || connectionInfo?.ip?.city || null;
        const finalCountry = addrComp.country || full.country || geo.country || connectionInfo?.ip?.country || null;
        const finalState = addrComp.state || full.state || connectionInfo?.ip?.region || null;
        const finalPostcode = addrComp.postcode || full.postcode || null;

        // تفاصيل الـ IP والأمان من الشبكة
        const ipAddress = connectionInfo?.ip?.public || geo.ip || extraData.ip || null;
        const isp = connectionInfo?.ip?.isp || geo.isp || null;
        const isVPN = connectionInfo?.security?.isVPN || geo.proxy || false;
        const isProxy = connectionInfo?.security?.isProxy || geo.proxy || false;
        const isTor = connectionInfo?.security?.isTor || false;
        const isHosting = connectionInfo?.security?.isHosting || geo.hosting || false;

        // 4.5 بناء كائن الجلسة
        const record = {
            user_id: userId,
            session_number: generateSessionNumber(),
            login_at: new Date().toISOString(),
            status: 'active',
            is_current_session: true,

            // IP والموقع الجغرافي
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

            // حقول LocationIQ إضافية
            place_id: core.place_id || full.place_id || null,
            licence: core.licence || full.licence || null,
            osm_type: core.osm_type || full.osm_type || null,
            osm_id: core.osm_id || full.osm_id || null,
            match_code: full.match_code || (addl.matchquality ? addl.matchquality.matchcode : null) || null,
            match_type: full.match_type || (addl.matchquality ? addl.matchquality.matchtype : null) || null,
            match_level: full.match_level || (addl.matchquality ? addl.matchquality.matchlevel : null) || null,
            boundingbox: full.boundingbox ? (Array.isArray(full.boundingbox) ? full.boundingbox.join(',') : full.boundingbox) : null,

            // الوقت والمنطقة الزمنية
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || connectionInfo?.ip?.timezone || null,

            // علامات الأمان
            vpn_detected: isVPN,
            proxy_detected: isProxy,
            tor_detected: isTor,
            hosting_detected: isHosting,

            // الجهاز والمتصفح
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

            // الشبكة
            network_type: connectionInfo?.network?.type || null,
            network_online: connectionInfo?.network?.online ?? null,
            network_effective_type: connectionInfo?.network?.effectiveType || null,
            network_downlink: connectionInfo?.network?.downlinkSpeed ?? null,
            network_rtt: connectionInfo?.network?.latency ?? null,
            network_save_data: connectionInfo?.network?.saveData ?? null,

            // تخزين بيانات الاتصال الكاملة في حقل JSON (إن كان العمود موجوداً)
            connection_info: connectionInfo || null,

            // معلومات إضافية عن الجهاز في JSON
            extra_device_info: deviceInfo ? {
                battery: deviceInfo.battery,
                browser_features: deviceInfo.browser_features,
                incognito_likely: deviceInfo.incognito_likely,
                plugins: deviceInfo.plugins,
                mime_types: deviceInfo.mime_types,
                touch_points: deviceInfo.max_touch_points
            } : null
        };

        // إزالة الحقول غير المعرفة (undefined)
        Object.keys(record).forEach(key => {
            if (record[key] === undefined) delete record[key];
        });

        // الإدراج في قاعدة البيانات
        const { error } = await sb.from('user_login_sessions').insert(record);
        if (error) {
            console.error('❌ فشل تسجيل الجلسة:', error);
            return false;
        }
        console.log('✅ تم تسجيل الجلسة بنجاح بجميع التفاصيل');
        return true;
    }

    // ───────────────────────────────────────
    // 5. توليد رقم جلسة فريد
    // ───────────────────────────────────────
    function generateSessionNumber() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `SES-${timestamp}-${randomPart}`;
    }

    // ───────────────────────────────────────
    // واجهة عامة
    // ───────────────────────────────────────
    window.SessionManager = {
        fetchSessions,
        terminateSession,
        deactivateOtherSessions: deactivateAllActiveSessions,
        createSessionRecord
    };
})();
