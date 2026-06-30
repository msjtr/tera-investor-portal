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
 * - يتضمن تنبيه استكمال الملف الشخصي وحالة الطلب.
 */

const Dashboard = {
    chartInstance: null,
    _initialized: false,
    _supabase: null,
    _requestData: null, // تخزين بيانات طلب التحقق

    /**
     * تهيئة لوحة التحكم بالكامل
     */
    init: async function() {
        if (this._initialized) return;
        this._initialized = true;

        // حماية المسار: إذا لم يكن المستخدم مسجلاً، توجيه فوري إلى صفحة الدخول
        if (window.TeraAuth && !window.TeraAuth.isLoggedIn()) {
            window.TeraAuth.redirectTo('/auth/auth/login/login.html');
            return;
        }

        // انتظار جاهزية Supabase
        try {
            this._supabase = await this._waitForSupabase();
        } catch (err) {
            console.error('❌ Supabase غير متوفر، توجيه للدخول');
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        console.log('🚀 جاري تهيئة لوحة التحكم بالبيانات الحقيقية...');

        // تهيئة المكونات المشتركة
        this.initSidebar();
        this.initSubmenus();
        this.initOpportunitiesToggle();
        this.initTransactionFilter();
        this.initLogout();
        this.initActiveNav();
        this.handleWindowResize();

        // تحميل رحلة العميل (حالة الطلب) أولاً لتحديث واجهة التنبيه
        await this.loadCustomerJourney();

        // تحميل البيانات الحقيقية
        await this.loadUserInfo();
        await this.loadStats();
        await this.loadChartData();
        await this.loadOpportunities();
        await this.loadTransactions();

        // تعطيل بعض الأزرار إذا كان الحساب غير معتمد
        this.toggleActionsBasedOnStatus();

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
     * ✅ جديد: تحميل رحلة العميل (حالة الطلب وتنبيه الاستكمال)
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

            this._requestData = req; // تخزين للاستخدام لاحقاً

            // 1. تحديث شريط التنبيه في الأعلى
            const banner = document.getElementById('profileAlertBanner');
            if (banner) {
                if (!req || req.status !== 'approved') {
                    banner.style.display = 'flex';
                } else {
                    banner.style.display = 'none';
                }
            }

            // 2. تحديث لوحة حالة الطلب (إن وجدت في الصفحة)
            const statusPanel = document.getElementById('requestStatusPanel');
            if (statusPanel) {
                if (req) {
                    const stages = [
                        { key: 'email_verified', label: 'التحقق من البريد', icon: 'fa-envelope' },
                        { key: 'personal_info_completed', label: 'المعلومات الشخصية', icon: 'fa-user' },
                        { key: 'national_address_completed', label: 'العنوان الوطني', icon: 'fa-map-marker-alt' },
                        { key: 'contact_info_completed', label: 'معلومات التواصل', icon: 'fa-phone' },
                        { key: 'bank_info_completed', label: 'المعلومات البنكية', icon: 'fa-university' },
                        { key: 'attachments_completed', label: 'المرفقات', icon: 'fa-paperclip' },
                        { key: 'agreed', label: 'الإقرار', icon: 'fa-check' },
                        { key: 'submitted', label: 'إرسال الطلب', icon: 'fa-paper-plane' }
                    ];

                    let stepsHtml = '';
                    stages.forEach((stage, index) => {
                        const completed = req[stage.key] || (stage.key === 'email_verified');
                        const active = !completed && index === 0; // تحديد الخطوة النشطة
                        stepsHtml += `<div class="progress-step ${completed ? 'completed' : ''} ${active ? 'active' : ''}">
                            <i class="fas ${stage.icon}"></i> ${stage.label}
                        </div>`;
                    });

                    statusPanel.innerHTML = `
                        <div class="panel-card">
                            <div class="panel-header"><i class="fas fa-clipboard-check"></i><h3>حالة الطلب</h3></div>
                            <div style="margin-bottom:16px;">
                                <p><strong>الحالة:</strong> ${this._getStatusLabel(req.status)}</p>
                                <p><strong>تاريخ التقديم:</strong> ${req.submitted_at ? new Date(req.submitted_at).toLocaleDateString('ar-SA') : 'غير مقدم'}</p>
                                <p><strong>آخر تحديث:</strong> ${req.updated_at ? new Date(req.updated_at).toLocaleDateString('ar-SA') : ''}</p>
                                <p><strong>نسبة الإنجاز:</strong> ${req.progress || 0}%</p>
                                <p><strong>ملاحظات:</strong> ${req.notes || 'لا توجد'}</p>
                            </div>
                            <div class="progress-tracker" style="display:flex; flex-wrap:wrap; gap:8px; padding:12px; background:#f8fafc; border-radius:8px;">
                                ${stepsHtml}
                            </div>
                            ${req.status !== 'approved' ? `<a href="/pages/profile/personal-information.html" class="btn-table-link" style="margin-top:12px; display:inline-block;">استكمال الملف</a>` : ''}
                        </div>`;
                } else {
                    statusPanel.innerHTML = `
                        <div class="panel-card">
                            <div class="panel-header"><i class="fas fa-clipboard-check"></i><h3>حالة الطلب</h3></div>
                            <p>لم يتم إنشاء طلب بعد. <a href="/pages/profile/personal-information.html">ابدأ الآن</a>.</p>
                        </div>`;
                }
            }

        } catch (e) {
            console.warn('⚠️ تعذر تحميل حالة الطلب:', e);
        }
    },

    /**
     * تعطيل/تفعيل أزرار الإجراءات بناءً على حالة الاعتماد
     */
    toggleActionsBasedOnStatus: function() {
        const request = this._requestData;
        const isApproved = request && request.status === 'approved';
        const quickActions = document.querySelectorAll('.btn-quick');
        quickActions.forEach(btn => {
            if (!isApproved) {
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
                btn.title = 'يجب استكمال الملف الشخصي واعتماد الحساب أولاً';
            } else {
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

    /**
     * تحميل بيانات المستخدم وعرضها في واجهة الترحيب والهيدر
     */
    loadUserInfo: async function() {
        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (user) {
                // 1. الحصول على الاسم من user_metadata أو استخدام الاسم الافتراضي
                let name = user.user_metadata?.full_name || 'مستخدم';

                // 2. إذا لم يكن الاسم موجوداً، حاول جلبه من جدول auth_register (أو أي جدول مخصص)
                if (!user.user_metadata?.full_name) {
                    const { data: reg } = await this._supabase
                        .from('auth_register')
                        .select('full_name')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    if (reg?.full_name) {
                        name = reg.full_name;
                    }
                }

                // 3. تحديث واجهة الترحيب
                const h2 = document.querySelector('.welcome-banner h2');
                if (h2) h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${name}!`;

                // 4. تحديث اسم المستخدم في الهيدر (تم إضافة id="headerUserName" في HTML)
                const headerName = document.getElementById('headerUserName');
                if (headerName) headerName.textContent = name;

                // 5. تحديث الأفاتار (الحرف الأول من الاسم)
                const headerAvatar = document.getElementById('headerAvatar');
                if (headerAvatar) headerAvatar.textContent = name.charAt(0).toUpperCase();
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب بيانات المستخدم:', e);
        }
    },

    /**
     * تحميل إحصائيات المحفظة (من جدول user_portfolio) – تم إصلاح خطأ 406
     */
    loadStats: async function() {
        const statValues = {
            portfolioValue: 0,
            activeContracts: 0,
            availableBalance: 0
        };

        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (user) {
                const { data, error } = await this._supabase
                    .from('user_portfolio')
                    .select('total_value, active_contracts, available_balance')
                    .eq('user_id', user.id)
                    .maybeSingle();   // ✅ يُعيد null إذا لم يوجد صف، بدون خطأ 406

                if (!error && data) {
                    statValues.portfolioValue = data.total_value || 0;
                    statValues.activeContracts = data.active_contracts || 0;
                    statValues.availableBalance = data.available_balance || 0;
                }
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب إحصائيات المحفظة:', e);
        }

        // تحديث واجهة المستخدم
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent =
            statValues.portfolioValue.toLocaleString() + ' ر.س';
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent =
            statValues.activeContracts + ' عقود نشطة';
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent =
            statValues.availableBalance.toLocaleString() + ' ر.س';
    },

    /**
     * تحميل بيانات الرسم البياني (من جدول portfolio_history)
     */
    loadChartData: async function() {
        let labels = [];
        let values = [];

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
                        legend: {
                            display: true,
                            labels: { font: { family: 'Tajawal', size: 12 }, color: '#334155', padding: 20 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) { return context.parsed.y.toLocaleString() + ' ر.س'; }
                            }
                        }
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
    },

    /**
     * تحميل الفرص الاستثمارية (من جدول investment_opportunities)
     */
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

    /**
     * تحميل آخر العمليات المالية (من جدول transactions)
     */
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

    // ========== دوال الواجهة (ثابتة) ==========
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
        const submenuParents = document.querySelectorAll('.has-submenu > a');
        submenuParents.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const parent = this.parentElement;
                parent.classList.toggle('submenu-open');
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
            // يمكن إعادة تحميل البيانات بناءً على الفلتر، حالياً لا تطبيق
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
