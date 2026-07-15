/**
 * modules/connection-info.js – تفاصيل اتصال شاملة وآمنة (v2)
 * - يستخدم NetworkMonitor (عبر Supabase Edge Function) كخيار أساسي وآمن
 * - خطة بديلة تلقائية عبر ip-api.com عند فشل Edge Function
 * - يحصل على معلومات الشبكة من المتصفح (Network Information API)
 * - يحصل على الـ IP المحلي عبر WebRTC (اختياري)
 * - يجمع كل شيء في تقرير واحد مفصل، دائماً يعيد بيانات الشبكة الأساسية
 */
(function() {
    'use strict';

    /**
     * الحصول على معلومات شبكة المتصفح (نوع الاتصال، السرعة...)
     */
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

    /**
     * محاولة الحصول على الـ IP المحلي (داخل الشبكة) باستخدام WebRTC
     */
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
                    if (match) {
                        pc.close();
                        resolve(match[0]);
                    }
                };
                setTimeout(() => { pc.close(); resolve(null); }, 2500);
            });
            return localIP;
        } catch (e) {
            return null;
        }
    }

    /**
     * الحصول على معلومات الـ IP العامة وتحليل الأمان (VPN/Proxy/Tor/Hosting)
     * المسار 1: NetworkMonitor الآمن (Edge Function)
     * المسار 2: ip-api.com مباشرة (خطة طوارئ)
     */
    async function getPublicIPDetails() {
        // ⚡ المسار 1: المحاولة عبر Edge Function (الأكثر أماناً)
        if (window.NetworkMonitor?.checkVPNProxy) {
            try {
                const networkData = await window.NetworkMonitor.checkVPNProxy();
                if (networkData && networkData.ip) {
                    console.log('✅ تم جلب IP عبر Edge Function');
                    return {
                        publicIP: networkData.ip,
                        isp: networkData.isp || null,
                        org: networkData.org || null,
                        asn: networkData.asn || null,
                        country: networkData.country || null,
                        countryCode: networkData.country_code || null,
                        region: networkData.region || null,
                        city: networkData.city || null,
                        timezone: networkData.timezone || null,
                        lat: null,
                        lon: null,
                        isVPN: networkData.is_vpn || false,
                        isProxy: networkData.is_proxy || false,
                        isTor: networkData.is_tor || false,
                        isHosting: networkData.is_hosting || false,
                        isDatacenter: networkData.is_datacenter || false,
                        sources: networkData.sources || [],
                        details: networkData.details || {}
                    };
                }
            } catch (e) {
                console.warn('⚠️ فشل استدعاء Edge Function، جاري استخدام الخطة البديلة...');
            }
        }

        // 🔥 المسار 2: خطة طوارئ – ip-api.com مباشرة (بدون مفتاح API)
        try {
            console.log('🔄 محاولة ip-api.com...');
            const res = await fetch('https://ip-api.com/json/?fields=proxy,hosting,query,isp,org,as,country,countryCode,region,city,timezone');
            if (!res.ok) throw new Error('ip-api returned ' + res.status);
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
                    lat: d.lat || null,
                    lon: d.lon || null,
                    isVPN: d.proxy || d.hosting || false,
                    isProxy: d.proxy || false,
                    isTor: false,
                    isHosting: d.hosting || false,
                    isDatacenter: d.hosting || false,
                    sources: ['ip-api.com'],
                    details: { ip_api: d }
                };
            }
        } catch (e) {
            console.warn('❌ فشل ip-api.com أيضاً:', e.message);
        }

        console.warn('⚠️ لم نتمكن من جلب IP العامة من أي مصدر');
        return null;
    }

    /**
     * تجميع جميع معلومات الاتصال في تقرير واحد – مضمونة الإرجاع دائماً
     */
    async function getConnectionInfo() {
        const browserNet = getBrowserNetworkInfo();

        const [localResult, publicResult] = await Promise.allSettled([
            getLocalIP(),
            getPublicIPDetails()
        ]);

        const localIP = localResult.status === 'fulfilled' ? localResult.value : null;
        const publicIP = publicResult.status === 'fulfilled' ? publicResult.value : null;

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
                public: publicIP?.publicIP || null,
                local: localIP,
                isp: publicIP?.isp || null,
                org: publicIP?.org || null,
                asn: publicIP?.asn || null,
                country: publicIP?.country || null,
                countryCode: publicIP?.countryCode || null,
                region: publicIP?.region || null,
                city: publicIP?.city || null,
                timezone: publicIP?.timezone || null,
                lat: null,
                lon: null
            },
            security: {
                isVPN: publicIP?.isVPN || false,
                isProxy: publicIP?.isProxy || false,
                isTor: publicIP?.isTor || false,
                isHosting: publicIP?.isHosting || false,
                isDatacenter: publicIP?.isDatacenter || false,
                sources: publicIP?.sources || [],
                details: publicIP?.details || {}
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
