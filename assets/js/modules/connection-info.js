/**
 * modules/connection-info.js – v16 (ipinfo.io كمصدر أساسي مع تحسين ISP/ASN)
 */
(function() {
    'use strict';

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
        let cleaned = raw.replace(/^AS\d+\s*/i, '').trim().toLowerCase();
        for (const [pattern, alias] of Object.entries(ISP_ALIASES)) {
            if (cleaned.includes(pattern)) return alias;
        }
        return cleaned || raw;
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
            return `غير معروف (${speedMap[effectiveType] || effectiveType.toUpperCase()})`;
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

    function calculateRiskScore(security) {
        let score = 0;
        if (security.isVPN || security.isProxy) score += 30;
        if (security.isTor) score += 50;
        if (security.isHosting) score += 40;
        if (security.isDatacenter) score += 40;
        return Math.min(score, 100);
    }

    function getPrivacyRisk(security) {
        const score = calculateRiskScore(security);
        if (score >= 60) return 'High';
        if (score >= 30) return 'Medium';
        return 'Low';
    }

    async function getPublicIPDetails() {
        // 1. ipinfo.io مباشرة (أعطى نتائج جيدة سابقًا)
        try {
            const res = await fetch('https://ipinfo.io/json');
            if (res.ok) {
                const d = await res.json();
                if (d.ip) {
                    const isp = normalizeISP(d.org) || d.org || null;
                    const asn = d.asn ? d.asn.replace('AS', '') : extractASNFromOrg(d.org);
                    console.log('✅ تم جلب IP عبر ipinfo.io');
                    return {
                        publicIP: d.ip,
                        isp: isp,
                        org: d.org || null,
                        asn: asn,
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
                }
            }
        } catch (e) { console.warn('❌ ipinfo.io فشل.'); }

        // 2. Edge Function (إن كانت متاحة)
        if (window.NetworkMonitor?.checkVPNProxy) {
            try {
                const net = await window.NetworkMonitor.checkVPNProxy();
                if (net && net.ip && net.ip !== 'undefined') {
                    console.log('✅ تم جلب IP عبر Edge Function');
                    return {
                        publicIP: net.ip,
                        isp: normalizeISP(net.isp || net.org),
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
                }
            } catch (e) { /* Edge Function فشل */ }
        }

        return null;
    }

    async function getConnectionInfo() {
        const browserNet = getBrowserNetworkInfo();
        const [localResult, publicResult] = await Promise.allSettled([
            getLocalIP(),
            getPublicIPDetails()
        ]);
        const localIP = localResult.status === 'fulfilled' ? localResult.value : null;
        const pub = publicResult.status === 'fulfilled' ? publicResult.value : null;

        const security = {
            isVPN: pub?.isVPN || false,
            isProxy: pub?.isProxy || false,
            isTor: pub?.isTor || false,
            isHosting: pub?.isHosting || false,
            isDatacenter: pub?.isDatacenter || false,
            sources: pub?.sources || [],
            details: pub?.details || {}
        };

        const riskScore = calculateRiskScore(security);
        const privacyRisk = getPrivacyRisk(security);

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
                ipv6: null,
                hostname: null,
                isp: pub?.isp || null,
                org: pub?.org || null,
                asn: pub?.asn || null,
                asn_name: null,
                carrier: null,
                domain: null,
                country: pub?.country || null,
                countryCode: pub?.countryCode || null,
                region: pub?.region || null,
                city: pub?.city || null,
                timezone: pub?.timezone || null,
                lat: pub?.lat || null,
                lon: pub?.lon || null,
                lookup_provider: pub?.sources?.join(', ') || null,
                lookup_time: null,
                request_duration: null
            },
            security: {
                ...security,
                risk_score: riskScore,
                privacy_risk: privacyRisk,
                trusted_network: !security.isVPN && !security.isProxy && !security.isTor,
                suspicious_connection: security.isVPN || security.isTor,
                known_hosting: security.isHosting,
                known_vpn: security.isVPN,
                anonymous: security.isVPN || security.isProxy || security.isTor
            },
            ipinfo_response: pub?.details || null
        };
    }

    window.ConnectionInfo = {
        getConnectionInfo,
        getBrowserNetworkInfo,
        getLocalIP,
        getPublicIPDetails
    };
})();
