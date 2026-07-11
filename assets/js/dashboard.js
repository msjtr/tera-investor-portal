/**
 * dashboard.js – لوحة التحكم (كافة العناصر: حالة الطلب، مراحل الاستكمال، شريط التقدم)
 * متوافق مع auth.js و supabase-client.js
 */
(function() {
    let supabase;
    let chartInstance = null;
    let requestData = null;
    let sessionStart = new Date();

    // ---------- دوال مساعدة ----------
    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

    function formatDateTime(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function getElapsedDays(iso) {
        if (!iso) return '';
        const diff = Math.floor((new Date() - new Date(iso)) / (1000 * 60 * 60 * 24));
        return diff < 1 ? 'أقل من يوم' : `${diff} يوم`;
    }

    function getStatusLabel(status) {
        const labels = {
            draft: 'مسودة', pending_information: 'بانتظار استكمال البيانات',
            under_review: 'قيد المراجعة', needs_revision: 'يحتاج تعديل',
            has_notes: 'توجد ملاحظات', approved: 'معتمد',
            rejected: 'مرفوض', suspended: 'موقوف'
        };
        return labels[status] || status;
    }

    // ---------- تحميل رحلة العميل (الملف الشخصي / حالة الطلب) ----------
    async function loadCustomerJourney() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: req } = await supabase
                .from('verification_requests')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            requestData = req;

            // التنبيهات العلوية
            const banner = document.getElementById('profileAlertBanner');
            if (banner) {
                banner.style.display = (!req || !req.submitted) ? 'flex' : 'none';
            }

            const contactAlert = document.getElementById('contactInfoAlert');
            if (contactAlert) {
                contactAlert.style.display = (!req || !req.contact_info_completed) ? 'flex' : 'none';
            }

            const panel = document.getElementById('requestStatusPanel');
            if (!panel) return;

            // --- الحالة 1: لم يقدم بعد (أو مسودة) ---
            if (!req || !req.submitted) {
                const stages = [
                    { key: 'personal_info_completed', label: 'المعلومات الشخصية', icon: 'fa-user', link: '/pages/profile/personal-information.html' },
                    { key: 'contact_info_completed', label: 'معلومات التواصل', icon: 'fa-phone', link: '/pages/profile/contact-information.html' },
                    { key: 'national_address_completed', label: 'العنوان الوطني الموثق', icon: 'fa-map-marker-alt', link: '/pages/profile/national-address.html' },
                    { key: 'bank_info_completed', label: 'المعلومات البنكية', icon: 'fa-university', link: '/pages/profile/bank-information.html' },
                    { key: 'attachments_completed', label: 'المرفقات والوثائق', icon: 'fa-paperclip', link: '/pages/profile/attachments.html' },
                    { key: 'agreed', label: 'الإقرار', icon: 'fa-check', link: null },
                    { key: 'submitted', label: 'المراجعة النهائية', icon: 'fa-paper-plane', link: null }
                ];

                const allCompleted = stages.every(s => req?.[s.key] === true);

                let html = `<div class="panel-card">
                    <div class="panel-header"><i class="fas fa-clipboard-check"></i><h3>حالة الاستكمال</h3></div>
                    <div style="display:flex; flex-wrap:wrap; gap:12px; padding:8px 0;">`;

                stages.forEach(stage => {
                    const done = req?.[stage.key] === true;
                    const linkOpen = stage.link ? `<a href="${stage.link}" style="text-decoration:none; color:inherit; display:block;">` : '';
                    const linkClose = stage.link ? `</a>` : '';
                    html += `
                    <div style="flex: 1 1 140px; background:${done ? '#f0fdf4' : '#f8fafc'}; border:1px solid ${done ? '#bbf7d0' : '#e2e8f0'}; border-radius:10px; padding:12px; text-align:center; transition: transform 0.2s; ${stage.link ? 'cursor:pointer;' : ''}">
                        ${linkOpen}
                        <i class="fas ${stage.icon}" style="color:${done ? '#10b981' : '#94a3b8'}; font-size:24px; margin-bottom:6px; display:block;"></i>
                        <span style="font-weight:700; font-size:14px; color:${done ? '#166534' : '#334155'};">${stage.label}</span>
                        <div style="font-size:12px; margin-top:4px; color:${done ? '#10b981' : '#64748b'};">
                            ${done ? '✔ تم الإكمال' : '⏳ بانتظار الإكمال'}
                        </div>
                        ${linkClose}
                    </div>`;
                });

                html += `</div>`;
                if (!allCompleted) {
                    html += `<div style="margin-top:12px; text-align:center;"><a href="/pages/profile/personal-information.html" class="btn-table-link">استكمال الملف الشخصي</a></div>`;
                } else {
                    html += `<div class="alert-item-box alert-success" style="margin-top:12px;"><i class="fas fa-check-circle"></i> تم استلام طلبكم بنجاح، وسيتم تحويله للمراجعة.</div>`;
                }
                html += `</div>`;
                panel.innerHTML = html;
                return;
            }

            // --- الحالة 2: الطلب مقدم (تحت المراجعة أو أي حالة أخرى) ---
            const statusIcons = {
                'under_review': 'fa-search',
                'approved': 'fa-check-circle',
                'rejected': 'fa-times-circle',
                'needs_revision': 'fa-edit',
                'pending_information': 'fa-info-circle',
                'draft': 'fa-file-alt'
            };
            const statusIcon = statusIcons[req.status] || 'fa-clock';
            const statusClass = req.status ? `status-${req.status}` : 'status-draft';

            let html = `<div class="request-status-card ${statusClass}" style="display:block;">
                <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; border-bottom:2px solid var(--gray-100); padding-bottom:16px;">
                    <div class="request-status-icon" style="width:48px; height:48px; background:#e0f2fe; color:var(--primary); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px;">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <h3 style="margin:0; font-size:18px; color:var(--gray-900);">حالة الطلب</h3>
                </div>

                <div style="text-align:center; padding:20px 0;">
                    <i class="fas ${statusIcon} status-icon-large" style="font-size:48px; color:${req.status==='approved'?'#10b981':'#f59e0b'};"></i>
                    <div class="status-badge-large" style="font-size:20px; font-weight:800; color:var(--gray-900); margin-top:12px;">${getStatusLabel(req.status)}</div>
                </div>

                <div class="request-details-list" style="background:#f8fafc; border-radius:12px; padding:16px; margin-top:16px;">
                    <div class="request-detail-item" style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <i class="fas fa-calendar-plus" style="color:var(--primary);"></i>
                        <strong>تاريخ التقديم:</strong>
                        <span>${formatDateTime(req.submitted_at)}</span>
                    </div>
                    <div class="request-detail-item" style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <i class="fas fa-history" style="color:var(--primary);"></i>
                        <strong>آخر تحديث:</strong>
                        <span>${formatDateTime(req.updated_at)}</span>
                    </div>
                    <div class="request-detail-item" style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <i class="fas fa-hourglass-half" style="color:var(--primary);"></i>
                        <strong>المدة المنقضية:</strong>
                        <span>${getElapsedDays(req.submitted_at)}</span>
                    </div>
                    <div class="request-detail-item" style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <i class="fas fa-chart-line" style="color:var(--primary);"></i>
                        <strong>نسبة الإنجاز:</strong>
                        <span>${req.progress || 0}%</span>
                    </div>
                    <div class="progress-section" style="margin-top:8px; width:100%;">
                        <div class="progress-bar-outer" style="background:#e2e8f0; border-radius:10px; height:8px; overflow:hidden;">
                            <div class="progress-bar-inner" style="width:${req.progress || 0}%; background:var(--primary); height:100%; border-radius:10px;"></div>
                        </div>
                    </div>
                    ${req.notes ? `<div class="request-detail-item" style="display:flex; justify-content:space-between; margin-top:10px;">
                        <i class="fas fa-sticky-note" style="color:var(--primary);"></i>
                        <strong>ملاحظات:</strong>
                        <span>${req.notes}</span>
                    </div>` : ''}
                </div>`;

            // المراحل الناقصة إذا كانت الحالة تتطلب استكمال
            if (req.status === 'needs_revision' || req.status === 'pending_information') {
                const stagesToCheck = [
                    { key: 'personal_info_completed', label: 'المعلومات الشخصية', link: '/pages/profile/personal-information.html' },
                    { key: 'contact_info_completed', label: 'معلومات التواصل', link: '/pages/profile/contact-information.html' },
                    { key: 'national_address_completed', label: 'العنوان الوطني الموثق', link: '/pages/profile/national-address.html' },
                    { key: 'bank_info_completed', label: 'المعلومات البنكية', link: '/pages/profile/bank-information.html' },
                    { key: 'attachments_completed', label: 'المرفقات والوثائق', link: '/pages/profile/attachments.html' }
                ];
                const pendingStages = stagesToCheck.filter(s => !req[s.key]);
                if (pendingStages.length > 0) {
                    html += `<div class="alert-warning-box" style="margin-top:16px; background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:12px 16px;">
                        <i class="fas fa-exclamation-triangle" style="color:#d97706;"></i>
                        <div style="margin-top:8px;">
                            <strong style="color:#9a3412;">تنبيه:</strong> بعض المراحل تحتاج إلى استكمال أو تعديل:
                            <ul style="margin:8px 0 0 16px; color:#78350f;">`;
                    pendingStages.forEach(s => { html += `<li><a href="${s.link}" style="color:#b45309;">${s.label}</a></li>`; });
                    html += `</ul></div></div>`;
                }
                html += `<div style="margin-top:16px; text-align:center;">
                    <a href="/pages/profile/personal-information.html" class="btn-table-link">تعديل البيانات</a>
                </div>`;
            }

            html += `</div>`;
            panel.innerHTML = html;

        } catch (e) {
            console.warn('تعذر تحميل حالة الطلب:', e);
        }
    }

    // ---------- باقي مكونات لوحة التحكم ----------
    async function loadUserInfo() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            let name = user.user_metadata?.full_name || 'مستخدم';
            const h2 = document.querySelector('.welcome-banner h2');
            if (h2) h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${name}!`;
            document.getElementById('headerUserName').textContent = name;
            document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
        } catch (e) {}
    }

    async function loadStats() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase.from('user_portfolio')
                .select('total_value, active_contracts, available_balance')
                .eq('user_id', user.id).maybeSingle();
            if (data) {
                document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = (data.total_value||0).toLocaleString() + ' ر.س';
                document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = (data.active_contracts||0) + ' عقود نشطة';
                document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = (data.available_balance||0).toLocaleString() + ' ر.س';
            }
        } catch (e) {}
    }

    async function loadChartData() {
        const ctx = document.getElementById('mainChart');
        if (!ctx || typeof Chart === 'undefined') return;
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'قيمة المحفظة', data: [], borderColor: '#028090' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function startTimers() {
        const update = () => {
            const now = new Date();
            const elDate = document.getElementById('currentDate');
            const elTime = document.getElementById('currentTime');
            const elSess = document.getElementById('sessionTimer');
            if (elDate) elDate.textContent = now.toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });
            if (elTime) elTime.textContent = now.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });
            if (elSess) {
                const mins = Math.floor((now - sessionStart)/60000);
                const h = Math.floor(mins/60);
                const m = mins%60;
                elSess.textContent = h>0 ? `${h} ساعة و ${m} دقيقة` : `${m} دقيقة`;
            }
        };
        update();
        setInterval(update, 30000);
    }

    async function init() {
        // الحماية باستخدام Auth الموحد
        const user = await window.Auth?.requireAuth();
        if (!user) return;

        supabase = await getSupabase();
        if (!supabase) return;

        document.getElementById('loadingOverlay')?.classList.add('active');

        await loadCustomerJourney();
        await loadUserInfo();
        await loadStats();
        await loadChartData();
        startTimers();

        document.getElementById('loadingOverlay')?.classList.remove('active');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
