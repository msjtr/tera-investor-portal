/**
 * ============================================================
 * investments.js - ملف التحكم المركزي للاستثمارات (الإصدار الشامل)
 * ============================================================
 * تم توحيد حالات العرض الحية تحت مسمى "النشطة" لمنع التكرار
 * وتطوير العرض الشبكي ليتطابق بنيوياً مع خانات جدول القائمة.
 * ============================================================
 */

(function() {
    'use strict';

    if (window.InvestmentsManagerLoaded) return;
    window.InvestmentsManagerLoaded = true;

    // ============================================================
    // 1. قاعدة البيانات المركزية الموحدة الحالات (12 تجربة كاملة)
    // ============================================================
    window.mockData = [
        // 6 فرص: شراكة ممتدة
        { id: "TR-2026-06-20-001", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 10, reqEntity: "افراد", company: "تمويل أفراد - شراء احتياجات", sharesCount: 100, sharePrice: 100, capital: 10000, expectedProfit: 5000, roi: 50, duration: 6, offeringPeriod: "01/06/2026 - 15/06/2026", reqDate: "2026/05/20" },
        { id: "TR-2026-06-20-002", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 85, reqEntity: "افراد", company: "تمويل أفراد - زواج", sharesCount: 50, sharePrice: 500, capital: 25000, expectedProfit: 10000, roi: 40, duration: 6, offeringPeriod: "05/06/2026 - 20/06/2026", reqDate: "2026/05/25" },
        { id: "TR-2026-06-20-003", type: "شراكة ممتدة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 4, reqEntity: "افراد", company: "تمويل أفراد - ترميم منزل", sharesCount: 80, sharePrice: 200, capital: 16000, expectedProfit: 4800, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/05" },
        { id: "TR-2026-06-20-004", type: "شراكة ممتدة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - سيارة", sharesCount: 40, sharePrice: 1000, capital: 40000, expectedProfit: 8000, roi: 20, duration: 6, offeringPeriod: "15/04/2026 - 30/04/2026", reqDate: "2026/04/01" },
        { id: "TR-2026-06-20-005", type: "شراكة ممتدة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - شخصي", sharesCount: 100, sharePrice: 50, capital: 5000, expectedProfit: 2000, roi: 40, duration: 6, offeringPeriod: "10/03/2026 - 25/03/2026", reqDate: "2026/02/20" },
        { id: "TR-2026-06-20-006", type: "شراكة ممتدة", status: "المغلقة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - طبي", sharesCount: 20, sharePrice: 500, capital: 10000, expectedProfit: 4000, roi: 40, duration: 6, offeringPeriod: "05/02/2026 - 20/02/2026", reqDate: "2026/01/15" },
        
        // 6 فرص: فرصة شراكة
        { id: "FTR-2026-06-20-007", type: "فرصة شراكة", status: "النشطة", fundedPercentage: 20, reqEntity: "افراد", company: "فرصة شراكة - تأثيث منزل", sharesCount: 50, sharePrice: 1000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "02/06/2026 - 17/06/2026", reqDate: "2026/05/22" },
        { id: "FTR-2026-06-20-008", type: "فرصة شراكة", status: "النشطة", fundedPercentage: 95, daysLeftToJoin: 1, reqEntity: "افراد", company: "فرصة شراكة - سفر وسياحة", sharesCount: 20, sharePrice: 2000, capital: 40000, expectedProfit: 16000, roi: 40, duration: 6, offeringPeriod: "08/06/2026 - 23/06/2026", reqDate: "2026/05/28" },
        { id: "FTR-2026-06-20-009", type: "فرصة شراكة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 2, reqEntity: "افراد", company: "فرصة شراكة - استثمار مبدئي", sharesCount: 100, sharePrice: 200, capital: 20000, expectedProfit: 6000, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/15" },
        { id: "FTR-2026-06-20-010", type: "فرصة شراكة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - عقار سكني", sharesCount: 10, sharePrice: 5000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "10/04/2026 - 25/04/2026", reqDate: "2026/03/25" },
        { id: "FTR-2026-06-20-011", type: "فرصة شراكة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - تجارة إلكترونية", sharesCount: 20, sharePrice: 600, capital: 12000, expectedProfit: 4800, roi: 40, duration: 6, offeringPeriod: "05/03/2026 - 20/03/2026", reqDate: "2026/02/18" },
        { id: "FTR-2026-06-20-012", type: "فرصة شراكة", status: "الملغاة", fundedPercentage: 0, reqEntity: "افراد", company: "فرصة شراكة - تطبيق ذكي", sharesCount: 40, sharePrice: 1500, capital: 60000, expectedProfit: 30000, roi: 50, duration: 6, offeringPeriod: "14/06/2026 - 29/06/2026", reqDate: "2026/06/01" }
    ];

    window.formatMoneySafe = function(num) { return parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    window.getBadgeClass = function(s) { return s === 'النشطة' ? 'status-active' : (s === 'القادمة' ? 'status-upcoming' : 'status-completed'); };
    window.getTypeBadgeClass = function(t) { return t === 'شراكة ممتدة' ? 'type-extended' : 'type-opportunity'; };

    // إدارة تناغم الروابط وحفظ المعرف للـ SPA
    document.addEventListener('click', function(e) {
        let link = e.target.closest('a');
        if (link && link.href && link.href.includes('id=')) {
            try {
                let url = new URL(link.href);
                let id = url.searchParams.get('id');
                if (id) localStorage.setItem('tera_active_opp_id', id.trim().toLowerCase());
            } catch(err) {}
        }
    });

    function getSafeOppId() {
        let urlParams = new URLSearchParams(window.location.search);
        let id = urlParams.get('id');
        if (!id) id = localStorage.getItem('tera_active_opp_id');
        return id ? id.trim().toLowerCase() : null;
    }

    // ============================================================
    // 2. إدارة وتغذية صفحة السوق والمؤشرات والرسوم البيانية
    // ============================================================
    function initOpportunities() {
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
                gridCont.style.display = 'none'; if(listCont) listCont.style.display = 'none'; 
                return;
            } else {
                if(emptyState) emptyState.style.display = 'none';
                if(window.currentViewStyle === 'grid') { gridCont.style.display = 'grid'; if(listCont) listCont.style.display = 'none'; } 
                else { gridCont.style.display = 'none'; if(listCont) listCont.style.display = 'block'; }
            }

            data.forEach(item => {
                const badge = window.getBadgeClass(item.status), typeBadge = window.getTypeBadgeClass(item.type), detailUrl = `completed-investments.html?id=${item.id}`;
                
                // 🌟 العرض الشبكي المطور ليطابق حقول القائمة والجدول تماماً
                gridCont.innerHTML += `
                    <div class="opp-card">
                        <div class="opp-header">
                            <div><span class="type-badge ${typeBadge}">${item.type}</span><h3 style="margin-top:8px;">${item.company}</h3></div>
                            <span class="badge ${badge}">${item.status}</span>
                        </div>
                        <div class="progress-wrapper" style="padding: 10px 20px 0;">
                            <div class="progress-text"><span>نسبة الاكتمال</span><span>${item.fundedPercentage}%</span></div>
                            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${item.fundedPercentage}%"></div></div>
                        </div>
                        <div class="opp-body">
                            <div class="opp-metric"><span>الجهة الطالبة</span><strong>${item.reqEntity}</strong></div>
                            <div class="opp-metric"><span>فترة الطرح</span><strong style="font-size:11px;">${item.offeringPeriod}</strong></div>
                            <div class="opp-metric"><span>عدد الأسهم</span><strong>${item.sharesCount}</strong></div>
                            <div class="opp-metric"><span>قيمة السهم</span><strong>${window.formatMoneySafe(item.sharePrice)} ر.س</strong></div>
                            <div class="opp-metric" style="grid-column: span 2;"><span>إجمالي رأس المال</span><strong style="color:var(--tera-teal); font-size:15px;">${window.formatMoneySafe(item.capital)} ر.س</strong></div>
                        </div>
                        <div class="opp-footer">
                            <span style="font-size:12px; font-family:monospace; color:var(--tera-gray);">${item.id}</span>
                            <a href="${detailUrl}" class="btn-action btn-view"><i class="fas fa-book-open"></i> التفاصيل</a>
                        </div>
                    </div>`;

                listBody.innerHTML += `<tr><td style="font-family: monospace; font-weight: 700; color:var(--tera-navy);">${item.id}</td><td><span class="type-badge ${typeBadge}">${item.type}</span></td><td style="font-weight:700;">${item.reqEntity}</td><td style="font-family: monospace;">${item.offeringPeriod}</td><td style="font-weight: 800; color:var(--tera-navy);">${item.sharesCount}</td><td style="font-family:monospace;">${window.formatMoneySafe(item.sharePrice)}</td><td style="font-family:monospace; color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(item.capital)}</td><td><div style="display:flex; align-items:center; gap:8px;"><span style="font-weight:700; font-size:12px;">${item.fundedPercentage}%</span><div class="progress-bar-bg" style="width:60px; height:6px;"><div class="progress-bar-fill" style="width:${item.fundedPercentage}%"></div></div></div></td><td><span class="badge ${badge}">${item.status}</span></td><td><a href="${detailUrl}" class="btn-action btn-view">عرض</a></td></tr>`;
            });
        };

        window.applyFilters = function() {
            const typeFilter = document.getElementById('typeFilter'), statusFilter = document.getElementById('statusFilter'), searchInput = document.getElementById('searchInput');
            let typeVal = typeFilter ? typeFilter.value : 'all', statusVal = statusFilter ? statusFilter.value : 'all', searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

            let filtered = window.mockData.filter(d => {
                let mType = typeVal === 'all' || d.type === typeVal;
                let mStatus = (statusVal === 'all') ? true : (statusVal === 'النشطة' ? d.status === 'النشطة' : d.status === statusVal);
                let mSearch = d.id.toLowerCase().includes(searchVal) || d.company.toLowerCase().includes(searchVal);
                return mType && mStatus && mSearch;
            });

            window.renderOpportunities(filtered);
            
            let active = 0, upcoming = 0, completed = 0;
            filtered.forEach(d => {
                if(d.status === 'النشطة') active++;
                if(d.status === 'القادمة') upcoming++;
                if(d.status === 'المكتملة') completed++;
            });
            if(document.getElementById('sumActive')) document.getElementById('sumActive').innerText = active;
            if(document.getElementById('sumUpcoming')) document.getElementById('sumUpcoming').innerText = upcoming;
            if(document.getElementById('sumCompleted')) document.getElementById('sumCompleted').innerText = completed;

            try {
                if(typeof Chart !== 'undefined') {
                    let counts = { active:0, upcoming:0, finished:0, closed:0, cancelled:0, completed:0 };
                    filtered.forEach(d => {
                        if(d.status === 'النشطة') counts.active++;
                        else if(d.status === 'القادمة') counts.upcoming++;
                        else if(d.status === 'المنتهية') counts.finished++;
                        else if(d.status === 'المغلقة') counts.closed++;
                        else if(d.status === 'الملغاة') counts.cancelled++;
                        else if(d.status === 'المكتملة') counts.completed++;
                    });

                    const ctxStatus = document.getElementById('statusChart');
                    if(ctxStatus) {
                        if(window.statusChartInstance) window.statusChartInstance.destroy();
                        if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);
                        window.statusChartInstance = new Chart(ctxStatus, {
                            type: 'doughnut',
                            data: {
                                labels: ['النشطة', 'القادمة', 'المنتهية', 'المغلقة', 'الملغاة', 'المكتملة'],
                                datasets: [{ data: [counts.active, counts.upcoming, counts.finished, counts.closed, counts.cancelled, counts.completed], backgroundColor: ['#028090', '#10b981', '#cbd5e1', '#334155', '#ef4444', '#6366f1'], borderWidth: 0 }]
                            },
                            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', rtl: true, labels: { font: { family: 'Tajawal', size: 12 } } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 16 }, formatter: (v) => v > 0 ? v : '' } } }
                        });
                    }

                    const ctxOpp = document.getElementById('opportunitiesChart');
                    if(ctxOpp) {
                        if(window.oppChartInstance) window.oppChartInstance.destroy();
                        let mVal = filtered.length > 0 ? filtered[0].capital : 10000;
                        let cVal = Math.max(1, Math.floor(filtered.length / 6));
                        window.oppChartInstance = new Chart(ctxOpp, {
                            type: 'bar',
                            data: {
                                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                                datasets: [
                                    { type: 'line', label: 'إجمالي المبالغ', data: [mVal, mVal*1.5, mVal*2, mVal*3, mVal*4, mVal*5], borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.4, yAxisID: 'y1' },
                                    { type: 'bar', label: 'الفرص المطروحة', data: [cVal, cVal+1, cVal, cVal+2, cVal+1, filtered.length], backgroundColor: '#028090', borderRadius: 4, yAxisID: 'y' }
                                ]
                            },
                            options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: false } }, scales: { y: { position: 'right', grid: { display: false } }, y1: { position: 'left' } } }
                        });
                    }
                }
            } catch(e) {}
        };

        window.applyFilters();
    }

    // ============================================================
    // 3. تهيئة صفحة التفاصيل وعرض المؤشرات والدليل الاسترشادي
    // ============================================================
    function initInvestmentDetails() {
        if (!document.getElementById('mDetOppId')) return;

        let oppId = getSafeOppId();
        let opp = window.mockData.find(d => d.id.toLowerCase() === oppId) || window.mockData[0];

        document.getElementById('pageMainTitle').innerText = "تفاصيل الفرصة: " + opp.company;
        document.getElementById('mDetOppId').innerText = opp.id;
        document.getElementById('mDetOppCompany').innerText = opp.company;
        document.getElementById('mDetProgressText').innerText = opp.fundedPercentage + '%';
        document.getElementById('mDetProgressBar').style.width = opp.fundedPercentage + '%';
        document.getElementById('mDetOppStatus').innerText = opp.status;
        document.getElementById('mDetOfferingPeriod').innerText = opp.offeringPeriod;
        document.getElementById('mDetSharesCount').innerText = opp.sharesCount;
        document.getElementById('mDetSharePrice').innerText = window.formatMoneySafe(opp.sharePrice) + ' ر.س';
        document.getElementById('mDetTotalCapital').innerText = window.formatMoneySafe(opp.capital) + ' ر.س';
        document.getElementById('mDetRatio').innerText = opp.roi + "%";
        
        let typeBadgeEl = document.getElementById('mDetOppType');
        if(typeBadgeEl) {
            typeBadgeEl.innerText = opp.type;
            typeBadgeEl.className = opp.type === 'فرصة شراكة' ? 'type-badge type-opportunity' : 'type-badge type-extended';
        }

        document.getElementById('mDetReqDate').innerText = opp.reqDate || "2026/05/20";
        document.getElementById('mDetProductQty').innerText = opp.sharesCount * 5;
        document.getElementById('mDetProdVal').innerText = window.formatMoneySafe(opp.capital) + ' ر.س';
        document.getElementById('mDetProdPrice').innerText = window.formatMoneySafe(opp.sharePrice / 5) + ' ر.س';
        document.getElementById('mDetTax').innerText = window.formatMoneySafe(opp.capital * 0.15) + ' ر.س';
        document.getElementById('mDetTotalProd').innerText = window.formatMoneySafe(opp.capital * 1.15) + ' ر.س';

        const alertsCont = document.getElementById('mDetAlertsContainer');
        const joinWrapper = document.getElementById('joinActionWrapper');
        let availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        
        if (alertsCont) {
            alertsCont.innerHTML = ''; 
            if (opp.status === 'القادمة') {
                alertsCont.innerHTML = `<div class="alert-banner alert-info"><i class="fas fa-clock"></i><span>الفرصة قادمة: متبقي على الطرح ${opp.daysLeftToStart || 5} أيام.</span></div>`;
            } else if (opp.status === 'المنتهية') {
                alertsCont.innerHTML = `<div class="alert-banner alert-warning"><i class="fas fa-times-circle"></i><span>هذه الفرصة منتهية ولم تعد متاحة للانضمام.</span></div>`;
            } else if (opp.status === 'المغلقة') {
                alertsCont.innerHTML = `<div class="alert-banner alert-danger"><i class="fas fa-lock"></i><span>هذه الفرصة مغلقة.</span></div>`;
            } else if (opp.status === 'المكتملة') {
                alertsCont.innerHTML = `<div class="alert-banner alert-success"><i class="fas fa-check-circle"></i><span>هذه الفرصة مكتملة بنسبة 100%.</span></div>`;
            } else if (opp.status === 'الملغاة') {
                alertsCont.innerHTML = `<div class="alert-banner alert-danger"><i class="fas fa-ban"></i><span>هذه الفرصة ملغاة وتم إيقافها.</span></div>`;
            } else if (opp.status === 'النشطة') {
                let alertHtml = `<div class="alert-banner alert-success"><i class="fas fa-bolt"></i><span>هذه الفرصة نشطة ومتاحة للانضمام الآن. الأسهم المتاحة: ${availableSharesToBuy} سهم.</span></div>`;
                if(opp.fundedPercentage >= 80) alertHtml += `<div class="alert-banner alert-warning"><i class="fas fa-fire"></i><span>الفرصة قاربت على الاكتمال! (${opp.fundedPercentage}%).</span></div>`;
                alertsCont.innerHTML = alertHtml;
            }
        }

        const btnJoin = document.getElementById('btnRedirectToJoin');
        if (joinWrapper && btnJoin) {
            if (opp.status === 'النشطة' && availableSharesToBuy > 0) {
                joinWrapper.style.display = 'block';
                btnJoin.href = "cancelled-investments.html?id=" + opp.id;
            } else {
                joinWrapper.style.display = 'none';
            }
        }
    }

    // ============================================================
    // 4. تهيئة صفحة طلب الانضمام والعمليات الحسابية المتقدمة
    // ============================================================
    function initCancelledInvestments() {
        if (!document.getElementById('invOppName')) return;

        let oppId = getSafeOppId();
        let opp = window.mockData.find(d => d.id.toLowerCase() === oppId) || window.mockData[0];

        window.currentActiveOpp = opp;
        window.availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        if(window.availableSharesToBuy < 1) window.availableSharesToBuy = 0;
        
        window.selectedPackageType = 'basic';
        window.selectedPackageName = 'الباقة الأساسية';
        window.selectedPackageFixedFee = 0;

        document.getElementById('invOppName').innerText = opp.company;
        document.getElementById('invOppId').innerText = opp.id;
        document.getElementById('invSharePrice').innerText = window.formatMoneySafe(opp.sharePrice) + " ر.س";
        document.getElementById('invDuration').innerText = opp.duration + " أشهر";
        document.getElementById('maxShares').innerText = window.availableSharesToBuy;
        
        let badgeEl = document.getElementById('invOppTypeBadge');
        if(badgeEl) {
            badgeEl.innerText = opp.type;
            badgeEl.className = opp.type === 'فرصة شراكة' ? 'type-badge type-opportunity' : 'type-badge type-extended';
        }

        if (window.availableSharesToBuy >= 1) {
            document.getElementById('shareInput').value = 1;
            window.executeCalculations();
        } else {
            document.getElementById('shareInput').value = 0;
        }
        window.syncButtonsState();
    }

    window.executeCalculations = function() {
        let opp = window.currentActiveOpp;
        if(!opp || !document.getElementById('servicesTableBody')) return;

        let shares = parseInt(document.getElementById('shareInput').value) || 0;
        document.getElementById('extendedDetails').style.display = 'block';

        let duration = parseInt(opp.duration) || 6;
        let partnerCapital = shares * (parseFloat(opp.sharePrice) || 0); 
        let profitPerShare = (parseFloat(opp.expectedProfit) || 0) / (parseInt(opp.sharesCount) || 1);
        let totalProfit = shares * profitPerShare;
        
        let baseFeeAdmin = 20, baseFeeTransfer = 25, baseFeeCol = 100, pkgFee = window.selectedPackageFixedFee || 0;
        let totalBaseFees = baseFeeAdmin + baseFeeTransfer + baseFeeCol + pkgFee;
        let totalFeesVat = totalBaseFees * 0.15;
        let oppCostsWithVat = totalBaseFees + totalFeesVat; 

        let adminMonthly = (baseFeeAdmin * 1.15) / duration;
        let transMonthly = (baseFeeTransfer * 1.15) / duration;
        let colMonthly = (baseFeeCol * 1.15) / duration;
        let pkgMonthly = (pkgFee * 1.15) / duration;
        let totalMonthlyFinal = oppCostsWithVat / duration;

        document.getElementById('servicesTableBody').innerHTML = `
            <tr><td class="text-start">الرسوم الإدارية</td><td>${window.formatMoneySafe(baseFeeAdmin)}</td><td>${window.formatMoneySafe(baseFeeAdmin*0.15)}</td><td>${window.formatMoneySafe(baseFeeAdmin*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(adminMonthly)}</td><td class="notes">تخصم شهرياً</td></tr>
            <tr><td class="text-start">رسوم التحويل</td><td>${window.formatMoneySafe(baseFeeTransfer)}</td><td>${window.formatMoneySafe(baseFeeTransfer*0.15)}</td><td>${window.formatMoneySafe(baseFeeTransfer*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(transMonthly)}</td><td class="notes">تخصم شهرياً</td></tr>
            <tr><td class="text-start">رسوم التحصيل والمعالجة</td><td>${window.formatMoneySafe(baseFeeCol)}</td><td>${window.formatMoneySafe(baseFeeCol*0.15)}</td><td>${window.formatMoneySafe(baseFeeCol*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(colMonthly)}</td><td class="notes">تخصم شهرياً</td></tr>
            <tr><td class="text-start" style="color:var(--tera-teal);"><i class="fas fa-shield-alt"></i> ${window.selectedPackageName}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(pkgFee)}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(pkgFee*0.15)}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(pkgFee*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(pkgMonthly)}</td><td class="notes" style="color:var(--tera-teal);">تخصم شهرياً</td></tr>
            <tr class="total-row"><td class="text-start">الإجمالي للخدمات</td><td>${window.formatMoneySafe(totalBaseFees)}</td><td>${window.formatMoneySafe(totalFeesVat)}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(oppCostsWithVat)}</td><td style="color:var(--tera-teal); font-size:16px;">${window.formatMoneySafe(totalMonthlyFinal)}</td><td>-</td></tr>
        `;

        document.getElementById('txtBaseFees').innerText = window.formatMoneySafe(totalBaseFees) + " ر.س";
        document.getElementById('txtFeesVat').innerText = window.formatMoneySafe(totalFeesVat) + " ر.س";
        document.getElementById('txtTotalFeesWithVat').innerText = window.formatMoneySafe(oppCostsWithVat) + " ر.س";

        let isExtended = opp.type === 'شراكة ممتدة';
        let distTitle = document.getElementById('distTableTitleText');
        if(distTitle) distTitle.innerText = isExtended ? "جدول توزيع الدفعات (شراكة ممتدة)" : "جدول توزيع الدفعات (فرصة شراكة)";
        
        let theadHtml = `<tr><th>تاريخ التحصيل</th>`;
        if(!isExtended) theadHtml += `<th>رأس المال المسترد</th>`;
        theadHtml += `<th>الربح</th><th>إجمالي الدفعة</th><th>قيمة خصم الرسوم</th><th>المتبقي الصافي</th><th>ملاحظات</th></tr>`;
        document.getElementById('distributionTableHeader').innerHTML = theadHtml;

        let monthlyCapital = partnerCapital / duration;
        let monthlyProfit = totalProfit / duration;
        let distBody = '', tCap = 0, tProf = 0, tPay = 0, tFee = 0, tRem = 0;
        let startDate = new Date();

        for(let i = 1; i <= duration; i++) {
            let payDate = new Date(startDate); payDate.setMonth(startDate.getMonth() + i);
            let dateStr = payDate.getFullYear() + '/' + String(payDate.getMonth() + 1).padStart(2, '0') + '/15';
            
            if(isExtended) {
                let currentPayment = monthlyProfit;
                let currentRemaining = currentPayment - totalMonthlyFinal;
                distBody += `<tr><td>${dateStr}</td><td>${window.formatMoneySafe(monthlyProfit)}</td><td>${window.formatMoneySafe(currentPayment)}</td><td style="color:#ef4444;">${window.formatMoneySafe(totalMonthlyFinal)}</td><td style="color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(currentRemaining)}</td><td style="font-size:11px; color:#64748b;">توزيع أرباح</td></tr>`;
                tProf += monthlyProfit; tPay += currentPayment; tFee += totalMonthlyFinal; tRem += currentRemaining;
            } else {
                let monthlyTotalPayment = monthlyCapital + monthlyProfit;
                let monthlyRemaining = monthlyTotalPayment - totalMonthlyFinal;
                distBody += `<tr><td>${dateStr}</td><td>${window.formatMoneySafe(monthlyCapital)}</td><td>${window.formatMoneySafe(monthlyProfit)}</td><td>${window.formatMoneySafe(monthlyTotalPayment)}</td><td style="color:#ef4444;">${window.formatMoneySafe(totalMonthlyFinal)}</td><td style="color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(monthlyRemaining)}</td><td>مجدولة</td></tr>`;
                tCap += monthlyCapital; tProf += monthlyProfit; tPay += monthlyTotalPayment; tFee += totalMonthlyFinal; tRem += monthlyRemaining;
            }
        }
        
        distBody += `<tr class="total-row"><td class="text-start">الإجمالي</td>${!isExtended ? `<td>${window.formatMoneySafe(tCap)}</td>` : ''}<td>${window.formatMoneySafe(tProf)}</td><td>${window.formatMoneySafe(tPay)}</td><td style="color:#ef4444;">${window.formatMoneySafe(tFee)}</td><td style="color:var(--tera-teal); font-size:16px;">${window.formatMoneySafe(tRem)}</td><td>-</td></tr>`;
        
        if(isExtended && partnerCapital > 0) {
            document.getElementById('extendedCapitalNote').style.display = 'block';
            distBody += `<tr class="highlight-row"><td colspan="2" class="text-start" style="font-weight:800;">رأس المال المسترد (في نهاية المدة)</td><td colspan="4" style="text-align:center; font-weight:800; font-size:18px;">${window.formatMoneySafe(partnerCapital)} ر.س</td></tr>`;
        } else {
            document.getElementById('extendedCapitalNote').style.display = 'none';
        }

        document.getElementById('distributionTableBody').innerHTML = distBody;

        let netProfitFinal = totalProfit - oppCostsWithVat; 
        let totalReturnFinal = partnerCapital + netProfitFinal; 
        
        document.getElementById('finalPartnerCapital').innerText = window.formatMoneySafe(partnerCapital) + " ر.س";
        document.getElementById('finalOppCosts').innerText = window.formatMoneySafe(oppCostsWithVat) + " ر.س";
        document.getElementById('finalNetProfit').innerText = window.formatMoneySafe(netProfitFinal) + " ر.س";
        document.getElementById('finalDifference').innerText = window.formatMoneySafe(totalReturnFinal) + " ر.س";

        document.getElementById('sumShares').innerText = shares;
        document.getElementById('sumSharePrice').innerText = window.formatMoneySafe(opp.sharePrice) + " ر.س";
        document.getElementById('sumCapital').innerText = window.formatMoneySafe(partnerCapital) + " ر.س";
        document.getElementById('resToPayNow').innerText = shares > 0 ? window.formatMoneySafe(partnerCapital) + " ر.س" : "0.00 ر.س";
    };

    window.changeShares = function(delta) {
        let input = document.getElementById('shareInput');
        if(!input) return;
        let val = (parseInt(input.value) || 0) + delta;
        if (val >= 1 && val <= window.availableSharesToBuy) {
            input.value = val;
            window.syncButtonsState();
            window.executeCalculations();
        }
    };

    window.syncButtonsState = function() {
        let currentShares = parseInt(document.getElementById('shareInput').value) || 0;
        const btnMinus = document.getElementById('btnMinus'), btnPlus = document.getElementById('btnPlus');
        if(btnMinus) btnMinus.disabled = (currentShares <= 1);
        if(btnPlus) btnPlus.disabled = (currentShares >= window.availableSharesToBuy);
        window.togglePayButton();
    };

    window.selectPackage = function(el, type, name, feeValue) {
        document.querySelectorAll('.package-card').forEach(card => {
            card.classList.remove('selected');
            let radio = card.querySelector('input');
            if(radio) radio.checked = false;
        });
        el.classList.add('selected');
        let currentRadio = el.querySelector('input');
        if(currentRadio) currentRadio.checked = true;
        
        window.selectedPackageType = type;
        window.selectedPackageName = name;
        window.selectedPackageFixedFee = parseFloat(feeValue) || 0;
        window.executeCalculations();
    };

    window.togglePayButton = function() { 
        let shares = parseInt(document.getElementById('shareInput').value) || 0;
        let checkEl = document.getElementById('agreeCheckbox');
        let isChecked = checkEl ? checkEl.checked : false;
        const payBtn = document.getElementById('btnPayNow');
        if(payBtn) payBtn.disabled = !(isChecked && shares >= 1); 
    };

    window.processPayment = function() { 
        alert(`تمت عملية الدفع بنجاح!\nمرحباً بك كشريك في منصة تيرا.`); 
        window.location.href = "../dashboard/index.html"; 
    };

    // ============================================================
    // 5. موجه ومراقب التهيئة المركزي للـ SPA
    // ============================================================
    window.initInvestments = function() {
        initOpportunities();
        initInvestmentDetails();
        initCancelledInvestments();
    };

    new MutationObserver(() => {
        window.initInvestments();
    }).observe(document.body, { childList: true, subtree: true });

    window.initInvestments();

})();
