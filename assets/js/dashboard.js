/* ============================================================
   TERA INVESTOR PORTAL - DASHBOARD LOGIC
   ============================================================ */

const Dashboard = {
    // البيانات الوهمية (يمكن استبدالها بـ fetch من الـ API لاحقاً)
    mockData: {
        totalInvestments: "124,500.00",
        profit: "18,200.00",
        active: "12",
        pending: "3"
    },

    init: function() {
        console.log("✅ Dashboard Initialized");
        this.updateStats();
        this.renderChart();
    },

    // 1. تحديث بطاقات الإحصائيات
    updateStats: function() {
        // تحديث الأرقام في البطاقات (بافتراض وجود كلاسات stat-value)
        const stats = document.querySelectorAll('.stat-value');
        if (stats.length >= 4) {
            stats[0].innerText = `ر.س ${this.mockData.totalInvestments}`;
            stats[1].innerText = `ر.س ${this.mockData.profit}`;
            stats[2].innerText = this.mockData.active;
            stats[3].innerText = this.mockData.pending;
        }
    },

    // 2. تفعيل الرسم البياني (Chart.js)
    renderChart: function() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'الأرباح (ر.س)',
                    data: [1200, 1900, 3000, 5000, 2000, 3000],
                    borderColor: '#028090',
                    backgroundColor: 'rgba(2, 128, 144, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }
};

// تشغيل اللوحة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
