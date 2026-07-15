/**
 * modules/connection-info.js – v10 (واي فاي/بيانات + إحداثيات + مزود خدمة)
 */
(function() {
    'use strict';

    // قاموس أسماء مزودي الخدمة
    const ISP_ALIASES = {
        'saudi telecom company': 'STC',
        'stc': 'STC',
        'etihad etisalat': 'Mobily',
        'mobily': 'Mobily',
        'zain saudi arabia': 'Zain',
        'zain': 'Zain',
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
        // ترجمة نوع الاتصال إلى العربية
        const typeMap = {
            'wifi': 'واي فاي',
            'cellular': 'بيانات خلوية',
            'ethernet': 'إيثرنت',
            'none': 'غير متصل'
        };
        if (type && typeMap[type]) return typeMap[type];
        // إذا لم يتوفر type، نستخدم effectiveType لتخمين أنه خلوي (مثل 4g)
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
        const results = { edge: null, ipapi: null, ipinfo: null };
        const sources = [];

        // 1. Edge Function
        if (window.NetworkMonitor?.checkVPNProxy) {
            try {
                const net = await window.NetworkMonitor.checkVPNProxy();
                if (net && net.ip && net.ip !== 'undefined') {
                    results.edge = {
                        publicIP: net.ip,
                        isp: normalizeISP(net.isp) || null,
                        org: net.org || null,
                        asn: net.asn || extractASNFromOrg(net.org),
                        country: net.country || null,
                        countryCode: net.country_code || null,
                        region: net.region || null,
                        city: net.city || null,
                        timezone: net.timezone || null,
                        lat: net.lat || null, lon: net.lon || null,
                        isVPN: net.is_vpn || false,
                        isProxy: net.is_proxy || false,
                        isTor: net.is_tor || false,
                        isHosting: net.is_hosting || false,
                        isDatacenter: net.is_datacenter || false
                    };
                    sources.push(...(net.sources || []));
                }
            } catch (e) {}
        }

        // 2. ip-api.com (يدعم أحياناً lat/lon)
        try {
            const res = await fetch('https://ip-api.com/json/?fields=proxy,hosting,query,isp,org,as,lat,lon,country,countryCode,region,city,timezone');
            if (res.ok) {
                const d = await res.json();
                if (d.query) {
                    results.ipapi = {
                        publicIP: d.query,
                        isp: normalizeISP(d.isp || d.org) || null,
                        org: d.org || null,
                        asn: d.as || extractASNFromOrg(d.org),
                        country: d.country || null,
                        countryCode: d.countryCode || null,
                        region: d.regionName || d.region || null,
                        city: d.city || null,
                        timezone: d.timezone || null,
                        lat: d.lat || null, lon: d.lon || null,
                        isVPN: d.proxy || d.hosting || false,
                        isProxy: d.proxy || false,
                        isTor: false,
                        isHosting: d.hosting || false,
                        isDatacenter: d.hosting || false
                    };
                    sources.push('ip-api.com');
                }
            }
        } catch (e) {}

        // 3. ipinfo.io
        try {
            const res = await fetch('https://ipinfo.io/json');
            if (res.ok) {
                const d = await res.json();
                if (d.ip) {
                    results.ipinfo = {
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
                        isHosting: false, isDatacenter: false
                    };
                    sources.push('ipinfo.io');
                }
            }
        } catch (e) {}

        if (!results.edge && !results.ipapi && !results.ipinfo) return null;

        const pick = (field) => results.ipinfo?.[field] || results.ipapi?.[field] || results.edge?.[field] || null;
        const merged = {
            publicIP: results.edge?.publicIP || results.ipapi?.publicIP || results.ipinfo?.publicIP,
            isp: pick('isp'),
            org: pick('org'),
            asn: pick('asn'),
            country: pick('country'),
            countryCode: pick('countryCode'),
            region: pick('region'),
            city: pick('city'),
            timezone: pick('timezone'),
            lat: pick('lat'),
            lon: pick('lon'),
            isVPN: results.edge?.isVPN || results.ipapi?.isVPN || false,
            isProxy: results.edge?.isProxy || results.ipapi?.isProxy || false,
            isTor: results.edge?.isTor || false,
            isHosting: results.edge?.isHosting || results.ipapi?.isHosting || false,
            isDatacenter: results.edge?.isDatacenter || results.ipapi?.isDatacenter || false,
            sources: [...new Set(sources)],
            details: {
                edge: results.edge,
                ip_api: results.ipapi,
                ipinfo_io: results.ipinfo
            }
        };

        return merged;
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
