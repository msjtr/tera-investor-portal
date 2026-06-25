/**
 * ============================================================
 * TERA INVESTOR PORTAL - DASHBOARD SIDEBAR LOGIC (FIXED)
 * متوافق مع الهيدر الجديد (#openSidebarBtn) والهيكل القديم (#sidebarToggle)
 * ============================================================
 */

const Dashboard = {
    init: function() {
        console.log('🚀 Initializing Tera Dashboard...');
        this.initSidebar();
        this.initSubmenus();
        this.handleWindowResize();
    },

    /**
     * تهيئة القائمة الجانبية مع دعم الأزرار المختلفة
     */
    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 991; // نفس النقطة المستخدمة في CSS

        // التحقق من وجود القائمة الجانبية
        if (!sidebar) {
            console.error('❌ Error: Element with ID "sidebar" NOT FOUND.');
            return;
        }

        // ============================================
        // 1. تحديد زر التبديل المناسب
        //    - الأولوية لـ #openSidebarBtn (الهيدر الجديد)
        //    - في حال عدم وجوده، نبحث عن #sidebarToggle (الهيدر القديم)
        // ============================================
        let toggleBtn = document.getElementById('openSidebarBtn');
        if (!toggleBtn) {
            toggleBtn = document.getElementById('sidebarToggle');
            if (toggleBtn) {
                console.log('ℹ️ Using legacy toggle button: #sidebarToggle');
            } else {
                console.warn('⚠️ No toggle button found (#openSidebarBtn or #sidebarToggle).');
            }
        } else {
            console.log('✅ Using new toggle button: #openSidebarBtn');
        }

        // ============================================
        // 2. ربط حدث النقر على زر التبديل
        // ============================================
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟢 Sidebar Toggle Clicked');

                if (!isMobile()) {
                    // وضع الديسكتوب: تصغير/تكبير القائمة
                    sidebar.classList.toggle('collapsed');
                    // إزالة أي حالة مفتوحة للجوال
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
        }

        // ============================================
        // 3. إغلاق القائمة عند النقر على الـ overlay
        // ============================================
        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
                console.log('🔴 Sidebar closed via overlay.');
            });
        }

        // ============================================
        // 4. إغلاق القائمة عند تغيير حجم النافذة من جوال إلى ديسكتوب
        // ============================================
        const resizeHandler = () => {
            if (!isMobile()) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        };
        window.addEventListener('resize', resizeHandler);

        // ============================================
        // 5. إغلاق القائمة عند الضغط على Escape
        // ============================================
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
                console.log('🔴 Sidebar closed via Escape key.');
            }
        });

        // ============================================
        // 6. (اختياري) النقر المزدوج على الشعار لتبديل التصغير في الديسكتوب
        // ============================================
        const logo = document.querySelector('.header-logo a');
        if (logo) {
            logo.addEventListener('dblclick', function(e) {
                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                    console.log('🔄 Sidebar collapsed toggled via double-click on logo.');
                }
            });
        }

        console.log('✅ Sidebar initialized successfully.');
    },

    /**
     * إدارة القوائم الفرعية (submenus)
     */
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
                if (!parentLi) return;

                // منع فتح القوائم الفرعية في وضع التصغير (عندما تكون القائمة مصغرة)
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('collapsed')) {
                    // يمكنك اختيار توسيع القائمة تلقائياً بدلاً من منع الفتح
                    // sidebar.classList.remove('collapsed'); // (اختياري)
                    return;
                }

                // إغلاق القوائم الفرعية الأخرى (لجعلها تعمل كـ Accordion)
                document.querySelectorAll('.has-submenu').forEach(function(el) {
                    if (el !== parentLi) el.classList.remove('submenu-open');
                });

                parentLi.classList.toggle('submenu-open');
                console.log(`🔄 Submenu toggled: ${parentLi.classList.contains('submenu-open') ? 'open' : 'closed'}`);
            });
        });
    },

    /**
     * معالجة تغيير حجم النافذة (إعادة ضبط الحالة)
     */
    handleWindowResize: function() {
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (window.innerWidth > 991 && sidebar) {
                    // إزالة حالة الجوال عند الانتقال إلى الديسكتوب
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                }
                // في حالة الديسكتوب، نضمن عدم وجود أثر للجوال
                if (window.innerWidth <= 991 && sidebar) {
                    // إذا كانت القائمة مفتوحة في الجوال نتركها، لا نقوم بأي تغيير
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
