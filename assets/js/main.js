/**
 * main.js – إدارة واجهة المستخدم (متوافق مع Auth الموحد)
 * يستخدم window.Auth (auth.js) لتسجيل الخروج
 */
(function() {
    'use strict';

    // الحصول على اسم الصفحة الحالية من الرابط
    function getCurrentPage() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('investments')) return 'investments';
        if (path.includes('portfolio')) return 'portfolio';
        if (path.includes('profile')) return 'profile';
        if (path.includes('reports')) return 'reports';
        if (path.includes('security')) return 'security';
        if (path.includes('support')) return 'support';
        return 'dashboard';
    }

    // زر العودة للوحة التحكم
    function initBackToDashboard() {
        if (window._backBtnInitialized) return;
        window._backBtnInitialized = true;

        document.body.addEventListener('click', function(e) {
            const backBtn = e.target.closest('#backToDashboardLink, #backToDashboard');
            if (backBtn) {
                e.preventDefault();
                const url = '/pages/dashboard/index.html';
                window.location.replace(url);
            }
        });
    }

    // تنبيه بسيط (يمكن تطويره)
    function showToast(message, type) {
        if (typeof window.showSecurityAlert === 'function') {
            window.showSecurityAlert(message, type);
            return;
        }
        console.log(`[Toast: ${type}] ${message}`);
        // يمكن إضافة عنصر مؤقت في الصفحة
    }

    // تعليم العنصر النشط في القائمة الجانبية
    function setActiveNavItem() {
        const currentPath = window.location.pathname.toLowerCase();
        const navLinks = document.querySelectorAll('.nav-list a[href], .sidebar-menu a[href]');

        document.querySelectorAll('.nav-item.active, .sidebar-item.active, li.active').forEach(el => el.classList.remove('active'));

        navLinks.forEach(link => {
            const href = link.getAttribute('href')?.toLowerCase();
            if (href && href !== '#' && currentPath.includes(href)) {
                const parentItem = link.closest('.nav-item, .sidebar-item, li');
                if (parentItem) parentItem.classList.add('active');

                const parentSubmenu = link.closest('.has-submenu');
                if (parentSubmenu) {
                    parentSubmenu.classList.add('submenu-open');
                    const submenuLink = parentSubmenu.querySelector('a');
                    if (submenuLink) submenuLink.setAttribute('aria-expanded', 'true');
                }
            }
        });
    }

    function updateDashboardStyling() {
        const page = getCurrentPage();
        document.body.setAttribute('data-current-page', page);
    }

    // معالجة الأحداث العامة (تسجيل الخروج بشكل أساسي)
    function initUiEvents() {
        if (window._uiEventsInitialized) return;
        window._uiEventsInitialized = true;

        document.body.addEventListener('click', async function(e) {
            const logoutBtn = e.target.closest('.logout-btn, #logoutBtn');
            if (logoutBtn) {
                e.preventDefault();
                console.log('🔒 [Main] تسجيل الخروج...');
                logoutBtn.style.pointerEvents = 'none';
                logoutBtn.disabled = true;

                try {
                    // استخدام Auth الموحد (window.Auth)
                    if (window.Auth && typeof window.Auth.logout === 'function') {
                        await window.Auth.logout();
                        // Auth.logout تقوم بتسجيل الخروج وتنظيف التخزين ثم إعادة التوجيه
                    } else {
                        // احتياطي إذا لم يوجد Auth
                        console.warn('⚠️ Auth غير متوفر، خروج احتياطي.');
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.replace('/auth/auth/login/login.html');
                    }
                } catch (error) {
                    console.error('❌ فشل تسجيل الخروج:', error);
                    window.location.replace('/auth/auth/login/login.html');
                } finally {
                    logoutBtn.style.pointerEvents = 'auto';
                    logoutBtn.disabled = false;
                }
            }
        });
    }

    // التهيئة الرئيسية
    function initMain() {
        console.log('🚀 [Main] تهيئة واجهة المستخدم...');
        initBackToDashboard();
        initUiEvents();
        updateDashboardStyling();
        setActiveNavItem();

        // إذا كانت هناك دوال إضافية في الصفحة
        if (typeof window.initInvestments === 'function') window.initInvestments();
    }

    // تحديث الواجهة عند التنقل (SPA)
    function handlePageChange() {
        updateDashboardStyling();
        setActiveNavItem();
        if (typeof window.initInvestments === 'function') window.initInvestments();
    }
    window.addEventListener('popstate', handlePageChange);

    // بدء التشغيل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    // تعريض الدوال العامة
    window.TeraMain = {
        initMain,
        getCurrentPage,
        refreshUI: handlePageChange,
        showToast
    };
})();
