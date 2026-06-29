/**
 * ============================================================
 * TERA INVESTOR PORTAL - DASHBOARD LOGIC (PRODUCTION)
 * ============================================================
 * الموقع: /assets/js/dashboard.js
 * - جميع البيانات تُجلب من Supabase بشكل حي.
 * - لا توجد بيانات وهمية أو ثابتة.
 * - يعتمد على جداول: user_portfolio, portfolio_history,
 *   investment_opportunities, transactions.
 * ============================================================
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
     * تحميل إحصائيات المحفظة (من جدول user_portfolio)
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
                    .single();

                if (!error && data) {
                    statValues.portfolioValue = data.total_value || 0;
                    statValues.activeContracts = data.active_contracts || 0;
                    statValues.availableBalance = data.available_balance || 0;
                }
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب إحصائيات المحفظة:', e);
        }

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

    // ========== الدوال الثابتة (لم تتغير) ==========
    initSidebar: function() { /* ... نفس الكود السابق ... */ },
    initSubmenus: function() { /* ... نفس الكود السابق ... */ },
    initOpportunitiesToggle: function() { /* ... نفس الكود السابق ... */ },
    initTransactionFilter: function() { /* ... نفس الكود السابق ... */ },
    initLogout: function() { /* ... نفس الكود السابق ... */ },
    initActiveNav: function() { /* ... نفس الكود السابق ... */ },
    handleWindowResize: function() { /* ... نفس الكود السابق ... */ }
};

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    Dashboard.init();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
