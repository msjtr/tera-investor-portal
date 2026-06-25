/**
 * ============================================================
 * TERA INVESTOR PORTAL - DASHBOARD SIDEBAR LOGIC (FIXED)
 * متوافق مع زر التبديل الدائم (#sidebarToggle) والهيدر الجديد
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
     * تهيئة القائمة الجانبية مع دعم الزر الدائم
     */
    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle'); // الزر الدائم
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 991;

        if (!sidebar) {
            console.error('❌ Error: Element with ID "sidebar" NOT FOUND.');
            return;
        }

        if (!toggleBtn) {
            console.warn('⚠️ Warning: No toggle button found (#sidebarToggle).');
            // محاولة البحث عن الزر البديل (إن وجد)
            const altBtn = document.getElementById('openSidebarBtn');
            if (altBtn) {
                console.log('ℹ️ Using alternative button: #openSidebarBtn (for mobile only)');
                // لكننا سنربط كلا الزرين إذا أمكن
            }
        }

        // ============================================
        // 1. زر التبديل الدائم (#sidebarToggle)
        // ============================================
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟢 Sidebar Toggle Clicked');

                if (!isMobile()) {
                    // وضع الديسكتوب: تصغير/تكبير القائمة (collapsed)
                    sidebar.classList.toggle('collapsed');
                    // إزالة أي حالة مفتوحة للجوال
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                } else {
                    // وضع الجوال: فتح/غلق القائمة (sidebar-open)
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
        // 2. زر فتح الجوال (#openSidebarBtn) – إن وجد
        // ============================================
        const mobileOpenBtn = document.getElementById('openSidebarBtn');
        if (mobileOpenBtn) {
            mobileOpenBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (isMobile()) {
                    // في الجوال فقط: فتح القائمة
                    sidebar.classList.add('sidebar-open');
                    if (overlay) overlay.classList.add('active');
                    console.log('🟢 Mobile sidebar opened via #openSidebarBtn.');
                } else {
                    // في الديسكتوب: نفس سلوك الزر الرئيسي (تصغير/تكبير)
                    sidebar.classList.toggle('collapsed');
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                }
            });
        }

        // ============================================
        // 3. زر إغلاق الجوال (#closeSidebarBtn) – إن وجد
        // ============================================
        const closeBtn = document.getElementById('closeSidebarBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
                console.log('🔴 Sidebar closed via #closeSidebarBtn.');
            });
        }

        // ============================================
        // 4. النقر على الـ overlay
        // ============================================
        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
                console.log('🔴 Sidebar closed via overlay.');
            });
        }

        // ============================================
        // 5. إغلاق الجوال عند تغيير حجم النافذة
        // ============================================
        window.addEventListener('resize', function() {
            if (!isMobile()) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });

        // ============================================
        // 6. إغلاق القائمة بالضغط على Escape
        // ============================================
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
                console.log('🔴 Sidebar closed via Escape key.');
            }
        });

        // ============================================
        // 7. النقر المزدوج على الشعار لتبديل التصغير (اختياري)
        // ============================================
        const logo = document.querySelector('.header-logo a');
        if (logo) {
            logo.addEventListener('dblclick', function(e) {
                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                    console.log('🔄 Sidebar toggled via double-click on logo.');
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

                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('collapsed')) {
                    // إذا كانت القائمة مصغرة، نمنع فتح القوائم الفرعية
                    // يمكنك إلغاء تعليق السطر التالي لتوسيع القائمة تلقائياً
                    // sidebar.classList.remove('collapsed');
                    return;
                }

                // إغلاق القوائم الفرعية الأخرى (Accordion)
                document.querySelectorAll('.has-submenu').forEach(function(el) {
                    if (el !== parentLi) el.classList.remove('submenu-open');
                });

                parentLi.classList.toggle('submenu-open');
            });
        });
    },

    /**
     * معالجة تغيير حجم النافذة
     */
    handleWindowResize: function() {
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (window.innerWidth > 991 && sidebar) {
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

// تصدير للاستخدام (اختياري)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
