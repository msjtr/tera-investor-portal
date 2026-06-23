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
            const listBody = document.getElementById('listTableBody'), listCont = document.getElementById('listContainer'), emptyState = document.getElementById('emptyState');
            if(!gridCont || !listBody) return;

            gridCont.innerHTML = ''; listBody.innerHTML = '';
            
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
                const badge = window.getBadgeClass(item.status), typeBadge = window.getTypeBadgeClass(item.type), detailUrl = 'completed-investments.html?id=' + item.id;
                gridCont.innerHTML += `<div class="opp-card"><div class="opp-header"><div><span class="type-badge ${typeBadge}">${item.type}</span><h3 style="margin-top:8px;">${item.company}</h3></div><span class="badge ${badge}">${item.status}</span></div><div class="progress-wrapper" style="padding: 10px 20px 0;"><div class="progress-text"><span>نسبة الاكتمال</span><span>${item.fundedPercentage}%</span></div><div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${item.fundedPercentage}%"></div></div></div><div class="opp-body"><div class="opp-metric"><span>قيمة السهم</span><strong>${window.formatMoneySafe(item.sharePrice)}</strong></div><div class="opp-metric"><span>إجمالي رأس المال</span><strong style="color:var(--tera-teal);">${window.formatMoneySafe(item.capital)}</strong></div><div class="opp-metric"><span>المدة</span><strong>${item.duration} شهر</strong></div><div class="opp-metric"><span>عدد الأسهم</span><strong>${item.sharesCount}</strong></div></div><div class="opp-footer"><span style="font-size:12px; font-family:monospace; color:var(--tera-gray);">${item.id}</span><a href="${detailUrl}" class="btn-action btn-view"><i class="fas fa-book-open"></i> التفاصيل</a></div></div>`;
                listBody.innerHTML += `<tr><td style="font-family: monospace; font-weight: 700; color:var(--tera-navy);">${item.id}</td><td><span class="type-badge ${typeBadge}">${item.type}</span></td><td style="font-weight:700;">${item.reqEntity}</td><td style="font-family: monospace;">${item.offeringPeriod}</td><td style="font-weight: 800; color:var(--tera-navy);">${item.sharesCount}</td><td style="font-family:monospace;">${window.formatMoneySafe(item.sharePrice)}</td><td style="font-family:monospace; color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(item.capital)}</td><td><div style="display:flex; align-items:center; gap:8px;"><span style="font-weight:700; font-size:12px;">${item.fundedPercentage}%</span><div class="progress-bar-bg" style="width:60px; height:6px;"><div class="progress-bar-fill" style="width:${item.fundedPercentage}%"></div></div></div></td><td><span class="badge ${badge}">${item.status}</span></td><td><a href="${detailUrl}" class="btn-action btn-view">عرض</a></td></tr>`;
            });
        };

        window.applyFilters = function() {
            const typeFilter = document.getElementById('typeFilter'), statusFilter = document.getElementById('statusFilter'), searchInput = document.getElementById('searchInput');
            let typeVal = typeFilter ? typeFilter.value : 'all', statusVal = statusFilter ? statusFilter.value : 'all', searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

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
        };

        window.applyFilters();
    };

})();
