/**
 * TERA Investor Portal - Smart Router
 * المسار: /assets/js/router.js
 */

// 1. استخدام الدوال المساعدة لتجنب تكرار الكود
const loadModule = async (modulePath) => {
    try {
        await import(modulePath);
        console.log(`Module loaded: ${modulePath}`);
    } catch (err) {
        console.error(`Error loading module: ${modulePath}`, err);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // 2. تحميل المكتبات الأساسية دائماً
    loadModule('./app.js');
    
    // التحقق من أننا في صفحة مصادقة قبل تحميل auth.js
    if (path.includes('/auth/')) {
        loadModule('./auth.js');
    }

    // 3. التوجيه الذكي (بدون تداخل)
    // نستخدم شرطاً واحداً لكل مسار لضمان عدم تحميل ملفات غير ضرورية
    const routes = {
        '/pages/dashboard/': './dashboard.js',
        '/pages/investments/': './investments.js',
        '/pages/portfolio/': './portfolio.js',
        '/pages/profile/': './profile.js',
        '/pages/reports/': './reports.js',
        '/pages/security/': './security.js',
        '/pages/support/': './support.js',
        '/auth/forgot-password.html': './forgot-password.js'
    };

    // البحث عن المسار المطابق
    for (const [route, file] of Object.entries(routes)) {
        if (path.includes(route)) {
            loadModule(file);
            break; // نخرج من الحلقة بمجرد العثور على المسار الصحيح
        }
    }
});
