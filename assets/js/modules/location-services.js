/**
 * modules/location-services.js - خدمات تحديد الموقع (استخراج احتياطي من display_name)
 */
(function() {
    const LOCATIONIQ_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';

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
        let res = await tryIPAPIcom();
        if (res) return res;
        res = await tryIPAPIco();
        if (res) return res;
        res = await tryFreeGeoIP();
        return res || { ip: null, country: null, city: null, isp: null, lat: null, lon: null };
    }

    async function fetchLocationIQ(lat, lon) {
        if (!lat || !lon) return {};
        const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&accept-language=ar`;
        try {
            const r = await fetch(url);
            if (!r.ok) throw new Error('LocationIQ failed');
            const data = await r.json();
            const address = data.address || {};

            let result = {
                neighbourhood: address.neighbourhood || data.neighbourhood || address.suburb || data.suburb || '',
                city: address.city || data.city || address.town || data.town || '',
                province: address.province || data.province || '',
                state: address.state || data.state || '',
                postal_code: address.postcode || data.postcode || '',
                country: address.country || data.country || '',
                country_code: address.country_code || data.country_code || '',
                display_name: data.display_name || '',
                district: address.county || data.county || address.district || data.district || ''
            };

            // احتياطي: استخراج من display_name
            const dn = result.display_name;
            if (dn && (!result.country || !result.city || !result.neighbourhood)) {
                const parts = dn.split(',').map(s => s.trim());
                if (parts.length >= 6) {
                    if (!result.neighbourhood) result.neighbourhood = parts[0];
                    if (!result.city) result.city = parts[1];
                    if (!result.province) result.province = parts[2];
                    if (!result.state) result.state = parts[3];
                    if (!result.postal_code) result.postal_code = parts[4];
                    if (!result.country) result.country = parts[5];
                } else if (parts.length >= 2) {
                    if (!result.city) result.city = parts[0];
                    if (!result.country) result.country = parts[parts.length - 1];
                }
            }

            return result;
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
