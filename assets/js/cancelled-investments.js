/**
 * ============================================================
 * 4. cancelled-investments.js - منطق طلب الانضمام والآلة الحاسبة
 * ============================================================
 */

(function() {
    'use strict';

    window.initCancelledInvestments = function() {
        let nameEl = document.getElementById('invOppName');
        if (!nameEl || nameEl.innerText !== 'جاري تحميل البيانات...') return;

        let oppId = window.getSafeOppId();
        let opp = oppId ? window.mockData.find(d => d.id.toLowerCase() === oppId) : null;
        if (!opp) opp = window.mockData[0];

        window.currentActiveOpp = opp;
        window.availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        if(window.availableSharesToBuy < 1) window.availableSharesToBuy = 0;
        
        window.selectedPackageType = 'basic';
        window.selectedPackageName = 'الباقة الأساسية';
        window.selectedPackageFixedFee = 0;

        nameEl.innerText = opp.company;
        document.getElementById('invOppId').innerText = opp.id;
        document.getElementById('invSharePrice').innerText = window.formatMoneySafe(opp.sharePrice) + " ر.س";
        document.getElementById('invDuration').innerText = opp.duration + " أشهر";
        document.getElementById('maxShares').innerText = window.availableSharesToBuy;
        
        let badgeEl = document.getElementById('invOppTypeBadge');
        if (badgeEl) {
            badgeEl.innerText = opp.type;
            badgeEl.className = opp.type === 'فرصة شراكة' ? 'type-badge type-opportunity' : 'type-badge type-extended';
        }

        let backBtn = document.getElementById('btnBackToDetails');
        if(backBtn) backBtn.href = 'completed-investments.html?id=' + opp.id;

        if (window.availableSharesToBuy >= 1) {
            let inputField = document.getElementById('shareInput');
            if (inputField) {
                inputField.value = 1;
                window.executeCalculations();
            }
        } else {
            let inputField = document.getElementById('shareInput');
            if(inputField) inputField.value = 0;
            if(document.getElementById('btnPlus')) document.getElementById('btnPlus').disabled = true;
            if(document.getElementById('btnMinus')) document.getElementById('btnMinus').disabled = true;
        }
        window.syncButtonsState();
    };

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

        document.getElementById('servicesTableBody').innerHTML = 
            `<tr><td class="text-start">الرسوم الإدارية</td><td>${window.formatMoneySafe(baseFeeAdmin)}</td><td>${window.formatMoneySafe(baseFeeAdmin*0.15)}</td><td>${window.formatMoneySafe(baseFeeAdmin*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(adminMonthly)}</td><td class="notes">تخصم شهرياً</td></tr>` +
            `<tr><td class="text-start">رسوم التحويل</td><td>${window.formatMoneySafe(baseFeeTransfer)}</td><td>${window.formatMoneySafe(baseFeeTransfer*0.15)}</td><td>${window.formatMoneySafe(baseFeeTransfer*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(transMonthly)}</td><td class="notes">تخصم شهرياً</td></tr>` +
            `<tr><td class="text-start">رسوم التحصيل والمعالجة</td><td>${window.formatMoneySafe(baseFeeCol)}</td><td>${window.formatMoneySafe(baseFeeCol*0.15)}</td><td>${window.formatMoneySafe(baseFeeCol*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(colMonthly)}</td><td class="notes">تخصم شهرياً</td></tr>` +
            `<tr><td class="text-start" style="color:var(--tera-teal);"><i class="fas fa-shield-alt"></i> ${window.selectedPackageName}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(pkgFee)}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(pkgFee*0.15)}</td><td>${window.formatMoneySafe(pkgFee*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(pkgMonthly)}</td><td class="notes" style="color:var(--tera-teal);">تخصم شهرياً</td></tr>` +
            `<tr class="total-row"><td class="text-start">الإجمالي للخدمات</td><td>${window.formatMoneySafe(totalBaseFees)}</td><td>${window.formatMoneySafe(totalFeesVat)}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(oppCostsWithVat)}</td><td style="color:var(--tera-teal); font-size:16px;">${window.formatMoneySafe(totalMonthlyFinal)}</td><td>-</td></tr>`;

        document.getElementById('txtBaseFees').innerText = window.formatMoneySafe(totalBaseFees) + " ر.س";
        document.getElementById('txtFeesVat').innerText = window.formatMoneySafe(totalFeesVat) + " ر.س";
        document.getElementById('txtTotalFeesWithVat').innerText = window.formatMoneySafe(oppCostsWithVat) + " ر.س";

        let isExtended = opp.type === 'شراكة ممتدة';
        let distTitle = document.getElementById('distTableTitleText');
        if(distTitle) distTitle.innerText = isExtended ? "جدول توزيع الدفعات (شراكة ممتدة)" : "جدول توزيع الدفعات (فرصة شراكة)";
        
        let theadHtml = `<tr><th>تاريخ التحصيل</th>${!isExtended ? '<th>رأس المال المسترد</th>' : ''}<th>الربح</th><th>إجمالي الدفعة</th><th>قيمة خصم الرسوم</th><th>المتبقي الصافي</th><th>ملاحظات</th></tr>`;
        document.getElementById('distributionTableHeader').innerHTML = theadHtml;

        let monthlyCapital = partnerCapital / duration, monthlyProfit = totalProfit / duration;
        let distBody = '', tCap = 0, tProf = 0, tPay = 0, tFee = 0, tRem = 0, startDate = new Date();

        for(let i = 1; i <= duration; i++) {
            let payDate = new Date(startDate); payDate.setMonth(startDate.getMonth() + i);
            let dateStr = payDate.getFullYear() + '/' + String(payDate.getMonth() + 1).padStart(2, '0') + '/15';
            
            if(isExtended) {
                let currentPayment = monthlyProfit, currentRemaining = currentPayment - totalMonthlyFinal;
                distBody += `<tr><td>${dateStr}</td><td>${window.formatMoneySafe(monthlyProfit)}</td><td>${window.formatMoneySafe(currentPayment)}</td><td style="color:#ef4444;">${window.formatMoneySafe(totalMonthlyFinal)}</td><td style="color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(currentRemaining)}</td><td style="font-size:11px; color:#64748b;">توزيع أرباح</td></tr>`;
                tProf += monthlyProfit; tPay += currentPayment; tFee += totalMonthlyFinal; tRem += currentRemaining;
            } else {
                let monthlyTotalPayment = monthlyCapital + monthlyProfit, monthlyRemaining = monthlyTotalPayment - totalMonthlyFinal;
                distBody += `<tr><td>${dateStr}</td><td>${window.formatMoneySafe(monthlyCapital)}</td><td>${window.formatMoneySafe(monthlyProfit)}</td><td>${window.formatMoneySafe(monthlyTotalPayment)}</td><td style="color:#ef4444;">${window.formatMoneySafe(totalMonthlyFinal)}</td><td style="color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(monthlyRemaining)}</td><td>مجدولة</td></tr>`;
                tCap += monthlyCapital; tProf += monthlyProfit; tPay += monthlyTotalPayment; tFee += totalMonthlyFinal; tRem += monthlyRemaining;
            }
        }
        
        distBody += `<tr class="total-row"><td class="text-start">الإجمالي</td>${!isExtended ? `<td>${window.formatMoneySafe(tCap)}</td>` : ''}<td>${window.formatMoneySafe(tProf)}</td><td>${window.formatMoneySafe(tPay)}</td><td style="color:#ef4444;">${window.formatMoneySafe(tFee)}</td><td style="color:var(--tera-teal); font-size:16px;">${window.formatMoneySafe(tRem)}</td><td>-</td></tr>`;
        
        let capNote = document.getElementById('extendedCapitalNote');
        if(isExtended && partnerCapital > 0) {
            if (capNote) capNote.style.display = 'block';
            distBody += `<tr class="highlight-row"><td colspan="2" class="text-start" style="font-weight:800;">رأس المال المسترد (في نهاية المدة)</td><td colspan="4" style="text-align:center; font-weight:800; font-size:18px;">${window.formatMoneySafe(partnerCapital)} ر.س</td></tr>`;
        } else {
            if (capNote) capNote.style.display = 'none';
        }

        document.getElementById('distributionTableBody').innerHTML = distBody;

        let netProfitFinal = totalProfit - oppCostsWithVat, totalReturnFinal = partnerCapital + netProfitFinal; 
        
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
        alert('تمت عملية الدفع بنجاح!\nمرحباً بك كشريك في منصة تيرا.'); 
        window.location.href = "../dashboard/index.html"; 
    };

})();
