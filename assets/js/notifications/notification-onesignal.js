/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16 Integration
 * ============================================================
 * يعتمد على التهيئة الموجودة من onesignal-init.js
 * ولا يقوم بتهيئة جديدة
 */

(function() {
    'use strict';

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    // ─── انتظار جاهزية OneSignal ───
    function waitForOneSignal(timeout = 15000) {
        return new Promise((resolve, reject) => {
            if (window.OneSignal && window.OneSignal.User) {
                resolve(window.OneSignal);
                return;
            }

            const timer = setTimeout(() => {
                reject(new Error('OneSignal not ready after timeout'));
            }, timeout);

            const interval = setInterval(() => {
                if (window.OneSignal && window.OneSignal.User) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(window.OneSignal);
                }
            }, 300);

            document.addEventListener('onesignal:ready', () => {
                clearInterval(interval);
                clearTimeout(timer);
                if (window.OneSignal) resolve(window.OneSignal);
                else reject(new Error('OneSignal event fired but instance missing'));
            }, { once: true });
        });
    }

    // ─── ربط المستخدم (الصيغة الصحيحة لـ v16) ───
    async function setExternalId(userId) {
        try {
            const OneSignal = await waitForOneSignal();
            if (!OneSignal || !OneSignal.User) {
                console.warn('⚠️ OneSignal not ready');
                return false;
            }

            // ✅ الصيغة الصحيحة لـ addAlias في v16
            // الطريقة 1: تمرير label و id كمعاملين منفصلين
            await OneSignal.User.addAlias('external_id', userId);
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
            const OneSignal = await waitForOneSignal();
            if (!OneSignal || !OneSignal.User) {
                return { subscribed: false, error: 'OneSignal not ready' };
            }

            // ✅ v16: pushSubscription تحت User مباشرة
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

    // ─── إضافة مستمع للإشعارات (v16: addEventListener) ───
    async function addListener(callback) {
        try {
            const OneSignal = await waitForOneSignal();
            if (!OneSignal || !OneSignal.Notifications) {
                console.warn('⚠️ OneSignal Notifications not available');
                return false;
            }

            // ✅ v16: addEventListener بدلاً من addListener
            OneSignal.Notifications.addEventListener('foregroundWillDisplay', async (notification) => {
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

    // ─── إزالة المستمع ───
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
        waitForOneSignal,
        setExternalId,
        getSubscriptionStatus,
        addListener,
        removeAllListeners
    };

    console.log('✅ notification-onesignal.js ready (v16 compatible)');

})();
