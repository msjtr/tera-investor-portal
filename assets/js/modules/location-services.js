/**
 * modules/location-services.js – LocationIQ كمصدر وحيد (محدث)
 * يستخرج جميع الحقول المطلوبة للتدقيق المؤسسي
 * يحفظ الاستجابة الأصلية كاملة ويعالج توحيد الحقول (City/District)
 */
(function() {
    const LOCATIONIQ_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';
    const LOCATIONIQ_BASE = 'https://us1.locationiq.com';
    const LOCATIONIQ_ENDPOINT = `${LOCATIONIQ_BASE}/v1/reverse`;

    /**
     * لا نستخدم أي خدمات IP خارجية.
     */
    async function fetchBasicGeo() {
        return {};
    }

    /**
     * الحصول على إحداثيات GPS مع معلومات الدقة والمصدر والإذن.
     */
    async function getGPSCoords() {
        const result = { coords: null, source: 'unavailable', accuracy: null, permission: 'unknown' };
        if (!navigator.geolocation) {
            result.source = 'unavailable';
            result.permission = 'denied';
            return result;
        }
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const perm = await navigator.permissions.query({ name: 'geolocation' });
                result.permission = perm.state; // 'granted', 'denied', 'prompt'
            }
            if (result.permission === 'denied') {
                result.source = 'browser';
                return result;
            }
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
            result.coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            result.source = 'gps';
            result.accuracy = position.coords.accuracy;
            result.permission = 'granted';
        } catch (err) {
            result.source = 'browser';
            if (err.code === err.PERMISSION_DENIED) result.permission = 'denied';
            else if (err.code === err.TIMEOUT) result.permission = 'timeout';
            else result.permission = 'error';
        }
        return result;
    }

    /**
     * استدعاء LocationIQ Reverse Geocoding وإرجاع البيانات الكاملة للتدقيق.
     * @param {number} lat خط العرض
     * @param {number} lon خط الطول
     * @param {object} gpsMeta معلومات GPS (accuracy, source, permission)
     * @returns {object} جميع الحقول المطلوبة في المواصفات
     */
    async function fetchLocationIQFull(lat, lon, gpsMeta = {}) {
        const result = {
            // Lookup Information
            location_provider: 'LocationIQ',
            api_endpoint: LOCATIONIQ_ENDPOINT,
            request_started_at: null,
            response_received_at: null,
            execution_time_ms: null,
            lookup_status: null,       // 1=success, 0=fail
            http_status: null,
            gps_source: gpsMeta.source || null,
            gps_accuracy: gpsMeta.accuracy || null,
            language: 'ar',
            response_format: 'json',

            // Location Information (التهيئة الافتراضية)
            place_id: null,
            licence: null,
            osm_type: null,
            osm_id: null,
            latitude: lat,
            longitude: lon,
            display_name: null,
            government: null,
            attraction: null,
            building: null,
            house_number: null,
            road: null,
            quarter: null,
            suburb: null,
            neighbourhood: null,
            district: null,
            county: null,
            city: null,
            town: null,
            village: null,
            municipality: null,
            state_district: null,
            state: null,
            state_code: null,
            postcode: null,
            country: null,
            country_code: null,
            boundingbox: null,
            locationiq_response: null
        };

        if (!lat || !lon) {
            result.lookup_status = 0;
            return result;
        }

        const url = `${LOCATIONIQ_ENDPOINT}?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&addressdetails=1&normalizeaddress=1&accept-language=ar`;
        result.request_started_at = new Date().toISOString();
        const startTime = performance.now();

        try {
            const response = await fetch(url);
            result.http_status = response.status;
            result.response_received_at = new Date().toISOString();
            result.execution_time_ms = Math.round(performance.now() - startTime);

            if (!response.ok) {
                result.lookup_status = 0;
                console.error('❌ LocationIQ HTTP Error:', response.status);
                return result;
            }

            const data = await response.json();
            result.locationiq_response = data;  // الاستجابة الأصلية الكاملة
            result.lookup_status = 1;

            // استخراج الحقول المباشرة
            result.place_id = data.place_id || null;
            result.licence = data.licence || null;
            result.osm_type = data.osm_type || null;
            result.osm_id = data.osm_id || null;
            result.display_name = data.display_name || null;
            result.boundingbox = data.boundingbox || null;

            const addr = data.address || {};

            // حقول العنوان المنفردة
            result.house_number = addr.house_number || null;
            result.road = addr.road || null;
            result.quarter = addr.quarter || null;
            result.suburb = addr.suburb || null;
            result.neighbourhood = addr.neighbourhood || null;
            result.county = addr.county || null;
            result.town = addr.town || null;
            result.village = addr.village || null;
            result.municipality = addr.municipality || null;
            result.state_district = addr.state_district || null;
            result.state = addr.state || data.state || null;
            result.state_code = addr.state_code || null;
            result.postcode = addr.postcode || data.postcode || null;
            result.country = addr.country || data.country || null;
            result.country_code = addr.country_code || data.country_code || null;
            result.government = addr.government || null;
            result.attraction = addr.attraction || null;
            result.building = addr.building || null;

            // توحيد City: city → town → municipality → village
            result.city = addr.city || addr.town || addr.municipality || addr.village || null;

            // توحيد District: suburb → quarter → neighbourhood
            result.district = addr.suburb || addr.quarter || addr.neighbourhood || null;

            console.log('✅ LocationIQ Full Response:', result);
            return result;

        } catch (e) {
            result.response_received_at = new Date().toISOString();
            result.execution_time_ms = Math.round(performance.now() - startTime);
            result.lookup_status = 0;
            console.warn('⚠️ LocationIQ Exception:', e);
            return result;
        }
    }

    /**
     * دالة مختصرة للتوافق مع الاستدعاءات القديمة.
     */
    async function fetchLocationIQ(lat, lon) {
        const full = await fetchLocationIQFull(lat, lon);
        return {
            neighbourhood: full.neighbourhood || '',
            city: full.city || '',
            province: full.state || '',  // استخدمنا state كمحافظة مؤقتاً
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
