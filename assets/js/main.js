/**
 * ============================================================
 * main.js - الملف الرئيسي لإدارة واجهة المستخدم (النسخة المؤسسية)
 * ============================================================
 * - يعتمد على TeraAuth (auth.js) لتسجيل الخروج الآمن
 * - يدعم القوائم الجانبية وحالات التنقل النشطة
 * - إصلاحات التوافق مع النظام الجديد
 */

(function() {
    'use strict';

    // ============================================================
    // 1. الدوال الأساسية
    // ============================================================

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

    function initBackToDashboard() {
        if(window._backBtnInitialized) return;
        window._backBtnInitialized = true;

        document.body.addEventListener('click', function(e) {
            const backBtn = e.target.closest('#backToDashboardLink') || e.target.closest('#backToDashboard');
            if (backBtn) {
                e.preventDefault();
                const url = '/pages/dashboard/index.html';
                
                if (typeof window.TeraAuth !== 'undefined' && typeof window.TeraAuth.redirectTo === 'function') {
                    window.TeraAuth.redirectTo(url);
                } else {
                    window.location.replace(url);
                }
            }
        });
    }

    function showToast(message, type) {
        // محاولة استخدام دالة التنبيه من security.js إذا كانت موجودة
        if (typeof window.showSecurityAlert === 'function') {
            window.showSecurityAlert(message, type);
            return;
        }
        console.log(`[Toast: ${type}] ${message}`);
    }

    function setActiveNavItem() {
        const currentPath = window.location.pathname.toLowerCase();
        const navLinks = document.querySelectorAll('.nav-list a[href], .sidebar-menu a[href]');
        
        document.querySelectorAll('.nav-item.active, .sidebar-item.active, li.active').forEach(el => el.classList.remove('active'));
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href').toLowerCase();
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

    function initUiEvents() {
        if(window._uiEventsInitialized) return;
        window._uiEventsInitialized = true;
        
        document.body.addEventListener('click', async function(e) {
            const logoutBtn = e.target.closest('.logout-btn, #logoutBtn');
            if (logoutBtn) {
                e.preventDefault();
                console.log("🔒 [Main] جاري تسجيل الخروج الآمن...");
                
                // تعطيل الزر مؤقتاً
                logoutBtn.style.pointerEvents = 'none';
                logoutBtn.disabled = true;
                
                try {
                    if (window.TeraAuth && typeof window.TeraAuth.logout === 'function') {
                        await window.TeraAuth.logout();
                    } else {
                        console.warn("⚠️ [Main] TeraAuth غير متوفر، توجيه احتياطي.");
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.replace('/auth/auth/login/login.html');
                    }
                } catch (error) {
                    console.error('❌ [Main] خطأ أثناء الخروج:', error);
                    // في حالة الفشل، نضمن التوجيه
                    window.location.replace('/auth/auth/login/login.html');
                } finally {
                    // إعادة تعيين الزر إذا بقي في الصفحة
                    logoutBtn.style.pointerEvents = 'auto';
                    logoutBtn.disabled = false;
                }
            }
        });
    }

    // ============================================================
    // 2. التهيئة الرئيسية
    // ============================================================
    function initMain() {
        console.log('🚀 [Main] بدء تهيئة واجهة المستخدم...');
        initBackToDashboard();
        initUiEvents();
        updateDashboardStyling();
        setActiveNavItem();
        
        if (typeof window.initInvestments === 'function') window.initInvestments();
    }

    // ============================================================
    // 3. التنقل (SPA)
    // ============================================================
    function handlePageChange() {
        updateDashboardStyling();
        setActiveNavItem();
        if (typeof window.initInvestments === 'function') window.initInvestments();
    }

    window.addEventListener('popstate', handlePageChange);

    // ============================================================
    // 4. بدء التشغيل
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    // تصدير الدوال
    window.TeraMain = { 
        initMain, 
        getCurrentPage, 
        refreshUI: handlePageChange, 
        showToast 
    };

})();
