/**
 * dashboard-core.js – وظائف لوحة التحكم (متوافق مع auth.js)
 * يعتمد على: supabase-client.js, auth.js, chart.js
 */
const Dashboard = {
    chartInstance: null,
    _initialized: false,
    _supabase: null,
    _requestData: null,
    _sessionStart: null,

    init: async function() {
        if (this._initialized) return;
        this._initialized = true;

        this._sessionStart = new Date();

        // استخدام Auth الموحد (window.Auth) بدلاً من TeraAuth
        const Auth = window.Auth;
        if (!Auth) {
            // إذا لم توجد مكتبة المصادقة، انتظر قليلاً وحاول مرة أخرى
            console.warn('Auth غير متوفر، انتظار...');
            setTimeout(() => this.init(), 500);
            return;
        }

        // التحقق من الجلسة باستخدام Auth.requireAuth
        const user = await Auth.requireAuth();
        if (!user) {
            // المستخدم غير مصرح، لن يعود إلى هنا لأن requireAuth تعيد التوجيه
            return;
        }

        // جلب Supabase من المتغير العام
        this._supabase = window.teraSupabase || await window.waitForSupabase?.();
        if (!this._supabase) {
            console.error('❌ Supabase غير متوفر');
            return;
        }

        console.log('🚀 جاري تهيئة لوحة التحكم...');

        await this.loadCustomerJourney();
        await this.loadUserInfo();
        await this.loadStats();
        await this.loadChartData();
        await this.loadOpportunities();
        await this.loadTransactions();

        this.toggleActionsBasedOnStatus();
        this.lockSensitiveLinks();

        this.startSessionTimer();
        this.updateCurrentDateTime();

        console.log('✅ لوحة التحكم جاهزة.');
    },

    // ... باقي الدوال (لم تتغير كثيراً، فقط نضمن استخدام this._supabase)

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
                text = `${hours} ساعة`;
                if (minutes > 0) text += ` و ${minutes} دقيقة`;
            } else if (minutes > 0) {
                text = `${minutes} دقيقة`;
            } else {
                text = 'أقل من دقيقة';
            }
            el.textContent = text;
        };

        update();
        setInterval(() => {
            update();
            this.updateCurrentDateTime();
        }, 60000);
    },

    updateCurrentDateTime: function() {
        const dateEl = document.getElementById('currentDate');
        const timeEl = document.getElementById('currentTime');
        if (!dateEl && !timeEl) return;

        const now = new Date();
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        }
    },

    loadUserInfo: async function() {
        try {
            const { data: { user } } = await this._supabase.auth.getUser();
            if (!user) return;

            let name = user.user_metadata?.full_name || 'مستخدم';
            const h2 = document.querySelector('.welcome-banner h2');
            if (h2) h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${name}!`;

            document.getElementById('headerUserName').textContent = name;
            document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
        } catch (e) { console.warn('⚠️ تعذر جلب بيانات المستخدم:', e); }
    },

    loadStats: async function() {
        // ... (نفس الكود السابق بدون تغيير تقريباً)
    },

    loadChartData: async function() {
        // ... (نفس الكود)
    },

    loadOpportunities: async function() {
        // ... (نفس الكود)
    },

    loadTransactions: async function() {
        // ... (نفس الكود)
    },

    loadCustomerJourney: async function() {
        // ... (نفس الكود، لكن يمكنك استبدال إشارات TeraAuth بـ Auth إن وجدت)
    },

    lockSensitiveLinks: function() { /* ... */ },
    toggleActionsBasedOnStatus: function() { /* ... */ },
    _getStatusLabel: function(status) { /* ... */ },
    _formatDateTime: function(iso) { /* ... */ },
    _getElapsedDays: function(iso) { /* ... */ }
};

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    Dashboard.init();
});
