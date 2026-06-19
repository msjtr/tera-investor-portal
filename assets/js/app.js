/**
 * ============================================================
 * app.js - الملف الرئيسي لتطبيق تيرا للمستثمرين (النسخة المستقرة)
 * ============================================================
 * تم إصلاح نظام التوجيه (Routing) ليعتمد على المسارات المطلقة
 * مع دعم المسارات المختصرة عبر جدول ROUTES.
 * ============================================================
 * التغييرات الرئيسية:
 * 1. تحسين resolvePath للبحث في ROUTES حتى لو لم يكن التطابق تاماً.
 * 2. إزالة إضافة /tera-investor-portal-main في navigateTo لتجنب الأخطاء.
 * 3. التأكد من أن loadPage تستخدم المسار الكامل كما هو.
 * 4. إصلاح handlePopState لاستخدام المسار الصحيح وتحديث واجهة المستخدم.
 * 5. استدعاء TeraMain.refreshUI() بعد تحميل الصفحة لتحديث المكونات.
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. نظام المسارات الذكي (بدون ../ المزعجة)
    // ============================================================

    /**
     * يحول أي مسار إلى مسار مطلق من جذر السيرفر
     */
    function resolvePath(path) {
        if (!path || path.startsWith('#') || path.startsWith('javascript:')) {
            return path;
        }

        let cleanPath = path;
        
        // إذا كان الرابط كاملاً (يحتوي على http)، نأخذ المسار فقط
        if (cleanPath.startsWith('http')) {
            cleanPath = new URL(cleanPath).pathname;
        }

        // دعم السيرفر المحلي (Live Server) إذا كان المشروع داخل مجلد
        const baseFolder = '/tera-investor-portal-main';
        if (cleanPath.includes(baseFolder)) {
            cleanPath = cleanPath.replace(baseFolder, '');
        }

        // التأكد من أن المسار يبدأ بـ /
        if (!cleanPath.startsWith('/')) {
            cleanPath = '/' + cleanPath;
        }

        // 1. البحث المباشر في قاموس المسارات
        if (ROUTES[cleanPath]) {
            return ROUTES[cleanPath];
        }

        // 2. إذا كان المسار ينتهي بـ .html، نحاول إيجاد تطابق في ROUTES
        if (cleanPath.endsWith('.html')) {
            const fileName = cleanPath.substring(cleanPath.lastIndexOf('/'));
            for (let key in ROUTES) {
                if (ROUTES[key].endsWith(fileName)) {
                    return ROUTES[key];
                }
            }
        }

        // 3. إذا كان المسار مختصراً (بدون .html) نحاول البحث عن مفتاح يبدأ بنفس المسار
        //    مثلاً: /investments/opportunities → نبحث عن مفتاح يبدأ بـ /investments/opportunities
        for (let key in ROUTES) {
            if (key === cleanPath || key.startsWith(cleanPath + '/') || key.startsWith(cleanPath)) {
                return ROUTES[key];
            }
        }

        // 4. إذا لم يتم العثور على مسار، نعيد المسار الأصلي (قد يكون الرابط صحيحاً بالفعل)
        return cleanPath;
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
        loginUrl: '/auth/auth/login/login.html',
        defaultPage: '/pages/dashboard/index.html'
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
    // 4. مسارات الصفحات (مطلقة)
    // ============================================================

    const ROUTES = {
        '/': '/pages/dashboard/index.html',
        '/index.html': '/pages/dashboard/index.html',
        '/dashboard': '/pages/dashboard/index.html',
        '/dashboard/index.html': '/pages/dashboard/index.html',
        '/investments': '/pages/investments/opportunities.html',
        '/investments/opportunities': '/pages/investments/opportunities.html',
        '/investments/active-investments': '/pages/investments/active-investments.html',
        '/investments/active': '/pages/investments/active-investments.html',
        '/investments/completed-investments': '/pages/investments/completed-investments.html',
        '/investments/cancelled-investments': '/pages/investments/cancelled-investments.html',
        '/investments/extended-investments': '/pages/investments/extended-investments.html',
        '/investments/investment-details': '/pages/investments/investment-details.html',
        '/portfolio': '/pages/portfolio/portfolio-overview.html',
        '/portfolio/portfolio-overview': '/pages/portfolio/portfolio-overview.html',
        '/portfolio/transactions': '/pages/portfolio/transactions.html',
        '/portfolio/profits': '/pages/portfolio/profits.html',
        '/portfolio/withdraw-request': '/pages/portfolio/withdraw-request.html',
        '/portfolio/withdrawal-history': '/pages/portfolio/withdrawal-history.html',
        '/portfolio/account-statement': '/pages/portfolio/account-statement.html',
        '/reports': '/pages/reports/reports-dashboard.html',
        '/reports/reports-dashboard': '/pages/reports/reports-dashboard.html',
        '/reports/portfolio-report': '/pages/reports/portfolio-report.html',
        '/reports/investments-report': '/pages/reports/investments-report.html',
        '/reports/profits-report': '/pages/reports/profits-report.html',
        '/reports/withdrawals-report': '/pages/reports/withdrawals-report.html',
        '/profile': '/pages/profile/personal-information.html',
        '/profile/personal-information': '/pages/profile/personal-information.html',
        '/profile/contact-information': '/pages/profile/contact-information.html',
        '/profile/national-address': '/pages/profile/national-address.html',
        '/profile/bank-information': '/pages/profile/bank-information.html',
        '/profile/attachments': '/pages/profile/attachments.html',
        '/security': '/pages/security/change-password.html',
        '/security/change-password': '/pages/security/change-password.html',
        '/security/change-email': '/pages/security/change-email.html',
        '/security/change-mobile': '/pages/security/change-mobile.html',
        '/security/two-factor-authentication': '/pages/security/two-factor-authentication.html',
        '/security/registered-devices': '/pages/security/registered-devices.html',
        '/security/login-history': '/pages/security/login-history.html',
        '/support': '/pages/support/help-center.html',
        '/support/help-center': '/pages/support/help-center.html',
        '/support/faq': '/pages/support/faq.html',
        '/support/tickets': '/pages/support/tickets.html',
        '/support/notifications': '/pages/support/notifications.html',
        '/support/privacy-policy': '/pages/support/privacy-policy.html',
        '/support/terms-and-conditions': '/pages/support/terms-and-conditions.html',
        '/auth/login': '/auth/auth/login/login.html',
        '/auth/register': '/auth/register/register.html',
        '/auth/forgot-password': '/auth/forgot-password.html',
        '/auth/reset-password': '/auth/reset-password.html',
        '/auth/verify-otp': '/auth/verify-otp.html',
        '/auth/complete-profile': '/auth/complete-profile.html'
    };

    // ============================================================
    // 5. دوال التحكم في الصفحات
    // ============================================================

    const PUBLIC_PAGES = [
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/verify-otp',
        '/auth/complete-profile'
    ];

    function isPublicPage(path) {
        return PUBLIC_PAGES.some(publicPath => path.startsWith(publicPath));
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

    function login(credentials) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (credentials.email && credentials.password) {
                    const userData = { id: 1, name: 'أحمد محمد', email: credentials.email, role: 'investor' };
                    localStorage.setItem('tera_token', 'mock_token_12345');
                    localStorage.setItem('tera_user', JSON.stringify(userData));
                    AppState.currentUser = userData;
                    AppState.isLoggedIn = true;
                    resolve(userData);
                } else {
                    reject(new Error('بيانات الدخول غير صحيحة'));
                }
            }, 500);
        });
    }

    function logout() {
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        AppState.currentUser = null;
        AppState.isLoggedIn = false;
        window.location.href = APP_CONFIG.loginUrl;
    }

    // ============================================================
    // 6. نظام التوجيه (Router) - المسارات المطلقة فقط
    // ============================================================

    function navigateTo(path, replace = false) {
        let targetPath = resolvePath(path);
        
        // لا نضيف مجلدات إضافية، نترك المسار كما هو
        // لأن resolvePath يعيد المسار الكامل من الجذر

        if (APP_CONFIG.authRequired && !isPublicPage(targetPath) && !AppState.isLoggedIn) {
            console.warn('🔒 يتطلب تسجيل الدخول');
            window.location.href = APP_CONFIG.loginUrl;
            return;
        }

        if (replace) {
            window.history.replaceState({ path: targetPath }, '', targetPath);
        } else {
            window.history.pushState({ path: targetPath }, '', targetPath);
        }
        
        loadPage(targetPath);
    }

    // ============================================================
    // 7. تحميل الصفحات (Fetch) - باستخدام المسار المطلق النظيف
    // ============================================================

    function loadPage(url) {
        if (AppState.currentPage === url && AppState._loadingCount > 0) return;

        AppState._loadingCount++;
        AppState.currentPage = url;
        AppState.isLoading = true;
        showLoader();

        console.log('📄 جاري تحميل الصفحة:', url);

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const mainContent = document.querySelector('.main-content');
                
                if (mainContent) {
                    const newContent = doc.querySelector('.main-content');
                    if (newContent) {
                        mainContent.innerHTML = newContent.innerHTML;
                    } else {
                        mainContent.innerHTML = doc.body ? doc.body.innerHTML : html;
                    }
                    reinitializeScripts(doc);
                } else {
                    document.documentElement.innerHTML = html;
                }

                const title = doc.querySelector('title');
                if (title) document.title = title.textContent;

                // ✅ تحديث واجهة المستخدم بعد تحميل الصفحة
                if (typeof window.TeraMain !== 'undefined' && typeof window.TeraMain.refreshUI === 'function') {
                    window.TeraMain.refreshUI();
                }
            })
            .catch(error => {
                console.error('❌ خطأ في تحميل الصفحة:', error);
                showErrorPage(error);
            })
            .finally(() => {
                AppState._loadingCount--;
                AppState.isLoading = false;
                hideLoader();
            });
    }

    function reinitializeScripts(doc) {
        if (window.TeraCore && typeof window.TeraCore.initCore === 'function') {
            window.TeraCore.initCore();
        }
        const pageFunctions = ['initDashboard', 'initInvestments', 'initPortfolio', 'initReports', 'initProfile', 'initSecurity', 'initSupport'];
        pageFunctions.forEach(fnName => {
            if (typeof window[fnName] === 'function') window[fnName]();
        });
    }

    // ============================================================
    // 8. واجهة المستخدم (Loader & Notifications)
    // ============================================================

    function showLoader() {
        let loader = document.getElementById('app-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'app-loader';
            loader.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px);`;
            loader.innerHTML = `<div style="width: 50px; height: 50px; border: 6px solid #e9ecef; border-top-color: #0D6EFD; border-radius: 50%; animation: spin 0.8s linear infinite;"></div><p style="margin-top: 20px; font-weight: 500;">جاري التحميل...</p><style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    function hideLoader() {
        const loader = document.getElementById('app-loader');
        if (loader) loader.style.display = 'none';
    }

    function showErrorPage(error) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; text-align: center;">
                    <div style="font-size: 72px; color: #DC3545; margin-bottom: 20px;"><i class="fas fa-exclamation-triangle"></i></div>
                    <h1>عذراً! حدث خطأ</h1>
                    <p style="color: #6c757d;">${error.message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()"><i class="fas fa-redo"></i> إعادة المحاولة</button>
                </div>
            `;
        }
    }

    function showNotification(message, type = 'info', duration = 3000) {
        alert(message);
    }

    // ============================================================
    // 9. معالجة أحداث المتصفح والروابط (مع تجاهل القوائم الفرعية)
    // ============================================================

    function handlePopState() {
        // ✅ استخدام المسار الفعلي من window.location
        const path = window.location.pathname;
        // التأكد من أن المسار مطلق ويبدأ بـ /
        const finalPath = path.startsWith('/') ? path : '/' + path;
        navigateTo(finalPath, true);
    }

    function handleInternalLinks() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            
            // تجاهل الروابط التي تفتح القوائم الفرعية (has-submenu)
            if (link.closest('.has-submenu')) {
                return;
            }

            // تجاهل الروابط الخارجية أو الهاشتاجات أو ملفات الجافاسكريبت والـ CSS
            if (!href || link.target === '_blank' || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || href.endsWith('.css') || href.endsWith('.js')) return;
            
            e.preventDefault();
            navigateTo(href);
        });
    }

    // ============================================================
    // 10. تهيئة التطبيق
    // ============================================================

    function initApp() {
        checkAuthStatus();
        handleInternalLinks();
        window.addEventListener('popstate', handlePopState);
        console.log('✅ تم تهيئة التطبيق بنجاح');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // ============================================================
    // 11. تصدير الدوال
    // ============================================================

    window.TeraApp = {
        navigateTo, loadPage, resolvePath, login, logout, checkAuthStatus,
        isLoggedIn: () => AppState.isLoggedIn,
        getCurrentUser: () => AppState.currentUser,
        showLoader, hideLoader, showNotification
    };

})();
