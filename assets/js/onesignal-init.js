/**
 * onesignal-init.js – تهيئة OneSignal Web SDK v16
 * يستخدم OneSignalDeferred لضمان التحميل الكامل
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

            // تسجيل دخول المستخدم الحالي إن وُجد
            const user = window.Auth?.getCurrentUser ? await window.Auth.getCurrentUser() : null;
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

            // استماع لتغييرات المستخدم
            document.addEventListener("user:updated", async (e) => {
                if (e.detail?.id) await OneSignal.login(e.detail.id);
            });
            document.addEventListener("user:loggedOut", async () => {
                await OneSignal.logout();
            });

            // تصدير دوال مساعدة
            window.waitForOneSignal = (timeout = 5000) => Promise.resolve(OneSignal);
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: OneSignal.User?.PushSubscription?.id ?? null,
                externalId: null
            });

        } catch (err) {
            console.error("❌ OneSignal Initialization Error", err);
        }
    });

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
