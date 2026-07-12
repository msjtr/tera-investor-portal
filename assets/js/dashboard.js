/**
 * dashboard.js – لوحة التحكم المتكاملة (محسّنة)
 * - يتوقف عن تحديث last_activity_at عند خطأ 401
 * - لا يعيد التوجيه عند الأخطاء التقنية
 */
(function() {
    let supabase;
    let chartInstance = null;
    let requestData = null;
    const sessionStart = new Date();
    let updateActivityInterval = null; // لتخزين معرف المؤقت

    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

    // دوال مساعدة...
    function formatDateTime(iso) { /* ... كما هي */ }
    function getElapsedDays(iso) { /* ... */ }

    async function loadCustomerJourney(user) { /* ... */ }
    function renderIncompleteProfile(panel, req) { /* ... */ }
    function renderRequestStatus(panel, req) { /* ... */ }
    async function loadStats(user) { /* ... */ }
    async function loadChartData(user) { /* ... */ }

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
                if (window.Auth?.logout) await window.Auth.logout();
                else window.location.href = '/auth/auth/login/login.html?reason=timeout';
            }, user.id);

            // محاولة التحديث الأولى
            try {
                await window.ActivityTracker.updateLastActivity(user.id);
            } catch (e) {
                if (e.code === 401 || e.message?.includes('401')) {
                    console.warn('⚠️ لا يمكن تحديث last_activity (401). قد تكون الجلسة قديمة.');
                }
            }

            // مؤقت التحديث مع إيقاف عند 401
            updateActivityInterval = setInterval(async () => {
                try {
                    const result = await window.ActivityTracker.updateLastActivity(user.id);
                    // إذا رجع false أو خطأ 401، نوقف المؤقت
                    if (result === false) {
                        console.warn('⏹️ توقف تحديث النشاط (فشل متكرر).');
                        clearInterval(updateActivityInterval);
                    }
                } catch (e) {
                    if (e.code === 401 || e.message?.includes('401')) {
                        console.warn('⏹️ توقف تحديث النشاط بسبب 401.');
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

    // تنظيف عند مغادرة الصفحة (اختياري)
    window.addEventListener('beforeunload', () => {
        if (updateActivityInterval) clearInterval(updateActivityInterval);
    });

    document.addEventListener('DOMContentLoaded', init);
})();
