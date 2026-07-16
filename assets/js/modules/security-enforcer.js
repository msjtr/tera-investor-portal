/**
 * modules/security-enforcer.js – v2 (إشعارات مميزة ومنع الوصول المشبوه)
 */
(function() {
    'use strict';

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

            if (flags.length > 0) {
                const reason = flags.join('، ');
                const message = `تم اكتشاف ${reason}. لأسباب أمنية، لا يُسمح بالوصول عبر هذا الاتصال. يرجى تعطيل هذه الخدمات والمحاولة مرة أخرى.`;
                showBlockMessage(message);
                return false;
            }

            return true;
        } catch (error) {
            console.error('خطأ أثناء فحص الشبكة:', error);
            return true; // نسمح بالمرور في حالة الخطأ
        }
    }

    function showBlockMessage(message) {
        // محاولة استخدام UIHelpers.showConfirm لعرض نافذة حوارية
        if (window.UIHelpers?.showConfirm) {
            window.UIHelpers.showConfirm(message, () => {
                // عند الضغط على "نعم" – يمكن توجيه المستخدم أو إعادة المحاولة
                window.location.reload();
            }, () => {
                // عند الضغط على "إلغاء" – لا شيء إضافي
            });
        } else if (window.UIHelpers?.showAlert) {
            window.UIHelpers.showAlert(message, () => {
                window.location.reload();
            });
        } else if (window.UIHelpers?.showToast) {
            window.UIHelpers.showToast(message, 'danger', 8000);
        } else {
            alert(message);
        }
    }

    window.SecurityEnforcer = {
        enforceSecureConnection
    };
})();
