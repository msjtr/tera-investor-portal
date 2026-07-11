/**
 * sidebar.js – تفعيل القائمة الجانبية (مستقل)
 * يعمل مع أي صفحة تحتوي على #sidebar, #sidebarToggle, #sidebarOverlay, #closeSidebarBtn
 */
(function() {
    'use strict';

    // منع التهيئة المتكررة
    if (window.__sidebarInitialized) return;
    window.__sidebarInitialized = true;

    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const closeBtn = document.getElementById('closeSidebarBtn');
        const overlay = document.getElementById('sidebarOverlay');

        if (!sidebar) return;

        // ========== زر فتح/إغلاق القائمة (البرجر) ==========
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                if (window.innerWidth < 992) {
                    // في الجوال: فتح/إغلاق كامل
                    sidebar.classList.toggle('sidebar-open');
                    if (overlay) overlay.classList.toggle('active');
                } else {
                    // في الديسكتوب: تصغير/توسيع
                    sidebar.classList.toggle('collapsed');
                }
            });
        }

        // ========== زر إغلاق القائمة (في الجوال) ==========
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            });
        }

        // ========== إغلاق القائمة عند النقر على الـ overlay ==========
        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
            });
        }

        // ========== إغلاق القائمة بمفتاح Escape ==========
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });

        // ========== القوائم الفرعية (Accordion) ==========
        const submenuToggles = document.querySelectorAll('.has-submenu > a');
        submenuToggles.forEach(function(link) {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                // إذا كان الرابط حقيقيًا (ليس #)، نسمح بالانتقال
                if (href && href !== '#' && href !== 'javascript:void(0)') {
                    return;
                }
                // منع الانتقال للروابط الوهمية
                e.preventDefault();
                
                const parentLi = this.closest('.has-submenu');
                if (!parentLi) return;

                // إغلاق القوائم الأخرى (اختياري - لسلوك accordion)
                // document.querySelectorAll('.has-submenu').forEach(el => {
                //     if (el !== parentLi) el.classList.remove('submenu-open');
                // });

                // فتح/إغلاق القائمة الحالية
                parentLi.classList.toggle('submenu-open');
            });
        });

        // ========== تعليم العنصر النشط بناءً على المسار الحالي ==========
        const currentPath = window.location.pathname.toLowerCase();
        document.querySelectorAll('.nav-item a[href]').forEach(function(link) {
            const href = link.getAttribute('href');
            if (href && href !== '#' && currentPath.includes(href.toLowerCase())) {
                const navItem = link.closest('.nav-item');
                if (navItem) {
                    navItem.classList.add('active');
                    // فتح القائمة الفرعية الحاوية تلقائيًا
                    const parentSubmenu = navItem.closest('.has-submenu');
                    if (parentSubmenu) {
                        parentSubmenu.classList.add('submenu-open');
                    }
                }
            }
        });

        console.log('✅ Sidebar initialized');
    }

    // ========== بدء التشغيل ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }

})();
