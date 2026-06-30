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
 * - يتضمن تنبيه استكمال الملف الشخصي ومؤشر المراحل ومنع التصفح.
 */

const Dashboard = {
    chartInstance: null,
    _initialized: false,
    _supabase: null,
    _requestData: null,

    init: async function() {
        if (this._initialized) return;
        this._initialized = true;

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
     * ✅ رحلة العميل: تنبيه + مؤشر المراحل + قفل الروابط
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

            // 1. تنبيه الاستكمال
            const banner = document.getElementById('profileAlertBanner');
            if (banner) {
                if (!req || req.status !== 'approved') {
                    banner.style.display = 'flex';
                } else {
                    banner.style.display = 'none';
                }
            }

            // 2. مؤشر المراحل
            const statusPanel = document.getElementById('requestStatusPanel');
            if (statusPanel) {
                const stages = [
                    { key: 'email_verified',        label: 'التحقق من البريد',     icon: 'fa-envelope' },
                    { key: 'personal_info_completed', label: 'المعلومات الشخصية',   icon: 'fa-user' },
                    { key: 'national_address_completed', label: 'العنوان الوطني',   icon: 'fa-map-marker-alt' },
                    { key: 'contact_info_completed', label: 'بيانات التواصل',      icon: 'fa-phone' },
                    { key: 'bank_info_completed',    label: 'الحساب البنكي',       icon: 'fa-university' },
                    { key: 'attachments_completed',  label: 'المرفقات والوثائق',    icon: 'fa-paperclip' },
                    { key: 'agreed',                 label: 'الإقرار',             icon: 'fa-check' },
                    { key: 'submitted',              label: 'المراجعة النهائية',    icon: 'fa-paper-plane' }
                ];

                const allCompleted = stages.every(s => req?.[s.key] === true);

                let html = `<div class="panel-card">
                    <div class="panel-header"><i class="fas fa-clipboard-check"></i><h3>حالة الاستكمال</h3></div>
                    <div style="display:flex; flex-wrap:wrap; gap:12px; padding:8px 0;">`;

                stages.forEach(stage => {
                    const done = req?.[stage.key] === true;
                    html += `<div style="flex: 1 1 140px; background:${done ? '#f0fdf4' : '#f8fafc'}; border:1px solid ${done ? '#bbf7d0' : '#e2e8f0'}; border-radius:10px; padding:12px; text-align:center;">
                        <i class="fas ${stage.icon}" style="color:${done ? '#10b981' : '#94a3b8'}; font-size:24px; margin-bottom:6px; display:block;"></i>
                        <span style="font-weight:700; font-size:14px; color:${done ? '#166534' : '#334155'};">${stage.label}</span>
                        <div style="font-size:12px; margin-top:4px; color:${done ? '#10b981' : '#64748b'};">
                            ${done ? '✔ تم الإكمال' : '⏳ بانتظار الإكمال'}
                        </div>
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

        // روابط الاستثمار والسحب في الشريط الجانبي
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
                el.style.pointerEvents = 'auto'; // يسمح بالضغط لعرض التنبيه
            }
        });

        // الأزرار السريعة في الهيدر
        const quickBtns = document.querySelectorAll('.btn-quick');
        quickBtns.forEach(btn => {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.title = 'يجب استكمال الملف الشخصي واعتماد الحساب أولاً';
        });
    },

    toggleActionsBasedOnStatus: function() {
        // الأزرار السريعة تُفعَّل عند الاعتماد
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

    /**
     * تحميل بيانات المستخدم (الاسم في الهيدر والترحيب)
     */
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

            // ترحيب
            const h2 = document.querySelector('.welcome-banner h2');
            if (h2) h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${name}!`;

            // هيدر
            const headerName = document.getElementById('headerUserName');
            if (headerName) headerName.textContent = name;

            const avatar = document.getElementById('headerAvatar');
            if (avatar) avatar.textContent = name.charAt(0).toUpperCase();

        } catch (e) {
            console.warn('⚠️ تعذر جلب بيانات المستخدم:', e);
        }
    },

    // ---------- الإحصائيات، الرسم البياني، الفرص، المعاملات (بدون تغيير) ----------
    loadStats: async function() {
        // ... (نفس الكود السابق)
    },
    loadChartData: async function() {
        // ... (نفس الكود السابق)
    },
    loadOpportunities: async function() {
        // ... (نفس الكود السابق)
    },
    loadTransactions: async function() {
        // ... (نفس الكود السابق)
    },

    // ---------- أدوات الواجهة (ثابتة) ----------
    initSidebar: function() { /* ... */ },
    initSubmenus: function() { /* ... */ },
    initOpportunitiesToggle: function() { /* ... */ },
    initTransactionFilter: function() { /* ... */ },
    initLogout: function() { /* ... */ },
    initActiveNav: function() { /* ... */ },
    handleWindowResize: function() { /* ... */ }
};

// التشغيل
document.addEventListener('DOMContentLoaded', function() {
    Dashboard.init();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
