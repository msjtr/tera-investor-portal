/**
 * modules/location-services.js – LocationIQ كمصدر وحيد
 * يعتمد فقط على LocationIQ + GPS
 * يحفظ الاستجابة الأصلية الكاملة وجميع الحقول المطلوبة للتدقيق
 */
(function() {
    const LOCATIONIQ_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';
    const LOCATIONIQ_ENDPOINT = 'https://us1.locationiq.com/v1/reverse.php';

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
        try {
            if (!navigator.geolocation) {
                return { coords: null, source: 'unavailable', accuracy: null, permission: 'denied' };
            }
            // التحقق من حالة الإذن (إن أمكن)
            let permission = 'unknown';
            if (navigator.permissions && navigator.permissions.query) {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                permission = result.state; // 'granted', 'denied', 'prompt'
            }
            if (permission === 'denied') {
                return { coords: null, source: 'browser', accuracy: null, permission: 'denied' };
            }
            // طلب الإحداثيات
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
            return {
                coords: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                },
                source: 'gps',
                accuracy: position.coords.accuracy,
                permission: 'granted'
            };
        } catch (err) {
            let permission = 'denied';
            if (err.code === err.PERMISSION_DENIED) {
                permission = 'denied';
            } else if (err.code === err.TIMEOUT) {
                permission = 'timeout';
            } else {
                permission = 'unavailable';
            }
            return { coords: null, source: 'browser', accuracy: null, permission };
        }
    }

    /**
     * استدعاء LocationIQ Reverse Geocoding API وإرجاع بيانات كاملة.
     * @param {number} lat
     * @param {number} lon
     * @param {object} gpsMeta - { accuracy, source, permission }
     * @returns {object} جميع حقول الموقع + بيانات التدقيق + الاستجابة الأصلية
     */
    async function fetchLocationIQFull(lat, lon, gpsMeta = {}) {
        const result = {
            // بيانات GPS
            gps_accuracy: gpsMeta.accuracy || null,
            gps_source: gpsMeta.source || null,
            browser_permission: gpsMeta.permission || null,

            // بيانات LocationIQ (افتراضية)
            place_id: null,
            licence: null,
            osm_type: null,
            osm_id: null,
            latitude: lat,
            longitude: lon,
            display_name: null,
            government: null,
            house_number: null,
            road: null,
            quarter: null,
            suburb: null,
            city: null,
            state: null,
            postcode: null,
            country: null,
            country_code: null,
            boundingbox: null,
            locationiq_response: null,

            // بيانات التدقيق
            location_provider: 'LocationIQ',
            api_endpoint: LOCATIONIQ_ENDPOINT,
            lookup_status: null,
            http_status: null,
            request_started_at: null,
            response_received_at: null,
            execution_time_ms: null
        };

        if (!lat || !lon) {
            result.lookup_status = 0;
            return result;
        }

        const url = `${LOCATIONIQ_ENDPOINT}?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&accept-language=ar`;
        result.request_started_at = new Date().toISOString();
        const startTime = performance.now();

        try {
            const r = await fetch(url);
            result.http_status = r.status;
            result.response_received_at = new Date().toISOString();
            result.execution_time_ms = Math.round(performance.now() - startTime);

            if (!r.ok) {
                result.lookup_status = 0;
                console.error('❌ LocationIQ HTTP Error:', r.status);
                return result;
            }

            const data = await r.json();
            result.locationiq_response = data; // الاستجابة الأصلية الكاملة
            result.lookup_status = 1;

            // استخراج الحقول الأساسية
            result.place_id = data.place_id || null;
            result.licence = data.licence || null;
            result.osm_type = data.osm_type || null;
            result.osm_id = data.osm_id || null;
            result.display_name = data.display_name || null;
            result.boundingbox = data.boundingbox || null;

            // استخراج من data.address (إن وجد) أو من الجذر
            const address = data.address || {};
            result.house_number = address.house_number || data.house_number || null;
            result.road = address.road || data.road || null;
            result.quarter = address.quarter || address.neighbourhood || data.quarter || data.neighbourhood || null;
            result.suburb = address.suburb || data.suburb || null;
            result.city = address.city || address.town || data.city || data.town || null;
            result.state = address.state || data.state || null;
            result.postcode = address.postcode || data.postcode || null;
            result.country = address.country || data.country || null;
            result.country_code = address.country_code || data.country_code || null;
            result.government = address.government || data.government || null;

            // neighbourhood / district إضافية للتوافق مع النظام الحالي
            result.neighbourhood = result.quarter || result.suburb || '';
            result.province = address.province || data.province || '';
            result.district = address.county || address.district || data.county || data.district || '';

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
     * دالة متوافقة مع الاستدعاءات القديمة (تُرجع حقول مختصرة).
     */
    async function fetchLocationIQ(lat, lon) {
        const full = await fetchLocationIQFull(lat, lon);
        return {
            neighbourhood: full.neighbourhood || '',
            city: full.city || '',
            province: full.province || '',
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
        fetchLocationIQFull,  // الجديد: يستخدم في verify-otp.js لتسجيل البيانات الكاملة
        getGPSCoords
    };
})();
