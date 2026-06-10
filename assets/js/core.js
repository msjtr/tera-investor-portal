/* ==========================================
   TERA Investor Portal - Main Router & Core Integration
   يعتمد على core.js و auth.js (يتم تحميلهما قبله)
========================================== */

(function() {
    'use strict';

    // ====================== تحسين المسارات ======================
    // قائمة المسارات مع دوال التهيئة الخاصة بكل صفحة
    // يجب أن تكون المفاتيح مطابقة تماماً لبداية المسار الفعلي (بما في ذلك الشرطة المائلة الأخيرة)
    const routes = {
        '/pages/dashboard/': {
            name: 'dashboard',
            init: () => {
                console.log('✅ Dashboard module initialized');
                // استدعاء دوال dashboard.js إذا وجدت
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
                // تهيئة مخصصة لصفحات المصادقة (مثل إظهار نموذج login)
                if (typeof window.initAuth === 'function') window.initAuth();
            },
            requiresAuth: false
        }
    };

    // مسارات عامة (مثل الصفحة الرئيسية أو صفحات الخطأ)
    const publicPaths = ['/index.html', '/', '/auth/login.html', '/auth/register.html'];

    // ====================== دوال مساعدة ======================
    function getNormalizedPath() {
        let path = window.location.pathname;
        // إزالة .html من النهاية لتوحيد المسارات (اختياري)
        // إذا أردت الاحتفاظ بـ .html، يمكن تعديل keys لتنتهي بـ .html أيضاً
        // لكن الأفضل أن keys تكون بدون .html ونقارن بعد إزالة الامتداد
        if (path.endsWith('.html')) {
            path = path.slice(0, -5);
        }
        // التأكد من وجود شرطة مائلة في النهاية للمجلدات
        if (!path.endsWith('/') && !path.includes('.') && path !== '') {
            path += '/';
        }
        return path;
    }

    function checkAuth() {
        // افترض وجود متغير عام أو دالة في auth.js للتحقق من حالة تسجيل الدخول
        if (typeof window.isAuthenticated === 'function') {
            return window.isAuthenticated();
        }
        // طريقة بسيطة: التحقق من وجود token في localStorage
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

        // البحث عن المسار المطابق (أطول تطابق أولاً)
        let matchedRoute = null;
        for (const routePath in routes) {
            if (currentPath.startsWith(routePath)) {
                // إذا وجدنا أكثر من تطابق، نأخذ الأطول (مثلاً /pages/dashboard/ أفضل من /pages/)
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
            // تنفيذ دالة التهيئة الخاصة بالصفحة
            if (typeof route.init === 'function') {
                route.init();
            }
            // إضافة class إلى body لاستخدامه في CSS (مثلاً body.dashboard)
            document.body.classList.add(`page-${route.name}`);
        } else {
            // مسار غير معروف: نتحقق إذا كان صفحة عامة مثل index.html
            const isPublic = publicPaths.some(p => currentPath === p || currentPath.endsWith(p));
            if (!isPublic && checkAuth() === false) {
                // ربما صفحة خطأ 404
                console.warn('⚠️ Unknown route, showing 404');
                // يمكن عرض قالب 404 مخصص
                if (document.getElementById('not-found-message')) {
                    // إظهار رسالة
                }
            } else {
                console.log('🏠 Public or root page loaded');
                if (typeof window.initPublic === 'function') window.initPublic();
            }
        }
    }

    // ====================== ربط المكونات المشتركة ======================
    function loadSharedComponents() {
        // إضافة شعار مشترك في كل الصفحات (إذا لم يكن موجوداً)
        const logoArea = document.querySelector('.logo-area');
        if (logoArea && !logoArea.querySelector('.logo')) {
            // يمكن إنشاء عنصر الشعار ديناميكياً
            const img = document.createElement('img');
            img.src = '../../images/logo.svg';
            img.alt = 'TERA Logo';
            img.className = 'logo';
            const span = document.createElement('span');
            span.className = 'brand-name';
            span.textContent = 'TERA';
            logoArea.prepend(img);
            logoArea.appendChild(span);
        }

        // تفعيل القوائم المشتركة (مثل الـ sidebar)
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar && typeof window.initSidebar === 'function') {
            window.initSidebar();
        }

        // تفعيل الإشعارات العامة
        if (typeof window.setupGlobalNotifications === 'function') {
            window.setupGlobalNotifications();
        }
    }

    // ====================== مراقبة تغييرات المسار (SPA style اختياري) ======================
    // إذا كنت تستخدم التنقل الداخلي عبر الروابط دون إعادة تحميل كاملة
    function setupNavigationInterceptor() {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#') || href.includes('javascript:')) return;

            // منع التنقل الافتراضي فقط إذا كان الرابط داخلياً ونريد معالجته عبر pushState
            const isInternal = href.startsWith('/') || href.startsWith('./') || href.startsWith('../');
            if (isInternal) {
                e.preventDefault();
                const url = new URL(href, window.location.origin);
                window.history.pushState({}, '', url.pathname);
                initCurrentRoute(); // إعادة تهيئة المسار الجديد
                window.scrollTo(0, 0);
            }
        });

        window.addEventListener('popstate', () => {
            initCurrentRoute();
        });
    }

    // ====================== بدء التشغيل ======================
    document.addEventListener('DOMContentLoaded', () => {
        loadSharedComponents();
        initCurrentRoute();
        setupNavigationInterceptor(); // اختياري لتحويل الموقع إلى SPA-like
    });

})();
