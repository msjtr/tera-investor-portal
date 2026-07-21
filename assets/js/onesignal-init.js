/**
 * ============================================================
 * OneSignal Initialization – Tera Investor Portal
 * المسار: assets/js/onesignal-init.js
 * الإصدار: محسّن لـ OneSignal Web SDK v16
 * ============================================================
 */

(function () {
    "use strict";

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

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForPushSubscription(
        OneSignal,
        timeout = 10000
    ) {

        const start = Date.now();

        while (
            Date.now() - start < timeout
        ) {

            try {

                if (
                    OneSignal.User &&
                    OneSignal.User.PushSubscription &&
                    OneSignal.User.PushSubscription.id
                ) {
                    return true;
                }

            } catch (e) {}

            await sleep(500);

        }

        return false;

    }

    async function loginCurrentUser(
        OneSignal
    ) {

        try {

            let userId = null;

            if (
                window.Auth &&
                typeof window.Auth.getCurrentUser === "function"
            ) {

                const user =
                    await window.Auth.getCurrentUser();

                userId = user?.id;

            } else if (
                window.teraSupabase
            ) {

                const {
                    data: { user }
                } =
                    await window.teraSupabase.auth.getUser();

                userId = user?.id;

            }

            if (!userId) {

                console.log(
                    "ℹ️ لا يوجد مستخدم مسجل دخول"
                );

                return;

            }

            const ready =
                await waitForPushSubscription(
                    OneSignal
                );

            if (!ready) {

                console.warn(
                    "⚠️ Push Subscription غير جاهز"
                );

                return;

            }

            if (
                !OneSignal.User.PushSubscription.optedIn
            ) {

                console.warn(
                    "⚠️ المستخدم غير مشترك بالإشعارات"
                );

                return;

            }

            await OneSignal.login(
                userId
            );

            sessionStorage.setItem(
                "onesignal_external_id",
                userId
            );

            console.log(
                "✅ OneSignal Login:",
                userId
            );

        } catch (err) {

            console.error(
                "❌ OneSignal Login Error",
                err
            );

        }

    }

    function listenForUserChanges(
        OneSignal
    ) {

        document.addEventListener(
            "user:updated",
            async (event) => {

                try {

                    if (
                        !event.detail?.id
                    ) return;

                    await OneSignal.login(
                        event.detail.id
                    );

                    sessionStorage.setItem(
                        "onesignal_external_id",
                        event.detail.id
                    );

                    console.log(
                        "✅ OneSignal Login Updated"
                    );

                } catch (err) {

                    console.error(
                        err
                    );

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

                    console.log(
                        "✅ OneSignal Logout"
                    );

                } catch (err) {

                    console.warn(
                        err
                    );

                }

            }
        );

        window.OneSignalDeferred =
        window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(
        async function (OneSignal) {

            try {

                await OneSignal.init(
                    ONESIGNAL_CONFIG
                );

                window.OneSignal = OneSignal;

                console.log(
                    "✅ OneSignal Initialized"
                );

                // انتظار إنشاء الاشتراك
                await waitForPushSubscription(
                    OneSignal
                );

                // تسجيل دخول المستخدم
                await loginCurrentUser(
                    OneSignal
                );

                // الاستماع لتغييرات المستخدم
                listenForUserChanges(
                    OneSignal
                );

                const permission =
                    Notification.permission;

                const optedIn =
                    OneSignal.User.PushSubscription.optedIn;

                const subscriptionId =
                    OneSignal.User.PushSubscription.id;

                console.log(
                    "Permission:",
                    permission
                );

                console.log(
                    "Opted In:",
                    optedIn
                );

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

                if (
                    window.OneSignal
                ) {

                    resolve(
                        window.OneSignal
                    );

                    return;

                }

                const timer =
                    setTimeout(
                        () => {

                            reject(
                                new Error(
                                    "OneSignal timeout"
                                )
                            );

                        },
                        timeout
                    );
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

    /**
     * التحقق من حالة الاشتراك
     */
    window.getOneSignalStatus = function () {

        if (!window.OneSignal) {

            return {
                initialized: false,
                permission: Notification.permission,
                optedIn: false,
                subscriptionId: null,
                externalId: null
            };

        }

        return {

            initialized: true,

            permission: Notification.permission,

            optedIn:
                window.OneSignal.User?.PushSubscription?.optedIn ?? false,

            subscriptionId:
                window.OneSignal.User?.PushSubscription?.id ?? null,

            externalId:
                window.OneSignal.User?.externalId ?? null

        };

    };

    console.log(
        "🚀 Initializing OneSignal..."
    );

})();
