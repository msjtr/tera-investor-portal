/**
 * ============================================================
 * investments.js - ملف التحكم المركزي للاستثمارات (الإصدار الاحترافي)
 * ============================================================
 * تم دعم التنبيهات الذكية الديناميكية (Smart Alerts) للسوق والتفاصيل.
 * ============================================================
 */

(function() {
    'use strict';

    if (window.InvestmentsManagerLoaded) return;
    window.InvestmentsManagerLoaded = true;

    let isUpdating = false;

    // ============================================================
    // 1. قاعدة البيانات المركزية الموحدة
    // ============================================================
    window.mockData = [
        { id: "TR-2026-06-20-001", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 10, reqEntity: "افراد", company: "تمويل أفراد - شراء احتياجات", sharesCount: 100, sharePrice: 100, capital: 10000, expectedProfit: 5000, roi: 50, duration: 6, offeringPeriod: "01/06/2026 - 15/06/2026", reqDate: "2026/05/20" },
        { id: "TR-2026-06-20-002", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 85, reqEntity: "افراد", company: "تمويل أفراد - زواج", sharesCount: 50, sharePrice: 500, capital: 25000, expectedProfit: 10000, roi: 40, duration: 6, offeringPeriod: "05/06/2026 - 20/06/2026", reqDate: "2026/05/25" },
        { id: "TR-2026-06-20-003", type: "شراكة ممتدة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 4, reqEntity: "افراد", company: "تمويل أفراد - ترميم منزل", sharesCount: 80, sharePrice: 200, capital: 16000, expectedProfit: 4800, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/05" },
        { id: "TR-2026-06-20-004", type: "شراكة ممتدة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - سيارة", sharesCount: 40, sharePrice: 1000, capital: 40000, expectedProfit: 8000, roi: 20, duration: 6, offeringPeriod: "15/04/2026 - 30/04/2026", reqDate: "2026/04/01" },
        { id: "TR-2026-06-20-005", type: "شراكة ممتدة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - شخصي", sharesCount: 100, sharePrice: 50, capital: 5000, expectedProfit: 2000, roi: 40, duration: 6, offeringPeriod: "10/03/2026 - 25/03/2026", reqDate: "2026/02/20" },
        { id: "TR-2026-06-20-006", type: "شراكة ممتدة", status: "المغلقة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - طبي", sharesCount: 20, sharePrice: 500, capital: 10000, expectedProfit: 4000, roi: 40, duration: 6, offeringPeriod: "05/02/2026 - 20/02/2026", reqDate: "2026/01/15" },
        { id: "FTR-2026-06-20-007", type: "فرصة شراكة", status: "النشطة", fundedPercentage: 20, reqEntity: "افراد", company: "فرصة شراكة - تأثيث منزل", sharesCount: 50, sharePrice: 1000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "02/06/2026 - 17/06/2026", reqDate: "2026/05/22" },
        { id: "FTR-2026-06-20-008", type: "فرصة شراكة", status: "النشطة", fundedPercentage: 95, daysLeftToJoin: 1, reqEntity: "افراد", company: "فرصة شراكة - سفر وسياحة", sharesCount: 20, sharePrice: 2000, capital: 40000, expectedProfit: 16000, roi: 40, duration: 6, offeringPeriod: "08/06/2026 - 23/06/2026", reqDate: "2026/05/28" },
        { id: "FTR-2026-06-20-009", type: "فرصة شراكة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 2, reqEntity: "افراد", company: "فرصة شراكة - استثمار مبدئي", sharesCount: 100, sharePrice: 200, capital: 20000, expectedProfit: 6000, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/15" },
        { id: "FTR-2026-06-20-010", type: "فرصة شراكة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - عقار سكني", sharesCount: 10, sharePrice: 5000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "10/04/2026 - 25/04/2026", reqDate: "2026/03/25" },
        { id: "FTR-2026-06-20-011", type: "فرصة شراكة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - تجارة إلكترونية", sharesCount: 20, sharePrice: 600, capital: 12000, expectedProfit: 4800, roi: 40, duration: 6, offeringPeriod: "05/03/2026 - 20/03/2026", reqDate: "2026/02/18" },
        { id: "FTR-2026-06-20-012", type: "فرصة شراكة", status: "الملغاة", fundedPercentage: 0, reqEntity: "افراد", company: "فرصة شراكة - تطبيق ذكي", sharesCount: 40, sharePrice: 1500, capital: 60000, expectedProfit: 30000, roi: 50, duration: 6, offeringPeriod: "14/06/2026 - 29/06/2026", reqDate: "2026/06/01" }
    ];

    window.formatMoneySafe = function(num) { return parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    window.getBadgeClass = function(s) { return s === 'النشطة' ? 'status-active' : (s === 'القادمة' ? 'status-upcoming' : 'status-completed'); };
    window.getTypeBadgeClass = function(t) { return t === 'شراكة ممتدة' ? 'type-extended' : 'type-opportunity'; };

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
    // 2. المكون الديناميكي لبناء لوحة التنبيهات الذكية (Smart Alerts)
    // ============================================================
    window.buildAlertBanner = function(opp) {
        let availableSharesToBuy = Math.floor(opp.sharesCount * (1 - (opp.fundedPercentage / 100)));
        if (availableSharesToBuy < 0) availableSharesToBuy = 0;

        let icon = 'fa-bolt'; let iconColor = '#f59e0b'; let pulseClass = 'main-icon';
        let title = ''; let desc = ''; let timeText = ''; let timeColor = '#ea580c'; let timeBg = '#ffedd5'; let timeIcon = 'fa-hourglass-half';
        let statusIcon = 'fa-check-circle'; let statusColor = '#10b981'; let statusBg = '#dcfce7';

        // تغيير التصميم ديناميكياً بناءً على حالة الفرصة
        if (opp.status === 'النشطة') {
            title = 'فرصة استثمارية نشطة';
            desc = opp.fundedPercentage >= 80 ? 'الفرصة قاربت على الاكتمال! سارع بالانضمام قبل نفاذ الأسهم.' : 'متاحة الآن للانضمام، اغتنم الفرصة وحقق عوائد مجزية.';
            timeText = 'متاح الآن - ينتهي قريباً';
            if (opp.daysLeftToJoin) timeText = `متبقي ${opp.daysLeftToJoin} أيام`;
        } else if (opp.status === 'القادمة') {
            icon = 'fa-clock'; iconColor = '#0ea5e9'; pulseClass = '';
            title = 'فرصة استثمارية قادمة';
            desc = 'هذه الفرصة ستطرح قريباً، استعد للانضمام للمشاركة فور فتح باب الطرح.';
            timeText = `يبدأ بعد ${opp.daysLeftToStart || 3} أيام`;
            timeColor = '#0284c7'; timeBg = '#e0f2fe';
            statusIcon = 'fa-calendar-alt'; statusColor = '#0284c7'; statusBg = '#e0f2fe';
        } else if (opp.status === 'المكتملة' || opp.status === 'المنتهية' || opp.status === 'المغلقة') {
            icon = 'fa-check-circle'; iconColor = '#10b981'; pulseClass = '';
            title = 'فرصة استثمارية مكتملة/مغلقة';
            desc = 'تم إغلاق هذه الفرصة لاكتمال الطرح بنجاح. شكراً لجميع الشركاء.';
            timeText = 'منتهية الصلاحية';
            timeColor = '#64748b'; timeBg = '#f1f5f9';
            statusIcon = 'fa-lock'; statusColor = '#64748b'; statusBg = '#f1f5f9';
        } else {
            icon = 'fa-ban'; iconColor = '#ef4444'; pulseClass = '';
            title = 'فرصة ملغاة';
            desc = 'تم إيقاف أو إلغاء هذه الفرصة من قبل الإدارة.';
            timeText = 'غير متاح';
            timeColor = '#ef4444'; timeBg = '#fee2e2';
            statusIcon = 'fa-times-circle'; statusColor = '#ef4444'; statusBg = '#fee2e2';
        }

        return `
        <div class="status-banner no-print" style="margin-bottom: 25px;">
            <div class="banner-header">
                <i class="fas ${icon} ${pulseClass}" style="color: ${iconColor};"></i>
                <div>
                    <h4>${title} <span class="mono text-teal" style="font-size:13px; background:#e0f2fe; padding:4px 10px; border-radius:6px; margin-right:10px; border: 1px solid #bae6fd; display:inline-block;">رقم الفرصة: ${opp.id}</span></h4>
                    <p>${desc}</p>
                </div>
            </div>
            <div class="banner-stats">
                <div class="stat-badge">
                    <div class="icon-box" style="color: ${timeColor}; background: ${timeBg};"><i class="fas ${timeIcon}"></i></div>
                    <div class="stat-info">
                        <span>حالة الوقت / الطرح</span>
                        <strong style="color: ${timeColor};">${timeText}</strong>
                    </div>
                </div>
                <div class="stat-badge">
                    <div class="icon-box" style="color: #e11d48; background: #ffe4e6;"><i class="fas fa-ticket-alt"></i></div>
                    <div class="stat-info">
                        <span>الأسهم المتبقية والمتاحة</span>
                        <strong style="color: #e11d48;">${availableSharesToBuy} سهم فقط</strong>
                    </div>
                </div>
                <div class="stat-badge">
                    <div class="icon-box" style="color: ${statusColor}; background: ${statusBg};"><i class="fas ${statusIcon}"></i></div>
                    <div class="stat-info">
                        <span>حالة الفرصة الحالية</span>
                        <strong style="color: ${statusColor};">${opp.status}</strong>
                    </div>
                </div>
            </div>
        </div>`;
    };

    // ============================================================
    // 3. تهيئة صفحة السوق (opportunities.html) 
    // ============================================================
    function initOpportunities() {
        let gridCont = document.getElementById('gridContainer');
        if (!gridCont) return;

        window.currentViewStyle = window.currentViewStyle || 'list';

        window.switchView = function(view) {
            window.currentViewStyle = view;
            const gridBtn = document.getElementById('btnGrid'), listBtn = document.getElementById('btnList');
            if(gridBtn) gridBtn.classList.toggle('active', view === 'grid');
            if(listBtn) listBtn.classList.toggle('active', view === 'list');
            window.applyFilters();
        };

        window.renderOpportunities = function(data) {
            const listBody = document.getElementById('listTableBody'), listCont = document.getElementById('listContainer'), emptyState = document.getElementById('emptyState');
            if(!gridCont || !listBody) return;

            gridCont.innerHTML = ''; listBody.innerHTML = '';
            
            if(data.length === 0) {
                if(emptyState) emptyState.style.display = 'block';
                gridCont.style.display = 'none'; if(listCont) listCont.style.display = 'none'; 
                return;
            } else {
                if(emptyState) emptyState.style.display = 'none';
                if(window.currentViewStyle === 'grid') { gridCont.style.display = 'grid'; if(listCont) listCont.style.display = 'none'; } 
                else { gridCont.style.display = 'none'; if(listCont) listCont.style.display = 'block'; }
            }

            data.forEach(item => {
                const badge = window.getBadgeClass(item.status), typeBadge = window.getTypeBadgeClass(item.type), detailUrl = `completed-investments.html?id=${item.id}`;
                
                gridCont.innerHTML += `
                    <div class="opp-card">
                        <div class="opp-header">
                            <div><span class="type-badge ${typeBadge}">${item.type}</span></div>
                            <span class="badge ${badge}">${item.status}</span>
                        </div>
                        <div class="progress-wrapper" style="padding: 10px 20px 0;">
                            <div class="progress-text"><span>نسبة الاكتمال</span><span>${item.fundedPercentage}%</span></div>
                            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${item.fundedPercentage}%"></div></div>
                        </div>
                        <div class="opp-body">
                            <div class="opp-metric"><span>الجهة الطالبة</span><strong>${item.reqEntity}</strong></div>
                            <div class="opp-metric"><span>فترة الطرح</span><strong style="font-size:11px; font-family:monospace;">${item.offeringPeriod}</strong></div>
                            <div class="opp-metric"><span>عدد الأسهم</span><strong>${item.sharesCount}</strong></div>
                            <div class="opp-metric"><span>قيمة السهم</span><strong>${window.formatMoneySafe(item.sharePrice)} ر.س</strong></div>
                            <div class="opp-metric" style="grid-column: span 2;"><span>إجمالي رأس المال</span><strong style="color:var(--tera-teal); font-size:15px;">${window.formatMoneySafe(item.capital)} ر.س</strong></div>
                        </div>
                        <div class="opp-footer" style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0;">
                            <span style="font-size:12px; font-family:monospace; color:var(--tera-gray); font-weight:700;">${item.id}</span>
                            <a href="${detailUrl}" class="btn-action btn-view"><i class="fas fa-book-open"></i> التفاصيل</a>
                        </div>
                    </div>`;

                listBody.innerHTML += `<tr><td style="font-family: monospace; font-weight: 700; color:var(--tera-navy);">${item.id}</td><td><span class="type-badge ${typeBadge}">${item.type}</span></td><td style="font-weight:700;">${item.reqEntity}</td><td style="font-family: monospace;">${item.offeringPeriod}</td><td style="font-weight: 800; color:var(--tera-navy);">${item.sharesCount}</td><td style="font-family:monospace;">${window.formatMoneySafe(item.sharePrice)}</td><td style="font-family:monospace; color:var(--tera-teal); font-weight:bold;">${window.formatMoneySafe(item.capital)}</td><td><div style="display:flex; align-items:center; gap:8px;"><span style="font-weight:700; font-size:12px;">${item.fundedPercentage}%</span><div class="progress-bar-bg" style="width:60px; height:6px;"><div class="progress-bar-fill" style="width:${item.fundedPercentage}%"></div></div></div></td><td><span class="badge ${badge}">${item.status}</span></td><td><a href="${detailUrl}" class="btn-action btn-view">عرض</a></td></tr>`;
            });
        };

        window.applyFilters = function() {
            const typeFilter = document.getElementById('typeFilter'), statusFilter = document.getElementById('statusFilter'), searchInput = document.getElementById('searchInput');
            let typeVal = typeFilter ? typeFilter.value : 'all', statusVal = statusFilter ? statusFilter.value : 'all', searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

            let filtered = window.mockData.filter(d => {
                let mType = typeVal === 'all' || d.type === typeVal;
                let mStatus = (statusVal === 'all') ? true : (d.status === statusVal);
                let mSearch = d.id.toLowerCase().includes(searchVal) || d.company.toLowerCase().includes(searchVal);
                return mType && mStatus && mSearch;
            });

            window.renderOpportunities(filtered);
            
            let active = 0, upcoming = 0, completed = 0;
            filtered.forEach(d => {
                if(d.status === 'النشطة') active++;
                if(d.status === 'القادمة') upcoming++;
                if(d.status === 'المكتملة') completed++;
            });
            if(document.getElementById('sumActive')) document.getElementById('sumActive').innerText = active;
            if(document.getElementById('sumUpcoming')) document.getElementById('sumUpcoming').innerText = upcoming;
            if(document.getElementById('sumCompleted')) document.getElementById('sumCompleted').innerText = completed;

            // إصلاح المؤشرات والرسوم البيانية (Chart.js)
            try {
                if(typeof Chart !== 'undefined') {
                    let counts = { active:0, upcoming:0, finished:0, closed:0, cancelled:0, completed:0 };
                    filtered.forEach(d => {
                        if(d.status === 'النشطة') counts.active++;
                        else if(d.status === 'القادمة') counts.upcoming++;
                        else if(d.status === 'المن
