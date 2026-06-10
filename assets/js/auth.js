/* ==========================================
   TERA Investor Portal - Main Router & Core Integration
   إصلاح: دقة المسارات، مسار الشعار الديناميكي، دعم الصفحات الفرعية
========================================== */

(function() {
    'use strict';

    // ====================== تكوين المسارات (الأكثر تحديداً أولاً) ======================
    const routes = [
        // صفحات محددة داخل المجلدات الفرعية (إن وجدت)
        { pattern: '/pages/dashboard/settings/', name: 'dashboard-settings', init: () => window.initDashboardSettings?.(), requiresAuth: true },
        { pattern: '/pages/dashboard/analytics/', name: 'dashboard-analytics', init: () => window.initDashboardAnalytics?.(), requiresAuth: true },
        
        // الصفحات الرئيسية لكل قسم
        { pattern: '/pages/dashboard/', name: 'dashboard', init: () => window.initDashboard?.(), requiresAuth: true },
        { pattern: '/pages/investments/', name: 'investments', init: () => window.initInvestments?.(), requiresAuth: true },
        { pattern: '/pages/portfolio/', name: 'portfolio', init: () => window.initPortfolio?.(), requiresAuth: true },
        { pattern: '/pages/reports/', name: 'reports', init: () => window.initReports?.(), requiresAuth: true },
        { pattern: '/pages/profile/', name: 'profile', init: () => window.initProfile?.(), requiresAuth: true },
        { pattern: '/pages/security/', name: 'security', init: () => window.initSecurity?.(), requiresAuth: true },
        { pattern: '/pages/support/', name: 'support', init: () => window.initSupport?.(), requiresAuth: true },
        
        // المصادقة
        { pattern: '/auth/', name: 'auth', init: () => window.initAuth?.(), requiresAuth: false },
        { pattern: '/auth/login/', name: 'auth-login', init: () => window.initAuthLogin?.(), requiresAuth: false },
        { pattern: '/auth/register/', name: 'auth-register', init: () => window.initAuthRegister?.(), requiresAuth: false },
    ];

    // ====================== دوال مساعدة محسنة ======================
    function getNormalizedPath() {
        let path = window.location.pathname;
        
        // إزالة .html من النهاية (إن وجد)
        if (path.endsWith('.html')) {
            path = path.slice(0, -5);
        }
        
        // إزالة الشرطة المائلة الأخيرة مؤقتاً للمقارنة
        const pathWithoutTrailingSlash = path.endsWith('/') ? path.slice(0, -1) : path;
        
        // إذا كان المسار فارغاً أو مجرد '/' -> الصفحة الرئيسية
        if (pathWithoutTrailingSlash === '' || pathWithoutTrailingSlash === '/') {
            return '/';
        }
        
        // استخراج الاسم الأخير للملف أو المجلد
        const lastSegment = pathWithoutTrailingSlash.split('/').pop();
        
        // إذا كان الاسم الأخير يحتوي على نقطة (مثل 'index' أو 'dashboard') فقد يكون ملفاً
        // نعتبر أي مسار ينتهي باسم ملف (بدون نقطة) هو مجلد ونضيف شرطة مائلة
        if (!lastSegment.includes('.') && !path.endsWith('/')) {
            path = pathWithoutTrailingSlash + '/';
        } else {
            path = pathWithoutTrailingSlash;
        }
        
        return path || '/';
    }

    function checkAuth() {
        // تفويض التحقق إلى auth.js إن أمكن
        if (typeof window.isAuthenticated === 'function') {
            return window.isAuthenticated();
        }
        // حل احتياطي بسيط
        const token = localStorage.getItem('accessToken');
        if (token) return true;
        
        // استثناء صفحات المصادقة نفسها
        if (window.location.pathname.includes('/auth/')) return true;
        
        return false;
    }

    function redirectToLogin() {
        if (!window.location.pathname.includes('/auth/')) {
            window.location.href = '/auth/login.html';
        }
    }

    // ====================== تهيئة المسار الحالي (مطابقة دقيقة) ======================
    function initCurrentRoute() {
        const currentPath = getNormalizedPath();
        console.log('🔄 Normalized Path:', currentPath);

        // البحث عن المسار المطابق (أطول تطابق أولاً)
        let matchedRoute = null;
        for (const route of routes) {
            if (currentPath.startsWith(route.pattern)) {
                if (!matchedRoute || route.pattern.length > matchedRoute.pattern.length) {
                    matchedRoute = route;
                }
            }
        }

        if (matchedRoute) {
            const route = matchedRoute;
            // التحقق من الصلاحيات
            if (route.requiresAuth && !checkAuth()) {
                console.warn('🔒 Unauthorized access, redirecting to login');
                redirectToLogin();
                return;
            }
            // تنفيذ تهيئة الصفحة
            if (typeof route.init === 'function') {
                route.init();
            } else {
                console.warn(`⚠️ No init function for route ${route.name}`);
            }
            // إضافة class إلى body
            document.body.classList.add(`page-${route.name}`);
        } else {
            // مسار غير معروف
            const isPublic = (currentPath === '/' || currentPath.startsWith('/auth/'));
            if (!isPublic) {
                console.warn('⚠️ Unknown route:', currentPath, '- showing 404');
                const notFoundDiv = document.getElementById('not-found-message');
                if (notFoundDiv) notFoundDiv.style.display = 'block';
            } else {
                console.log('🏠 Public page loaded:', currentPath);
                if (typeof window.initPublic === 'function') window.initPublic();
            }
        }
    }

    // ====================== ربط المكونات المشتركة (شعار مرن) ======================
    function getBaseUrl() {
        // الحصول على المسار الأساسي للمشروع (مثلاً /tera-investor-portal/)
        const scripts = document.getElementsByTagName('script');
        const currentScript = scripts[scripts.length - 1];
        const src = currentScript.src;
        const base = src.substring(0, src.lastIndexOf('/assets/js/'));
        return base;
    }

    function loadSharedComponents() {
        const logoArea = document.querySelector('.logo-area');
        if (logoArea && !logoArea.querySelector('.logo')) {
            const baseUrl = getBaseUrl();
            const img = document.createElement('img');
            img.src = `${baseUrl}/images/logo.svg`;  // مسار ديناميكي
            img.alt = 'TERA Logo';
            img.className = 'logo';
            const span = document.createElement('span');
            span.className = 'brand-name';
            span.textContent = 'TERA';
            logoArea.prepend(img);
            logoArea.appendChild(span);
        }

        // تفعيل القائمة الجانبية
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar && typeof window.initSidebar === 'function') {
            window.initSidebar();
        }

        // تفعيل الإشعارات العامة
        if (typeof window.setupGlobalNotifications === 'function') {
            window.setupGlobalNotifications();
        }
    }

    // ====================== بدء التشغيل ======================
    document.addEventListener('DOMContentLoaded', () => {
        loadSharedComponents();
        initCurrentRoute();
    });

})();
