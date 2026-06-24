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
        chartValues: [100000, 105000, 112000, 115000, 120000, 124500],

        // بيانات لوحة المؤشرات الذكية وحالة الطرح (لصفحات تفاصيل الفرص)
        offeringAlert: {
            title: "فرصة استثمارية نشطة",
            description: "سارع بالانضمام، الطلب عالي على هذه الفرصة والأسهم تنفد بسرعة.",
            timeRemaining: "3 أيام و 14 ساعة",
            sharesLeft: "15 سهم فقط !",
            statusText: "متاح للانضمام"
        }
    },

    init: function() {
        console.log("✅ Tera Dashboard & Investment Logic Initialized");
        this.updateStats();
        this.updateAlertsBanner();
        this.renderChart();
    },

    // 1. تحديث بطاقات المؤشرات المالية الرئيسية بالتوافق مع الـ HTML المحدث
    updateStats: function() {
        const stats = document.querySelectorAll('.stats-grid .stat-value');
        if (stats && stats.length >= 3) {
            stats[0].innerText = `${this.mockData.portfolioValue} ر.س`;
            stats[1].innerText = this.mockData.activeContracts;
            stats[2].innerText = `${this.mockData.walletBalance} ر.س`;
        }
    },

    // 2. تحديث مؤشرات الطرح والتنبيهات الذكية بأمان كامل لمنع الأخطاء البرمجية
    updateAlertsBanner: function() {
        const bannerContainer = document.getElementById('mDetAlertsContainer');
        if (!bannerContainer) return; // الخروج الآمن في حال عدم التواجد بصفحة تفاصيل الفرصة

        const bannerTitle = bannerContainer.querySelector('.banner-header h4');
        const bannerDesc = bannerContainer.querySelector('.banner-header p');
        
        if (bannerTitle) bannerTitle.innerText = this.mockData.offeringAlert.title;
        if (bannerDesc) bannerDesc.innerText = this.mockData.offeringAlert.description;

        const statBadges = bannerContainer.querySelectorAll('.stat-badge');
        if (statBadges && statBadges.length >= 3) {
            const timeText = statBadges[0].querySelector('.stat-info strong');
            if (timeText) timeText.innerText = this.mockData.offeringAlert.timeRemaining;

            const sharesText = statBadges[1].querySelector('.stat-info strong');
            if (sharesText) sharesText.innerText = this.mockData.offeringAlert.sharesLeft;

            const statusText = statBadges[2].querySelector('.stat-info strong');
            if (statusText) statusText.innerText = this.mockData.offeringAlert.statusText;
        }
    },

    // 3. بناء وتخصيص الرسم البياني الفاخر باستخدام التدرج اللوني (Gradient) ومتوافق مع الهوية
    renderChart: function() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;

        // التحقق من تحميل مكتبة Chart.js بنجاح لتجنب أي تعطل في الكود
        if (typeof Chart === 'undefined') {
            console.warn("⚠️ مكتبة Chart.js غير مدمجة في هذه الصفحة.");
            return;
        }

        // تدمير الرسم القديم إن وجد لمنع تداخل الرسوم عند إعادة التحميل
        if (window.myDashboardChart) {
            window.myDashboardChart.destroy();
        }

        // إنشاء تدرج لوني احترافي مخصص (Linear Gradient) تحت منحنى الرسم البياني
        const chartContext = ctx.getContext('2d');
        const gradient = chartContext.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(2, 128, 144, 0.25)'); // لون تيرا الفيروزي الشفاف بالأعلى
        gradient.addColorStop(1, 'rgba(2, 128, 144, 0.00)'); // يتلاشى بالكامل في الأسفل

        window.myDashboardChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.mockData.chartLabels,
                datasets: [{
                    label: 'تقييم المحفظة (ر.س)',
                    data: this.mockData.chartValues,
                    borderColor: '#028090', // لون تيرا الفيروزي الأساسي (Teal)
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#0A1B3F', // لون كحلي داكن لنقاط الارتكاز (Navy)
                    pointBorderColor: '#028090',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#028090',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    fill: true,
                    tension: 0.4 // انحناء مرن وانسيابي للحصول على مظهر عصري
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }, // إخفاء المربع التوضيحي الافتراضي لزيادة مساحة العرض
                    tooltip: {
                        backgroundColor: '#0A1B3F', // خلفية التلميحات باللون الكحلي الفاخر لـ Tera
                        titleFont: { family: 'Tajawal', size: 13, weight: 'bold' },
                        bodyFont: { family: 'Tajawal', size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        rtl: true,
                        textDirection: 'rtl',
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: '#f1f5f9' },
                        position: 'right', // نقل المحور لليمين ليناسب القراءة والتصفح باللغة العربية
                        ticks: {
                            color: '#64748b',
                            font: { family: 'Tajawal', size: 11, weight: '600' },
                            callback: function(value) {
                                return value.toLocaleString('ar-EG') + ' ر.س'; // تنسيق مالي للأرقام مع العملة
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#64748b',
                            font: { family: 'Tajawal', size: 12, weight: '700' }
                        }
                    }
                }
            }
        });
    }
};

// تشغيل اللوحة البرمجية فور اكتمال تحميل هيكل الصفحة الأساسي
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
