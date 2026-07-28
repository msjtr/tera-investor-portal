/**
 * onesignal-init.js – v5 (متوافق مع Auth.js v35+)
 * - يستمع لحدث user:updated مع id
 * - يستخدم Auth.registerPushNotifications إن أمكن
 * - يحسن التعامل مع Tracking Prevention
 * - يزيل الاعتماد على المفاتيح غير المستخدمة
 */
(function() {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";
    const STORAGE_KEY = "onesignal_registered";

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
            console.log("✅ OneSignal Initialized");

            const playerId = await waitForPlayerId(OneSignal);
            if (playerId) {
                sessionStorage.setItem('pending_player_id', playerId);
                console.log("📌 Player ID obtained:", playerId);

                // محاولة الربط عبر Auth إذا كان متاحاً
                if (window.Auth && typeof window.Auth.registerPushNotifications === 'function') {
                    const user = await window.Auth.getCurrentUser();
                    if (user?.id) {
                        await window.Auth.registerPushNotifications(user.id);
                    }
                }
            }

            // مستمع تسجيل الدخول (يستقبل id من Auth)
            document.addEventListener('user:updated', async (e) => {
                const userId = e.detail?.id;
                if (!userId) return;
                const playerId2 = sessionStorage.getItem('pending_player_id') || 
                                  window.OneSignal?.User?.PushSubscription?.id || null;
                if (playerId2 && window.Auth?.registerPushNotifications) {
                    await window.Auth.registerPushNotifications(userId);
                }
            });

            // مستمع تسجيل الخروج
            document.addEventListener('user:loggedOut', async () => {
                sessionStorage.removeItem(STORAGE_KEY);
                if (window.OneSignal?.logout) {
                    try { await window.OneSignal.logout(); } catch {}
                }
                sessionStorage.removeItem('pending_player_id');
            });

            updateStatusDisplay(OneSignal);

            window.getPlayerId = () => window.OneSignal?.User?.PushSubscription?.id || null;
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: window.getPlayerId()
            });

        } catch (err) {
            console.error("❌ OneSignal Init Error:", err);
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

    console.log("🚀 onesignal-init.js v5 loaded (with Auth.js integration)");
})();
