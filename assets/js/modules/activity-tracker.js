/**
 * modules/activity-tracker.js – مؤقت الخمول + تحديث last_activity_at
 * تم تغيير المهلة إلى دقيقة واحدة
 */
(function() {
    const IDLE_TIME = 1 * 60 * 1000; // دقيقة واحدة
    let idleTimer, idleWarningTimer;
    let onTimeoutCallback = null;

    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    async function updateLastActivity(userId) {
        const sb = await getSupabase();
        if (!sb || !userId) return;
        try {
            await sb.from('user_login_sessions')
                .update({ last_activity_at: new Date().toISOString() })
                .eq('user_id', userId)
                .eq('status', 'active')
                .eq('is_current_session', true);
        } catch (e) {}
    }

    function startIdleTimer(onTimeout, userId) {
        onTimeoutCallback = onTimeout;
        resetIdleTimer(userId);
        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
            document.addEventListener(ev, () => resetIdleTimer(userId));
        });
    }

    function resetIdleTimer(userId) {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
        const warningEl = document.getElementById('idleWarning');
        if (warningEl) warningEl.style.display = 'none';

        // تحذير قبل 10 ثوانٍ من انتهاء الدقيقة
        idleWarningTimer = setTimeout(() => {
            if (warningEl) warningEl.style.display = 'flex';
        }, IDLE_TIME - 10000);

        idleTimer = setTimeout(async () => {
            if (onTimeoutCallback) {
                onTimeoutCallback();
            } else {
                if (userId) {
                    const sb = await getSupabase();
                    if (sb) {
                        await sb.from('user_login_sessions')
                            .update({ status: 'timeout', logout_at: new Date().toISOString() })
                            .eq('user_id', userId)
                            .eq('status', 'active')
                            .eq('is_current_session', true);
                    }
                }
                // Auth.logout الجديدة ستقوم بالتوجيه تلقائياً إلى صفحة الدخول
                if (window.Auth?.logout) {
                    await window.Auth.logout();
                } else {
                    window.location.href = '/auth/auth/login/login.html?reason=timeout';
                }
            }
        }, IDLE_TIME);
    }

    function clearIdleTimer() {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
    }

    window.ActivityTracker = { startIdleTimer, resetIdleTimer, clearIdleTimer, updateLastActivity };
})();
