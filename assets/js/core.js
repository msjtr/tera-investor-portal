/**
 * core.js – النواة الأساسية للتطبيق
 * يوفر دوال مساعدة عامة، إدارة الثيم واللغة، وتهيئة الاتصال بـ Supabase
 * يمكن تحميله في أي صفحة دون الاعتماد على ملفات أخرى
 */
(function() {
    'use strict';

    // ========== دوال مساعدة عامة ==========

    /**
     * تنسيق التاريخ إلى التنسيق العربي
     * @param {string|Date} d - التاريخ
     * @returns {string} التاريخ منسقاً بالعربية
     */
    function formatDate(d) {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * تنسيق التاريخ مع الوقت
     */
    function formatDateTime(d) {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * تنسيق رقم إلى عملة (ريال سعودي)
     */
    function formatCurrency(amount) {
        return Number(amount || 0).toLocaleString('ar-SA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' ر.س';
    }

    /**
     * استخراج قيمة معامل من عنوان URL
     * @param {string} name - اسم المعامل
     * @returns {string|null}
     */
    function getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    /**
     * حماية من هجمات XSS عبر تحويل النص إلى HTML آمن
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * تأخير تنفيذ (sleep) لأغراض الاختبار أو التحميل
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========== الثيم واللغة ==========

    /**
     * تطبيق الوضع المظلم/الفاتح
     */
    function applyTheme(mode) {
        if (mode === 'dark') {
            document.documentElement.classList.add('dark-mode');
            localStorage.setItem('tera-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark-mode');
            localStorage.setItem('tera-theme', 'light');
        }
    }

    function initTheme() {
        const saved = localStorage.getItem('tera-theme');
        if (saved === 'dark') {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }
    }

    /**
     * الحصول على اللغة الحالية
     */
    function getLanguage() {
        return document.documentElement.lang || 'ar';
    }

    // ========== مساعدات Supabase ==========

    /**
     * انتظار جاهزية Supabase (تستدعي waitForSupabase إن وجدت)
     */
    async function waitForSupabase() {
        // إذا كانت الدالة العامة موجودة (من supabase-client.js)
        if (typeof window.waitForSupabase === 'function') {
            return await window.waitForSupabase();
        }
        // خطة بديلة: انتظار window.teraSupabase
        if (window.teraSupabase) return window.teraSupabase;
        // انتظار حدث مخصص (للتوافق مع أنظمة أخرى)
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.teraSupabase) {
                    clearInterval(check);
                    resolve(window.teraSupabase);
                }
            }, 100);
            setTimeout(() => clearInterval(check), 10000);
        });
    }

    // ========== إعدادات محلية ==========
    function getCurrentLocale() {
        return 'ar-SA';
    }

    // ========== دوال الإشعارات العامة ==========
    function showBrowserNotification(title, options = {}) {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            new Notification(title, options);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') new Notification(title, options);
            });
        }
    }

    // ========== تعريض الدوال العامة ==========
    window.TeraCore = {
        formatDate,
        formatDateTime,
        formatCurrency,
        getQueryParam,
        escapeHtml,
        sleep,
        applyTheme,
        initTheme,
        getLanguage,
        waitForSupabase,
        getCurrentLocale,
        showBrowserNotification
    };

    // تطبيق الثيم تلقائياً عند التحميل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    console.log('core.js: النواة جاهزة');
})();
