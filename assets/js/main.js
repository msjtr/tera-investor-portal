/**
 * ========================================
 * main.js - تهيئة المكونات العامة
 * ========================================
 */

// يمكن استخدام هذا الملف لإضافة أي تهيئات عامة إضافية
// مثل إدارة الإشعارات، أو تحميل المحتوى الديناميكي، أو التعامل مع النماذج.

(function() {
    'use strict';

    // مثال: إغلاق الإشعارات عند النقر
    function setupNotifications() {
        const notifIcon = document.querySelector('.notifications');
        if (notifIcon) {
            notifIcon.addEventListener('click', function() {
                alert('سيتم عرض الإشعارات هنا قريباً!');
            });
        }
    }

    // مثال: تأكيد تسجيل الخروج
    function setupLogout() {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                const confirmLogout = confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟');
                if (!confirmLogout) {
                    e.preventDefault();
                }
            });
        }
    }

    // تشغيل الوظائف عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', function() {
        setupNotifications();
        setupLogout();
        console.log('تم تهيئة main.js بنجاح ✅');
    });

})();
