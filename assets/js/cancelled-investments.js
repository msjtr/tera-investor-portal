/**
 * ============================================================
 * 4. cancelled-investments.js - منطق طلب الانضمام والآلة الحاسبة (النسخة النهائية الآمنة)
 * ============================================================
 */

(function() {
    'use strict';

    // دالة أمان لتحديث النصوص لتفادي خطأ (Cannot set properties of null)
    const setSafeText = (id, val) => {
        let el = document.getElementById(id);
        if (el) el.innerText = val;
    };

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

        setSafeText('invOppName', opp.company);
        setSafeText('invOppId', opp.id);
        setSafeText('invSharePrice', window.formatMoneySafe(opp.sharePrice) + " ر.س");
        setSafeText('invDuration', opp.duration + " أشهر");
        setSafeText('maxShares', window.availableSharesToBuy);
        
        let badgeEl = document.getElementById('invOppTypeBadge');
        if (badgeEl) {
            badgeEl.innerText = opp.type;
            badgeEl.className = opp.type === 'فرصة شراكة' ? 'type-badge type-opportunity' : 'type-badge type-extended';
        }

        let backBtn = document.getElementById('btnBackToDetails');
        if(backBtn) backBtn.href = 'completed-investments.html?id=' + opp.id;

        // تصفير عدد الأسهم عند الدخول لإجبار المستخدم على التحديد وفتح الصفحة
        let inputField = document.getElementById('shareInput');
        if(inputField) inputField.value = 0;
        
        window.syncButtonsState();
        window.executeCalculations(); // تحديث الحسابات وإخفاء الأقسام لأن القيمة الافتراضية 0
    };

    window.executeCalculations = function() {
        let opp = window.currentActiveOpp;
        if(!opp) return;

        let shares = 0;
        let shareInput = document.getElementById('shareInput');
        if (shareInput) {
            shares = parseInt(shareInput.value) || 0;
        }
        
        let extendedBlock = document.getElementById('extendedDetails');
        
        // إخفاء الصفحة إذا كان عدد الأسهم 0
        if (shares === 0) {
            if(extendedBlock) extendedBlock.style.display = 'none';
            return;
        } else {
            if(extendedBlock) extendedBlock.style.display = 'block';
        }

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

        // دالة داخلية لضمان التنسيق المالي الآمن
        const fmt = (val) => {
            if (typeof window.formatMoneySafe === 'function') return window.formatMoneySafe(val);
            return parseFloat(val).toFixed(2);
        };

        // 1. تحديث جدول الخدمات
        let servicesBody = document.getElementById('servicesTableBody');
        if (servicesBody) {
            servicesBody.innerHTML = 
                `<tr><td class="text-start">الرسوم الإدارية</td><td>${fmt(baseFeeAdmin)}</td><td>${fmt(baseFeeAdmin*0.15)}</td><td>${fmt(baseFeeAdmin*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${fmt(adminMonthly)}</td></tr>` +
                `<tr><td class="text-start">رسوم التحويل</td><td>${fmt(baseFeeTransfer)}</td><td>${fmt(baseFeeTransfer*0.15)}</td><td>${fmt(baseFeeTransfer*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${fmt(transMonthly)}</td></tr>` +
                `<tr><td class="text-start">رسوم التحصيل والمعالجة</td><td>${fmt(baseFeeCol)}</td><td>${fmt(baseFeeCol*0.15)}</td><td>${fmt(baseFeeCol*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${fmt(colMonthly)}</td></tr>` +
                `<tr><td class="text-start" style="color:var(--tera-teal);"><i class="fas fa-shield-alt"></i> ${window.selectedPackageName}</td><td style="color:var(--tera-teal);">${fmt(pkgFee)}</td><td style="color:var(--tera-teal);">${fmt(pkgFee*0.15)}</td><td>${fmt(pkgFee*1.15)}</td><td style="color:var(--tera-teal); font-family:monospace;">${fmt(pkgMonthly)}</td></tr>` +
                `<tr class="total-row"><td class="text-start">الإجمالي للخدمات</td><td>${fmt(totalBaseFees)}</td><td>${fmt(totalFeesVat)}</td><td style="color:var(--tera-teal);">${fmt(oppCostsWithVat)}</td><td style="color:var(--tera-teal); font-size:16px;">${fmt(totalMonthlyFinal)}</td></tr>`;
        }
        
        setSafeText('txtBaseFees', fmt(totalBaseFees) + " ر.س");
        setSafeText('txtFeesVat', fmt(totalFeesVat) + " ر.س");
        setSafeText('txtTotalFeesWithVat', fmt(oppCostsWithVat) + " ر.س");

        // 2. تحديث جدول توزيع الدفعات
        let isExtended = opp.type === 'شراكة ممتدة';
        setSafeText('distTableTitleText', isExtended ? "جدول توزيع الدفعات (شراكة ممتدة)" : "جدول توزيع الدفعات (فرصة شراكة)");
        
        let theadHtml = `<tr><th>تاريخ التحصيل</th>${!isExtended ? '<th>رأس المال المسترد</th>' : ''}<th>الربح</th><th>إجمالي الدفعة</th><th>قيمة خصم الرسوم</th><th>المتبقي الصافي</th><th>ملاحظات</th></tr>`;
        let distHeader = document.getElementById('distributionTableHeader');
        if (distHeader) distHeader.innerHTML = theadHtml;

        let monthlyCapital = partnerCapital / duration, monthlyProfit = totalProfit / duration;
        let distBody = '', tCap = 0, tProf = 0, tPay = 0, tFee = 0, tRem = 0, startDate = new Date();

        for(let i = 1; i <= duration; i++) {
            let payDate = new Date(startDate); payDate.setMonth(startDate.getMonth() + i);
            let dateStr = payDate.getFullYear() + '/' + String(payDate.getMonth() + 1).padStart(2, '0') + '/15';
            
            if(isExtended) {
                let currentPayment = monthlyProfit, currentRemaining = currentPayment - totalMonthlyFinal;
                distBody += `<tr><td>${dateStr}</td><td>${fmt(monthlyProfit)}</td><td>${fmt(currentPayment)}</td><td style="color:#ef4444;">${fmt(totalMonthlyFinal)}</td><td style="color:var(--tera-teal); font-weight:bold;">${fmt(currentRemaining)}</td><td style="font-size:11px; color:#64748b;">توزيع أرباح</td></tr>`;
                tProf += monthlyProfit; tPay += currentPayment; tFee += totalMonthlyFinal; tRem += currentRemaining;
            } else {
                let monthlyTotalPayment = monthlyCapital + monthlyProfit, monthlyRemaining = monthlyTotalPayment - totalMonthlyFinal;
                distBody += `<tr><td>${dateStr}</td><td>${fmt(monthlyCapital)}</td><td>${fmt(monthlyProfit)}</td><td>${fmt(monthlyTotalPayment)}</td><td style="color:#ef4444;">${fmt(totalMonthlyFinal)}</td><td style="color:var(--tera-teal); font-weight:bold;">${fmt(monthlyRemaining)}</td><td>مجدولة</td></tr>`;
                tCap += monthlyCapital; tProf += monthlyProfit; tPay += monthlyTotalPayment; tFee += totalMonthlyFinal; tRem += monthlyRemaining;
            }
        }
        
        distBody += `<tr class="total-row"><td class="text-start">الإجمالي</td>${!isExtended ? `<td>${fmt(tCap)}</td>` : ''}<td>${fmt(tProf)}</td><td>${fmt(tPay)}</td><td style="color:#ef4444;">${fmt(tFee)}</td><td style="color:var(--tera-teal); font-size:16px;">${fmt(tRem)}</td><td>-</td></tr>`;
        
        let distBodyEl = document.getElementById('distributionTableBody');
        if (distBodyEl) distBodyEl.innerHTML = distBody;
        
        let capNote = document.getElementById('extendedCapitalNote');
        if(isExtended && partnerCapital > 0) {
            if (capNote) capNote.style.display = 'block';
        } else {
            if (capNote) capNote.style.display = 'none';
        }

        // 3. ملخص الاستثمار والأرباح (الحقول الستة المفصلة)
        let netProfitFinal = totalProfit - oppCostsWithVat;
        let netMonthlyProfitFinal = duration > 0 ? netProfitFinal / duration : 0;
        let totalReturnFinal = partnerCapital + netProfitFinal; 
        
        setSafeText('finalPartnerCapital', fmt(partnerCapital) + " ر.س");
        setSafeText('finalSharesCount', shares);
        setSafeText('finalOppCosts', fmt(oppCostsWithVat) + " ر.س");
        setSafeText('finalNetProfit', fmt(netProfitFinal) + " ر.س");
        setSafeText('finalMonthlyNetProfit', fmt(netMonthlyProfitFinal) + " ر.س");
        setSafeText('finalTotalReturn', fmt(totalReturnFinal) + " ر.س");

        // 4. ملخص الدفع النهائي
        setSafeText('sumShares', shares);
        setSafeText('sumSharePrice', fmt(opp.sharePrice) + " ر.س");
        setSafeText('sumCapital', fmt(partnerCapital) + " ر.س");
        setSafeText('resToPayNow', fmt(partnerCapital) + " ر.س");
    };

    window.changeShares = function(delta) {
        let input = document.getElementById('shareInput');
        if(!input) return;
        let val = (parseInt(input.value) || 0) + delta;
        if (val >= 0 && val <= window.availableSharesToBuy) {
            input.value = val;
            window.syncButtonsState();
            window.executeCalculations();
        }
    };

    window.syncButtonsState = function() {
        let currentShares = parseInt(document.getElementById('shareInput').value) || 0;
        const btnMinus = document.getElementById('btnMinus'), btnPlus = document.getElementById('btnPlus');
        if(btnMinus) btnMinus.disabled = (currentShares <= 0); 
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

    window.toggleWalletInfo = function() {
        let methodOption = document.querySelector('input[name="payment_method"]:checked');
        let walletInfo = document.getElementById('walletBalanceInfo');
        if (methodOption && walletInfo) {
            walletInfo.style.display = methodOption.value === 'wallet' ? 'block' : 'none';
        }
    };

    window.togglePayButton = function() { 
        let shares = parseInt(document.getElementById('shareInput').value) || 0;
        let checkEl = document.getElementById('agreeCheckbox');
        let isChecked = checkEl ? checkEl.checked : false;
        const payBtn = document.getElementById('btnPayNow');
        if(payBtn) payBtn.disabled = !(isChecked && shares >= 1); 
    };

    window.processPayment = function() { 
        let methodOption = document.querySelector('input[name="payment_method"]:checked');
        let methodVal = methodOption ? methodOption.value : 'wallet';
        
        if (methodVal === 'wallet') {
            alert('تم الدفع وتأكيد الاستثمار من خلال المحفظة بنجاح!\nمرحباً بك كشريك في منصة تيرا.'); 
            window.location.href = "../dashboard/index.html"; 
        } else {
            // إظهار واجهة التحميل لبوابة الدفع
            let overlay = document.getElementById('paymentRedirectOverlay');
            if (overlay) overlay.style.display = 'flex';
            
            // التحويل الوهمي بعد 5 ثواني
            setTimeout(() => {
                window.location.href = "../dashboard/index.html"; 
            }, 5000);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initCancelledInvestments);
    } else {
        window.initCancelledInvestments();
    }

})();
