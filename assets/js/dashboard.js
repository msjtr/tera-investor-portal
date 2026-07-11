/**
 * dashboard.js – لوحة التحكم (متوافق مع auth.js و supabase-client.js)
 * يستبدل dashboard-core.js ويوفر عرض حالة الطلب والملف الشخصي
 */
(function() {
    let supabase;
    let chartInstance = null;
    let requestData = null;
    let sessionStart = new Date();

    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

    function formatDate(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function getElapsedDays(iso) {
        if (!iso) return '';
        const diff = Math.floor((new Date() - new Date(iso)) / (1000 * 60 * 60 * 24));
        return diff < 1 ? 'أقل من يوم' : `${diff} يوم`;
    }

    function getStatusLabel(status) {
        const map = {
            draft: 'مسودة',
            pending_information: 'بانتظار استكمال البيانات',
            under_review: 'قيد المراجعة',
            needs_revision: 'يحتاج تعديل',
            has_notes: 'توجد ملاحظات',
            approved: 'معتمد',
            rejected: 'مرفوض',
            suspended: 'موقوف'
        };
        return map[status] || status;
    }

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

            // التنبيه العلوي (استكمال الملف الشخصي)
            const banner = document.getElementById('profileAlertBanner');
            if (banner) {
                banner.style.display = (!req || !req.submitted) ? 'flex' : 'none';
            }

            // تنبيه الجوال
            const contactAlert = document.getElementById('contactInfoAlert');
            if (contactAlert) {
                contactAlert.style.display = (!req || !req.contact_info_completed) ? 'flex' : 'none';
            }

            // قسم حالة الطلب
            const panel = document.getElementById('requestStatusPanel');
            if (!panel) return;

            if (!req || !req.submitted) {
                // عرض مراحل الاستكمال
                const stages = [
                    { key: 'personal_info_completed', label: 'المعلومات الشخصية', icon: 'fa-user', link: '/pages/profile/personal-information.html' },
                    { key: 'contact_info_completed', label: 'معلومات التواصل', icon: 'fa-phone', link: '/pages/profile/contact-information.html' },
                    { key: 'national_address_completed', label: 'العنوان الوطني', icon: 'fa-map-marker-alt', link: '/pages/profile/national-address.html' },
                    { key: 'bank_info_completed', label: 'المعلومات البنكية', icon: 'fa-university', link: '/pages/profile/bank-information.html' },
                    { key: 'attachments_completed', label: 'المرفقات والوثائق', icon: 'fa-paperclip', link: '/pages/profile/attachments.html' }
                ];

                let html = `<div class="panel-card">
                    <div class="panel-header"><i class="fas fa-clipboard-check"></i><h3>استكمال الملف الشخصي</h3></div>
                    <div style="display:flex; flex-wrap:wrap; gap:12px; padding:8px 0;">`;

                stages.forEach(s => {
                    const done = req?.[s.key] === true;
                    html += `
                    <div style="flex:1 1 140px; background:${done?'#f0fdf4':'#f8fafc'}; border:1px solid ${done?'#bbf7d0':'#e2e8f0'}; border-radius:10px; padding:12px; text-align:center;">
                        <a href="${s.link}" style="text-decoration:none; color:inherit; display:block;">
                            <i class="fas ${s.icon}" style="color:${done?'#10b981':'#94a3b8'}; font-size:24px; margin-bottom:6px; display:block;"></i>
                            <span style="font-weight:700; font-size:14px; color:${done?'#166534':'#334155'};">${s.label}</span>
                            <div style="font-size:12px; margin-top:4px; color:${done?'#10b981':'#64748b'};">${done?'✔ مكتمل':'⏳ مطلوب'}</div>
                        </a>
                    </div>`;
                });

                html += `</div>
                    <div style="margin-top:12px; text-align:center;">
                        <a href="/pages/profile/personal-information.html" class="btn-table-link">استكمال الملف الشخصي</a>
                    </div>
                </div>`;
                panel.innerHTML = html;

            } else {
                // الطلب مقدم - عرض حالة المراجعة
                const iconMap = {
                    under_review: 'fa-search',
                    approved: 'fa-check-circle',
                    rejected: 'fa-times-circle',
                    needs_revision: 'fa-edit',
                    pending_information: 'fa-info-circle'
                };
                const statusIcon = iconMap[req.status] || 'fa-clock';

                let html = `<div class="panel-card">
                    <div class="panel-header"><i class="fas fa-clipboard-check"></i><h3>حالة الطلب</h3></div>
                    <div style="text-align:center; padding:20px 0;">
                        <i class="fas ${statusIcon}" style="font-size:48px; color:${req.status==='approved'?'#10b981':'#f59e0b'};"></i>
                        <div style="font-size:20px; font-weight:800; margin-top:12px; color:#0A1B3F;">${getStatusLabel(req.status)}</div>
                    </div>
                    <div style="background:#f8fafc; border-radius:12px; padding:16px; margin-top:16px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:#64748b;">تاريخ التقديم:</span><strong>${formatDate(req.submitted_at)}</strong></div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:#64748b;">آخر تحديث:</span><strong>${formatDate(req.updated_at)}</strong></div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:#64748b;">المدة:</span><strong>${getElapsedDays(req.submitted_at)}</strong></div>
                        ${req.notes ? `<div style="margin-top:12px; background:#fff7ed; padding:10px; border-radius:8px; color:#9a3412;"><i class="fas fa-sticky-note"></i> ${req.notes}</div>` : ''}
                    </div>`;

                if (req.status === 'needs_revision' || req.status === 'pending_information') {
                    html += `<div style="margin-top:16px; text-align:center;">
                        <a href="/pages/profile/personal-information.html" class="btn-table-link">تعديل البيانات</a>
                    </div>`;
                }

                html += `</div>`;
                panel.innerHTML = html;
            }
        } catch (e) {
            console.warn('تعذر تحميل حالة الطلب:', e);
        }
    }

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

    // المؤقت والتاريخ
    function startTimers() {
        setInterval(() => {
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
        }, 30000);
    }

    async function init() {
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
