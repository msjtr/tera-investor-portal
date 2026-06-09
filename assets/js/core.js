/* ==========================================
   TERA Investor Portal - Main JS (Router Refined)
========================================== */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    console.log('Current Page Path:', path);

    // تعريف المسارات (المطابقة تكون من الأكثر تخصيصاً للأقل)
    const routeHandlers = {
        '/pages/dashboard/': () => console.log('Dashboard Initialized'),
        '/pages/investments/': () => console.log('Investments Initialized'),
        '/pages/portfolio/': () => console.log('Portfolio Initialized'),
        '/pages/reports/': () => console.log('Reports Initialized'),
        '/pages/profile/': () => console.log('Profile Initialized'),
        '/pages/security/': () => console.log('Security Initialized'),
        '/pages/support/': () => console.log('Support Initialized'),
        '/auth/': () => console.log('Authentication Module Loaded')
    };

    // التنفيذ الذكي: مطابقة المسار بدقة
    // نستخدم find للبحث عن أول مسار يطابق بداية الرابط (تجنباً لتشغيل عدة دوال)
    const matchedRoute = Object.keys(routeHandlers).find(route => path.startsWith(route));

    if (matchedRoute) {
        routeHandlers[matchedRoute]();
    } else {
        console.log('General Page Loaded');
    }
});

/* ==========================================
   Helpers (Clean & Exported)
========================================== */

// تحديث الدوال لتعمل بشكل أضمن
window.getCurrentPage = () => window.location.pathname;
window.pageContains = (path) => window.location.pathname.includes(path);
