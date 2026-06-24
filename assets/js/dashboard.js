/**
 * ============================================================
 * TERA INVESTOR PORTAL - DASHBOARD SIDEBAR LOGIC (FIXED)
 * ============================================================
 */

const Dashboard = {
    init: function() {
        console.log('🚀 Initializing Tera Dashboard...');
        this.initSidebar();
        this.initSubmenus();
        this.handleWindowResize();
    },

    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 992;

        // التحقق من وجود العناصر الأساسية
        if (!sidebar) {
            console.error('❌ Error: Element with ID "sidebar" NOT FOUND.');
            return;
        }
        if (!toggleBtn) {
            console.error('❌ Error: Element with ID "sidebarToggle" NOT FOUND.');
            return;
        }

        // ============================================
        // 1. زر تبديل القائمة الجانبية
        // ============================================
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🟢 Sidebar Toggle Clicked');

            if (!isMobile()) {
                // وضع الديسكتوب: تصغير/تكبير القائمة
                sidebar.classList.toggle('collapsed');
                // إزالة أي حالة مفتوحة للجوال (في حال التبديل)
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            } else {
                // وضع الجوال: فتح/غلق القائمة مع الـ overlay
                const isOpen = sidebar.classList.contains('sidebar-open');
                if (isOpen) {
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                } else {
                    sidebar.classList.add('sidebar-open');
                    if (overlay) overlay.classList.add('active');
                }
            }
        });

        // ============================================
        // 2. النقر على الـ overlay لإغلاق القائمة (الجوال)
        // ============================================
        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
                console.log('🔴 Sidebar closed via overlay.');
            });
        }

        // ============================================
        // 3. إغلاق القائمة تلقائياً عند تغيير حجم النافذة من جوال إلى ديسكتوب
        // ============================================
        window.addEventListener('resize', function() {
            if (!isMobile()) {
                // إذا أصبحت الشاشة كبيرة، نغلق وضع الجوال
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });

        // ============================================
        // 4. (اختياري) إغلاق القائمة عند الضغط على مفتاح Escape
        // ============================================
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
                console.log('🔴 Sidebar closed via Escape key.');
            }
        });

        console.log('✅ Sidebar initialized successfully.');
    },

    // ============================================
    // 5. إدارة القوائم الفرعية (submenus)
    // ============================================
    initSubmenus: function() {
        const submenuToggles = document.querySelectorAll('.has-submenu > a');
        if (!submenuToggles.length) {
            console.warn('⚠️ No submenus found.');
            return;
        }

        submenuToggles.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const parentLi = this.closest('.has-submenu');
                if (parentLi) {
                    // نغلق القوائم الفرعية الأخرى (اختياري)
                    // يمكنك إلغاء تعليق السطر التالي لجعلها تعمل كـ Accordion
                    // document.querySelectorAll('.has-submenu').forEach(el => {
                    //     if (el !== parentLi) el.classList.remove('submenu-open');
                    // });
                    parentLi.classList.toggle('submenu-open');
                    console.log(`🔄 Submenu toggled: ${parentLi.classList.contains('submenu-open') ? 'open' : 'closed'}`);
                }
            });
        });
    },

    // ============================================
    // 6. معالجة تغيير حجم النافذة (إعادة ضبط الحالة)
    // ============================================
    handleWindowResize: function() {
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (window.innerWidth > 992 && sidebar) {
                    // إذا كانت الشاشة كبيرة، تأكد من إزالة حالة الجوال
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                }
            }, 200);
        });
    }
};

// ============================================================
// تشغيل عند تحميل الصفحة
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    Dashboard.init();
});

// تصدير للاستخدام في بيئات أخرى (اختياري)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
