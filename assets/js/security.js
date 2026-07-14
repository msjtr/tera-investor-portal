/**
 * security.js – مركز الأمان المتكامل (v5)
 * يعتمد على: SecurityEnforcer, ActivityTracker, SessionManager
 * الميزات:
 *   - فحص VPN/Proxy/Tor/Hosting عبر NetworkMonitor (آمن، بدون استدعاء مباشر)
 *   - مؤقت خمول متطور مع تحذير وعد تنازلي
 *   - إنهاء جميع الجلسات الأخرى
 *   - تحديث نشاط الجلسة الحالية
 */
(function() {
    'use strict';

    // ═══════════════════════════════════════
    // 1. كشف VPN / Proxy / Tor / Hosting (آمن)
    // ═══════════════════════════════════════
    async function detectVPN() {
        if (!window.NetworkMonitor || !window.NetworkMonitor.checkVPNProxy) {
            console.warn('NetworkMonitor غير متوفر، تعذر كشف الشبكة');
            return null;
        }
        const data = await window.NetworkMonitor.checkVPNProxy();
        if (!data) return null;
        return {
            ip: data.ip,
            isp: data.isp,
            proxy: data.is_proxy || data.is_vpn,
            hosting: data.is_hosting,
            tor: data.is_tor,
            vpn: data.is_vpn || data.is_proxy || data.is_tor || data.is_hosting,
            details: data
        };
    }

    /**
     * تطبيق سياسة الأمان ومنع الوصول في حالة الاتصال المشبوه
     * @returns {Promise<boolean>} true إذا كان مسموحًا، false إذا تم المنع
     */
    async function enforceSecureAccess() {
        if (window.SecurityEnforcer && window.SecurityEnforcer.enforceSecureConnection) {
            return await window.SecurityEnforcer.enforceSecureConnection();
        }
        // خطة بديلة: استخدام detectVPN مباشرة
        const vpn = await detectVPN();
        if (vpn && vpn.vpn) {
            alert('تم اكتشاف اتصال مشبوه (VPN/Proxy/Tor). لأسباب أمنية، لا يمكنك المتابعة.');
            return false;
        }
        return true;
    }

    // ═══════════════════════════════════════
    // 2. مؤقت الخمول (يستخدم ActivityTracker)
    // ═══════════════════════════════════════
    function initIdleTimer(onTimeout, userId) {
        // استخدام ActivityTracker المحسّن إن وجد
        if (window.ActivityTracker && window.ActivityTracker.startIdleTimer) {
            window.ActivityTracker.startIdleTimer(onTimeout, userId);
            return;
        }
        // خطة بديلة بسيطة (في حال عدم وجود ActivityTracker)
        console.warn('ActivityTracker غير متوفر، استخدام مؤقت بسيط');
        let idleTimer, warningTimer;
        const IDLE_TIME = 5 * 60 * 1000;
        function reset() {
            clearTimeout(idleTimer);
            clearTimeout(warningTimer);
            const warnEl = document.getElementById('idleWarning');
            if (warnEl) warnEl.style.display = 'none';
            idleTimer = setTimeout(onTimeout, IDLE_TIME);
        }
        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
            document.addEventListener(ev, reset);
        });
        reset();
        // تخزين الدوال للتحكم لاحقًا
        window._idleTimerReset = reset;
        window._idleClear = () => { clearTimeout(idleTimer); clearTimeout(warningTimer); };
    }

    function resetIdleTimer() {
        if (window.ActivityTracker && window.ActivityTracker.resetIdleTimer) {
            window.ActivityTracker.resetIdleTimer();
        } else if (window._idleTimerReset) {
            window._idleTimerReset();
        }
    }

    function clearIdleTimer() {
        if (window.ActivityTracker && window.ActivityTracker.clearIdleTimer) {
            window.ActivityTracker.clearIdleTimer();
        } else if (window._idleClear) {
            window._idleClear();
        }
    }

    // ═══════════════════════════════════════
    // 3. إنهاء جميع الجلسات الأخرى
    // ═══════════════════════════════════════
    async function terminateOtherSessions(userId) {
        if (window.SessionManager && window.SessionManager.deactivateOtherSessions) {
            return await window.SessionManager.deactivateOtherSessions(userId);
        }
        // خطة بديلة
        const sb = window.teraSupabase || await window.waitForSupabase?.();
        if (!sb) return false;
        const { error } = await sb.from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active')
            .neq('is_current_session', true);
        return !error;
    }

    // ═══════════════════════════════════════
    // 4. تحديث نشاط الجلسة الحالية
    // ═══════════════════════════════════════
    async function updateCurrentSessionActivity(userId) {
        if (window.ActivityTracker && window.ActivityTracker.updateLastActivity) {
            return await window.ActivityTracker.updateLastActivity(userId);
        }
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

    // ═══════════════════════════════════════
    // واجهة عامة
    // ═══════════════════════════════════════
    window.Security = {
        detectVPN,
        enforceSecureAccess,
        initIdleTimer,
        resetIdleTimer,
        clearIdleTimer,
        terminateOtherSessions,
        updateCurrentSessionActivity
    };

    console.log('security.js v5: مركز الأمان المتكامل جاهز');
})();
