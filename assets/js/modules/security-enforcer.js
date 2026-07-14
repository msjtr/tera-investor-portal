(function() {
    'use strict';
    async function enforceSecureConnection() {
        if (!window.NetworkMonitor?.checkVPNProxy) {
            console.warn('NetworkMonitor غير متوفر');
            return true; // نسمح بالمرور بدلاً من المنع
        }
        try {
            const d = await window.NetworkMonitor.checkVPNProxy();
            if (!d) return true;
            if (d.is_vpn || d.is_proxy || d.is_tor || d.is_hosting) {
                alert('تم اكتشاف اتصال مشبوه. يرجى تعطيل VPN/Proxy والمحاولة مرة أخرى.');
                return false;
            }
            return true;
        } catch (e) {
            return true;
        }
    }
    window.SecurityEnforcer = { enforceSecureConnection };
})();
