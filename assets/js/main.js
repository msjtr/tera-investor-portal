/**
 * ==========================================================================
 * TERA Investor Portal - Main UI Interactions (main.js)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. التحكم في القائمة الجانبية (Sidebar Toggle) للشاشات الصغيرة
    // ==========================================
    const menuToggleBtn = document.querySelector('.menu-toggle');
    const mainSidebar = document.querySelector('.main-sidebar');
    
    if (menuToggleBtn && mainSidebar) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // منع انتقال الحدث للـ document
            mainSidebar.classList.toggle('active');
        });

        // إغلاق القائمة عند النقر خارجها (في الشاشات الصغيرة)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!mainSidebar.contains(e.target) && !menuToggleBtn.contains(e.target)) {
                    mainSidebar.classList.remove('active');
                }
            }
        });
    }

    // ==========================================
    // 2. التحكم في القوائم المنسدلة (Dropdowns)
    // ==========================================
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const parent = this.parentElement;
            const menu = parent.querySelector('.dropdown-menu');
            
            // إغلاق أي قائمة منسدلة أخرى مفتوحة
            document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
                if (openMenu !== menu) {
                    openMenu.classList.remove('show');
                }
            });

            // فتح/إغلاق القائمة الحالية
            if (menu) {
                menu.classList.toggle('show');
            }
        });
    });

    // إغلاق القوائم المنسدلة عند النقر في أي مكان آخر
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    });

    // ==========================================
    // 3. نظام التبويبات المشترك (Tabs System)
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // الحصول على الحاوية الأب للتبويبات
            const tabsContainer = button.closest('.tabs-wrapper');
            if (!tabsContainer) return;

            const targetId = button.getAttribute('data-target');
            
            // إزالة الكلاس active من جميع الأزرار والمحتويات في نفس الحاوية
            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            tabsContainer.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // إضافة الكلاس active للزر المنقور والمحتوى المستهدف
            button.classList.add('active');
            const targetPane = tabsContainer.querySelector(`#${targetId}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // ==========================================
    // 4. النوافذ المنبثقة المشتركة (Modals)
    // ==========================================
    const modalTriggers = document.querySelectorAll('[data-toggle="modal"]');
    const modalCloseBtns = document.querySelectorAll('.modal-close, [data-dismiss="modal"]');

    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetModalId = trigger.getAttribute('data-target');
            const targetModal = document.querySelector(targetModalId);
            if (targetModal) {
                targetModal.style.display = 'flex'; // أو إضافة كلاس active
            }
        });
    });

    modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
});
