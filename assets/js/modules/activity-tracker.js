/**
 * modules/activity-tracker.js – أفضل مؤقت خمول مع تحذير وعد تنازلي
 * - 5 دقائق خمول
 * - تحذير 60 ثانية مع خيارات (تمديد / خروج)
 * - إنهاء الجلسة تلقائياً بنهاية التحذير مع السبب
 * - دعم Page Visibility API لتجنب الخروج غير المقصود
 */
(function() {
    'use strict';

    // ⏱️ الإعدادات
    const IDLE_TIMEOUT = 5 * 60 * 1000;           // 5 دقائق
    const WARNING_BEFORE = 60 * 1000;             // التحذير قبل 60 ثانية
    const ACTIVITY_UPDATE_INTERVAL = 30 * 1000;   // تحديث last_activity_at كل 30 ثانية

    // 🔧 متغيرات داخلية
    let warningTimer = null;
    let countdownInterval = null;
    let countdownSeconds = 0;
    let lastActivityUpdate = 0;
    let isUpdating = false;
    let currentUserId = null;
    let isSessionEnded = false;                  // لمنع إنهاء الجلسة مرتين
    let onTimeoutCallback = null;

    // 📌 دوال مساعدة
    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    // 📤 تحديث وقت آخر نشاط (مع خنق زمني)
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
        } catch (error) {
            console.warn('فشل تحديث آخر نشاط:', error);
        } finally {
            isUpdating = false;
        }
    }

    // 🖥️ إظهار نافذة التحذير مع العد التنازلي
    function showWarning(userId) {
        const box = document.getElementById('idleWarning');
        if (!box || isSessionEnded) return;

        // إظهار النافذة
        box.style.display = 'flex';
        countdownSeconds = WARNING_BEFORE / 1000;
        const display = document.getElementById('countdown');
        if (display) display.textContent = countdownSeconds;

        // العد التنازلي
        countdownInterval = setInterval(() => {
            countdownSeconds--;
            if (display) display.textContent = countdownSeconds;

            if (countdownSeconds <= 0) {
                clearInterval(countdownInterval);
                endSession(userId, 'system_timeout');
            }
        }, 1000);

        // زر التمديد
        const extendBtn = document.getElementById('extendSessionBtn');
        if (extendBtn) {
            extendBtn.onclick = (e) => {
                e.preventDefault();
                clearInterval(countdownInterval);
                hideWarning();
                resetTimers(userId);
            };
        }

        // زر الخروج
        const logoutBtn = document.getElementById('logoutNowBtn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                clearInterval(countdownInterval);
                hideWarning();
                endSession(userId, 'user_logout');
            };
        }
    }

    // 🙈 إخفاء نافذة التحذير
    function hideWarning() {
        const box = document.getElementById('idleWarning');
        if (box) box.style.display = 'none';
        clearInterval(countdownInterval);
    }

    // 🚪 إنهاء الجلسة (تحديث القاعدة + توجيه)
    async function endSession(userId, reason) {
        if (isSessionEnded) return;  // منع التكرار
        isSessionEnded = true;

        // إيقاف جميع المؤقتات
        clearAllTimers();

        // تحديث قاعدة البيانات
        if (userId) {
            const sb = await getSupabase();
            if (sb) {
                await sb.from('user_login_sessions')
                    .update({
                        status: 'timeout',
                        logout_at: new Date().toISOString(),
                        logout_reason: reason
                    })
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .eq('is_current_session', true);
            }
        }

        // استدعاء callback أو الخروج الافتراضي
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

    // 🔄 إعادة تعيين المؤقتات (يُستدعى عند أي نشاط)
    function resetTimers(userId) {
        if (isSessionEnded) return;
        clearTimeout(warningTimer);
        hideWarning();
        currentUserId = userId;

        // تحديث وقت آخر نشاط
        updateLastActivity(userId);

        // ضبط مؤقت التحذير (قبل 60 ثانية من نهاية المهلة)
        const warningDelay = IDLE_TIMEOUT - WARNING_BEFORE;
        warningTimer = setTimeout(() => {
            showWarning(userId);
        }, warningDelay);
    }

    // 🧹 إلغاء جميع المؤقتات والمستمعين
    function clearAllTimers() {
        clearTimeout(warningTimer);
        clearInterval(countdownInterval);
        hideWarning();
    }

    // 🚀 بدء المراقبة
    function startIdleTimer(onTimeout, userId) {
        onTimeoutCallback = onTimeout;
        isSessionEnded = false;
        lastActivityUpdate = 0;
        currentUserId = userId;

        resetTimers(userId);

        // أحداث النشاط
        const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, activityHandler);
        });

        // Page Visibility API: إيقاف المؤقت عند إخفاء الصفحة
        document.addEventListener('visibilitychange', visibilityHandler);
    }

    // 🎯 معالج النشاط
    function activityHandler() {
        if (isSessionEnded) return;
        resetTimers(currentUserId);
    }

    // 👁️ معالج رؤية الصفحة (يمنع الخروج عند التصغير)
    function visibilityHandler() {
        if (document.hidden) {
            // إخفاء الصفحة: إيقاف مؤقت التحذير (لكن لا ننهي الجلسة)
            clearTimeout(warningTimer);
            clearInterval(countdownInterval);
            hideWarning();
        } else {
            // عودة المستخدم: إعادة ضبط المؤقتات وكأنه نشط
            if (!isSessionEnded && currentUserId) {
                resetTimers(currentUserId);
            }
        }
    }

    // 🧽 تنظيف كامل (عند تسجيل الخروج اليدوي مثلاً)
    function destroy() {
        clearAllTimers();
        isSessionEnded = true;
        const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.removeEventListener(event, activityHandler);
        });
        document.removeEventListener('visibilitychange', visibilityHandler);
    }

    // 🌐 واجهة عامة
    window.ActivityTracker = {
        startIdleTimer,
        resetIdleTimer: resetTimers,   // متوافق مع الاسم القديم
        clearIdleTimer: clearAllTimers,
        updateLastActivity,
        endSession,
        destroy
    };
})();
