/**
 * ============================================================
 * notification-onesignal.js – OneSignal SDK v16 + Supabase Sync
 * ============================================================
 *
 * ✅ متوافق مع OneSignal SDK v16
 * ✅ ينتظر جاهزية SDK بالكامل
 * ✅ ينتظر إنشاء Push Subscription قبل login
 * ✅ يمنع login المتكرر
 * ✅ يستخدم User.PushSubscription الصحيحة
 * ✅ يحفظ الاشتراك في Supabase تلقائياً (مع withAuth لتجنب 403)
 */

(function () {
    "use strict";

    if (window.__notificationOneSignal) return;
    window.__notificationOneSignal = true;

    let lastLoggedUserId = null;
    let supabaseClient = null;

    // ─── دوال مساعدة ───
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ─── الحصول على Supabase Client ───
    function getSupabase() {
        if (supabaseClient) return supabaseClient;
        if (window.teraSupabase) return window.teraSupabase;
        if (window.Support?.getSupabase) return window.Support.getSupabase();
        return null;
    }

    // ─── دالة withAuth (نسخة مستقلة) ───
    async function withAuth(callback) {
        const sb = getSupabase();
        if (!sb) {
            console.warn('⚠️ [OneSignal] Supabase client not available');
            return null;
        }
        try {
            const { data: { session }, error } = await sb.auth.getSession();
            if (error || !session) {
                console.log('⏳ [OneSignal] No active session, skipping DB save');
                return null;
            }
            return await callback(session);
        } catch (e) {
            console.warn('⚠️ [OneSignal] withAuth error:', e.message);
            return null;
        }
    }

    // ─── حفظ الاشتراك في قاعدة البيانات ───
    async function saveSubscriptionToDB(playerId) {
        if (!playerId) {
            console.warn('⚠️ [OneSignal] Cannot save: missing playerId');
            return false;
        }

        const result = await withAuth(async (session) => {
            const sb = getSupabase();
            if (!sb) return false;

            const { error } = await sb
                .from('user_push_subscriptions')
                .upsert(
                    {
                        user_id: session.user.id,
                        player_id: playerId,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    },
                    {
                        onConflict: 'player_id',
                        ignoreDuplicates: false
                    }
                );

            if (error) {
                console.error('❌ [OneSignal] Failed to save subscription:', error);
                return false;
            }
            return true;
        });

        if (result === null) {
            // المستخدم غير مسجل → تأجيل الحفظ
            sessionStorage.setItem('pending_player_id', playerId);
            console.log(`⏳ [OneSignal] Deferred save for playerId: ${playerId}`);
            return false;
        }

        if (result === true) {
            console.log(`✅ [OneSignal] Subscription saved to DB: ${playerId}`);
            sessionStorage.removeItem('pending_player_id');
            return true;
        }

        return false;
    }

    // ─── محاولة حفظ الاشتراك المعلق ───
    async function savePendingSubscription() {
        const pendingPlayerId = sessionStorage.getItem('pending_player_id');
        if (!pendingPlayerId) return;
        await saveSubscriptionToDB(pendingPlayerId);
    }

    // ─── الانتظار حتى جاهزية OneSignal ───
    async function waitForOneSignal(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (
                window.OneSignal &&
                window.OneSignal.User &&
                window.OneSignal.Notifications &&
                typeof window.OneSignal.login === "function"
            ) {
                return resolve(window.OneSignal);
            }

            const timer = setTimeout(() => {
                clearInterval(interval);
                reject(new Error("OneSignal timeout"));
            }, timeout);

            const interval = setInterval(() => {
                if (
                    window.OneSignal &&
                    window.OneSignal.User &&
                    window.OneSignal.Notifications &&
                    typeof window.OneSignal.login === "function"
                ) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(window.OneSignal);
                }
            }, 200);
        });
    }

    // ─── الانتظار حتى جاهزية الاشتراك ───
    async function waitForSubscription(maxWait = 10000) {
        const OneSignal = await waitForOneSignal();
        const start = Date.now();
        while (Date.now() - start < maxWait) {
            try {
                if (
                    OneSignal.User &&
                    OneSignal.User.PushSubscription &&
                    OneSignal.User.PushSubscription.id
                ) {
                    return true;
                }
            } catch (e) {}
            await sleep(500);
        }
        return false;
    }

    // ─── تعيين External ID للمستخدم + حفظ الاشتراك ───
    async function setExternalId(userId) {
        if (!userId) {
            console.warn("⚠️ [OneSignal] Missing userId");
            return false;
        }

        if (lastLoggedUserId === userId) {
            // نفس المستخدم، نحاول حفظ الاشتراك فقط (قد يكون player_id تغير)
            const playerId = await getPlayerId();
            if (playerId) {
                await saveSubscriptionToDB(playerId);
            }
            return true;
        }

        try {
            const OneSignal = await waitForOneSignal();
            const subscribed = await waitForSubscription();

            if (!subscribed) {
                console.warn("⚠️ [OneSignal] No Push Subscription yet.");
                // نخزّن userId لحين توفر الاشتراك
                sessionStorage.setItem('onesignal_pending_user', userId);
                return false;
            }

            const playerId = OneSignal.User.PushSubscription.id;

            // ربط المستخدم بـ OneSignal
            if (OneSignal.User.externalId !== userId) {
                await OneSignal.login(userId);
                console.log(`✅ [OneSignal] Login success for user: ${userId}`);
            }

            lastLoggedUserId = userId;

            // حفظ الاشتراك في قاعدة البيانات
            await saveSubscriptionToDB(playerId);

            // محاولة حفظ أي اشتراك معلق
            await savePendingSubscription();

            return true;

        } catch (err) {
            lastLoggedUserId = null;
            console.error("❌ [OneSignal] setExternalId failed", err);
            return false;
        }
    }

    // ─── الحصول على Player ID الحالي ───
    async function getPlayerId() {
        try {
            const OneSignal = await waitForOneSignal();
            return OneSignal.User?.PushSubscription?.id || null;
        } catch {
            return null;
        }
    }

    // ─── تسجيل الخروج ───
    async function logout() {
        try {
            const OneSignal = await waitForOneSignal();
            if (typeof OneSignal.logout === "function") {
                await OneSignal.logout();
                lastLoggedUserId = null;
                console.log("✅ [OneSignal] Logout");
                return true;
            }
        } catch (e) {
            console.error("❌ [OneSignal] Logout failed", e);
        }
        return false;
    }

    // ─── الحصول على حالة الاشتراك ───
    async function getSubscriptionStatus() {
        try {
            const OneSignal = await waitForOneSignal();
            const push = OneSignal.User.PushSubscription;
            return {
                subscribed: !!push?.id,
                playerId: push?.id || null,
                token: push?.token || null,
                optedIn: push?.optedIn || false
            };
        } catch (e) {
            return {
                subscribed: false,
                playerId: null,
                token: null,
                optedIn: false
            };
        }
    }

    // ─── إضافة مستمع للإشعارات الواردة ───
    async function addListener(callback) {
        try {
            const OneSignal = await waitForOneSignal();
            OneSignal.Notifications.addEventListener(
                "foregroundWillDisplay",
                event => {
                    const notification = event.notification || event;
                    callback({
                        id: notification.id,
                        title: notification.title,
                        body: notification.body,
                        data: notification.data || {}
                    });
                }
            );
            console.log("✅ [OneSignal] Listener added");
            return true;
        } catch (err) {
            console.error("❌ [OneSignal] Listener failed", err);
            return false;
        }
    }

    // ─── إزالة جميع المستمعين ───
    function removeAllListeners() {
        try {
            const OneSignal = window.OneSignal;
            if (
                OneSignal &&
                OneSignal.Notifications &&
                typeof OneSignal.Notifications.removeAllListeners === "function"
            ) {
                OneSignal.Notifications.removeAllListeners();
            }
        } catch (e) {
            console.warn("⚠️ [OneSignal] removeAllListeners failed", e);
        }
    }

    // ─── الاستماع لتغيرات المصادقة في Supabase ───
    function setupAuthListener() {
        const sb = getSupabase();
        if (!sb) return;

        sb.auth.onAuthStateChange(async (event, session) => {
            console.log(`🔐 [OneSignal] Auth event: ${event}`);

            if (event === 'SIGNED_IN' && session) {
                // محاولة ربط المستخدم وحفظ الاشتراك
                const playerId = await getPlayerId();
                if (playerId) {
                    await saveSubscriptionToDB(playerId);
                }
                // محاولة حفظ أي اشتراك معلق
                await savePendingSubscription();
            }

            if (event === 'SIGNED_OUT') {
                // تحديث الاشتراك في DB إلى غير نشط (اختياري)
                const playerId = await getPlayerId();
                if (playerId) {
                    await withAuth(async (session) => {
                        const sb2 = getSupabase();
                        if (!sb2) return;
                        await sb2
                            .from('user_push_subscriptions')
                            .update({
                                is_active: false,
                                updated_at: new Date().toISOString()
                            })
                            .eq('player_id', playerId);
                    });
                }
                lastLoggedUserId = null;
            }
        });

        console.log('✅ [OneSignal] Auth listener ready');
    }

    // ─── التهيئة التلقائية ───
    function init() {
        // تعيين Supabase client
        supabaseClient = getSupabase();

        // إضافة مستمع المصادقة
        setupAuthListener();

        // محاولة حفظ الاشتراك المعلق عند التحميل
        setTimeout(async () => {
            const pendingPlayerId = sessionStorage.getItem('pending_player_id');
            if (pendingPlayerId) {
                await saveSubscriptionToDB(pendingPlayerId);
            }

            // إذا كان هناك userId معلق من OneSignal
            const pendingUser = sessionStorage.getItem('onesignal_pending_user');
            if (pendingUser) {
                const playerId = await getPlayerId();
                if (playerId) {
                    await setExternalId(pendingUser);
                    sessionStorage.removeItem('onesignal_pending_user');
                }
            }
        }, 3000);

        console.log('✅ [OneSignal] Manager initialized with Supabase sync');
    }

    // ─── تصدير الكائن العام ───
    window.OneSignalManager = {
        waitForOneSignal,
        setExternalId,
        logout,
        getSubscriptionStatus,
        addListener,
        removeAllListeners,
        getPlayerId,
        saveSubscriptionToDB,
        savePendingSubscription,
        init
    };

    // بدء التهيئة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log("✅ notification-onesignal.js loaded (with Supabase sync)");
})();
