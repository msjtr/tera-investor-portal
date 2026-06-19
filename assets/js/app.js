/**
 * ============================================================
 * app.js - الملف الرئيسي لتطبيق تيرا للمستثمرين (النسخة النهائية المصلحة)
 * ============================================================
 * تم إضافة:
 * 1. تفويض الأحداث (Event Delegation) للقائمة الجانبية والقوائم الفرعية.
 * 2. تفعيل الرسم البياني (Chart.js) داخل دالة initDashboard.
 * 3. دمج تدمير الرسم البياني مع نظام التنظيف (Cleanup) لمنع تسرب الذاكرة.
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. تكوينات التطبيق الأساسية
    // ============================================================

    const APP_CONFIG = {
        name: 'تيرا للمستثمرين',
        version: '1.0.4',
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
    // 5. دالة تحويل المسارات
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

        const urlWithTimestamp = targetPath + (targetPath.includes('?') ? '&' : '?') + 't=' + Date.now();

        if (replace) {
            window.history.replaceState({ path: targetPath }, '', urlWithTimestamp);
        } else {
            window.history.pushState({ path: targetPath }, '', urlWithTimestamp);
        }

        loadPage(targetPath);
    }

    // ============================================================
    // 8. تحميل الصفحات وتنظيف الذاكرة
    // ============================================================

    function cleanup() {
        console.log('🧹 [App] بدء تنظيف الذاكرة...');
        AppState._cleanupFunctions.forEach(function(cleanupFn) {
            try {
                cleanupFn();
            } catch (e) {
                console.warn('⚠️ [App] خطأ في دالة التنظيف:', e);
            }
        });
        AppState._cleanupFunctions = [];
        console.log('✅ [App] تم تنظيف الذاكرة');
    }

    function loadPage(url) {
        if (AppState.currentPage === url && AppState._loadingCount > 0) {
            return;
        }

        cleanup();

        AppState._loadingCount++;
        AppState.currentPage = url;
        AppState.isLoading = true;
        showLoader();

        fetch(url + '?t=' + Date.now())
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                return response.text();
            })
            .then(function(html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const mainContent = document.querySelector('.main-content');
                
                if (mainContent) {
                    const newContent = doc.querySelector('.main-content');
                    if (newContent) {
                        mainContent.innerHTML = newContent.innerHTML;
                    } else if (doc.body) {
                        mainContent.innerHTML = doc.body.innerHTML;
                    } else {
                        mainContent.innerHTML = doc.documentElement.innerHTML;
                    }
                    reinitializeScripts(doc);
                } else {
                    document.documentElement.innerHTML = html;
                }

                const title = doc.querySelector('title');
                if (title) document.title = title.textContent;

                console.log('✅ [App] تم تحميل الصفحة بنجاح:', url);
            })
            .catch(function(error) {
                showErrorPage(error);
            })
            .finally(function() {
                AppState._loadingCount--;
                AppState.isLoading = false;
                hideLoader();
            });
    }

    // ============================================================
    // 9. إعادة تهيئة السكريبتات 
    // ============================================================

    function reinitializeScripts(doc) {
        if (!doc) return;

        const scripts = doc.querySelectorAll('script');
        scripts.forEach(function(script) {
            if (script.src) {
                if (!document.querySelector('script[src="' + script.src + '"]')) {
                    const newScript = document.createElement('script');
                    newScript.src = script.src;
                    newScript.async = false;
                    document.body.appendChild(newScript);
                }
            } else if (script.textContent) {
                try { eval(script.textContent); } catch (e) { }
            }
        });

        if (window.TeraCore && typeof window.TeraCore.initCore === 'function') {
            try { window.TeraCore.initCore(); } catch (e) { }
        }

        // تشغيل دوال الصفحات الفرعية
        const pageFunctions = [
            'initDashboard', 'initInvestments', 'initPortfolio',
            'initReports', 'initProfile', 'initSecurity', 'initSupport'
        ];
        
        pageFunctions.forEach(function(fnName) {
            if (typeof window[fnName] === 'function') {
                try { window[fnName](); } catch (e) { }
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
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(255, 255, 255, 0.85); display: flex; flex-direction: column;
                align-items: center; justify-content: center; z-index: 9999;
                backdrop-filter: blur(4px); transition: opacity 0.3s ease; font-family: 'Tajawal', sans-serif;
            `;
            loader.innerHTML = `
                <div style="width: 50px; height: 50px; border: 6px solid #e9ecef; border-top-color: #0D6EFD; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p style="margin-top: 20px; color: #6c757d; font-weight: 500;">جاري التحميل...</p>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            `;
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
                    <h1 style="font-weight: 700; margin-bottom: 10px;">عذراً! حدث خطأ</h1>
                    <p style="color: #6c757d; max-width: 500px; margin: 0 auto 25px;">${error.message || 'حدث خطأ غير متوقع'}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()"><i class="fas fa-redo"></i> إعادة المحاولة</button>
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
        toast.innerHTML = `<div class="toast-content ${type}"><span>${message}</span><button class="toast-close">&times;</button></div>`;
        document.body.appendChild(toast);

        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                .custom-toast { position: fixed; bottom: 30px; left: 30px; z-index: 99999; direction: rtl; animation: slideUp 0.4s ease; }
                .toast-content { background: #fff; padding: 14px 24px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); display: flex; align-items: center; gap: 16px; border-right: 4px solid #028090; font-weight: 500; }
                .toast-content.info { border-right-color: #0D6EFD; } .toast-content.success { border-right-color: #10b981; } .toast-content.error { border-right-color: #ef4444; }
                .toast-content .toast-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `;
            document.head.appendChild(style);
        }

        toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
        setTimeout(() => { if (toast.parentElement) { toast.style.opacity = '0'; setTimeout(() => { if(toast.parentElement) toast.remove(); }, 300); } }, duration);
    }

    // ============================================================
    // 11. دوال تهيئة الصفحات الفرعية وتفعيل (القوائم/الرسومات)
    // ============================================================
    
    // --> تفعيل الإحداث الشاملة للقائمة الجانبية (Event Delegation)
    function initGlobalSidebarEvents() {
        if (window._sidebarEventsInitialized) return;
        window._sidebarEventsInitialized = true;

        document.body.addEventListener('click', function(e) {
            // 1. زر فتح/إغلاق القائمة
            const toggleBtn = e.target.closest('#sidebarToggle');
            if (toggleBtn) {
                e.stopPropagation();
                const sidebar = document.getElementById('sidebar');
                if(sidebar) {
                    if (window.innerWidth > 991) {
                        sidebar.classList.toggle('collapsed');
                    } else {
                        sidebar.classList.toggle('sidebar-open');
                    }
                }
            }

            // 2. القوائم الفرعية
            const submenuLink = e.target.closest('.has-submenu > a');
            if (submenuLink) {
                e.preventDefault();
                const parentLi = submenuLink.parentElement;
                const sidebarEl = document.getElementById('sidebar');
                
                if (window.innerWidth > 991 && sidebarEl && sidebarEl.classList.contains('collapsed')) {
                    showNotification('يرجى فتح القائمة الجانبية أولاً لعرض الخيارات', 'info');
                    return;
                }
                
                document.querySelectorAll('.has-submenu').forEach(li => {
                    if (li !== parentLi) li.classList.remove('submenu-open');
                });
                parentLi.classList.toggle('submenu-open');
            }
        });
    }

    // --> تفعيل لوحة التحكم (Chart.js)
    function initDashboard() {
        console.log('📊 [App] تهيئة لوحة التحكم والرسم البياني');
        
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        if (window.myDashboardChart) {
            window.myDashboardChart.destroy();
        }

        if (typeof Chart === 'undefined') {
            console.warn('⚠️ [App] مكتبة Chart.js غير محملة');
            return;
        }

        window.myDashboardChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'نمو المحفظة (ر.س)',
                    data: [100000, 105000, 112000, 110000, 118000, 124500],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } }
            }
        });

        // تسجيل دالة تنظيف (لتدمير الرسم البياني عند الخروج من لوحة التحكم)
        TeraApp.registerCleanup(function() {
            if (window.myDashboardChart) {
                window.myDashboardChart.destroy();
                window.myDashboardChart = null;
                console.log('🧹 [App] تم تدمير الرسم البياني لتحرير الذاكرة');
            }
        });
    }

    function initInvestments() { console.log('💰 [App] تهيئة الاستثمارات'); }
    function initPortfolio() { console.log('💼 [App] تهيئة المحفظة'); }
    function initReports() { console.log('📊 [App] تهيئة التقارير'); }
    function initProfile() { console.log('👤 [App] تهيئة الملف الشخصي'); }
    function initSecurity() { console.log('🔐 [App] تهيئة الأمان'); }
    function initSupport() { console.log('🆘 [App] تهيئة الدعم'); }

    // ============================================================
    // 12. معالجة أحداث المتصفح
    // ============================================================

    function handlePopState() {
        navigateTo(window.location.pathname, true);
    }

    function handleInternalLinks() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href || link.target === '_blank' || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:')) return;
            if (href.endsWith('.css') || href.endsWith('.js') || href.endsWith('.json')) return;
            if (link.closest('.has-submenu')) return;

            e.preventDefault();
            navigateTo(href);
        });
    }

    // ============================================================
    // 13. تهيئة التطبيق (Initialization)
    // ============================================================

    function initApp() {
        console.log('🚀 [App] بدء تشغيل تطبيق تيرا للمستثمرين');
        checkAuthStatus();
        
        initGlobalSidebarEvents(); // تفعيل أحداث القائمة الجانبية هنا مرة واحدة
        
        handleInternalLinks();
        window.addEventListener('popstate', handlePopState);

        const currentPath = window.location.pathname;
        const targetPage = resolvePath(currentPath);

        if (targetPage !== currentPath && !currentPath.includes('.html')) {
            navigateTo(currentPath);
        } else {
            loadPage(targetPage);
        }

        if (AppState.isLoggedIn && AppState.currentUser) {
            setTimeout(() => showNotification('مرحباً ' + AppState.currentUser.name + '! 👋', 'success', 3000), 1000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // ============================================================
    // 14. تصدير الدوال العامة
    // ============================================================

    window.TeraApp = {
        navigateTo, loadPage, resolvePath, login, logout, checkAuthStatus,
        isLoggedIn: () => AppState.isLoggedIn,
        getCurrentUser: () => AppState.currentUser,
        showNotification, showLoader, hideLoader,
        getState: () => AppState,
        cleanup, registerCleanup: (fn) => AppState._cleanupFunctions.push(fn),
        initDashboard, initInvestments, initPortfolio, initReports,
        initProfile, initSecurity, initSupport
    };

})();
