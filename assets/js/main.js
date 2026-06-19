/**
 * ============================================================
 * main.js - الملف الرئيسي لإدارة وتنسيق جميع صفحات منصة تيرا
 * ============================================================
 * هذا الملف مسؤول عن:
 * 1. تحميل وتهيئة جميع المكونات المشتركة (باستخدام مسارات مطلقة)
 * 2. ربط جميع أحداث الصفحات المختلفة
 * 3. تنفيذ دوال خاصة بكل صفحة حسب المسار الحالي
 * 4. إدارة السلوك العام للموقع (القوائم، الإشعارات، زر العودة، إلخ)
 * 5. إضافة كلاس page-dashboard لتحديد الصفحة الحالية
 * ============================================================
 * تم التحديث لاستخدام المسارات المطلقة (بدون ../) لتجنب أخطاء 404
 * والتوافق مع نظام التوجيه الجديد في app.js
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. دوال مساعدة للمسارات (مطلقة من الجذر)
    // ============================================================

    /**
     * تحويل أي مسار إلى مسار مطلق من جذر السيرفر
     * هذه الدالة تحل محل resolveRelativePath القديمة
     */
    function resolveAbsolutePath(path) {
        // إذا كان المسار فارغاً أو يبدأ بـ # أو javascript:، نرجعه كما هو
        if (!path || path.startsWith('#') || path.startsWith('javascript:')) {
            return path;
        }

        let cleanPath = path;
        
        // إذا كان المسار يبدأ بـ http، نأخذ المسار فقط
        if (cleanPath.startsWith('http')) {
            try {
                cleanPath = new URL(cleanPath).pathname;
            } catch (e) {
                // إذا فشل التحليل، نترك المسار كما هو
                return cleanPath;
            }
        }

        // إذا كان المسار يحتوي على مجلد المشروع الرئيسي، نزيله
        if (cleanPath.includes('tera-investor-portal-main')) {
            cleanPath = cleanPath.replace('/tera-investor-portal-main', '');
        }

        // التأكد من أن المسار يبدأ بـ /
        if (!cleanPath.startsWith('/')) {
            cleanPath = '/' + cleanPath;
        }

        return cleanPath;
    }

    // ============================================================
    // 2. التأكد من تحميل الملفات الأساسية (باستخدام مسارات مطلقة)
    // ============================================================
    function ensureCoreLoaded() {
        if (typeof TeraCore === 'undefined') {
            console.warn('⚠️ [Main] core.js غير موجود، يتم تحميله...');
            const script = document.createElement('script');
            script.src = '/assets/js/core.js';
            script.async = false;
            document.head.appendChild(script);
            return false;
        }
        return true;
    }

    function ensureAppLoaded() {
        if (typeof TeraApp === 'undefined') {
            console.warn('⚠️ [Main] app.js غير موجود، يتم تحميله...');
            const script = document.createElement('script');
            script.src = '/assets/js/app.js';
            script.async = false;
            document.head.appendChild(script);
            return false;
        }
        return true;
    }

    function ensureAuthLoaded() {
        if (typeof TeraAuth === 'undefined') {
            console.warn('⚠️ [Main] auth.js غير موجود، يتم تحميله...');
            const script = document.createElement('script');
            script.src = '/assets/js/auth.js';
            script.async = false;
            document.head.appendChild(script);
            return false;
        }
        return true;
    }

    // ============================================================
    // 3. تحديد نوع الصفحة الحالية
    // ============================================================
    function getCurrentPage() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('investments')) return 'investments';
        if (path.includes('portfolio')) return 'portfolio';
        if (path.includes('reports')) return 'reports';
        if (path.includes('profile')) return 'profile';
        if (path.includes('security')) return 'security';
        if (path.includes('support')) return 'support';
        if (path.includes('auth')) return 'auth';
        return 'dashboard';
    }

    // ============================================================
    // 4. تهيئة القائمة الجانبية (Sidebar)
    // ============================================================
    function initSidebar() {
        // 4.1 زر تبديل القائمة (للشاشات الصغيرة)
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('sidebar-open');
                }
            });
        }

        // 4.2 القوائم الفرعية (فتح/إغلاق)
        document.querySelectorAll('.has-submenu > a').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                // منع انتشار الحدث لأعلى لمنع تداخل مع app.js
                e.stopImmediatePropagation();
                const parent = this.parentElement;
                if (parent) {
                    parent.classList.toggle('submenu-open');
                }
            });
        });

        // 4.3 إغلاق القائمة عند النقر خارجها (للشاشات الصغيرة)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 991) {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('sidebarToggle');
                if (sidebar && toggleBtn) {
                    const isClickInsideSidebar = sidebar.contains(e.target);
                    const isClickOnToggle = toggleBtn.contains(e.target);
                    if (!isClickInsideSidebar && !isClickOnToggle) {
                        sidebar.classList.remove('sidebar-open');
                    }
                }
            }
        });

        // 4.4 إغلاق القائمة عند تغيير حجم النافذة إلى حجم كبير
        window.addEventListener('resize', function() {
            if (window.innerWidth > 991) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.remove('sidebar-open');
                }
            }
        });

        console.log('✅ [Main] تم تهيئة القائمة الجانبية');
    }

    // ============================================================
    // 5. تهيئة زر العودة إلى لوحة التحكم وتحديث عنوان الصفحة
    // ============================================================
    function initBackToDashboard() {
        // تحديد ما إذا كانت الصفحة الحالية هي لوحة التحكم
        const currentPath = window.location.pathname;
        const isDashboard = currentPath.includes('/dashboard/') ||
                            currentPath.endsWith('dashboard/index.html') ||
                            currentPath === '/pages/dashboard/index.html' ||
                            currentPath === '/dashboard';

        // إضافة/إزالة كلاس page-dashboard من الـ body
        if (isDashboard) {
            document.body.classList.add('page-dashboard');
        } else {
            document.body.classList.remove('page-dashboard');
        }

        // تحديث عنوان الصفحة من الـ <title>
        const pageTitleEl = document.getElementById('pageTitle');
        if (pageTitleEl) {
            const titleTag = document.querySelector('title');
            if (titleTag) {
                const parts = titleTag.textContent.split('|');
                pageTitleEl.textContent = parts[0].trim();
            }
        }

        console.log('✅ [Main] تم تهيئة زر العودة (page-dashboard:', isDashboard, ')');
    }

    // ============================================================
    // 6. تهيئة الإشعارات (مثال)
    // ============================================================
    function initNotifications() {
        const notifIcon = document.querySelector('.notifications');
        if (notifIcon) {
            notifIcon.addEventListener('click', function() {
                if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                    TeraApp.showNotification('📬 لديك 3 إشعارات جديدة', 'info', 4000);
                } else {
                    alert('📬 لديك 3 إشعارات جديدة');
                }
            });
        }
    }

    // ============================================================
    // 7. تهيئة زر تسجيل الخروج (باستخدام مسار مطلق)
    // ============================================================
    function initLogout() {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const confirmLogout = confirm('🔒 هل أنت متأكد من رغبتك في تسجيل الخروج؟');
                if (confirmLogout) {
                    if (typeof TeraAuth !== 'undefined' && TeraAuth.logout) {
                        TeraAuth.logout();
                    } else {
                        // الطريقة اليدوية باستخدام مسار مطلق
                        localStorage.removeItem('tera_token');
                        localStorage.removeItem('tera_user');
                        window.location.href = '/auth/auth/login/login.html';
                    }
                }
            });
        }
    }

    // ============================================================
    // 8. تهيئة الروابط الداخلية (لتجنب تعارض مع app.js)
    // ============================================================
    function initInternalLinks() {
        document.querySelectorAll('a[href]').forEach(function(link) {
            // تجاهل الروابط التي تفتح القوائم الفرعية
            if (link.closest('.has-submenu')) return;
            if (link.target === '_blank') return;
            if (link.getAttribute('href').startsWith('http://') || 
                link.getAttribute('href').startsWith('https://')) return;
            if (link.getAttribute('href').startsWith('#')) return;
            if (link.getAttribute('href').startsWith('javascript:')) return;
            if (link.getAttribute('href').endsWith('.css')) return;
            if (link.getAttribute('href').endsWith('.js')) return;
            
            // إذا كانت الصفحة داخل نفس الموقع، استخدم TeraApp للتنقل (إن وجد)
            link.addEventListener('click', function(e) {
                if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
                    e.preventDefault();
                    const href = this.getAttribute('href');
                    TeraApp.navigateTo(href);
                }
                // وإلا سيتم التعامل بشكل طبيعي
            });
        });
    }

    // ============================================================
    // 9. تهيئة المكونات المشتركة
    // ============================================================
    function initCommonComponents() {
        initSidebar();
        initBackToDashboard();
        initNotifications();
        initLogout();
        initInternalLinks();
        console.log('✅ [Main] تم تهيئة جميع المكونات المشتركة');
    }

    // ============================================================
    // 10. دوال تهيئة الصفحات حسب النوع (باستخدام مسارات مطلقة)
    // ============================================================
    function initDashboardPage() {
        console.log('📊 [Main] تهيئة لوحة التحكم');
        // تحميل سكريبت dashboard.js إن وجد
        const script = document.createElement('script');
        script.src = '/assets/js/dashboard.js';
        script.async = false;
        document.head.appendChild(script);
    }

    function initInvestmentsPage() {
        console.log('💰 [Main] تهيئة صفحة الاستثمارات');
        const script = document.createElement('script');
        script.src = '/assets/js/investments.js';
        script.async = false;
        document.head.appendChild(script);
    }

    function initPortfolioPage() {
        console.log('💼 [Main] تهيئة صفحة المحفظة');
        const script = document.createElement('script');
        script.src = '/assets/js/portfolio.js';
        script.async = false;
        document.head.appendChild(script);
    }

    function initReportsPage() {
        console.log('📊 [Main] تهيئة صفحة التقارير');
        const script = document.createElement('script');
        script.src = '/assets/js/reports.js';
        script.async = false;
        document.head.appendChild(script);
    }

    function initProfilePage() {
        console.log('👤 [Main] تهيئة صفحة الملف الشخصي');
        const script = document.createElement('script');
        script.src = '/assets/js/profile.js';
        script.async = false;
        document.head.appendChild(script);
    }

    function initSecurityPage() {
        console.log('🔐 [Main] تهيئة صفحة الأمان');
        const script = document.createElement('script');
        script.src = '/assets/js/security.js';
        script.async = false;
        document.head.appendChild(script);
    }

    function initSupportPage() {
        console.log('🆘 [Main] تهيئة صفحة الدعم');
        const script = document.createElement('script');
        script.src = '/assets/js/support.js';
        script.async = false;
        document.head.appendChild(script);
    }

    function initAuthPage() {
        console.log('🔑 [Main] تهيئة صفحة المصادقة');
        // لا حاجة لتحميل سكريبت إضافي، يتم التعامل معها بواسطة auth.js
    }

    function initPageByType(pageType) {
        switch (pageType) {
            case 'dashboard': initDashboardPage(); break;
            case 'investments': initInvestmentsPage(); break;
            case 'portfolio': initPortfolioPage(); break;
            case 'reports': initReportsPage(); break;
            case 'profile': initProfilePage(); break;
            case 'security': initSecurityPage(); break;
            case 'support': initSupportPage(); break;
            case 'auth': initAuthPage(); break;
            default:
                console.log('📄 [Main] صفحة غير معروفة، يتم التهيئة العامة فقط');
                break;
        }
    }

    // ============================================================
    // 11. التهيئة الرئيسية (محسّنة)
    // ============================================================
    function initMain() {
        console.log('🚀 [Main] بدء تهيئة النظام...');

        // 1. التأكد من تحميل الملفات الأساسية (باستخدام مسارات مطلقة)
        const coreLoaded = ensureCoreLoaded();
        const authLoaded = ensureAuthLoaded();
        const appLoaded = ensureAppLoaded();

        // 2. إذا كانت جميع الملفات محملة مسبقاً، نبدأ التهيئة فوراً
        if (coreLoaded && authLoaded && appLoaded) {
            performInitialization();
        } else {
            // إذا كان هناك ملف لم يتم تحميله، ننتظر تحميله عبر setTimeout
            // نستخدم setInterval للتحقق من التحميل بدلاً من setTimeout الثابت
            let attempts = 0;
            const maxAttempts = 20; // 20 * 100ms = 2 ثانية كحد أقصى
            const checkInterval = setInterval(function() {
                attempts++;
                if (typeof TeraCore !== 'undefined' && 
                    typeof TeraAuth !== 'undefined' && 
                    typeof TeraApp !== 'undefined') {
                    clearInterval(checkInterval);
                    performInitialization();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.warn('⚠️ [Main] لم يتم تحميل جميع المكتبات خلال المهلة، محاولة التهيئة مع المتاح');
                    performInitialization();
                }
            }, 100);
        }

        function performInitialization() {
            // تهيئة المكونات المشتركة
            initCommonComponents();

            // تحديد نوع الصفحة الحالية
            const pageType = getCurrentPage();
            console.log('📄 [Main] نوع الصفحة:', pageType);

            // تهيئة الصفحة حسب نوعها
            initPageByType(pageType);

            console.log('✅ [Main] تم الانتهاء من التهيئة الرئيسية');
        }
    }

    // ============================================================
    // 12. الاستماع لتغيير الصفحة (في حالة SPA)
    // ============================================================
    function handlePageChange() {
        // تحديث زر العودة وعنوان الصفحة عند تغيير الصفحة
        initBackToDashboard();
    }

    // الاستماع لتغيير التاريخ (popstate) في المتصفح
    window.addEventListener('popstate', handlePageChange);

    // ربط دالة التحديث بـ TeraApp ليتم استدعاؤها بعد تحميل الصفحة
    if (typeof window.TeraApp !== 'undefined') {
        // نخزن المرجع الأصلي لـ loadPage إن وجد
        const originalLoadPage = window.TeraApp.loadPage;
        if (originalLoadPage) {
            window.TeraApp.loadPage = function(url) {
                // استدعاء الدالة الأصلية
                originalLoadPage(url);
                // بعد تحميل الصفحة، نقوم بتحديث المكونات
                setTimeout(handlePageChange, 100);
            };
        }
    }

    // ============================================================
    // 13. بدء التهيئة
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        // إذا كان DOM قد تم تحميله بالفعل
        initMain();
    }

    // ============================================================
    // 14. تصدير الدوال العامة (للاستخدام في صفحات أخرى)
    // ============================================================
    window.TeraMain = {
        initMain: initMain,
        initCommonComponents: initCommonComponents,
        initSidebar: initSidebar,
        initBackToDashboard: initBackToDashboard,
        initNotifications: initNotifications,
        initLogout: initLogout,
        initInternalLinks: initInternalLinks,
        getCurrentPage: getCurrentPage,
        // دوال المسارات المحسّنة (مطلقة)
        resolveAbsolutePath: resolveAbsolutePath,
        initDashboardPage: initDashboardPage,
        initInvestmentsPage: initInvestmentsPage,
        initPortfolioPage: initPortfolioPage,
        initReportsPage: initReportsPage,
        initProfilePage: initProfilePage,
        initSecurityPage: initSecurityPage,
        initSupportPage: initSupportPage,
        initAuthPage: initAuthPage,
        // دالة لتحديث المكونات يدوياً (للاستخدام من صفحات أخرى)
        refreshUI: handlePageChange
    };

    console.log('✅ [Main] تم تحميل المكتبة الرئيسية (TeraMain) بنجاح');

})();
