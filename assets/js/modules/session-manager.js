/**
 * modules/session-manager.js – تخزين جميع حقول LocationIQ الجديدة
 */
(function() {
    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    // ... fetchSessions, terminateSession, deactivateAllActiveSessions (كما هي) ...

    async function createSessionRecord(userId, extraData = {}) {
        const sb = await getSupabase();
        if (!sb) return false;

        // 1. إنهاء الجلسات القديمة (ضمان جلسة واحدة نشطة)
        await deactivateAllActiveSessions(userId);

        // 2. معلومات الجهاز
        let deviceInfo = {};
        try {
            deviceInfo = (window.DeviceInfo?.getDeviceAndBrowserInfo) ?
                window.DeviceInfo.getDeviceAndBrowserInfo() : {};
        } catch (e) {}

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

            // أساسيات
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
            request_headers: full.request_headers,
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
            // ... (باقي حقول deviceInfo) ...
            is_current_session: true
        };

        const { error } = await sb.from('user_login_sessions').insert(record);
        if (error) { console.error('❌ فشل تسجيل الجلسة:', error); return false; }
        console.log('✅ تم تسجيل الجلسة بنجاح مع بيانات LocationIQ الكاملة');
        return true;
    }

    window.SessionManager = { fetchSessions, terminateSession, deactivateOtherSessions: deactivateAllActiveSessions, createSessionRecord };
})();
