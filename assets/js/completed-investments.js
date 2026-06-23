/**
 * ============================================================
 * 3. completed-investments.js - تفاصيل الفرصة والتنبيهات (النسخة الآمنة)
 * ============================================================
 */

(function() {
    'use strict';

    window.initInvestmentDetails = function() {
        // التأكد من وجود العنصر الأساسي لضمان عمل السكريبت في صفحة التفاصيل فقط
        let idEl = document.getElementById('mDetOppId');
        if (!idEl) return;

        // جلب معرف الفرصة من الرابط أو التخزين المؤقت
        let oppId = window.getSafeOppId();
        let opp = oppId ? window.mockData.find(d => d.id.toLowerCase() === oppId) : null;
        
        // إذا لم يجد الفرصة (أو تم الدخول برابط مباشر)، يعرض أول فرصة كنموذج
        if (!opp && window.mockData && window.mockData.length > 0) opp = window.mockData[0];
        if (!opp) return;

        // الحماية المتقدمة: قفل لمنع التحديث المتكرر (Infinite Loop) مع المراقب المركزي
        if (idEl.getAttribute('data-current-id') === opp.id) return;
        idEl.setAttribute('data-current-id', opp.id);

        // دالة مساعدة ذكية: لتعبئة النصوص بأمان تام حتى لو كان العنصر غير موجود في الـ HTML
        const setTxt = (id, txt) => { 
            let el = document.getElementById(id); 
            if(el) el.innerText = txt; 
        };

        // 1. تعبئة البيانات الأساسية للفرصة
        setTxt('pageMainTitle', "تفاصيل الفرصة: " + opp.company);
        setTxt('mDetOppId', opp.id);
        setTxt('mDetOppCompany', opp.company);
        setTxt('mDetProgressText', opp.fundedPercentage + '%');
        setTxt('mDetOppStatus', opp.status);
        setTxt('mDetOfferingPeriod', opp.offeringPeriod);
        setTxt('mDetSharesCount', opp.sharesCount);
        setTxt('mDetSharePrice', window.formatMoneySafe(opp.sharePrice) + ' ر.س');
        setTxt('mDetTotalCapital', window.formatMoneySafe(opp.capital) + ' ر.س');
        setTxt('mDetRatio', (opp.roi || 0) + "%");

        // تحريك شريط التقدم بلمسة سلسة
        let progressBar = document.getElementById('mDetProgressBar');
        if(progressBar) {
            setTimeout(() => { progressBar.style.width = opp.fundedPercentage + '%'; }, 100);
        }
        
        // ضبط شارة نوع الفرصة واللون المناسب
        let typeBadgeEl = document.getElementById('mDetOppType');
        if(typeBadgeEl) {
            typeBadgeEl.innerText = opp.type;
            typeBadgeEl.className = opp.type === 'فرصة شراكة' ? 'type-badge type-opportunity' : 'type-badge type-extended';
        }

        // 2. تعبئة تفاصيل المنتج والضرائب
        setTxt('mDetReqDate', opp.reqDate || "2026/05/20");
        setTxt('mDetProductQty', opp.sharesCount * 5);
        setTxt('mDetProdVal', window.formatMoneySafe(opp.capital) + ' ر.س');
        setTxt('mDetProdPrice', window.formatMoneySafe(opp.sharePrice / 5) + ' ر.س');
        setTxt('mDetTax', window.formatMoneySafe(opp.capital * 0.15) + ' ر.س');
        setTxt('mDetTotalProd', window.formatMoneySafe(opp.capital * 1.15) + ' ر.س');

        // 3. حقن بانر التنبيهات الذكي أعلى الصفحة
        const alertsCont = document.getElementById('mDetAlertsContainer');
        if (alertsCont && typeof window.buildAlertBanner === 'function') {
            alertsCont.innerHTML = window.buildAlertBanner(opp);
        }

        // 4. التحكم الذكي بظهور صندوق الشروط والأحكام وزر الانضمام
        const joinWrapper = document.getElementById('joinActionWrapper');
        const btnJoin = document.getElementById('btnRedirectToJoin');
        let availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        if (availableSharesToBuy < 0) availableSharesToBuy = 0;

        if (joinWrapper && btnJoin) {
            // إظهار صندوق الموافقة وزر الانضمام فقط إذا كانت الفرصة (نشطة) ويوجد أسهم متاحة للشراء
            if ((opp.status === 'النشطة' || opp.status === 'قائم') && availableSharesToBuy > 0) {
                joinWrapper.style.display = 'block';
                // توجيه المستخدم لصفحة الشراء مع الاحتفاظ بمعرف الفرصة
                btnJoin.href = "cancelled-investments.html?id=" + opp.id;
            } else {
                // إخفاء صندوق الموافقة وزر الانضمام لأن الفرصة غير متاحة
                joinWrapper.style.display = 'none';
            }
        }
    };

    // 🌟 التشغيل الفوري والذاتي عند القراءة لضمان التعبئة المباشرة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initInvestmentDetails);
    } else {
        window.initInvestmentDetails();
    }

})();
