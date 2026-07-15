/**
 * modules/security-enforcer.js – منع الوصول عبر VPN/Proxy/Tor/Hosting
 * يوقف العملية ويعرض إشعارًا للمستخدم عند اكتشاف اتصال مشبوه
 */
(function() {
    'use strict';

    /**
     * التحقق من أمان الشبكة ومنع المتابعة إذا كانت مشبوهة.
     * @returns {Promise<boolean>} true إذا كان الاتصال آمناً، false إذا كان مشبوهاً.
     */
    async function enforceSecureConnection() {
        if (!window.NetworkMonitor?.checkVPNProxy) {
            console.warn('NetworkMonitor غير متوفر، تم السماح بالمرور.');
            return true;
        }

        try {
            const networkData = await window.NetworkMonitor.checkVPNProxy();
            if (!networkData) {
                console.warn('فشل فحص الشبكة، تم السماح بالمرور.');
                return true;
            }

            const flags = [];
            if (networkData.is_vpn) flags.push('VPN');
            if (networkData.is_proxy) flags.push('وكيل (Proxy)');
            if (networkData.is_tor) flags.push('تور (Tor)');
            if (networkData.is_hosting) flags.push('خادم استضافة');

            const suspicious = flags.length > 0;
            if (suspicious) {
                const reason = flags.join('، ');
                const message = `تم اكتشاف ${reason}. لأسباب أمنية، لا يُسمح بالوصول عبر هذا الاتصال. يرجى تعطيل هذه الخدمات والمحاولة مرة أخرى.`;
                showErrorMessage(message);
                return false;
            }

            return true;
        } catch (error) {
            console.error('خطأ أثناء فحص الشبكة:', error);
            return true;
        }
    }

    /**
     * عرض رسالة خطأ للمستخدم (باستخدام UIHelpers إذا وجدت، وإلا alert)
     */
    function showErrorMessage(message) {
        if (window.UIHelpers?.showAlert) {
            window.UIHelpers.showAlert(message);
        } else if (window.UIHelpers?.showToast) {
            window.UIHelpers.showToast(message, 'danger', 6000);
        } else {
            alert(message);
        }
    }

    window.SecurityEnforcer = {
        enforceSecureConnection
    };
})();
