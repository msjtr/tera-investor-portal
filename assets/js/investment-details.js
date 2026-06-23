/**
 * ============================================================
 * 2. investment-details.js - سوق الفرص (النسخة الديناميكية الشاملة)
 * ============================================================
 */

(function() {
    'use strict';

    window.initOpportunities = function() {
        let gridCont = document.getElementById('gridContainer');
        let listBody = document.getElementById('listTableBody');
        
        // إذا لم تكن هذه العناصر موجودة، أوقف التنفيذ لمنع الأخطاء
        if (!gridCont && !listBody) return;

        window.currentViewStyle = window.currentViewStyle || 'list';

        window.switchView = function(view) {
            window.currentViewStyle = view;
            const gridBtn = document.getElementById('btnGrid'), listBtn = document.getElementById('btnList');
            if(gridBtn) gridBtn.classList.toggle('active', view === 'grid');
            if(listBtn) listBtn.classList.toggle('active', view === 'list');
            window.applyFilters();
        };

        window.renderOpportunities = function(data) {
            const listCont = document.getElementById('listContainer');
            const emptyState = document.getElementById('emptyState');
            if(!gridCont || !listBody) return;

            gridCont.innerHTML = ''; 
            listBody.innerHTML = '';
            
            if(data.length === 0) {
                if(emptyState) emptyState.style.display = 'block';
                gridCont.style.display = 'none'; 
                if(listCont) listCont.style.display = 'none'; 
                return;
            } else {
                if(emptyState) emptyState.style.display = 'none';
                if(window.currentViewStyle === 'grid') { 
                    gridCont.style.display = 'grid'; 
                    if(listCont) listCont.style.display = 'none'; 
                } else { 
                    gridCont.style.display = 'none'; 
                    if(listCont) listCont.style.display = 'block'; 
                }
            }

            data.forEach(item => {
                const badge = window.getBadgeClass(item.status);
                const typeBadge = window.getTypeBadgeClass(item.type);
                const detailUrl = 'completed-investments.html?id=' + item.id;
                
                gridCont.innerHTML += `
                    <div class="opp-card glass-panel">
                        <div class="opp-header">
                            <div><span class="type-badge ${typeBadge}">${item.type}</span></div>
                            <span class="badge ${badge}">${item.status}</span>
                        </div>
                        <div class="progress-wrapper" style="padding: 10px 20px 0;">
                            <div class="progress-text"><span>نسبة الاكتمال</span><span>${item.fundedPercentage}%</span></div>
                            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${item.fundedPercentage}%"></div></div>
                        </div>
                        <div class="opp-body">
                            <div class="opp-metric"><span>الجهة الطالبة</span><strong>${item.reqEntity}</strong></div>
                            <div class="opp-metric"><span>فترة الطرح</span><strong style="font-size:11px; font-family:monospace;">${item.offeringPeriod}</strong></div>
                            <div class="opp-metric"><span>عدد الأسهم</span><strong>${item.sharesCount}</strong></div>
                            <div class="opp-metric"><span>قيمة السهم</span><strong>${window.formatMoneySafe(item.sharePrice)} ر.س</strong></div>
                            <div class="opp-metric" style="grid-column: span 2;"><span>إجمالي رأس المال</span><strong style="color:var(--tera-teal); font-size:15px;">${window.formatMoneySafe(item.capital)} ر.س</strong></div>
                        </div>
                        <div class="opp-footer" style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0;">
                            <span style="font-size:12px; font-family:monospace; color:var(--tera-gray); font-weight:700;">${item.id}</span>
                            <a href="${detailUrl}" class="btn-action btn-view"><i class="fas fa-book-open"></i> التفاصيل</a>
                        </div>
                    </div>`;

                listBody.innerHTML += `
                    <tr>
                        <td style="font-family: monospace; font-weight: 700; color:var(--tera-navy);">${item.id}</td>
                        <td><span class="type-badge ${typeBadge}">${item.type}</span></td>
                        <td style="font-weight:700;">${item.reqEntity}</td>
                        <td style="font-family: monospace;">${item.offeringPeriod}</td>
                        <td style="font-weight: 800; color:var(--tera-navy);">${item.sharesCount}</td>
                        <td style="font-family:monospace;">${window.formatMoneySafe(item.sharePrice)}</td>
                        <td style="font-family:monospace; color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(item.capital)}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-weight:700; font-size:12px;">${item.fundedPercentage}%</span>
                                <div class="progress-bar-bg" style="width:60px; height:6px;"><div class="progress-bar-fill" style="width:${item.fundedPercentage}%"></div></div>
                            </div>
                        </td>
                        <td><span class="badge ${badge}">${item.status}</span></td>
                        <td><a href="${detailUrl}" class="btn-action btn-view">عرض</a></td>
                    </tr>`;
            });
        };

        window.applyFilters = function() {
            // تفعيل مفتاح الأمان لمنع المراقب المركزي من التدخل
            window.isFiltering = true;

            const typeFilter = document.getElementById('typeFilter');
            const statusFilter = document.getElementById('statusFilter');
            const searchInput = document.getElementById('searchInput');
            
            let typeVal = typeFilter ? typeFilter.value : 'all';
            let statusVal = statusFilter ? statusFilter.value : 'all';
            let searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

            let filtered = window.mockData.filter(d => {
                let mType = typeVal === 'all' || d.type === typeVal;
                let mStatus = (statusVal === 'all') ? true : (statusVal === 'النشطة_قائم' ? ['النشطة', 'قائم'].includes(d.status) : d.status === statusVal);
                let mSearch = d.id.toLowerCase().indexOf(searchVal) !== -1 || d.company.toLowerCase().indexOf(searchVal) !== -1;
                return mType && mStatus && mSearch;
            });

            window.renderOpportunities(filtered);
            
            // 1. حساب الحالات الحقيقية للدائرة البيانية
            let statusCounts = { active:0, upcoming:0, completed:0, ended:0, closed:0, cancelled:0 };
            filtered.forEach(d => {
                if(d.status === 'النشطة' || d.status === 'قائم') statusCounts.active++;
                else if(d.status === 'القادمة') statusCounts.upcoming++;
                else if(d.status === 'المكتملة') statusCounts.completed++;
                else if(d.status === 'المنتهية') statusCounts.ended++;
                else if(d.status === 'المغلقة') statusCounts.closed++;
                else if(d.status === 'الملغاة') statusCounts.cancelled++;
            });

            if(document.getElementById('sumActive')) document.getElementById('sumActive').innerText = statusCounts.active;
            if(document.getElementById('sumUpcoming')) document.getElementById('sumUpcoming').innerText = statusCounts.upcoming;
            if(document.getElementById('sumCompleted')) document.getElementById('sumCompleted').innerText = statusCounts.completed;

            // 2. حساب المبالغ الفعلية موزعة على الأشهر الستة للأعمدة البيانية
            let extendedCapital = [0, 0, 0, 0, 0, 0];
            let opportunityCapital = [0, 0, 0, 0, 0, 0];

            filtered.forEach(d => {
                if (d.reqDate) {
                    let parts = d.reqDate.split('/');
                    if (parts.length === 3) {
                        let monthIndex = parseInt(parts[1]) - 1; // 0 ليناير، 5 ليونيو
                        if (monthIndex >= 0 && monthIndex <= 5) {
                            if (d.type === 'شراكة ممتدة') extendedCapital[monthIndex] += d.capital;
                            else opportunityCapital[monthIndex] += d.capital;
                        }
                    }
                }
            });

            // 3. استدعاء الرسم البياني الفعلي والحي بالبيانات المحسوبة
            renderLiveCharts(statusCounts, extendedCapital, opportunityCapital);

            // إغلاق مفتاح الأمان بعد الانتهاء من رسم العناصر بفترة قصيرة جداً
            setTimeout(() => {
                window.isFiltering = false;
            }, 100);
        };

        // دالة الرسم البياني الديناميكية المدمجة
        function renderLiveCharts(counts, extCap, oppCap) {
            if (typeof Chart === 'undefined') return;

            // المخطط الدائري
            const statusCanvas = document.getElementById('statusChart');
            if (statusCanvas) {
                let existingChart = Chart.getChart('statusChart');
                if (existingChart) existingChart.destroy(); 
                
                new Chart(statusCanvas.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['نشطة', 'قادمة', 'مكتملة', 'منتهية', 'مغلقة', 'ملغاة'],
                        datasets: [{
                            data: [counts.active, counts.upcoming, counts.completed, counts.ended, counts.closed, counts.cancelled],
                            backgroundColor: ['#028090', '#10b981', '#6366f1', '#cbd5e1', '#334155', '#ef4444'],
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', rtl: true, labels: { font: { family: 'Tajawal', size: 11, weight: '700' }, color: '#334155' } },
                            datalabels: {
                                color: '#ffffff',
                                font: { family: 'Tajawal', weight: '800', size: 13 },
                                formatter: (value) => value > 0 ? value : ''
                            }
                        }
                    }
                });
            }

            // المخطط العمودي
            const oppCanvas = document.getElementById('opportunitiesChart');
            if (oppCanvas) {
                let existingOppChart = Chart.getChart('opportunitiesChart');
                if (existingOppChart) existingOppChart.destroy();

                new Chart(oppCanvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                        datasets: [
                            { label: 'شراكة ممتدة', data: extCap, backgroundColor: '#0A1B3F', borderRadius: 6 },
                            { label: 'فرصة شراكة', data: oppCap, backgroundColor: '#028090', borderRadius: 6 }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                grace: '20%',
                                grid: { color: '#f1f5f9' },
                                ticks: { font: { family: 'Tajawal', size: 11 }, callback: function(value) { return value.toLocaleString(); } }
                            },
                            x: { grid: { display: false }, ticks: { font: { family: 'Tajawal', size: 12, weight: '700' } } }
                        },
                        plugins: {
                            legend: { position: 'top', rtl: true, labels: { font: { family: 'Tajawal', size: 12, weight: '700' } } },
                            datalabels: {
                                anchor: 'end',
                                align: 'top',
                                offset: 5,
                                color: '#0A1B3F',
                                font: { family: 'Tajawal', weight: '800', size: 10 },
                                formatter: (value) => value > 0 ? value.toLocaleString() + ' ر.س' : ''
                            }
                        }
                    }
                });
            }
        }

        const marketAlertContainer = document.getElementById('marketAlertsWrapper');
        if (marketAlertContainer && !marketAlertContainer.hasAttribute('data-loaded')) {
            let htmlAlerts = '';
            let alertOpps = window.mockData.filter(d => ['النشطة', 'قائم', 'القادمة'].includes(d.status));
            
            if(typeof window.buildAlertBanner === 'function') {
                alertOpps.forEach(opp => {
                    htmlAlerts += window.buildAlertBanner(opp); 
                });
            }

            marketAlertContainer.innerHTML = htmlAlerts;
            marketAlertContainer.setAttribute('data-loaded', 'true');
        }

        window.applyFilters();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initOpportunities);
    } else {
        window.initOpportunities();
    }

})();
