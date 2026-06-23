/**
 * ============================================================
 * 1. investments.js - النواة المركزية وقاعدة البيانات (Core)
 * ============================================================
 */

(function() {
    'use strict';

    if (window.InvestmentsCoreLoaded) return;
    window.InvestmentsCoreLoaded = true;

    window.mockData = [
        { id: "TR-2026-06-20-001", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 10, reqEntity: "افراد", company: "تمويل أفراد - شراء احتياجات", sharesCount: 100, sharePrice: 100, capital: 10000, expectedProfit: 5000, roi: 50, duration: 6, offeringPeriod: "01/06/2026 - 15/06/2026", reqDate: "2026/05/20", daysLeftToJoin: 14 },
        { id: "TR-2026-06-20-002", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 85, reqEntity: "افراد", company: "تمويل أفراد - زواج", sharesCount: 50, sharePrice: 500, capital: 25000, expectedProfit: 10000, roi: 40, duration: 6, offeringPeriod: "05/06/2026 - 20/06/2026", reqDate: "2026/05/25", daysLeftToJoin: 2 },
        { id: "TR-2026-06-20-003", type: "شراكة ممتدة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 4, reqEntity: "افراد", company: "تمويل أفراد - ترميم منزل", sharesCount: 80, sharePrice: 200, capital: 16000, expectedProfit: 4800, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/05" },
        { id: "TR-2026-06-20-004", type: "شراكة ممتدة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - سيارة", sharesCount: 40, sharePrice: 1000, capital: 40000, expectedProfit: 8000, roi: 20, duration: 6, offeringPeriod: "15/04/2026 - 30/04/2026", reqDate: "2026/04/01" },
        { id: "TR-2026-06-20-005", type: "شراكة ممتدة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - شخصي", sharesCount: 100, sharePrice: 50, capital: 5000, expectedProfit: 2000, roi: 40, duration: 6, offeringPeriod: "10/03/2026 - 25/03/2026", reqDate: "2026/02/20" },
        { id: "TR-2026-06-20-006", type: "شراكة ممتدة", status: "المغلقة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - طبي", sharesCount: 20, sharePrice: 500, capital: 10000, expectedProfit: 4000, roi: 40, duration: 6, offeringPeriod: "05/02/2026 - 20/02/2026", reqDate: "2026/01/15" },
        { id: "FTR-2026-06-20-007", type: "فرصة شراكة", status: "النشطة", fundedPercentage: 20, reqEntity: "افراد", company: "فرصة شراكة - تأثيث منزل", sharesCount: 50, sharePrice: 1000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "02/06/2026 - 17/06/2026", reqDate: "2026/05/22", daysLeftToJoin: 10 },
        { id: "FTR-2026-06-20-008", type: "فرصة شراكة", status: "النشطة", fundedPercentage: 95, reqEntity: "افراد", company: "فرصة شراكة - سفر وسياحة", sharesCount: 20, sharePrice: 2000, capital: 40000, expectedProfit: 16000, roi: 40, duration: 6, offeringPeriod: "08/06/2026 - 23/06/2026", reqDate: "2026/05/28", daysLeftToJoin: 1 },
        { id: "FTR-2026-06-20-009", type: "فرصة شراكة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 2, reqEntity: "افراد", company: "فرصة شراكة - استثمار مبدئي", sharesCount: 100, sharePrice: 200, capital: 20000, expectedProfit: 6000, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/15" },
        { id: "FTR-2026-06-20-010", type: "فرصة شراكة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - عقار سكني", sharesCount: 10, sharePrice: 5000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "10/04/2026 - 25/04/2026", reqDate: "2026/03/25" },
        { id: "FTR-2026-06-20-011", type: "فرصة شراكة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - تجارة إلكترونية", sharesCount: 20, sharePrice: 600, capital: 12000, expectedProfit: 4800, roi: 40, duration: 6, offeringPeriod: "05/03/2026 - 20/03/2026", reqDate: "2026/02/18" },
        { id: "FTR-2026-06-20-012", type: "فرصة شراكة", status: "الملغاة", fundedPercentage: 0, reqEntity: "افراد", company: "فرصة شراكة - تطبيق ذكي", sharesCount: 40, sharePrice: 1500, capital: 60000, expectedProfit: 30000, roi: 50, duration: 6, offeringPeriod: "14/06/2026 - 29/06/2026", reqDate: "2026/06/01" }
    ];

    window.formatMoneySafe = function(num) { return parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    window.getBadgeClass = function(s) { return ['قائم', 'النشطة'].includes(s) ? 'status-active' : (s === 'القادمة' ? 'status-upcoming' : 'status-completed'); };
    window.getTypeBadgeClass = function(t) { return t === 'شراكة ممتدة' ? 'type-extended' : 'type-opportunity'; };

    // نظام حفظ المعرفات للتنقل في الـ SPA
    document.addEventListener('click', function(e) {
        let link = e.target.closest('a');
        if (link && link.href && link.href.indexOf('id=') !== -1) {
            try {
                let url = new URL(link.href, window.location.href);
                let id = url.searchParams.get('id');
                if (id) localStorage.setItem('tera_active_opp_id', id.trim().toLowerCase());
            } catch(err) {}
        }
    });

    window.getSafeOppId = function() {
        let urlParams = new URLSearchParams(window.location.search);
        let id = urlParams.get('id');
        if (!id) id = localStorage.getItem('tera_active_opp_id');
        return id ? id.trim().toLowerCase() : null;
    };

    // المكون الذكي للتنبيهات
    window.buildAlertBanner = function(opp) {
        let availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        if (availableSharesToBuy < 0) availableSharesToBuy = 0;

        let icon = 'fa-bolt', title = 'الشراكة متاحة', timeText = 'متاح الآن للاكتتاب'; 
        if (opp.status === 'النشطة' || opp.status === 'قائم') {
            timeText = opp.daysLeftToJoin ? 'متبقي ' + opp.daysLeftToJoin + ' أيام' : 'ينتهي قريباً';
        } else if (opp.status === 'القادمة') {
            icon = 'fa-clock'; title = 'الطرح القادم'; timeText = 'يبدأ بعد ' + (opp.daysLeftToStart || 3) + ' أيام';
        } else {
            icon = 'fa-lock'; title = 'مكتمل ومغلق'; timeText = 'اكتمل التمويل';
        }

        let typeBadgeHtml = opp.type === 'شراكة ممتدة' 
            ? '<span style="font-size:11px; background:#fef3c7; color:#d97706; padding:2px 7px; border-radius:4px; margin-right:8px; border:1px solid #fde68a; font-weight:700;">شراكة ممتدة</span>'
            : '<span style="font-size:11px; background:#fce7f3; color:#db2777; padding:2px 7px; border-radius:4px; margin-right:8px; border:1px solid #fbcfe8; font-weight:700;">فرصة شراكة</span>';

        return `
            <div style="display: flex; flex-direction: column; background: linear-gradient(90deg, var(--tera-navy) 0%, var(--tera-teal) 100%); color: #fff; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(2, 128, 144, 0.15); font-family: 'Tajawal', sans-serif; gap: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:15px; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <strong style="color: #fde047; font-size: 15px; font-weight: 800;"><i class="fas ${icon}"></i> ${title}</strong>
                        ${typeBadgeHtml}
                        <span style="font-weight:800; font-family:monospace; font-size:14px; background:rgba(255,255,255,0.15); padding:3px 10px; border-radius:6px; letter-spacing:0.5px;">رقم الفرصة: ${opp.id}</span>
                    </div>
                    <a href="completed-investments.html?id=${opp.id}" style="background:#fde047; color:#854d0e; padding:8px 20px; border-radius:8px; text-decoration:none; font-weight:800; font-size:13px; transition:0.2s; display:inline-flex; align-items:center; gap:8px;">
                        <i class="fas fa-external-link-alt"></i> الدخول لتفاصيل الفرصة
                    </a>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                    <div style="flex: 1; text-align: center; border-left: 1px solid rgba(255,255,255,0.15); padding: 0 10px;">
                        <strong style="display:block; font-size:13px; margin-bottom:4px; color:#fff; font-weight:700;">حالة الفرصة</strong>
                        <span style="font-weight:bold; background:rgba(255,255,255,0.2); padding:3px 8px; border-radius:4px; display:inline-block; font-size:12px;">${opp.status}</span>
                    </div>
                    <div style="flex: 1; text-align: center; border-left: 1px solid rgba(255,255,255,0.15); padding: 0 10px;">
                        <strong style="display:block; font-size:13px; margin-bottom:4px; color:#fff; font-weight:700;">الوقت المتبقي</strong>
                        <span style="font-size:14px; font-weight:800; color:#fff;">${timeText}</span>
                    </div>
                    <div style="flex: 1; text-align: center; border-left: 1px solid rgba(255,255,255,0.15); padding: 0 10px;">
                        <strong style="display:block; font-size:13px; margin-bottom:4px; color:#fff; font-weight:700;">نسبة الاكتمال</strong>
                        <span style="font-family: monospace; font-size: 15px; font-weight:800; color:#fff;">${opp.fundedPercentage}%</span>
                    </div>
                    <div style="flex: 1; text-align: center; border-left: 1px solid rgba(255,255,255,0.15); padding: 0 10px;">
                        <strong style="display:block; font-size:13px; margin-bottom:4px; color:#fff; font-weight:700;">الأسهم المتاحة</strong>
                        <span style="font-family: monospace; font-size: 15px; font-weight:800; color:#fff;">${availableSharesToBuy} سهم</span>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 0 10px;">
                        <strong style="display:block; font-size:13px; margin-bottom:4px; color:#fff; font-weight:700;">العائد من الشراكة</strong>
                        <span style="font-family: monospace; font-size: 15px; font-weight:800; color:#fde047;">${opp.roi || 0}%</span>
                    </div>
                </div>
            </div>`;
    };

    // المراقب المركزي للـ SPA
    let isUpdating = false;
    window.initInvestments = function() {
        if (isUpdating) return; 
        isUpdating = true;

        if(typeof window.initOpportunities === 'function') window.initOpportunities();
        if(typeof window.initInvestmentDetails === 'function') window.initInvestmentDetails();
        if(typeof window.initCancelledInvestments === 'function') window.initCancelledInvestments();

        setTimeout(function() { isUpdating = false; }, 150);
    };

    new MutationObserver(function() {
        if (!isUpdating) window.initInvestments();
    }).observe(document.body, { childList: true, subtree: true });

})();
