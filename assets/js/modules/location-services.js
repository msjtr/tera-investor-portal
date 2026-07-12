/**
 * modules/location-services.js – يعتمد فقط على LocationIQ + GPS
 */
(function() {
    const LOCATIONIQ_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';

    /**
     * لم نعد نستخدم أي خدمات IP خارجية. تُرجع كائنًا فارغًا.
     */
    async function fetchBasicGeo() {
        return {};
    }

    /**
     * LocationIQ: يحول الإحداثيات إلى عنوان مفصل.
     */
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

            // احتياطي من display_name
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
        } catch (e) {
            console.warn('⚠️ LocationIQ failed:', e);
            return {};
        }
    }

    /**
     * محاولة الحصول على إحداثيات GPS من المتصفح.
     */
    async function getGPSCoords() {
        try {
            if (window.Auth?.getCurrentPosition) {
                return await window.Auth.getCurrentPosition();
            }
        } catch (e) {}
        return null;
    }

    window.LocationServices = { fetchBasicGeo, fetchLocationIQ, getGPSCoords };
})();
