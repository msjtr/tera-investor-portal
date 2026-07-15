/**
 * modules/connection-info.js – v11 (إزالة ip-api.com المباشر + قاموس مزودين عالمي)
 */
(function() {
    'use strict';

    // قاموس أسماء مزودي خدمة عالمي (اختصارات)
    const ISP_ALIASES = {
        // السعودية
        'saudi telecom company': 'STC',
        'stc': 'STC',
        'etihad etisalat': 'Mobily',
        'mobily': 'Mobily',
        'zain saudi arabia': 'Zain',
        'zain': 'Zain',
        // الإمارات
        'emirates telecommunications': 'Etisalat',
        'etisalat': 'Etisalat',
        'emirates integrated telecommunications': 'du',
        'du': 'du',
        // مصر
        'vodafone egypt': 'Vodafone مصر',
        'orange egypt': 'Orange مصر',
        'etisalat egypt': 'Etisalat مصر',
        // أوروبا
        'vodafone': 'Vodafone',
        'orange': 'Orange',
        'deutsche telekom': 'Deutsche Telekom',
        'telefonica': 'Telefónica',
        'bt': 'BT',
        // أمريكا
        'at&t': 'AT&T',
        'verizon': 'Verizon',
        't-mobile': 'T-Mobile',
        'comcast': 'Comcast',
        // الهند
        'reliance jio': 'Jio',
        'bharti airtel': 'Airtel',
        'vodafone idea': 'Vi',
        // عالمي (سحابة)
        'amazon.com': 'AWS',
        'amazon': 'AWS',
        'cloudflare': 'Cloudflare',
        'google': 'Google',
        'microsoft': 'Microsoft'
    };

    function normalizeISP(isp) {
        if (!isp) return null;
        const key = isp.toLowerCase().trim();
        return ISP_ALIASES[key] || isp;
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
            return `بيانات خلوية (${speedMap[effectiveType] || effectiveType.toUpperCase()})`;
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

    async function getLocalIP() {
        try {
            const pc = new RTCPeerConnection({ iceServers: [] });
            pc.createDataChannel('');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const localIP = await new Promise((resolve) => {
                pc.onicecandidate = (e) => {
                    if (!e.candidate) { pc.close(); resolve(null); return; }
                    const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
                    const match = e.candidate.candidate.match(ipRegex);
                    if (match) { pc.close(); resolve(match[0]); }
                };
                setTimeout(() => { pc.close(); resolve(null); }, 2500);
            });
            return localIP;
        } catch (e) { return null; }
    }

    async function getPublicIPDetails() {
        let bestResult = null;
        const sources = [];

        // 1. Edge Function (تستخدم ip-api.com وغيرها عبر الخادم – لا تواجه 403)
        if (window.NetworkMonitor?.checkVPNProxy) {
            try {
                const net = await window.NetworkMonitor.checkVPNProxy();
                if (net && net.ip && net.ip !== 'undefined') {
                    bestResult = {
                        publicIP: net.ip,
                        isp: normalizeISP(net.isp) || null,
                        org: net.org || null,
                        asn: net.asn || extractASNFromOrg(net.org),
                        country: net.country || null,
                        countryCode: net.country_code || null,
                        region: net.region || null,
                        city: net.city || null,
                        timezone: net.timezone || null,
                        lat: net.lat || null,
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

        // 2. ipinfo.io (خطة بديلة مباشرة، لا تعاني 403)
        if (!bestResult || !bestResult.asn) {
            try {
                const res = await fetch('https://ipinfo.io/json');
                if (res.ok) {
                    const d = await res.json();
                    if (d.ip) {
                        const result = {
                            publicIP: d.ip,
                            isp: normalizeISP(d.org) || null,
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
                            // دمج الحقول الناقصة
                            if (!bestResult.asn) bestResult.asn = result.asn;
                            if (!bestResult.isp) bestResult.isp = result.isp;
                            if (!bestResult.country) bestResult.country = result.country;
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

    async function getConnectionInfo() {
        const browserNet = getBrowserNetworkInfo();
        const [localResult, publicResult] = await Promise.allSettled([
            getLocalIP(),
            getPublicIPDetails()
        ]);
        const localIP = localResult.status === 'fulfilled' ? localResult.value : null;
        const pub = publicResult.status === 'fulfilled' ? publicResult.value : null;

        return {
            timestamp: new Date().toISOString(),
            network: {
                online: browserNet.online,
                type: browserNet.type,
                effectiveType: browserNet.effectiveType,
                downlinkSpeed: browserNet.downlink,
                latency: browserNet.rtt,
                saveData: browserNet.saveData
            },
            ip: {
                public: pub?.publicIP || null,
                local: localIP,
                isp: pub?.isp || null,
                org: pub?.org || null,
                asn: pub?.asn || null,
                country: pub?.country || null,
                countryCode: pub?.countryCode || null,
                region: pub?.region || null,
                city: pub?.city || null,
                timezone: pub?.timezone || null,
                lat: pub?.lat || null,
                lon: pub?.lon || null
            },
            security: {
                isVPN: pub?.isVPN || false,
                isProxy: pub?.isProxy || false,
                isTor: pub?.isTor || false,
                isHosting: pub?.isHosting || false,
                isDatacenter: pub?.isDatacenter || false,
                sources: pub?.sources || [],
                details: pub?.details || {}
            }
        };
    }

    window.ConnectionInfo = {
        getConnectionInfo,
        getBrowserNetworkInfo,
        getLocalIP,
        getPublicIPDetails
    };
})();
