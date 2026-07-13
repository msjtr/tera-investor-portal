/**
 * modules/session-manager.js – إدارة جلسات المستخدم (كامل)
 * - إنهاء الجلسات القديمة تلقائيًا عند إنشاء جلسة جديدة
 * - تخزين جميع حقول LocationIQ الجديدة
 */
(function() {
    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    /**
     * جلب جميع جلسات المستخدم
     */
    async function fetchSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return [];
        const { data, error } = await sb.from('user_login_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('login_at', { ascending: false });
        if (error) { console.error('فشل جلب الجلسات:', error); return []; }
        return data || [];
    }

    /**
     * إنهاء جلسة محددة
     */
    async function terminateSession(sessionId, userId) {
        const sb = await getSupabase();
        if (!sb) return { success: false, error: 'Supabase غير متوفر' };
        const { error } = await sb.from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', userId);
        if (error) {
            console.error('فشل إنهاء الجلسة:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    /**
     * إنهاء جميع الجلسات النشطة للمستخدم (تُستدعى قبل إنشاء جلسة جديدة)
     */
    async function deactivateAllActiveSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return false;
        const { error } = await sb.from('user_login_sessions')
            .update({ status: 'terminated_by_system', logout_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active');
        if (error) {
            console.error('فشل إنهاء الجلسات القديمة:', error);
            return false;
        }
        console.log('✅ تم إنهاء جميع الجلسات النشطة السابقة');
        return true;
    }

    /**
     * إنشاء سجل جلسة جديد مع تخزين جميع حقول الموقع
     */
    async function createSessionRecord(userId, extraData = {}) {
        const sb = await getSupabase();
        if (!sb) return false;

        // 1. إنهاء جميع الجلسات النشطة السابقة (ضمان جلسة واحدة فقط)
        await deactivateAllActiveSessions(userId);

        // 2. الحصول على معلومات الجهاز
        let deviceInfo = {};
        try {
            deviceInfo = (window.DeviceInfo && window.DeviceInfo.getDeviceAndBrowserInfo) ?
                window.DeviceInfo.getDeviceAndBrowserInfo() : {};
        } catch (e) { /* استخدام كائن فارغ */ }

        const geo = extraData.geo || {};
        const full = extraData.locationIQ || {};  // الكائن الكامل من fetchLocationIQFull
        const gps = extraData.gps || {};

        const finalCity = full.city || geo.city || null;
        const finalCountry = full.country || geo.country || null;
        const finalLat = full.latitude || gps.latitude || geo.lat || null;
        const finalLon = full.longitude || gps.longitude || geo.lon || null;

        const record = {
            user_id: userId,
            session_number: 'SES-' + Date.now().toString(36).toUpperCase(),
            login_at: new Date().toISOString(),
            status: 'active',
            ip_address: geo.ip || extraData.ip || null,
            isp: geo.isp || null,
            country: finalCountry,
            country_code: full.country_code || geo.country_code || null,
            city: finalCity,
            district: full.district || null,
            neighbourhood: full.neighbourhood || null,
            province: full.province || null,
            state: full.state || null,
            postal_code: full.postcode || null,
            display_name: full.display_name || null,
            latitude: finalLat,
            longitude: finalLon,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
            vpn_detected: geo.proxy || false,
            proxy_detected: geo.proxy || false,
            hosting_detected: geo.hosting || false,

            // LocationIQ Lookup Information
            location_provider: full.location_provider || null,
            provider_region: full.provider_region || null,
            api_endpoint: full.api_endpoint || null,
            api_version: full.api_version || null,
            request_method: full.request_method || null,
            lookup_status: full.lookup_status,
            http_status: full.http_status,
            request_started_at: full.request_started_at,
            response_received_at: full.response_received_at,
            execution_time_ms: full.execution_time_ms,
            gps_source: full.gps_source || null,
            gps_accuracy: full.gps_accuracy,
            language: full.language || null,
            response_format: full.response_format || null,
            lookup_source: full.lookup_source || null,
            location_verified: full.location_verified,
            risk_score: full.risk_score,
            error_code: full.error_code,
            error_message: full.error_message,
            request_payload: full.request_payload,
            response_headers: full.response_headers,
            request_id: full.request_id,
            gps_enabled: full.gps_enabled,
            gps_permission: full.gps_permission,
            gps_timeout: full.gps_timeout,
            gps_error: full.gps_error,
            gps_status: full.gps_status,
            cache_hit: full.cache_hit,
            browser_timestamp: full.browser_timestamp,
            server_timestamp: full.server_timestamp,
            retry_count: full.retry_count || 0,
            retry_reason: full.retry_reason,
            session_id: full.session_id,
            device_id: full.device_id,

            // الشبكة
            effective_connection_type: full.effective_connection_type,
            network_type: full.network_type,
            downlink: full.downlink,
            rtt: full.rtt,
            save_data: full.save_data,

            // Location Details
            place_id: full.place_id,
            licence: full.licence,
            osm_type: full.osm_type,
            osm_id: full.osm_id,
            name: full.name,
            postal_address: full.postal_address,
            class: full.class,
            type: full.type,
            importance: full.importance,
            match_code: full.match_code,
            match_type: full.match_type,
            match_level: full.match_level,
            house_number: full.house_number,
            road: full.road,
            suburb: full.suburb,
            quarter: full.quarter,
            town: full.town,
            village: full.village,
            municipality: full.municipality,
            county: full.county,
            state_district: full.state_district,
            state_code: full.state_code,
            boundingbox: full.boundingbox,
            namedetails: full.namedetails,
            extratags: full.extratags,
            matchquality: full.matchquality,
            address: full.address,
            locationiq_response: full.locationiq_response,

            // الجهاز والمتصفح
            device_type: deviceInfo.device_type || null,
            browser_name: deviceInfo.browser_name || null,
            browser_version: deviceInfo.browser_version || null,
            user_agent: deviceInfo.user_agent || null,
            operating_system: deviceInfo.operating_system || null,
            os_version: deviceInfo.os_version || null,
            platform: deviceInfo.platform || null,
            language: deviceInfo.language || null,
            screen_resolution: deviceInfo.screen_resolution || null,
            pixel_ratio: deviceInfo.pixel_ratio || null,
            color_depth: deviceInfo.color_depth || null,
            cpu_architecture: deviceInfo.cpu_cores || null,
            device_memory: deviceInfo.device_memory || null,
            touch_supported: deviceInfo.touch_supported || null,
            cookies_enabled: deviceInfo.cookies_enabled || null,
            local_storage: deviceInfo.local_storage || null,
            session_storage: deviceInfo.session_storage || null,
            indexed_db: deviceInfo.indexed_db || null,
            webgl_supported: deviceInfo.webgl_supported || null,
            fingerprint: deviceInfo.fingerprint || null,
            network_type: deviceInfo.network_type || null,
            is_current_session: true
        };

        const { error } = await sb.from('user_login_sessions').insert(record);
        if (error) { console.error('❌ فشل تسجيل الجلسة:', error); return false; }
        console.log('✅ تم تسجيل الجلسة بنجاح مع بيانات الموقع الكاملة');
        return true;
    }

    window.SessionManager = {
        fetchSessions,
        terminateSession,
        deactivateOtherSessions: deactivateAllActiveSessions, // للتوافق مع الاستدعاءات القديمة
        createSessionRecord
    };
})();
