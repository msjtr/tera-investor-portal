/* ============================================================
   TERA INVESTOR PORTAL - DASHBOARD & INVESTMENT LOGIC
   ============================================================ */

const Dashboard = {
    // البيانات الوهمية (تجارب واقعية جاهزة للربط بالـ API لاحقاً)
    mockData: {
        portfolioValue: "124,500.00",
        activeContracts: "6 عقود نشطة",
        walletBalance: "15,500.00",
        
        // بيانات الرسم البياني لتطور المحفظة
        chartLabels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
        chartValues: [100000, 105000, 112000, 115000, 120000, 124500],

        // بيانات لوحة التنبيهات الذكية (لصفحات تفاصيل الفرص إن وجدت)
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

    // 1. تحديث بطاقات الإحصائيات الرئيسية في لوحة التحكم
    updateStats: function() {
        // نستهدف البطاقات الموجودة في لوحة التحكم
        const stats = document.querySelectorAll('.stats-grid .stat-value');
        if (stats.length >= 3) {
            stats[0].innerText = `${this.mockData.portfolioValue} ر.س`;
            stats[1].innerText = this.mockData.activeContracts;
            stats[2].innerText = `${this.mockData.walletBalance} ر.س`;
        }
    },

    // 2. تحديث لوحة التنبيهات الذكية والمؤشرات الحيوية للطرح (آمنة ولا تسبب تعارض)
    updateAlertsBanner: function() {
        const bannerContainer = document.getElementById('mDetAlertsContainer');
        if (!bannerContainer) return; // الخروج بأمان إذا لم نكن في صفحة تفاصيل الفرصة

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
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;

        // تدمير الرسم البياني القديم إن وجد لمنع التداخل عند التحديث
        if (window.myDashboardChart) {
            window.myDashboardChart.destroy();
        }

        window.myDashboardChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.mockData.chartLabels,
                datasets: [{
                    label: 'قيمة تقييم المحفظة الاستثمارية (ر.س)',
                    data: this.mockData.chartValues,
                    borderColor: '#028090',
                    backgroundColor: 'rgba(2, 128, 144, 0.05)',
                    borderWidth: 3,
                    pointBackgroundColor: '#028090',
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.35
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
                        beginAtZero: false,
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { family: 'monospace' } }
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
