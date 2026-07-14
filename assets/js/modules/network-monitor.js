/**
 * modules/network-monitor.js – كشف VPN/Proxy/Tor/Hosting (آمن عبر Edge Function)
 * - لا يكشف أي مفاتيح API للمتصفح
 * - يستخدم Supabase Edge Function (network-check) كوسيط
 * - يدعم ذاكرة تخزين مؤقت للحفاظ على الأداء
 */
(function() {
    'use strict';

    const EDGE_FUNCTION_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/network-check';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

    const cache = new Map();

    // استدعاء Edge Function (دون إرسال مفتاح لأنها عامة)
    async function callEdgeFunction(ip) {
        const url = new URL(EDGE_FUNCTION_URL);
        if (ip) url.searchParams.set('ip', ip);
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`Edge function returned ${response.status}`);
        }
        return await response.json();
    }

    /**
     * checkVPNProxy(ip?)
     * إذا لم يتم تمرير IP، تكتشفه الدالة تلقائيًا من الخادم.
     * تعيد كائنًا موحدًا بكل التفاصيل.
     */
    async function checkVPNProxy(ip) {
        // إذا كان ip فارغًا أو null نتركه للدالة لتحدده
        const cacheKey = ip || '__auto__';
        const cached = cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            return { ...cached.data, cached: true };
        }

        try {
            const data = await callEdgeFunction(ip);
            // توحيد بعض الأسماء
            const result = {
                ip: data.ip,
                is_vpn: data.is_vpn,
                is_proxy: data.is_proxy,
                is_tor: data.is_tor,
                is_hosting: data.is_hosting,
                is_datacenter: data.is_datacenter,
                isp: data.isp,
                org: data.org,
                asn: data.asn,
                country: data.country,
                country_code: data.country_code,
                region: data.region,
                city: data.city,
                timezone: data.timezone,
                sources: data.sources,
                details: data.details,
                cached: false
            };
            cache.set(cacheKey, { data: result, timestamp: Date.now() });
            return result;
        } catch (e) {
            console.error('فشل فحص الشبكة:', e);
            return null;
        }
    }

    /**
     * getNetworkSummary(ip?) - تقرير نصي بالعربية
     */
    async function getNetworkSummary(ip) {
        const data = await checkVPNProxy(ip);
        if (!data) return { text: 'تعذر تحليل الشبكة', suspicious: false };

        let flags = [];
        if (data.is_vpn || data.is_proxy) flags.push('VPN/Proxy');
        if (data.is_tor) flags.push('Tor');
        if (data.is_hosting) flags.push('استضافة/خادم');

        const location = [data.city, data.region, data.country].filter(Boolean).join('، ') || 'غير معروف';
        const summary = {
            ip: data.ip,
            isp: data.isp || 'غير معروف',
            location,
            flags,
            suspicious: flags.length > 0,
            text: flags.length > 0
                ? `⚠️ ${data.ip} - مشبوه (${flags.join('، ')}) - ${data.isp}`
                : `✅ ${data.ip} - آمن - ${data.isp}`,
            details: data
        };
        return summary;
    }

    /**
     * getClientIP() - الحصول على IP العميل من الخادم (بدون استدعاء خارجي في المتصفح)
     */
    async function getClientIP() {
        try {
            const data = await callEdgeFunction(''); // بدون IP سيرجع IP المستخدم
            return data.ip || null;
        } catch (e) {
            return null;
        }
    }

    function clearCache() {
        cache.clear();
    }

    window.NetworkMonitor = {
        checkVPNProxy,
        getNetworkSummary,
        getClientIP,
        clearCache
    };
})();
