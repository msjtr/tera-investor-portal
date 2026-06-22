/**
 * ============================================================
 * investments.js - ملف التحكم المركزي للاستثمارات (SPA Smart Fix)
 * ============================================================
 * 1. تمرير الـ ID عبر localStorage لحماية البيانات من ضياع الروابط.
 * 2. نظام مراقبة ذكي (Smart Observer) يعبئ البيانات فور ظهور الصفحة.
 * ============================================================
 */

(function() {
    'use strict';

    if (window.InvestmentsManagerLoaded) return;
    window.InvestmentsManagerLoaded = true;

    // ============================================================
    // 1. قاعدة البيانات (12 فرصة)
    // ============================================================
    window.mockData = [
        { id: "TR-2026-06-20-001", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 10, reqEntity: "افراد", company: "تمويل أفراد - شراء احتياجات", sharesCount: 100, sharePrice: 100, capital: 10000, expectedProfit: 5000, roi: 50, duration: 6, offeringPeriod: "01/06/2026 - 15/06/2026", reqDate: "2026/05/20" },
        { id: "TR-2026-06-20-002", type: "شراكة ممتدة", status: "قائم", fundedPercentage: 85, reqEntity: "افراد", company: "تمويل أفراد - زواج", sharesCount: 50, sharePrice: 500, capital: 25000, expectedProfit: 10000, roi: 40, duration: 6, offeringPeriod: "05/06/2026 - 20/06/2026", reqDate: "2026/05/25" },
        { id: "TR-2026-06-20-003", type: "شراكة ممتدة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 4, reqEntity: "افراد", company: "تمويل أفراد - ترميم منزل", sharesCount: 80, sharePrice: 200, capital: 16000, expectedProfit: 4800, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/05" },
        { id: "TR-2026-06-20-004", type: "شراكة ممتدة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - سيارة", sharesCount: 40, sharePrice: 1000, capital: 40000, expectedProfit: 8000, roi: 20, duration: 6, offeringPeriod: "15/04/2026 - 30/04/2026", reqDate: "2026/04/01" },
        { id: "TR-2026-06-20-005", type: "شراكة ممتدة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - شخصي", sharesCount: 100, sharePrice: 50, capital: 5000, expectedProfit: 2000, roi: 40, duration: 6, offeringPeriod: "10/03/2026 - 25/03/2026", reqDate: "2026/02/20" },
        { id: "TR-2026-06-20-006", type: "شراكة ممتدة", status: "المغلقة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - طبي", sharesCount: 20, sharePrice: 500, capital: 10000, expectedProfit: 4000, roi: 40, duration: 6, offeringPeriod: "05/02/2026 - 20/02/2026", reqDate: "2026/01/15" },
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
    // 2. حماية الـ ID عبر التخزين المؤقت (الحل الجذري)
    // ============================================================
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
    // 3. تهيئة الصفحات
    // ============================================================
    function initOpportunities() {
        let gridCont = document.getElementById('gridContainer');
        if (!gridCont || gridCont.innerHTML.trim() !== '') return; // إذا كان مليئاً، نتجاوز

        window.renderOpportunities = function(data) {
            const listBody = document.getElementById('listTableBody');
            if(!gridCont || !listBody) return;

            gridCont.innerHTML = ''; listBody.innerHTML = '';
            
            data.forEach(item => {
                const badge = window.getBadgeClass(item.status), typeBadge = window.getTypeBadgeClass(item.type);
                gridCont.innerHTML += `<div class="opp-card"><div class="opp-header"><div><span class="type-badge ${typeBadge}">${item.type}</span><h3 style="margin-top:8px;">${item.company}</h3></div><span class="badge ${badge}">${item.status}</span></div><div class="opp-body"><div class="opp-metric"><span>قيمة السهم</span><strong>${window.formatMoneySafe(item.sharePrice)}</strong></div><div class="opp-metric"><span>رأس المال</span><strong>${window.formatMoneySafe(item.capital)}</strong></div></div><div class="opp-footer"><span>${item.id}</span><a href="completed-investments.html?id=${item.id}" class="btn-action btn-view">التفاصيل</a></div></div>`;
                listBody.innerHTML += `<tr><td>${item.id}</td><td><span class="type-badge ${typeBadge}">${item.type}</span></td><td>${item.reqEntity}</td><td>${item.offeringPeriod}</td><td>${item.sharesCount}</td><td>${window.formatMoneySafe(item.sharePrice)}</td><td>${window.formatMoneySafe(item.capital)}</td><td>${item.fundedPercentage}%</td><td><span class="badge ${badge}">${item.status}</span></td><td><a href="completed-investments.html?id=${item.id}" class="btn-action btn-view">عرض</a></td></tr>`;
            });
        };

        window.renderOpportunities(window.mockData);
    }

    function initInvestmentDetails() {
        let idEl = document.getElementById('mDetOppId');
        if (!idEl || idEl.innerText !== '-') return; // إذا كان معبأً مسبقاً لا نفعل شيئاً

        let oppId = getSafeOppId();
        let opp = oppId ? window.mockData.find(d => d.id.toLowerCase() === oppId) : null;
        if (!opp) opp = window.mockData[0]; // فرصة احتياطية

        document.getElementById('pageMainTitle').innerText = "تفاصيل الفرصة: " + opp.company;
        document.getElementById('mDetOppId').innerText = opp.id; // بمجرد تعبئته يتوقف الـ Observer عن التكرار
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
        typeBadgeEl.innerText = opp.type;
        typeBadgeEl.className = opp.type === 'فرصة شراكة' ? 'type-badge type-opportunity' : 'type-badge type-extended';

        document.getElementById('mDetReqDate').innerText = opp.reqDate || "2026/05/20";
        document.getElementById('mDetProductQty').innerText = opp.sharesCount * 5;
        document.getElementById('mDetProdVal').innerText = window.formatMoneySafe(opp.capital) + ' ر.س';
        document.getElementById('mDetProdPrice').innerText = window.formatMoneySafe(opp.sharePrice / 5) + ' ر.س';
        document.getElementById('mDetTax').innerText = window.formatMoneySafe(opp.capital * 0.15) + ' ر.س';
        document.getElementById('mDetTotalProd').innerText = window.formatMoneySafe(opp.capital * 1.15) + ' ر.س';

        let availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        const btnJoin = document.getElementById('btnRedirectToJoin');
        if (btnJoin && availableSharesToBuy > 0) {
            btnJoin.href = "cancelled-investments.html?id=" + opp.id;
            btnJoin.style.display = 'inline-flex';
            document.getElementById('mDetAvailableShares').innerText = availableSharesToBuy;
            document.getElementById('miniSharesBox').style.display = 'inline-flex';
        }
    }

    function initCancelledInvestments() {
        let nameEl = document.getElementById('invOppName');
        if (!nameEl || nameEl.innerText !== 'جاري تحميل البيانات...') return;

        let oppId = getSafeOppId();
        let opp = oppId ? window.mockData.find(d => d.id.toLowerCase() === oppId) : null;
        if (!opp) opp = window.mockData[0];

        window.currentActiveOpp = opp;
        window.availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        
        nameEl.innerText = opp.company; // إيقاف الـ Observer
        document.getElementById('invOppId').innerText = opp.id;
        document.getElementById('invSharePrice').innerText = window.formatMoneySafe(opp.sharePrice) + " ر.س";
        document.getElementById('invDuration').innerText = opp.duration + " أشهر";
        document.getElementById('maxShares').innerText = window.availableSharesToBuy;
        
        let badgeEl = document.getElementById('invOppTypeBadge');
        badgeEl.innerText = opp.type;
        badgeEl.className = opp.type === 'فرصة شراكة' ? 'type-badge type-opportunity' : 'type-badge type-extended';

        let backBtn = document.getElementById('btnBackToDetails');
        if(backBtn) backBtn.href = `completed-investments.html?id=${opp.id}`;

        if (window.availableSharesToBuy > 0) {
            document.getElementById('shareInput').value = 1;
            window.executeCalculations();
        }
    }

    // دوال الحسابات لصفحة الانضمام
    window.executeCalculations = function() {
        let opp = window.currentActiveOpp;
        if(!opp) return;

        let shares = parseInt(document.getElementById('shareInput').value) || 0;
        let capital = shares * opp.sharePrice;
        let vat = capital * 0.15;
        let totalToPay = capital + vat;

        document.getElementById('extendedDetails').style.display = 'block';
        document.getElementById('sumShares').innerText = shares;
        document.getElementById('sumCapital').innerText = window.formatMoneySafe(capital) + " ر.س";
        document.getElementById('sumProdTax').innerText = window.formatMoneySafe(vat) + " ر.س";
        document.getElementById('resToPayNow').innerText = shares > 0 ? window.formatMoneySafe(totalToPay) + " ر.س" : "0.00 ر.س";
    };

    window.changeShares = function(delta) {
        let input = document.getElementById('shareInput');
        let val = (parseInt(input.value) || 0) + delta;
        if (val >= 0 && val <= window.availableSharesToBuy) {
            input.value = val;
            window.executeCalculations();
        }
    };

    window.processPayment = function() { alert("تم الدفع والانضمام بنجاح!"); window.location.href = "../dashboard/index.html"; };

    // ============================================================
    // 4. المراقب الذكي (Smart Observer)
    // ============================================================
    window.initInvestments = function() {
        initOpportunities();
        initInvestmentDetails();
        initCancelledInvestments();
    };

    // هذا المراقب يراقب الصفحة، فإذا رأى خانة بيانات فارغة، يستدعي دالة التعبئة فوراً
    new MutationObserver(() => {
        window.initInvestments();
    }).observe(document.body, { childList: true, subtree: true });

    // التشغيل الأول
    window.initInvestments();

})();
