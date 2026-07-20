/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    function waitForOneSignal(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (window.OneSignal && window.OneSignal.User) {
                resolve(window.OneSignal);
                return;
            }
            const timer = setTimeout(() => reject(new Error('OneSignal timeout')), timeout);
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
                else reject(new Error('OneSignal event fired but missing'));
            }, { once: true });
        });
    }

    async function setExternalId(userId) {
        try {
            if (!userId) return false;
            const os = await waitForOneSignal();
            if (!os || !os.User) return false;
            if (typeof os.login === 'function') {
                await os.login(userId);
                console.log('✅ OneSignal login:', userId);
                return true;
            }
            console.warn('⚠️ OneSignal.login not available');
            return false;
        } catch (err) {
            console.warn('⚠️ OneSignal login skipped:', err.message);
            return false;
        }
    }

    async function logout() {
        try {
            const os = await waitForOneSignal();
            if (!os || !os.User || typeof os.logout !== 'function') return false;
            await os.logout();
            console.log('✅ OneSignal logout');
            return true;
        } catch (err) {
            console.warn('⚠️ OneSignal logout skipped:', err.message);
            return false;
        }
    }

    async function getSubscriptionStatus() {
        try {
            const os = await waitForOneSignal();
            if (!os || !os.User) return { subscribed: false, error: 'Not ready' };
            const sub = await os.User.pushSubscription.getCurrentSubscription();
            return { subscribed: !!sub?.id, playerId: sub?.id || null };
        } catch (err) {
            return { subscribed: false, error: err.message };
        }
    }

    async function addListener(callback) {
        try {
            const os = await waitForOneSignal();
            if (!os || !os.Notifications || typeof os.Notifications.addEventListener !== 'function') {
                console.warn('⚠️ OneSignal Notifications not available');
                return false;
            }
            os.Notifications.addEventListener('foregroundWillDisplay', async (notification) => {
                const data = notification.data || notification;
                callback({
                    id: data.id || notification.id,
                    title: data.title || notification.title || 'إشعار جديد',
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
            console.error('❌ addListener error:', err);
            return false;
        }
    }

    window.OneSignalManager = {
        waitForOneSignal,
        setExternalId,
        logout,
        getSubscriptionStatus,
        addListener
    };

    console.log('✅ notification-onesignal.js ready');
})();
