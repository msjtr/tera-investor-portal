/**
 * modules/connection-info.js - تفاصيل اتصال المستخدم بالإنترنت
 */
(function() {
    function getBrowserNetworkInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) {
            return { effectiveType: 'غير معروف', downlink: null, rtt: null, saveData: false, type: 'غير معروف' };
        }
        return {
            effectiveType: connection.effectiveType || 'غير معروف',
            downlink: connection.downlink || null,
            rtt: connection.rtt || null,
            saveData: connection.saveData || false,
            type: connection.type || 'غير معروف'
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
                    if (!e.candidate) return;
                    const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
                    const match = e.candidate.candidate.match(ipRegex);
                    if (match) { resolve(match[0]); pc.close(); }
                };
                setTimeout(() => { resolve(null); pc.close(); }, 2000);
            });
            return localIP;
        } catch (e) { return null; }
    }

    async function fetchIPDetails() {
        try {
            const r = await fetch('https://ip-api.com/json/?fields=status,message,country,countryCode,city,lat,lon,isp,org,proxy,hosting,query');
            if (r.ok) {
                const d = await r.json();
                if (d.status === 'success') {
                    return {
                        publicIP: d.query,
                        country: d.country,
                        countryCode: d.countryCode,
                        city: d.city,
                        isp: d.isp || d.org,
                        lat: d.lat,
                        lon: d.lon,
                        isProxy: d.proxy || false,
                        isHosting: d.hosting || false
                    };
                }
            }
        } catch (e) {}
        try {
            const r = await fetch('https://ipapi.co/json/');
            if (r.ok) {
                const d = await r.json();
                return {
                    publicIP: d.ip,
                    country: d.country_name,
                    countryCode: d.country_code,
                    city: d.city,
                    isp: d.org,
                    lat: d.latitude,
                    lon: d.longitude,
                    isProxy: d.proxy || false,
                    isHosting: d.hosting || false
                };
            }
        } catch (e) {}
        return null;
    }

    async function getConnectionInfo() {
        const browserNet = getBrowserNetworkInfo();
        const localIP = await getLocalIP();
        const ipDetails = await fetchIPDetails();

        return {
            timestamp: new Date().toISOString(),
            network: {
                type: browserNet.type,
                effectiveType: browserNet.effectiveType,
                downlinkSpeed: browserNet.downlink,
                latency: browserNet.rtt,
                saveData: browserNet.saveData
            },
            ip: {
                public: ipDetails?.publicIP || null,
                local: localIP,
                country: ipDetails?.country || null,
                countryCode: ipDetails?.countryCode || null,
                city: ipDetails?.city || null,
                isp: ipDetails?.isp || null,
                lat: ipDetails?.lat || null,
                lon: ipDetails?.lon || null
            },
            security: {
                isVPN: ipDetails?.isProxy || false,
                isProxy: ipDetails?.isProxy || false,
                isHosting: ipDetails?.isHosting || false,
                isTor: false
            }
        };
    }

    window.ConnectionInfo = { getConnectionInfo, getBrowserNetworkInfo, fetchIPDetails };
})();
