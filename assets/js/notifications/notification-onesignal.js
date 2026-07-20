/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16 (نسخة آمنة)
 * ============================================================
 * لا تتوقف على نجاح login، وإذا فشل نستمر بدون خطأ
 */

(function() {
    'use strict';

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    // ─── انتظار جاهزية OneSignal ───
    function waitForOneSignal(timeout = 10000) {
        return new Promise((resolve, reject) => {
            // تحقق فوري
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

            document.addEventListener('onesignal:ready', () => {
                clearInterval(interval);
                clearTimeout(timer);
                if (window.OneSignal) resolve(window.OneSignal);
                else reject(new Error('OneSignal event fired but missing'));
            }, { once: true });
        });
    }

    // ─── ربط المستخدم – استخدم login أو addAlias ───
    async function setExternalId(userId) {
        try {
            if (!userId) {
                console.warn('⚠️ OneSignal: No userId provided');
                return false;
            }

            // ننتظر OneSignal مع مهلة قصيرة (5 ثوان) لتجنب التأخير
            let OneSignal;
            try {
                OneSignal = await waitForOneSignal(5000);
            } catch (e) {
                console.warn('⏳ OneSignal not ready, skipping login');
                return false;
            }

            if (!OneSignal || !OneSignal.User) {
                console.warn('⚠️ OneSignal User not available');
                return false;
            }

            // محاولة تسجيل الدخول باستخدام OneSignal.login (الطريقة الرسمية في v16)
            if (typeof OneSignal.login === 'function') {
                try {
                    await OneSignal.login(userId);
                    console.log('✅ OneSignal user logged in:', userId);
                    return true;
                } catch (loginErr) {
                    console.warn('⚠️ OneSignal.login failed, trying addAlias...', loginErr.message);
                    // إذا فشل login، نحاول addAlias كحل احتياطي
                    if (typeof OneSignal.User.addAlias === 'function') {
                        await OneSignal.User.addAlias({ label: 'external_id', id: userId });
                        console.log('✅ OneSignal external_id set via addAlias');
                        return true;
                    }
                    throw loginErr;
                }
            } else if (typeof OneSignal.User.addAlias === 'function') {
                // إذا login غير موجود، استخدم addAlias
                await OneSignal.User.addAlias({ label: 'external_id', id: userId });
                console.log('✅ OneSignal external_id set via addAlias');
                return true;
            } else {
                console.warn('⚠️ OneSignal login and addAlias not available');
                return false;
            }
        } catch (err) {
            console.warn('⚠️ OneSignal user linking failed (non-critical):', err.message);
            return false;
        }
    }

    // ─── تسجيل الخروج ───
    async function logout() {
        try {
            const OneSignal = await waitForOneSignal(3000);
            if (!OneSignal || !OneSignal.User) return false;
            if (typeof OneSignal.logout === 'function') {
                await OneSignal.logout();
                console.log('✅ OneSignal user logged out');
                return true;
            }
            return false;
        } catch (err) {
            console.warn('⚠️ OneSignal logout skipped:', err.message);
            return false;
        }
    }

    // ─── الحصول على حالة الاشتراك ───
    async function getSubscriptionStatus() {
        try {
            const OneSignal = await waitForOneSignal(5000);
            if (!OneSignal || !OneSignal.User) {
                return { subscribed: false, error: 'Not ready' };
            }
            const subscription = await OneSignal.User.pushSubscription.getCurrentSubscription();
            return {
                subscribed: !!subscription?.id,
                playerId: subscription?.id || null
            };
        } catch (err) {
            return { subscribed: false, error: err.message };
        }
    }

    // ─── إضافة مستمع ───
    async function addListener(callback) {
        try {
            const OneSignal = await waitForOneSignal(5000);
            if (!OneSignal || !OneSignal.Notifications) {
                console.warn('⚠️ OneSignal Notifications not available');
                return false;
            }
            if (typeof OneSignal.Notifications.addEventListener !== 'function') {
                console.warn('⚠️ OneSignal.addEventListener not available');
                return false;
            }
            OneSignal.Notifications.addEventListener('foregroundWillDisplay', async (notification) => {
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

    console.log('✅ notification-onesignal.js ready (safe)');
})();
