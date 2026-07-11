/**
 * security.js – v3 (مكمل لـ auth.js)
 * مهام فريدة: كشف VPN/Proxy - مؤقت خمول مشترك - إنهاء جميع الجلسات
 */
(function() {
    let supabase;

    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

    async function detectVPN() {
        try {
            const response = await fetch('https://ip-api.com/json/?fields=proxy,hosting');
            if (!response.ok) throw new Error('فشل الاتصال');
            const data = await response.json();
            return {
                proxy: data.proxy || false,
                hosting: data.hosting || false,
                vpn: data.proxy || data.hosting || false
            };
        } catch (error) {
            console.error('فشل كشف VPN:', error);
            return null;
        }
    }

    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000;

    function initIdleTimer(onTimeout, onWarning) {
        resetIdleTimer(onTimeout, onWarning);
        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
            document.addEventListener(ev, () => resetIdleTimer(onTimeout, onWarning));
        });
    }

    function resetIdleTimer(onTimeout, onWarning) {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
        const warningElem = document.getElementById('idleWarning');
        if (warningElem) warningElem.style.display = 'none';
        if (onWarning) {
            idleWarningTimer = setTimeout(() => {
                if (warningElem) warningElem.style.display = 'flex';
                onWarning();
            }, IDLE_TIME - 30000);
        }
        idleTimer = setTimeout(() => {
            if (onTimeout) onTimeout();
        }, IDLE_TIME);
    }

    function clearIdleTimer() {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
    }

    async function terminateOtherSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return false;
        const { error } = await sb.from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active')
            .neq('is_current_session', true);
        return !error;
    }

    window.Security = {
        detectVPN,
        initIdleTimer,
        resetIdleTimer,
        clearIdleTimer,
        terminateOtherSessions
    };

    console.log('security.js v3: مركز الأمان جاهز');
})();
