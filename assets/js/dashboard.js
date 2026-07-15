/**
 * dashboard.js – لوحة التحكم المتكاملة (مع حماية الجلسة وتحديث النشاط)
 * - يعتمد على السكريبت الموحد في HTML لزر الخروج
 * - Auth.logout تتولى التوجيه التلقائي
 * - لا يعيد التوجيه عند الأخطاء التقنية
 * - يتوقف عن تحديث last_activity_at عند خطأ 401
 * - يبدأ حماية الجلسة (startSessionGuard) إذا وُجد معرف الجلسة
 */
(function() {
    let supabase;
    let chartInstance = null;
    let requestData = null;
    const sessionStart = new Date();
    let updateActivityInterval = null;

    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

    // ---------- دوال مساعدة ----------
    function formatDateTime(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    function getElapsedDays(iso) {
        if (!iso) return '';
        const diff = Math.floor((new Date() - new Date(iso)) / (1000 * 60 * 60 * 24));
        return diff < 1 ? 'أقل من يوم' : `${diff} يوم`;
    }

    function getStatusLabel(status) {
        const labels = {
            draft: 'مسودة',
            pending_information: 'بانتظار استكمال البيانات',
            under_review: 'قيد المراجعة',
            needs_revision: 'يحتاج تعديل',
            has_notes: 'توجد ملاحظات',
            approved: 'معتمد',
            rejected: 'مرفوض',
            suspended: 'موقوف'
        };
        return labels[status] || status;
    }

    // ---------- حالة الطلب والملف الشخصي ----------
    async function loadCustomerJourney(user) {
        try {
            const { data: req, error: reqError } = await supabase
                .from('verification_requests')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (reqError) {
                console.error('فشل تحميل طلب التحقق:', reqError);
                return;
            }

            requestData = req;

            const banner = document.getElementById('profileAlertBanner');
            if (banner) banner.style.display = (!req || !req.submitted) ? 'flex' : 'none';

            const contactAlert = document.getElementById('contactInfoAlert');
            if (contactAlert) contactAlert.style.display = (!req || !req.contact_info_completed) ? 'flex' : 'none';

            const panel = document.getElementById('requestStatusPanel');
            if (!panel) return;

            if (!req || !req.submitted) {
                renderIncompleteProfile(panel, req);
            } else {
                renderRequestStatus(panel, req);
            }
        } catch (e) {
            console.warn('تعذر تحميل حالة الطلب:', e);
        }
    }

    function renderIncompleteProfile(panel, req) {
        const stages = [
            { key: 'personal_info_completed', label: 'المعلومات الشخصية', icon: 'fa-user', link: '/pages/profile/personal-information.html' },
            { key: 'contact_info_completed', label: 'معلومات التواصل', icon: 'fa-phone', link: '/pages/profile/contact-information.html' },
            { key: 'national_address_completed', label: 'العنوان الوطني الموثق', icon: 'fa-map-marker-alt', link: '/pages/profile/national-address.html' },
            { key: 'bank_info_completed', label: 'المعلومات البنكية', icon: 'fa-university', link: '/pages/profile/bank-information.html' },
            { key: 'attachments_completed', label: 'المرفقات والوثائق', icon: 'fa-paperclip', link: '/pages/profile/attachments.html' },
            { key: 'agreed', label: 'الإقرار', icon: 'fa-check', link: null },
            { key: 'submitted', label: 'المراجعة النهائية', icon: 'fa-paper-plane', link: null }
        ];

        let html = `<div class="panel-card">
            <div class="panel-header"><i class="fas fa-clipboard-check"></i><h3>حالة الاستكمال</h3></div>
            <div class="stages-grid">`;

        stages.forEach(stage => {
            const done = req?.[stage.key] === true;
            html += `
            <div class="stage-item ${done ? 'completed' : 'pending'}">
                ${stage.link ? `<a href="${stage.link}">` : ''}
                    <i class="fas ${stage.icon}" style="color:${done ? '#10b981' : '#94a3b8'};"></i>
                    <div class="stage-label" style="color:${done ? '#166534' : '#334155'};">${stage.label}</div>
                    <div class="stage-status" style="color:${done ? '#10b981' : '#64748b'};">
                        ${done ? '✔ مكتمل' : '⏳ مطلوب'}
                    </div>
                ${stage.link ? '</a>' : ''}
            </div>`;
        });

        html += `</div>`;
        if (stages.some(s => !req?.[s.key])) {
            html += `<div style="margin-top:12px; text-align:center;"><a href="/pages/profile/personal-information.html" class="btn-table-link">استكمال الملف الشخصي</a></div>`;
        } else {
            html += `<div class="alert-item-box alert-success" style="margin-top:12px;"><i class="fas fa-check-circle"></i> تم استلام طلبكم بنجاح، وسيتم تحويله للمراجعة.</div>`;
        }
        html += `</div>`;
        panel.innerHTML = html;
    }

    function renderRequestStatus(panel, req) {
        const statusIcons = {
            'under_review': 'fa-search',
            'approved': 'fa-check-circle',
            'rejected': 'fa-times-circle',
            'needs_revision': 'fa-edit',
            'pending_information': 'fa-info-circle'
        };
        const statusIcon = statusIcons[req.status] || 'fa-clock';
        const statusColor = req.status === 'approved' ? '#10b981' : (req.status === 'rejected' ? '#dc2626' : '#f59e0b');
        const statusLabel = getStatusLabel(req.status);

        let html = `<div class="request-status-card-full">
            <div class="request-header">
                <div class="request-header-icon"><i class="fas fa-clipboard-check"></i></div>
                <h3>حالة الطلب</h3>
            </div>
            <div style="text-align:center; padding:20px 0;">
                <i class="fas ${statusIcon} status-icon-large" style="color:${statusColor};"></i>
                <div><span class="status-badge-large" style="background:${statusColor}20; color:${statusColor};">${statusLabel}</span></div>
            </div>
            <div class="request-details-list">
                <div class="request-detail-item"><i class="fas fa-calendar-plus"></i><strong>تاريخ التقديم:</strong><span>${formatDateTime(req.submitted_at)}</span></div>
                <div class="request-detail-item"><i class="fas fa-history"></i><strong>آخر تحديث:</strong><span>${formatDateTime(req.updated_at)}</span></div>
                <div class="request-detail-item"><i class="fas fa-hourglass-half"></i><strong>المدة المنقضية:</strong><span>${getElapsedDays(req.submitted_at)}</span></div>
                <div class="request-detail-item"><i class="fas fa-chart-line"></i><strong>نسبة الإنجاز:</strong><span>${req.progress || 0}%</span></div>
                <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${req.progress || 0}%;"></div></div>
                ${req.notes ? `<div class="request-detail-item" style="margin-top:10px;"><i class="fas fa-sticky-note"></i><strong>ملاحظات:</strong><span>${req.notes}</span></div>` : ''}
            </div>`;

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
                html += `<div class="alert-warning-box">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div><strong>تنبيه:</strong> بعض المراحل تحتاج إلى استكمال أو تعديل:<ul>`;
                pendingStages.forEach(s => html += `<li><a href="${s.link}">${s.label}</a></li>`);
                html += `</ul></div></div>`;
            }
            html += `<div style="margin-top:16px; text-align:center;"><a href="/pages/profile/personal-information.html" class="btn-table-link">تعديل البيانات</a></div>`;
        }

        html += `</div>`;
        panel.innerHTML = html;
    }

    // ---------- الإحصائيات والمخطط ----------
    async function loadStats(user) {
        try {
            const { data, error } = await supabase
                .from('user_portfolio')
                .select('total_value, active_contracts, available_balance')
                .eq('user_id', user.id)
                .maybeSingle();
            if (error) { console.error('فشل تحميل الإحصائيات:', error); return; }
            if (data) {
                const statCards = document.querySelectorAll('.stat-card .stat-value');
                if (statCards.length >= 3) {
                    statCards[0].textContent = (data.total_value || 0).toLocaleString() + ' ر.س';
                    statCards[1].textContent = (data.active_contracts || 0) + ' عقود نشطة';
                    statCards[2].textContent = (data.available_balance || 0).toLocaleString() + ' ر.س';
                }
            }
        } catch (e) {
            console.warn('تعذر تحميل الإحصائيات:', e);
        }
    }

    async function loadChartData(user) {
        const ctx = document.getElementById('mainChart');
        if (!ctx || typeof Chart === 'undefined') return;

        let labels = [], values = [];
        try {
            const { data, error } = await supabase
                .from('portfolio_history')
                .select('month, value')
                .eq('user_id', user.id)
                .order('month', { ascending: true });

            if (error) throw error;
            if (data && data.length > 0) {
                labels = data.map(r => r.month);
                values = data.map(r => r.value);
            }
        } catch (e) {
            console.warn('تعذر تحميل المخطط:', e);
        }

        if (labels.length === 0) {
            labels = ['لا توجد بيانات'];
            values = [0];
        }

        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'قيمة المحفظة (ر.س)',
                    data: values,
                    borderColor: '#028090',
                    backgroundColor: 'rgba(2, 128, 144, 0.1)',
                    tension: 0.3, fill: true,
                    pointBackgroundColor: '#028090',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: { family: 'Tajawal', size: 12 }, color: '#334155', padding: 20 } },
                    tooltip: { callbacks: { label: ctx => ctx.parsed.y.toLocaleString() + ' ر.س' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { font: { family: 'Tajawal', size: 11 }, color: '#64748b', callback: v => v.toLocaleString() + ' ر.س' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Tajawal', size: 11 }, color: '#64748b' }
                    }
                }
            }
        });
    }

    // ---------- التهيئة ----------
    async function init() {
        if (!window.Auth) {
            console.error('نظام المصادقة غير متوفر');
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        const user = await window.Auth.requireAuth();
        if (!user) return;

        supabase = await getSupabase();
        if (!supabase) {
            console.error('Supabase غير متوفر');
            return;
        }

        // بدء حماية الجلسة (إذا وُجد معرف الجلسة مخزّن)
        const sessionId = sessionStorage.getItem('currentSessionId');
        if (window.SessionManager && sessionId) {
            window.SessionManager.startSessionGuard(user.id, sessionId);
        }

        document.getElementById('loadingOverlay')?.classList.add('active');

        // تحديث واجهة المستخدم
        if (window.UIHelpers?.updateHeader) {
            window.UIHelpers.updateHeader(user);
        } else {
            const name = user.user_metadata?.full_name || user.email || 'مستخدم';
            const nameEl = document.getElementById('headerUserName');
            const avatarEl = document.getElementById('headerAvatar');
            if (nameEl) nameEl.textContent = name;
            if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
        }

        const h2 = document.querySelector('.welcome-banner h2');
        if (h2) {
            const name = user.user_metadata?.full_name || 'مستخدم';
            h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${name}!`;
        }

        // طلب الموقع (مرة واحدة)
        if (window.Auth?.getCurrentPosition) {
            window.Auth.getCurrentPosition().then(pos => {
                sessionStorage.setItem('userLat', pos.latitude);
                sessionStorage.setItem('userLon', pos.longitude);
            }).catch(() => {});
        }

        // تتبع النشاط مع معالجة أخطاء 401
        if (window.ActivityTracker) {
            window.ActivityTracker.startIdleTimer(async () => {
                // Auth.logout ستتولى التوجيه بعد الخروج
                if (window.Auth?.logout) await window.Auth.logout();
            }, user.id);

            try { await window.ActivityTracker.updateLastActivity(user.id); } catch (e) {}

            updateActivityInterval = setInterval(async () => {
                try {
                    const result = await window.ActivityTracker.updateLastActivity(user.id);
                    if (result === false) {
                        clearInterval(updateActivityInterval);
                    }
                } catch (e) {
                    if (e.code === 401 || e.message?.includes('401')) {
                        clearInterval(updateActivityInterval);
                    }
                }
            }, 60000);
        }

        // تحميل البيانات
        await loadCustomerJourney(user);
        await loadStats(user);
        await loadChartData(user);

        // المؤقتات التاريخية
        const updateDateTime = () => {
            const now = new Date();
            const dateEl = document.getElementById('currentDate');
            const timeEl = document.getElementById('currentTime');
            const sessionEl = document.getElementById('sessionTimer');
            if (dateEl) dateEl.textContent = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
            if (timeEl) timeEl.textContent = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            if (sessionEl) {
                const mins = Math.floor((now - sessionStart) / 60000);
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                sessionEl.textContent = h > 0 ? `${h} ساعة و ${m} دقيقة` : `${m} دقيقة`;
            }
        };
        updateDateTime();
        setInterval(updateDateTime, 30000);

        document.getElementById('loadingOverlay')?.classList.remove('active');
    }

    window.addEventListener('beforeunload', () => {
        if (updateActivityInterval) clearInterval(updateActivityInterval);
    });

    document.addEventListener('DOMContentLoaded', init);
})();
