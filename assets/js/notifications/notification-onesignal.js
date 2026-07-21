/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16 (إصدار آمن ومستقر)
 * ============================================================
 * 
 * ✅ يستخدم OneSignal.login() حصرياً (بدون addAlias).
 * ✅ يمنع الاستدعاء المتكرر لنفس المستخدم.
 * ✅ ينتظر حتى يصبح OneSignal.login جاهزاً.
 * ✅ يعالج الخطأ الداخلي (Qe) بأمان.
 */

(function() {
    'use strict';

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    // متغير لتتبع آخر userId تم login به
    let lastLoggedUserId = null;

    // ─── انتظار جاهزية OneSignal (بما في ذلك login) ───
    function waitForOneSignal(timeout = 10000) {
        return new Promise((resolve, reject) => {
            // نتحقق من وجود الوظائف الأساسية المطلوبة
            if (window.OneSignal &&
                window.OneSignal.User &&
                window.OneSignal.Notifications &&
                typeof window.OneSignal.login === 'function') {
                resolve(window.OneSignal);
                return;
            }

            const timer = setTimeout(() => {
                reject(new Error('OneSignal not ready (timeout)'));
            }, timeout);

            const interval = setInterval(() => {
                if (window.OneSignal &&
                    window.OneSignal.User &&
                    window.OneSignal.Notifications &&
                    typeof window.OneSignal.login === 'function') {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(window.OneSignal);
                }
            }, 200);

            document.addEventListener('onesignal:ready', () => {
                clearInterval(interval);
                clearTimeout(timer);
                if (window.OneSignal && typeof window.OneSignal.login === 'function') {
                    resolve(window.OneSignal);
                } else {
                    reject(new Error('OneSignal event fired but login missing'));
                }
            }, { once: true });
        });
    }

    // ─── تسجيل دخول المستخدم إلى OneSignal ───
    async function setExternalId(userId) {
        if (!userId) {
            console.warn('⚠️ OneSignal: No userId provided');
            return false;
        }

        // منع تسجيل الدخول المتكرر لنفس المستخدم
        if (lastLoggedUserId === userId) {
            console.log('ℹ️ OneSignal: User already logged in, skipping login');
            return true;
        }

        try {
            const OneSignal = await waitForOneSignal(5000);
            if (!OneSignal) {
                console.warn('⚠️ OneSignal not ready');
                return false;
            }

            // ✅ استدعاء login للمستخدم الحالي
            await OneSignal.login(userId);
            lastLoggedUserId = userId;  // تخزين آخر userId
            console.log('✅ OneSignal login successful for user:', userId);
            return true;

        } catch (err) {
            console.warn('⚠️ OneSignal login failed (non-critical):', err.message);
            // إعادة تعيين المتغير إذا فشل الدخول
            lastLoggedUserId = null;
            return false;
        }
    }

    // ─── تسجيل الخروج من OneSignal (اختياري) ───
    async function logout() {
        try {
            const OneSignal = await waitForOneSignal(3000);
            if (OneSignal && typeof OneSignal.logout === 'function') {
                await OneSignal.logout();
                lastLoggedUserId = null;
                console.log('✅ OneSignal logout');
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    // ─── حالة الاشتراك ───
    async function getSubscriptionStatus() {
        try {
            const OneSignal = await waitForOneSignal(5000);
            if (!OneSignal || !OneSignal.User) return { subscribed: false };
            const sub = await OneSignal.User.pushSubscription.getCurrentSubscription();
            return {
                subscribed: !!sub?.id,
                playerId: sub?.id || null
            };
        } catch {
            return { subscribed: false };
        }
    }

    // ─── مستمع الإشعارات الأمامية ───
    async function addListener(callback) {
        try {
            const OneSignal = await waitForOneSignal(5000);
            if (!OneSignal || !OneSignal.Notifications) {
                console.warn('⚠️ OneSignal Notifications unavailable');
                return false;
            }
            if (typeof OneSignal.Notifications.addEventListener !== 'function') {
                console.warn('⚠️ addEventListener not available');
                return false;
            }
            OneSignal.Notifications.addEventListener('foregroundWillDisplay', (notification) => {
                const data = notification.data || notification;
                callback({
                    id: data.id || notification.id,
                    title: data.title || notification.title || 'إشعار',
                    body: data.body || notification.body || '',
                    type: data.type || 'general',
                    priority: data.priority || 'normal',
                    action_url: data.action_url || null,
                    is_silent: data.is_silent === true,
                    metadata: data.metadata || {}
                });
            });
            console.log('✅ OneSignal listener added');
            return true;
        } catch (err) {
            console.error('❌ OneSignal addListener error:', err);
            return false;
        }
    }

    function removeAllListeners() {
        const OneSignal = window.OneSignal;
        if (!OneSignal || !OneSignal.Notifications) return;
        try {
            if (typeof OneSignal.Notifications.removeAllListeners === 'function') {
                OneSignal.Notifications.removeAllListeners();
                console.log('✅ OneSignal listeners removed');
            }
        } catch (e) {}
    }

    // تصدير الواجهة العامة
    window.OneSignalManager = {
        waitForOneSignal,
        setExternalId,
        logout,
        getSubscriptionStatus,
        addListener,
        removeAllListeners
    };

    console.log('✅ notification-onesignal.js ready (login-based, no external_id alias)');
})();
