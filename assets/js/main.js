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
 * 6. إدارة القائمة الجانبية المطورة (collapse, toggle, active states)
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
        if (!path || path.startsWith('#') || path.startsWith('javascript:')) {
            return path;
        }

        let cleanPath = path;
        
        if (cleanPath.startsWith('http')) {
            try {
                cleanPath = new URL(cleanPath).pathname;
            } catch (e) {
                return cleanPath;
            }
        }

        if (cleanPath.includes('tera-investor-portal-main')) {
            cleanPath = cleanPath.replace('/tera-investor-portal-main', '');
        }

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
    // 4. تهيئة القائمة الجانبية المطورة (Sidebar)
    // ============================================================
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');

        // 4.1 زر تبديل القائمة (لجميع الشاشات)
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                // في الشاشات الكبيرة نبدل وضع الانهيار، وفي الصغيرة نفتح/نغلق القائمة
                if (window.innerWidth > 991) {
                    sidebar.classList.toggle('collapsed');
                    // حفظ الحالة في localStorage
                    const isCollapsed = sidebar.classList.contains('collapsed');
                    try {
                        localStorage.setItem('sidebarCollapsed', isCollapsed);
                    } catch (e) { /* ignore */ }
                } else {
                    sidebar.classList.toggle('sidebar-open');
                }
            });
        }

        // استعادة حالة الانهيار من localStorage
        if (sidebar && window.innerWidth > 991) {
            try {
                const saved = localStorage.getItem('sidebarCollapsed');
                if (saved === 'true') {
                    sidebar.classList.add('collapsed');
                } else if (saved === 'false') {
                    sidebar.classList.remove('collapsed');
                }
            } catch (e) { /* ignore */ }
        }

        // 4.2 القوائم الفرعية (فتح/إغلاق)
        document.querySelectorAll('.has-submenu > a').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                // منع انتشار الحدث لأعلى لمنع تداخل مع app.js
                e.stopImmediatePropagation();
                const parent = this.parentElement;
                if (!parent) return;

                // في حالة الانهيار على سطح المكتب، لا نفتح القوائم الفرعية (يمكن توجيه المستخدم لفتحها أولاً)
                if (window.innerWidth > 991 && sidebar && sidebar.classList.contains('collapsed')) {
                    // نوسع القائمة مؤقتاً بدلاً من فتح القائمة الفرعية (خيار تحسين)
                    // أو نوجه المستخدم لتوسيع القائمة أولاً
                    showToast('افتح القائمة أولاً لعرض الخيارات', 'info');
                    return;
                }

                parent.classList.toggle('submenu-open');
            });
        });

        // 4.3 إغلاق القائمة عند النقر خارجها (للشاشات الصغيرة)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 991) {
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
                if (sidebar) {
                    sidebar.classList.remove('sidebar-open');
                    // تطبيق حالة الانهيار المحفوظة
                    try {
                        const saved = localStorage.getItem('sidebarCollapsed');
                        if (saved === 'true') {
                            sidebar.classList.add('collapsed');
                        } else {
                            sidebar.classList.remove('collapsed');
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        });

        // 4.5 تمييز الرابط النشط تلقائياً
        setActiveNavItem();

        // 4.6 تحديث عند تغيير المسار (popstate)
        window.addEventListener('popstate', function() {
            setActiveNavItem();
        });

        console.log('✅ [Main] تم تهيئة القائمة الجانبية المطورة');
    }

    // ============================================================
    // 5. تمييز الرابط النشط في القائمة
    // ============================================================
    function setActiveNavItem() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-list a[href]');
        let activeFound = false;

        // إزالة النشاط عن الجميع
        document.querySelectorAll('.nav-item.active').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.submenu li.active').forEach(el => el.classList.remove('active'));

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;

            // نبحث عن تطابق تام للمسار
            if (href === currentPath || (href !== '/' && currentPath.startsWith(href) && href.length > 1)) {
                const parentItem = link.closest('.nav-item');
                if (parentItem) {
                    parentItem.classList.add('active');
                    // إذا كان داخل قائمة فرعية، نفتح الأب
                    const parentSub = parentItem.closest('.has-submenu');
                    if (parentSub) {
                        parentSub.classList.add('submenu-open');
                    }
                }
                // للروابط داخل submenu
                if (link.closest('.submenu')) {
                    link.closest('li')?.classList.add('active');
                }
                activeFound = true;
            }
        });

        // إذا لم نجد تطابقاً، نضع النشاط على لوحة التحكم بشكل افتراضي
        if (!activeFound) {
            const dashboardLink = document.querySelector('.nav-list a[href="/pages/dashboard"]');
            if (dashboardLink) {
                const parentItem = dashboardLink.closest('.nav-item');
                if (parentItem) parentItem.classList.add('active');
            }
        }
    }

    // ============================================================
    // 6. تهيئة زر العودة إلى لوحة التحكم وتحديث عنوان الصفحة
    // ============================================================
    function initBackToDashboard() {
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

        // إصلاح زر العودة: منع التخزين المؤقت
        const backBtn = document.getElementById('backToDashboardLink');
        if (backBtn) {
            // نزيل أي مستمع سابق
            const newBackBtn = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBackBtn, backBtn);
            newBackBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const url = '/pages/dashboard?t=' + Date.now();
                if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
                    TeraApp.navigateTo(url);
                } else {
                    window.location.href = url;
                }
            });
        }

        console.log('✅ [Main] تم تهيئة زر العودة (page-dashboard:', isDashboard, ')');
    }

    // ============================================================
    // 7. تهيئة الإشعارات (مثال)
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
    // 8. تهيئة زر تسجيل الخروج (مع Toast)
    // ============================================================
    function initLogout() {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                // إظهار تنبيه Toast قبل تسجيل الخروج
                showToast('جاري تسجيل الخروج...', 'info');
                setTimeout(() => {
                    if (typeof TeraAuth !== 'undefined' && TeraAuth.logout) {
                        TeraAuth.logout();
                    } else {
                        localStorage.removeItem('tera_token');
                        localStorage.removeItem('tera_user');
                        window.location.href = '/auth/auth/login/login.html';
                    }
                }, 800);
            });
        }
    }

    // ============================================================
    // 9. دالة Toast (تنبيه لحظي)
    // ============================================================
    function showToast(message, type = 'info') {
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

        // أنماط الـ Toast (تُضاف مرة واحدة فقط)
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
                    background: var(--white-color, #fff);
                    padding: 14px 24px;
                    border-radius: var(--border-radius, 10px);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.12);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border-right: 4px solid var(--primary-color, #028090);
                    color: var(--gray-800, #1e293b);
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
                    color: var(--gray-500, #94a3b8);
                    padding: 0 4px;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (prefers-color-scheme: dark) {
                    .toast-content {
                        background: var(--gray-800, #2d3a4f);
                        color: var(--gray-100, #f8f9fa);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // زر الإغلاق
        toast.querySelector('.toast-close').addEventListener('click', function() {
            toast.remove();
        });

        // إزالة تلقائية بعد 4 ثوانٍ
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // ============================================================
    // 10. تهيئة الروابط الداخلية (لتجنب تعارض مع app.js)
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
    // 11. تهيئة المكونات المشتركة
    // ============================================================
    function initCommonComponents() {
        initSidebar();
        initBackToDashboard();
        initNotifications();
        initLogout();
        initInternalLinks();
        // إضافة دالة لتحديث النشاط عند أي تغيير
        window.addEventListener('popstate', function() {
            setActiveNavItem();
        });
        console.log('✅ [Main] تم تهيئة جميع المكونات المشتركة');
    }

    // ============================================================
    // 12. دوال تهيئة الصفحات حسب النوع (باستخدام مسارات مطلقة)
    // ============================================================
    function initDashboardPage() {
        console.log('📊 [Main] تهيئة لوحة التحكم');
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
    // 13. التهيئة الرئيسية (محسّنة)
    // ============================================================
    function initMain() {
        console.log('🚀 [Main] بدء تهيئة النظام...');

        const coreLoaded = ensureCoreLoaded();
        const authLoaded = ensureAuthLoaded();
        const appLoaded = ensureAppLoaded();

        if (coreLoaded && authLoaded && appLoaded) {
            performInitialization();
        } else {
            let attempts = 0;
            const maxAttempts = 20;
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
            initCommonComponents();

            const pageType = getCurrentPage();
            console.log('📄 [Main] نوع الصفحة:', pageType);

            initPageByType(pageType);

            console.log('✅ [Main] تم الانتهاء من التهيئة الرئيسية');
        }
    }

    // ============================================================
    // 14. الاستماع لتغيير الصفحة (في حالة SPA)
    // ============================================================
    function handlePageChange() {
        initBackToDashboard();
        setActiveNavItem();
    }

    window.addEventListener('popstate', handlePageChange);

    // ربط دالة التحديث بـ TeraApp ليتم استدعاؤها بعد تحميل الصفحة
    if (typeof window.TeraApp !== 'undefined') {
        const originalLoadPage = window.TeraApp.loadPage;
        if (originalLoadPage) {
            window.TeraApp.loadPage = function(url) {
                originalLoadPage(url);
                setTimeout(handlePageChange, 100);
            };
        }
    }

    // ============================================================
    // 15. بدء التهيئة
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    // ============================================================
    // 16. تصدير الدوال العامة
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
        resolveAbsolutePath: resolveAbsolutePath,
        initDashboardPage: initDashboardPage,
        initInvestmentsPage: initInvestmentsPage,
        initPortfolioPage: initPortfolioPage,
        initReportsPage: initReportsPage,
        initProfilePage: initProfilePage,
        initSecurityPage: initSecurityPage,
        initSupportPage: initSupportPage,
        initAuthPage: initAuthPage,
        refreshUI: handlePageChange,
        showToast: showToast,
        setActiveNavItem: setActiveNavItem
    };

    console.log('✅ [Main] تم تحميل المكتبة الرئيسية (TeraMain) بنجاح');

})();
