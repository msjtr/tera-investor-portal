/**
 * onesignal-init.js – تهيئة OneSignal SDK v16 مع مزامنة Supabase
 * تم إصلاح: التعامل مع 409 Conflict، إضافة الإشعارات إلى قاعدة البيانات، تحديث الواجهة
 */
(function() {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";

    // ─── دوال مساعدة ───
    function getSupabaseClient() {
        if (window.teraSupabase) return window.teraSupabase;
        if (window.Support?.getSupabase) return window.Support.getSupabase();
        if (window.supabase) return window.supabase;
        return null;
    }

    async function withAuth(callback) {
        const sb = getSupabaseClient();
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

    // ─── حفظ الإشعار في قاعدة البيانات ───
    async function saveNotificationToDB(notification) {
        const user = await getCurrentUser();
        if (!user) {
            console.warn('⚠️ [OneSignal] Cannot save notification: user not logged in');
            return null;
        }

        return withAuth(async (session) => {
            const sb = getSupabaseClient();
            if (!sb) throw new Error('Supabase client not available');

            // التحقق من وجود الإشعار مسبقاً (لتجنب التكرار)
            const { data: existing } = await sb
                .from('notifications')
                .select('id')
                .eq('id', notification.id || notification.notificationId)
                .maybeSingle();

            if (existing) {
                console.log('ℹ️ [OneSignal] Notification already exists in DB:', existing.id);
                return existing;
            }

            // حفظ الإشعار
            const { data, error } = await sb
                .from('notifications')
                .insert({
                    id: notification.id || notification.notificationId,
                    user_id: session.user.id,
                    title: notification.title || 'إشعار جديد',
                    body: notification.body || '',
                    type: notification.data?.type || 'system',
                    priority: notification.data?.priority || 'normal',
                    status: 'unread',
                    is_read: false,
                    data: notification.data || {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('❌ [OneSignal] Failed to save notification:', error);
                throw error;
            }

            console.log('✅ [OneSignal] Notification saved to DB:', data.id);
            return data;
        });
    }

    // ─── تحديث الواجهة بعد استلام إشعار ───
    function updateUI(notification) {
        try {
            // إضافة إلى NotificationCache
            if (window.NotificationCache && typeof window.NotificationCache.add === 'function') {
                window.NotificationCache.add(notification);
                console.log('✅ [OneSignal] Notification added to cache');
            }

            // إضافة إلى NotificationManager
            if (window.NotificationManager && typeof window.NotificationManager.addNotification === 'function') {
                window.NotificationManager.addNotification(notification);
                console.log('✅ [OneSignal] Notification added to manager');
            }

            // تحديث UI
            if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                window.NotificationUI.refresh();
                console.log('✅ [OneSignal] UI refreshed');
            }

            // تحديث الإحصائيات
            if (window.NotificationUI && typeof window.NotificationUI.updateStats === 'function') {
                const cache = window.NotificationCache;
                if (cache && typeof cache.getStats === 'function') {
                    window.NotificationUI.updateStats(cache.getStats());
                }
            }

            // إظهار Toast
            if (window.NotificationService && typeof window.NotificationService._showToast === 'function') {
                window.NotificationService._showToast(notification);
            }

            // إطلاق حدث مخصص
            document.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));

        } catch (e) {
            console.warn('⚠️ [OneSignal] UI update failed:', e);
        }
    }

    // ─── معالج الإشعارات الواردة ───
    async function handleIncomingNotification(notification) {
        console.log('📨 [OneSignal] Received notification:', notification);

        try {
            // حفظ في قاعدة البيانات
            const saved = await saveNotificationToDB(notification);
            if (saved) {
                // تحديث الواجهة
                updateUI(saved);
            } else {
                // إذا لم يُحفظ، نعرضه مباشرة من بيانات OneSignal
                updateUI({
                    id: notification.id || notification.notificationId || Date.now().toString(),
                    title: notification.title || 'إشعار جديد',
                    body: notification.body || '',
                    type: notification.data?.type || 'system',
                    is_read: false,
                    created_at: new Date().toISOString(),
                    data: notification.data || {}
                });
            }
        } catch (e) {
            console.error('❌ [OneSignal] Error handling notification:', e);
        }
    }

    // ─── تهيئة OneSignal ───
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
            console.log("✅ OneSignal initialized");

            // ─── انتظار الاشتراك ───
            await waitForSubscription(OneSignal, 10000);

            const playerId = OneSignal.User?.PushSubscription?.id;
            if (playerId) {
                sessionStorage.setItem('onesignal_subscription_id', playerId);
                console.log("📌 Player ID:", playerId);

                // ربط المستخدم
                const user = await getCurrentUser();
                if (user?.id) {
                    try {
                        // محاولة ربط المستخدم (مع تجنب 409 Conflict)
                        if (OneSignal.User.externalId !== user.id) {
                            await OneSignal.login(user.id);
                            console.log("✅ OneSignal login:", user.id);
                        }
                    } catch (e) {
                        if (e.status === 409 || e.message?.includes('409') || e.message?.includes('Conflict')) {
                            console.log('ℹ️ OneSignal user already linked (409 Conflict ignored)');
                        } else {
                            console.warn('⚠️ OneSignal login failed:', e.message);
                        }
                    }
                }
            }

            // ─── الاستماع للإشعارات الواردة ───
            OneSignal.Notifications.addEventListener(
                "foregroundWillDisplay",
                (event) => {
                    const notification = event.notification || event;
                    handleIncomingNotification(notification);
                }
            );

            // ─── الاستماع للإشعارات التي تم النقر عليها ───
            OneSignal.Notifications.addEventListener(
                "click",
                (event) => {
                    const notification = event.notification || event;
                    console.log('🔗 OneSignal notification clicked:', notification);
                    if (notification.launchUrl) {
                        window.open(notification.launchUrl, '_blank');
                    }
                }
            );

            // ─── دوال مساعدة عامة ───
            window.getPlayerId = () => OneSignal.User?.PushSubscription?.id || null;
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: playerId ?? null
            });

            console.log("✅ OneSignal event listeners ready");

        } catch (err) {
            console.error("❌ OneSignal initialization error:", err);
        }
    });

    // ─── الانتظار حتى جاهزية الاشتراك ───
    async function waitForSubscription(OneSignal, timeout = 10000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (OneSignal.User?.PushSubscription?.id) return;
            await new Promise(r => setTimeout(r, 300));
        }
        console.warn("⚠️ PushSubscription did not become ready in time");
    }

    // ─── الاستماع لتغييرات المصادقة ───
    document.addEventListener('user:updated', async (e) => {
        const userId = e.detail?.id;
        if (!userId || !window.OneSignal) return;
        try {
            if (window.OneSignal.User.externalId !== userId) {
                await window.OneSignal.login(userId);
                console.log('✅ OneSignal login on user update:', userId);
            }
        } catch (e) {
            if (e.status === 409) {
                console.log('ℹ️ OneSignal user already linked (409 ignored)');
            } else {
                console.warn('⚠️ OneSignal login on user update failed:', e.message);
            }
        }
    });

    document.addEventListener('user:loggedOut', async () => {
        if (!window.OneSignal) return;
        try {
            await window.OneSignal.logout();
            console.log('✅ OneSignal logout');
        } catch (e) {
            console.warn('⚠️ OneSignal logout failed:', e.message);
        }
        sessionStorage.removeItem('onesignal_subscription_id');
    });

    console.log("🚀 OneSignal init script loaded (enhanced with DB sync)");
})();
