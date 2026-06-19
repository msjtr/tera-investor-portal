/* ============================================================
   TERA INVESTOR PORTAL - CORE APPLICATION LOGIC
   ============================================================ */

(function() {
    'use strict';

    // 1. نظام التوجيه (Router & Navigation)
    const App = {
        cleanupFuncs: [],

        init: function() {
            this.initGlobalEvents();
            this.handleNavigation();
        },

        // تسجيل دالة تنظيف (لتشغيلها عند تغيير الصفحة لمنع تراكم الذاكرة)
        registerCleanup: function(fn) {
            this.cleanupFuncs.push(fn);
        },

        // تنفيذ التنظيف
        runCleanup: function() {
            this.cleanupFuncs.forEach(fn => fn());
            this.cleanupFuncs = [];
        },

        // تفويض الأحداث (Event Delegation) للقائمة الجانبية
        initGlobalEvents: function() {
            // حدث النقر العام للتحكم بالقائمة
            document.addEventListener('click', function(e) {
                // زر التبديل (Sidebar Toggle)
                if (e.target.closest('#sidebarToggle')) {
                    const sidebar = document.getElementById('sidebar');
                    if (window.innerWidth > 991) {
                        sidebar.classList.toggle('collapsed');
                    } else {
                        sidebar.classList.toggle('sidebar-open');
                    }
                }

                // فتح وإغلاق القوائم الفرعية
                const submenuLink = e.target.closest('.has-submenu > a');
                if (submenuLink) {
                    e.preventDefault();
                    const parent = submenuLink.parentElement;
                    // إغلاق الفروع الأخرى
                    document.querySelectorAll('.has-submenu').forEach(el => {
                        if (el !== parent) el.classList.remove('submenu-open');
                    });
                    parent.classList.toggle('submenu-open');
                }
            });
        },

        // تحميل الصفحات بدون إعادة تحميل (SPA Navigation)
        loadPage: function(url) {
            this.runCleanup(); // تنظيف الصفحة القديمة (تدمير الرسومات الخ)
            
            fetch(url + '?t=' + Date.now())
                .then(response => response.ok ? response.text() : Promise.reject('Error'))
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const newContent = doc.querySelector('.main-content');
                    
                    if (newContent) {
                        document.querySelector('.main-content').innerHTML = newContent.innerHTML;
                        // إعادة تهيئة عناصر الصفحة الجديدة
                        this.reinitializePage(url);
                    }
                })
                .catch(err => console.error('فشل تحميل الصفحة:', err));
        },

        // إعادة تهيئة العناصر بعد تحميل الصفحة
        reinitializePage: function(url) {
            // إذا كنا في لوحة التحكم، نفذ دالة الرسومات البيانية
            if (url.includes('dashboard')) {
                if (typeof initDashboardChart === 'function') {
                    initDashboardChart();
                }
            }
        },

        handleNavigation: function() {
            // منع الروابط التقليدية وتفعيل الـ SPA
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link && !link.target && !link.hasAttribute('download')) {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('/pages/')) {
                        e.preventDefault();
                        this.loadPage(href);
                        window.history.pushState({}, '', href);
                    }
                }
            });
        }
    };

    // التشغيل عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
        // تشغيل الرسم البياني فوراً إذا كانت الصفحة هي لوحة التحكم
        if (window.location.pathname.includes('dashboard')) {
            if (typeof initDashboardChart === 'function') initDashboardChart();
        }
    });

    // تصدير للوصول العالمي (Global)
    window.App = App;
})();
