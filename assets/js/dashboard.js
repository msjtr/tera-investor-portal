/**
 * ============================================================
 * TERA INVESTOR PORTAL - DASHBOARD LOGIC (PRODUCTION)
 * ============================================================
 * الموقع: /assets/js/dashboard.js
 * - جميع البيانات تُجلب من Supabase بشكل حي.
 * - لا توجد بيانات وهمية أو ثابتة.
 * - يعتمد على جداول: user_portfolio, portfolio_history,
 *   investment_opportunities, transactions.
 * - يحمي المسار عبر TeraAuth.
 * - يستخدم maybeSingle() بدلاً من single() لتجنب أخطاء 406.
 */

const Dashboard = {
    chartInstance: null,
    _initialized: false,
    _supabase: null,

    /**
     * تهيئة لوحة التحكم بالكامل
     */
    init: async function() {
        if (this._initialized) return;
        this._initialized = true;

        // حماية المسار: إذا لم يكن المستخدم مسجلاً، توجيه فوري إلى صفحة الدخول
        if (window.TeraAuth && !window.TeraAuth.isLoggedIn()) {
            window.TeraAuth.redirectTo('/auth/auth/login/login.html');
            return;
        }

        // انتظار جاهزية Supabase
        try {
            this._supabase = await this._waitForSupabase();
        } catch (err) {
            console.error('❌ Supabase غير متوفر، توجيه للدخول');
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        console.log('🚀 جاري تهيئة لوحة التحكم بالبيانات الحقيقية...');

        // تهيئة المكونات المشتركة
        this.initSidebar();
        this.initSubmenus();
        this.initOpportunitiesToggle();
        this.initTransactionFilter();
        this.initLogout();
        this.initActiveNav();
        this.handleWindowResize();

        // تحميل البيانات الحقيقية
        await this.loadUserInfo();
        await this.loadStats();
        await this.loadChartData();
        await this.loadOpportunities();
        await this.loadTransactions();

        console.log('✅ لوحة التحكم جاهزة.');
    },

    _waitForSupabase: function() {
        return new Promise((resolve, reject) => {
            if (window.teraSupabase) return resolve(window.teraSupabase);
            const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
            document.addEventListener('supabase:ready', e => {
                clearTimeout(timeout);
                resolve(e.detail.client);
            }, { once: true });
            document.addEventListener('supabase:error', () => {
                clearTimeout(timeout);
                reject(new Error('error'));
            }, { once: true });
        });
    },

    /**
     * تحميل بيانات المستخدم وعرضها في واجهة الترحيب
     */
    loadUserInfo: async function() {
        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (user) {
                const name = user.user_metadata?.full_name || 'مستثمر';
                const h2 = document.querySelector('.welcome-banner h2');
                if (h2) h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${name}!`;
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب بيانات المستخدم:', e);
        }
    },

    /**
     * تحميل إحصائيات المحفظة (من جدول user_portfolio) – تم إصلاح خطأ 406
     */
    loadStats: async function() {
        const statValues = {
            portfolioValue: 0,
            activeContracts: 0,
            availableBalance: 0
        };

        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (user) {
                const { data, error } = await this._supabase
                    .from('user_portfolio')
                    .select('total_value, active_contracts, available_balance')
                    .eq('user_id', user.id)
                    .maybeSingle();   // ✅ يُعيد null إذا لم يوجد صف، بدون خطأ 406

                if (!error && data) {
                    statValues.portfolioValue = data.total_value || 0;
                    statValues.activeContracts = data.active_contracts || 0;
                    statValues.availableBalance = data.available_balance || 0;
                }
                // إذا كان data == null، تبقى القيم الافتراضية 0
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب إحصائيات المحفظة:', e);
        }

        // تحديث واجهة المستخدم
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent =
            statValues.portfolioValue.toLocaleString() + ' ر.س';
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent =
            statValues.activeContracts + ' عقود نشطة';
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent =
            statValues.availableBalance.toLocaleString() + ' ر.س';
    },

    /**
     * تحميل بيانات الرسم البياني (من جدول portfolio_history)
     */
    loadChartData: async function() {
        let labels = [];
        let values = [];

        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (user) {
                const { data, error } = await this._supabase
                    .from('portfolio_history')
                    .select('month, value')
                    .eq('user_id', user.id)
                    .order('month', { ascending: true });

                if (!error && data && data.length > 0) {
                    labels = data.map(r => r.month);
                    values = data.map(r => r.value);
                }
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب بيانات الرسم البياني:', e);
        }

        if (labels.length === 0) {
            labels = ['لا توجد بيانات'];
            values = [0];
        }

        const ctx = document.getElementById('mainChart');
        if (ctx && typeof Chart !== 'undefined') {
            if (this.chartInstance) {
                this.chartInstance.destroy();
                this.chartInstance = null;
            }
            this.chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'قيمة المحفظة (ر.س)',
                        data: values,
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
        }
    },

    /**
     * تحميل الفرص الاستثمارية (من جدول investment_opportunities)
     */
    loadOpportunities: async function() {
        const tbody = document.querySelector('#opportunitiesPanelWrapper tbody');
        if (!tbody) return;

        try {
            const { data, error } = await this._supabase
                .from('investment_opportunities')
                .select('title, share_price, annual_return, status')
                .eq('status', 'active')
                .limit(3);

            if (!error && data && data.length > 0) {
                let html = '';
                data.forEach(opp => {
                    html += `<tr>
                        <td class="text-title text-start">${opp.title}</td>
                        <td>${opp.share_price.toLocaleString()} ر.س</td>
                        <td>${opp.annual_return}%</td>
                        <td><span style="color:#0d9488;font-weight:bold;">${opp.status}</span></td>
                        <td><a href="/pages/investments/investment-details.html" class="btn-table-link">استعراض</a></td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = '<tr><td colspan="5">لا توجد فرص حالياً</td></tr>';
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب الفرص:', e);
        }
    },

    /**
     * تحميل آخر العمليات المالية (من جدول transactions)
     */
    loadTransactions: async function() {
        const tbody = document.getElementById('transactionsTableBody');
        if (!tbody) return;

        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await this._supabase
                .from('transactions')
                .select('description, created_at, amount')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!error && data && data.length > 0) {
                let html = '';
                data.forEach(tr => {
                    const date = new Date(tr.created_at).toLocaleDateString('ar-SA');
                    const amount = tr.amount;
                    const color = amount >= 0 ? '#10b981' : '#ef4444';
                    const sign = amount >= 0 ? '+' : '';
                    html += `<tr>
                        <td class="text-title text-start">${tr.description}</td>
                        <td>${date}</td>
                        <td class="amount-cell" style="color:${color};font-weight:bold;">${sign}${amount.toLocaleString()} ر.س</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = '<tr><td colspan="3">لا توجد عمليات مالية بعد</td></tr>';
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب العمليات المالية:', e);
        }
    },

    // ========== دوال الواجهة (ثابتة) ==========
    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 991;

        if (!sidebar) return;

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
                if (!isMobile()) sidebar.classList.toggle('collapsed');
            });
        }
    },

    initSubmenus: function() {
        const submenuToggles = document.querySelectorAll('.has-submenu > a');
        if (!submenuToggles.length) return;

        const handleSubmenuClick = function(e) {
            const href = this.getAttribute('href');
            const parentLi = this.closest('.has-submenu');
            if (href && href !== '#' && href !== 'javascript:void(0)' && href !== 'javascript:;') return;
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

    initLogout: function() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (!confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) return;

            if (window.TeraAuth && typeof window.TeraAuth.logout === 'function') {
                await window.TeraAuth.logout();
            } else {
                localStorage.removeItem('tera_token');
                localStorage.removeItem('tera_user');
                sessionStorage.clear();
                window.location.replace('/auth/auth/login/login.html');
            }
        });
    },

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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
