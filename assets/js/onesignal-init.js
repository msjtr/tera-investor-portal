/**
 * onesignal-init.js – OneSignal Web SDK v16 مع مزامنة الاشتراك مع Supabase
 * يحفظ player_id في user_push_subscriptions عند الاشتراك (طريقة آمنة بدون upsert)
 * يُحدّث الاشتراك عند تغير المستخدم
 */
(function () {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";

    // دالة لحفظ الاشتراك في قاعدة البيانات (يدوياً، بدون upsert)
    async function saveSubscriptionToDB(userId, playerId) {
        if (!userId || !playerId) return;
        const sb = window.teraSupabase;
        if (!sb) return;

        try {
            // التحقق مما إذا كان player_id موجوداً بالفعل
            const { data: existing } = await sb
                .from('user_push_subscriptions')
                .select('id')
                .eq('player_id', playerId)
                .maybeSingle();

            if (existing) {
                // تحديث السجل الحالي
                await sb
                    .from('user_push_subscriptions')
                    .update({
                        user_id: userId,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('player_id', playerId);
            } else {
                // إدراج سجل جديد
                await sb
                    .from('user_push_subscriptions')
                    .insert({
                        user_id: userId,
                        player_id: playerId,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    });
            }
            console.log('✅ Subscription saved to DB:', playerId);
        } catch (e) {
            console.warn('⚠️ Failed to save subscription:', e);
        }
    }

    // دالة مساعدة للحصول على المستخدم الحالي
    async function getCurrentUser() {
        if (window.Auth?.getCurrentUser) return await window.Auth.getCurrentUser();
        if (window.teraSupabase) {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            return user;
        }
        return null;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function (OneSignal) {
        try {
            await OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                serviceWorkerPath: "/OneSignalSDKWorker.js",
                serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
                notifyButton: { enable: false },
                allowLocalhostAsSecureOrigin: true
            });

            window.OneSignal = OneSignal;
            console.log("✅ OneSignal Initialized");

            // انتظر حتى يصبح الاشتراك جاهزًا
            await waitForSubscription(OneSignal);

            const playerId = OneSignal.User?.PushSubscription?.id;
            if (playerId) {
                sessionStorage.setItem("onesignal_subscription_id", playerId);
                console.log("📌 Player ID:", playerId);

                // حفظ الاشتراك في قاعدة البيانات
                const user = await getCurrentUser();
                if (user?.id) {
                    await saveSubscriptionToDB(user.id, playerId);
                    try {
                        await OneSignal.login(user.id);
                        console.log("✅ OneSignal login:", user.id);
                    } catch (e) {
                        console.warn("⚠️ OneSignal login failed:", e.message);
                    }
                }
            }

            // تحديث واجهة الحالة
            updateStatusDisplay(OneSignal);

            // دوال مساعدة عامة
            window.getPlayerId = () => window.OneSignal?.User?.PushSubscription?.id || null;
            window.waitForOneSignal = () => Promise.resolve(OneSignal);
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: playerId ?? null,
                externalId: null
            });

        } catch (err) {
            console.error("❌ OneSignal Initialization Error", err);
        }
    });

    // الاستماع لتغييرات المستخدم (تحديث الاشتراك عند تغير الحساب)
    document.addEventListener('user:updated', async (e) => {
        const userId = e.detail?.id;
        if (!userId || !window.OneSignal) return;
        const playerId = window.OneSignal.User?.PushSubscription?.id;
        if (playerId) {
            await saveSubscriptionToDB(userId, playerId);
            try { await window.OneSignal.login(userId); } catch (e) {}
        }
    });

    document.addEventListener('user:loggedOut', async () => {
        if (!window.OneSignal) return;
        const playerId = window.OneSignal.User?.PushSubscription?.id;
        if (playerId) {
            const sb = window.teraSupabase;
            if (sb) {
                await sb.from('user_push_subscriptions')
                    .update({ is_active: false, updated_at: new Date().toISOString() })
                    .eq('player_id', playerId);
            }
        }
        try { await window.OneSignal.logout(); } catch (e) {}
        sessionStorage.removeItem('onesignal_subscription_id');
    });

    async function waitForSubscription(OneSignal, timeout = 10000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (OneSignal.User?.PushSubscription?.id) return;
            await new Promise(r => setTimeout(r, 500));
        }
        console.warn("⚠️ PushSubscription did not become ready in time");
    }

    function updateStatusDisplay(OneSignal) {
        const statusEl = document.getElementById("osStatusText");
        if (!statusEl) return;
        const sub = OneSignal.User?.PushSubscription;
        if (sub?.id) {
            statusEl.textContent = "مفعلة (Subscribed)";
            statusEl.className = "status-value subscribed";
            const playerIdEl = document.getElementById("osPlayerId");
            if (playerIdEl) playerIdEl.textContent = `Player ID: ${sub.id}`;
        } else {
            statusEl.textContent = "غير مشترك (Unsubscribed)";
            statusEl.className = "status-value unsubscribed";
        }
    }

    console.log("🚀 Initializing OneSignal (deferred)...");
})();
