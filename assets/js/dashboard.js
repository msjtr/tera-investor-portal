/* ============================================================
   TERA INVESTOR PORTAL - DASHBOARD & INVESTMENT LOGIC
   ============================================================ */

const Dashboard = {
    // البيانات الموحدة للهوية الرقمية (جاهزة للربط المباشر بـ API لاحقاً)
    mockData: {
        portfolioValue: "124,500.00",
        activeContracts: "6 عقود نشطة",
        walletBalance: "15,500.00",
        
        // بيانات الرسم البياني لتطور ونمو المحفظة الاستثمارية
        chartLabels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
        chartValues: [100000, 105000, 112000, 115000, 120000, 124500]
    },

    init: function() {
        console.log("✅ Tera Dashboard Logic Initialized");
        this.updateStats();
        this.renderChart();
        this.attachEventListeners();
    },

    // تحديث بطاقات الإحصائيات بأمان
    updateStats: function() {
        const stats = document.querySelectorAll('.stats-grid .stat-value');
        if (stats && stats.length >= 3) {
            stats[0].innerText = `${this.mockData.portfolioValue} ر.س`;
            stats[1].innerText = this.mockData.activeContracts;
            stats[2].innerText = `${this.mockData.walletBalance} ر.س`;
        }
    },

    // رسم المدرج البياني للمحفظة
    renderChart: function() {
        const ctx = document.getElementById('mainChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (window.myDashboardChart) {
            window.myDashboardChart.destroy();
        }

        const chartContext = ctx.getContext('2d');
        const gradient = chartContext.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(2, 128, 144, 0.25)'); // لون تيرا الفيروزي الشفاف بالأعلى
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
                    pointHoverRadius: 8,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { position: 'right', grid: { color: '#f1f5f9' }, ticks: { font: { family: 'monospace' } } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    // ربط كافة العمليات والأزرار في الصفحة (القائمة الجانبية، الفلترة، الإخفاء)
    attachEventListeners: function() {
        // 1. فلتر العمليات المالية
        const filterEl = document.getElementById('transactionFilter');
        if (filterEl) {
            filterEl.addEventListener('change', (e) => this.filterTransactions(e.target.value));
        }

        // 2. إخفاء/إظهار الفرص
        const toggleOppBtn = document.getElementById('toggleOppBtn');
        if (toggleOppBtn) {
            toggleOppBtn.addEventListener('click', () => this.toggleOpportunities());
        }

        // 3. فتح وإغلاق القوائم الجانبية
        document.addEventListener('click', function(e) {
            // زر الموبايل
            let toggleBtn = e.target.closest('#sidebarToggle');
            if (toggleBtn) {
                e.preventDefault();
                e.stopPropagation();
                let sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    if (window.innerWidth > 991) {
                        sidebar.classList.toggle('collapsed');
                    } else {
                        sidebar.classList.toggle('sidebar-open');
                    }
                }
                return;
            }

            // القوائم الفرعية المنسدلة
            let submenuLink = e.target.closest('.has-submenu > a');
            if (submenuLink) {
                e.preventDefault();
                e.stopPropagation();
                let parentLi = submenuLink.parentElement;
                
                if(parentLi.classList.contains('submenu-open')) {
                    parentLi.classList.remove('submenu-open');
                } else {
                    document.querySelectorAll('.has-submenu').forEach(function(li) {
                        li.classList.remove('submenu-open');
                    });
                    parentLi.classList.add('submenu-open');
                }
            }
        }, true);
    },

    // دالة الفلترة (الكل، الإيداعات، الخصومات)
    filterTransactions: function(filterValue) {
        const rows = document.querySelectorAll('#transactionsTableBody tr');
        rows.forEach(row => {
            const amountText = row.querySelector('.amount-cell').innerText;
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

    // دالة إخفاء وإظهار جدول الفرص بشكل أنيق
    toggleOpportunities: function() {
        const panel = document.getElementById('opportunitiesPanelWrapper');
        const icon = document.getElementById('toggleOppIcon');
        const text = document.getElementById('toggleOppText');

        if (!panel || !icon || !text) return;

        if (panel.style.maxHeight === '0px' || !panel.style.maxHeight) {
            panel.style.maxHeight = '1000px';
            icon.className = 'fas fa-eye-slash';
            text.innerText = 'إخفاء';
        } else {
            panel.style.maxHeight = '0px';
            icon.className = 'fas fa-eye';
            text.innerText = 'إظهار';
        }
    }
};

// بدء تشغيل لوحة التحكم فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
