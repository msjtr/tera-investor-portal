/**
 * security.js – مركز الأمان المتكامل (v4)
 * يعتمد على الوحدات: network-monitor, activity-tracker, session-manager
 * يوفر: كشف VPN/Proxy، مؤقت خمول موحد، إنهاء جميع الجلسات الأخرى
 */
(function() {
    'use strict';

    // ========== كشف VPN / Proxy (باستخدام ip-api.com) ==========
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

    // ========== نظام الخمول الموحد (يُستخدم من أي صفحة) ==========
    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000; // 5 دقائق

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

    // ========== تسجيل الخروج من جميع الأجهزة الأخرى ==========
    async function terminateOtherSessions(userId) {
        // استخدام SessionManager إذا كان متوفراً
        if (window.SessionManager && window.SessionManager.terminateSession) {
            const sessions = await window.SessionManager.fetchSessions(userId);
            const otherSessions = sessions.filter(s => s.is_current_session !== true && s.status === 'active');
            for (const session of otherSessions) {
                await window.SessionManager.terminateSession(session.id, userId);
            }
            return true;
        }

        // خطة بديلة: استخدام Supabase مباشرة
        const sb = window.teraSupabase || await window.waitForSupabase?.();
        if (!sb) return false;
        const { error } = await sb.from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active')
            .neq('is_current_session', true);
        return !error;
    }

    // ========== تحديث نشاط الجلسة الحالية ==========
    async function updateCurrentSessionActivity(userId) {
        // استخدام ActivityTracker إذا كان متوفراً
        if (window.ActivityTracker && window.ActivityTracker.updateLastActivity) {
            await window.ActivityTracker.updateLastActivity(userId);
            return;
        }

        // خطة بديلة
        const sb = window.teraSupabase || await window.waitForSupabase?.();
        if (!sb || !userId) return;
        try {
            await sb.from('user_login_sessions')
                .update({ last_activity_at: new Date().toISOString() })
                .eq('user_id', userId)
                .eq('status', 'active')
                .eq('is_current_session', true);
        } catch (e) { /* تجاهل */ }
    }

    // ========== تعريض الدوال العامة ==========
    window.Security = {
        detectVPN,
        initIdleTimer,
        resetIdleTimer,
        clearIdleTimer,
        terminateOtherSessions,
        updateCurrentSessionActivity
    };

    console.log('security.js v4: مركز الأمان جاهز');
})();
