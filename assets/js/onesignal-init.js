/**
 * onesignal-init.js – النسخة المحسّنة v3
 * - تدعم OneSignal SDK v16
 * - تمنع التكرار عبر sessionStorage
 * - تتعامل مع 409 Conflict بهدوء
 * - تتحقق من externalId الحالي قبل login
 */

(function() {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";
    const STORAGE_KEY = "onesignal_registered";
    const PENDING_PLAYER_KEY = "pending_player_id";

    // ─── دوال مساعدة ───
    function getSupabaseClient() {
        if (window.teraSupabase) return window.teraSupabase;
        if (window.Support?.getSupabase) return window.Support.getSupabase();
        if (window.waitForSupabase) return window.waitForSupabase();
        return null;
    }

    // ─── الحصول على المستخدم الحالي ───
    async function getCurrentUser() {
        const sb = getSupabaseClient();
        if (!sb) return null;
        try {
            const { data: { user } } = await sb.auth.getUser();
            return user;
        } catch {
            return null;
        }
    }

    // ─── حفظ الاشتراك في قاعدة البيانات ───
    async function saveSubscriptionToDB(userId, playerId) {
        if (!userId || !playerId) return;
        const sb = getSupabaseClient();
        if (!sb) return;

        try {
            const { error } = await sb
                .from('user_push_subscriptions')
                .upsert({
                    user_id: userId,
                    player_id: playerId,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'player_id' });

            if (error) {
                console.warn('⚠️ Failed to save subscription:', error);
            } else {
                console.log('✅ Subscription saved to DB');
                sessionStorage.setItem(STORAGE_KEY, userId);
            }
        } catch (e) {
            console.warn('⚠️ Error saving subscription:', e);
        }
    }

    // ─── تسجيل OneSignal للمستخدم ───
    async function registerUser(userId, playerId) {
        if (!userId || !playerId) return false;

        // منع التكرار لنفس المستخدم
        const registeredUserId = sessionStorage.getItem(STORAGE_KEY);
        if (registeredUserId === userId) {
            console.log('ℹ️ OneSignal already registered for this user in this session');
            return true;
        }

        try {
            // التحقق من externalId الحالي
            let currentExternalId = null;
            if (window.OneSignal && window.OneSignal.User) {
                try {
                    currentExternalId = window.OneSignal.User.externalId || null;
                } catch (e) { /* ignore */ }
            }

            // إذا كان نفس المعرف، نعتبره مسجلاً
            if (currentExternalId === userId) {
                console.log('ℹ️ OneSignal already has externalId:', userId);
                sessionStorage.setItem(STORAGE_KEY, userId);
                await saveSubscriptionToDB(userId, playerId);
                return true;
            }

            // محاولة login
            if (window.OneSignal && typeof window.OneSignal.login === 'function') {
                try {
                    await window.OneSignal.login(userId);
                    console.log('✅ OneSignal login success:', userId);
                    sessionStorage.setItem(STORAGE_KEY, userId);
                    await saveSubscriptionToDB(userId, playerId);
                    return true;
                } catch (e) {
                    // إذا كان الخطأ 409، فهذا يعني أن المستخدم مرتبط بـ externalId آخر
                    if (e.message?.includes('409') || e.status === 409) {
                        console.warn('⚠️ OneSignal 409 Conflict – user likely already exists');
                        // نتحقق من externalId مرة أخرى بعد الفشل
                        try {
                            const newExternalId = window.OneSignal?.User?.externalId || null;
                            if (newExternalId === userId) {
                                console.log('✅ ExternalId resolved after 409, treating as success');
                                sessionStorage.setItem(STORAGE_KEY, userId);
                                await saveSubscriptionToDB(userId, playerId);
                                return true;
                            }
                        } catch (ex) { /* ignore */ }
                        // نعتبره ناجحاً بشكل ضمني لأن 409 يعني أن المستخدم موجود
                        sessionStorage.setItem(STORAGE_KEY, userId);
                        await saveSubscriptionToDB(userId, playerId);
                        return true;
                    }
                    throw e;
                }
            }
            return false;
        } catch (e) {
            console.error('❌ OneSignal registration failed:', e);
            return false;
        }
    }

    // ─── التهيئة الرئيسية ───
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function(OneSignal) {
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

            // الانتظار قليلاً حتى يتشكل الاشتراك
            let playerId = null;
            for (let i = 0; i < 10; i++) {
                try {
                    playerId = OneSignal.User?.PushSubscription?.id || null;
                    if (playerId) break;
                } catch (e) {}
                await new Promise(r => setTimeout(r, 500));
            }

            if (playerId) {
                sessionStorage.setItem(PENDING_PLAYER_KEY, playerId);
                console.log("📌 Player ID:", playerId);

                // محاولة ربط المستخدم الحالي
                const user = await getCurrentUser();
                if (user?.id) {
                    await registerUser(user.id, playerId);
                } else {
                    console.log('⏳ No user logged in, will register later');
                }
            } else {
                console.warn('⚠️ No Player ID found after init');
            }

            // الاستماع لتغيير المستخدم
            document.addEventListener('user:updated', async (e) => {
                const userId = e.detail?.id;
                if (!userId) return;
                const playerId2 = sessionStorage.getItem(PENDING_PLAYER_KEY);
                if (playerId2) {
                    await registerUser(userId, playerId2);
                }
            });

            // الاستماع لتسجيل الخروج
            document.addEventListener('user:loggedOut', async () => {
                sessionStorage.removeItem(STORAGE_KEY);
                try {
                    if (window.OneSignal && typeof window.OneSignal.logout === 'function') {
                        await window.OneSignal.logout();
                    }
                } catch (e) { /* ignore */ }
                sessionStorage.removeItem(PENDING_PLAYER_KEY);
            });

            // محاولة ربط المستخدم المعلق إذا كان هناك
            const pendingUser = sessionStorage.getItem('onesignal_pending_user');
            if (pendingUser && playerId) {
                await registerUser(pendingUser, playerId);
                sessionStorage.removeItem('onesignal_pending_user');
            }

            // تحديث واجهة الحالة
            updateStatusDisplay(OneSignal);

            // دوال مساعدة
            window.getPlayerId = () => playerId || OneSignal.User?.PushSubscription?.id || null;
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: playerId ?? null
            });

        } catch (err) {
            console.error("❌ OneSignal Initialization Error", err);
        }
    });

    function updateStatusDisplay(OneSignal) {
        const statusEl = document.getElementById("osStatusText");
        if (!statusEl) return;
        try {
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
        } catch (e) {
            statusEl.textContent = "حالة غير معروفة";
            statusEl.className = "status-value";
        }
    }

    console.log("🚀 onesignal-init.js v3 loaded");
})();
