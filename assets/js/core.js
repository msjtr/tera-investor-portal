/**
 * ========================================
 * core.js - الدوال الأساسية المشتركة
 * ========================================
 */

const Core = (() => {
    'use strict';

    // دالة مساعدة لإضافة/إزالة كلاس
    function toggleClass(element, className) {
        if (!element) return;
        element.classList.toggle(className);
    }

    // دالة لإضافة كلاس
    function addClass(element, className) {
        if (!element) return;
        element.classList.add(className);
    }

    // دالة لإزالة كلاس
    function removeClass(element, className) {
        if (!element) return;
        element.classList.remove(className);
    }

    // دالة لإيجاد العنصر الأم (Parent) الذي يحتوي على كلاس معين
    function findParentByClass(element, className) {
        while (element) {
            if (element.classList && element.classList.contains(className)) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }

    // دالة لتبديل القائمة الفرعية (Submenu)
    function handleSubmenuToggles() {
        const submenuTriggers = document.querySelectorAll('.has-submenu > a');
        submenuTriggers.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const parentItem = this.parentElement;
                // إغلاق القوائم الأخرى (اختياري - لجعلها تعمل مثل الأكورديون)
                // يمكن إزالة التعليق عن السطر التالي لتفعيل الأكورديون
                // document.querySelectorAll('.has-submenu').forEach(item => { if(item !== parentItem) removeClass(item, 'submenu-open'); });
                toggleClass(parentItem, 'submenu-open');
            });
        });
    }

    // دالة لتبديل القائمة الجانبية (للشاشات الصغيرة)
    function handleSidebarToggle() {
        const toggleBtn = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', function() {
                toggleClass(sidebar, 'sidebar-open');
            });
        }
        // إغلاق القائمة عند النقر خارجها (للشاشات الصغيرة)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 991) {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('sidebarToggle');
                if (sidebar && toggleBtn) {
                    const isClickInside = sidebar.contains(e.target) || toggleBtn.contains(e.target);
                    if (!isClickInside) {
                        removeClass(sidebar, 'sidebar-open');
                    }
                }
            }
        });
    }

    // تهيئة القائمة النشطة بناءً على الرابط الحالي
    function setActiveNavItem() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.sidebar-nav a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && currentPath.includes(href) && href !== '#') {
                // إزالة النشاط من جميع العناصر
                document.querySelectorAll('.nav-item').forEach(item => removeClass(item, 'active'));
                const parentItem = link.closest('.nav-item');
                if (parentItem) {
                    addClass(parentItem, 'active');
                    // فتح القائمة الأم إذا كانت فرعية
                    const parentHasSub = parentItem.closest('.has-submenu');
                    if (parentHasSub) {
                        addClass(parentHasSub, 'submenu-open');
                    }
                }
            }
        });
    }

    // الدالة العامة للتهيئة
    function init() {
        handleSubmenuToggles();
        handleSidebarToggle();
        setActiveNavItem();
    }

    // إرجاع الدوال العامة
    return {
        init: init,
        toggleClass: toggleClass,
        addClass: addClass,
        removeClass: removeClass,
        findParentByClass: findParentByClass
    };

})();

// بدء التشغيل عند تحميل الـ DOM
document.addEventListener('DOMContentLoaded', () => {
    Core.init();
});
