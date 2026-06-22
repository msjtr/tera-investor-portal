/**
 * ============================================================
 * main.js - الملف الرئيسي لإدارة واجهة المستخدم (النسخة المصححة)
 * ============================================================
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
        // ... باقي الشروط
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
                if (typeof TeraApp !== 'undefined' && typeof TeraApp.navigateTo === 'function') {
                    TeraApp.navigateTo(url);
                } else {
                    window.location.href = url;
                }
            }
        });
    }

    function showToast(message, type) {
        if (typeof TeraApp !== 'undefined' && typeof TeraApp.showNotification === 'function') {
            TeraApp.showNotification(message, type);
            return;
        }
        // ... (كود الـ Toast الخاص بك)
    }

    function setActiveNavItem() {
        const currentPath = window.location.pathname.toLowerCase();
        const navLinks = document.querySelectorAll('.nav-list a[href]');
        document.querySelectorAll('.nav-item.active').forEach(el => el.classList.remove('active'));
        navLinks.forEach(link => {
            const href = link.getAttribute('href').toLowerCase();
            if (href && currentPath.includes(href)) {
                link.closest('.nav-item')?.classList.add('active');
            }
        });
    }

    function updateDashboardStyling() {
        // ... (كود التنسيق الخاص بك)
    }

    function initUiEvents() {
        if(window._uiEventsInitialized) return;
        window._uiEventsInitialized = true;
        document.body.addEventListener('click', function(e) {
            if (e.target.closest('.logout-btn')) {
                // ... (كود تسجيل الخروج)
            }
        });
    }

    // ============================================================
    // 2. التهيئة الرئيسية (يتم استدعاؤها بعد تعريف الدوال أعلاه)
    // ============================================================
    function initMain() {
        console.log('🚀 [Main] بدء تهيئة واجهة المستخدم...');
        initBackToDashboard();
        initUiEvents();
        updateDashboardStyling();
        setActiveNavItem();
        
        // تشغيل نظام الاستثمارات إذا كان محملاً
        if (typeof window.initInvestments === 'function') window.initInvestments();
    }

    // ============================================================
    // 3. الاستماع للتنقل (SPA)
    // ============================================================
    function handlePageChange() {
        updateDashboardStyling();
        setActiveNavItem();
        if (typeof window.initInvestments === 'function') window.initInvestments();
    }

    window.addEventListener('popstate', handlePageChange);

    // ============================================================
    // 4. التشغيل
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    // تصدير الدوال
    window.TeraMain = { initMain, getCurrentPage, refreshUI: handlePageChange, showToast };

})();
