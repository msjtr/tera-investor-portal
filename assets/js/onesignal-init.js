/**
 * onesignal-init.js – OneSignal Web SDK v16 مع تخزين Player ID
 */
(function () {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function (OneSignal) {
        try {
            await OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                serviceWorkerPath: "/OneSignalSDKWorker.js",
                serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
                notifyButton: { enable: false },
                allowLocalhostAsSecureOrigin: true
            });

            window.OneSignal = OneSignal;
            console.log("✅ OneSignal Initialized");

            // انتظر حتى يكتمل الاشتراك
            await waitForSubscription(OneSignal);

            // خزّن playerId في sessionStorage
            const playerId = OneSignal.User?.PushSubscription?.id;
            if (playerId) {
                sessionStorage.setItem("onesignal_subscription_id", playerId);
                console.log("📌 Player ID saved:", playerId);
            }

            // تسجيل دخول المستخدم (اختياري، لكن نتركه)
            const user = await getCurrentUser();
            if (user?.id) {
                try {
                    await OneSignal.login(user.id);
                    console.log("✅ OneSignal login:", user.id);
                } catch (e) {
                    console.warn("⚠️ OneSignal login failed:", e.message);
                }
            }

            // تحديث واجهة الحالة
            updateStatusDisplay(OneSignal);

            // تصدير دوال مساعدة
            window.waitForOneSignal = () => Promise.resolve(OneSignal);
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: playerId ?? null,
                externalId: null
            });

        } catch (err) {
            console.error("❌ OneSignal Initialization Error", err);
        }
    });

    async function waitForSubscription(OneSignal, timeout = 10000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (OneSignal.User?.PushSubscription?.id) return;
            await new Promise(r => setTimeout(r, 500));
        }
        console.warn("⚠️ PushSubscription did not become ready in time");
    }

    async function getCurrentUser() {
        if (window.Auth?.getCurrentUser) return await window.Auth.getCurrentUser();
        if (window.teraSupabase) {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            return user;
        }
        return null;
    }

    function updateStatusDisplay(OneSignal) {
        const statusEl = document.getElementById("osStatusText");
        if (!statusEl) return;
        const sub = OneSignal.User?.PushSubscription;
        if (sub?.id) {
            statusEl.textContent = "مفعلة (Subscribed)";
            statusEl.className = "status-value subscribed";
            const playerIdEl = document.getElementById("osPlayerId");
            if (playerIdEl) playerIdEl.textContent = `Player ID: ${sub.id}`;
        } else {
            statusEl.textContent = "غير مشترك (Unsubscribed)";
            statusEl.className = "status-value unsubscribed";
        }
    }

    console.log("🚀 Initializing OneSignal (deferred)...");
})();
