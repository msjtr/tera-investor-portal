/**
 * ============================================================
 * app.js - الملف الرئيسي لتطبيق تيرا للمستثمرين (النسخة المستقرة)
 * ============================================================
 * - تم حل مشكلة التوجيه التلقائي الإجباري في الصفحة الرئيسية
 * - حساب ديناميكي دقيق لعمق المسارات المخصصة للمشروع
 * - متوافق تماماً مع الحماية المطبقة في ملف auth.js
 */

(function() {
    'use strict';

    // ============================================================
    // 1. دوال مساعدة للمسارات النسبية الذكية
    // ============================================================

    /**
     * حساب عدد المستويات (العمق) بدقة بناءً على الهيكل الفعلي للمشروع
     * @returns {number} عدد مستويات الصعود المطلوب للوصول للجذر
     */
    function getBaseDepth() {
        const path = window.location.pathname.toLowerCase();
        
        if (path.includes('/auth/auth/login/')) return 3; // مجلد فرعي ثلاثي
        if (path.includes('/auth/register/')) return 2;   // مجلد فرعي ثنائي
        if (path.includes('/pages/')) return 2;           // مجلدات لوحة التحكم
        if (path.includes('/auth/')) return 1;            // الملفات المباشرة في auth مثل forgot-password
        
        // إذا كنا في الجذر أو ملف index.html الرئيسي
        return 0;
    }

    /**
     * إنشاء مسار نسبي محمي من الجذر إلى المسار المطلوب
     * @param {string} targetPath - المسار المستهدف
     * @returns {string} المسار مع البادئة النسبية الصحيحة مثل ../
     */
    function resolveRelativePath(targetPath) {
        let cleanPath = targetPath;
        if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.slice(1);
        }
        while (cleanPath.startsWith('../')) {
            cleanPath = cleanPath.slice(3);
        }
        // إلحاق الامتداد تلقائياً للصفحات النظيفة
        if (!cleanPath.endsWith('.html') && !cleanPath.includes('.') && !cleanPath.includes('?')) {
            cleanPath = cleanPath + '.html';
        }
        
        const depth = getBaseDepth();
        const prefix = '../'.repeat(depth);
        return prefix + cleanPath;
    }

    // ============================================================
    // 2. تكوينات التطبيق الأساسية
    // ============================================================

    const APP_CONFIG = {
        name: 'تيرا للمستثمرين',
        version: '1.0.1',
        apiBaseUrl: '/api/v1',
        debug: true,
        authRequired: true,
        loginUrl: resolveRelativePath('auth/auth/login/login.html'),
        defaultPage: resolveRelativePath('pages/dashboard/index.html')
    };

    // ============================================================
    // 3. حالة التطبيق (Application State)
    // ============================================================

    const AppState = {
        currentUser: null,
        currentPage: '',
        isLoggedIn: false,
        isLoading: false,
        notifications: [],
        portfolioData: null,
        _loadingCount: 0
    };

    // ============================================================
    // 4. خريطة مسارات الصفحات الموحدة
    // ============================================================

    const ROUTES = {
        '/': resolveRelativePath('index.html'),
        '/index.html': resolveRelativePath('index.html'),
        '/dashboard': resolveRelativePath('pages/dashboard/index.html'),
        '/dashboard/index.html': resolveRelativePath('pages/dashboard/index.html'),
        '/investments': resolveRelativePath('pages/investments/opportunities.html'),
        '/investments/opportunities': resolveRelativePath('pages/investments/opportunities.html'),
        '/investments/active': resolveRelativePath('pages/investments/active-investments.html'),
        '/investments/completed': resolveRelativePath('pages/investments/completed-investments.html'),
        '/investments/cancelled': resolveRelativePath('pages/investments/cancelled-investments.html'),
        '/investments/extended': resolveRelativePath('pages/investments/extended-investments.html'),
        '/investments/details': resolveRelativePath('pages/investments/investment-details.html'),
        '/portfolio': resolveRelativePath('pages/portfolio/portfolio-overview.html'),
        '/portfolio/overview': resolveRelativePath('pages/portfolio/portfolio-overview.html'),
        '/portfolio/transactions': resolveRelativePath('pages/portfolio/transactions.html'),
        '/portfolio/profits': resolveRelativePath('pages/portfolio/profits.html'),
        '/portfolio/withdraw': resolveRelativePath('pages/portfolio/withdraw-request.html'),
        '/portfolio/withdrawals': resolveRelativePath('pages/portfolio/withdrawal-history.html'),
        '/portfolio/statement': resolveRelativePath('pages/portfolio/account-statement.html'),
        '/reports': resolveRelativePath('pages/reports/reports-dashboard.html'),
        '/reports/dashboard': resolveRelativePath('pages/reports/reports-dashboard.html'),
        '/reports/portfolio': resolveRelativePath('pages/reports/portfolio-report.html'),
        '/reports/investments': resolveRelativePath('pages/reports/investments-report.html'),
        '/reports/profits': resolveRelativePath('pages/reports/profits-report.html'),
        '/reports/withdrawals': resolveRelativePath('pages/reports/withdrawals-report.html'),
        '/profile': resolveRelativePath('pages/profile/personal-information.html'),
        '/profile/personal': resolveRelativePath('pages/profile/personal-information.html'),
        '/profile/contact': resolveRelativePath('pages/profile/contact-information.html'),
        '/profile/address': resolveRelativePath('pages/profile/national-address.html'),
        '/profile/bank': resolveRelativePath('pages/profile/bank-information.html'),
        '/profile/attachments': resolveRelativePath('pages/profile/attachments.html'),
        '/security': resolveRelativePath('pages/security/change-password.html'),
        '/security/password': resolveRelativePath('pages/security/change-password.html'),
        '/security/email': resolveRelativePath('pages/security/change-email.html'),
        '/security/mobile': resolveRelativePath('pages/security/change-mobile.html'),
        '/security/2fa': resolveRelativePath('pages/security/two-factor-authentication.html'),
        '/security/devices': resolveRelativePath('pages/security/registered-devices.html'),
        '/security/login-history': resolveRelativePath('pages/security/login-history.html'),
        '/support': resolveRelativePath('pages/support/help-center.html'),
        '/support/help': resolveRelativePath('pages/support/help-center.html'),
        '/support/faq': resolveRelativePath('pages/support/faq.html'),
        '/support/tickets': resolveRelativePath('pages/support/tickets.html'),
        '/support/notifications': resolveRelativePath('pages/support/notifications.html'),
        '/support/privacy': resolveRelativePath('pages/support/privacy-policy.html'),
        '/support/terms': resolveRelativePath('pages/support/terms-and-conditions.html'),
        '/auth/login': resolveRelativePath('auth/auth/login/login.html'),
        '/auth/register': resolveRelativePath('auth/register/register.html'),
        '/auth/forgot-password': resolveRelativePath('auth/forgot-password.html'),
        '/auth/reset-password': resolveRelativePath('auth/reset-password.html'),
        '/auth/verify-otp': resolveRelativePath('auth/verify-otp.html'),
        '/auth/complete-profile': resolveRelativePath('auth/complete-profile.html')
    };

    // ============================================================
    // 5. دوال فحص الصلاحيات الأمنية والصفحات العامة
    // ============================================================

    /**
     * التحقق مما إذا كان المسار يمثل صفحة عامة متاحة للزوار بدون تسجيل دخول
     */
    function isPublicPage(path) {
        let normalizedPath = path.toLowerCase();
        // إزالة بادئة السيرفر التلقائية إن وجدت لمنع الخلط
        if (normalizedPath.includes('tera-investor-portal-main')) {
            normalizedPath = normalizedPath.replace('/tera-investor-portal-main', '');
        }
        
        // الصفحة الرئيسية وصفحات المصادقة والدعم القانوني تعتبر صفحات عامة
        return normalizedPath === '/' || 
               normalizedPath === '/index.html' || 
               normalizedPath.includes('/auth/') ||
               normalizedPath.includes('/privacy-policy') ||
               normalizedPath.includes('/terms-and-conditions');
    }

    function checkAuthStatus() {
        const token = localStorage.getItem('tera_token');
        const userData = localStorage.getItem('tera_user');
        if (token && userData) {
            try {
                AppState.currentUser = JSON.parse(userData);
                AppState.isLoggedIn = true;
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    function logout() {
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        AppState.currentUser = null;
        AppState.isLoggedIn = false;
        window.location.href = APP_CONFIG.loginUrl;
    }

    // ============================================================
    // 6. نظام التوجيه الديناميكي المتوافق مع السيرفرات
    // ============================================================

    function resolveRoute(path) {
        const cleanPath = path.split('?')[0].split('#')[0];
        let normalizedPath = cleanPath;
        if (normalizedPath.includes('tera-investor-portal-main')) {
            normalizedPath = normalizedPath.replace('/tera-investor-portal-main', '');
        }
        if (normalizedPath.startsWith('/')) {
            if (ROUTES[normalizedPath]) return ROUTES[normalizedPath];
            const withHtml = normalizedPath + '.html';
            if (ROUTES[withHtml]) return ROUTES[withHtml];
            if (normalizedPath.endsWith('.html')) return resolveRelativePath(normalizedPath);
        } else {
            if (normalizedPath.endsWith('.html')) return resolveRelativePath(normalizedPath);
            for (const key in ROUTES) {
                if (key.endsWith(normalizedPath) || key === '/' + normalizedPath) {
                    return ROUTES[key];
                }
            }
        }
        return isPublicPage(path) ? resolveRelativePath('index.html') : APP_CONFIG.defaultPage;
    }

    function navigateTo(path, replace) {
        const targetPath = resolveRoute(path);
        
        // تفعيل الحماية المشددة لمنع توجيه الصفحات المسموحة
        if (APP_CONFIG.authRequired && !isPublicPage(path) && !AppState.isLoggedIn) {
            console.warn('🔒 منطقة محمية. جاري التحويل لبوابة تسجيل الدخول الأمنية.');
            window.location.href = APP_CONFIG.loginUrl;
            return;
        }
        if (replace) {
            window.history.replaceState({ path: targetPath }, '', path);
        } else {
            window.history.pushState({ path: targetPath }, '', path);
        }
        loadPage(targetPath);
    }

    // ============================================================
    // 7. تحميل وحقن محتويات الصفحات ديناميكياً
    // ============================================================

    function loadPage(url) {
        if (AppState.currentPage === url && AppState._loadingCount > 0) return;

        AppState._loadingCount++;
        AppState.currentPage = url;
        AppState.isLoading = true;
        showLoader();

        fetch(url)
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(function(html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                if (!doc) throw new Error('Parsing Error');

                const mainContent = document.querySelector('.tera-main-content') || document.querySelector('.main-content');
                if (mainContent) {
                    const newContent = doc.querySelector('.tera-main-content') || doc.querySelector('.main-content');
                    if (newContent) {
                        mainContent.innerHTML = newContent.innerHTML;
                    } else if (doc.body) {
                        mainContent.innerHTML = doc.body.innerHTML;
                    }
                    reinitializeScripts(doc);
                } else {
                    document.documentElement.innerHTML = html;
                }

                const title = doc.querySelector('title');
                if (title) document.title = title.textContent;
            })
            .catch(function(error) {
                console.error('❌ خطأ في تحميل المستند:', error);
            })
            .finally(function() {
                AppState._loadingCount--;
                AppState.isLoading = false;
                hideLoader();
            });
    }

    function reinitializeScripts(doc) {
        if (!doc) return;
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(function(script) {
            if (script.src) {
                let src = script.src;
                if (src.startsWith('/')) src = resolveRelativePath(src);
                const existingScript = document.querySelector(`script[src="${src}"]`);
                if (!existingScript) {
                    const newScript = document.createElement('script');
                    newScript.src = src;
                    newScript.async = false;
                    document.body.appendChild(newScript);
                }
            } else if (script.textContent && !script.textContent.includes('DOMContentLoaded')) {
                try {
                    eval(script.textContent);
                } catch (e) {}
            }
        });

        if (window.TeraCore && typeof window.TeraCore.initCore === 'function') {
            try { window.TeraCore.initCore(); } catch (e) {}
        }
    }

    // ============================================================
    // 8. عناصر التحكم والتهيئة الأساسية عند الإطلاق
    // ============================================================

    function showLoader() {
        const loader = document.getElementById('loader-container');
        if (loader) loader.style.display = 'flex';
    }

    document.body.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || link.target === '_blank' || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:')) return;
        
        e.preventDefault();
        navigateTo(href);
    });

    function hideLoader() {
        const loader = document.getElementById('loader-container');
        if (loader) loader.style.display = 'none';
    }

    function initApp() {
        checkAuthStatus();
        const currentPath = window.location.pathname;
        
        // منع الفحص الإجباري وتوجيه صفحة index العامة
        if (isPublicPage(currentPath) && !AppState.isLoggedIn) {
            console.log('🔓 تم السماح بالولوج للصفحة العامة بنجاح.');
            return; 
        }

        const targetPage = resolveRoute(currentPath);
        if (targetPage !== currentPath && !currentPath.includes('.html')) {
            navigateTo(currentPath);
        } else {
            loadPage(targetPage);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // تصدير دوال المتحكم العام للواجهات
    window.TeraApp = {
        navigateTo: navigateTo,
        loadPage: loadPage,
        logout: logout,
        isLoggedIn: function() { return AppState.isLoggedIn; },
        getCurrentUser: function() { return AppState.currentUser; }
    };

})();
