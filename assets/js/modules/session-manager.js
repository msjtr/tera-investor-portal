async function createSessionRecord(userId, extraData = {}) {
    const sb = await getSupabase();
    if (!sb) return false;

    // ... الحصول على deviceInfo ...

    const geo = extraData.geo || {};
    const fullLoc = extraData.locationIQ || {};  // الكائن الكامل
    const gps = extraData.gps || {};

    const finalCity = fullLoc.city || geo.city || null;
    const finalCountry = fullLoc.country || geo.country || null;
    const finalLat = fullLoc.latitude || geo.lat || null;
    const finalLon = fullLoc.longitude || geo.lon || null;

    const record = {
        user_id: userId,
        session_number: 'SES-' + Date.now().toString(36).toUpperCase(),
        login_at: new Date().toISOString(),
        status: 'active',

        // الحقول الأساسية
        ip_address: geo.ip || extraData.ip || null,
        isp: geo.isp || null,
        country: finalCountry,
        country_code: fullLoc.country_code || null,
        city: finalCity,
        district: fullLoc.district || null,
        neighbourhood: fullLoc.neighbourhood || null,
        province: fullLoc.province || null,
        state: fullLoc.state || null,
        postal_code: fullLoc.postcode || null,
        display_name: fullLoc.display_name || null,
        latitude: finalLat,
        longitude: finalLon,

        // حقول LocationIQ الجديدة (Lookup Information)
        location_provider: fullLoc.location_provider || null,
        provider_region: fullLoc.provider_region || null,
        api_endpoint: fullLoc.api_endpoint || null,
        api_version: fullLoc.api_version || null,
        request_method: fullLoc.request_method || null,
        lookup_status: fullLoc.lookup_status,
        http_status: fullLoc.http_status,
        request_started_at: fullLoc.request_started_at,
        response_received_at: fullLoc.response_received_at,
        execution_time_ms: fullLoc.execution_time_ms,
        gps_source: fullLoc.gps_source || null,
        gps_accuracy: fullLoc.gps_accuracy,
        language: fullLoc.language || null,
        response_format: fullLoc.response_format || null,
        lookup_source: fullLoc.lookup_source || null,
        location_verified: fullLoc.location_verified,
        risk_score: fullLoc.risk_score,
        error_code: fullLoc.error_code,
        error_message: fullLoc.error_message,
        request_payload: fullLoc.request_payload,
        response_headers: fullLoc.response_headers,
        request_id: fullLoc.request_id,
        gps_enabled: fullLoc.gps_enabled,
        gps_permission: fullLoc.gps_permission,
        gps_timeout: fullLoc.gps_timeout,
        gps_error: fullLoc.gps_error,
        gps_status: fullLoc.gps_status,
        cache_hit: fullLoc.cache_hit,
        browser_timestamp: fullLoc.browser_timestamp,
        server_timestamp: fullLoc.server_timestamp,
        retry_count: fullLoc.retry_count || 0,
        retry_reason: fullLoc.retry_reason,
        session_id: fullLoc.session_id,
        device_id: fullLoc.device_id,

        // الشبكة
        effective_connection_type: fullLoc.effective_connection_type,
        network_type: fullLoc.network_type,
        downlink: fullLoc.downlink,
        rtt: fullLoc.rtt,
        save_data: fullLoc.save_data,

        // Location Information التفصيلية
        place_id: fullLoc.place_id,
        licence: fullLoc.licence,
        osm_type: fullLoc.osm_type,
        osm_id: fullLoc.osm_id,
        name: fullLoc.name,
        postal_address: fullLoc.postal_address,
        class: fullLoc.class,
        type: fullLoc.type,
        importance: fullLoc.importance,
        match_code: fullLoc.match_code,
        match_type: fullLoc.match_type,
        match_level: fullLoc.match_level,
        house_number: fullLoc.house_number,
        road: fullLoc.road,
        suburb: fullLoc.suburb,
        quarter: fullLoc.quarter,
        town: fullLoc.town,
        village: fullLoc.village,
        municipality: fullLoc.municipality,
        county: fullLoc.county,
        state_district: fullLoc.state_district,
        state_code: fullLoc.state_code,
        boundingbox: fullLoc.boundingbox,
        namedetails: fullLoc.namedetails,
        extratags: fullLoc.extratags,
        matchquality: fullLoc.matchquality,
        address: fullLoc.address,
        locationiq_response: fullLoc.locationiq_response,

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
    console.log('✅ تم تسجيل الجلسة بنجاح');
    return true;
}
