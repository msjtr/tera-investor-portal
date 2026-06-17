/**
 * ==========================================================================
 * TERA Investor Portal - Main UI Interactions (main.js)
 * المكون التفاعلي المشترك - معزز ومحمي للعمل أونلاين
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. التحكم في القائمة الجانبية (Sidebar Toggle) للشاشات الصغيرة
    // يدعم الفئات القديمة والجديدة (.tera-sidebar & .main-sidebar) لمنع الـ 404 والأخطاء
    // ==========================================
    const menuToggleBtn = document.querySelector('.menu-toggle');
    // البحث عن القائمة الجانبية بالاسمين لضمان التوافق الكامل عبر جميع الصفحات
    const mainSidebar = document.querySelector('.tera-sidebar') || document.querySelector('.main-sidebar');
    
    if (menuToggleBtn && mainSidebar) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // منع انتقال الحدث للـ document
            mainSidebar.classList.toggle('active');
        });

        // إغلاق القائمة تلقائياً عند النقر في أي مكان خارجها (في الشاشات الصغيرة)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) { // تم تحديث الأبعاد لتشمل الأجهزة اللوحية أيضاً
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
            
            // إغلاق أي قائمة منسدلة أخرى مفتوحة مسبقاً لمنع التداخل البصري
            document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
                if (openMenu !== menu) {
                    openMenu.classList.remove('show');
                }
            });

            // فتح أو إغلاق القائمة الحالية بنعومة
            if (menu) {
                menu.classList.toggle('show');
            }
        });
    });

    // إغلاق جميع القوائم المنسدلة فوراً عند النقر في أي مكان فارغ بالشاشة
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    });

    // ==========================================
    // 3. نظام التبويبات المشترك الفاخر (Tabs System)
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // الحصول على الحاوية الأب للتبويبات لضمان عزل العمليات
            const tabsContainer = button.closest('.tabs-wrapper');
            if (!tabsContainer) return;

            const targetId = button.getAttribute('data-target');
            
            // إزالة الكلاس active من جميع الأزرار والمحتويات داخل نفس الحاوية فقط
            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            tabsContainer.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // إضافة الكلاس active للزر المستهدف لتنشيط العرض
            button.classList.add('active');
            const targetPane = tabsContainer.querySelector(`#${targetId}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // ==========================================
    // 4. النوافذ المنبثقة المشتركة الفاخرة (Modals)
    // ==========================================
    const modalTriggers = document.querySelectorAll('[data-toggle="modal"]');
    const modalCloseBtns = document.querySelectorAll('.modal-close, [data-dismiss="modal"]');

    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetModalId = trigger.getAttribute('data-target');
            const targetModal = document.querySelector(targetModalId);
            if (targetModal) {
                targetModal.style.display = 'flex'; // دعم الظهور المرن المتباعد فوق الواجهات
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
