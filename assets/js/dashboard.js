/**
 * ============================================================
 * TERA INVESTOR PORTAL - DASHBOARD LOGIC (PRODUCTION + CUSTOMER JOURNEY)
 * ============================================================
 * الموقع: /assets/js/dashboard.js
 * - جميع البيانات تُجلب من Supabase بشكل حي.
 * - لا توجد بيانات وهمية أو ثابتة.
 * - يعتمد على جداول: user_portfolio, portfolio_history,
 *   investment_opportunities, transactions.
 * - يحمي المسار عبر TeraAuth.
 * - يستخدم maybeSingle() بدلاً من single() لتجنب أخطاء 406.
 * - يتضمن تنبيه استكمال الملف الشخصي ومؤشر المراحل مع روابط.
 * - بعد تقديم الطلب: يظهر قسم حالة الطلب بأيقونات وألوان حسب الحالة.
 * - بعد الاعتماد: يختفي كل شيء.
 * - مؤقت الجلسة يبدأ من تحميل الصفحة.
 * - يُظهر الوقت الحالي مع التاريخ في شريط الترحيب.
 */

const Dashboard = {
    chartInstance: null,
    _initialized: false,
    _supabase: null,
    _requestData: null,
    _sessionStart: null,   // وقت بداية الجلسة

    init: async function() {
        if (this._initialized) return;
        this._initialized = true;

        // تسجيل وقت بدء الجلسة
        this._sessionStart = new Date();

        if (window.TeraAuth && !window.TeraAuth.isLoggedIn()) {
            window.TeraAuth.redirectTo('/auth/auth/login/login.html');
            return;
        }

        try {
            this._supabase = await this._waitForSupabase();
        } catch (err) {
            console.error('❌ Supabase غير متوفر');
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        console.log('🚀 جاري تهيئة لوحة التحكم...');

        this.initSidebar();
        this.initSubmenus();
        this.initOpportunitiesToggle();
        this.initTransactionFilter();
        this.initLogout();
        this.initActiveNav();
        this.handleWindowResize();

        await this.loadCustomerJourney();
        await this.loadUserInfo();
        await this.loadStats();
        await this.loadChartData();
        await this.loadOpportunities();
        await this.loadTransactions();

        this.toggleActionsBasedOnStatus();
        this.lockSensitiveLinks();

        // بدء مؤقت الجلسة
        this.startSessionTimer();

        // تحديث التاريخ والوقت الحالي في شريط الترحيب
        this.updateCurrentDateTime();

        console.log('✅ لوحة التحكم جاهزة.');
    },

    _waitForSupabase: function() {
        return new Promise((resolve, reject) => {
            if (window.teraSupabase) return resolve(window.teraSupabase);
            const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
            document.addEventListener('supabase:ready', e => {
                clearTimeout(timeout);
                resolve(e.detail.client);
            }, { once: true });
            document.addEventListener('supabase:error', () => {
                clearTimeout(timeout);
                reject(new Error('error'));
            }, { once: true });
        });
    },

    /**
     * مؤقت الجلسة: يُحدَّث كل دقيقة
     */
    startSessionTimer: function() {
        const el = document.getElementById('sessionTimer');
        if (!el) return;

        const update = () => {
            const now = new Date();
            const diffMs = now - this._sessionStart;
            const totalMinutes = Math.floor(diffMs / 60000);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            let text = '';
            if (hours > 0) {
                text = `منذ ${hours} ساعة`;
                if (minutes > 0) text += ` و ${minutes} دقيقة`;
            } else {
                text = `منذ ${minutes} دقيقة`;
            }
            if (totalMinutes < 1) text = 'منذ أقل من دقيقة';
            el.textContent = text;
        };

        update();
        setInterval(update, 60000); // كل دقيقة
    },

    /**
     * تحديث التاريخ والوقت الحالي في شريط الترحيب
     */
    updateCurrentDateTime: function() {
        const el = document.getElementById('currentDate');
        if (!el) return;
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        el.textContent = now.toLocaleString('ar-SA', options);
    },

    _formatDateTime: function(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return d.toLocaleDateString('ar-SA', options);
    },

    _getElapsedDays: function(isoString) {
        if (!isoString) return '';
        const now = new Date();
        const past = new Date(isoString);
        const diff = Math.floor((now - past) / (1000 * 60 * 60 * 24));
        if (diff < 1) return 'أقل من يوم';
        return `${diff} يوم`;
    },

    /**
     * ✅ رحلة العميل: تنبيه + مؤشر المراحل (قبل التقديم) / حالة الطلب (بعد التقديم) + قفل الروابط
     */
    loadCustomerJourney: async function() {
        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (!user) return;

            const { data: req } = await this._supabase
                .from('verification_requests')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            this._requestData = req;

            // 1. تنبيه الاستكمال (يظهر فقط إذا لم يتم تقديم الطلب بعد)
            const banner = document.getElementById('profileAlertBanner');
            if (banner) {
                if (!req || !req.submitted) {
                    banner.style.display = 'flex';
                } else {
                    banner.style.display = 'none';
                }
            }

            // 2. محتوى لوحة حالة الطلب / مؤشر المراحل
            const statusPanel = document.getElementById('requestStatusPanel');
            if (statusPanel) {
                // إذا كان الطلب قد قُدِّم (تحت المراجعة أو أي حالة أخرى غير approved)
                if (req && req.submitted) {
                    // إذا كان معتمداً بالكامل، نُخفي اللوحة
                    if (req.status === 'approved') {
                        statusPanel.innerHTML = '';
                    } else {
                        // أيقونات وألوان حسب الحالة
                        const statusIcons = {
                            'under_review': 'fa-search',
                            'approved': 'fa-check-circle',
                            'rejected': 'fa-times-circle',
                            'needs_revision': 'fa-edit',
                            'draft': 'fa-file-alt',
                            'pending_information': 'fa-info-circle'
                        };
                        const statusClass = req.status ? `status-${req.status}` : 'status-draft';
                        const statusIcon = statusIcons[req.status] || 'fa-clock';

                        // بناء HTML باستخدام التنسيقات الجديدة
                        let html = `<div class="request-status-card ${statusClass}">
                            <div class="request-header">
                                <div class="request-header-icon"><i class="fas fa-clipboard-check"></i></div>
                                <h3>حالة الطلب</h3>
                            </div>
                            <div style="text-align:center;">
                                <i class="fas ${statusIcon} status-icon-large"></i>
                                <div class="status-badge-large">
                                    ${this._getStatusLabel(req.status)}
                                </div>
                            </div>
                            <div class="request-details-grid">
                                <div class="request-detail-item">
                                    <i class="fas fa-calendar-plus"></i>
                                    <strong>تاريخ التقديم:</strong>
                                    <span>${this._formatDateTime(req.submitted_at)}</span>
                                </div>
                                <div class="request-detail-item">
                                    <i class="fas fa-history"></i>
                                    <strong>آخر تحديث:</strong>
                                    <span>${this._formatDateTime(req.updated_at)}</span>
                                </div>
                                <div class="request-detail-item">
                                    <i class="fas fa-hourglass-half"></i>
                                    <strong>المدة المنقضية:</strong>
                                    <span>${this._getElapsedDays(req.submitted_at)}</span>
                                </div>
                                <div class="request-detail-item full-width">
                                    <i class="fas fa-chart-line"></i>
                                    <strong>نسبة الإنجاز:</strong>
                                    <span>${req.progress || 0}%</span>
                                    <div class="progress-section" style="margin-top:8px; width:100%;">
                                        <div class="progress-bar-outer">
                                            <div class="progress-bar-inner" style="width:${req.progress || 0}%;"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="request-detail-item full-width">
                                    <i class="fas fa-sticky-note"></i>
                                    <strong>ملاحظات:</strong>
                                    <span>${req.notes || 'لا توجد'}</span>
                                </div>
                            </div>`;

                        // التحقق من وجود مراحل تحتاج تعديل
                        const stagesToCheck = [
                            { key: 'personal_info_completed', label: 'المعلومات الشخصية', link: '/pages/profile/personal-information.html' },
                            { key: 'contact_info_completed', label: 'معلومات التواصل', link: '/pages/profile/contact-information.html' },
                            { key: 'national_address_completed', label: 'العنوان الوطني الموثق', link: '/pages/profile/national-address.html' },
                            { key: 'bank_info_completed', label: 'المعلومات البنكية', link: '/pages/profile/bank-information.html' },
                            { key: 'attachments_completed', label: 'المرفقات والوثائق', link: '/pages/profile/attachments.html' }
                        ];

                        const pendingStages = stagesToCheck.filter(s => !req[s.key]);

                        if (pendingStages.length > 0) {
                            html += `<div class="alert-warning-box" style="margin-top:16px;">
                                <i class="fas fa-exclamation-triangle"></i>
                                <div>
                                    <strong>تنبيه:</strong> بعض المراحل تحتاج إلى استكمال أو تعديل:
                                    <ul style="margin:8px 0 0 16px;">`;
                            pendingStages.forEach(s => {
                                html += `<li><a href="${s.link}">${s.label}</a></li>`;
                            });
                            html += `</ul></div></div>`;
                        }

                        html += `</div>`;
                        statusPanel.innerHTML = html;
                    }
                } else {
                    // لم يتم تقديم الطلب بعد: عرض مؤشر المراحل مع الروابط
                    const stages = [
                        { key: 'personal_info_completed', label: 'المعلومات الشخصية',   icon: 'fa-user',            link: '/pages/profile/personal-information.html' },
                        { key: 'contact_info_completed', label: 'معلومات التواصل',      icon: 'fa-phone',           link: '/pages/profile/contact-information.html' },
                        { key: 'national_address_completed', label: 'العنوان الوطني الموثق', icon: 'fa-map-marker-alt', link: '/pages/profile/national-address.html' },
                        { key: 'bank_info_completed',    label: 'المعلومات البنكية',    icon: 'fa-university',      link: '/pages/profile/bank-information.html' },
                        { key: 'attachments_completed',  label: 'المرفقات والوثائق',    icon: 'fa-paperclip',       link: '/pages/profile/attachments.html' },
                        { key: 'agreed',                 label: 'الإقرار',             icon: 'fa-check',           link: null },
                        { key: 'submitted',              label: 'المراجعة النهائية',    icon: 'fa-paper-plane',     link: null }
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
                        html += `<div style="margin-top:12px; text-align:center;">
                            <a href="/pages/profile/personal-information.html" class="btn-table-link">استكمال الملف الشخصي</a>
                        </div>`;
                    } else if (req?.status !== 'approved') {
                        html += `<div class="alert-item-box alert-success" style="margin-top:12px;">
                            <i class="fas fa-check-circle"></i> تم استلام طلبكم بنجاح، وتم تحويله إلى فريق المراجعة.
                        </div>`;
                    }

                    html += `</div>`;
                    statusPanel.innerHTML = html;
                }
            }

        } catch (e) {
            console.warn('⚠️ تعذر تحميل حالة الطلب:', e);
        }
    },

    /**
     * منع الروابط الحساسة حتى يكتمل الملف
     */
    lockSensitiveLinks: function() {
        const isApproved = this._requestData && this._requestData.status === 'approved';
        if (isApproved) return;

        const sensitivePaths = [
            '/pages/investments/', '/pages/portfolio/withdraw',
            '/pages/portfolio/withdrawal-history', '/pages/portfolio/profits'
        ];

        document.querySelectorAll('.nav-item a, .btn-quick').forEach(el => {
            const href = el.getAttribute('href') || '';
            if (sensitivePaths.some(p => href.includes(p))) {
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    alert('يجب استكمال الملف الشخصي أولاً.');
                });
                el.style.opacity = '0.6';
                el.style.pointerEvents = 'auto';
            }
        });

        const quickBtns = document.querySelectorAll('.btn-quick');
        quickBtns.forEach(btn => {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.title = 'يجب استكمال الملف الشخصي واعتماد الحساب أولاً';
        });
    },

    toggleActionsBasedOnStatus: function() {
        const quickBtns = document.querySelectorAll('.btn-quick');
        const approved = this._requestData && this._requestData.status === 'approved';
        quickBtns.forEach(btn => {
            if (approved) {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
                btn.title = '';
            }
        });
    },

    _getStatusLabel: function(status) {
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
    },

    loadUserInfo: async function() {
        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (!user) return;

            let name = user.user_metadata?.full_name || 'مستخدم';

            if (!user.user_metadata?.full_name) {
                const { data: reg } = await this._supabase
                    .from('auth_register')
                    .select('full_name')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (reg?.full_name) name = reg.full_name;
            }

            const h2 = document.querySelector('.welcome-banner h2');
            if (h2) h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${name}!`;

            const headerName = document.getElementById('headerUserName');
            if (headerName) headerName.textContent = name;

            const avatar = document.getElementById('headerAvatar');
            if (avatar) avatar.textContent = name.charAt(0).toUpperCase();

        } catch (e) {
            console.warn('⚠️ تعذر جلب بيانات المستخدم:', e);
        }
    },

    loadStats: async function() {
        const statValues = { portfolioValue: 0, activeContracts: 0, availableBalance: 0 };
        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (user) {
                const { data, error } = await this._supabase
                    .from('user_portfolio')
                    .select('total_value, active_contracts, available_balance')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!error && data) {
                    statValues.portfolioValue = data.total_value || 0;
                    statValues.activeContracts = data.active_contracts || 0;
                    statValues.availableBalance = data.available_balance || 0;
                }
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب إحصائيات المحفظة:', e);
        }

        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = statValues.portfolioValue.toLocaleString() + ' ر.س';
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = statValues.activeContracts + ' عقود نشطة';
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = statValues.availableBalance.toLocaleString() + ' ر.س';
    },

    loadChartData: async function() {
        let labels = [], values = [];
        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (user) {
                const { data, error } = await this._supabase
                    .from('portfolio_history')
                    .select('month, value')
                    .eq('user_id', user.id)
                    .order('month', { ascending: true });

                if (!error && data && data.length > 0) {
                    labels = data.map(r => r.month);
                    values = data.map(r => r.value);
                }
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب بيانات الرسم البياني:', e);
        }

        if (labels.length === 0) {
            labels = ['لا توجد بيانات'];
            values = [0];
        }

        const ctx = document.getElementById('mainChart');
        if (ctx && typeof Chart !== 'undefined') {
            if (this.chartInstance) {
                this.chartInstance.destroy();
                this.chartInstance = null;
            }
            this.chartInstance = new Chart(ctx, {
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
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Tajawal', size: 11 }, color: '#64748b', callback: v => v.toLocaleString() + ' ر.س' } },
                        x: { grid: { display: false }, ticks: { font: { family: 'Tajawal', size: 11 }, color: '#64748b' } }
                    }
                }
            });
        }
    },

    loadOpportunities: async function() {
        const tbody = document.querySelector('#opportunitiesPanelWrapper tbody');
        if (!tbody) return;
        try {
            const { data, error } = await this._supabase
                .from('investment_opportunities')
                .select('title, share_price, annual_return, status')
                .eq('status', 'active')
                .limit(3);

            if (!error && data && data.length > 0) {
                let html = '';
                data.forEach(opp => {
                    html += `<tr>
                        <td class="text-title text-start">${opp.title}</td>
                        <td>${opp.share_price.toLocaleString()} ر.س</td>
                        <td>${opp.annual_return}%</td>
                        <td><span style="color:#0d9488;font-weight:bold;">${opp.status}</span></td>
                        <td><a href="/pages/investments/investment-details.html" class="btn-table-link">استعراض</a></td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = '<tr><td colspan="5">لا توجد فرص حالياً</td></tr>';
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب الفرص:', e);
        }
    },

    loadTransactions: async function() {
        const tbody = document.getElementById('transactionsTableBody');
        if (!tbody) return;
        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await this._supabase
                .from('transactions')
                .select('description, created_at, amount')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!error && data && data.length > 0) {
                let html = '';
                data.forEach(tr => {
                    const date = new Date(tr.created_at).toLocaleDateString('ar-SA');
                    const amount = tr.amount;
                    const color = amount >= 0 ? '#10b981' : '#ef4444';
                    const sign = amount >= 0 ? '+' : '';
                    html += `<tr>
                        <td class="text-title text-start">${tr.description}</td>
                        <td>${date}</td>
                        <td class="amount-cell" style="color:${color};font-weight:bold;">${sign}${amount.toLocaleString()} ر.س</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = '<tr><td colspan="3">لا توجد عمليات مالية بعد</td></tr>';
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب العمليات المالية:', e);
        }
    },

    // ========== أدوات الواجهة (ثابتة) ==========
    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const overlay = document.getElementById('sidebarOverlay');
        const closeBtn = document.getElementById('closeSidebarBtn');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                if (window.innerWidth <= 991) {
                    sidebar.classList.toggle('sidebar-open');
                    overlay.classList.toggle('active');
                } else {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }
        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
            });
        }
    },

    initSubmenus: function() {
        document.querySelectorAll('.has-submenu > a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                this.parentElement.classList.toggle('submenu-open');
            });
        });
    },

    initOpportunitiesToggle: function() {
        const toggleBtn = document.getElementById('toggleOppBtn');
        const icon = document.getElementById('toggleOppIcon');
        const text = document.getElementById('toggleOppText');
        const wrapper = document.getElementById('opportunitiesPanelWrapper');
        if (!toggleBtn || !wrapper) return;

        toggleBtn.addEventListener('click', function() {
            if (wrapper.style.maxHeight === '0px') {
                wrapper.style.maxHeight = '600px';
                if (icon) icon.className = 'fas fa-eye-slash';
                if (text) text.textContent = 'إخفاء';
            } else {
                wrapper.style.maxHeight = '0px';
                if (icon) icon.className = 'fas fa-eye';
                if (text) text.textContent = 'إظهار';
            }
        });
    },

    initTransactionFilter: function() {
        const filter = document.getElementById('transactionFilter');
        if (!filter) return;
        filter.addEventListener('change', function() {
            console.log('تطبيق فلتر:', this.value);
        });
    },

    initLogout: function() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) return;
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (!confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) return;

            if (window.TeraAuth && typeof window.TeraAuth.logout === 'function') {
                await window.TeraAuth.logout();
            } else {
                localStorage.removeItem('tera_token');
                localStorage.removeItem('tera_user');
                sessionStorage.clear();
                window.location.replace('/auth/auth/login/login.html');
            }
        });
    },

    initActiveNav: function() {
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-item a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.parentElement.classList.add('active');
            }
        });
    },

    handleWindowResize: function() {
        window.addEventListener('resize', () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (window.innerWidth > 991) {
                if (sidebar) sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });
    }
};

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    Dashboard.init();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
