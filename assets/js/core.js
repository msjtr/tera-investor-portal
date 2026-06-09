/* ==========================================
   TERA Investor Portal - Main JS (Optimized)
========================================== */

document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname;
    console.log('Current Page:', page);

    // تعريف المسارات والوظائف المرتبطة بها في كائن واحد (Map)
    const routeHandlers = {
        '/pages/dashboard/': () => console.log('Dashboard Loaded'),
        '/pages/investments/': () => console.log('Investments Loaded'),
        '/pages/portfolio/': () => console.log('Portfolio Loaded'),
        '/pages/reports/': () => console.log('Reports Loaded'),
        '/pages/profile/': () => console.log('Profile Loaded'),
        '/pages/security/': () => console.log('Security Loaded'),
        '/pages/support/': () => console.log('Support Loaded'),
        '/auth/': () => console.log('Authentication Page Loaded')
    };

    // التنفيذ الذكي: البحث عن المسار المطابق وتشغيل وظيفته
    Object.keys(routeHandlers).forEach(route => {
        if (page.includes(route)) {
            routeHandlers[route]();
        }
    });
});

/* ==========================================
   Helpers (Clean & Exported)
========================================== */

/**
 * دالة للحصول على المسار الحالي
 */
const getCurrentPage = () => window.location.pathname;

/**
 * دالة للتحقق من وجود مسار معين
 */
const pageContains = (path) => window.location.pathname.includes(path);

// تصدير الأدوات إلى window بشكل مجمع
Object.assign(window, {
    getCurrentPage,
    pageContains
});
