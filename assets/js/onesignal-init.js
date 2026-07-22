/**
 * onesignal-init.js – OneSignal Web SDK v16 مع مزامنة الاشتراك مع Supabase
 * يحفظ player_id في user_push_subscriptions عند الاشتراك (باستخدام upsert)
 * يُحدّث الاشتراك عند تغير المستخدم
 * تم إصلاح مشكلة RLS والمصادقة
 */
(function () {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";

    // ========== التحسين 1: دالة لحفظ الاشتراك باستخدام upsert ==========
    async function saveSubscriptionToDB(userId, playerId) {
        if (!userId || !playerId) {
            console.warn('⚠️ لا يمكن حفظ الاشتراك: userId أو playerId مفقود');
            return;
        }

        const sb = window.teraSupabase;
        if (!sb) {
            console.warn('⚠️ Supabase غير متاح');
            return;
        }

        try {
            // ✅ التحسين: استخدام upsert بدلاً من select ثم insert/update
            // هذا يقلل عدد الطلبات ويتجنب مشاكل RLS عند select
            const { error } = await sb
                .from('user_push_subscriptions')
                .upsert(
                    {
                        user_id: userId,
                        player_id: playerId,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    },
                    {
                        onConflict: 'player_id', // يعتمد على قيد UNIQUE في player_id
                        ignoreDuplicates: false   // يقوم بالتحديث إذا وجد السجل
                    }
                );

            if (error) {
                // إذا كان الخطأ متعلقاً بـ RLS أو المصادقة، نسجله لكن لا نوقف التنفيذ
                if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
                    console.warn('⚠️ لا توجد صلاحية للحفظ (قد يكون المستخدم غير مسجل دخول):', error.message);
                } else {
                    console.error('❌ فشل حفظ الاشتراك:', error);
                }
                return;
            }

            console.log('✅ تم حفظ الاشتراك بنجاح:', playerId);
        } catch (e) {
            console.warn('⚠️ خطأ غير متوقع أثناء حفظ الاشتراك:', e);
        }
    }

    // ========== التحسين 2: دالة للحصول على المستخدم الحالي ==========
    async function getCurrentUser() {
        const sb = window.teraSupabase;
        if (!sb) return null;

        try {
            // ✅ استخدام getUser بدلاً من getSession للتحقق من صحة التوكن
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) {
                console.warn('⚠️ لا يوجد مستخدم مسجل دخول:', error?.message);
                return null;
            }
            return user;
        } catch (e) {
            console.warn('⚠️ فشل جلب المستخدم:', e);
            return null;
        }
    }

    // ========== التحسين 3: دالة لتأجيل حفظ الاشتراك حتى تسجيل الدخول ==========
    function deferSubscription(playerId) {
        // حفظ player_id في sessionStorage لحين تسجيل الدخول
        sessionStorage.setItem('pending_player_id', playerId);
        console.log('⏳ تم تأجيل حفظ الاشتراك لحين تسجيل الدخول');
    }

    // ========== التحسين 4: محاولة حفظ الاشتراك مع التحقق من الجلسة ==========
    async function handleSubscription(playerId) {
        if (!playerId) return;

        // حفظ player_id في sessionStorage للاستخدام السريع
        sessionStorage.setItem('onesignal_subscription_id', playerId);

        const user = await getCurrentUser();
        if (user?.id) {
            // المستخدم مسجل دخول → حفظ فوري
            await saveSubscriptionToDB(user.id, playerId);
            
            // ربط المستخدم بـ OneSignal (اختياري)
            try {
                if (window.OneSignal) {
                    await window.OneSignal.login(user.id);
                    console.log('✅ تم ربط OneSignal بالمستخدم:', user.id);
                }
            } catch (e) {
                console.warn('⚠️ فشل ربط OneSignal:', e.message);
            }
        } else {
            // المستخدم غير مسجل → تأجيل الحفظ
            deferSubscription(playerId);
        }
    }

    // ========== تهيئة OneSignal ==========
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
            console.log("✅ OneSignal initialized");

            // انتظر حتى يصبح الاشتراك جاهزاً
            await waitForSubscription(OneSignal, 10000);

            const playerId = OneSignal.User?.PushSubscription?.id;
            if (playerId) {
                console.log("📌 Player ID:", playerId);
                await handleSubscription(playerId);
            } else {
                console.warn('⚠️ لم يتم الحصول على Player ID بعد التهيئة');
            }

            // تحديث واجهة المستخدم
            updateStatusDisplay(OneSignal);

            // ========== إضافة دوال مساعدة ==========
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
            console.error("❌ OneSignal initialization error:", err);
        }
    });

    // ========== الاستماع لتغييرات المستخدم ==========
    // عند تسجيل الدخول (SIGNED_IN)
    document.addEventListener('user:updated', async (e) => {
        const userId = e.detail?.id;
        if (!userId || !window.OneSignal) return;

        const playerId = window.OneSignal.User?.PushSubscription?.id;
        if (playerId) {
            await saveSubscriptionToDB(userId, playerId);
            try {
                await window.OneSignal.login(userId);
                console.log('✅ تم تحديث الاشتراك بعد تغيير المستخدم');
            } catch (e) {}
        } else {
            // قد يكون هناك player_id معلق في sessionStorage
            const pendingPlayerId = sessionStorage.getItem('pending_player_id');
            if (pendingPlayerId) {
                await saveSubscriptionToDB(userId, pendingPlayerId);
                sessionStorage.removeItem('pending_player_id');
            }
        }
    });

    // عند تسجيل الخروج (SIGNED_OUT)
    document.addEventListener('user:loggedOut', async () => {
        if (!window.OneSignal) return;
        const playerId = window.OneSignal.User?.PushSubscription?.id;
        if (playerId) {
            // تحديث قاعدة البيانات بإلغاء التنشيط (اختياري)
            const sb = window.teraSupabase;
            if (sb) {
                try {
                    await sb
                        .from('user_push_subscriptions')
                        .update({ 
                            is_active: false, 
                            updated_at: new Date().toISOString() 
                        })
                        .eq('player_id', playerId);
                    console.log('✅ تم إلغاء تنشيط الاشتراك');
                } catch (e) {
                    console.warn('⚠️ فشل إلغاء تنشيط الاشتراك:', e);
                }
            }
        }
        try {
            await window.OneSignal.logout();
            console.log('✅ تم تسجيل الخروج من OneSignal');
        } catch (e) {}
        sessionStorage.removeItem('onesignal_subscription_id');
        sessionStorage.removeItem('pending_player_id');
    });

    // الاستماع لتغيير إذن الإشعارات
    document.addEventListener('onesignal:subscriptionChanged', async (e) => {
        const { isSubscribed, playerId } = e.detail || {};
        if (isSubscribed && playerId) {
            await handleSubscription(playerId);
        }
    });

    // ========== دوال مساعدة ==========
    async function waitForSubscription(OneSignal, timeout = 10000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (OneSignal.User?.PushSubscription?.id) return;
            await new Promise(r => setTimeout(r, 300));
        }
        console.warn("⚠️ PushSubscription did not become ready in time");
    }

    function updateStatusDisplay(OneSignal) {
        const statusEl = document.getElementById("osStatusText");
        if (!statusEl) return;
        const sub = OneSignal.User?.PushSubscription;
        if (sub?.id) {
            statusEl.textContent = "✅ مفعل (Subscribed)";
            statusEl.className = "status-value subscribed";
            const playerIdEl = document.getElementById("osPlayerId");
            if (playerIdEl) playerIdEl.textContent = `Player ID: ${sub.id}`;
        } else {
            statusEl.textContent = "❌ غير مشترك (Unsubscribed)";
            statusEl.className = "status-value unsubscribed";
        }
    }

    console.log("🚀 OneSignal init script loaded (deferred)");
})();
