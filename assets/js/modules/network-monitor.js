/**
 * modules/network-monitor.js – v2 (إصدار نهائي)
 * استدعاء آمن لـ Supabase Edge Function "network-check".
 * يعمل كوسيط بين المتصفح وخدمات فحص IP (ip-api.com, ipapi.co, ipinfo.io, Tor Exit List).
 * لا يحتوي على أي مفاتيح API في الواجهة الأمامية.
 */
(function() {
    'use strict';

    const EDGE_FUNCTION_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/network-check';

    /**
     * فحص شامل للشبكة وعنوان IP.
     * @param {string} [ip] - (اختياري) عنوان IP محدد. إذا تُرك فارغاً، يتم فحص IP العميل الحالي.
     * @returns {Promise<Object|null>} كائن يحتوي على جميع بيانات الشبكة، أو null في حالة الفشل.
     */
    async function checkVPNProxy(ip) {
        const url = new URL(EDGE_FUNCTION_URL);
        if (ip) {
            url.searchParams.set('ip', ip);
        }

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                console.warn(`network-check استجابت بحالة ${response.status}`);
                return null;
            }

            const data = await response.json();

            // توحيد المسميات لتتوافق مع جميع وحدات النظام
            return {
                ip: data.ip,
                is_vpn: data.is_vpn || false,
                is_proxy: data.is_proxy || false,
                is_tor: data.is_tor || false,
                is_hosting: data.is_hosting || false,
                is_datacenter: data.is_datacenter || false,
                isp: data.isp || null,
                org: data.org || null,
                asn: data.asn || null,
                country: data.country || null,
                country_code: data.country_code || null,
                region: data.region || null,
                city: data.city || null,
                timezone: data.timezone || null,
                lat: data.lat || null,
                lon: data.lon || null,
                sources: data.sources || [],
                details: data.details || {}
            };
        } catch (error) {
            console.error('فشل استدعاء network-check:', error);
            return null;
        }
    }

    // تعريض الدالة العامة
    window.NetworkMonitor = {
        checkVPNProxy
    };
})();
