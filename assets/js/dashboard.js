/* ============================================================
   TERA INVESTOR PORTAL - DASHBOARD & INVESTMENT LOGIC
   ============================================================ */

const Dashboard = {
    // البيانات الوهمية (محاكاة لبيانات حقيقية)
    mockData: {
        portfolioValue: "124,500.00",
        activeContracts: "6 عقود نشطة",
        walletBalance: "15,500.00",
        
        // بيانات الرسم البياني
        chartLabels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
        chartValues: [100000, 105000, 112000, 115000, 120000, 124500]
    },

    init: function() {
        console.log("✅ Tera Dashboard & Investment Logic Initialized");
        this.updateStats();
        this.renderChart();
        this.attachEventListeners();
    },

    // 1. تحديث بطاقات الإحصائيات الرئيسية
    updateStats: function() {
        const stats = document.querySelectorAll('.stats-grid .stat-value');
        if (stats && stats.length >= 3) {
            stats[0].innerText = `${this.mockData.portfolioValue} ر.س`;
            stats[1].innerText = this.mockData.activeContracts;
            stats[2].innerText = `${this.mockData.walletBalance} ر.س`;
        }
    },

    // 2. تفعيل الرسم البياني
    renderChart: function() {
        const ctx = document.getElementById('mainChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (window.myDashboardChart) window.myDashboardChart.destroy();

        const chartContext = ctx.getContext('2d');
        const gradient = chartContext.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(2, 128, 144, 0.25)');
        gradient.addColorStop(1, 'rgba(2, 128, 144, 0.00)');

        window.myDashboardChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.mockData.chartLabels,
                datasets: [{
                    label: 'تقييم المحفظة (ر.س)',
                    data: this.mockData.chartValues,
                    borderColor: '#028090',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#0A1B3F',
                    pointBorderColor: '#028090',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { position: 'right', grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Tajawal' } } },
                    x: { grid: { display: false }, ticks: { font: { family: 'Tajawal' } } }
                }
            }
        });
    },

    // 3. ربط كافة العمليات التفاعلية
    attachEventListeners: function() {
        // فلترة العمليات
        const filterEl = document.getElementById('transactionFilter');
        if (filterEl) {
            filterEl.addEventListener('change', (e) => this.filterTransactions(e.target.value));
        }

        // إخفاء/إظهار الفرص
        const toggleOppBtn = document.getElementById('toggleOppBtn');
        if (toggleOppBtn) {
            toggleOppBtn.addEventListener('click', () => this.toggleOpportunities());
        }

        // التحكم بالقائمة الجانبية والقوائم الفرعية
        document.addEventListener('click', function(e) {
            // فتح/إغلاق القائمة الجانبية
            let toggleBtn = e.target.closest('#sidebarToggle');
            if (toggleBtn) {
                e.preventDefault();
                let sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.toggle(window.innerWidth > 991 ? 'collapsed' : 'sidebar-open');
                return;
            }

            // فتح/إغلاق القوائم الفرعية
            let submenuLink = e.target.closest('.has-submenu > a');
            if (submenuLink) {
                e.preventDefault();
                let parentLi = submenuLink.parentElement;
                document.querySelectorAll('.has-submenu').forEach(li => {
                    if (li !== parentLi) li.classList.remove('submenu-open');
                });
                parentLi.classList.toggle('submenu-open');
            }
        }, true);
    },

    // دالة الفلترة (الكل، الإيداعات، الخصومات)
    filterTransactions: function(filterValue) {
        const rows = document.querySelectorAll('#transactionsTableBody tr');
        rows.forEach(row => {
            const amountCell = row.querySelector('.amount-cell');
            if (!amountCell) return;
            const amountText = amountCell.innerText;
            const isDeposit = amountText.includes('+');

            if (filterValue === 'all') {
                row.style.display = '';
            } else if (filterValue === 'deposits' && isDeposit) {
                row.style.display = '';
            } else if (filterValue === 'deductions' && !isDeposit) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    },

    // دالة إخفاء وإظهار جدول الفرص
    toggleOpportunities: function() {
        const panel = document.getElementById('opportunitiesPanelWrapper');
        const icon = document.getElementById('toggleOppIcon');
        const text = document.getElementById('toggleOppText');

        if (!panel || !icon || !text) return;

        const isHidden = panel.style.maxHeight === '0px' || !panel.style.maxHeight;
        panel.style.maxHeight = isHidden ? '1000px' : '0px';
        icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        text.innerText = isHidden ? 'إخفاء' : 'إظهار';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
