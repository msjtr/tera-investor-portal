/**
 * modules/connection-info.js – تفاصيل اتصال شاملة وآمنة (مضمونة الإرجاع)
 * - يستخدم NetworkMonitor (عبر Supabase Edge Function) للحصول على معلومات الـ IP العامة والأمان
 * - يحصل على معلومات الشبكة من المتصفح (Network Information API)
 * - يحصل على الـ IP المحلي عبر WebRTC (اختياري)
 * - يجمع كل شيء في تقرير واحد مفصل، دائماً يعيد بيانات الشبكة الأساسية
 */
(function() {
    'use strict';

    /**
     * الحصول على معلومات شبكة المتصفح (نوع الاتصال، السرعة...)
     * @returns {Object}
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
            type: conn.type || 'غير معروف'   // 'wifi', 'cellular', 'ethernet', 'none', etc.
        };
    }

    /**
     * محاولة الحصول على الـ IP المحلي (داخل الشبكة) باستخدام WebRTC
     * @returns {Promise<string|null>}
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
     * باستخدام NetworkMonitor الآمن الذي يعتمد على Edge Function.
     * @returns {Promise<Object|null>}
     */
    async function getPublicIPDetails() {
        if (!window.NetworkMonitor || !window.NetworkMonitor.checkVPNProxy) {
            console.warn('NetworkMonitor غير متوفر، تعذّر جلب تفاصيل الـ IP العامة');
            return null;
        }

        try {
            const networkData = await window.NetworkMonitor.checkVPNProxy();
            if (!networkData) return null;

            return {
                publicIP: networkData.ip,
                isp: networkData.isp,
                org: networkData.org,
                asn: networkData.asn,
                country: networkData.country,
                countryCode: networkData.country_code,
                region: networkData.region,
                city: networkData.city,
                timezone: networkData.timezone,
                lat: null,
                lon: null,
                isVPN: networkData.is_vpn,
                isProxy: networkData.is_proxy,
                isTor: networkData.is_tor,
                isHosting: networkData.is_hosting,
                isDatacenter: networkData.is_datacenter,
                sources: networkData.sources || [],
                details: networkData.details || {}
            };
        } catch (e) {
            console.warn('فشل استدعاء NetworkMonitor:', e);
            return null;
        }
    }

    /**
     * تجميع جميع معلومات الاتصال في تقرير واحد – مضمونة الإرجاع دائماً
     * @returns {Promise<Object>}
     */
    async function getConnectionInfo() {
        // بيانات الشبكة من المتصفح (متوفرة فوراً)
        const browserNet = getBrowserNetworkInfo();

        // تشغيل الاستعلامات البطيئة بالتوازي مع مهلة
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

    /**
     * دوال اختيارية للوصول المباشر لكل جزء
     */
    window.ConnectionInfo = {
        getConnectionInfo,
        getBrowserNetworkInfo,
        getLocalIP,
        getPublicIPDetails
    };
})();
