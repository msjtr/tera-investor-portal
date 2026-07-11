/**
 * modules/location-services.js - يعتمد على LocationIQ + خدمات IP احتياطية
 */
(function() {
    const LOCATIONIQ_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';

    // الحصول على إحداثيات + IP + دولة + مدينة من خدمات IP
    async function tryIPAPIcom() {
        try {
            const r = await fetch('https://ip-api.com/json/?fields=query,country,countryCode,city,lat,lon,isp,org,proxy,hosting');
            if (!r.ok) throw new Error('ip-api failed');
            const d = await r.json();
            if (d.query) return { ip: d.query, country: d.country, country_code: d.countryCode, city: d.city, isp: d.isp || d.org, lat: d.lat, lon: d.lon, proxy: d.proxy || false, hosting: d.hosting || false };
        } catch (e) {}
        return null;
    }

    async function tryIPAPIco() {
        try {
            const r = await fetch('https://ipapi.co/json/');
            if (!r.ok) throw new Error('ipapi.co failed');
            const d = await r.json();
            if (d.ip) return { ip: d.ip, country: d.country_name, country_code: d.country_code, city: d.city, isp: d.org, lat: d.latitude, lon: d.longitude, proxy: d.proxy || false, hosting: d.hosting || false };
        } catch (e) {}
        return null;
    }

    async function tryFreeGeoIP() {
        try {
            const r = await fetch('https://freegeoip.app/json/');
            if (!r.ok) throw new Error('freegeoip failed');
            const d = await r.json();
            if (d.ip) return { ip: d.ip, country: d.country_name, country_code: d.country_code, city: d.city, isp: d.isp, lat: d.latitude, lon: d.longitude, proxy: false, hosting: false };
        } catch (e) {}
        return null;
    }

    async function fetchBasicGeo() {
        // محاولة ip-api.com ثم ipapi.co ثم freegeoip.app
        let res = await tryIPAPIcom();
        if (res) return res;
        res = await tryIPAPIco();
        if (res) return res;
        res = await tryFreeGeoIP();
        return res || { ip: null, country: null, city: null, isp: null, lat: null, lon: null };
    }

    // LocationIQ: يحصل على تفاصيل الحي والرمز البريدي والمحافظة من الإحداثيات
    async function fetchLocationIQ(lat, lon) {
        if (!lat || !lon) return {};
        const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&accept-language=ar`;
        try {
            const r = await fetch(url);
            if (!r.ok) throw new Error('LocationIQ failed');
            const data = await r.json();
            return {
                neighbourhood: data.neighbourhood || data.suburb || data.village || '',
                province: data.province || '',
                state: data.state || '',
                postal_code: data.postcode || '',
                display_name: data.display_name || '',
                city: data.city || '',
                district: data.county || data.district || ''
            };
        } catch (e) { return {}; }
    }

    async function getGPSCoords() {
        try {
            if (window.Auth?.getCurrentPosition) return await window.Auth.getCurrentPosition();
        } catch (e) {}
        return null;
    }

    window.LocationServices = { fetchBasicGeo, fetchLocationIQ, getGPSCoords };
})();
