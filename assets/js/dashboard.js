/**
 * ========================================
 * dashboard.js - منطق لوحة التحكم (بالريال)
 * ========================================
 */

(function() {
    'use strict';

    // متغير عام لتخزين مرجع الرسم البياني
    let performanceChartInstance = null;

    function initPerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas) {
            console.warn('عنصر performanceChart غير موجود.');
            return;
        }

        // التأكد من تحميل Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('مكتبة Chart.js غير محملة، يرجى إضافتها.');
            return;
        }

        // **حل مشكلة التهيئة المزدوجة**: تدمير المثيل السابق إن وجد
        if (performanceChartInstance) {
            performanceChartInstance.destroy();
            performanceChartInstance = null;
        }

        // التحقق مما إذا كان الـ canvas مرتبطاً بمخطط سابق (حل بديل)
        // Chart.js يخزن المثيل في خاصية __chartjs
        if (canvas.__chartjs) {
            canvas.__chartjs.destroy();
            delete canvas.__chartjs;
        }

        const ctx = canvas.getContext('2d');
        performanceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1', '5', '10', '15', '20', '25', '30'],
                datasets: [{
                    label: 'قيمة المحفظة (ر.س)',
                    data: [12000, 12500, 12300, 13000, 12800, 13500, 14000],
                    borderColor: '#0D6EFD',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#0D6EFD',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { font: { family: 'Tajawal' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'ر.س ' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return 'ر.س ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        console.log('تم إنشاء الرسم البياني بنجاح ✅');
    }

    function loadDashboardStats() {
        console.log('تم تحميل إحصائيات لوحة التحكم (بالريال السعودي)');
        // هنا يمكن إضافة كود لجلب البيانات من API
    }

    function initDashboard() {
        loadDashboardStats();
        // تأخير بسيط للتأكد من تحميل DOM وعنصر canvas بشكل كامل
        setTimeout(initPerformanceChart, 300);
    }

    // تشغيل عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', function() {
        // التأكد من أننا في صفحة لوحة التحكم
        if (document.querySelector('.dashboard-content')) {
            initDashboard();
            console.log('تم تهيئة dashboard.js بالريال 🚀');
        }
    });

})();
