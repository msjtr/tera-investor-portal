/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16 (محسّن)
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    // ─── انتظار جاهزية OneSignal مع معالجة أفضل ───
    function waitForOneSignal(timeout = 15000) {
        return new Promise((resolve, reject) => {
            // تحقق فوري إذا كان OneSignal جاهزاً
            if (window.OneSignal && window.OneSignal.User && window.OneSignal.Notifications) {
                resolve(window.OneSignal);
                return;
            }

            const timer = setTimeout(() => {
                reject(new Error('OneSignal not ready after timeout'));
            }, timeout);

            const interval = setInterval(() => {
                if (window.OneSignal && window.OneSignal.User && window.OneSignal.Notifications) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(window.OneSignal);
                }
            }, 300);

            // استماع لحدث الجاهزية من onesignal-init.js
            document.addEventListener('onesignal:ready', () => {
                clearInterval(interval);
                clearTimeout(timer);
                if (window.OneSignal) {
                    resolve(window.OneSignal);
                } else {
                    reject(new Error('OneSignal event fired but instance missing'));
                }
            }, { once: true });
        });
    }

    // ─── ربط المستخدم (مع إعادة المحاولة) ───
    async function setExternalId(userId, retries = 2) {
        try {
            if (!userId) {
                console.warn('⚠️ OneSignal: No userId provided');
                return false;
            }

            // انتظار OneSignal مع مهلة
            const OneSignal = await waitForOneSignal(15000);
            
            if (!OneSignal || !OneSignal.User) {
                console.warn('⚠️ OneSignal not ready');
                return false;
            }

            // التحقق من وجود دالة login
            if (typeof OneSignal.login !== 'function') {
                console.warn('⚠️ OneSignal.login is not a function');
                return false;
            }

            // محاولة تسجيل الدخول
            await OneSignal.login(userId);
            console.log('✅ OneSignal user logged in:', userId);
            return true;

        } catch (err) {
            console.warn(`⚠️ OneSignal login failed (${retries} retries left):`, err.message);
            if (retries > 0) {
                // إعادة المحاولة بعد تأخير
                await new Promise(r => setTimeout(r, 1000));
                return setExternalId(userId, retries - 1);
            }
            console.error('❌ OneSignal login failed after retries');
            return false;
        }
    }

    // ─── تسجيل الخروج ───
    async function logout() {
        try {
            const OneSignal = await waitForOneSignal(10000);
            if (!OneSignal || !OneSignal.User) {
                console.warn('⚠️ OneSignal not ready');
                return false;
            }

            if (typeof OneSignal.logout !== 'function') {
                console.warn('⚠️ OneSignal.logout is not a function');
                return false;
            }

            await OneSignal.logout();
            console.log('✅ OneSignal user logged out');
            return true;
        } catch (err) {
            console.warn('⚠️ OneSignal logout skipped:', err.message);
            return false;
        }
    }

    // ─── الحصول على حالة الاشتراك ───
    async function getSubscriptionStatus() {
        try {
            const OneSignal = await waitForOneSignal(10000);
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
            const OneSignal = await waitForOneSignal(15000);
            if (!OneSignal || !OneSignal.Notifications) {
                console.warn('⚠️ OneSignal Notifications not available');
                return false;
            }

            if (typeof OneSignal.Notifications.addEventListener !== 'function') {
                console.warn('⚠️ OneSignal.addEventListener is not a function');
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
            if (typeof OneSignal.Notifications.removeAllListeners === 'function') {
                OneSignal.Notifications.removeAllListeners();
                console.log('✅ OneSignal listeners removed');
            }
        } catch (err) {
            console.warn('⚠️ OneSignal removeAllListeners error:', err);
        }
    }

    // ─── API العامة ───
    window.OneSignalManager = {
        waitForOneSignal,
        setExternalId,
        logout,
        getSubscriptionStatus,
        addListener,
        removeAllListeners
    };

    console.log('✅ notification-onesignal.js ready (with retry)');
})();
