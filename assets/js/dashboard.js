/**
 * dashboard.js – لوحة التحكم (مع حماية الجلسة وتحديث النشاط)
 */
(function() {
    let supabase, chartInstance = null, requestData = null;
    const sessionStart = new Date();
    let updateActivityInterval = null;

    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

    function formatDateTime(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
    }
    function getElapsedDays(iso) {
        if (!iso) return '';
        const diff = Math.floor((new Date() - new Date(iso)) / 86400000);
        return diff < 1 ? 'أقل من يوم' : `${diff} يوم`;
    }
    function getStatusLabel(s) {
        const l = { draft:'مسودة', pending_information:'بانتظار استكمال البيانات', under_review:'قيد المراجعة', needs_revision:'يحتاج تعديل', has_notes:'توجد ملاحظات', approved:'معتمد', rejected:'مرفوض', suspended:'موقوف' };
        return l[s] || s;
    }

    // ---------- حالة الطلب (كما هي) ----------
    async function loadCustomerJourney(user) { /* ... الكود نفسه بدون تغيير ... */ }

    // ---------- الإحصائيات (كما هي) ----------
    async function loadStats(user) { /* ... */ }

    async function loadChartData(user) { /* ... */ }

    // ---------- التهيئة ----------
    async function init() {
        if (!window.Auth) {
            window.location.replace('/auth/auth/login/login.html');
            return;
        }
        const user = await window.Auth.requireAuth();
        if (!user) return;

        supabase = await getSupabase();
        if (!supabase) return;

        // بدء حماية الجلسة (إذا لم تبدأ بالفعل)
        const sessionId = sessionStorage.getItem('currentSessionId');
        if (window.SessionManager && sessionId) {
            window.SessionManager.startSessionGuard(user.id, sessionId);
        }

        // تحديث واجهة المستخدم
        if (window.UIHelpers?.updateHeader) {
            window.UIHelpers.updateHeader(user);
        } else {
            const name = user.user_metadata?.full_name || user.email || 'مستخدم';
            document.getElementById('headerUserName')?.textContent = name;
            const avatar = document.getElementById('headerAvatar');
            if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
        }

        const h2 = document.querySelector('.welcome-banner h2');
        if (h2) {
            const name = user.user_metadata?.full_name || 'مستخدم';
            h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${name}!`;
        }

        // الموقع (مرة واحدة)
        if (window.Auth?.getCurrentPosition) {
            window.Auth.getCurrentPosition().then(pos => {
                sessionStorage.setItem('userLat', pos.latitude);
                sessionStorage.setItem('userLon', pos.longitude);
            }).catch(() => {});
        }

        // مؤقت الخمول (من ActivityTracker) – سيتولى استدعاء handleIdleTimeout
        if (window.ActivityTracker) {
            window.ActivityTracker.startIdleTimer(async () => {
                if (window.Auth?.logout) await window.Auth.logout();
            }, user.id);
        }

        // تحديث دوري لآخر نشاط (باستخدام ActivityTracker مع إيقاف عند 401)
        try { if (window.ActivityTracker) await window.ActivityTracker.updateLastActivity(user.id); } catch (e) {}
        updateActivityInterval = setInterval(async () => {
            try {
                if (window.ActivityTracker) await window.ActivityTracker.updateLastActivity(user.id);
            } catch (e) {
                if (e?.code === 401 || e?.message?.includes('401')) {
                    clearInterval(updateActivityInterval);
                }
            }
        }, 60000);

        // تحميل بيانات اللوحة
        document.getElementById('loadingOverlay')?.classList.add('active');
        await loadCustomerJourney(user);
        await loadStats(user);
        await loadChartData(user);

        // عرض الوقت
        const updateDateTime = () => {
            const now = new Date();
            const d = document.getElementById('currentDate');
            const t = document.getElementById('currentTime');
            const s = document.getElementById('sessionTimer');
            if (d) d.textContent = now.toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });
            if (t) t.textContent = now.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });
            if (s) {
                const mins = Math.floor((now - sessionStart) / 60000);
                const h = Math.floor(mins / 60), m = mins % 60;
                s.textContent = h > 0 ? `${h} ساعة و ${m} دقيقة` : `${m} دقيقة`;
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
