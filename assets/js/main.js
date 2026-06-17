/**
 * ==========================================================================
 * TERA Investor Portal - Main UI Interactions (main.js)
 * المكون التفاعلي المشترك - نسخة مستقرة ومحسنة
 * ==========================================================================
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // 1. التحكم في القائمة الجانبية (Sidebar Toggle)
    const menuToggleBtn = document.querySelector('.menu-toggle');
    const mainSidebar = document.querySelector('.tera-sidebar') || document.querySelector('.main-sidebar');
    
    if (menuToggleBtn && mainSidebar) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mainSidebar.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992 && !mainSidebar.contains(e.target) && !menuToggleBtn.contains(e.target)) {
                mainSidebar.classList.remove('active');
            }
        });
    }

    // 2. التحكم في القوائم المنسدلة (Dropdowns)
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const parent = this.parentElement;
            const menu = parent.querySelector('.dropdown-menu');
            
            document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
                if (openMenu !== menu) openMenu.classList.remove('show');
            });

            if (menu) menu.classList.toggle('show');
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => menu.classList.remove('show'));
    });

    // 3. نظام التبويبات المشترك (Tabs System)
    // يدعم حاويات متعددة في صفحة واحدة بفضل استخدام closest()
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabsContainer = button.closest('.tabs-wrapper');
            if (!tabsContainer) return;

            const targetId = button.getAttribute('data-target');
            
            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            tabsContainer.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            button.classList.add('active');
            const targetPane = tabsContainer.querySelector(`#${targetId}`);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // 4. النوافذ المنبثقة (Modals)
    const openModal = (modalId) => {
        const modal = document.querySelector(modalId);
        if (modal) modal.style.display = 'flex';
    };

    const closeModal = (modal) => {
        if (modal) modal.style.display = 'none';
    };

    document.querySelectorAll('[data-toggle="modal"]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(trigger.getAttribute('data-target'));
        });
    });

    document.querySelectorAll('.modal-close, [data-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(btn.closest('.modal'));
        });
    });

    // إغلاق المودال عند النقر خارج المحتوى
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
});
