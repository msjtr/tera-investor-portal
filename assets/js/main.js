/**
 * ============================================================
 * main.js - الملف الرئيسي لإدارة وتنسيق جميع صفحات منصة تيرا
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. حساب العمق الديناميكي (مطابق تماماً لبقية التطبيق)
    // ============================================================
    function getBaseDepth() {
        const path = window.location.pathname.toLowerCase();
        
        // الهيكلية الدقيقة للمشروع
        if (path.includes('/auth/auth/login/')) return 3;
        if (path.includes('/auth/register/')) return 2;
        if (path.includes('/pages/')) return 2;
        if (path.includes('/auth/')) return 1;
        
        return 0;
    }

    function resolveRelativePath(targetPath) {
        let cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
        const depth = getBaseDepth();
        const prefix = '../'.repeat(depth);
        return prefix + cleanPath;
    }

    // ============================================================
    // 2. دوال التحقق من التحميل الذكي
    // ============================================================
    function ensureCoreLoaded() {
        if (typeof TeraCore === 'undefined') {
            const script = document.createElement('script');
            script.src = resolveRelativePath('assets/js/core.js');
            script.async = false;
            document.head.appendChild(script);
        }
    }

    function ensureAppLoaded() {
        if (typeof TeraApp === 'undefined') {
            const script = document.createElement('script');
            script.src = resolveRelativePath('assets/js/app.js');
            script.async = false;
            document.head.appendChild(script);
        }
    }

    // ============================================================
    // 3. التوجيه (Routing) والتهيئة
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
        return 'dashboard'; // افتراضي
    }

    // ... (بقية الدوال تبقى كما هي، لكن تأكد من أن initPageByType تستدعي الدوال التي قمنا بتعريفها في Sidebar) ...

    function initMain() {
        console.log('🚀 [Main] بدء تهيئة النظام...');
        
        ensureCoreLoaded();
        ensureAppLoaded();

        // تأخير بسيط لضمان تحميل الـ TeraCore والـ TeraApp
        setTimeout(() => {
            const pageType = getCurrentPage();
            if (typeof TeraMain !== 'undefined') {
                // تفعيل المكونات المشتركة
                if (typeof TeraApp !== 'undefined') {
                    // المكونات جاهزة
                }
            }
            console.log('✅ [Main] تم تفعيل التهيئة.');
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    window.TeraMain = { initMain, getBaseDepth, resolveRelativePath };

})();
