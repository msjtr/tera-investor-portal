/**
 * ============================================================
 * investments.js - التحكم المركزي الشامل (النسخة النهائية)
 * ============================================================
 * - يغذي السوق (12 فرصة)
 * - يعكس التفاصيل
 * - يشغل الآلة الحاسبة للانضمام
 * - يتوافق تماماً مع الـ SPA بدون أخطاء
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
    // 2. حماية الـ ID للـ SPA
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
    // 3. تهيئة صفحة السوق (الفرص) - كانت مفقودة وأعدتها
    // ============================================================
    function initOpportunities() {
        let gridCont = document.getElementById('gridContainer');
        if (!gridCont || gridCont.innerHTML.trim() !== '') return;

        window.currentViewStyle = 'list';

        window.switchView = function(view) {
            window.currentViewStyle = view;
            const gridBtn = document.getElementById('btnGrid');
            const listBtn = document.getElementById('btnList');
            if(gridBtn) gridBtn.classList.toggle('active', view === 'grid');
            if(listBtn) listBtn.classList.toggle('active', view === 'list');
            window.applyFilters();
        };

        window.renderOpportunities = function(data) {
            const listBody = document.getElementById('listTableBody');
            const listCont = document.getElementById('listContainer');
            const emptyState = document.getElementById('emptyState');
            
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
                const badge = window.getBadgeClass(item.status);
                const typeBadge = window.getTypeBadgeClass(item.type);
                const detailUrl = `completed-investments.html?id=${item.id}`;
                const formattedShare = window.formatMoneySafe(item.sharePrice);
                const formattedCapital = window.formatMoneySafe(item.capital);

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
                            <div class="opp-metric"><span>قيمة السهم</span><strong>${formattedShare}</strong></div>
                            <div class="opp-metric"><span>إجمالي رأس المال</span><strong style="color:var(--tera-teal);">${formattedCapital}</strong></div>
                            <div class="opp-metric"><span>المدة</span><strong>${item.duration} شهر</strong></div>
                            <div class="opp-metric"><span>عدد الأسهم</span><strong>${item.sharesCount}</strong></div>
                        </div>
                        <div class="opp-footer">
                            <span style="font-size:12px; font-family:monospace; color:var(--tera-gray);">${item.id}</span>
                            <a href="${detailUrl}" class="btn-action btn-view"><i class="fas fa-book-open"></i> التفاصيل</a>
                        </div>
                    </div>
                `;

                listBody.innerHTML += `
                    <tr>
                        <td style="font-family: monospace; font-weight: 700; color:var(--tera-navy);">${item.id}</td>
                        <td><span class="type-badge ${typeBadge}">${item.type}</span></td>
                        <td style="font-weight:700;">${item.reqEntity}</td>
                        <td style="font-family: monospace;">${item.offeringPeriod}</td>
                        <td style="font-weight: 800; color:var(--tera-navy);">${item.sharesCount}</td>
                        <td style="font-family:monospace;">${formattedShare}</td>
                        <td style="font-family:monospace; color:var(--tera-teal); font-weight:bold;">${formattedCapital}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-weight:700; font-size:12px;">${item.fundedPercentage}%</span>
                                <div class="progress-bar-bg" style="width:60px; height:6px;"><div class="progress-bar-fill" style="width:${item.fundedPercentage}%"></div></div>
                            </div>
                        </td>
                        <td><span class="badge ${badge}">${item.status}</span></td>
                        <td><a href="${detailUrl}" class="btn-action btn-view">عرض</a></td>
                    </tr>
                `;
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
                let mStatus = false;
                if (statusVal === 'all') mStatus = true;
                else if (statusVal === 'النشطة_قائم') mStatus = (d.status === 'النشطة' || d.status === 'قائم');
                else mStatus = (d.status === statusVal);
                let mSearch = d.id.toLowerCase().includes(searchVal) || d.company.toLowerCase().includes(searchVal);
                return mType && mStatus && mSearch;
            });

            window.renderOpportunities(filtered);
            
            // تحديث الإحصائيات العلوية
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

        // تشغيل الفلاتر لأول مرة
        window.applyFilters();
        
        // ربط الأحداث بمربعات الفلترة
        const typeF = document.getElementById('typeFilter');
        const statusF = document.getElementById('statusFilter');
        const searchI = document.getElementById('searchInput');
        if(typeF) typeF.addEventListener('change', window.applyFilters);
        if(statusF) statusF.addEventListener('change', window.applyFilters);
        if(searchI) searchI.addEventListener('input', window.applyFilters);
    }

    // ============================================================
    // 4. تهيئة صفحة التفاصيل (completed-investments.html)
    // ============================================================
    function initInvestmentDetails() {
        let idEl = document.getElementById('mDetOppId');
        if (!idEl || idEl.innerText !== '-') return;

        let oppId = getSafeOppId();
        let opp = oppId ? window.mockData.find(d => d.id.toLowerCase() === oppId) : null;
        if (!opp) opp = window.mockData[0];

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

    // ============================================================
    // 5. تهيئة صفحة الانضمام (cancelled-investments.html)
    // ============================================================
    function initCancelledInvestments() {
        let nameEl = document.getElementById('invOppName');
        if (!nameEl || nameEl.innerText !== 'جاري تحميل البيانات...') return;

        let oppId = getSafeOppId();
        let opp = oppId ? window.mockData.find(d => d.id.toLowerCase() === oppId) : null;
        if (!opp) opp = window.mockData[0];

        window.currentActiveOpp = opp;
        window.availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        
        nameEl.innerText = opp.company;
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

    // دوال الحسابات (تسجل في window لتعمل من الـ HTML مباشرة)
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
        
        // يمكننا إضافة منطق تحديث جدول الرسوم هنا إذا أردت لاحقاً
    };

    window.changeShares = function(delta) {
        let input = document.getElementById('shareInput');
        let val = (parseInt(input.value) || 0) + delta;
        if (val >= 0 && val <= window.availableSharesToBuy) {
            input.value = val;
            window.executeCalculations();
        }
    };

    window.processPayment = function() { 
        alert("تم الدفع والانضمام بنجاح!"); 
        window.location.href = "../dashboard/index.html"; 
    };

    // ============================================================
    // 6. المشغل الذكي
    // ============================================================
    window.initInvestments = function() {
        initOpportunities();
        initInvestmentDetails();
        initCancelledInvestments();
    };

    // المراقب لمشكلة الـ SPA
    new MutationObserver(() => {
        window.initInvestments();
    }).observe(document.body, { childList: true, subtree: true });

    window.initInvestments();

})();
