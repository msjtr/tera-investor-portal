/**
 * ============================================================
 * main.js - الملف الرئيسي لإدارة وتنسيق جميع صفحات منصة تيرا
 * ============================================================
 * هذا الملف مسؤول عن:
 * 1. تحميل وتهيئة جميع المكونات المشتركة
 * 2. ربط جميع أحداث الصفحات المختلفة
 * 3. تنفيذ دوال خاصة بكل صفحة حسب المسار الحالي
 * 4. إدارة السلوك العام للموقع (القوائم، الإشعارات، زر العودة، إلخ)
 * 5. إضافة كلاس page-dashboard لتحديد الصفحة الحالية
 * ============================================================
 * يعتمد على: core.js, auth.js, app.js
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. حساب العمق الديناميكي (للمسارات النسبية)
    // ============================================================
    function getBaseDepth() {
        const path = window.location.pathname.toLowerCase();
        
        // تحديد العمق بناءً على الهيكل الدقيق للمشروع
        if (path.includes('/auth/auth/login/')) return 3;
        if (path.includes('/auth/register/')) return 2;
        if (path.includes('/pages/')) return 2;
        if (path.includes('/auth/')) return 2;
        if (path.includes('/assets/')) return 1;
        if (path === '/' || path === '/index.html') return 0;
        
        // حساب عام لعدد المستويات
        const parts = path.split('/').filter(p => p.length > 0);
        return parts.length;
    }

    function resolveRelativePath(targetPath) {
        let cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
        const depth = getBaseDepth();
        const prefix = '../'.repeat(depth);
        return prefix + cleanPath;
    }

    // ============================================================
    // 2. التأكد من تحميل الملفات الأساسية
    // ============================================================
    function ensureCoreLoaded() {
        if (typeof TeraCore === 'undefined') {
            console.warn('⚠️ [Main] core.js غير موجود، يتم تحميله...');
            const script = document.createElement('script');
            script.src = resolveRelativePath('assets/js/core.js');
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
            script.src = resolveRelativePath('assets/js/app.js');
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
            script.src = resolveRelativePath('assets/js/auth.js');
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
    // 5. تهيئة زر العودة إلى لوحة التحكم
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
    // 7. تهيئة زر تسجيل الخروج
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
                        // الطريقة اليدوية
                        localStorage.removeItem('tera_token');
                        localStorage.removeItem('tera_user');
                        window.location.href = resolveRelativePath('auth/auth/login/login.html');
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
    // 10. دوال تهيئة الصفحات حسب النوع (اختياري)
    // ============================================================
    function initDashboardPage() {
        console.log('📊 [Main] تهيئة لوحة التحكم');
        // تحميل سكريبت dashboard.js إن وجد
        const script = document.createElement('script');
        script.src = resolveRelativePath('assets/js/dashboard.js');
        script.async = false;
        document.head.appendChild(script);
    }

    function initInvestmentsPage() {
        console.log('💰 [Main] تهيئة صفحة الاستثمارات');
        const script = document.createElement('script');
        script.src = resolveRelativePath('assets/js/investments.js');
        script.async = false;
        document.head.appendChild(script);
    }

    function initPortfolioPage() {
        console.log('💼 [Main] تهيئة صفحة المحفظة');
        const script = document.createElement('script');
        script.src = resolveRelativePath('assets/js/portfolio.js');
        script.async = false;
        document.head.appendChild(script);
    }

    function initReportsPage() {
        console.log('📊 [Main] تهيئة صفحة التقارير');
        const script = document.createElement('script');
        script.src = resolveRelativePath('assets/js/reports.js');
        script.async = false;
        document.head.appendChild(script);
    }

    function initProfilePage() {
        console.log('👤 [Main] تهيئة صفحة الملف الشخصي');
        const script = document.createElement('script');
        script.src = resolveRelativePath('assets/js/profile.js');
        script.async = false;
        document.head.appendChild(script);
    }

    function initSecurityPage() {
        console.log('🔐 [Main] تهيئة صفحة الأمان');
        const script = document.createElement('script');
        script.src = resolveRelativePath('assets/js/security.js');
        script.async = false;
        document.head.appendChild(script);
    }

    function initSupportPage() {
        console.log('🆘 [Main] تهيئة صفحة الدعم');
        const script = document.createElement('script');
        script.src = resolveRelativePath('assets/js/support.js');
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
    // 11. التهيئة الرئيسية
    // ============================================================
    function initMain() {
        console.log('🚀 [Main] بدء تهيئة النظام...');

        // 1. التأكد من تحميل الملفات الأساسية
        ensureCoreLoaded();
        ensureAuthLoaded();
        ensureAppLoaded();

        // 2. تهيئة المكونات المشتركة (تعتمد على وجود TeraCore و TeraApp)
        // نستخدم setTimeout للتأكد من تحميل TeraCore و TeraApp
        setTimeout(function() {
            initCommonComponents();

            // 3. تحديد نوع الصفحة الحالية
            const pageType = getCurrentPage();
            console.log('📄 [Main] نوع الصفحة:', pageType);

            // 4. تهيئة الصفحة حسب نوعها
            initPageByType(pageType);

            console.log('✅ [Main] تم الانتهاء من التهيئة الرئيسية');
        }, 150);
    }

    // ============================================================
    // 12. بدء التهيئة
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        // إذا كان DOM قد تم تحميله بالفعل
        initMain();
    }

    // ============================================================
    // 13. تصدير الدوال العامة (للاستخدام في صفحات أخرى)
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
        getBaseDepth: getBaseDepth,
        resolveRelativePath: resolveRelativePath,
        initDashboardPage: initDashboardPage,
        initInvestmentsPage: initInvestmentsPage,
        initPortfolioPage: initPortfolioPage,
        initReportsPage: initReportsPage,
        initProfilePage: initProfilePage,
        initSecurityPage: initSecurityPage,
        initSupportPage: initSupportPage,
        initAuthPage: initAuthPage
    };

    console.log('✅ [Main] تم تحميل المكتبة الرئيسية (TeraMain) بنجاح');

})();
