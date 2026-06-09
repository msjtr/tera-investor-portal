/**
 * TERA Investor Portal - Smart Router
 * المسار: /assets/js/router.js
 */

const loadModule = async (modulePath) => {
    try {
        // نستخدم المسار المطلق من الجذر (/) لتجنب مشاكل المجلدات
        await import(modulePath + '?v=' + Date.now()); // إضافة cache busting لمنع مشاكل التحديث
        console.log(`Module loaded successfully: ${modulePath}`);
    } catch (err) {
        console.error(`Error loading module: ${modulePath}`, err);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // 1. تحميل الأساسيات فقط إذا لم تكن محملة
    if (!window.TERA_APP_LOADED) {
        await loadModule('/assets/js/app.js');
        window.TERA_APP_LOADED = true;
    }
    
    // 2. تحميل موديل المصادقة إذا كنا في مجلد auth
    if (path.includes('/auth/')) {
        await loadModule('/assets/js/auth.js');
    }

    // 3. التوجيه الذكي (استخدام مسارات مطلقة تبدأ بـ /)
    const routes = {
        '/pages/dashboard/': '/assets/js/pages/dashboard.js',
        '/pages/investments/': '/assets/js/pages/investments.js',
        '/pages/portfolio/': '/assets/js/pages/portfolio.js',
        '/pages/profile/': '/assets/js/pages/profile.js',
        '/pages/reports/': '/assets/js/pages/reports.js',
        '/pages/security/': '/assets/js/pages/security.js',
        '/pages/support/': '/assets/js/pages/support.js',
        '/auth/forgot-password.html': '/assets/js/auth/forgot-password.js'
    };

    // المطابقة الدقيقة
    const matchedFile = Object.entries(routes).find(([route]) => path.includes(route));

    if (matchedFile) {
        await loadModule(matchedFile[1]);
    }
});
