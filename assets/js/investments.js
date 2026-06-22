/**
 * ============================================================
 * investments.js - إدارة صفحات الاستثمارات وتغذية البيانات المركزية
 * ============================================================
 * تم التحديث الشامل لسحب بيانات (تفاصيل الفرصة + صفحة الانضمام)
 * لتعمل بانسجام مع بيئة الـ SPA بدون أكواد مدمجة في الـ HTML.
 * ============================================================
 */

(function() {
    'use strict';

    if (window.InvestmentsManagerLoaded) {
        console.log('ℹ️ [Investments] تم تحميل investments.js مسبقاً، تخطي التهيئة');
        return;
    }
    window.InvestmentsManagerLoaded = true;

    // ============================================================
    // 0. الدوال المشتركة وقاعدة البيانات
    // ============================================================
    
    window.getDynamicDate = function(daysOffset) {
        let d = new Date(); d.setDate(d.getDate() + daysOffset);
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    };

    window.formatMoneySafe = function(num) { 
        let n = parseFloat(num);
        if(isNaN(n)) return "0.00";
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
    };

    window.getBadgeClass = function(status) {
        switch(status) {
            case 'القادمة': return 'status-upcoming'; 
            case 'قائم': case 'النشطة': return 'status-active';
            case 'المكتملة': return 'status-completed';
            case 'المنتهية': return 'status-expired';
            case 'المغلقة': return 'status-closed';
            case 'الملغاة': return 'status-cancelled';
            default: return 'status-active';
        }
    };

    window.getTypeBadgeClass = function(type) { 
        return type === 'شراكة ممتدة' ? 'type-extended' : 'type-opportunity'; 
    };

    window.mockData = [
        // 6 فرص (شراكة ممتدة)
        { id: "TR-2026-06-20-001", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 10, reqEntity: "افراد", company: "تمويل أفراد - شراء احتياجات", sharesCount: 100, sharePrice: 100, capital: 10000, expectedProfit: 5000, roi: 50, duration: 6, offeringPeriod: "01/06/2026 - 15/06/2026", reqDate: "2026/05/20" },
        { id: "TR-2026-06-20-002", type: "شراكة ممتدة", status: "قائم", fundedPercentage: 85, reqEntity: "افراد", company: "تمويل أفراد - زواج", sharesCount: 50, sharePrice: 500, capital: 25000, expectedProfit: 10000, roi: 40, duration: 6, offeringPeriod: "05/06/2026 - 20/06/2026", reqDate: "2026/05/25" },
        { id: "TR-2026-06-20-003", type: "شراكة ممتدة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 4, reqEntity: "افراد", company: "تمويل أفراد - ترميم منزل", sharesCount: 80, sharePrice: 200, capital: 16000, expectedProfit: 4800, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/05" },
        { id: "TR-2026-06-20-004", type: "شراكة ممتدة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - سيارة", sharesCount: 40, sharePrice: 1000, capital: 40000, expectedProfit: 8000, roi: 20, duration: 6, offeringPeriod: "15/04/2026 - 30/04/2026", reqDate: "2026/04/01" },
        { id: "TR-2026-06-20-005", type: "شراكة ممتدة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - شخصي", sharesCount: 100, sharePrice: 50, capital: 5000, expectedProfit: 2000, roi: 40, duration: 6, offeringPeriod: "10/03/2026 - 25/03/2026", reqDate: "2026/02/20" },
        { id: "TR-2026-06-20-006", type: "شراكة ممتدة", status: "المغلقة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - طبي", sharesCount: 20, sharePrice: 500, capital: 10000, expectedProfit: 4000, roi: 40, duration: 6, offeringPeriod: "05/02/2026 - 20/02/2026", reqDate: "2026/01/15" },
        
        // 6 فرص (فرصة شراكة)
        { id: "FTR-2026-06-20-007", type: "فرصة شراكة", status: "النشطة", fundedPercentage: 20, reqEntity: "افراد", company: "فرصة شراكة - تأثيث منزل", sharesCount: 50, sharePrice: 1000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "02/06/2026 - 17/06/2026", reqDate: "2026/05/22" },
        { id: "FTR-2026-06-20-008", type: "فرصة شراكة", status: "قائم", fundedPercentage: 95, daysLeftToJoin: 1, reqEntity: "افراد", company: "فرصة شراكة - سفر وسياحة", sharesCount: 20, sharePrice: 2000, capital: 40000, expectedProfit: 16000, roi: 40, duration: 6, offeringPeriod: "08/06/2026 - 23/06/2026", reqDate: "2026/05/28" },
        { id: "FTR-2026-06-20-009", type: "فرصة شراكة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 2, reqEntity: "افراد", company: "فرصة شراكة - استثمار مبدئي", sharesCount: 100, sharePrice: 200, capital: 20000, expectedProfit: 6000, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/15" },
        { id: "FTR-2026-06-20-010", type: "فرصة شراكة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - عقار سكني", sharesCount: 10, sharePrice: 5000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "10/04/2026 - 25/04/2026", reqDate: "2026/03/25" },
        { id: "FTR-2026-06-20-011", type: "فرصة شراكة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - تجارة إلكترونية", sharesCount: 20, sharePrice: 600, capital: 12000, expectedProfit: 4800, roi: 40, duration: 6, offeringPeriod: "05/03/2026 - 20/03/2026", reqDate: "2026/02/18" },
        { id: "FTR-2026-06-20-012", type: "فرصة شراكة", status: "الملغاة", fundedPercentage: 0, reqEntity: "افراد", company: "فرصة شراكة - تطبيق ذكي", sharesCount: 40, sharePrice: 1500, capital: 60000, expectedProfit: 30000, roi: 50, duration: 6, offeringPeriod: "14/06/2026 - 29/06/2026", reqDate: "2026/06/01" }
    ];

    // ============================================================
    // 1. تهيئة صفحة التفاصيل (completed-investments.html)
    // ============================================================
    function initInvestmentDetails() {
        console.log('📊 [Investments] جاري عكس بيانات تفاصيل الفرصة...');
        if (!document.getElementById('mDetOppId')) return; // الخروج إذا لم تكن الصفحة الصحيحة

        const urlParams = new URLSearchParams(window.location.search);
        let rawId = urlParams.get('id');
        let oppId = rawId ? rawId.trim().toLowerCase() : null;

        let opp = oppId ? window.mockData.find(d => String(d.id).trim().toLowerCase() === oppId) : null;
        if (!opp) opp = window.mockData.find(d => parseFloat(d.fundedPercentage) < 100) || window.mockData[0];

        if (opp) {
            document.getElementById('pageMainTitle').innerText = "تفاصيل الفرصة: " + (opp.company || '');

            let sharesCountNum = parseInt(opp.sharesCount) || 0;
            let fundedPercNum = parseFloat(opp.fundedPercentage) || 0;
            let capitalNum = parseFloat(opp.capital) || 0;
            let sharePriceNum = parseFloat(opp.sharePrice) || 0;
            let availableSharesToBuy = Math.floor(sharesCountNum * (1 - (fundedPercNum / 100)));

            const alertsCont = document.getElementById('mDetAlertsContainer');
            if (alertsCont) {
                alertsCont.innerHTML = ''; let hasAlerts = false;
                if (opp.status === 'القادمة' && opp.daysLeftToStart <= 5) {
                    alertsCont.innerHTML = `<div class="alert-banner alert-info"><i class="fas fa-bell"></i><span>الفرصة متبقي لها ${opp.daysLeftToStart} أيام للاستثمار.</span></div>`;
                    hasAlerts = true;
                } else if ((opp.status === 'قائم' || opp.status === 'النشطة') && fundedPercNum >= 80 && fundedPercNum < 100) {
                    alertsCont.innerHTML = `<div class="alert-banner alert-success"><i class="fas fa-chart-line"></i><span>الفرصة قاربت على الاكتمال! (${fundedPercNum}%).</span></div>`;
                    hasAlerts = true;
                }
                alertsCont.style.display = hasAlerts ? 'block' : 'none';
            }

            document.getElementById('mDetProgressText').innerText = fundedPercNum + '%';
            document.getElementById('mDetProgressBar').style.width = fundedPercNum + '%';
            document.getElementById('mDetOppId').innerText = opp.id;
            document.getElementById('mDetOppCompany').innerText = opp.company;
            
            let typeBadgeEl = document.getElementById('mDetOppType');
            typeBadgeEl.innerText = opp.type;
            typeBadgeEl.className = opp.type === 'فرصة شراكة' ? 'type-badge type-opportunity' : 'type-badge type-extended';

            document.getElementById('mDetOppStatus').innerText = opp.status;
            document.getElementById('mDetOfferingPeriod').innerText = opp.offeringPeriod;
            document.getElementById('mDetSharesCount').innerText = sharesCountNum;
            document.getElementById('mDetSharePrice').innerText = window.formatMoneySafe(sharePriceNum) + ' ر.س';
            document.getElementById('mDetTotalCapital').innerText = window.formatMoneySafe(capitalNum) + ' ر.س';
            document.getElementById('mDetRatio').innerText = (opp.roi || 0) + "%";

            document.getElementById('mDetReqDate').innerText = opp.reqDate || "2026/05/20";
            document.getElementById('mDetProductQty').innerText = sharesCountNum * 5;
            document.getElementById('mDetProdVal').innerText = window.formatMoneySafe(capitalNum) + ' ر.س';
            document.getElementById('mDetProdPrice').innerText = window.formatMoneySafe(sharePriceNum / 5) + ' ر.س';
            
            let tax = capitalNum * 0.15;
            document.getElementById('mDetTax').innerText = window.formatMoneySafe(tax) + ' ر.س';
            document.getElementById('mDetTotalProd').innerText = window.formatMoneySafe(capitalNum + tax) + ' ر.س';

            const btnJoin = document.getElementById('btnRedirectToJoin');
            const warnMsg = document.getElementById('investWarningMsg');
            const miniSharesBox = document.getElementById('miniSharesBox');
            
            if ((opp.status === 'قائم' || opp.status === 'النشطة') && availableSharesToBuy > 0) {
                btnJoin.style.display = 'inline-flex';
                miniSharesBox.style.display = 'inline-flex';
                document.getElementById('mDetAvailableShares').innerText = availableSharesToBuy;
                btnJoin.href = "cancelled-investments.html?id=" + opp.id; // توجيه لصفحة الانضمام
                warnMsg.style.display = 'none';
            } else {
                btnJoin.style.display = 'none';
                miniSharesBox.style.display = 'none';
                warnMsg.innerText = availableSharesToBuy <= 0 ? "اكتملت جميع أسهم هذه الفرصة" : "الفرصة غير متاحة للانضمام حالياً";
                warnMsg.style.display = 'block';
            }
        }
    }

    // ============================================================
    // 2. تهيئة صفحة الانضمام للفرصة (cancelled-investments.html)
    // ============================================================
    function initCancelledInvestments() {
        console.log('📊 [Investments] جاري تهيئة الآلة الحاسبة لطلب الانضمام...');
        if (!document.getElementById('invOppName')) return; // الخروج إذا لم تكن الصفحة الصحيحة

        const urlParams = new URLSearchParams(window.location.search);
        let rawId = urlParams.get('id');
        let oppId = rawId ? rawId.trim().toLowerCase() : null;

        let opp = oppId ? window.mockData.find(d => String(d.id).trim().toLowerCase() === oppId) : null;
        if (!opp) opp = window.mockData.find(d => parseFloat(d.fundedPercentage) < 100) || window.mockData[0];

        if (opp) {
            window.currentActiveOpp = opp;
            window.availableSharesToBuy = Math.floor((parseInt(opp.sharesCount) || 0) * (1 - ((parseFloat(opp.fundedPercentage) || 0) / 100)));
            if (window.availableSharesToBuy < 0) window.availableSharesToBuy = 0;
            
            window.selectedPackageType = 'basic';
            window.selectedPackageName = 'الباقة الأساسية';
            window.selectedPackageFixedFee = 0;

            document.getElementById('invOppName').innerText = opp.company || 'بدون اسم';
            document.getElementById('invOppId').innerText = opp.id;
            
            let badgeEl = document.getElementById('invOppTypeBadge');
            badgeEl.innerText = opp.type;
            badgeEl.style.background = opp.type === 'فرصة شراكة' ? '#fce7f3' : '#fef3c7';
            badgeEl.style.color = opp.type === 'فرصة شراكة' ? '#db2777' : '#d97706';

            document.getElementById('invSharePrice').innerText = window.formatMoneySafe(opp.sharePrice) + " ر.س";
            document.getElementById('invDuration').innerText = (parseInt(opp.duration) || 6) + " أشهر";
            document.getElementById('maxShares').innerText = window.availableSharesToBuy;
            
            let backBtn = document.getElementById('btnBackToDetails');
            if(backBtn) backBtn.href = `completed-investments.html?id=${opp.id}`;

            if (window.availableSharesToBuy > 0) {
                document.getElementById('shareInput').value = 1;
                window.executeCalculations();
            } else {
                document.getElementById('shareInput').value = 0;
                document.getElementById('btnPlus').disabled = true;
                document.getElementById('btnMinus').disabled = true;
                document.getElementById('btnPayNow').disabled = true;
            }
            window.syncButtonsState();
        }
    }

    // دوال الآلة الحاسبة لصفحة الانضمام مسجلة في الـ window لتعمل مع الـ HTML
    window.changeShares = function(delta) {
        let inputEl = document.getElementById('shareInput');
        let newShares = (parseInt(inputEl.value) || 0) + delta;
        if (newShares < 0) newShares = 0;
        if (newShares > window.availableSharesToBuy) newShares = window.availableSharesToBuy;
        inputEl.value = newShares;
        window.syncButtonsState();
        window.executeCalculations();
    };

    window.syncButtonsState = function() {
        let currentShares = parseInt(document.getElementById('shareInput').value) || 0;
        document.getElementById('btnMinus').disabled = (currentShares <= 0);
        document.getElementById('btnPlus').disabled = (currentShares >= window.availableSharesToBuy);
        window.togglePayButton();
    };

    window.selectPackage = function(el, type, name, feeValue) {
        document.querySelectorAll('.package-card').forEach(card => {
            card.classList.remove('selected');
            card.querySelector('input').checked = false;
        });
        el.classList.add('selected');
        el.querySelector('input').checked = true;
        window.selectedPackageType = type;
        window.selectedPackageName = name;
        window.selectedPackageFixedFee = parseFloat(feeValue) || 0;
        window.executeCalculations();
    };

    window.executeCalculations = function() {
        let opp = window.currentActiveOpp;
        if(!opp) return;

        let shares = parseInt(document.getElementById('shareInput').value) || 0;
        document.getElementById('extendedDetails').style.display = 'block';
        
        let duration = parseInt(opp.duration) || 6;
        let capital = shares * (parseFloat(opp.sharePrice) || 0);
        let profitPerShare = (parseFloat(opp.expectedProfit) || 0) / (parseInt(opp.sharesCount) || 1);
        
        let adminTotal = 23, transferTotal = 28.75, collectionTotal = 115;
        let pkgFee = window.selectedPackageFixedFee, pkgTotal = pkgFee + (pkgFee * 0.15);
        let totalServiceFinal = adminTotal + transferTotal + collectionTotal + pkgTotal; 
        let totalMonthlyFinal = totalServiceFinal / duration;

        document.getElementById('servicesTableBody').innerHTML = `
            <tr><td class="text-start">الرسوم الإدارية</td><td>20.00</td><td>3.00</td><td>23.00</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(adminTotal/duration)}</td><td class="notes">تخصم شهرياً</td></tr>
            <tr><td class="text-start">رسوم التحويل</td><td>25.00</td><td>3.75</td><td>28.75</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(transferTotal/duration)}</td><td class="notes">تخصم شهرياً</td></tr>
            <tr><td class="text-start">رسوم التحصيل</td><td>100.00</td><td>15.00</td><td>115.00</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(collectionTotal/duration)}</td><td class="notes">تخصم شهرياً</td></tr>
            <tr><td class="text-start" style="color:var(--tera-teal);"><i class="fas fa-shield-alt"></i> ${window.selectedPackageName}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(pkgFee)}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(pkgFee*0.15)}</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(pkgTotal)}</td><td style="color:var(--tera-teal); font-family:monospace;">${window.formatMoneySafe(pkgTotal>0 ? pkgTotal/duration : 0)}</td><td class="notes" style="color:var(--tera-teal);">تخصم شهرياً</td></tr>
            <tr class="total-row"><td class="text-start">الإجمالي للخدمات</td><td>-</td><td>-</td><td style="color:var(--tera-teal);">${window.formatMoneySafe(totalServiceFinal)}</td><td style="color:var(--tera-teal); font-size:16px;">${window.formatMoneySafe(totalMonthlyFinal)}</td><td>-</td></tr>
        `;

        let isExtended = opp.type === 'شراكة ممتدة';
        document.getElementById('distTableTitleText').innerText = isExtended ? "جدول توزيع الدفعات (شراكة ممتدة)" : "جدول توزيع الدفعات (فرصة شراكة)";
        document.getElementById('distributionTableHeader').innerHTML = `<tr><th>تاريخ التحصيل</th>${!isExtended ? '<th>رأس المال المسترد</th>' : ''}<th>الربح</th><th>إجمالي الدفعة</th><th>قيمة خصم الرسوم</th><th>المتبقي الصافي</th><th>ملاحظات</th></tr>`;

        let monthlyCapital = capital / duration, monthlyProfit = (shares * profitPerShare) / duration;
        let distBody = '', tCap = 0, tProf = 0, tPay = 0, tFee = 0, tRem = 0;
        let startDate = new Date();

        for(let i=1; i<=duration; i++) {
            let payDate = new Date(startDate); payDate.setMonth(startDate.getMonth() + i);
            let dateStr = payDate.getFullYear() + '/' + String(payDate.getMonth() + 1).padStart(2, '0') + '/15';
            
            if(isExtended) {
                let currentPayment = monthlyProfit;
                let noteText = "توزيع أرباح";
                if(i === duration) { currentPayment += capital; noteText = "أرباح + استرداد رأس المال"; }
                let currentRemaining = currentPayment - totalMonthlyFinal;
                distBody += `<tr><td>${dateStr}</td><td>${window.formatMoneySafe(monthlyProfit)}</td><td>${window.formatMoneySafe(currentPayment)}</td><td style="color:#ef4444;">${window.formatMoneySafe(totalMonthlyFinal)}</td><td style="color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(currentRemaining)}</td><td style="font-size:11px; color:#64748b;">${noteText}</td></tr>`;
                tProf += monthlyProfit; tPay += currentPayment; tFee += totalMonthlyFinal; tRem += currentRemaining;
            } else {
                let monthlyTotalPayment = monthlyCapital + monthlyProfit;
                let monthlyRemaining = monthlyTotalPayment - totalMonthlyFinal;
                distBody += `<tr><td>${dateStr}</td><td>${window.formatMoneySafe(monthlyCapital)}</td><td>${window.formatMoneySafe(monthlyProfit)}</td><td>${window.formatMoneySafe(monthlyTotalPayment)}</td><td style="color:#ef4444;">${window.formatMoneySafe(totalMonthlyFinal)}</td><td style="color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(monthlyRemaining)}</td><td>مجدولة</td></tr>`;
                tCap += monthlyCapital; tProf += monthlyProfit; tPay += monthlyTotalPayment; tFee += totalMonthlyFinal; tRem += monthlyRemaining;
            }
        }
        
        distBody += `<tr class="total-row"><td class="text-start">الإجمالي</td>${!isExtended ? `<td>${window.formatMoneySafe(tCap)}</td>` : ''}<td>${window.formatMoneySafe(tProf)}</td><td>${window.formatMoneySafe(tPay)}</td><td style="color:#ef4444;">${window.formatMoneySafe(tFee)}</td><td style="color:var(--tera-teal); font-size:16px;">${window.formatMoneySafe(tRem)}</td><td>-</td></tr>`;
        document.getElementById('distributionTableBody').innerHTML = distBody;

        let actualProductVat = capital * 0.15;
        document.getElementById('sumShares').innerText = shares;
        document.getElementById('sumCapital').innerText = window.formatMoneySafe(capital) + " ر.س";
        document.getElementById('sumProdTax').innerText = window.formatMoneySafe(actualProductVat) + " ر.س";
        document.getElementById('sumServTax').innerText = window.formatMoneySafe((pkgFee*0.15) + 21.75) + " ر.س";
        document.getElementById('sumTotalAll').innerText = window.formatMoneySafe(capital + actualProductVat + totalServiceFinal) + " ر.س";
        document.getElementById('resToPayNow').innerText = shares > 0 ? window.formatMoneySafe(capital + actualProductVat) + " ر.س" : "0.00 ر.س";
    };

    window.togglePayButton = function() { 
        let shares = parseInt(document.getElementById('shareInput').value) || 0;
        let isChecked = document.getElementById('agreeCheckbox').checked;
        document.getElementById('btnPayNow').disabled = !(isChecked && shares > 0); 
    };

    window.processPayment = function() { 
        alert(`تمت عملية الدفع بنجاح!\nمرحباً بك كشريك في منصة تيرا.`); 
        if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
            TeraApp.navigateTo('/dashboard/index.html');
        } else {
            window.location.href = "../dashboard/index.html"; 
        }
    };

    // ============================================================
    // 3. باقي دوال الصفحات
    // ============================================================
    function initOpportunities() {
        console.log('📊 [Investments] تهيئة صفحة فرص الاستثمار');
        document.querySelectorAll('.opportunity-card .btn-primary').forEach(btn => {
            btn.addEventListener('click', function(e) {
                if(this.tagName.toLowerCase() !== 'a') {
                    e.stopPropagation();
                    alert(`✅ تم المشاركة بنجاح`);
                }
            });
        });
    }

    function initTableActions() {
        document.querySelectorAll('.table-actions .btn-sm-primary').forEach(btn => {
            btn.addEventListener('click', function(e) {
                if (this.tagName.toLowerCase() === 'a' && this.getAttribute('href') !== '#') return;
                e.preventDefault();
                const row = this.closest('tr');
                if (row) {
                    const id = row.querySelector('td:first-child')?.textContent.trim();
                    if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
                        TeraApp.navigateTo(`completed-investments.html?id=${id}`);
                    } else {
                        window.location.href = `completed-investments.html?id=${id}`;
                    }
                }
            });
        });
    }

    function initExtendedInvestments() { initTableActions(); }
    function initActiveInvestments() { initTableActions(); }

    // ============================================================
    // 4. التشغيل التلقائي مع توافق הـ SPA
    // ============================================================
    function initInvestments() {
        const path = window.location.pathname.toLowerCase();
        
        // التحقق من نوع الصفحة وتشغيل الدالة الخاصة بها
        if (path.includes('investment-details')) {
            initOpportunities();
        } else if (path.includes('completed-investments') || document.getElementById('mDetOppId')) {
            initInvestmentDetails();
        } else if (path.includes('cancelled-investments') || document.getElementById('invOppName')) {
            initCancelledInvestments();
        } else if (path.includes('extended-investments')) {
            initExtendedInvestments();
        } else if (path.includes('active-investments')) {
            initActiveInvestments();
        } else {
            initTableActions();
        }
    }

    window.initInvestments = initInvestments;

    // المراقبة الديناميكية للتغيرات في الـ DOM (حل مشكلة الـ SPA نهائياً)
    let lastUrl = location.href; 
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(initInvestments, 150); // تأخير لضمان حقن عناصر HTML
      }
    }).observe(document, {subtree: true, childList: true});

    // التشغيل الأول عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initInvestments, 100));
    } else {
        setTimeout(initInvestments, 100);
    }

})();
