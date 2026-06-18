/**
 * ============================================================
 * app.js - الملف الرئيسي لتطبيق تيرا للمستثمرين
 * ============================================================
 * هذا الملف هو المدخل الرئيسي للتطبيق، ويتحكم في:
 * - توجيه الصفحات (Routing)
 * - التحقق من الجلسة والمستخدم
 * - تحميل المكونات المشتركة
 * - إدارة حالة التطبيق
 * - معالجة الأخطاء العامة
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. تكوينات التطبيق الأساسية
    // ============================================================

    const APP_CONFIG = {
        name: 'تيرا للمستثمرين',
        version: '1.0.0',
        apiBaseUrl: '/api/v1',
        debug: true, // يتم تعطيله في الإنتاج
        authRequired: true, // هل يتطلب التطبيق تسجيل الدخول؟
        loginUrl: '/auth/login/login.html',
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
        portfolioData: null
    };

    // ============================================================
    // 3. مسارات الصفحات (Routing Configuration)
    // ============================================================

    const ROUTES = {
        // الصفحة الرئيسية
        '/': APP_CONFIG.defaultPage,
        '/index.html': APP_CONFIG.defaultPage,
        '/home': APP_CONFIG.defaultPage,

        // لوحة التحكم
        '/dashboard': '/pages/dashboard/index.html',
        '/dashboard/index.html': '/pages/dashboard/index.html',

        // الاستثمارات
        '/investments': '/pages/investments/opportunities.html',
        '/investments/opportunities': '/pages/investments/opportunities.html',
        '/investments/active': '/pages/investments/active-investments.html',
        '/investments/completed': '/pages/investments/completed-investments.html',
        '/investments/cancelled': '/pages/investments/cancelled-investments.html',
        '/investments/extended': '/pages/investments/extended-investments.html',
        '/investments/details': '/pages/investments/investment-details.html',

        // المحفظة
        '/portfolio': '/pages/portfolio/portfolio-overview.html',
        '/portfolio/overview': '/pages/portfolio/portfolio-overview.html',
        '/portfolio/transactions': '/pages/portfolio/transactions.html',
        '/portfolio/profits': '/pages/portfolio/profits.html',
        '/portfolio/withdraw': '/pages/portfolio/withdraw-request.html',
        '/portfolio/withdrawals': '/pages/portfolio/withdrawal-history.html',
        '/portfolio/statement': '/pages/portfolio/account-statement.html',

        // التقارير
        '/reports': '/pages/reports/reports-dashboard.html',
        '/reports/dashboard': '/pages/reports/reports-dashboard.html',
        '/reports/portfolio': '/pages/reports/portfolio-report.html',
        '/reports/investments': '/pages/reports/investments-report.html',
        '/reports/profits': '/pages/reports/profits-report.html',
        '/reports/withdrawals': '/pages/reports/withdrawals-report.html',

        // الملف الشخصي
        '/profile': '/pages/profile/personal-information.html',
        '/profile/personal': '/pages/profile/personal-information.html',
        '/profile/contact': '/pages/profile/contact-information.html',
        '/profile/address': '/pages/profile/national-address.html',
        '/profile/bank': '/pages/profile/bank-information.html',
        '/profile/attachments': '/pages/profile/attachments.html',

        // الأمان
        '/security': '/pages/security/change-password.html',
        '/security/password': '/pages/security/change-password.html',
        '/security/email': '/pages/security/change-email.html',
        '/security/mobile': '/pages/security/change-mobile.html',
        '/security/2fa': '/pages/security/two-factor-authentication.html',
        '/security/devices': '/pages/security/registered-devices.html',
        '/security/login-history': '/pages/security/login-history.html',

        // الدعم
        '/support': '/pages/support/help-center.html',
        '/support/help': '/pages/support/help-center.html',
        '/support/faq': '/pages/support/faq.html',
        '/support/tickets': '/pages/support/tickets.html',
        '/support/notifications': '/pages/support/notifications.html',
        '/support/privacy': '/pages/support/privacy-policy.html',
        '/support/terms': '/pages/support/terms-and-conditions.html',

        // المصادقة
        '/auth/login': '/auth/login/login.html',
        '/auth/register': '/auth/register/register.html',
        '/auth/forgot-password': '/auth/forgot-password.html',
        '/auth/reset-password': '/auth/reset-password.html',
        '/auth/verify-otp': '/auth/verify-otp.html',
        '/auth/complete-profile': '/auth/complete-profile.html'
    };

    // ============================================================
    // 4. دوال التحكم في الصفحات (Page Controllers)
    // ============================================================

    /**
     * قائمة بالصفحات التي لا تتطلب تسجيل الدخول
     */
    const PUBLIC_PAGES = [
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/verify-otp',
        '/auth/complete-profile'
    ];

    /**
     * التحقق مما إذا كانت الصفحة عامة (لا تحتاج تسجيل دخول)
     * @param {string} path - مسار الصفحة
     * @returns {boolean}
     */
    function isPublicPage(path) {
        return PUBLIC_PAGES.some(function(publicPath) {
            return path.startsWith(publicPath);
        });
    }

    /**
     * التحقق من حالة تسجيل الدخول (محاكاة)
     * في التطبيق الحقيقي، يتم التحقق من التوكن في localStorage أو cookies
     * @returns {boolean}
     */
    function checkAuthStatus() {
        // محاكاة: التحقق من وجود توكن في localStorage
        const token = localStorage.getItem('tera_auth_token');
        const userData = localStorage.getItem('tera_user_data');

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

    /**
     * تسجيل الدخول (محاكاة)
     * @param {object} credentials - بيانات الدخول
     * @returns {Promise}
     */
    function login(credentials) {
        return new Promise(function(resolve, reject) {
            // محاكاة طلب API
            setTimeout(function() {
                // في الواقع، يتم التحقق من البيانات مع الخادم
                if (credentials.email && credentials.password) {
                    const userData = {
                        id: 1,
                        name: 'أحمد محمد',
                        email: credentials.email,
                        role: 'investor',
                        verified: true
                    };
                    localStorage.setItem('tera_auth_token', 'mock_token_12345');
                    localStorage.setItem('tera_user_data', JSON.stringify(userData));
                    AppState.currentUser = userData;
                    AppState.isLoggedIn = true;
                    resolve(userData);
                } else {
                    reject(new Error('بيانات الدخول غير صحيحة'));
                }
            }, 500);
        });
    }

    /**
     * تسجيل الخروج
     */
    function logout() {
        localStorage.removeItem('tera_auth_token');
        localStorage.removeItem('tera_user_data');
        AppState.currentUser = null;
        AppState.isLoggedIn = false;
        // إعادة التوجيه إلى صفحة تسجيل الدخول
        navigateTo('/auth/login');
    }

    // ============================================================
    // 5. نظام التوجيه (Router)
    // ============================================================

    /**
     * الحصول على المسار الفعلي للصفحة من الرابط
     * @param {string} path - المسار المطلوب
     * @returns {string} - المسار الفعلي
     */
    function resolveRoute(path) {
        // إزالة علامات الاستفهام والمعرفات من الرابط
        const cleanPath = path.split('?')[0].split('#')[0];

        // إزالة أي تكرار للمجلدات
        let normalizedPath = cleanPath;
        if (normalizedPath.includes('tera-investor-portal-main')) {
            normalizedPath = normalizedPath.replace('/tera-investor-portal-main', '');
        }

        // إذا كان المسار ينتهي بـ .html، نستخدمه مباشرة
        if (normalizedPath.endsWith('.html')) {
            // نحتاج إلى إضافة ../ إذا كانت الصفحة داخل مجلدات
            return normalizedPath;
        }

        // البحث في جدول المسارات
        if (ROUTES[normalizedPath]) {
            return ROUTES[normalizedPath];
        }

        // محاولة البحث عن مسار مطابق مع .html في النهاية
        const withHtml = normalizedPath + '.html';
        if (ROUTES[withHtml]) {
            return ROUTES[withHtml];
        }

        // إذا لم يتم العثور على مسار، نعيد الصفحة الافتراضية
        console.warn('⚠️ المسار غير معروف:', normalizedPath);
        return APP_CONFIG.defaultPage;
    }

    /**
     * التنقل إلى صفحة معينة
     * @param {string} path - المسار المطلوب
     * @param {boolean} replace - هل نستبدل التاريخ بدلاً من إضافة إدخال جديد؟
     */
    function navigateTo(path, replace) {
        const targetPath = resolveRoute(path);

        // التحقق من المصادقة
        if (APP_CONFIG.authRequired && !isPublicPage(path) && !AppState.isLoggedIn) {
            console.warn('🔒 يتطلب تسجيل الدخول، يتم التوجيه إلى صفحة تسجيل الدخول');
            window.location.href = APP_CONFIG.loginUrl;
            return;
        }

        // تحديث عنوان URL في المتصفح
        if (replace) {
            window.history.replaceState({ path: targetPath }, '', path);
        } else {
            window.history.pushState({ path: targetPath }, '', path);
        }

        // تحميل الصفحة
        loadPage(targetPath);
    }

    /**
     * تحميل صفحة معينة في الإطار الرئيسي
     * @param {string} url - مسار الصفحة
     */
    function loadPage(url) {
        // إظهار مؤشر التحميل
        showLoader();

        // تحديث الحالة
        AppState.currentPage = url;
        AppState.isLoading = true;

        // استخدام fetch لتحميل المحتوى
        fetch(url)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                return response.text();
            })
            .then(function(html) {
                // تحديث محتوى الصفحة
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    // نحتاج إلى استخراج محتوى الصفحة الجديدة
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    // نسخ المحتوى من الصفحة الجديدة إلى الصفحة الحالية
                    const newContent = doc.querySelector('.main-content');
                    if (newContent) {
                        mainContent.innerHTML = newContent.innerHTML;
                    } else {
                        // إذا لم يتم العثور على .main-content، نستخدم body كاملاً
                        const bodyContent = doc.body;
                        if (bodyContent) {
                            mainContent.innerHTML = bodyContent.innerHTML;
                        }
                    }

                    // إعادة تهيئة السكريبتات في الصفحة الجديدة
                    reinitializeScripts(doc);
                } else {
                    // إذا لم يكن هناك .main-content، نعيد تحميل الصفحة بالكامل
                    document.open();
                    document.write(html);
                    document.close();
                }

                // إخفاء مؤشر التحميل
                hideLoader();
                AppState.isLoading = false;

                // تحديث عنوان الصفحة
                const title = doc.querySelector('title');
                if (title) {
                    document.title = title.textContent;
                }

                console.log('✅ تم تحميل الصفحة:', url);
            })
            .catch(function(error) {
                console.error('❌ خطأ في تحميل الصفحة:', error);
                hideLoader();
                AppState.isLoading = false;

                // عرض صفحة الخطأ
                showErrorPage(error);
            });
    }

    /**
     * إعادة تهيئة السكريبتات في الصفحة الجديدة
     * @param {Document} doc - مستند الصفحة الجديدة
     */
    function reinitializeScripts(doc) {
        // العثور على جميع السكريبتات في الصفحة الجديدة
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(function(script) {
            if (script.src) {
                // تحميل السكريبت الخارجي
                const newScript = document.createElement('script');
                newScript.src = script.src;
                newScript.async = false;
                document.body.appendChild(newScript);
            } else if (script.textContent) {
                // تنفيذ السكريبت المضمن
                try {
                    eval(script.textContent);
                } catch (e) {
                    console.warn('⚠️ خطأ في تنفيذ سكريبت مضمن:', e);
                }
            }
        });

        // إعادة تهيئة TeraCore إذا كانت موجودة
        if (window.TeraCore && typeof window.TeraCore.init === 'function') {
            window.TeraCore.init();
        }

        // إعادة تهيئة أي مكونات أخرى
        if (typeof initDashboard === 'function') {
            initDashboard();
        }
        if (typeof initInvestments === 'function') {
            initInvestments();
        }
        if (typeof initPortfolio === 'function') {
            initPortfolio();
        }
        if (typeof initReports === 'function') {
            initReports();
        }
        if (typeof initProfile === 'function') {
            initProfile();
        }
        if (typeof initSecurity === 'function') {
            initSecurity();
        }
        if (typeof initSupport === 'function') {
            initSupport();
        }
    }

    // ============================================================
    // 6. دوال واجهة المستخدم (UI Helpers)
    // ============================================================

    /**
     * إظهار مؤشر التحميل
     */
    function showLoader() {
        // البحث عن مؤشر تحميل موجود
        let loader = document.getElementById('app-loader');
        if (!loader) {
            // إنشاء مؤشر تحميل
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

    /**
     * إخفاء مؤشر التحميل
     */
    function hideLoader() {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    /**
     * عرض صفحة الخطأ
     * @param {Error} error - كائن الخطأ
     */
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
                        <a href="/" class="btn" style="background: var(--gray-200, #e9ecef);">
                            <i class="fas fa-home"></i> العودة للرئيسية
                        </a>
                    </div>
                </div>
            `;
        }
    }

    /**
     * عرض إشعار للمستخدم
     * @param {string} message - نص الإشعار
     * @param {string} type - نوع الإشعار (success, error, warning, info)
     * @param {number} duration - مدة ظهور الإشعار بالميلي ثانية
     */
    function showNotification(message, type, duration) {
        type = type || 'info';
        duration = duration || 5000;

        // البحث عن حاوية الإشعارات
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

        // إنشاء الإشعار
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

        // ألوان حسب النوع
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

        // إزالة الإشعار بعد المدة المحددة
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

        // إضافة أنميشن
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================================
    // 7. معالجة أحداث المتصفح
    // ============================================================

    /**
     * معالجة تغيير عنوان URL (عند استخدام أزرار الرجوع/التقدم)
     */
    function handlePopState() {
        const path = window.location.pathname;
        navigateTo(path, true);
    }

    /**
     * معالجة النقر على الروابط الداخلية (تحميل الصفحات بدون إعادة تحميل كاملة)
     */
    function handleInternalLinks() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // تجاهل الروابط الخارجية والروابط التي تحتوي على target="_blank"
            if (link.target === '_blank') return;
            if (href.startsWith('http://') || href.startsWith('https://')) {
                // إذا كان الرابط خارجياً، نسمح بالانتقال العادي
                return;
            }
            if (href.startsWith('#')) return; // روابط داخل الصفحة
            if (href.startsWith('javascript:')) return;
            if (href.endsWith('.css') || href.endsWith('.js') || href.endsWith('.json')) return;
            if (href.includes('?') && !href.includes('.html')) {
                // قد يكون رابط API
                return;
            }

            // منع السلوك الافتراضي
            e.preventDefault();

            // التنقل إلى الصفحة المطلوبة
            navigateTo(href);
        });
    }

    // ============================================================
    // 8. دوال API (للتفاعل مع الخادم)
    // ============================================================

    /**
     * إجراء طلب API
     * @param {string} endpoint - نقطة النهاية
     * @param {object} options - خيارات الطلب
     * @returns {Promise}
     */
    function apiRequest(endpoint, options) {
        options = options || {};
        const url = APP_CONFIG.apiBaseUrl + endpoint;

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // إضافة توكن المصادقة إذا كان موجوداً
        const token = localStorage.getItem('tera_auth_token');
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
    // 9. دوال تهيئة الصفحات الفرعية
    // ============================================================

    /**
     * تهيئة لوحة التحكم (تُستدعى عند تحميل صفحة dashboard)
     */
    function initDashboard() {
        console.log('📊 تهيئة لوحة التحكم');
        // يمكن إضافة منطق خاص بلوحة التحكم هنا
    }

    /**
     * تهيئة صفحة الاستثمارات
     */
    function initInvestments() {
        console.log('💰 تهيئة صفحة الاستثمارات');
    }

    /**
     * تهيئة صفحة المحفظة
     */
    function initPortfolio() {
        console.log('💼 تهيئة صفحة المحفظة');
    }

    /**
     * تهيئة صفحة التقارير
     */
    function initReports() {
        console.log('📊 تهيئة صفحة التقارير');
    }

    /**
     * تهيئة صفحة الملف الشخصي
     */
    function initProfile() {
        console.log('👤 تهيئة صفحة الملف الشخصي');
    }

    /**
     * تهيئة صفحة الأمان
     */
    function initSecurity() {
        console.log('🔐 تهيئة صفحة الأمان');
    }

    /**
     * تهيئة صفحة الدعم
     */
    function initSupport() {
        console.log('🆘 تهيئة صفحة الدعم');
    }

    // ============================================================
    // 10. تهيئة التطبيق (Application Initialization)
    // ============================================================

    /**
     * التهيئة الرئيسية للتطبيق
     */
    function initApp() {
        console.log('🚀 بدء تشغيل تطبيق تيرا للمستثمرين v' + APP_CONFIG.version);

        // التحقق من حالة تسجيل الدخول
        checkAuthStatus();
        console.log('🔐 حالة تسجيل الدخول:', AppState.isLoggedIn ? 'مُسجل' : 'غير مُسجل');

        // معالجة الروابط الداخلية
        handleInternalLinks();

        // معالجة تغيير عنوان URL
        window.addEventListener('popstate', handlePopState);

        // التعامل مع الصفحة الحالية
        const currentPath = window.location.pathname;
        const targetPage = resolveRoute(currentPath);

        // إذا كانت الصفحة مختلفة عن المسار الحالي، نوجه إليها
        if (targetPage !== currentPath && !currentPath.includes('.html')) {
            navigateTo(currentPath);
        } else {
            // تحميل الصفحة الحالية
            loadPage(targetPage);
        }

        // عرض رسالة ترحيبية في وحدة التحكم
        console.log('✅ تم تهيئة التطبيق بنجاح');
        console.log('📌 يمكنك التنقل بين الصفحات باستخدام الروابط الداخلية');

        // (اختياري) عرض إشعار ترحيبي للمستخدم
        if (AppState.isLoggedIn && AppState.currentUser) {
            setTimeout(function() {
                showNotification('مرحباً ' + AppState.currentUser.name + '! 👋', 'success', 3000);
            }, 1000);
        }
    }

    // ============================================================
    // 11. بدء التطبيق
    // ============================================================

    // بدء التطبيق عند تحميل DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // ============================================================
    // 12. تصدير الدوال العامة (للوصول إليها من وحدات التحكم)
    // ============================================================

    window.TeraApp = {
        // التنقل
        navigateTo: navigateTo,
        loadPage: loadPage,
        resolveRoute: resolveRoute,

        // المصادقة
        login: login,
        logout: logout,
        checkAuthStatus: checkAuthStatus,
        isLoggedIn: function() { return AppState.isLoggedIn; },
        getCurrentUser: function() { return AppState.currentUser; },

        // واجهة المستخدم
        showNotification: showNotification,
        showLoader: showLoader,
        hideLoader: hideLoader,

        // API
        apiRequest: apiRequest,

        // الحالة
        getState: function() { return AppState; },

        // دوال التهيئة
        initDashboard: initDashboard,
        initInvestments: initInvestments,
        initPortfolio: initPortfolio,
        initReports: initReports,
        initProfile: initProfile,
        initSecurity: initSecurity,
        initSupport: initSupport
    };

    console.log('✅ app.js: تم تحميل تطبيق تيرا للمستثمرين بنجاح');
    console.log('📚 استخدم TeraApp للوصول إلى دوال التطبيق');

})();
