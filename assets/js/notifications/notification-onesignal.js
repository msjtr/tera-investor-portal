/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16
 * ============================================================
 * متوافق بالكامل مع OneSignal Web SDK v16
 */

(function() {
    'use strict';

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    const ONE_SIGNAL_CONFIG = {
        appId: "512d9b65-ec50-41a5-ac12-059a83441a72",
        serviceWorkerPath: "/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/" },
        notifyButton: { enable: false }
    };

    // ─── تهيئة OneSignal ───
    async function initOneSignal() {
        try {
            const OneSignal = await new Promise((resolve, reject) => {
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                window.OneSignalDeferred.push(async (OS) => {
                    try {
                        await OS.init(ONE_SIGNAL_CONFIG);
                        window.OneSignal = OS;
                        resolve(OS);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            console.log('✅ OneSignal initialized');
            return OneSignal;
        } catch (err) {
            console.error('❌ OneSignal initialization failed:', err);
            return null;
        }
    }

    // ─── ربط المستخدم ───
    async function setExternalId(userId) {
        try {
            const OneSignal = window.OneSignal;
            if (!OneSignal || !OneSignal.User) {
                console.warn('⚠️ OneSignal not ready');
                return false;
            }

            // ✅ الصيغة الصحيحة لـ addAlias في v16
            await OneSignal.User.addAlias({ label: 'external_id', id: userId });
            console.log('✅ OneSignal External ID set:', userId);
            return true;
        } catch (err) {
            console.error('❌ OneSignal setExternalId error:', err);
            return false;
        }
    }

    // ─── الحصول على حالة الاشتراك ───
    async function getSubscriptionStatus() {
        try {
            const OneSignal = window.OneSignal;
            if (!OneSignal || !OneSignal.User || !OneSignal.User.pushSubscription) {
                return { subscribed: false, error: 'OneSignal not ready' };
            }

            const subscription = await OneSignal.User.pushSubscription.getCurrentSubscription();
            return {
                subscribed: !!subscription?.id,
                playerId: subscription?.id || null
            };
        } catch (err) {
            console.error('❌ OneSignal subscription error:', err);
            return { subscribed: false, error: err.message };
        }
    }

    // ─── إضافة مستمع للإشعارات الواردة ───
    function addListener(callback) {
        const OneSignal = window.OneSignal;
        if (!OneSignal || !OneSignal.Notifications) {
            console.warn('⚠️ OneSignal Notifications not available');
            return false;
        }

        try {
            OneSignal.Notifications.addListener('foregroundWillDisplay', async (notification) => {
                const data = notification.data || notification;
                const payload = {
                    id: data.id || notification.id,
                    title: data.title || notification.title || 'إشعار جديد',
                    body: data.body || notification.body || '',
                    type: data.type || 'general',
                    priority: data.priority || 'normal',
                    action_url: data.action_url || null,
                    is_silent: data.is_silent === true,
                    metadata: data.metadata || {}
                };
                callback(payload);
            });
            console.log('✅ OneSignal listener added');
            return true;
        } catch (err) {
            console.error('❌ OneSignal addListener error:', err);
            return false;
        }
    }

    // ─── إزالة مستمع ───
    function removeAllListeners() {
        const OneSignal = window.OneSignal;
        if (!OneSignal || !OneSignal.Notifications) return;
        try {
            OneSignal.Notifications.removeAllListeners();
            console.log('✅ OneSignal listeners removed');
        } catch (err) {
            console.warn('⚠️ OneSignal removeAllListeners error:', err);
        }
    }

    // ─── API العامة ───
    window.OneSignalManager = {
        init: initOneSignal,
        setExternalId,
        getSubscriptionStatus,
        addListener,
        removeAllListeners,
        config: ONE_SIGNAL_CONFIG
    };

    console.log('✅ notification-onesignal.js ready');

})();
