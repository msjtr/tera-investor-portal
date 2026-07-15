/**
 * modules/connection-info.js – v13 (جلب إحداثيات من Edge Function و ipinfo.io + تحسين نوع الشبكة)
 */
(function() {
    'use strict';

    // قاموس أسماء مزودي خدمة عالمي (اختصارات)
    const ISP_ALIASES = {
        'saudi telecom company': 'STC',
        'stc': 'STC',
        'etihad etisalat': 'Mobily',
        'mobily': 'Mobily',
        'zain saudi arabia': 'Zain',
        'zain': 'Zain',
        'emirates telecommunications': 'Etisalat',
        'etisalat': 'Etisalat',
        'emirates integrated telecommunications': 'du',
        'du': 'du',
        'vodafone egypt': 'Vodafone مصر',
        'orange egypt': 'Orange مصر',
        'etisalat egypt': 'Etisalat مصر',
        'vodafone': 'Vodafone',
        'orange': 'Orange',
        'deutsche telekom': 'Deutsche Telekom',
        'telefonica': 'Telefónica',
        'bt': 'BT',
        'at&t': 'AT&T',
        'verizon': 'Verizon',
        't-mobile': 'T-Mobile',
        'comcast': 'Comcast',
        'reliance jio': 'Jio',
        'bharti airtel': 'Airtel',
        'vodafone idea': 'Vi',
        'amazon.com': 'AWS',
        'amazon': 'AWS',
        'cloudflare': 'Cloudflare',
        'google': 'Google',
        'microsoft': 'Microsoft'
    };

    function normalizeISP(raw) {
        if (!raw) return null;
        let cleaned = raw.replace(/^AS\d+\s*/i, '').trim();
        const key = cleaned.toLowerCase();
        return ISP_ALIASES[key] || cleaned || raw;
    }

    function extractASNFromOrg(orgStr) {
        if (!orgStr) return null;
        const match = orgStr.match(/AS(\d+)/i);
        return match ? match[1] : null;
    }

    function translateNetworkType(type, effectiveType) {
        const typeMap = {
            'wifi': 'واي فاي',
            'cellular': 'بيانات خلوية',
            'ethernet': 'إيثرنت',
            'none': 'غير متصل'
        };
        if (type && typeMap[type]) return typeMap[type];
        if (!type && effectiveType && effectiveType !== 'غير معروف') {
            const speedMap = { 'slow-2g':'2G', '2g':'2G', '3g':'3G', '4g':'4G', '5g':'5G' };
            return `غير معروف (${speedMap[effectiveType] || effectiveType.toUpperCase()})`; // توضيح
        }
        return 'غير معروف';
    }

    function getBrowserNetworkInfo() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) {
            return {
                online: navigator.onLine,
                effectiveType: 'غير متاح',
                downlink: null,
                rtt: null,
                saveData: false,
                type: 'غير متاح'
            };
        }
        const effectiveType = conn.effectiveType || 'غير معروف';
        const rawType = conn.type || '';
        return {
            online: navigator.onLine,
            effectiveType: effectiveType,
            downlink: conn.downlink ?? null,
            rtt: conn.rtt ?? null,
            saveData: conn.saveData || false,
            type: translateNetworkType(rawType, effectiveType)
        };
    }

    async function getLocalIP() { /* ... unchanged ... */ }

    async function getPublicIPDetails() {
        let bestResult = null;
        const sources = [];

        // 1. Edge Function (يُفضل لأنها تجمع من ip-api و ipapi.co وتوفر lat/lon)
        if (window.NetworkMonitor?.checkVPNProxy) {
            try {
                const net = await window.NetworkMonitor.checkVPNProxy();
                if (net && net.ip && net.ip !== 'undefined') {
                    bestResult = {
                        publicIP: net.ip,
                        isp: normalizeISP(net.isp || net.org),
                        org: net.org || null,
                        asn: net.asn || extractASNFromOrg(net.org),
                        country: net.country || null,
                        countryCode: net.country_code || null,
                        region: net.region || null,
                        city: net.city || null,
                        timezone: net.timezone || null,
                        lat: net.lat || null,   // الآن نأخذ الإحداثيات من Edge Function إذا وُجدت
                        lon: net.lon || null,
                        isVPN: net.is_vpn || false,
                        isProxy: net.is_proxy || false,
                        isTor: net.is_tor || false,
                        isHosting: net.is_hosting || false,
                        isDatacenter: net.is_datacenter || false,
                        sources: net.sources || [],
                        details: net.details || {}
                    };
                    sources.push(...(net.sources || []));
                }
            } catch (e) {}
        }

        // 2. إذا لم توجد إحداثيات من Edge Function، نكمّل بـ ipinfo.io (بدقة أقل)
        if (!bestResult || !bestResult.lat) {
            try {
                const res = await fetch('https://ipinfo.io/json');
                if (res.ok) {
                    const d = await res.json();
                    if (d.ip) {
                        const result = {
                            publicIP: d.ip,
                            isp: normalizeISP(d.org),
                            org: d.org || null,
                            asn: d.asn?.replace('AS', '') || extractASNFromOrg(d.org),
                            country: d.country || null,
                            countryCode: d.country || null,
                            region: d.region || null,
                            city: d.city || null,
                            timezone: d.timezone || null,
                            lat: d.loc ? d.loc.split(',')[0] : null,
                            lon: d.loc ? d.loc.split(',')[1] : null,
                            isVPN: false, isProxy: false, isTor: false,
                            isHosting: false, isDatacenter: false,
                            sources: ['ipinfo.io'],
                            details: { ipinfo_io: d }
                        };
                        if (!bestResult) {
                            bestResult = result;
                        } else {
                            if (!bestResult.asn) bestResult.asn = result.asn;
                            if (!bestResult.isp) bestResult.isp = result.isp;
                            if (!bestResult.lat) bestResult.lat = result.lat;
                            if (!bestResult.lon) bestResult.lon = result.lon;
                            bestResult.sources = [...new Set([...bestResult.sources, ...result.sources])];
                            bestResult.details = { ...bestResult.details, ...result.details };
                        }
                        sources.push('ipinfo.io');
                    }
                }
            } catch (e) {}
        }

        if (!bestResult) return null;
        return bestResult;
    }

    async function getConnectionInfo() { /* ... unchanged ... */ }

    window.ConnectionInfo = { /* ... */ };
})();
