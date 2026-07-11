/**
 * dashboard.js – لوحة التحكم المتكاملة (محسّنة)
 * يعتمد على auth.js و supabase-client.js
 * - حماية أقوى
 * - طلب إذن الموقع الجغرافي (GPS)
 * - تحديث النشاط last_activity_at
 * - معالجة أفضل للأخطاء
 * - جلب بيانات حقيقية للمخطط
 */
(function() {
    let supabase, currentUser;
    let chartInstance = null;
    let requestData = null;
    let sessionStart = new Date();

    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

    // دالة مركزية للحصول على المستخدم الحالي
    async function getCurrentUser() {
        if (!supabase) return null;
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (e) {
            console.error('فشل جلب المستخدم:', e);
            return null;
        }
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

    // طلب إذن الموقع الجغرافي (GPS) وتنبيه في حال الرفض
    async function requestGeoLocation() {
        try {
            if (!window.Auth?.getCurrentPosition) return;
            const pos = await window.Auth.getCurrentPosition();
            sessionStorage.setItem('userLat', pos.latitude);
            sessionStorage.setItem('userLon', pos.longitude);
            console.log('📍 GPS مسموح:', pos);
            return pos;
        } catch (err) {
            console.warn('⚠️ رفض الموقع الجغرافي:', err.message);
            // إظهار تنبيه في لوحة التحكم
            const alertDiv = document.createElement('div');
            alertDiv.className = 'profile-alert';
            alertDiv.style.background = '#fee2e2';
            alertDiv.innerHTML = `<i class="fas fa-map-marker-alt" style="color:#dc2626;"></i>
                <div class="alert-text"><strong>الموقع الجغرافي معطل!</strong><p>يجب تفعيل الموقع لأسباب أمنية. الرجاء تعديل إعدادات متصفحك.</p></div>`;
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.prepend(alertDiv);
            return null;
        }
    }

    // تحديث نشاط الجلسة في قاعدة البيانات لمنع الخمول
    async function updateLastActivity() {
        if (!supabase || !currentUser) return;
        try {
            await supabase.from('user_login_sessions')
                .update({ last_activity_at: new Date().toISOString() })
                .eq('user_id', currentUser.id)
                .eq('status', 'active')
                .eq('is_current_session', true);
        } catch (e) { /* تجاهل الأخطاء الصامتة */ }
    }

    // تحميل رحلة العميل
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

            // قبل تقديم الطلب
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
                return;
            }

            // بعد التقديم
            const statusIcons = {
                'under_review': 'fa-search',
                'approved': 'fa-check-circle',
                'rejected': 'fa-times-circle',
                'needs_revision': 'fa-edit',
                'pending_information': 'fa-info-circle'
            };
            const statusIcon = statusIcons[req.status] || 'fa-clock';
            const statusColor = req.status === 'approved' ? '#10b981' : (req.status === 'rejected' ? '#dc2626' : '#f59e0b');

            let html = `<div class="request-status-card-full">
                <div class="request-header">
                    <div class="request-header-icon"><i class="fas fa-clipboard-check"></i></div>
                    <h3>حالة الطلب</h3>
                </div>
                <div style="text-align:center; padding:20px 0;">
                    <i class="fas ${statusIcon} status-icon-large" style="color:${statusColor};"></i>
                    <div><span class="status-badge-large" style="background:${statusColor}20; color:${statusColor};">${getStatusLabel(req.status)}</span></div>
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

        } catch (e) {
            console.warn('تعذر تحميل حالة الطلب:', e);
        }
    }

    async function loadUserInfo(user) {
        if (!user) return;
        let name = user.user_metadata?.full_name || 'مستخدم';
        const h2 = document.querySelector('.welcome-banner h2');
        if (h2) h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${name}!`;
        document.getElementById('headerUserName').textContent = name;
        document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
    }

    async function loadStats(user) {
        try {
            const { data, error } = await supabase.from('user_portfolio')
                .select('total_value, active_contracts, available_balance')
                .eq('user_id', user.id)
                .maybeSingle();
            if (error) {
                console.error('فشل تحميل الإحصائيات:', error);
                return;
            }
            if (data) {
                document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = (data.total_value || 0).toLocaleString() + ' ر.س';
                document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = (data.active_contracts || 0) + ' عقود نشطة';
                document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = (data.available_balance || 0).toLocaleString() + ' ر.س';
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

            if (error) {
                console.error('فشل جلب بيانات المخطط:', error);
            } else if (data && data.length > 0) {
                labels = data.map(r => r.month);
                values = data.map(r => r.value);
            }
        } catch (e) {
            console.warn('تعذر تحميل المخطط:', e);
        }

        // إذا لم توجد بيانات، أنشئ مخططاً فارغاً
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
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#028090',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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

    function startTimers() {
        const update = () => {
            const now = new Date();
            const elDate = document.getElementById('currentDate');
            const elTime = document.getElementById('currentTime');
            const elSess = document.getElementById('sessionTimer');
            if (elDate) elDate.textContent = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
            if (elTime) elTime.textContent = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            if (elSess) {
                const mins = Math.floor((now - sessionStart) / 60000);
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                elSess.textContent = h > 0 ? `${h} ساعة و ${m} دقيقة` : `${m} دقيقة`;
            }
            // تحديث نشاط الجلسة كل دقيقة
            updateLastActivity();
        };
        update();
        setInterval(update, 60000); // كل دقيقة بدلاً من 30 ثانية لتقليل الاستدعاءات
    }

    async function init() {
        // التحقق من وجود Auth
        if (!window.Auth) {
            console.error('نظام المصادقة غير متوفر');
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        const user = await window.Auth.requireAuth();
        if (!user) return;

        currentUser = user;

        supabase = await getSupabase();
        if (!supabase) {
            console.error('Supabase غير متوفر');
            return;
        }

        document.getElementById('loadingOverlay')?.classList.add('active');

        // طلب إذن الموقع الجغرافي (اختياري ولكن يظهر تنبيه عند الرفض)
        requestGeoLocation();

        await loadCustomerJourney(user);
        await loadUserInfo(user);
        await loadStats(user);
        await loadChartData(user);
        startTimers();

        document.getElementById('loadingOverlay')?.classList.remove('active');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
