/**
 * ============================================================
 * OneSignal Initialization – Tera Investor Portal
 * المسار: assets/js/onesignal-init.js
 * ============================================================
 * OneSignal Web SDK v16
 * ============================================================
 */

(function () {
    'use strict';

    // منع التهيئة المتكررة
    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_CONFIG = {
        appId: "512d9b65-ec50-41a5-ac12-059a83441a72",

        serviceWorkerPath: "/OneSignalSDKWorker.js",

        serviceWorkerParam: {
            scope: "/"
        },

        notifyButton: {
            enable: false
        }
    };

    /**
     * ربط المستخدم الحالي بـ OneSignal
     */
    async function loginCurrentUser(OneSignal) {

        try {

            let userId = null;

            if (window.Auth && typeof window.Auth.getCurrentUser === "function") {

                const user = await window.Auth.getCurrentUser();

                userId = user?.id;

            } else if (window.teraSupabase) {

                const {
                    data: { user }
                } = await window.teraSupabase.auth.getUser();

                userId = user?.id;
            }

            if (!userId) {

                console.log("ℹ️ لا يوجد مستخدم مسجل دخول");

                return;
            }

            await OneSignal.login(userId);

            console.log("✅ OneSignal Login:", userId);

            sessionStorage.setItem(
                "onesignal_external_id",
                userId
            );

        } catch (err) {

            console.error("❌ OneSignal Login Error", err);

        }

    }

    /**
     * تحديث المستخدم عند تسجيل الدخول
     */
    function listenForUserChanges(OneSignal) {

        document.addEventListener(
            "user:updated",
            async (event) => {

                try {

                    if (!event.detail?.id) return;

                    await OneSignal.login(event.detail.id);

                    console.log(
                        "✅ OneSignal Login Updated:",
                        event.detail.id
                    );

                } catch (err) {

                    console.error(err);

                }

            }
        );

        document.addEventListener(
            "user:loggedOut",
            async () => {

                try {

                    await OneSignal.logout();

                    sessionStorage.removeItem(
                        "onesignal_external_id"
                    );

                    sessionStorage.removeItem(
                        "onesignal_subscription_id"
                    );

                    console.log("✅ OneSignal Logout");

                } catch (err) {

                    console.warn(err);

                }

            }
        );

    }

    window.OneSignalDeferred =
        window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(
        async function (OneSignal) {

            try {

                await OneSignal.init(
                    ONESIGNAL_CONFIG
                );

                window.OneSignal = OneSignal;

                console.log("✅ OneSignal Initialized");

                await loginCurrentUser(
                    OneSignal
                );

                listenForUserChanges(
                    OneSignal
                );

                const permission =
                    Notification.permission;

                console.log(
                    "Permission:",
                    permission
                );

                const opted =
                    OneSignal.User.PushSubscription.optedIn;

                console.log(
                    "Opted In:",
                    opted
                );

                const subscriptionId =
                    OneSignal.User.PushSubscription.id;

                console.log(
                    "Subscription:",
                    subscriptionId
                );

                if (subscriptionId) {

                    sessionStorage.setItem(
                        "onesignal_subscription_id",
                        subscriptionId
                    );

                } else {

                    sessionStorage.removeItem(
                        "onesignal_subscription_id"
                    );

                }

                document.dispatchEvent(
                    new CustomEvent(
                        "onesignal:ready"
                    )
                );

                console.log(
                    "🚀 OneSignal Ready"
                );

            } catch (err) {

                console.error(
                    "❌ OneSignal Initialization Error",
                    err
                );

            }

        }
    );

    /**
     * انتظار جاهزية OneSignal
     */
    window.waitForOneSignal = function (
        timeout = 10000
    ) {

        return new Promise(
            (resolve, reject) => {

                if (window.OneSignal) {

                    resolve(
                        window.OneSignal
                    );

                    return;

                }

                const timer =
                    setTimeout(() => {

                        reject(
                            new Error(
                                "OneSignal timeout"
                            )
                        );

                    }, timeout);

                document.addEventListener(
                    "onesignal:ready",
                    () => {

                        clearTimeout(
                            timer
                        );

                        resolve(
                            window.OneSignal
                        );

                    },
                    {
                        once: true
                    }
                );

            }
        );

    };

    console.log(
        "🚀 Initializing OneSignal..."
    );

})();
