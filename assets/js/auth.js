/* ==========================================
   TERA Investor Portal - Main Router & Core Integration
   اصلاح: توافق المسارات، تعطيل SPA الزائف، مسار شعار مطلق
========================================== */

(function() {
    'use strict';

    // ====================== تحسين المسارات ======================
    const routes = {
        '/pages/dashboard/': {
            name: 'dashboard',
            init: () => {
                console.log('✅ Dashboard module initialized');
                if (typeof window.initDashboard === 'function') window.initDashboard();
            },
            requiresAuth: true
        },
        '/pages/investments/': {
            name: 'investments',
            init: () => {
                console.log('✅ Investments module initialized');
                if (typeof window.initInvestments === 'function') window.initInvestments();
            },
            requiresAuth: true
        },
        '/pages/portfolio/': {
            name: 'portfolio',
            init: () => {
                console.log('✅ Portfolio module initialized');
                if (typeof window.initPortfolio === 'function') window.initPortfolio();
            },
            requiresAuth: true
        },
        '/pages/reports/': {
            name: 'reports',
            init: () => {
                console.log('✅ Reports module initialized');
                if (typeof window.initReports === 'function') window.initReports();
            },
            requiresAuth: true
        },
        '/pages/profile/': {
            name: 'profile',
            init: () => {
                console.log('✅ Profile module initialized');
                if (typeof window.initProfile === 'function') window.initProfile();
            },
            requiresAuth: true
        },
        '/pages/security/': {
            name: 'security',
            init: () => {
                console.log('✅ Security module initialized');
                if (typeof window.initSecurity === 'function') window.initSecurity();
            },
            requiresAuth: true
        },
        '/pages/support/': {
            name: 'support',
            init: () => {
                console.log('✅ Support module initialized');
                if (typeof window.initSupport === 'function') window.initSupport();
            },
            requiresAuth: true
        },
        '/auth/': {
            name: 'auth',
            init: () => {
                console.log('✅ Auth module initialized');
                if (typeof window.initAuth === 'function') window.initAuth();
            },
            requiresAuth: false
        }
    };

    // ====================== دوال مساعدة ======================
    function getNormalizedPath() {
        let path = window.location.pathname;
        // إزالة .html من النهاية
        if (path.endsWith('.html')) {
            path = path.slice(0, -5);
        }
        // إضافة شرطة مائلة للنهايات إذا كان المسار لا يحتوي على نقطة (أي ليس ملفاً)
        if (!path.endsWith('/') && !path.includes('.') && path !== '') {
            path += '/';
        }
        // معالجة خاصة للمسار الجذر
        if (path === '') path = '/';
        return path;
    }

    function checkAuth() {
        // استخدام دالة عامة إذا وجدت، وإلا التحقق من التوكن
        if (typeof window.isAuthenticated === 'function') {
            return window.isAuthenticated();
        }
        return !!localStorage.getItem('accessToken');
    }

    function redirectToLogin() {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/auth/')) {
            window.location.href = '/auth/login.html';
        }
    }

    // ====================== تهيئة المسار الحالي ======================
    function initCurrentRoute() {
        const currentPath = getNormalizedPath();
        console.log('🔄 Normalized Path:', currentPath);

        // البحث عن أطول مسار مطابق
        let matchedRoute = null;
        for (const routePath in routes) {
            if (currentPath.startsWith(routePath)) {
                if (!matchedRoute || routePath.length > matchedRoute.length) {
                    matchedRoute = routePath;
                }
            }
        }

        if (matchedRoute) {
            const route = routes[matchedRoute];
            // التحقق من الصلاحيات
            if (route.requiresAuth && !checkAuth()) {
                console.warn('🔒 Unauthorized access, redirecting to login');
                redirectToLogin();
                return;
            }
            // تنفيذ تهيئة الصفحة
            if (typeof route.init === 'function') {
                route.init();
            }
            // إضافة class إلى body لتنسيقات CSS
            document.body.classList.add(`page-${route.name}`);
        } else {
            // مسار غير معروف: نتحقق إذا كان صفحة عامة (جذر أو صفحات المصادقة)
            const isPublic = (currentPath === '/' || currentPath === '/index/' || currentPath.startsWith('/auth/'));
            if (!isPublic) {
                console.warn('⚠️ Unknown route:', currentPath, '- showing 404');
                // يمكن عرض رسالة 404 مخصصة هنا
                const notFoundDiv = document.getElementById('not-found-message');
                if (notFoundDiv) notFoundDiv.style.display = 'block';
            } else {
                console.log('🏠 Public page loaded:', currentPath);
                if (typeof window.initPublic === 'function') window.initPublic();
            }
        }
    }

    // ====================== ربط المكونات المشتركة ======================
    function loadSharedComponents() {
        // إضافة شعار بشكل مطلق (من جذر الموقع) لتجنب مشاكل المسارات النسبية
        const logoArea = document.querySelector('.logo-area');
        if (logoArea && !logoArea.querySelector('.logo')) {
            const img = document.createElement('img');
            img.src = '/images/logo.svg';   // مسار مطلق
            img.alt = 'TERA Logo';
            img.className = 'logo';
            const span = document.createElement('span');
            span.className = 'brand-name';
            span.textContent = 'TERA';
            logoArea.prepend(img);
            logoArea.appendChild(span);
        }

        // تفعيل القائمة الجانبية إذا وجدت
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
        // تم إزالة setupNavigationInterceptor لأنه كان يسبب مشاكل في التنقل التقليدي
        // إذا أردت تنقل سلس بدون إعادة تحميل، يجب تطبيق نظام SPA كامل وليس مجرد اعتراض الروابط.
    });

})();
