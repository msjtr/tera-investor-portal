/**
 * modules/connection-info.js – v4 (دعم ipinfo.io عام + ثلاث خطط طوارئ)
 */
(function() {
    'use strict';

    function getBrowserNetworkInfo() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) {
            return {
                online: navigator.onLine,
                effectiveType: 'غير معروف',
                downlink: null,
                rtt: null,
                saveData: false,
                type: 'غير معروف'
            };
        }
        return {
            online: navigator.onLine,
            effectiveType: conn.effectiveType || 'غير معروف',
            downlink: conn.downlink ?? null,
            rtt: conn.rtt ?? null,
            saveData: conn.saveData || false,
            type: conn.type || 'غير معروف'
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
        // المسار 1: Edge Function (آمن)
        if (window.NetworkMonitor?.checkVPNProxy) {
            try {
                const net = await window.NetworkMonitor.checkVPNProxy();
                if (net && net.ip && net.ip !== 'undefined') {
                    console.log('✅ تم جلب IP عبر Edge Function');
                    return {
                        publicIP: net.ip,
                        isp: net.isp || null,
                        org: net.org || null,
                        asn: net.asn || null,
                        country: net.country || null,
                        countryCode: net.country_code || null,
                        region: net.region || null,
                        city: net.city || null,
                        timezone: net.timezone || null,
                        lat: null, lon: null,
                        isVPN: net.is_vpn || false,
                        isProxy: net.is_proxy || false,
                        isTor: net.is_tor || false,
                        isHosting: net.is_hosting || false,
                        isDatacenter: net.is_datacenter || false,
                        sources: net.sources || [],
                        details: net.details || {}
                    };
                }
            } catch (e) { console.warn('⚠️ Edge Function فشل.'); }
        }

        // المسار 2: ip-api.com (مجاني)
        try {
            console.log('🔄 محاولة ip-api.com...');
            const res = await fetch('https://ip-api.com/json/?fields=proxy,hosting,query,isp,org,as,country,countryCode,region,city,timezone');
            if (!res.ok) throw new Error('status ' + res.status);
            const d = await res.json();
            if (d.query) {
                console.log('✅ تم جلب IP عبر ip-api.com');
                return {
                    publicIP: d.query,
                    isp: d.isp || d.org || null,
                    org: d.org || null,
                    asn: d.as || null,
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
                    isDatacenter: d.hosting || false,
                    sources: ['ip-api.com'],
                    details: { ip_api: d }
                };
            }
        } catch (e) { console.warn('❌ ip-api.com فشل.'); }

        // المسار 3: ipinfo.io عام (بدون مفتاح)
        try {
            console.log('🔄 محاولة ipinfo.io...');
            const res = await fetch('https://ipinfo.io/json');
            if (!res.ok) throw new Error('status ' + res.status);
            const d = await res.json();
            if (d.ip) {
                console.log('✅ تم جلب IP عبر ipinfo.io');
                return {
                    publicIP: d.ip,
                    isp: d.org || null,
                    org: d.org || null,
                    asn: d.asn?.replace('AS', '') || null,
                    country: d.country || null,
                    countryCode: d.country || null,
                    region: d.region || null,
                    city: d.city || null,
                    timezone: d.timezone || null,
                    lat: d.loc ? d.loc.split(',')[0] : null,
                    lon: d.loc ? d.loc.split(',')[1] : null,
                    isVPN: false,
                    isProxy: false,
                    isTor: false,
                    isHosting: false,
                    isDatacenter: false,
                    sources: ['ipinfo.io'],
                    details: { ipinfo_io: d }
                };
            }
        } catch (e) { console.warn('❌ ipinfo.io فشل.'); }

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
                lat: null, lon: null
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
