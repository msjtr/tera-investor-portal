/**
 * modules/location-services.js – عبر Supabase Edge Function (بدون مفتاح)
 */
(function() {
    'use strict';

    // رابط Edge Function المنشورة على Supabase
    const SUPABASE_EDGE_FUNCTION = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/location-reverse';

    const PROVIDER_NAME = 'LocationIQ';
    const PROVIDER_REGION = 'US1';
    const API_VERSION = 'v1';
    const REQUEST_METHOD = 'GET';

    const LAT_MIN = -90, LAT_MAX = 90;
    const LON_MIN = -180, LON_MAX = 180;

    async function fetchBasicGeo() { return {}; }

    function getNetworkInfo() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return {};
        return {
            effective_connection_type: conn.effectiveType || null,
            network_type: conn.type || null,
            downlink: conn.downlink || null,
            rtt: conn.rtt || null,
            save_data: conn.saveData || false
        };
    }

    function validateCoordinates(lat, lon) {
        if (lat == null || lon == null) return { valid: false, error: 'الإحداثيات غير متوفرة' };
        if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon))
            return { valid: false, error: 'الإحداثيات يجب أن تكون أرقاماً' };
        if (lat < LAT_MIN || lat > LAT_MAX) return { valid: false, error: `خط العرض خارج النطاق` };
        if (lon < LON_MIN || lon > LON_MAX) return { valid: false, error: `خط الطول خارج النطاق` };
        return { valid: true };
    }

    async function getGPSCoords() {
        const result = {
            coords: null, source: 'unavailable', accuracy: null,
            permission: 'unknown', enabled: false, timeout: false, error: null,
            status: 'FAILED'
        };
        if (!navigator.geolocation) {
            result.error = 'Geolocation API not available';
            return result;
        }
        result.enabled = true;
        try {
            if (navigator.permissions?.query) {
                const perm = await navigator.permissions.query({ name: 'geolocation' });
                result.permission = perm.state;
            }
            if (result.permission === 'denied') {
                result.status = 'DENIED';
                result.error = 'User denied geolocation permission';
                return result;
            }
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 10000, maximumAge: 0
                });
            });
            result.coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            result.source = 'gps';
            result.accuracy = pos.coords.accuracy;
            result.permission = 'granted';
            result.status = 'SUCCESS';
        } catch (err) {
            result.source = 'browser';
            if (err.code === err.PERMISSION_DENIED) {
                result.permission = 'denied';
                result.status = 'DENIED';
            } else if (err.code === err.TIMEOUT) {
                result.permission = 'timeout';
                result.timeout = true;
                result.status = 'TIMEOUT';
            } else {
                result.permission = 'error';
                result.status = 'FAILED';
            }
            result.error = err.message || 'Unknown GPS error';
        }
        return result;
    }

    function calculateRiskScore(accuracy) {
        if (!accuracy) return 30;
        if (accuracy <= 5) return 0;
        if (accuracy <= 10) return 5;
        if (accuracy <= 20) return 15;
        if (accuracy <= 50) return 30;
        if (accuracy <= 100) return 50;
        return 75;
    }

    function generateLookupId() {
        if (crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    async function fetchLocationIQFull(lat, lon, gpsMeta = {}, lookupSource = 'gps', context = {}) {
        const lookupId = generateLookupId();
        const validation = validateCoordinates(lat, lon);

        if (!validation.valid) {
            return createErrorResult(lookupId, 'INVALID_COORDINATES', validation.error, gpsMeta, context);
        }

        const gpsAccuracy = gpsMeta.accuracy || null;
        const riskScore = calculateRiskScore(gpsAccuracy);
        const locationVerified = gpsAccuracy !== null && gpsAccuracy <= 20 && gpsMeta.permission === 'granted';
        const networkInfo = getNetworkInfo();

        const result = {
            lookup_id: lookupId,
            location_provider: PROVIDER_NAME,
            provider_region: PROVIDER_REGION,
            internal_endpoint: SUPABASE_EDGE_FUNCTION,
            api_endpoint: 'https://us1.locationiq.com/v1/reverse',
            api_version: API_VERSION,
            request_method: REQUEST_METHOD,
            lookup_status: null,
            http_status: null,
            request_started_at: null,
            response_received_at: null,
            execution_time_ms: null,
            gps_source: gpsMeta.source || null,
            gps_accuracy: gpsAccuracy,
            language: 'native',
            response_format: 'json',
            lookup_source: lookupSource,
            location_verified: locationVerified,
            risk_score: riskScore,
            error_code: null,
            error_message: null,
            request_payload: { lat, lon },
            request_headers: null,
            response_headers: null,
            request_id: null,
            backend_request_id: null,
            gps_enabled: gpsMeta.enabled || false,
            gps_permission: gpsMeta.permission || null,
            gps_timeout: gpsMeta.timeout || false,
            gps_error: gpsMeta.error || null,
            gps_status: gpsMeta.status || 'FAILED',
            cache_hit: false,
            browser_timestamp: new Date().toISOString(),
            server_timestamp: null,
            retry_count: 0,
            retry_reason: null,
            session_id: context.sessionId || null,
            user_id: context.userId || null,
            device_id: context.deviceId || null,
            effective_connection_type: networkInfo.effective_connection_type || null,
            network_type: networkInfo.network_type || null,
            downlink: networkInfo.downlink || null,
            rtt: networkInfo.rtt || null,
            save_data: networkInfo.save_data || false,
            place_id: null, licence: null, osm_type: null, osm_id: null,
            latitude: lat, longitude: lon, display_name: null, name: null,
            postal_address: null, class: null, type: null, importance: null,
            match_code: null, match_type: null, match_level: null,
            house_number: null, road: null, neighbourhood: null, suburb: null,
            quarter: null, district: null, city: null, town: null, village: null,
            municipality: null, county: null, state_district: null, state: null,
            state_code: null, postcode: null, country: null, country_code: null,
            boundingbox: null, namedetails: null, extratags: null,
            matchquality: null, address: null, locationiq_response: null
        };

        result.request_started_at = new Date().toISOString();
        const startTime = performance.now();

        try {
            const url = `${SUPABASE_EDGE_FUNCTION}?lat=${lat}&lon=${lon}`;
            // ⚠️ لا يوجد أي مفتاح أو Authorization - الدالة عامة على Supabase
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            result.http_status = response.status;
            result.response_received_at = new Date().toISOString();
            result.execution_time_ms = Number((performance.now() - startTime).toFixed(2));

            if (!response.ok) {
                result.lookup_status = 0;
                result.error_code = `HTTP_${response.status}`;
                result.error_message = `Server returned ${response.status}`;
                return result;
            }

            const data = await response.json();

            if (data.lookup_status === 0) {
                result.lookup_status = 0;
                result.error_code = data.error || 'LOOKUP_FAILED';
                result.error_message = data.error || 'Location lookup failed';
                return result;
            }

            result.locationiq_response = data;
            result.lookup_status = 1;
            result.server_timestamp = new Date().toISOString();

            result.place_id = data.place_id || null;
            result.licence = data.licence || null;
            result.osm_type = data.osm_type || null;
            result.osm_id = data.osm_id || null;
            result.display_name = data.display_name || null;
            result.boundingbox = data.boundingbox || null;
            result.name = data.name || null;
            result.postal_address = data.postal_address || null;
            result.class = data.class || null;
            result.type = data.type || null;
            result.importance = data.importance || null;

            if (data.matchquality) {
                result.match_code = data.matchquality.matchcode || null;
                result.match_type = data.matchquality.matchtype || null;
                result.match_level = data.matchquality.matchlevel || null;
                result.matchquality = data.matchquality;
            }

            result.namedetails = data.namedetails || null;
            result.extratags = data.extratags || null;

            const addr = data.address || {};
            result.address = addr;

            result.house_number = addr.house_number || null;
            result.road = addr.road || null;
            result.neighbourhood = addr.neighbourhood || null;
            result.suburb = addr.suburb || null;
            result.quarter = addr.quarter || null;
            result.town = addr.town || null;
            result.village = addr.village || null;
            result.municipality = addr.municipality || null;
            result.county = addr.county || null;
            result.state_district = addr.state_district || null;
            result.state = addr.state || null;
            result.state_code = addr.state_code || null;
            result.postcode = addr.postcode || null;
            result.country = addr.country || null;
            result.country_code = addr.country_code || null;

            result.city = addr.city || addr.town || addr.municipality || addr.village || addr.city_district || addr.hamlet || addr.locality || null;
            result.district = addr.suburb || addr.quarter || addr.neighbourhood || addr.residential || null;

            return result;
        } catch (e) {
            result.response_received_at = new Date().toISOString();
            result.execution_time_ms = Number((performance.now() - startTime).toFixed(2));
            result.lookup_status = 0;
            result.error_code = 'NETWORK_ERROR';
            result.error_message = e.message || 'Network request failed';
            return result;
        }
    }

    function createErrorResult(lookupId, code, message, gpsMeta, context) {
        return {
            lookup_id: lookupId,
            location_provider: PROVIDER_NAME,
            internal_endpoint: SUPABASE_EDGE_FUNCTION,
            lookup_status: 0,
            error_code: code,
            error_message: message,
            risk_score: 100,
            location_verified: false,
            gps_status: gpsMeta.status || 'FAILED',
            latitude: null, longitude: null,
            session_id: context.sessionId || null,
            user_id: context.userId || null,
            device_id: context.deviceId || null
        };
    }

    async function fetchLocationIQ(lat, lon) {
        const full = await fetchLocationIQFull(lat, lon);
        return {
            neighbourhood: full.neighbourhood || '',
            city: full.city || '',
            province: full.state || '',
            state: full.state || '',
            postal_code: full.postcode || '',
            country: full.country || '',
            country_code: full.country_code || '',
            display_name: full.display_name || '',
            district: full.district || ''
        };
    }

    window.LocationServices = {
        fetchBasicGeo,
        fetchLocationIQ,
        fetchLocationIQFull,
        getGPSCoords
    };
})();
