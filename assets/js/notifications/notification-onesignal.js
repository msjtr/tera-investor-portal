/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16 Integration
 * ============================================================
 * يعتمد على التهيئة الموجودة من onesignal-init.js
 * يستخدم OneSignal.login() لربط المستخدم بدلاً من addAlias
 * ============================================================
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

    // ─── ربط المستخدم (استخدام login بدلاً من addAlias) ───
    async function setExternalId(userId) {
        try {
            if (!userId) {
                console.warn('⚠️ OneSignal: No userId provided');
                return false;
            }

            const OneSignal = await waitForOneSignal();
            if (!OneSignal || !OneSignal.User) {
                console.warn('⚠️ OneSignal not ready');
                return false;
            }

            // ✅ الطريقة الصحيحة في SDK v16 لربط المستخدم
            await OneSignal.login(userId);
            console.log('✅ OneSignal user logged in:', userId);
            return true;
        } catch (err) {
            console.error('❌ OneSignal login error:', err);
            return false;
        }
    }

    // ─── تسجيل خروج المستخدم من OneSignal ───
    async function logout() {
        try {
            const OneSignal = await waitForOneSignal();
            if (!OneSignal || !OneSignal.User) {
                console.warn('⚠️ OneSignal not ready');
                return false;
            }

            await OneSignal.logout();
            console.log('✅ OneSignal user logged out');
            return true;
        } catch (err) {
            console.error('❌ OneSignal logout error:', err);
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
    async function addListener(callback) {
        try {
            const OneSignal = await waitForOneSignal();
            if (!OneSignal || !OneSignal.Notifications) {
                console.warn('⚠️ OneSignal Notifications not available');
                return false;
            }

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
        setExternalId,     // يستخدم OneSignal.login()
        logout,            // يستخدم OneSignal.logout()
        getSubscriptionStatus,
        addListener,
        removeAllListeners
    };

    console.log('✅ notification-onesignal.js ready (v16 compatible with login/logout)');

})();
