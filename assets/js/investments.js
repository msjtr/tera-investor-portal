/**
 * ============================================================
 * investments.js - ملف التحكم المركزي للاستثمارات
 * ============================================================
 * 1. قاعدة البيانات المركزية (12 فرصة).
 * 2. دوال عرض السوق والرسوم البيانية.
 * 3. دوال تفاصيل الفرصة والآلة الحاسبة.
 * 4. نظام مراقبة التغيير للـ SPA.
 * ============================================================
 */

(function() {
    'use strict';

    if (window.InvestmentsManagerLoaded) return;
    window.InvestmentsManagerLoaded = true;

    // 0. قاعدة البيانات المركزية (12 تجربة كاملة)
    window.mockData = [
        // 6 فرص: شراكة ممتدة
        { id: "TR-2026-06-20-001", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 10, reqEntity: "افراد", company: "تمويل أفراد - شراء احتياجات", sharesCount: 100, sharePrice: 100, capital: 10000, expectedProfit: 5000, roi: 50, duration: 6, offeringPeriod: "01/06/2026 - 15/06/2026", reqDate: "2026/05/20" },
        { id: "TR-2026-06-20-002", type: "شراكة ممتدة", status: "قائم", fundedPercentage: 85, reqEntity: "افراد", company: "تمويل أفراد - زواج", sharesCount: 50, sharePrice: 500, capital: 25000, expectedProfit: 10000, roi: 40, duration: 6, offeringPeriod: "05/06/2026 - 20/06/2026", reqDate: "2026/05/25" },
        { id: "TR-2026-06-20-003", type: "شراكة ممتدة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 4, reqEntity: "افراد", company: "تمويل أفراد - ترميم منزل", sharesCount: 80, sharePrice: 200, capital: 16000, expectedProfit: 4800, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/05" },
        { id: "TR-2026-06-20-004", type: "شراكة ممتدة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - سيارة", sharesCount: 40, sharePrice: 1000, capital: 40000, expectedProfit: 8000, roi: 20, duration: 6, offeringPeriod: "15/04/2026 - 30/04/2026", reqDate: "2026/04/01" },
        { id: "TR-2026-06-20-005", type: "شراكة ممتدة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - شخصي", sharesCount: 100, sharePrice: 50, capital: 5000, expectedProfit: 2000, roi: 40, duration: 6, offeringPeriod: "10/03/2026 - 25/03/2026", reqDate: "2026/02/20" },
        { id: "TR-2026-06-20-006", type: "شراكة ممتدة", status: "المغلقة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - طبي", sharesCount: 20, sharePrice: 500, capital: 10000, expectedProfit: 4000, roi: 40, duration: 6, offeringPeriod: "05/02/2026 - 20/02/2026", reqDate: "2026/01/15" },
        
        // 6 فرص: فرصة شراكة
        { id: "FTR-2026-06-20-007", type: "فرصة شراكة", status: "النشطة", fundedPercentage: 20, reqEntity: "افراد", company: "فرصة شراكة - تأثيث منزل", sharesCount: 50, sharePrice: 1000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "02/06/2026 - 17/06/2026", reqDate: "2026/05/22" },
        { id: "FTR-2026-06-20-008", type: "فرصة شراكة", status: "قائم", fundedPercentage: 95, daysLeftToJoin: 1, reqEntity: "افراد", company: "فرصة شراكة - سفر وسياحة", sharesCount: 20, sharePrice: 2000, capital: 40000, expectedProfit: 16000, roi: 40, duration: 6, offeringPeriod: "08/06/2026 - 23/06/2026", reqDate: "2026/05/28" },
        { id: "FTR-2026-06-20-009", type: "فرصة شراكة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 2, reqEntity: "افراد", company: "فرصة شراكة - استثمار مبدئي", sharesCount: 100, sharePrice: 200, capital: 20000, expectedProfit: 6000, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/15" },
        { id: "FTR-2026-06-20-010", type: "فرصة شراكة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - عقار سكني", sharesCount: 10, sharePrice: 5000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "10/04/2026 - 25/04/2026", reqDate: "2026/03/25" },
        { id: "FTR-2026-06-20-011", type: "فرصة شراكة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - تجارة إلكترونية", sharesCount: 20, sharePrice: 600, capital: 12000, expectedProfit: 4800, roi: 40, duration: 6, offeringPeriod: "05/03/2026 - 20/03/2026", reqDate: "2026/02/18" },
        { id: "FTR-2026-06-20-012", type: "فرصة شراكة", status: "الملغاة", fundedPercentage: 0, reqEntity: "افراد", company: "فرصة شراكة - تطبيق ذكي", sharesCount: 40, sharePrice: 1500, capital: 60000, expectedProfit: 30000, roi: 50, duration: 6, offeringPeriod: "14/06/2026 - 29/06/2026", reqDate: "2026/06/01" }
    ];

    window.formatMoneySafe = function(num) { return parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    window.getBadgeClass = function(s) { return ['قائم', 'النشطة'].includes(s) ? 'status-active' : (s === 'القادمة' ? 'status-upcoming' : 'status-completed'); };
    window.getTypeBadgeClass = function(t) { return t === 'شراكة ممتدة' ? 'type-extended' : 'type-opportunity'; };

    // ============================================================
    // تهيئة الصفحات
    // ============================================================
    function initOpportunities() {
        if (!document.getElementById('gridContainer')) return;
        window.renderOpportunities = function(data) {
            const gridCont = document.getElementById('gridContainer'), listBody = document.getElementById('listTableBody');
            gridCont.innerHTML = ''; listBody.innerHTML = '';
            data.forEach(item => {
                const badge = window.getBadgeClass(item.status), typeBadge = window.getTypeBadgeClass(item.type);
                gridCont.innerHTML += `<div class="opp-card"><div class="opp-header"><div><span class="type-badge ${typeBadge}">${item.type}</span><h3>${item.company}</h3></div><span class="badge ${badge}">${item.status}</span></div><div class="opp-body"><div class="opp-metric"><span>قيمة السهم</span><strong>${window.formatMoneySafe(item.sharePrice)}</strong></div><div class="opp-metric"><span>رأس المال</span><strong>${window.formatMoneySafe(item.capital)}</strong></div></div><div class="opp-footer"><span>${item.id}</span><a href="completed-investments.html?id=${item.id}" class="btn-action btn-view">التفاصيل</a></div></div>`;
                listBody.innerHTML += `<tr><td>${item.id}</td><td>${item.type}</td><td>${item.reqEntity}</td><td>${item.offeringPeriod}</td><td>${item.sharesCount}</td><td>${window.formatMoneySafe(item.sharePrice)}</td><td>${window.formatMoneySafe(item.capital)}</td><td>${item.fundedPercentage}%</td><td><span class="badge ${badge}">${item.status}</span></td><td><a href="completed-investments.html?id=${item.id}" class="btn-action btn-view">عرض</a></td></tr>`;
            });
        };
        window.applyFilters = function() { window.renderOpportunities(window.mockData); };
        window.applyFilters();
    }

    function initInvestmentDetails() {
        if (!document.getElementById('mDetOppId')) return;
        const id = new URLSearchParams(window.location.search).get('id')?.trim().toLowerCase();
        let opp = window.mockData.find(d => d.id.toLowerCase() === id) || window.mockData[0];
        document.getElementById('mDetOppId').innerText = opp.id;
        document.getElementById('mDetOppCompany').innerText = opp.company;
        const btnJoin = document.getElementById('btnRedirectToJoin');
        if (btnJoin) btnJoin.href = "cancelled-investments.html?id=" + opp.id;
    }

    function initCancelledInvestments() {
        if (!document.getElementById('invOppName')) return;
        const id = new URLSearchParams(window.location.search).get('id')?.trim().toLowerCase();
        let opp = window.mockData.find(d => d.id.toLowerCase() === id) || window.mockData[0];
        window.currentActiveOpp = opp;
        window.availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        document.getElementById('invOppName').innerText = opp.company;
        document.getElementById('invOppId').innerText = opp.id;
        document.getElementById('maxShares').innerText = window.availableSharesToBuy;
        document.getElementById('shareInput').value = 1;
    }

    // تهيئة تلقائية
    function initInvestments() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('investment-details')) initOpportunities();
        else if (path.includes('completed-investments')) initInvestmentDetails();
        else if (path.includes('cancelled-investments')) initCancelledInvestments();
    }

    window.initInvestments = initInvestments;
    new MutationObserver(initInvestments).observe(document, {subtree: true, childList: true});
    initInvestments();

})();
