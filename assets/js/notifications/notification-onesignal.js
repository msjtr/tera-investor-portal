/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16
 * ============================================================
 *
 * ✅ متوافق مع OneSignal SDK v16
 * ✅ ينتظر جاهزية SDK بالكامل
 * ✅ ينتظر إنشاء Push Subscription قبل login
 * ✅ يمنع login المتكرر
 * ✅ يستخدم User.PushSubscription الصحيحة
 */

(function () {
    "use strict";

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    let lastLoggedUserId = null;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForOneSignal(timeout = 10000) {
        return new Promise((resolve, reject) => {

            if (
                window.OneSignal &&
                window.OneSignal.User &&
                window.OneSignal.Notifications &&
                typeof window.OneSignal.login === "function"
            ) {
                return resolve(window.OneSignal);
            }

            const timer = setTimeout(() => {
                clearInterval(interval);
                reject(new Error("OneSignal timeout"));
            }, timeout);

            const interval = setInterval(() => {

                if (
                    window.OneSignal &&
                    window.OneSignal.User &&
                    window.OneSignal.Notifications &&
                    typeof window.OneSignal.login === "function"
                ) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(window.OneSignal);
                }

            }, 200);

        });
    }

    async function waitForSubscription(maxWait = 10000) {

        const OneSignal = await waitForOneSignal();

        const start = Date.now();

        while (Date.now() - start < maxWait) {

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

    async function setExternalId(userId) {

        if (!userId) {
            console.warn("⚠️ OneSignal: missing userId");
            return false;
        }

        if (lastLoggedUserId === userId) {
            return true;
        }

        try {

            const OneSignal = await waitForOneSignal();

            const subscribed = await waitForSubscription();

            if (!subscribed) {
                console.warn("⚠️ No Push Subscription yet.");
                return false;
            }

            if (OneSignal.User.externalId === userId) {
                lastLoggedUserId = userId;
                return true;
            }

            await OneSignal.login(userId);

            lastLoggedUserId = userId;

            console.log("✅ OneSignal login success");

            return true;

        } catch (err) {

            lastLoggedUserId = null;

            console.error("❌ OneSignal login failed", err);

            return false;
        }
    }

    async function logout() {

        try {

            const OneSignal = await waitForOneSignal();

            if (typeof OneSignal.logout === "function") {

                await OneSignal.logout();

                lastLoggedUserId = null;

                console.log("✅ OneSignal logout");

                return true;
            }

        } catch (e) {
            console.error(e);
        }

        return false;
    }

    async function getSubscriptionStatus() {

        try {

            const OneSignal = await waitForOneSignal();

            const push = OneSignal.User.PushSubscription;

            return {

                subscribed: !!push?.id,
                playerId: push?.id || null,
                token: push?.token || null,
                optedIn: push?.optedIn || false

            };

        } catch (e) {

            return {

                subscribed: false,
                playerId: null,
                token: null,
                optedIn: false

            };
        }

    }

    async function addListener(callback) {

        try {

            const OneSignal = await waitForOneSignal();

            OneSignal.Notifications.addEventListener(
                "foregroundWillDisplay",
                event => {

                    const notification = event.notification || event;

                    callback({

                        id: notification.id,
                        title: notification.title,
                        body: notification.body,
                        data: notification.data || {}

                    });

                }
            );

            console.log("✅ OneSignal listener added");

            return true;

        } catch (err) {

            console.error(err);

            return false;
        }

    }

    function removeAllListeners() {

        try {

            const OneSignal = window.OneSignal;

            if (
                OneSignal &&
                OneSignal.Notifications &&
                typeof OneSignal.Notifications.removeAllListeners === "function"
            ) {
                OneSignal.Notifications.removeAllListeners();
            }

        } catch (e) {}
    }

    window.OneSignalManager = {

        waitForOneSignal,
        setExternalId,
        logout,
        getSubscriptionStatus,
        addListener,
        removeAllListeners

    };

    console.log("✅ notification-onesignal.js loaded");

})();
