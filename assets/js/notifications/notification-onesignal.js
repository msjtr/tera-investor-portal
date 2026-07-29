/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16 + Supabase Sync
 * ============================================================
 *
 * ✅ متوافق مع OneSignal SDK v16
 * ✅ دوال مساعدة للتعامل مع OneSignal
 * ✅ يستخدم Auth.registerPushNotifications لتسجيل المستخدم
 * ✅ لا يقوم بتهيئة مزدوجة (يترك التهيئة لـ onesignal-init.js)
 * ✅ يستمع للإشعارات الواردة
 */

(function () {
    "use strict";

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    let lastLoggedUserId = null;

    // ─── دالة موحدة للحصول على Supabase Client ───
    function getSupabaseClient() {
        if (window.teraSupabase) return window.teraSupabase;
        if (window.Support?.getSupabase) return window.Support.getSupabase();
        if (window.waitForSupabase) return window.waitForSupabase();
        if (window.supabase) return window.supabase;
        return null;
    }

    // ─── انتظار جاهزية OneSignal ───
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

    // ─── الحصول على Player ID الحالي ───
    async function getPlayerId() {
        try {
            const OneSignal = await waitForOneSignal();
            return OneSignal.User?.PushSubscription?.id || null;
        } catch {
            return null;
        }
    }

    // ─── حالة الاشتراك ───
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

    // ─── إضافة مستمع للإشعارات الواردة ───
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
            console.log("✅ [OneSignal] Listener added");
            return true;
        } catch (err) {
            console.error("❌ [OneSignal] Listener failed", err);
            return false;
        }
    }

    // ─── إزالة جميع المستمعين ───
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
        } catch (e) {
            console.warn("⚠️ [OneSignal] removeAllListeners failed", e);
        }
    }

    // ─── تسجيل الخروج من OneSignal ───
    async function logout() {
        try {
            const OneSignal = await waitForOneSignal();
            if (typeof OneSignal.logout === "function") {
                await OneSignal.logout();
                lastLoggedUserId = null;
                console.log("✅ [OneSignal] Logout");
                return true;
            }
        } catch (e) {
            console.error("❌ [OneSignal] Logout failed", e);
        }
        return false;
    }

    // ─── ربط المستخدم بـ OneSignal (باستخدام Auth) ───
    async function setExternalId(userId) {
        if (!userId) {
            console.warn("⚠️ [OneSignal] Missing userId");
            return false;
        }

        // استخدام Auth.registerPushNotifications إن وجد
        if (window.Auth && typeof window.Auth.registerPushNotifications === 'function') {
            try {
                const result = await window.Auth.registerPushNotifications(userId);
                if (result && result.success) {
                    lastLoggedUserId = userId;
                    return true;
                }
                console.warn('⚠️ [OneSignal] Auth.registerPushNotifications failed:', result?.error);
                return false;
            } catch (e) {
                console.error('❌ [OneSignal] setExternalId via Auth failed:', e);
                return false;
            }
        }

        // خطة احتياطية: استخدام OneSignal.login مباشرة (مع تجنب 409)
        try {
            const OneSignal = await waitForOneSignal();
            if (!OneSignal) {
                console.warn('⚠️ [OneSignal] OneSignal not ready');
                return false;
            }

            // التحقق من externalId الحالي
            const currentExternalId = OneSignal.User?.externalId;
            if (currentExternalId === userId) {
                console.log('ℹ️ [OneSignal] ExternalId already set:', userId);
                lastLoggedUserId = userId;
                return true;
            }

            // محاولة login
            await OneSignal.login(userId);
            console.log(`✅ [OneSignal] Login success for user: ${userId}`);
            lastLoggedUserId = userId;

            // محاولة حفظ الاشتراك في DB (باستخدام Auth إن وجد)
            if (window.Auth && typeof window.Auth.registerPushNotifications === 'function') {
                // هذا سيحدث أيضاً حفظ الاشتراك في DB، لكنه قد يكون مكرراً
                // نتركه للتأكد
                await window.Auth.registerPushNotifications(userId);
            }

            return true;
        } catch (err) {
            // معالجة 409
            if (err.message && err.message.includes('409')) {
                console.warn('⚠️ [OneSignal] 409 Conflict, assuming already registered');
                lastLoggedUserId = userId;
                return true;
            }
            console.error("❌ [OneSignal] setExternalId failed", err);
            return false;
        }
    }

    // ─── تصدير الكائن العام ───
    window.OneSignalManager = {
        waitForOneSignal,
        setExternalId,
        logout,
        getSubscriptionStatus,
        addListener,
        removeAllListeners,
        getPlayerId
    };

    console.log("✅ notification-onesignal.js loaded (using Auth for registration)");
})();
