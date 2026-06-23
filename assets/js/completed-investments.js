/**
 * ============================================================
 * 3. completed-investments.js - تفاصيل الفرصة والتنبيهات
 * ============================================================
 */

(function() {
    'use strict';

    window.initInvestmentDetails = function() {
        // التحقق من وجود عنصر الـ ID الخاص بالصفحة لمنع الأخطاء في الصفحات الأخرى
        let idEl = document.getElementById('mDetOppId');
        if (!idEl || idEl.innerText !== '-') return;

        // جلب معرف الفرصة من الرابط أو التخزين المؤقت
        let oppId = window.getSafeOppId();
        let opp = oppId ? window.mockData.find(d => d.id.toLowerCase() === oppId) : null;
        
        // إذا لم يجد الفرصة، يعرض أول فرصة كنموذج
        if (!opp) opp = window.mockData[0];

        // 1. تعبئة البيانات الأساسية للفرصة
        document.getElementById('pageMainTitle').innerText = "تفاصيل الفرصة: " + opp.company;
        document.getElementById('mDetOppId').innerText = opp.id;
        document.getElementById('mDetOppCompany').innerText = opp.company;
        
        // شريط التقدم الدائري أو العرضي
        document.getElementById('mDetProgressText').innerText = opp.fundedPercentage + '%';
        // إضافة تأخير بسيط لجعل حركة شريط التقدم تظهر بشكل جميل
        setTimeout(() => {
            let progressBar = document.getElementById('mDetProgressBar');
            if(progressBar) progressBar.style.width = opp.fundedPercentage + '%';
        }, 100);

        document.getElementById('mDetOppStatus').innerText = opp.status;
        document.getElementById('mDetOfferingPeriod').innerText = opp.offeringPeriod;
        document.getElementById('mDetSharesCount').innerText = opp.sharesCount;
        document.getElementById('mDetSharePrice').innerText = window.formatMoneySafe(opp.sharePrice) + ' ر.س';
        document.getElementById('mDetTotalCapital').innerText = window.formatMoneySafe(opp.capital) + ' ر.س';
        document.getElementById('mDetRatio').innerText = opp.roi + "%";
        
        // ضبط شارة نوع الفرصة واللون المناسب
        let typeBadgeEl = document.getElementById('mDetOppType');
        if(typeBadgeEl) {
            typeBadgeEl.innerText = opp.type;
            typeBadgeEl.className = opp.type === 'فرصة شراكة' ? 'type-badge type-opportunity' : 'type-badge type-extended';
        }

        // 2. تعبئة تفاصيل المنتج والضرائب
        document.getElementById('mDetReqDate').innerText = opp.reqDate || "2026/05/20";
        document.getElementById('mDetProductQty').innerText = opp.sharesCount * 5;
        document.getElementById('mDetProdVal').innerText = window.formatMoneySafe(opp.capital) + ' ر.س';
        document.getElementById('mDetProdPrice').innerText = window.formatMoneySafe(opp.sharePrice / 5) + ' ر.س';
        document.getElementById('mDetTax').innerText = window.formatMoneySafe(opp.capital * 0.15) + ' ر.س';
        document.getElementById('mDetTotalProd').innerText = window.formatMoneySafe(opp.capital * 1.15) + ' ر.س';

        // 3. حقن بانر التنبيهات الذكي أعلى الصفحة
        const alertsCont = document.getElementById('mDetAlertsContainer');
        if (alertsCont && !alertsCont.hasAttribute('data-loaded')) {
            alertsCont.innerHTML = window.buildAlertBanner(opp);
            alertsCont.setAttribute('data-loaded', 'true');
        }

        // 4. التحكم الذكي بظهور صندوق الشروط والأحكام وزر الانضمام
        const joinWrapper = document.getElementById('joinActionWrapper');
        const btnJoin = document.getElementById('btnRedirectToJoin');
        let availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));

        if (joinWrapper && btnJoin) {
            // إظهار صندوق الموافقة وزر الانضمام فقط إذا كانت الفرصة (نشطة) ويوجد أسهم متاحة للشراء
            if ((opp.status === 'النشطة' || opp.status === 'قائم') && availableSharesToBuy > 0) {
                joinWrapper.style.display = 'block';
                // يمكنك تعديل الرابط أدناه لتوجيه المستخدم إلى صفحة الدفع الصحيحة
                btnJoin.href = "cancelled-investments.html?id=" + opp.id;
            } else {
                // إخفاء صندوق الموافقة وزر الانضمام إذا كانت الفرصة مكتملة أو مغلقة
                joinWrapper.style.display = 'none';
            }
        }
    };

    // 🌟 التشغيل الفوري والذاتي عند القراءة لضمان تعبئة البيانات فوراً في تطبيقات الصفحة الواحدة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initInvestmentDetails);
    } else {
        window.initInvestmentDetails();
    }

})();
