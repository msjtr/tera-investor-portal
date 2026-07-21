/**
 * onesignal-init.js - تهيئة OneSignal SDK v16 (مبسطة ومضمونة)
 */
(async function() {
    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";

    try {
        await window.OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            serviceWorkerPath: "/OneSignalSDKWorker.js",
            serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: true
        });

        window.OneSignal = window.OneSignal; // ليس ضرورياً لكن للتأكيد
        console.log('✅ OneSignal Initialized');

        // محاولة تسجيل الدخول للمستخدم الحالي إذا وُجد
        const user = window.Auth?.getCurrentUser ? await window.Auth.getCurrentUser() : null;
        if (user?.id) {
            await window.OneSignal.login(user.id);
            console.log('✅ OneSignal login:', user.id);
        }

        // تحديث واجهة الحالة بعد التهيئة
        updateStatusDisplay();

        // استماع للتغييرات اللاحقة
        document.addEventListener('user:updated', async (e) => {
            if (e.detail?.id) await window.OneSignal.login(e.detail.id);
        });

        document.addEventListener('user:loggedOut', async () => {
            await window.OneSignal.logout();
        });

    } catch (e) {
        console.error('❌ OneSignal init error:', e);
    }

    function updateStatusDisplay() {
        const statusEl = document.getElementById('osStatusText');
        if (!statusEl) return;
        const sub = window.OneSignal?.User?.PushSubscription;
        if (sub?.id) {
            statusEl.textContent = 'مفعلة (Subscribed)';
            statusEl.className = 'status-value subscribed';
            const playerIdEl = document.getElementById('osPlayerId');
            if (playerIdEl) playerIdEl.textContent = `Player ID: ${sub.id}`;
        } else {
            statusEl.textContent = 'غير مشترك (Unsubscribed)';
            statusEl.className = 'status-value unsubscribed';
        }
    }

    window.getOneSignalStatus = () => ({
        initialized: true,
        permission: Notification.permission,
        optedIn: window.OneSignal?.User?.PushSubscription?.optedIn ?? false,
        subscriptionId: window.OneSignal?.User?.PushSubscription?.id ?? null,
        externalId: null
    });
})();
