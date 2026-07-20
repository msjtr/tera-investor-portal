/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16 (إصلاح external_id)
 * ============================================================
 * 
 * التغيير:
 * - تم استبدال OneSignal.User.addAlias بـ OneSignal.login(userId)
 * - إزالة أي استخدام لـ "external_id" يدوياً، لأنه أصبح محجوزاً في SDK v16
 * - OneSignal.login() يتولى ربط المستخدم تلقائياً
 */

(function() {
    'use strict';

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    // ─── انتظار جاهزية OneSignal ───
    function waitForOneSignal(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (window.OneSignal && window.OneSignal.User && window.OneSignal.Notifications) {
                resolve(window.OneSignal);
                return;
            }

            const timer = setTimeout(() => {
                reject(new Error('OneSignal not ready'));
            }, timeout);

            const interval = setInterval(() => {
                if (window.OneSignal && window.OneSignal.User && window.OneSignal.Notifications) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(window.OneSignal);
                }
            }, 200);

            document.addEventListener('onesignal:ready', () => {
                clearInterval(interval);
                clearTimeout(timer);
                if (window.OneSignal) resolve(window.OneSignal);
                else reject(new Error('OneSignal event fired but missing'));
            }, { once: true });
        });
    }

    // ─── ربط المستخدم (باستخدام OneSignal.login) ───
    async function setExternalId(userId) {
        if (!userId) {
            console.warn('⚠️ OneSignal: No userId');
            return false;
        }

        try {
            const OneSignal = await waitForOneSignal(5000);
            if (!OneSignal) {
                console.warn('⚠️ OneSignal not ready, skipping login');
                return false;
            }

            // ✅ استخدام OneSignal.login بدلاً من addAlias
            if (typeof OneSignal.login === 'function') {
                await OneSignal.login(userId);
                console.log('✅ OneSignal login successful for user:', userId);
                return true;
            } else {
                console.warn('⚠️ OneSignal.login not available');
                return false;
            }
        } catch (err) {
            console.warn('⚠️ OneSignal login failed (non-critical):', err.message);
            return false;
        }
    }

    // ─── تسجيل الخروج ───
    async function logout() {
        try {
            const OneSignal = await waitForOneSignal(3000);
            if (OneSignal && typeof OneSignal.logout === 'function') {
                await OneSignal.logout();
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

    // ─── مستمع الإشعارات ───
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

    window.OneSignalManager = {
        waitForOneSignal,
        setExternalId,
        logout,
        getSubscriptionStatus,
        addListener,
        removeAllListeners
    };

    console.log('✅ notification-onesignal.js ready (using OneSignal.login)');
})();
