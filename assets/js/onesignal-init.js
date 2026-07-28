/**
 * onesignal-init.js – v8 (التهيئة فقط، لا تسجيل للمستخدم)
 * - يقوم بتهيئة OneSignal SDK فقط
 * - يحصل على Player ID ويخزنه في sessionStorage
 * - لا يحاول تسجيل المستخدم أبداً (يترك ذلك لـ Auth.js)
 * - يتعامل مع Tracking Prevention
 * - لا يسبب أي أخطاء 409
 */

(function() {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";

    function isStorageAvailable() {
        try {
            sessionStorage.setItem('__test', 'test');
            sessionStorage.removeItem('__test');
            return true;
        } catch { return false; }
    }

    function showStorageWarning() {
        const el = document.getElementById('osStatusText');
        if (el) {
            el.textContent = '⚠️ التخزين محظور، يرجى تعطيل Tracking Prevention';
            el.className = 'status-value warning';
        }
    }

    async function waitForPlayerId(OneSignal, maxAttempts = 15) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const id = OneSignal.User?.PushSubscription?.id;
                if (id) return id;
            } catch {}
            await new Promise(r => setTimeout(r, 500));
        }
        return null;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function(OneSignal) {
        try {
            if (!isStorageAvailable()) showStorageWarning();

            await OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                serviceWorkerPath: "/OneSignalSDKWorker.js",
                serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
                notifyButton: { enable: false },
                allowLocalhostAsSecureOrigin: true
            });

            window.OneSignal = OneSignal;
            console.log("✅ OneSignal Initialized (no user binding)");

            // الحصول على Player ID وتخزينه لاستخدامه لاحقاً
            const playerId = await waitForPlayerId(OneSignal);
            if (playerId) {
                sessionStorage.setItem('pending_player_id', playerId);
                console.log("📌 Player ID obtained:", playerId);
            }

            // تحديث واجهة الحالة
            updateStatusDisplay(OneSignal);

            // دوال مساعدة
            window.getPlayerId = () => window.OneSignal?.User?.PushSubscription?.id || null;
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: window.getPlayerId()
            });

            // مراقبة تغيير إذن الإشعارات
            if (Notification.permission === 'denied') {
                console.warn('⚠️ Notifications permission denied.');
                const el = document.getElementById('osStatusText');
                if (el) {
                    el.textContent = '🔇 الإشعارات مرفوضة';
                    el.className = 'status-value denied';
                }
            }

        } catch (err) {
            console.error("❌ OneSignal Init Error:", err);
            const el = document.getElementById('osStatusText');
            if (el) {
                el.textContent = '❌ خطأ في التهيئة';
                el.className = 'status-value error';
            }
        }
    });

    function updateStatusDisplay(OneSignal) {
        const el = document.getElementById('osStatusText');
        if (!el) return;
        try {
            const sub = OneSignal.User?.PushSubscription;
            if (sub?.id) {
                el.textContent = "✅ مفعلة (Subscribed)";
                el.className = "status-value subscribed";
                const pid = document.getElementById('osPlayerId');
                if (pid) pid.textContent = `Player ID: ${sub.id}`;
            } else if (Notification.permission === 'denied') {
                el.textContent = "🔇 مرفوضة (Denied)";
                el.className = "status-value denied";
            } else {
                el.textContent = "⏳ غير مشترك بعد (Waiting)";
                el.className = "status-value unsubscribed";
            }
        } catch {
            el.textContent = "❌ حالة غير معروفة";
            el.className = "status-value error";
        }
    }

    // Fallback للتخزين
    if (!isStorageAvailable()) {
        console.warn('⚠️ sessionStorage blocked, using memory fallback');
        window.__memoryStorage = {};
        const origSet = sessionStorage.setItem;
        const origGet = sessionStorage.getItem;
        const origRemove = sessionStorage.removeItem;
        sessionStorage.setItem = function(k, v) {
            try { origSet.call(this, k, v); } catch { window.__memoryStorage[k] = v; }
        };
        sessionStorage.getItem = function(k) {
            try { return origGet.call(this, k); } catch { return window.__memoryStorage[k] || null; }
        };
        sessionStorage.removeItem = function(k) {
            try { origRemove.call(this, k); } catch { delete window.__memoryStorage[k]; }
        };
    }

    console.log("🚀 onesignal-init.js v8 loaded (init only, no user binding)");
})();
