/**
 * onesignal-init.js – v9 (التهيئة + طلب إذن الإشعارات فعلياً)
 * - يقوم بتهيئة OneSignal SDK
 * - يحصل على Player ID ويخزنه في sessionStorage
 * - ✅ جديد: يطلب إذن الإشعارات فعلياً من المتصفح (لم يكن يُطلب أبداً سابقاً،
 *   وهذا كان السبب في عدم وصول أي إشعار push حتى لو أُرسل بنجاح من OneSignal)
 * - يتعامل مع Tracking Prevention
 * - لا يسبب أي أخطاء 409
 */

(function() {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";
    const ASKED_FLAG = 'onesignal_permission_asked';

    function isStorageAvailable() {
        try {
            sessionStorage.setItem('__test', 'test');
            sessionStorage.removeItem('__test');
            return true;
        } catch { return false; }
    }

    function showStorageWarning() {
        const el = document.getElementById('osStatusText');
        if (el) {
            el.textContent = '⚠️ التخزين محظور، يرجى تعطيل Tracking Prevention';
            el.className = 'status-value warning';
        }
    }

    async function waitForPlayerId(OneSignal, maxAttempts = 15) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const id = OneSignal.User?.PushSubscription?.id;
                if (id) return id;
            } catch {}
            await new Promise(r => setTimeout(r, 500));
        }
        return null;
    }

    // ─── ربط الجهاز بالمستخدم الحالي فور توفر Player ID ───
    // يعيد استخدام منطق الربط الموجود بالفعل في notification-onesignal.js
    // بدلاً من تكراره هنا.
    async function linkCurrentUserIfPossible() {
        try {
            const user = await window.Auth?.getCurrentUser?.();
            if (user?.id && window.OneSignalManager?.setExternalId) {
                await window.OneSignalManager.setExternalId(user.id);
            } else if (user?.id && window.Auth?.registerPushNotifications) {
                await window.Auth.registerPushNotifications(user.id);
            }
        } catch (e) {
            console.warn('⚠️ تعذر ربط الجهاز بالمستخدم بعد منح الإذن:', e);
        }
    }

    // ─── طلب إذن الإشعارات فعلياً (كانت هذه الخطوة مفقودة تماماً من الكود) ───
    // مُعرّضة على window ليتم استدعاؤها من زر "تفعيل الإشعارات" في الواجهة.
    async function requestOneSignalPermission() {
        try {
            const OneSignal = window.OneSignal;
            if (!OneSignal) return { success: false, error: 'OneSignal غير مهيأ بعد' };

            if (Notification.permission === 'denied') {
                return { success: false, error: 'الإشعارات مرفوضة من إعدادات المتصفح. يرجى تفعيلها يدوياً من إعدادات الموقع.' };
            }

            await OneSignal.Notifications.requestPermission();
            try { localStorage.setItem(ASKED_FLAG, '1'); } catch {}

            const playerId = await waitForPlayerId(OneSignal, 20);
            if (playerId) {
                sessionStorage.setItem('pending_player_id', playerId);
                updateStatusDisplay(OneSignal);
                await linkCurrentUserIfPossible();
                return { success: true, playerId };
            }
            return { success: false, error: 'لم يتم إنشاء اشتراك. تحقق من إذن الإشعارات.' };
        } catch (err) {
            console.error('❌ فشل طلب إذن الإشعارات:', err);
            return { success: false, error: err.message };
        }
    }
    window.requestOneSignalPermission = requestOneSignalPermission;

    // ─── انتظار جاهزية OneSignal (مُستخدمة من notifications.html وكانت غير معرّفة سابقاً) ───
    window.waitForOneSignal = function(timeoutMs = 5000) {
        return new Promise((resolve) => {
            if (window.OneSignal) return resolve(true);
            const start = Date.now();
            const interval = setInterval(() => {
                if (window.OneSignal || Date.now() - start > timeoutMs) {
                    clearInterval(interval);
                    resolve(!!window.OneSignal);
                }
            }, 200);
        });
    };

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function(OneSignal) {
        try {
            if (!isStorageAvailable()) showStorageWarning();

            await OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                serviceWorkerPath: "/OneSignalSDKWorker.js",
                serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
                notifyButton: { enable: false },
                allowLocalhostAsSecureOrigin: true
            });

            window.OneSignal = OneSignal;
            console.log("✅ OneSignal Initialized (no user binding)");

            // الحصول على Player ID وتخزينه لاستخدامه لاحقاً
            const playerId = await waitForPlayerId(OneSignal);
            if (playerId) {
                sessionStorage.setItem('pending_player_id', playerId);
                console.log("📌 Player ID obtained:", playerId);
            }

            // تحديث واجهة الحالة
            updateStatusDisplay(OneSignal);

            // دوال مساعدة
            window.getPlayerId = () => window.OneSignal?.User?.PushSubscription?.id || null;
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: window.getPlayerId()
            });

            // ✅ طلب الإذن تلقائياً مرة واحدة فقط لكل متصفح (لم يكن يحدث أبداً من قبل)
            // لا نكرر الطلب إذا كان مرفوضاً بالفعل أو تم السؤال سابقاً، احتراماً لتجربة المستخدم.
            let askedBefore = false;
            try { askedBefore = localStorage.getItem(ASKED_FLAG) === '1'; } catch {}
            if (!playerId && Notification.permission === 'default' && !askedBefore) {
                setTimeout(() => { requestOneSignalPermission(); }, 1200);
            }

            // مراقبة تغيير إذن الإشعارات
            if (Notification.permission === 'denied') {
                console.warn('⚠️ Notifications permission denied.');
                const el = document.getElementById('osStatusText');
                if (el) {
                    el.textContent = '🔇 الإشعارات مرفوضة';
                    el.className = 'status-value denied';
                }
            }

        } catch (err) {
            console.error("❌ OneSignal Init Error:", err);
            const el = document.getElementById('osStatusText');
            if (el) {
                el.textContent = '❌ خطأ في التهيئة';
                el.className = 'status-value error';
            }
        }
    });

    function updateStatusDisplay(OneSignal) {
        const el = document.getElementById('osStatusText');
        if (!el) return;
        try {
            const sub = OneSignal.User?.PushSubscription;
            if (sub?.id) {
                el.textContent = "✅ مفعلة (Subscribed)";
                el.className = "status-value subscribed";
                const pid = document.getElementById('osPlayerId');
                if (pid) pid.textContent = `Player ID: ${sub.id}`;
            } else if (Notification.permission === 'denied') {
                el.textContent = "🔇 مرفوضة (Denied)";
                el.className = "status-value denied";
            } else {
                el.textContent = "⏳ غير مشترك بعد (Waiting)";
                el.className = "status-value unsubscribed";
            }
        } catch {
            el.textContent = "❌ حالة غير معروفة";
            el.className = "status-value error";
        }
    }

    // Fallback للتخزين
    if (!isStorageAvailable()) {
        console.warn('⚠️ sessionStorage blocked, using memory fallback');
        window.__memoryStorage = {};
        const origSet = sessionStorage.setItem;
        const origGet = sessionStorage.getItem;
        const origRemove = sessionStorage.removeItem;
        sessionStorage.setItem = function(k, v) {
            try { origSet.call(this, k, v); } catch { window.__memoryStorage[k] = v; }
        };
        sessionStorage.getItem = function(k) {
            try { return origGet.call(this, k); } catch { return window.__memoryStorage[k] || null; }
        };
        sessionStorage.removeItem = function(k) {
            try { origRemove.call(this, k); } catch { delete window.__memoryStorage[k]; }
        };
    }

    console.log("🚀 onesignal-init.js v9 loaded (init + permission request)");
})();
