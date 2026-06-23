/**
 * ============================================================
 * 2. investment-details.js - سوق الفرص والشركات المطروحة
 * ============================================================
 */

(function() {
    'use strict';

    window.initOpportunities = function() {
        let gridCont = document.getElementById('gridContainer');
        if (!gridCont) return;

        window.currentViewStyle = window.currentViewStyle || 'list';

        window.switchView = function(view) {
            window.currentViewStyle = view;
            const gridBtn = document.getElementById('btnGrid'), listBtn = document.getElementById('btnList');
            if(gridBtn) gridBtn.classList.toggle('active', view === 'grid');
            if(listBtn) listBtn.classList.toggle('active', view === 'list');
            window.applyFilters();
        };

        window.renderOpportunities = function(data) {
            const listBody = document.getElementById('listTableBody');
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
            
            let active = 0, upcoming = 0, completed = 0;
            filtered.forEach(d => {
                if(d.status === 'النشطة' || d.status === 'قائم') active++;
                if(d.status === 'القادمة') upcoming++;
                if(d.status === 'المكتملة') completed++;
            });
            if(document.getElementById('sumActive')) document.getElementById('sumActive').innerText = active;
            if(document.getElementById('sumUpcoming')) document.getElementById('sumUpcoming').innerText = upcoming;
            if(document.getElementById('sumCompleted')) document.getElementById('sumCompleted').innerText = completed;

            // تحديث الرسوم البيانية المؤتمتة
            try {
                if(typeof Chart !== 'undefined') {
                    let counts = { active:active, upcoming:upcoming, finished:0, closed:0, cancelled:0, completed:completed };
                    filtered.forEach(d => {
                        if(d.status === 'المنتهية') counts.finished++;
                        else if(d.status === 'المغلقة') counts.closed++;
                        else if(d.status === 'الملغاة') counts.cancelled++;
                    });

                    const ctxStatus = document.getElementById('statusChart');
                    if(ctxStatus) {
                        let existingChart = Chart.getChart(ctxStatus);
                        if(existingChart) {
                            existingChart.data.datasets[0].data = [counts.active, counts.upcoming, counts.finished, counts.closed, counts.cancelled, counts.completed];
                            existingChart.update();
                        } else {
                            if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);
                            new Chart(ctxStatus, {
                                type: 'doughnut',
                                data: {
                                    labels: ['النشطة', 'القادمة', 'المنتهية', 'المغلقة', 'الملغاة', 'المكتملة'],
                                    datasets: [{ data: [counts.active, counts.upcoming, counts.finished, counts.closed, counts.cancelled, counts.completed], backgroundColor: ['#028090', '#10b981', '#cbd5e1', '#334155', '#ef4444', '#6366f1'], borderWidth: 0 }]
                                },
                                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', rtl: true } } }
                            });
                        }
                    }

                    const ctxOpp = document.getElementById('opportunitiesChart');
                    if(ctxOpp) {
                        let existingOppChart = Chart.getChart(ctxOpp);
                        let mVal = filtered.length > 0 ? filtered[0].capital : 10000;
                        let cVal = Math.max(1, Math.floor(filtered.length / 6));
                        if(existingOppChart) {
                            existingOppChart.data.datasets[0].data = [mVal, mVal*1.5, mVal*2, mVal*3, mVal*4, mVal*5];
                            existingOppChart.data.datasets[1].data = [cVal, cVal+1, cVal, cVal+2, cVal+1, filtered.length];
                            existingOppChart.update();
                        } else {
                            new Chart(ctxOpp, {
                                type: 'bar',
                                data: {
                                    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                                    datasets: [
                                        { type: 'line', label: 'إجمالي المبالغ', data: [mVal, mVal*1.5, mVal*2, mVal*3, mVal*4, mVal*5], borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.4, yAxisID: 'y1' },
                                        { type: 'bar', label: 'الفرص المطروحة', data: [cVal, cVal+1, cVal, cVal+2, cVal+1, filtered.length], backgroundColor: '#028090', borderRadius: 4, yAxisID: 'y' }
                                    ]
                                },
                                options: { responsive: true, maintainAspectRatio: false }
                            });
                        }
                    }
                }
            } catch(e) {}
        };

        // توليد التنبيهات في لوحة عرض السوق بشكل مسبق (يجلب جميع الفرص النشطة والقادمة)
        const marketAlertContainer = document.getElementById('marketAlertsWrapper');
        if (marketAlertContainer && !marketAlertContainer.hasAttribute('data-loaded')) {
            let htmlAlerts = '';
            
            // جلب (جميع) الفرص المتاحة والقادمة لكلا النوعين
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

})();
