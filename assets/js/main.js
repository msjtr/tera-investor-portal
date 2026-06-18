/**
 * ==========================================================================
 * TERA Investor Portal - Main UI Interactions (main.js)
 * المكون التفاعلي المشترك - نسخة مستقرة تعتمد على Event Delegation
 * ==========================================================================
 */
'use strict';

// نستخدم مستمع أحداث عام على مستوى المستند لضمان تفاعل المكونات المحقونة ديناميكياً
document.addEventListener('click', (e) => {

    // 1. التحكم في القائمة الجانبية (Sidebar Toggle)
    const menuToggleBtn = e.target.closest('.menu-toggle');
    const mainSidebar = document.querySelector('.tera-sidebar') || document.querySelector('.main-sidebar');
    
    if (menuToggleBtn && mainSidebar) {
        e.stopPropagation();
        mainSidebar.classList.toggle('active');
    }

    // إغلاق القائمة الجانبية عند النقر خارجها في الشاشات الصغيرة (Mobile/Tablet)
    if (window.innerWidth <= 992 && mainSidebar && mainSidebar.classList.contains('active')) {
        if (!mainSidebar.contains(e.target) && !e.target.closest('.menu-toggle')) {
            mainSidebar.classList.remove('active');
        }
    }

    // 2. التحكم في القوائم المنسدلة (Dropdowns)
    const dropdownToggle = e.target.closest('.dropdown-toggle');
    if (dropdownToggle) {
        e.preventDefault();
        e.stopPropagation();
        
        const parent = dropdownToggle.parentElement;
        const menu = parent.querySelector('.dropdown-menu');
        
        // إغلاق أي قائمة منسدلة أخرى مفتوحة
        document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
            if (openMenu !== menu) openMenu.classList.remove('show');
        });

        // تبديل حالة القائمة الحالية
        if (menu) menu.classList.toggle('show');
    } else {
        // إغلاق القوائم المنسدلة عند النقر في أي مكان آخر في الصفحة
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    // 3. نظام التبويبات المشترك (Tabs System)
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) {
        const tabsContainer = tabBtn.closest('.tabs-wrapper');
        if (tabsContainer) {
            const targetId = tabBtn.getAttribute('data-target');
            
            // إزالة الكلاس النشط من جميع الأزرار والمحتويات داخل نفس الحاوية
            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            tabsContainer.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // تفعيل الزر والمحتوى المستهدف
            tabBtn.classList.add('active');
            const targetPane = tabsContainer.querySelector(`#${targetId}`);
            if (targetPane) targetPane.classList.add('active');
        }
    }

    // 4. النوافذ المنبثقة (Modals)
    
    // أ. فتح النافذة
    const modalTrigger = e.target.closest('[data-toggle="modal"]');
    if (modalTrigger) {
        e.preventDefault();
        const targetId = modalTrigger.getAttribute('data-target');
        const modal = document.querySelector(targetId);
        if (modal) modal.style.display = 'flex';
    }

    // ب. إغلاق النافذة عبر زر الإغلاق
    const modalCloseBtn = e.target.closest('.modal-close, [data-dismiss="modal"]');
    if (modalCloseBtn) {
        e.preventDefault();
        const modal = modalCloseBtn.closest('.modal');
        if (modal) modal.style.display = 'none';
    }

    // ج. إغلاق النافذة عند النقر خارج المحتوى (على الخلفية الداكنة)
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});
