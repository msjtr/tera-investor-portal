/**
 * ============================================================
 * main.js - الملف الرئيسي لإدارة واجهة المستخدم (النسخة المؤسسية)
 * ============================================================
 * - تم الاعتماد على المسارات المطلقة (Absolute Paths).
 * - تم ربط تسجيل الخروج بمحرك TeraAuth الحقيقي وتدمير الجلسة.
 * - تحسين توافقية الواجهة وإدارة حالة القوائم (Active States).
 */

(function() {
    'use strict';

    // ============================================================
    // 1. الدوال الأساسية (معرفة أولاً لتجنب خطأ ReferenceError)
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
        return 'dashboard'; // الصفحة الافتراضية
    }

    function initBackToDashboard() {
        if(window._backBtnInitialized) return;
        window._backBtnInitialized = true;

        document.body.addEventListener('click', function(e) {
            const backBtn = e.target.closest('#backToDashboardLink') || e.target.closest('#backToDashboard');
            if (backBtn) {
                e.preventDefault();
                // التوجيه باستخدام المسار المطلق للوحة التحكم
                const url = '/pages/dashboard/index.html';
                
                if (typeof window.TeraAuth !== 'undefined' && typeof window.TeraAuth.redirectTo === 'function') {
                    window.TeraAuth.redirectTo(url);
                } else if (typeof window.TeraApp !== 'undefined' && typeof window.TeraApp.navigateTo === 'function') {
                    window.TeraApp.navigateTo(url);
                } else {
                    window.location.replace(url);
                }
            }
        });
    }

    function showToast(message, type) {
        if (typeof window.TeraApp !== 'undefined' && typeof window.TeraApp.showNotification === 'function') {
            window.TeraApp.showNotification(message, type);
            return;
        }
        // طباعة الرسالة في الكونسول كإجراء احتياطي إذا لم يكن نظام التنبيهات جاهزاً
        console.log(`[Toast: ${type}] ${message}`);
    }

    function setActiveNavItem() {
        const currentPath = window.location.pathname.toLowerCase();
        const navLinks = document.querySelectorAll('.nav-list a[href], .sidebar-menu a[href]');
        
        // إزالة الحالات النشطة السابقة
        document.querySelectorAll('.nav-item.active, .sidebar-item.active, li.active').forEach(el => el.classList.remove('active'));
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href').toLowerCase();
            if (href && href !== '#' && currentPath.includes(href)) {
                // تفعيل العنصر الأب
                const parentItem = link.closest('.nav-item, .sidebar-item, li');
                if (parentItem) parentItem.classList.add('active');
                
                // فتح القائمة الفرعية تلقائياً إذا كان العنصر بداخلها
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
        // تحديث التنسيقات العامة للوحة بناءً على الصفحة الحالية
        const page = getCurrentPage();
        document.body.setAttribute('data-current-page', page);
    }

    function initUiEvents() {
        if(window._uiEventsInitialized) return;
        window._uiEventsInitialized = true;
        
        document.body.addEventListener('click', async function(e) {
            // ربط أزرار تسجيل الخروج بمحرك المصادقة الفعلي
            const logoutBtn = e.target.closest('.logout-btn, #logoutBtn');
            if (logoutBtn) {
                e.preventDefault();
                console.log("🔒 [Main] جاري تسجيل الخروج الآمن وإنهاء الجلسة...");
                
                // تعطيل الزر لمنع تكرار الطلبات للسيرفر
                logoutBtn.style.pointerEvents = 'none'; 
                
                try {
                    if (window.TeraAuth && typeof window.TeraAuth.logout === 'function') {
                        await window.TeraAuth.logout();
                    } else {
                        // الإجراء الاحتياطي: مسح البيانات والتوجيه بالمسار المطلق
                        console.warn("⚠️ [Main] محرك TeraAuth غير متوفر، سيتم فرض التوجيه الاحتياطي.");
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.replace('/auth/auth/login/login.html');
                    }
                } catch (error) {
                    console.error('❌ [Main] خطأ أثناء الخروج:', error);
                    window.location.replace('/auth/auth/login/login.html');
                }
            }
        });
    }

    // ============================================================
    // 2. التهيئة الرئيسية (يتم استدعاؤها بعد تعريف الدوال أعلاه)
    // ============================================================
    function initMain() {
        console.log('🚀 [Main] بدء تهيئة واجهة المستخدم (Enterprise Version)...');
        initBackToDashboard();
        initUiEvents();
        updateDashboardStyling();
        setActiveNavItem();
        
        // تشغيل نظام الاستثمارات إذا كان محملاً
        if (typeof window.initInvestments === 'function') window.initInvestments();
    }

    // ============================================================
    // 3. الاستماع للتنقل (SPA Navigation)
    // ============================================================
    function handlePageChange() {
        updateDashboardStyling();
        setActiveNavItem();
        if (typeof window.initInvestments === 'function') window.initInvestments();
    }

    window.addEventListener('popstate', handlePageChange);

    // ============================================================
    // 4. التشغيل الآمن
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    // تصدير الدوال للنطاق العام (Global Scope)
    window.TeraMain = { 
        initMain, 
        getCurrentPage, 
        refreshUI: handlePageChange, 
        showToast 
    };

})();
