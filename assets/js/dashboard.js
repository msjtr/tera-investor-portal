/**
 * ========================================
 * dashboard.js - منطق لوحة التحكم
 * ========================================
 */

(function() {
    'use strict';

    // دالة لتهيئة الرسم البياني (Chart.js)
    function initPerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas) return;

        // التأكد من تحميل Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('مكتبة Chart.js غير محملة، يرجى إضافتها.');
            return;
        }

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1', '5', '10', '15', '20', '25', '30'],
                datasets: [{
                    label: 'قيمة المحفظة ($)',
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
                        labels: {
                            font: {
                                family: 'Tajawal'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '$ ' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$ ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    // دالة لتحميل بيانات إضافية (وهمية) يمكن استبدالها بـ API لاحقاً
    function loadDashboardStats() {
        // يمكن وضع كود لجلب البيانات من الخادم هنا
        console.log('تم تحميل إحصائيات لوحة التحكم (بيانات وهمية)');
    }

    // تهيئة لوحة التحكم
    function initDashboard() {
        loadDashboardStats();
        // استخدام setTimeout للتأكد من ظهور الـ canvas بشكل صحيح
        setTimeout(initPerformanceChart, 200);
    }

    // تشغيل عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', function() {
        // التأكد من أننا في صفحة لوحة التحكم (يمكن التحقق من وجود عنصر معين)
        if (document.querySelector('.dashboard-content')) {
            initDashboard();
            console.log('تم تهيئة dashboard.js بنجاح 📊');
        }
    });

})();
