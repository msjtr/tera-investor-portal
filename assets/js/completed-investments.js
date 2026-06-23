/**
 * ============================================================
 * 3. completed-investments.js - تفاصيل الفرصة والتنبيهات
 * ============================================================
 */

(function() {
    'use strict';

    window.initInvestmentDetails = function() {
        let idEl = document.getElementById('mDetOppId');
        if (!idEl || idEl.innerText !== '-') return;

        let oppId = window.getSafeOppId();
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
        if (alertsCont && !alertsCont.hasAttribute('data-loaded')) {
            alertsCont.innerHTML = window.buildAlertBanner(opp);
            alertsCont.setAttribute('data-loaded', 'true');
        }

        const btnJoin = document.getElementById('btnRedirectToJoin');
        let availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));

        if (btnJoin) {
            if ((opp.status === 'النشطة' || opp.status === 'قائم') && availableSharesToBuy > 0) {
                btnJoin.style.display = 'inline-flex';
                btnJoin.href = "cancelled-investments.html?id=" + opp.id;
                
                const miniShares = document.getElementById('miniSharesBox');
                if(miniShares) miniShares.style.display = 'inline-flex';
                const availSharesText = document.getElementById('mDetAvailableShares');
                if(availSharesText) availSharesText.innerText = availableSharesToBuy;
            } else {
                btnJoin.style.display = 'none';
            }
        }
    };

})();
