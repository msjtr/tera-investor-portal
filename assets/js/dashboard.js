(function() {
    'use strict';

    function initPerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas) return;
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
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
    }

    function loadDashboardStats() {
        console.log('تم تحميل إحصائيات لوحة التحكم (بالريال السعودي)');
    }

    function initDashboard() {
        loadDashboardStats();
        setTimeout(initPerformanceChart, 200);
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (document.querySelector('.dashboard-content')) {
            initDashboard();
            console.log('تم تهيئة dashboard.js بالريال ✅');
        }
    });
})();
