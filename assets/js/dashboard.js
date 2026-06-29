/**
 * ============================================================
 * TERA INVESTOR PORTAL - DASHBOARD LOGIC (ENTERPRISE UPDATE)
 * ============================================================
 * الموقع: /assets/js/dashboard.js
 * تاريخ التحديث: 2026-06-28
 * ============================================================
 */

const Dashboard = {
    chartInstance: null,
    _initialized: false,

    /**
     * تهيئة لوحة التحكم بالكامل
     */
    init: function() {
        if (this._initialized) {
            console.warn('⚠️ Dashboard already initialized.');
            return;
        }
        this._initialized = true;

        // حماية المسار: إذا لم يكن المستخدم مسجلاً، توجيه فوري إلى صفحة الدخول
        if (window.TeraAuth && !window.TeraAuth.isLoggedIn()) {
            console.log('🔐 [Dashboard] مستخدم غير مصرح → توجيه إلى صفحة الدخول');
            // تم إصلاح المسار إلى صفحة الدخول الفعلية
            window.TeraAuth.redirectTo('/auth/auth/login/login.html');
            return;
        }

        console.log('🚀 Initializing Tera Dashboard...');
        this.initSidebar();
        this.initSubmenus();
        this.initOpportunitiesToggle();
        this.initTransactionFilter();
        this.initChart();
        this.initLogout();
        this.initActiveNav();
        this.handleWindowResize();
        console.log('✅ Dashboard initialized successfully.');
    },

    /**
     * 1. تهيئة القائمة الجانبية (Sidebar)
     */
    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 991;

        if (!sidebar) {
            console.error('❌ Error: Element with ID "sidebar" NOT FOUND.');
            return;
        }

        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                } else {
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

        const closeBtn = document.getElementById('closeSidebarBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });

        const logo = document.querySelector('.header-logo a');
        if (logo) {
            logo.addEventListener('dblclick', function(e) {
                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }

        console.log('✅ Sidebar initialized.');
    },

    /**
     * 2. إدارة القوائم الفرعية (Submenus)
     */
    initSubmenus: function() {
        const submenuToggles = document.querySelectorAll('.has-submenu > a');
        if (!submenuToggles.length) return;

        const handleSubmenuClick = function(e) {
            const href = this.getAttribute('href');
            const parentLi = this.closest('.has-submenu');

            if (href && href !== '#' && href !== 'javascript:void(0)' && href !== 'javascript:;') {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (!parentLi) return;

            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('collapsed') && window.innerWidth > 991) {
                sidebar.classList.remove('collapsed');
            }

            document.querySelectorAll('.has-submenu').forEach(function(el) {
                if (el !== parentLi) el.classList.remove('submenu-open');
            });

            parentLi.classList.toggle('submenu-open');
        };

        submenuToggles.forEach(function(link) {
            link.removeEventListener('click', handleSubmenuClick);
            link.addEventListener('click', handleSubmenuClick);
        });
    },

    /**
     * 3. تبديل عرض الفرص الاستثمارية
     */
    initOpportunitiesToggle: function() {
        const toggleBtn = document.getElementById('toggleOppBtn');
        const wrapper = document.getElementById('opportunitiesPanelWrapper');
        const icon = document.getElementById('toggleOppIcon');
        const text = document.getElementById('toggleOppText');

        if (!toggleBtn || !wrapper) return;

        let hidden = false;
        wrapper.style.transition = 'all 0.3s ease';
        wrapper.style.maxHeight = '600px';
        wrapper.style.overflow = 'hidden';

        toggleBtn.addEventListener('click', function() {
            hidden = !hidden;
            if (hidden) {
                wrapper.style.maxHeight = '0';
                wrapper.style.padding = '0';
                wrapper.style.opacity = '0';
                if (icon) icon.className = 'fas fa-eye';
                if (text) text.textContent = 'عرض';
            } else {
                wrapper.style.maxHeight = '600px';
                wrapper.style.padding = '';
                wrapper.style.opacity = '1';
                if (icon) icon.className = 'fas fa-eye-slash';
                if (text) text.textContent = 'إخفاء';
            }
        });
    },

    /**
     * 4. فلتر العمليات المالية
     */
    initTransactionFilter: function() {
        const filterSelect = document.getElementById('transactionFilter');
        const tbody = document.getElementById('transactionsTableBody');

        if (!filterSelect || !tbody) return;

        filterSelect.addEventListener('change', function() {
            const value = this.value;
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(function(row) {
                const text = row.textContent.toLowerCase();
                if (value === 'all') {
                    row.style.display = '';
                } else if (value === 'deposits' && (text.includes('إيداع') || text.includes('+'))) {
                    row.style.display = '';
                } else if (value === 'deductions' && (text.includes('سحب') || text.includes('-') || text.includes('خصم'))) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    },

    /**
     * 5. الرسم البياني
     */
    initChart: function() {
        const ctx = document.getElementById('mainChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'قيمة المحفظة (ر.س)',
                    data: [85000, 92000, 98000, 105000, 115000, 124500],
                    borderColor: '#028090',
                    backgroundColor: 'rgba(2, 128, 144, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#028090',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { font: { family: 'Tajawal', size: 12 }, color: '#334155', padding: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) { return context.parsed.y.toLocaleString() + ' ر.س'; }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { font: { family: 'Tajawal', size: 11 }, color: '#64748b', callback: v => v.toLocaleString() + ' ر.س' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Tajawal', size: 11 }, color: '#64748b' }
                    }
                }
            }
        });
        console.log('✅ Chart initialized.');
    },

    /**
     * 6. تسجيل الخروج – استخدام TeraAuth.logout() الحقيقية
     */
    initLogout: function() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (!confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) return;

            console.log('🔴 Logging out...');

            if (window.TeraAuth && typeof window.TeraAuth.logout === 'function') {
                await window.TeraAuth.logout();
            } else {
                // إجراء احتياطي في حال عدم وجود TeraAuth (توجيه إلى صفحة الدخول الصحيحة)
                localStorage.removeItem('tera_token');
                localStorage.removeItem('tera_user');
                sessionStorage.clear();
                window.location.replace('/auth/auth/login/login.html');
            }
        });
    },

    /**
     * 7. تفعيل الحالة النشطة للقائمة
     */
    initActiveNav: function() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-item > a[href]');

        navLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            if (href === currentPath || (href !== '#' && href !== 'javascript:void(0)' && currentPath.includes(href))) {
                const parent = link.closest('.nav-item');
                if (parent) {
                    parent.classList.add('active');
                    if (parent.classList.contains('has-submenu')) parent.classList.add('submenu-open');
                }
            }
        });
    },

    /**
     * 8. معالجة تغيير حجم النافذة
     */
    handleWindowResize: function() {
        let resizeTimer;
        const isMobile = () => window.innerWidth <= 991;

        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (!isMobile() && sidebar) {
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                }
            }, 200);
        });
    }
};

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    Dashboard.init();
});

// تصدير للاستخدام في بيئات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
