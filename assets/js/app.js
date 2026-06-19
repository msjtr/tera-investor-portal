/**
 * ============================================================
 * app.js - الملف الرئيسي لتطبيق تيرا للمستثمرين (النسخة النهائية)
 * ============================================================
 * الموقع: /assets/js/app.js
 * 
 * تم تطبيق جميع التحديثات العاجلة:
 * 1. إزالة دالة resolveRelativePath بالكامل.
 * 2. استخدام المسارات المطلقة فقط في ROUTES و resolvePath.
 * 3. إضافة نمط التنظيف (Cleanup Pattern) لمنع تسرب الذاكرة.
 * 4. تحسين التوجيه ومنع التخزين المؤقت.
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. تكوينات التطبيق الأساسية
    // ============================================================

    const APP_CONFIG = {
        name: 'تيرا للمستثمرين',
        version: '1.0.3',
        apiBaseUrl: '/api/v1',
        debug: true,
        authRequired: true,
        loginUrl: '/auth/auth/login/login.html',
        defaultPage: '/pages/dashboard/index.html'
    };

    // ============================================================
    // 2. حالة التطبيق (Application State)
    // ============================================================

    const AppState = {
        currentUser: null,
        currentPage: '',
        isLoggedIn: false,
        isLoading: false,
        notifications: [],
        portfolioData: null,
        _loadingCount: 0,
        _cleanupFunctions: [] // لتخزين دوال التنظيف
    };

    // ============================================================
    // 3. مسارات الصفحات (جميعها مطلقة من الجذر)
    // ============================================================

    const ROUTES = {
        '/': '/pages/dashboard/index.html',
        '/index.html': '/pages/dashboard/index.html',
        '/home': '/pages/dashboard/index.html',
        '/dashboard': '/pages/dashboard/index.html',
        '/dashboard/index.html': '/pages/dashboard/index.html',
        '/investments': '/pages/investments/opportunities.html',
        '/investments/opportunities': '/pages/investments/opportunities.html',
        '/investments/opportunities.html': '/pages/investments/opportunities.html',
        '/investments/active-investments': '/pages/investments/active-investments.html',
        '/investments/active': '/pages/investments/active-investments.html',
        '/investments/completed-investments': '/pages/investments/completed-investments.html',
        '/investments/cancelled-investments': '/pages/investments/cancelled-investments.html',
        '/investments/extended-investments': '/pages/investments/extended-investments.html',
        '/investments/investment-details': '/pages/investments/investment-details.html',
        '/portfolio': '/pages/portfolio/portfolio-overview.html',
        '/portfolio/overview': '/pages/portfolio/portfolio-overview.html',
        '/portfolio/portfolio-overview': '/pages/portfolio/portfolio-overview.html',
        '/portfolio/transactions': '/pages/portfolio/transactions.html',
        '/portfolio/profits': '/pages/portfolio/profits.html',
        '/portfolio/withdraw-request': '/pages/portfolio/withdraw-request.html',
        '/portfolio/withdraw': '/pages/portfolio/withdraw-request.html',
        '/portfolio/withdrawal-history': '/pages/portfolio/withdrawal-history.html',
        '/portfolio/account-statement': '/pages/portfolio/account-statement.html',
        '/reports': '/pages/reports/reports-dashboard.html',
        '/reports/dashboard': '/pages/reports/reports-dashboard.html',
        '/reports/reports-dashboard': '/pages/reports/reports-dashboard.html',
        '/reports/portfolio': '/pages/reports/portfolio-report.html',
        '/reports/portfolio-report': '/pages/reports/portfolio-report.html',
        '/reports/investments': '/pages/reports/investments-report.html',
        '/reports/investments-report': '/pages/reports/investments-report.html',
        '/reports/profits': '/pages/reports/profits-report.html',
        '/reports/profits-report': '/pages/reports/profits-report.html',
        '/reports/withdrawals': '/pages/reports/withdrawals-report.html',
        '/reports/withdrawals-report': '/pages/reports/withdrawals-report.html',
        '/profile': '/pages/profile/personal-information.html',
        '/profile/personal': '/pages/profile/personal-information.html',
        '/profile/personal-information': '/pages/profile/personal-information.html',
        '/profile/contact': '/pages/profile/contact-information.html',
        '/profile/contact-information': '/pages/profile/contact-information.html',
        '/profile/address': '/pages/profile/national-address.html',
        '/profile/national-address': '/pages/profile/national-address.html',
        '/profile/bank': '/pages/profile/bank-information.html',
        '/profile/bank-information': '/pages/profile/bank-information.html',
        '/profile/attachments': '/pages/profile/attachments.html',
        '/security': '/pages/security/change-password.html',
        '/security/password': '/pages/security/change-password.html',
        '/security/change-password': '/pages/security/change-password.html',
        '/security/email': '/pages/security/change-email.html',
        '/security/change-email': '/pages/security/change-email.html',
        '/security/mobile': '/pages/security/change-mobile.html',
        '/security/change-mobile': '/pages/security/change-mobile.html',
        '/security/2fa': '/pages/security/two-factor-authentication.html',
        '/security/two-factor-authentication': '/pages/security/two-factor-authentication.html',
        '/security/devices': '/pages/security/registered-devices.html',
        '/security/registered-devices': '/pages/security/registered-devices.html',
        '/security/login-history': '/pages/security/login-history.html',
        '/support': '/pages/support/help-center.html',
        '/support/help': '/pages/support/help-center.html',
        '/support/help-center': '/pages/support/help-center.html',
        '/support/faq': '/pages/support/faq.html',
        '/support/tickets': '/pages/support/tickets.html',
        '/support/notifications': '/pages/support/notifications.html',
        '/support/privacy': '/pages/support/privacy-policy.html',
        '/support/privacy-policy': '/pages/support/privacy-policy.html',
        '/support/terms': '/pages/support/terms-and-conditions.html',
        '/support/terms-and-conditions': '/pages/support/terms-and-conditions.html',
        '/auth/login': '/auth/auth/login/login.html',
        '/auth/register': '/auth/register/register.html',
        '/auth/forgot-password': '/auth/forgot-password.html',
        '/auth/reset-password': '/auth/reset-password.html',
        '/auth/verify-otp': '/auth/verify-otp.html',
        '/auth/complete-profile': '/auth/complete-profile.html'
    };

    // ============================================================
    // 4. الصفحات العامة (لا تحتاج تسجيل دخول)
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
        return PUBLIC_PAGES.some(function(publicPath) {
            return path.startsWith(publicPath);
        });
    }

    // ============================================================
    // 5. دالة تحويل المسارات (بدون resolveRelativePath)
    // ============================================================

    function resolvePath(path) {
        if (!path || path.startsWith('#') || path.startsWith('javascript:')) {
            return path;
        }

        let cleanPath = path;

        if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
            try {
                const url = new URL(cleanPath);
                cleanPath = url.pathname;
            } catch (e) {
                return path;
            }
        }

        const baseFolder = '/tera-investor-portal-main';
        if (cleanPath.includes(baseFolder)) {
            cleanPath = cleanPath.replace(baseFolder, '');
        }

        while (cleanPath.startsWith('../')) {
            cleanPath = cleanPath.slice(3);
        }

        if (!cleanPath.startsWith('/')) {
            cleanPath = '/' + cleanPath;
        }

        if (ROUTES[cleanPath]) {
            return ROUTES[cleanPath];
        }

        if (cleanPath.endsWith('.html')) {
            const fileName = cleanPath.substring(cleanPath.lastIndexOf('/'));
            for (let key in ROUTES) {
                if (ROUTES[key].endsWith(fileName)) {
                    return ROUTES[key];
                }
            }
        }

        for (let key in ROUTES) {
            if (key === cleanPath || key.startsWith(cleanPath + '/') || key.startsWith(cleanPath)) {
                return ROUTES[key];
            }
        }

        console.warn('⚠️ [App] المسار غير معروف في ROUTES:', cleanPath);
        return cleanPath;
    }

    // ============================================================
    // 6. دوال التحقق من الجلسة والمستخدم
    // ============================================================

    function checkAuthStatus() {
        const token = localStorage.getItem('tera_token');
        const userData = localStorage.getItem('tera_user');

        if (token && userData) {
            try {
                AppState.currentUser = JSON.parse(userData);
                AppState.isLoggedIn = true;
                return true;
            } catch (e) {
                console.warn('⚠️ [App] خطأ في قراءة بيانات المستخدم:', e);
                localStorage.removeItem('tera_user');
                return false;
            }
        }
        return false;
    }

    function login(credentials) {
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                if (credentials.email && credentials.password) {
                    const userData = {
                        id: 1,
                        name: 'أحمد محمد',
                        email: credentials.email,
                        role: 'investor',
                        verified: true,
                        loginTime: new Date().toISOString()
                    };
                    localStorage.setItem('tera_token', 'mock_token_' + Date.now());
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
        localStorage.removeItem('tera_remember');
        localStorage.removeItem('tera_identifier');
        AppState.currentUser = null;
        AppState.isLoggedIn = false;
        window.location.href = '/auth/auth/login/login.html';
    }

    // ============================================================
    // 7. نظام التوجيه (Router)
    // ============================================================

    function navigateTo(path, replace) {
        replace = replace || false;
        const targetPath = resolvePath(path);

        if (APP_CONFIG.authRequired && !isPublicPage(targetPath) && !AppState.isLoggedIn) {
            console.warn('🔒 [App] يتطلب تسجيل الدخول، التوجيه إلى صفحة تسجيل الدخول');
            window.location.href = '/auth/auth/login/login.html';
            return;
        }

        // إضافة timestamp لتجاوز الكاش
        const urlWithTimestamp = targetPath + (targetPath.includes('?') ? '&' : '?') + 't=' + Date.now();

        if (replace) {
            window.history.replaceState({ path: targetPath }, '', urlWithTimestamp);
        } else {
            window.history.pushState({ path: targetPath }, '', urlWithTimestamp);
        }

        loadPage(targetPath);
    }

    // ============================================================
    // 8. تحميل الصفحات مع تنظيف الذاكرة (Fetch + Cleanup)
    // ============================================================

    function cleanup() {
        console.log('🧹 [App] بدء تنظيف الذاكرة...');

        // تنفيذ جميع دوال التنظيف المسجلة
        AppState._cleanupFunctions.forEach(function(cleanupFn) {
            try {
                cleanupFn();
            } catch (e) {
                console.warn('⚠️ [App] خطأ في دالة التنظيف:', e);
            }
        });
        AppState._cleanupFunctions = [];

        // إزالة جميع مستمعات الأحداث المرتبطة بـ document (يمكن تحسينها)
        // لكننا نعتمد على تسجيل دوال التنظيف بدلاً من الإزالة العامة.

        console.log('✅ [App] تم تنظيف الذاكرة');
    }

    function loadPage(url) {
        if (AppState.currentPage === url && AppState._loadingCount > 0) {
            console.log('⏳ [App] الصفحة قيد التحميل بالفعل:', url);
            return;
        }

        // تنظيف الذاكرة قبل تحميل الصفحة الجديدة
        cleanup();

        AppState._loadingCount++;
        AppState.currentPage = url;
        AppState.isLoading = true;
        showLoader();

        console.log('📄 [App] جاري تحميل الصفحة:', url);

        fetch(url + '?t=' + Date.now())
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                return response.text();
            })
            .then(function(html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                if (!doc) {
                    throw new Error('فشل في تحليل محتوى الصفحة');
                }

                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    const newContent = doc.querySelector('.main-content');
                    if (newContent) {
                        mainContent.innerHTML = newContent.innerHTML;
                    } else {
                        const bodyContent = doc.body;
                        if (bodyContent) {
                            mainContent.innerHTML = bodyContent.innerHTML;
                        } else {
                            mainContent.innerHTML = doc.documentElement.innerHTML;
                        }
                    }

                    reinitializeScripts(doc);
                } else {
                    document.documentElement.innerHTML = html;
                }

                const title = doc.querySelector('title');
                if (title) {
                    document.title = title.textContent;
                }

                console.log('✅ [App] تم تحميل الصفحة بنجاح:', url);
            })
            .catch(function(error) {
                console.error('❌ [App] خطأ في تحميل الصفحة:', error);
                showErrorPage(error);
            })
            .finally(function() {
                AppState._loadingCount--;
                AppState.isLoading = false;
                hideLoader();
            });
    }

    // ============================================================
    // 9. إعادة تهيئة السكريبتات مع تسجيل دوال التنظيف
    // ============================================================

    function reinitializeScripts(doc) {
        if (!doc) {
            console.warn('⚠️ [App] لا يوجد مستند لإعادة تهيئة السكريبتات');
            return;
        }

        // العثور على جميع السكريبتات في الصفحة الجديدة
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(function(script) {
            if (script.src) {
                const existingScript = document.querySelector('script[src="' + script.src + '"]');
                if (!existingScript) {
                    const newScript = document.createElement('script');
                    newScript.src = script.src;
                    newScript.async = false;
                    document.body.appendChild(newScript);
                }
            } else if (script.textContent) {
                try {
                    eval(script.textContent);
                } catch (e) {
                    console.warn('⚠️ [App] خطأ في تنفيذ سكريبت مضمن:', e);
                }
            }
        });

        // إعادة تهيئة TeraCore إذا كانت موجودة
        if (window.TeraCore && typeof window.TeraCore.initCore === 'function') {
            try {
                window.TeraCore.initCore();
            } catch (e) {
                console.warn('⚠️ [App] خطأ في تهيئة TeraCore:', e);
            }
        }

        // إعادة تهيئة دوال الصفحات الفرعية مع تسجيل دوال التنظيف
        const pageFunctions = [
            'initDashboard',
            'initInvestments',
            'initPortfolio',
            'initReports',
            'initProfile',
            'initSecurity',
            'initSupport'
        ];
        pageFunctions.forEach(function(fnName) {
            if (typeof window[fnName] === 'function') {
                try {
                    window[fnName]();
                } catch (e) {
                    console.warn('⚠️ [App] خطأ في تنفيذ ' + fnName + ':', e);
                }
            }
        });
    }

    // ============================================================
    // 10. واجهة المستخدم (Loader & Notifications)
    // ============================================================

    function showLoader() {
        let loader = document.getElementById('app-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'app-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.85);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(4px);
                transition: opacity 0.3s ease;
                font-family: 'Tajawal', sans-serif;
            `;
            loader.innerHTML = `
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 6px solid var(--gray-200, #e9ecef);
                    border-top-color: var(--primary-color, #0D6EFD);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                "></div>
                <p style="margin-top: 20px; color: var(--gray-600, #6c757d); font-weight: 500;">
                    جاري التحميل...
                </p>
                <style>
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    function hideLoader() {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    function showErrorPage(error) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 80px 20px;
                    min-height: 60vh;
                    text-align: center;
                ">
                    <div style="
                        font-size: 72px;
                        color: var(--danger-color, #DC3545);
                        margin-bottom: 20px;
                    ">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h1 style="font-weight: 700; margin-bottom: 10px;">عذراً! حدث خطأ</h1>
                    <p style="color: var(--gray-600, #6c757d); max-width: 500px; margin: 0 auto 25px;">
                        ${error.message || 'حدث خطأ غير متوقع أثناء تحميل الصفحة'}
                    </p>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            <i class="fas fa-redo"></i> إعادة المحاولة
                        </button>
                        <a href="/pages/dashboard" class="btn" style="background: var(--gray-200, #e9ecef); text-decoration: none; padding: 10px 20px; border-radius: 8px; display: inline-block; margin-top: 10px;">
                            <i class="fas fa-home"></i> العودة للرئيسية
                        </a>
                    </div>
                </div>
            `;
        }
    }

    function showNotification(message, type, duration) {
        type = type || 'info';
        duration = duration || 5000;

        const existing = document.querySelector('.custom-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.innerHTML = `
            <div class="toast-content ${type}">
                <span>${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;
        document.body.appendChild(toast);

        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                .custom-toast {
                    position: fixed;
                    bottom: 30px;
                    left: 30px;
                    z-index: 99999;
                    direction: rtl;
                    animation: slideUp 0.4s ease;
                }
                .toast-content {
                    background: #fff;
                    padding: 14px 24px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.12);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border-right: 4px solid #028090;
                    color: #1e293b;
                    font-weight: 500;
                    min-width: 200px;
                }
                .toast-content.info { border-right-color: #0D6EFD; }
                .toast-content.success { border-right-color: #10b981; }
                .toast-content.error { border-right-color: #ef4444; }
                .toast-content .toast-close {
                    background: none;
                    border: none;
                    font-size: 22px;
                    cursor: pointer;
                    color: #94a3b8;
                    padding: 0 4px;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (prefers-color-scheme: dark) {
                    .toast-content {
                        background: #1e293b;
                        color: #f8f9fa;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        toast.querySelector('.toast-close').addEventListener('click', function() {
            toast.remove();
        });

        setTimeout(function() {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(function() {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    // ============================================================
    // 11. دوال API
    // ============================================================

    function apiRequest(endpoint, options) {
        options = options || {};
        const url = APP_CONFIG.apiBaseUrl + endpoint;

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const token = localStorage.getItem('tera_token');
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        const config = {
            method: options.method || 'GET',
            headers: headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        };

        return fetch(url, config)
            .then(function(response) {
                if (!response.ok) {
                    return response.json().then(function(data) {
                        throw new Error(data.message || 'خطأ في الطلب');
                    });
                }
                return response.json();
            })
            .catch(function(error) {
                console.error('❌ [App] خطأ في API:', error);
                throw error;
            });
    }

    // ============================================================
    // 12. دوال تهيئة الصفحات الفرعية (لتسجيل دوال التنظيف)
    // ============================================================

    function initDashboard() {
        console.log('📊 [App] تهيئة لوحة التحكم');
        // يمكن إضافة منطق خاص بلوحة التحكم
    }

    function initInvestments() {
        console.log('💰 [App] تهيئة صفحة الاستثمارات');
    }

    function initPortfolio() {
        console.log('💼 [App] تهيئة صفحة المحفظة');
    }

    function initReports() {
        console.log('📊 [App] تهيئة صفحة التقارير');
    }

    function initProfile() {
        console.log('👤 [App] تهيئة صفحة الملف الشخصي');
    }

    function initSecurity() {
        console.log('🔐 [App] تهيئة صفحة الأمان');
    }

    function initSupport() {
        console.log('🆘 [App] تهيئة صفحة الدعم');
    }

    // ============================================================
    // 13. معالجة أحداث المتصفح
    // ============================================================

    function handlePopState() {
        const path = window.location.pathname;
        navigateTo(path, true);
    }

    function handleInternalLinks() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            if (link.target === '_blank') return;
            if (href.startsWith('http://') || href.startsWith('https://')) {
                return;
            }
            if (href.startsWith('#')) return;
            if (href.startsWith('javascript:')) return;
            if (href.endsWith('.css') || href.endsWith('.js') || href.endsWith('.json')) return;
            if (href.includes('?') && !href.includes('.html')) return;
            if (link.closest('.has-submenu')) {
                return;
            }

            e.preventDefault();
            navigateTo(href);
        });
    }

    // ============================================================
    // 14. تهيئة التطبيق
    // ============================================================

    function initApp() {
        console.log('🚀 [App] بدء تشغيل تطبيق تيرا للمستثمرين v' + APP_CONFIG.version);

        checkAuthStatus();
        console.log('🔐 [App] حالة تسجيل الدخول:', AppState.isLoggedIn ? 'مُسجل' : 'غير مُسجل');

        handleInternalLinks();
        window.addEventListener('popstate', handlePopState);

        const currentPath = window.location.pathname;
        const targetPage = resolvePath(currentPath);

        if (targetPage !== currentPath && !currentPath.includes('.html')) {
            navigateTo(currentPath);
        } else {
            loadPage(targetPage);
        }

        console.log('✅ [App] تم تهيئة التطبيق بنجاح');
        console.log('📌 [App] يمكنك التنقل بين الصفحات باستخدام الروابط الداخلية');

        if (AppState.isLoggedIn && AppState.currentUser) {
            setTimeout(function() {
                showNotification('مرحباً ' + AppState.currentUser.name + '! 👋', 'success', 3000);
            }, 1000);
        }
    }

    // ============================================================
    // 15. بدء التطبيق
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // ============================================================
    // 16. تصدير الدوال العامة
    // ============================================================

    window.TeraApp = {
        navigateTo: navigateTo,
        loadPage: loadPage,
        resolvePath: resolvePath,
        login: login,
        logout: logout,
        checkAuthStatus: checkAuthStatus,
        isLoggedIn: function() { return AppState.isLoggedIn; },
        getCurrentUser: function() { return AppState.currentUser; },
        showNotification: showNotification,
        showLoader: showLoader,
        hideLoader: hideLoader,
        apiRequest: apiRequest,
        getState: function() { return AppState; },
        cleanup: cleanup,
        registerCleanup: function(fn) {
            AppState._cleanupFunctions.push(fn);
        },
        initDashboard: initDashboard,
        initInvestments: initInvestments,
        initPortfolio: initPortfolio,
        initReports: initReports,
        initProfile: initProfile,
        initSecurity: initSecurity,
        initSupport: initSupport
    };

    console.log('✅ [App] app.js: تم تحميل تطبيق تيرا للمستثمرين بنجاح');
    console.log('📚 [App] استخدم TeraApp للوصول إلى دوال التطبيق');

})();
