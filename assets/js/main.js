/**
 * ============================================================
 * main.js - الملف الرئيسي (نسخة مستقرة بدون resolveRelativePath)
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. التأكد من تحميل الملفات الأساسية
    // ============================================================
    function ensureCoreLoaded() {
        if (typeof TeraCore === 'undefined') {
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
            const script = document.createElement('script');
            script.src = '/assets/js/auth.js';
            script.async = false;
            document.head.appendChild(script);
            return false;
        }
        return true;
    }

    // ============================================================
    // 2. تحديد نوع الصفحة
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
    // 3. القائمة الجانبية (Sidebar)
    // ============================================================
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.innerWidth > 991) {
                    sidebar.classList.toggle('collapsed');
                    try {
                        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
                    } catch (e) { /* ignore */ }
                } else {
                    sidebar.classList.toggle('sidebar-open');
                }
            });
        }

        // استعادة حالة الانهيار
        if (sidebar && window.innerWidth > 991) {
            try {
                const saved = localStorage.getItem('sidebarCollapsed');
                if (saved === 'true') sidebar.classList.add('collapsed');
                else sidebar.classList.remove('collapsed');
            } catch (e) { /* ignore */ }
        }

        // القوائم الفرعية (باستخدام delegation)
        document.addEventListener('click', function(e) {
            const link = e.target.closest('.has-submenu > a');
            if (!link) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const parent = link.parentElement;
            if (!parent) return;
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth > 991 && sidebar && sidebar.classList.contains('collapsed')) {
                showToast('افتح القائمة أولاً لعرض الخيارات', 'info');
                return;
            }
            parent.classList.toggle('submenu-open');
        });

        // إغلاق القائمة خارجياً
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 991) {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('sidebarToggle');
                if (sidebar && toggleBtn) {
                    const isInside = sidebar.contains(e.target);
                    const isToggle = toggleBtn.contains(e.target);
                    if (!isInside && !isToggle) sidebar.classList.remove('sidebar-open');
                }
            }
        });

        window.addEventListener('resize', function() {
            if (window.innerWidth > 991) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.remove('sidebar-open');
                    try {
                        const saved = localStorage.getItem('sidebarCollapsed');
                        if (saved === 'true') sidebar.classList.add('collapsed');
                        else sidebar.classList.remove('collapsed');
                    } catch (e) { /* ignore */ }
                }
            }
        });

        setActiveNavItem();
        window.addEventListener('popstate', setActiveNavItem);
        console.log('✅ [Main] تم تهيئة القائمة الجانبية');
    }

    function setActiveNavItem() {
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-item.active, .submenu li.active').forEach(el => el.classList.remove('active'));

        document.querySelectorAll('.nav-list a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;
            const isMatch = href === currentPath || (href !== '/' && currentPath.startsWith(href) && href.length > 1);
            if (isMatch) {
                const parentItem = link.closest('.nav-item');
                if (parentItem) {
                    parentItem.classList.add('active');
                    const parentSub = parentItem.closest('.has-submenu');
                    if (parentSub) parentSub.classList.add('submenu-open');
                }
                if (link.closest('.submenu')) link.closest('li')?.classList.add('active');
            }
        });
    }

    // ============================================================
    // 4. زر العودة إلى لوحة التحكم
    // ============================================================
    function initBackToDashboard() {
        const currentPath = window.location.pathname;
        const isDashboard = currentPath.includes('/dashboard/') ||
                            currentPath.endsWith('dashboard/index.html') ||
                            currentPath === '/pages/dashboard/index.html' ||
                            currentPath === '/dashboard';

        if (isDashboard) document.body.classList.add('page-dashboard');
        else document.body.classList.remove('page-dashboard');

        const pageTitleEl = document.getElementById('pageTitle');
        if (pageTitleEl) {
            const titleTag = document.querySelector('title');
            if (titleTag) {
                const parts = titleTag.textContent.split('|');
                pageTitleEl.textContent = parts[0].trim();
            }
        }

        const backBtn = document.getElementById('backToDashboardLink') || document.getElementById('backToDashboard');
        if (backBtn) {
            const newBtn = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBtn, backBtn);
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const url = '/pages/dashboard?t=' + Date.now();
                if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
                    TeraApp.navigateTo(url);
                } else {
                    window.location.href = url;
                }
            });
        }
        console.log('✅ [Main] زر العودة جاهز');
    }

    // ============================================================
    // 5. Toast (تنبيه)
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

        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                .custom-toast { position:fixed; bottom:30px; left:30px; z-index:99999; direction:rtl; animation:slideUp 0.4s ease; }
                .toast-content { background:#fff; padding:14px 24px; border-radius:10px; box-shadow:0 10px 40px rgba(0,0,0,0.12); display:flex; align-items:center; gap:16px; border-right:4px solid #028090; color:#1e293b; font-weight:500; min-width:200px; }
                .toast-content.info { border-right-color:#0D6EFD; }
                .toast-content.success { border-right-color:#10b981; }
                .toast-content.error { border-right-color:#ef4444; }
                .toast-content .toast-close { background:none; border:none; font-size:22px; cursor:pointer; color:#94a3b8; padding:0 4px; }
                @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                @media (prefers-color-scheme:dark) { .toast-content { background:#1e293b; color:#f8f9fa; } }
            `;
            document.head.appendChild(style);
        }

        toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // ============================================================
    // 6. تهيئة الإشعارات وتسجيل الخروج
    // ============================================================
    function initNotifications() {
        const notifIcon = document.querySelector('.notifications');
        if (notifIcon) {
            const newIcon = notifIcon.cloneNode(true);
            notifIcon.parentNode.replaceChild(newIcon, notifIcon);
            newIcon.addEventListener('click', function() {
                if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                    TeraApp.showNotification('📬 لديك 3 إشعارات جديدة', 'info', 4000);
                } else {
                    showToast('📬 لديك 3 إشعارات جديدة', 'info');
                }
            });
        }
    }

    function initLogout() {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            const newBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                showToast('جاري تسجيل الخروج...', 'info');
                setTimeout(() => {
                    if (typeof TeraAuth !== 'undefined' && TeraAuth.logout) {
                        TeraAuth.logout();
                    } else if (typeof TeraApp !== 'undefined' && TeraApp.logout) {
                        TeraApp.logout();
                    } else {
                        localStorage.removeItem('tera_token');
                        localStorage.removeItem('tera_user');
                        window.location.href = '/auth/auth/login/login.html';
                    }
                }, 600);
            });
        }
    }

    // ============================================================
    // 7. تهيئة المكونات المشتركة
    // ============================================================
    function initCommonComponents() {
        initSidebar();
        initBackToDashboard();
        initNotifications();
        initLogout();

        // معالجة الروابط الداخلية (لن تتعارض مع app.js)
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[href]');
            if (!link) return;
            if (link.closest('.has-submenu')) return;
            const href = link.getAttribute('href');
            if (!href || link.target === '_blank' || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || href.endsWith('.css') || href.endsWith('.js')) return;
            if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
                e.preventDefault();
                TeraApp.navigateTo(href);
            }
        });

        window.addEventListener('popstate', function() {
            setActiveNavItem();
        });

        console.log('✅ [Main] تم تهيئة جميع المكونات المشتركة');
    }

    // ============================================================
    // 8. تهيئة الصفحات حسب النوع
    // ============================================================
    function initDashboardPage() {
        console.log('📊 [Main] تهيئة لوحة التحكم');
        if (!document.querySelector('script[src="/assets/js/dashboard.js"]')) {
            const script = document.createElement('script');
            script.src = '/assets/js/dashboard.js';
            script.async = false;
            document.head.appendChild(script);
        }
    }

    function initInvestmentsPage() {
        console.log('💰 [Main] تهيئة صفحة الاستثمارات');
        if (!document.querySelector('script[src="/assets/js/investments.js"]')) {
            const script = document.createElement('script');
            script.src = '/assets/js/investments.js';
            script.async = false;
            document.head.appendChild(script);
        }
    }

    function initPortfolioPage() {
        console.log('💼 [Main] تهيئة صفحة المحفظة');
        if (!document.querySelector('script[src="/assets/js/portfolio.js"]')) {
            const script = document.createElement('script');
            script.src = '/assets/js/portfolio.js';
            script.async = false;
            document.head.appendChild(script);
        }
    }

    function initReportsPage() {
        console.log('📊 [Main] تهيئة صفحة التقارير');
        if (!document.querySelector('script[src="/assets/js/reports.js"]')) {
            const script = document.createElement('script');
            script.src = '/assets/js/reports.js';
            script.async = false;
            document.head.appendChild(script);
        }
    }

    function initProfilePage() {
        console.log('👤 [Main] تهيئة صفحة الملف الشخصي');
        if (!document.querySelector('script[src="/assets/js/profile.js"]')) {
            const script = document.createElement('script');
            script.src = '/assets/js/profile.js';
            script.async = false;
            document.head.appendChild(script);
        }
    }

    function initSecurityPage() {
        console.log('🔐 [Main] تهيئة صفحة الأمان');
        if (!document.querySelector('script[src="/assets/js/security.js"]')) {
            const script = document.createElement('script');
            script.src = '/assets/js/security.js';
            script.async = false;
            document.head.appendChild(script);
        }
    }

    function initSupportPage() {
        console.log('🆘 [Main] تهيئة صفحة الدعم');
        if (!document.querySelector('script[src="/assets/js/support.js"]')) {
            const script = document.createElement('script');
            script.src = '/assets/js/support.js';
            script.async = false;
            document.head.appendChild(script);
        }
    }

    function initAuthPage() {
        console.log('🔑 [Main] تهيئة صفحة المصادقة');
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
            default: console.log('📄 [Main] صفحة غير معروفة، تهيئة عامة');
        }
    }

    // ============================================================
    // 9. التهيئة الرئيسية
    // ============================================================
    function initMain() {
        console.log('🚀 [Main] بدء التهيئة...');

        const coreLoaded = ensureCoreLoaded();
        const authLoaded = ensureAuthLoaded();
        const appLoaded = ensureAppLoaded();

        let attempts = 0;
        const maxAttempts = 20;

        function checkAndInit() {
            attempts++;
            if (typeof TeraCore !== 'undefined' && typeof TeraAuth !== 'undefined' && typeof TeraApp !== 'undefined') {
                performInitialization();
                return true;
            } else if (attempts >= maxAttempts) {
                console.warn('⚠️ [Main] لم يتم تحميل جميع المكتبات، محاولة التهيئة مع المتاح');
                performInitialization();
                return true;
            }
            return false;
        }

        if (coreLoaded && authLoaded && appLoaded &&
            typeof TeraCore !== 'undefined' && typeof TeraAuth !== 'undefined' && typeof TeraApp !== 'undefined') {
            performInitialization();
        } else {
            const checkInterval = setInterval(function() {
                if (checkAndInit()) clearInterval(checkInterval);
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
    // 10. بدء التهيئة
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    window.TeraMain = {
        initMain,
        initCommonComponents,
        initSidebar,
        initBackToDashboard,
        showToast,
        setActiveNavItem,
        getCurrentPage
    };

    console.log('✅ [Main] تم تحميل المكتبة الرئيسية (TeraMain) بنجاح');
})();
