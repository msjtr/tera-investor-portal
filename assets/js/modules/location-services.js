/**
 * modules/location-services.js - خدمات تحديد الموقع (ip-api, ipapi.co, LocationIQ, GPS)
 */
(function() {
    const LOCATIONIQ_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';

    async function tryIPAPIcom() {
        try {
            const r = await fetch('https://ip-api.com/json/?fields=status,message,country,countryCode,city,lat,lon,isp,org,proxy,hosting,query');
            if (!r.ok) throw new Error('ip-api failed');
            const d = await r.json();
            if (d.status !== 'success') throw new Error(d.message || 'ip-api error');
            console.log('📍 ip-api.com:', d);
            return { ip: d.query, city: d.city, country: d.country, country_code: d.countryCode, isp: d.isp || d.org, lat: d.lat, lon: d.lon, proxy: d.proxy || false, hosting: d.hosting || false };
        } catch (e) { console.warn('⚠️ ip-api.com failed:', e); return null; }
    }

    async function tryIPAPIco() {
        try {
            const r = await fetch('https://ipapi.co/json/');
            if (!r.ok) throw new Error('ipapi.co failed');
            const d = await r.json();
            console.log('📍 ipapi.co:', d);
            return { ip: d.ip, city: d.city, country: d.country_name, country_code: d.country_code, isp: d.org, lat: d.latitude, lon: d.longitude, proxy: d.proxy || false, hosting: d.hosting || false };
        } catch (e) { console.warn('⚠️ ipapi.co failed:', e); return null; }
    }

    async function fetchBasicGeo() {
        let result = await tryIPAPIcom();
        if (result) return result;
        result = await tryIPAPIco();
        if (result) return result;
        return {};
    }

    async function fetchLocationIQ(lat, lon) {
        if (!lat || !lon) return {};
        const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&accept-language=ar`;
        try {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = await r.json();
            console.log('📍 LocationIQ:', data);
            return {
                neighbourhood: data.neighbourhood || data.suburb || data.village || '',
                province: data.province || '',
                state: data.state || '',
                postal_code: data.postcode || '',
                display_name: data.display_name || '',
                city: data.city || '',
                district: data.county || data.district || ''
            };
        } catch (e) { console.warn('⚠️ LocationIQ failed:', e); return {}; }
    }

    async function getGPSCoords() {
        try {
            if (window.Auth?.getCurrentPosition) {
                return await window.Auth.getCurrentPosition();
            }
        } catch (e) { console.warn('⚠️ GPS غير متاح:', e.message); }
        return null;
    }

    window.LocationServices = { fetchBasicGeo, fetchLocationIQ, getGPSCoords };
})();
