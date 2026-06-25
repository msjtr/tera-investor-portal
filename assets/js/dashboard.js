/**
 * ============================================================
 * TERA INVESTOR PORTAL - DASHBOARD LOGIC (FIXED)
 * ============================================================
 * الموقع: /assets/js/dashboard.js
 * تاريخ التحديث: 2026-06-25
 * ============================================================
 */

const Dashboard = {
    // تخزين مرجع الرسم البياني لتدميره عند إعادة التهيئة
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
     * ============================================================
     * 1. تهيئة القائمة الجانبية (Sidebar)
     * ============================================================
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
                console.log('🟢 Sidebar Toggle Clicked');

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
        } else {
            console.warn('⚠️ Warning: #sidebarToggle not found.');
        }

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

        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
                console.log('🔴 Sidebar closed via overlay.');
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
                console.log('🔴 Sidebar closed via Escape key.');
            }
        });

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
     * ============================================================
     * 2. إدارة القوائم الفرعية (Submenus)
     * ============================================================
     */
    initSubmenus: function() {
        const submenuToggles = document.querySelectorAll('.has-submenu > a');

        if (!submenuToggles.length) {
            console.warn('⚠️ No submenus found.');
            return;
        }

        console.log(`🔄 Found ${submenuToggles.length} submenu toggles.`);

        const handleSubmenuClick = function(e) {
            const href = this.getAttribute('href');
            const parentLi = this.closest('.has-submenu');

            if (href && href !== '#' && href !== 'javascript:void(0)' && href !== 'javascript:;') {
                console.log(`🔗 Navigating to: ${href}`);
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (!parentLi) return;

            const sidebar = document.getElementById('sidebar');

            if (sidebar && sidebar.classList.contains('collapsed') && window.innerWidth > 991) {
                sidebar.classList.remove('collapsed');
                console.log('🔄 Sidebar expanded automatically to show submenu.');
            }

            document.querySelectorAll('.has-submenu').forEach(function(el) {
                if (el !== parentLi) el.classList.remove('submenu-open');
            });

            parentLi.classList.toggle('submenu-open');
            console.log(`🔄 Submenu toggled: ${parentLi.classList.contains('submenu-open') ? 'open' : 'closed'}`);
        };

        submenuToggles.forEach(function(link) {
            link.removeEventListener('click', handleSubmenuClick);
            link.addEventListener('click', handleSubmenuClick);
        });
    },

    /**
     * ============================================================
     * 3. تبديل عرض الفرص الاستثمارية
     * ============================================================
     */
    initOpportunitiesToggle: function() {
        const toggleBtn = document.getElementById('toggleOppBtn');
        const wrapper = document.getElementById('opportunitiesPanelWrapper');
        const icon = document.getElementById('toggleOppIcon');
        const text = document.getElementById('toggleOppText');

        if (!toggleBtn || !wrapper) {
            console.warn('⚠️ Opportunities toggle elements not found.');
            return;
        }

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
            console.log(`🔄 Opportunities ${hidden ? 'hidden' : 'shown'}.`);
        });
    },

    /**
     * ============================================================
     * 4. فلتر العمليات المالية
     * ============================================================
     */
    initTransactionFilter: function() {
        const filterSelect = document.getElementById('transactionFilter');
        const tbody = document.getElementById('transactionsTableBody');

        if (!filterSelect || !tbody) {
            console.warn('⚠️ Transaction filter elements not found.');
            return;
        }

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
            console.log(`🔄 Transaction filter changed to: ${value}`);
        });
    },

    /**
     * ============================================================
     * 5. الرسم البياني – مع تدمير الرسم السابق
     * ============================================================
     */
    initChart: function() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) {
            console.warn('⚠️ Chart canvas #mainChart not found.');
            return;
        }

        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js library not loaded.');
            return;
        }

        if (this.chartInstance) {
            try {
                this.chartInstance.destroy();
                console.log('🔄 Previous chart destroyed.');
            } catch (e) {
                console.warn('⚠️ Error destroying previous chart:', e);
            }
            this.chartInstance = null;
        }

        try {
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
                            labels: {
                                font: { family: 'Tajawal', size: 12 },
                                color: '#334155',
                                padding: 20,
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.parsed.y.toLocaleString() + ' ر.س';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: {
                                font: { family: 'Tajawal', size: 11 },
                                color: '#64748b',
                                callback: function(value) {
                                    return value.toLocaleString() + ' ر.س';
                                }
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { family: 'Tajawal', size: 11 },
                                color: '#64748b'
                            }
                        }
                    }
                }
            });
            console.log('✅ Chart.js initialized successfully.');
        } catch (error) {
            console.error('❌ Error initializing chart:', error);
        }
    },

    /**
     * ============================================================
     * 6. تسجيل الخروج – مسح الجلسة والتوجيه (الإصلاح النهائي)
     * ============================================================
     */
    initLogout: function() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) {
            console.warn('⚠️ Logout button not found.');
            return;
        }

        logoutBtn.addEventListener('click', function() {
            if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
                console.log('🔴 User logged out. Clearing session...');

                // 1. مسح التخزين المحلي (localStorage)
                try {
                    localStorage.clear();
                    console.log('✅ localStorage cleared.');
                } catch (e) {
                    console.warn('⚠️ Could not clear localStorage:', e);
                }

                // 2. مسح التخزين المؤقت للجلسة (sessionStorage)
                try {
                    sessionStorage.clear();
                    console.log('✅ sessionStorage cleared.');
                } catch (e) {
                    console.warn('⚠️ Could not clear sessionStorage:', e);
                }

                // 3. مسح الكوكيز
                try {
                    document.cookie.split(';').forEach(function(c) {
                        document.cookie = c
                            .replace(/^ +/, '')
                            .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                    });
                    console.log('✅ Cookies cleared.');
                } catch (e) {
                    console.warn('⚠️ Could not clear cookies:', e);
                }

                // 4. التوجيه إلى الرابط المطلوب (مع منع العودة للخلف)
                window.location.replace('https://tera-investor-portal.onrender.com');
            }
        });
    },

    /**
     * ============================================================
     * 7. تفعيل الحالة النشطة للقائمة
     * ============================================================
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
                    if (parent.classList.contains('has-submenu')) {
                        parent.classList.add('submenu-open');
                    }
                }
            }
        });
    },

    /**
     * ============================================================
     * 8. معالجة تغيير حجم النافذة
     * ============================================================
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

// ============================================================
// تشغيل عند تحميل الصفحة
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    Dashboard.init();
});

// تصدير للاستخدام في بيئات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
