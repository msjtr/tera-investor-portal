/* ============================================================
   TERA INVESTOR PORTAL - DASHBOARD & INVESTMENT LOGIC
   ============================================================ */

const Dashboard = {
    // البيانات الوهمية (جاهزة للاستبدال بـ fetch من الـ API أو الـ Webhook لاحقاً)
    mockData: {
        totalInvestments: "124,500.00",
        profit: "18,200.00",
        active: "12",
        pending: "3",
        
        // بيانات لوحة التنبيهات الذكية وحالة الطرح الحالية
        offeringAlert: {
            title: "فرصة استثمارية نشطة",
            description: "سارع بالانضمام، الطلب عالي على هذه الفرصة والأسهم تنفد بسرعة.",
            timeRemaining: "3 أيام و 14 ساعة",
            sharesLeft: "15 سهم فقط !",
            statusText: "متاح للانضمام"
        }
    },

    init: function() {
        console.log("✅ Dashboard & Alerts Initialized");
        this.updateStats();
        this.updateAlertsBanner();
        this.renderChart();
    },

    // 1. تحديث بطاقات الإحصائيات الرئيسية
    updateStats: function() {
        const stats = document.querySelectorAll('.stat-value');
        if (stats.length >= 4) {
            stats[0].innerText = `ر.س ${this.mockData.totalInvestments}`;
            stats[1].innerText = `ر.س ${this.mockData.profit}`;
            stats[2].innerText = this.mockData.active;
            stats[3].innerText = this.mockData.pending;
        }
    },

    // 2. تحديث لوحة التنبيهات الذكية والمؤشرات الحيوية للطرح
    updateAlertsBanner: function() {
        const bannerContainer = document.getElementById('mDetAlertsContainer');
        if (!bannerContainer) return;

        // تحديث النصوص الرئيسية للتنبيه
        const bannerTitle = bannerContainer.querySelector('.banner-header h4');
        const bannerDesc = bannerContainer.querySelector('.banner-header p');
        
        if (bannerTitle) bannerTitle.innerText = this.mockData.offeringAlert.title;
        if (bannerDesc) bannerDesc.innerText = this.mockData.offeringAlert.description;

        // جلب بطاقات المؤشرات الثلاثة لتحديث قيمها ديناميكياً
        const statBadges = bannerContainer.querySelectorAll('.stat-badge');
        
        if (statBadges.length >= 3) {
            // المؤشر الأول: الوقت المتبقي لانتهاء الطرح
            const timeText = statBadges[0].querySelector('.stat-info strong');
            if (timeText) timeText.innerText = this.mockData.offeringAlert.timeRemaining;

            // المؤشر الثاني: الأسهم المتبقية والمتاحة
            const sharesText = statBadges[1].querySelector('.stat-info strong');
            if (sharesText) sharesText.innerText = this.mockData.offeringAlert.sharesLeft;

            // المؤشر الثالث: حالة الطرح الحالية
            const statusText = statBadges[2].querySelector('.stat-info strong');
            if (statusText) statusText.innerText = this.mockData.offeringAlert.statusText;
        }
    },

    // 3. تفعيل وتحديث الرسم البياني (Chart.js)
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
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#e2e8f0' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
};

// تشغيل اللوحة البرمجية فور اكتمال تحميل هيكل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
