/**
 * ============================================================
 * 1. investments.js - النواة المركزية وقاعدة البيانات (Core)
 * ============================================================
 */

(function() {
    'use strict';

    if (window.InvestmentsCoreLoaded) return;
    window.InvestmentsCoreLoaded = true;

    // قاعدة البيانات المركزية للمنصة (Mock Data)
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

    window.formatMoneySafe = function(num) { 
        return parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
    };

    window.getBadgeClass = function(s) { 
        switch(s) {
            case 'النشطة': case 'قائم': return 'status-active';
            case 'القادمة': return 'status-upcoming';
            case 'المكتملة': return 'status-completed';
            case 'المنتهية': return 'status-ended';
            case 'المغلقة': return 'status-closed';
            case 'الملغاة': return 'status-cancelled';
            default: return 'status-default';
        }
    };

    window.getTypeBadgeClass = function(t) { 
        return t === 'شراكة ممتدة' ? 'type-extended' : 'type-opportunity'; 
    };

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
            ? '<span style="font-size:11px; background:rgba(254,243,199,0.2); color:#f59e0b; padding:4px 10px; border-radius:6px; margin-right:8px; border:1px solid rgba(254,243,199,0.3); font-weight:700;">شراكة ممتدة</span>'
            : '<span style="font-size:11px; background:rgba(252,231,243,0.2); color:#ec4899; padding:4px 10px; border-radius:6px; margin-right:8px; border:1px solid rgba(252,231,243,0.3); font-weight:700;">فرصة شراكة</span>';

        return `
            <div class="glass-panel" style="display: flex; flex-direction: column; background: linear-gradient(135deg, rgba(2,48,71,0.95) 0%, rgba(2,128,144,0.95) 100%); backdrop-filter: blur(10px); color: #fff; padding: 22px; border-radius: 16px; margin-bottom: 25px; box-shadow: 0 8px 32px rgba(2, 128, 144, 0.15); border: 1px solid rgba(255,255,255,0.1); font-family: 'Tajawal', sans-serif; gap: 18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:15px; flex-wrap:wrap; gap:12px;">
                    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <strong style="color: #fde047; font-size: 16px; font-weight: 800;"><i class="fas ${icon}"></i> ${title}</strong>
                        ${typeBadgeHtml}
                        <span style="font-weight:700; font-family:monospace; font-size:13px; background:rgba(255,255,255,0.12); padding:4px 12px; border-radius:6px; letter-spacing:0.5px;">ID: ${opp.id}</span>
                    </div>
                    <a href="completed-investments.html?id=${opp.id}" style="background:#028090; color:#fff; border: 1px solid rgba(255,255,255,0.2); padding: 8px 20px; border-radius:8px; text-decoration:none; font-weight:700; font-size:13px; transition:0.2s; display:inline-flex; align-items:center; gap:8px;">
                        <i class="fas fa-external-link-alt"></i> تفاصيل الفرصة
                    </a>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                    <div style="flex: 1; min-width:100px; text-align: center; border-left: 1px solid rgba(255,255,255,0.15); padding: 0 10px;">
                        <strong style="display:block; font-size:12px; margin-bottom:6px; color:rgba(255,255,255,0.7); font-weight:500;">حالة الفرصة</strong>
                        <span style="font-weight:700; background:rgba(255,255,255,0.15); padding:3px 10px; border-radius:6px; display:inline-block; font-size:12px;">${opp.status}</span>
                    </div>
                    <div style="flex: 1; min-width:100px; text-align: center; border-left: 1px solid rgba(255,255,255,0.15); padding: 0 10px;">
                        <strong style="display:block; font-size:12px; margin-bottom:6px; color:rgba(255,255,255,0.7); font-weight:500;">الوقت المتبقي</strong>
                        <span style="font-size:14px; font-weight:800; color:#fff;">${timeText}</span>
                    </div>
                    <div style="flex: 1; min-width:100px; text-align: center; border-left: 1px solid rgba(255,255,255,0.15); padding: 0 10px;">
                        <strong style="display:block; font-size:12px; margin-bottom:6px; color:rgba(255,255,255,0.7); font-weight:500;">نسبة الاكتمال</strong>
                        <span style="font-family: monospace; font-size: 15px; font-weight:800; color:#fff;">${opp.fundedPercentage}%</span>
                    </div>
                    <div style="flex: 1; min-width:100px; text-align: center; border-left: 1px solid rgba(255,255,255,0.15); padding: 0 10px;">
                        <strong style="display:block; font-size:12px; margin-bottom:6px; color:rgba(255,255,255,0.7); font-weight:500;">الأسهم المتاحة</strong>
                        <span style="font-family: monospace; font-size: 15px; font-weight:800; color:#fff;">${availableSharesToBuy} سهم</span>
                    </div>
                    <div style="flex: 1; min-width:100px; text-align: center; padding: 0 10px;">
                        <strong style="display:block; font-size:12px; margin-bottom:6px; color:rgba(255,255,255,0.7); font-weight:500;">العائد المستهدف</strong>
                        <span style="font-family: monospace; font-size: 15px; font-weight:800; color:#fde047;">${opp.roi || 0}%</span>
                    </div>
                </div>
            </div>`;
    };

    // المراقب المركزي والتنفيذي للتطبيق (SPA Router Initializer)
    let isUpdating = false;
    let debounceTimeout = null;

    window.initInvestments = function() {
        if (isUpdating) return; 
        isUpdating = true;

        if(typeof window.initOpportunities === 'function') window.initOpportunities();
        if(typeof window.initInvestmentDetails === 'function') window.initInvestmentDetails();
        if(typeof window.initCancelledInvestments === 'function') window.initCancelledInvestments();
        
        // تم إزالة دالة initCharts الثابتة من هنا لتسليم القيادة للملف الديناميكي

        setTimeout(function() { isUpdating = false; }, 150);
    };

    // مراقبة شجرة الـ DOM لإعادة البناء عند التنقل الديناميكي دون إعادة تحميل الصفحة
    const observer = new MutationObserver(function() {
        if (!isUpdating) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(function() {
                window.initInvestments();
            }, 60);
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

})();
