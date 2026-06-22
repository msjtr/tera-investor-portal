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

        // إدارة التنبيهات وزر الانضمام حسب الحالة
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
            } else if (opp.status === 'النشطة' || opp.status === 'قائم') {
                let alertHtml = `<div class="alert-banner alert-success"><i class="fas fa-bolt"></i><span>هذه الفرصة نشطة ومتاحة للانضمام الآن. الأسهم المتاحة: ${availableSharesToBuy} سهم.</span></div>`;
                if(opp.fundedPercentage >= 80) alertHtml += `<div class="alert-banner alert-warning"><i class="fas fa-fire"></i><span>الفرصة قاربت على الاكتمال! (${opp.fundedPercentage}%).</span></div>`;
                alertsCont.innerHTML = alertHtml;
            }
        }

        // إظهار زر الانضمام والإقرار فقط للفرص المتاحة
        const btnJoin = document.getElementById('btnRedirectToJoin');
        if (joinWrapper && btnJoin) {
            if ((opp.status === 'قائم' || opp.status === 'النشطة') && availableSharesToBuy > 0) {
                joinWrapper.style.display = 'block';
                btnJoin.href = "cancelled-investments.html?id=" + opp.id;
            } else {
                joinWrapper.style.display = 'none'; // إخفاء الإقرار والزر تماماً
            }
        }
    }
