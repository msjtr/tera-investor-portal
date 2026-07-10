/**
 * security.js – v2 (مركز الأمان المركزي)
 * مهام: Auth Guard - VPN/Proxy Detection - Idle Timer - Session Helpers
 */
(function() {
    // التأكد من وجود Supabase (سيتم توفيره من supabase-client.js)
    const supabase = window.teraSupabase || window.supabase;
    if (!supabase) {
        console.warn('security.js: Supabase غير متوفر بعد، سيتم التحميل لاحقاً.');
    }

    // ---- دوال المصادقة الأساسية ----
    /**
     * التحقق من وجود مستخدم حالي، وإعادة التوجيه لصفحة الدخول إذا لم يوجد
     * @param {string} redirectUrl - رابط صفحة الدخول
     * @returns {object|null} المستخدم الحالي أو null
     */
    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') {
        try {
            const sb = window.teraSupabase || await window.waitForSupabase?.() || supabase;
            const { data: { user } } = await sb.auth.getUser();
            if (!user) {
                window.location.replace(redirectUrl);
                return null;
            }
            return user;
        } catch (error) {
            console.error('فشل التحقق من الجلسة:', error);
            window.location.replace(redirectUrl);
            return null;
        }
    }

    /**
     * الحصول على المستخدم الحالي (دون إعادة توجيه)
     * @returns {object|null} المستخدم أو null
     */
    async function getCurrentUser() {
        try {
            const sb = window.teraSupabase || await window.waitForSupabase?.() || supabase;
            const { data: { user } } = await sb.auth.getUser();
            return user;
        } catch {
            return null;
        }
    }

    // ---- كشف VPN / Proxy ----
    /**
     * كشف استخدام VPN/بروكسي عبر ipapi.co (مجاني 1000 طلب/يوم)
     * @returns {object|null} بيانات الموقع والشبكة
     */
    async function detectVPN() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) throw new Error('فشل الاتصال');
            const data = await response.json();
            
            return {
                ip: data.ip,
                country: data.country_name,
                country_code: data.country_code,
                city: data.city,
                isp: data.org,
                proxy: data.proxy || false,
                hosting: data.hosting || false,
                vpn: data.proxy || data.hosting || false,
                lat: data.latitude,
                lon: data.longitude
            };
        } catch (error) {
            console.error('فشل كشف VPN:', error);
            return null;
        }
    }

    // ---- نظام الخمول (Idle Timer) ----
    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000; // 5 دقائق

    /**
     * تهيئة مؤقت الخمول
     * @param {function} onTimeout - callback عند انتهاء المهلة
     * @param {function} onWarning - callback قبل 30 ثانية من انتهاء المهلة
     */
    function initIdleTimer(onTimeout, onWarning) {
        resetIdleTimer(onTimeout, onWarning);
        
        // إعادة التعيين عند أي نشاط
        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
            document.addEventListener(ev, () => resetIdleTimer(onTimeout, onWarning));
        });
    }

    function resetIdleTimer(onTimeout, onWarning) {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
        
        // إخفاء أي تحذير موجود
        const warningElem = document.getElementById('idleWarning');
        if (warningElem) warningElem.style.display = 'none';
        
        // تحذير قبل 30 ثانية
        if (onWarning) {
            idleWarningTimer = setTimeout(() => {
                if (warningElem) warningElem.style.display = 'flex';
                onWarning();
            }, IDLE_TIME - 30000);
        }
        
        // تنفيذ callback بعد المدة الكاملة
        idleTimer = setTimeout(() => {
            if (onTimeout) onTimeout();
        }, IDLE_TIME);
    }

    function clearIdleTimer() {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
    }

    // ---- تسجيل الخروج الآمن ----
    /**
     * تسجيل خروج كامل مع تحديث حالة الجلسة
     * @param {string} redirectUrl - رابط إعادة التوجيه بعد الخروج
     */
    async function secureLogout(redirectUrl = '/auth/auth/login/login.html') {
        try {
            const sb = window.teraSupabase || supabase;
            if (sb) {
                const { data: { user } } = await sb.auth.getUser();
                if (user) {
                    // إنهاء الجلسة النشطة الأخيرة
                    await sb.from('user_login_sessions')
                        .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .order('login_at', { ascending: false })
                        .limit(1);
                }
                await sb.auth.signOut();
            }
        } catch (e) {
            console.error('خطأ أثناء تسجيل الخروج:', e);
        } finally {
            clearIdleTimer();
            window.location.replace(redirectUrl);
        }
    }

    // ---- إدارة الجلسات ----
    /**
     * إنهاء جلسة محددة
     * @param {string} sessionId - معرف الجلسة
     * @param {string} userId - معرف المستخدم
     * @returns {boolean} نجاح العملية
     */
    async function terminateSession(sessionId, userId) {
        const sb = window.teraSupabase || supabase;
        if (!sb) return false;
        const { error } = await sb.from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', userId);
        return !error;
    }

    /**
     * تسجيل الخروج من جميع الأجهزة الأخرى
     * @param {string} currentSessionId - الجلسة الحالية (لعدم إنهائها)
     * @param {string} userId - معرف المستخدم
     * @returns {boolean} نجاح العملية
     */
    async function terminateOtherSessions(currentSessionId, userId) {
        const sb = window.teraSupabase || supabase;
        if (!sb) return false;
        const { error } = await sb.from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active')
            .neq('id', currentSessionId);
        return !error;
    }

    // ---- تعريض الدوال للاستخدام العام ----
    window.Security = {
        requireAuth,
        getCurrentUser,
        detectVPN,
        initIdleTimer,
        resetIdleTimer,
        clearIdleTimer,
        secureLogout,
        terminateSession,
        terminateOtherSessions
    };

    console.log('security.js: مركز الأمان جاهز');
})();
