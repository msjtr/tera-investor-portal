/**
 * modules/connection-info.js – تفاصيل اتصال شاملة وآمنة
 * - يستخدم NetworkMonitor (عبر Supabase Edge Function) للحصول على معلومات الـ IP العامة والأمان
 * - يحصل على معلومات الشبكة من المتصفح (Network Information API)
 * - يحصل على الـ IP المحلي عبر WebRTC (اختياري)
 * - يجمع كل شيء في تقرير واحد مفصل
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
                // إذا لم نحصل على مرشح خلال 2.5 ثانية نتوقف
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
        // NetworkMonitor يجب أن يكون محمّلاً (من network-monitor.js)
        if (!window.NetworkMonitor || !window.NetworkMonitor.checkVPNProxy) {
            console.warn('NetworkMonitor غير متوفر، تعذّر جلب تفاصيل الـ IP العامة');
            return null;
        }

        // نستدعي checkVPNProxy بدون تمرير IP ليجلب بيانات الـ IP الحالي للعميل
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
            lat: null,   // لا توفره Edge Function الحالية، يمكن إضافته لاحقاً
            lon: null,
            isVPN: networkData.is_vpn,
            isProxy: networkData.is_proxy,
            isTor: networkData.is_tor,
            isHosting: networkData.is_hosting,
            isDatacenter: networkData.is_datacenter,
            sources: networkData.sources || [],
            details: networkData.details || {}
        };
    }

    /**
     * تجميع جميع معلومات الاتصال في تقرير واحد
     * @returns {Promise<Object>}
     */
    async function getConnectionInfo() {
        const browserNet = getBrowserNetworkInfo();
        const localIP = await getLocalIP();
        const publicIP = await getPublicIPDetails();

        const result = {
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
                lat: publicIP?.lat || null,
                lon: publicIP?.lon || null
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

        return result;
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
