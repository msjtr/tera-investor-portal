/**
 * ============================================================
 * main.js - الملف الرئيسي لإدارة واجهة المستخدم (النسخة المحدثة للـ SPA)
 * ============================================================
 */

(function() {
    'use strict';

    // ... [الاحتفاظ بجميع الدوال السابقة: getCurrentPage, showToast, setActiveNavItem, initBackToDashboard, updateDashboardStyling, initUiEvents كما هي] ...

    // ============================================================
    // 7. الاستماع لتغيير الصفحة (مهم للـ SPA) - تم تحديثه هنا!
    // ============================================================
    function handlePageChange() {
        updateDashboardStyling();
        setActiveNavItem();
        
        // 🔥 التحديث: إجبار ملف الاستثمارات على تحديث نفسه عند كل تنقل
        if (typeof window.initInvestments === 'function') {
            setTimeout(window.initInvestments, 100);
        }
    }

    // ربط تغيير الصفحة بأحداث المتصفح
    window.addEventListener('popstate', handlePageChange);

    // ربط تحديث الواجهة مع دالة loadPage في app.js
    const checkAppInterval = setInterval(function() {
        if (typeof window.TeraApp !== 'undefined' && typeof window.TeraApp.loadPage === 'function') {
            clearInterval(checkAppInterval);
            const originalLoadPage = window.TeraApp.loadPage;
            window.TeraApp.loadPage = function(url) {
                originalLoadPage(url);
                // تأخير بسيط لضمان تحميل الـ DOM الجديد ثم تشغيل التهيئة
                setTimeout(handlePageChange, 200);
            };
        }
    }, 100);

    // ... [باقي التهيئة والـ window.TeraMain تبقى كما هي في ملفك] ...
    
    function initMain() {
        console.log('🚀 [Main] بدء تهيئة واجهة المستخدم (UI)...');
        initBackToDashboard();
        initUiEvents();
        updateDashboardStyling();
        setActiveNavItem();
        // تشغيل نظام الاستثمارات لأول مرة
        if (typeof window.initInvestments === 'function') window.initInvestments();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    window.TeraMain = {
        initMain: initMain,
        getCurrentPage: getCurrentPage,
        refreshUI: handlePageChange,
        showToast: showToast,
        setActiveNavItem: setActiveNavItem
    };

})();
