/**
 * ============================================================
 * app.js - الملف الرئيسي لتطبيق تيرا للمستثمرين (نسخة متوافقة مع المسارات النسبية)
 * ============================================================
 * هذا الملف هو المدخل الرئيسي للتطبيق، ويتحكم في:
 * - توجيه الصفحات (Routing) باستخدام مسارات ديناميكية
 * - التحقق من الجلسة والمستخدم
 * - تحميل المكونات المشتركة
 * - إدارة حالة التطبيق
 * - معالجة الأخطاء العامة
 * ============================================================
 * تم التحديث لإصلاح مشكلة تكرار المسارات (مثل /portfolio/portfolio/...)
 * وضمان حساب المسارات النسبية بناءً على الموقع الحالي ديناميكياً
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. دوال مساعدة للمسارات النسبية
    // ============================================================

    /**
     * حساب عدد المستويات (العمق) للوصول إلى الجذر من المسار الحالي
     * @returns {number} عدد المستويات
     */
    function getBaseDepth() {
        const path = window.location.pathname;
        if (path.includes('/pages/')) return 2;
        if (path.includes('/auth/auth/')) return 3;
        if (path.includes('/auth/')) return 2;
        if (path.includes('/assets/')) return 1;
        if (path === '/' || path === '/index.html') return 0;
        const parts = path.split('/').filter(p => p.length > 0);
        return parts.length;
    }

    /**
     * إنشاء مسار نسبي من الجذر إلى المسار المطلوب
     * @param {string} absolutePath - المسار المطلق (يبدأ بـ /)
     * @returns {string} المسار النسبي مع ../ بالعدد المناسب
     */
    function resolveRelativePath(absolutePath) {
        if (!absolutePath.startsWith('/')) {
            absolutePath = '/' + absolutePath;
        }
        // إزالة أي تكرار لـ / في البداية
        let cleanPath = absolutePath;
        while (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.slice(1);
        }
        const depth = getBaseDepth();
        let prefix = '';
        for (let i = 0; i < depth; i++) {
            prefix += '../';
        }
        return prefix + cleanPath;
    }

    /**
     * حل المسار النسبي أو المطلق إلى مسار نسبي صحيح
     * @param {string} path - المسار المدخل (قد يكون نسبيًا أو مطلقًا)
     * @returns {string} المسار النسبي المناسب للصفحة الحالية
     */
    function resolvePath(path) {
        // إذا كان المسار فارغًا أو يبدأ بـ # أو javascript:، نرجعه كما هو
        if (!path || path.startsWith('#') || path.startsWith('javascript:')) {
            return path;
        }

        // إذا كان المسار يبدأ بـ /، نتعامل معه كمسار مطلق
        if (path.startsWith('/')) {
            // نتحقق من جدول ROUTES (المسارات المطلقة)
            if (ROUTES[path]) {
                return resolveRelativePath(ROUTES[path]);
            }
            // إذا كان ينتهي بـ .html، نحوله مباشرة
            if (path.endsWith('.html')) {
                return resolveRelativePath(path);
            }
            // نضيف .html ونجرب
            const withHtml = path + '.html';
            if (ROUTES[withHtml]) {
                return resolveRelativePath(ROUTES[withHtml]);
            }
            // نعيد المسار المطلق مع .html
            return resolveRelativePath(path + '.html');
        } else {
            // مسار نسبي (لا يبدأ بـ /)
            // نستخدم URL لحله بالنسبة للصفحة الحالية
            try {
                const absoluteUrl = new URL(path, window.location.href);
                const absolutePath = absoluteUrl.pathname;
                // إزالة أي مجلد رئيسي (مثل tera-investor-portal-main)
                let cleanPath = absolutePath;
                if (cleanPath.includes('tera-investor-portal-main')) {
                    cleanPath = cleanPath.replace('/tera-investor-portal-main', '');
                }
                // التحقق من ROUTES
                if (ROUTES[cleanPath]) {
                    return resolveRelativePath(ROUTES[cleanPath]);
                }
                // إذا كان المسار الناتج يحتوي على تكرار (مثل /portfolio/portfolio/)، نحاول تصحيحه
                const parts = cleanPath.split('/').filter(p => p);
                // البحث عن اسم الملف
                const fileName = parts[parts.length - 1];
                // البحث عن مسار مطابق في ROUTES ينتهي بنفس اسم الملف
                for (let key in ROUTES) {
                    if (key.endsWith('/' + fileName) || key === '/' + fileName) {
                        return resolveRelativePath(ROUTES[key]);
                    }
                }
                // إذا كان المسار ينتهي بـ .html، نستخدمه
                if (cleanPath.endsWith('.html')) {
                    return resolveRelativePath(cleanPath);
                }
                // نضيف .html ونحاول مرة أخرى
                return resolveRelativePath(cleanPath + '.html');
            } catch (e) {
                console.warn('⚠️ فشل في حل المسار:', path, e);
                // إذا فشل، نعيد المسار كما هو
                return path;
            }
        }
    }

    // ============================================================
    // 2. تكوينات التطبيق الأساسية (باستخدام مسارات مطلقة)
    // ============================================================

    const APP_CONFIG = {
        name: 'تيرا للمستثمرين',
        version: '1.0.0',
        apiBaseUrl: '/api/v1',
        debug: true,
        authRequired: true,
        loginUrl: '/auth/auth/login/login.html',      // مسار مطلق
        defaultPage: '/pages/dashboard/index.html'   // مسار مطلق
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
    // 4. مسارات الصفحات (مطلقة، تبدأ بـ /)
    // ============================================================

    const ROUTES = {
        '/': '/pages/dashboard/index.html',
        '/index.html': '/pages/dashboard/index.html',
        '/home': '/pages/dashboard/index.html',
        '/dashboard': '/pages/dashboard/index.html',
        '/dashboard/index.html': '/pages/dashboard/index.html',
        '/investments': '/pages/investments/opportunities.html',
        '/investments/opportunities': '/pages/investments/opportunities.html',
        '/investments/active': '/pages/investments/active-investments.html',
        '/investments/completed': '/pages/investments/completed-investments.html',
        '/investments/cancelled': '/pages/investments/cancelled-investments.html',
        '/investments/extended': '/pages/investments/extended-investments.html',
        '/investments/details': '/pages/investments/investment-details.html',
        '/portfolio': '/pages/portfolio/portfolio-overview.html',
        '/portfolio/overview': '/pages/portfolio/portfolio-overview.html',
        '/portfolio/transactions': '/pages/portfolio/transactions.html',
        '/portfolio/profits': '/pages/portfolio/profits.html',
        '/portfolio/withdraw': '/pages/portfolio/withdraw-request.html',
        '/portfolio/withdrawals': '/pages/portfolio/withdrawal-history.html',
        '/portfolio/statement': '/pages/portfolio/account-statement.html',
        '/reports': '/pages/reports/reports-dashboard.html',
        '/reports/dashboard': '/pages/reports/reports-dashboard.html',
        '/reports/portfolio': '/pages/reports/portfolio-report.html',
        '/reports/investments': '/pages/reports/investments-report.html',
        '/reports/profits': '/pages/reports/profits-report.html',
        '/reports/withdrawals': '/pages/reports/withdrawals-report.html',
        '/profile': '/pages/profile/personal-information.html',
        '/profile/personal': '/pages/profile/personal-information.html',
        '/profile/contact': '/pages/profile/contact-information.html',
        '/profile/address': '/pages/profile/national-address.html',
        '/profile/bank': '/pages/profile/bank-information.html',
        '/profile/attachments': '/pages/profile/attachments.html',
        '/security': '/pages/security/change-password.html',
        '/security/password': '/pages/security/change-password.html',
        '/security/email': '/pages/security/change-email.html',
        '/security/mobile': '/pages/security/change-mobile.html',
        '/security/2fa': '/pages/security/two-factor-authentication.html',
        '/security/devices': '/pages/security/registered-devices.html',
        '/security/login-history': '/pages/security/login-history.html',
        '/support': '/pages/support/help-center.html',
        '/support/help': '/pages/support/help-center.html',
        '/support/faq': '/pages/support/faq.html',
        '/support/tickets': '/pages/support/tickets.html',
        '/support/notifications': '/pages/support/notifications.html',
        '/support/privacy': '/pages/support/privacy-policy.html',
        '/support/terms': '/pages/support/terms-and-conditions.html',
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
        return PUBLIC_PAGES.some(function(publicPath) {
            return path.startsWith(publicPath);
        });
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
                console.warn('⚠️ خطأ في قراءة بيانات المستخدم:', e);
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
                        verified: true
                    };
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
        navigateTo('/auth/login');
    }

    // ============================================================
    // 6. نظام التوجيه (Router)
    // ============================================================

    function navigateTo(path, replace) {
        const targetPath = resolvePath(path);
        // التحقق من المصادقة
        if (APP_CONFIG.authRequired && !isPublicPage(path) && !AppState.isLoggedIn) {
            console.warn('🔒 يتطلب تسجيل الدخول، يتم التوجيه إلى صفحة تسجيل الدخول');
            const loginPath = resolvePath(APP_CONFIG.loginUrl);
            window.location.href = loginPath;
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
    // 7. تحميل الصفحات
    // ============================================================

    function loadPage(url) {
        // منع التحميل المتكرر
        if (AppState.currentPage === url && AppState._loadingCount > 0) {
            console.log('⏳ الصفحة قيد التحميل بالفعل، يتم تجاهل الطلب:', url);
            return;
        }

        AppState._loadingCount++;
        AppState.currentPage = url;
        AppState.isLoading = true;
        showLoader();

        console.log('📄 جاري تحميل الصفحة:', url);

        fetch(url)
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

                console.log('✅ تم تحميل الصفحة بنجاح:', url);
            })
            .catch(function(error) {
                console.error('❌ خطأ في تحميل الصفحة:', error);
                showErrorPage(error);
            })
            .finally(function() {
                AppState._loadingCount--;
                AppState.isLoading = false;
                hideLoader();
            });
    }

    function reinitializeScripts(doc) {
        if (!doc) {
            console.warn('⚠️ لا يوجد مستند لإعادة تهيئة السكريبتات');
            return;
        }

        const scripts = doc.querySelectorAll('script');
        scripts.forEach(function(script) {
            if (script.src) {
                // نحول المسار إلى نسبي إذا كان مطلقاً
                let src = script.src;
                if (src.startsWith('/')) {
                    src = resolveRelativePath(src);
                }
                const existingScript = document.querySelector(`script[src="${src}"]`);
                if (!existingScript) {
                    const newScript = document.createElement('script');
                    newScript.src = src;
                    newScript.async = false;
                    document.body.appendChild(newScript);
                }
            } else if (script.textContent) {
                try {
                    eval(script.textContent);
                } catch (e) {
                    console.warn('⚠️ خطأ في تنفيذ سكريبت مضمن:', e);
                }
            }
        });

        if (window.TeraCore && typeof window.TeraCore.initCore === 'function') {
            try {
                window.TeraCore.initCore();
            } catch (e) {
                console.warn('⚠️ خطأ في تهيئة TeraCore:', e);
            }
        }

        const pageFunctions = [
            'initDashboard', 'initInvestments', 'initPortfolio',
            'initReports', 'initProfile', 'initSecurity', 'initSupport'
        ];
        pageFunctions.forEach(function(fnName) {
            if (typeof window[fnName] === 'function') {
                try {
                    window[fnName]();
                } catch (e) {
                    console.warn(`⚠️ خطأ في تنفيذ ${fnName}:`, e);
                }
            }
        });
    }

    // ============================================================
    // 8. دوال واجهة المستخدم
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
                        <a href="../../index.html" class="btn" style="background: var(--gray-200, #e9ecef);">
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
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 30px;
                z-index: 10000;
                display: flex;
                flex-direction: column-reverse;
                gap: 10px;
                max-width: 400px;
                width: 100%;
                direction: rtl;
            `;
            document.body.appendChild(container);
        }
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: white;
            padding: 15px 20px;
            border-radius: var(--border-radius, 10px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
            border-right: 5px solid var(--primary-color, #0D6EFD);
            animation: slideUp 0.4s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
            color: var(--gray-800, #212529);
        `;
        const colors = {
            success: { border: '#198754', icon: 'fa-check-circle', color: '#0F5132' },
            error: { border: '#DC3545', icon: 'fa-times-circle', color: '#721C24' },
            warning: { border: '#FFC107', icon: 'fa-exclamation-circle', color: '#856404' },
            info: { border: '#0D6EFD', icon: 'fa-info-circle', color: '#084298' }
        };
        const color = colors[type] || colors.info;
        notification.style.borderRightColor = color.border;
        notification.style.color = color.color;
        notification.innerHTML = `
            <i class="fas ${color.icon}" style="font-size: 20px;"></i>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: var(--gray-500, #adb5bd);
                padding: 0 5px;
            ">&times;</button>
        `;
        container.appendChild(notification);
        setTimeout(function() {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(20px)';
                notification.style.transition = 'all 0.3s ease';
                setTimeout(function() {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    // ============================================================
    // 9. معالجة أحداث المتصفح
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
            if (href.startsWith('http://') || href.startsWith('https://')) return;
            if (href.startsWith('#')) return;
            if (href.startsWith('javascript:')) return;
            if (href.endsWith('.css') || href.endsWith('.js') || href.endsWith('.json')) return;
            if (href.includes('?') && !href.includes('.html')) return;
            e.preventDefault();
            navigateTo(href);
        });
    }

    // ============================================================
    // 10. دوال API
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
                console.error('❌ خطأ في API:', error);
                throw error;
            });
    }

    // ============================================================
    // 11. دوال تهيئة الصفحات الفرعية
    // ============================================================

    function initDashboard() { console.log('📊 تهيئة لوحة التحكم'); }
    function initInvestments() { console.log('💰 تهيئة صفحة الاستثمارات'); }
    function initPortfolio() { console.log('💼 تهيئة صفحة المحفظة'); }
    function initReports() { console.log('📊 تهيئة صفحة التقارير'); }
    function initProfile() { console.log('👤 تهيئة صفحة الملف الشخصي'); }
    function initSecurity() { console.log('🔐 تهيئة صفحة الأمان'); }
    function initSupport() { console.log('🆘 تهيئة صفحة الدعم'); }

    // ============================================================
    // 12. تهيئة التطبيق
    // ============================================================

    function initApp() {
        console.log('🚀 بدء تشغيل تطبيق تيرا للمستثمرين v' + APP_CONFIG.version);

        checkAuthStatus();
        console.log('🔐 حالة تسجيل الدخول:', AppState.isLoggedIn ? 'مُسجل' : 'غير مُسجل');

        handleInternalLinks();
        window.addEventListener('popstate', handlePopState);

        const currentPath = window.location.pathname;
        const targetPath = resolvePath(currentPath);
        loadPage(targetPath);

        console.log('✅ تم تهيئة التطبيق بنجاح');
        console.log('📌 يمكنك التنقل بين الصفحات باستخدام الروابط الداخلية');

        if (AppState.isLoggedIn && AppState.currentUser) {
            setTimeout(function() {
                showNotification('مرحباً ' + AppState.currentUser.name + '! 👋', 'success', 3000);
            }, 1000);
        }
    }

    // ============================================================
    // 13. بدء التطبيق
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // ============================================================
    // 14. تصدير الدوال العامة
    // ============================================================

    window.TeraApp = {
        navigateTo: navigateTo,
        loadPage: loadPage,
        resolvePath: resolvePath,
        resolveRelativePath: resolveRelativePath,
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
        initDashboard: initDashboard,
        initInvestments: initInvestments,
        initPortfolio: initPortfolio,
        initReports: initReports,
        initProfile: initProfile,
        initSecurity: initSecurity,
        initSupport: initSupport,
        getBaseDepth: getBaseDepth
    };

    console.log('✅ app.js: تم تحميل تطبيق تيرا للمستثمرين بنجاح (باستخدام مسارات ديناميكية)');
    console.log('📚 استخدم TeraApp للوصول إلى دوال التطبيق');

})();
