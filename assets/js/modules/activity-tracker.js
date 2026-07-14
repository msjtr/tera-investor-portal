/**
 * modules/activity-tracker.js – مؤقت خمول آمن (5 دقائق + تحذير 60 ثانية)
 * - لا ينتهي الجلسة والمستخدم نشط فعليًا
 * - يدعم Page Visibility API
 */
(function() {
    'use strict';

    const IDLE_TIMEOUT = 5 * 60 * 1000;
    const WARNING_BEFORE = 60 * 1000;
    const ACTIVITY_UPDATE_INTERVAL = 30 * 1000;

    let warningTimer = null;
    let countdownInterval = null;
    let countdownSeconds = 0;
    let lastActivityUpdate = 0;
    let isUpdating = false;
    let currentUserId = null;
    let isSessionEnded = false;
    let onTimeoutCallback = null;

    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    async function updateLastActivity(userId, force = false) {
        if (!userId || isSessionEnded) return;
        const now = Date.now();
        if (!force && (now - lastActivityUpdate < ACTIVITY_UPDATE_INTERVAL)) return;
        if (isUpdating) return;

        isUpdating = true;
        try {
            const sb = await getSupabase();
            if (sb) {
                await sb.from('user_login_sessions')
                    .update({ last_activity_at: new Date().toISOString() })
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .eq('is_current_session', true);
                lastActivityUpdate = now;
            }
        } catch (e) { /* تجاهل */ } finally {
            isUpdating = false;
        }
    }

    function showWarning() {
        const box = document.getElementById('idleWarning');
        if (!box || isSessionEnded) return;

        box.style.display = 'flex';
        countdownSeconds = WARNING_BEFORE / 1000;
        const display = document.getElementById('countdown');
        if (display) display.textContent = countdownSeconds;

        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            countdownSeconds--;
            if (display) display.textContent = countdownSeconds;
            if (countdownSeconds <= 0) {
                clearInterval(countdownInterval);
                endSession('system_timeout');
            }
        }, 1000);

        const extendBtn = document.getElementById('extendSessionBtn');
        if (extendBtn) {
            extendBtn.onclick = (e) => {
                e.preventDefault();
                clearInterval(countdownInterval);
                hideWarning();
                resetTimers();
            };
        }

        const logoutBtn = document.getElementById('logoutNowBtn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                clearInterval(countdownInterval);
                endSession('user_logout');
            };
        }
    }

    function hideWarning() {
        const box = document.getElementById('idleWarning');
        if (box) box.style.display = 'none';
        clearInterval(countdownInterval);
    }

    async function endSession(reason) {
        if (isSessionEnded) return;
        isSessionEnded = true;
        clearAllTimers();

        if (currentUserId) {
            const sb = await getSupabase();
            if (sb) {
                await sb.from('user_login_sessions')
                    .update({
                        status: 'timeout',
                        logout_at: new Date().toISOString(),
                        logout_reason: reason
                    })
                    .eq('user_id', currentUserId)
                    .eq('status', 'active')
                    .eq('is_current_session', true);
            }
        }

        if (onTimeoutCallback) {
            onTimeoutCallback(reason);
        } else {
            if (window.Auth?.logout) {
                await window.Auth.logout();
            } else {
                window.location.href = `/auth/auth/login/login.html?reason=${reason}`;
            }
        }
    }

    // 🔁 إعادة تعيين المؤقتات (يقبل userId اختياريًا، يستخدم currentUserId إن لم يُمرر)
    function resetTimers(userId) {
        if (isSessionEnded) return;

        // تحديث userId إذا تم تمريره
        if (userId) {
            currentUserId = userId;
        }
        // إذا لا يوجد userId على الإطلاق، لا يمكننا الاستمرار
        if (!currentUserId) return;

        clearTimeout(warningTimer);
        hideWarning();

        // تحديث آخر نشاط
        updateLastActivity(currentUserId);

        // ضبط مؤقت التحذير (4 دقائق)
        const warningDelay = IDLE_TIMEOUT - WARNING_BEFORE;
        warningTimer = setTimeout(() => {
            showWarning();
        }, warningDelay);
    }

    function clearAllTimers() {
        clearTimeout(warningTimer);
        clearInterval(countdownInterval);
        hideWarning();
    }

    // 🚀 بدء المراقبة (يربط الأحداث ويبدأ المؤقت)
    function startIdleTimer(onTimeout, userId) {
        // تنظيف أي مستمعين سابقين إن وجد (اختياري لكن آمن)
        stopListening();

        onTimeoutCallback = onTimeout;
        isSessionEnded = false;
        lastActivityUpdate = 0;
        currentUserId = userId || currentUserId;

        if (!currentUserId) {
            console.warn('ActivityTracker: لم يتم توفير userId، لن يعمل المؤقت');
            return;
        }

        resetTimers(currentUserId);

        // مستمعو الأحداث
        window._activityEvents = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        window._activityEvents.forEach(ev => document.addEventListener(ev, activityHandler));
        document.addEventListener('visibilitychange', visibilityHandler);
    }

    function activityHandler() {
        if (isSessionEnded) return;
        // نمرر currentUserId المخزّن (مضمون وجوده بعد start)
        resetTimers();
    }

    function visibilityHandler() {
        if (document.hidden) {
            clearTimeout(warningTimer);
            clearInterval(countdownInterval);
        } else {
            if (!isSessionEnded && currentUserId) {
                resetTimers();
            }
        }
    }

    function stopListening() {
        if (window._activityEvents) {
            window._activityEvents.forEach(ev => document.removeEventListener(ev, activityHandler));
        }
        document.removeEventListener('visibilitychange', visibilityHandler);
    }

    function destroy() {
        clearAllTimers();
        isSessionEnded = true;
        stopListening();
    }

    window.ActivityTracker = {
        startIdleTimer,
        resetIdleTimer: resetTimers,
        clearIdleTimer: clearAllTimers,
        updateLastActivity,
        endSession,
        destroy
    };
})();
