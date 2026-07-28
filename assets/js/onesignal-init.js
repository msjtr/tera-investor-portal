/**
 * onesignal-init.js – v4 (مع دعم Tracking Prevention والتحقق من التخزين)
 * - تكتشف حظر التخزين وتقدم توجيهات للمستخدم
 * - تنتظر Player ID لفترة أطول مع إعادة محاولة ذكية
 * - تتعامل مع 409 Conflict بهدوء
 * - تمنع التكرار عبر sessionStorage
 * - تستمع لأحداث المصادقة من Auth.js
 */

(function() {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";
    const STORAGE_KEY = "onesignal_registered";
    const PENDING_PLAYER_KEY = "pending_player_id";

    // ─── التحقق من توفر التخزين ───
    function isStorageAvailable() {
        try {
            const testKey = '__storage_test__';
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    // ─── عرض تحذير التخزين ───
    function showStorageWarning() {
        const statusEl = document.getElementById('osStatusText');
        if (statusEl) {
            statusEl.textContent = '⚠️ التخزين محظور، يرجى تعطيل Tracking Prevention';
            statusEl.className = 'status-value warning';
            statusEl.style.color = '#b45309';
            statusEl.style.backgroundColor = '#fffbeb';
        }
        console.warn('⚠️ Tracking Prevention is blocking storage. Please disable it for this site.');
    }

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

    // ─── الانتظار للحصول على Player ID (مع إعادة محاولة) ───
    async function waitForPlayerId(OneSignal, maxAttempts = 15) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                if (OneSignal.User && OneSignal.User.PushSubscription) {
                    const id = OneSignal.User.PushSubscription.id || null;
                    if (id) {
                        console.log(`📌 Player ID found after ${attempt + 1} attempts:`, id);
                        return id;
                    }
                }
            } catch (e) {
                // تجاهل الأخطاء المؤقتة
            }
            // انتظار 500 مللي بين المحاولات
            await new Promise(r => setTimeout(r, 500));
        }
        console.warn('⚠️ Player ID not found after max attempts');
        return null;
    }

    // ─── التهيئة الرئيسية ───
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function(OneSignal) {
        try {
            // 1. التحقق من توفر التخزين
            if (!isStorageAvailable()) {
                showStorageWarning();
                // نستمر مع التحذير ولكن نحاول التهيئة
            }

            // 2. تهيئة OneSignal
            await OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                serviceWorkerPath: "/OneSignalSDKWorker.js",
                serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
                notifyButton: { enable: false },
                allowLocalhostAsSecureOrigin: true
            });

            window.OneSignal = OneSignal;
            console.log("✅ OneSignal Initialized");

            // 3. الانتظار للحصول على Player ID (مع إعادة محاولة)
            const playerId = await waitForPlayerId(OneSignal);

            if (playerId) {
                sessionStorage.setItem(PENDING_PLAYER_KEY, playerId);
                console.log("📌 Player ID obtained:", playerId);

                // محاولة ربط المستخدم الحالي
                const user = await getCurrentUser();
                if (user?.id) {
                    await registerUser(user.id, playerId);
                } else {
                    console.log('⏳ No user logged in, will register later');
                }
            } else {
                console.warn('⚠️ Player ID not available after waiting. This may be due to Tracking Prevention.');
                // محاولة تحديث الحالة لتوجيه المستخدم
                const statusEl = document.getElementById('osStatusText');
                if (statusEl) {
                    statusEl.textContent = '⏳ جاري التهيئة... يرجى السماح بالإشعارات';
                    statusEl.className = 'status-value';
                }
            }

            // 4. الاستماع لتغيير المستخدم (من Auth.js)
            document.addEventListener('user:updated', async (e) => {
                const userId = e.detail?.id;
                if (!userId) return;
                // محاولة الحصول على Player ID مرة أخرى (قد يكون الآن متاحاً)
                const currentPlayerId = sessionStorage.getItem(PENDING_PLAYER_KEY) || 
                                       (window.OneSignal?.User?.PushSubscription?.id || null);
                if (currentPlayerId) {
                    await registerUser(userId, currentPlayerId);
                } else {
                    // إذا لم يكن Player ID متاحاً، ننتظر قليلاً ثم نحاول مرة أخرى
                    await new Promise(r => setTimeout(r, 2000));
                    const newPlayerId = window.OneSignal?.User?.PushSubscription?.id || null;
                    if (newPlayerId) {
                        sessionStorage.setItem(PENDING_PLAYER_KEY, newPlayerId);
                        await registerUser(userId, newPlayerId);
                    }
                }
            });

            // 5. الاستماع لتسجيل الخروج
            document.addEventListener('user:loggedOut', async () => {
                sessionStorage.removeItem(STORAGE_KEY);
                try {
                    if (window.OneSignal && typeof window.OneSignal.logout === 'function') {
                        await window.OneSignal.logout();
                    }
                } catch (e) { /* ignore */ }
                sessionStorage.removeItem(PENDING_PLAYER_KEY);
            });

            // 6. محاولة ربط المستخدم المعلق (من auth.js)
            const pendingUser = sessionStorage.getItem('onesignal_pending_user');
            if (pendingUser) {
                // الانتظار قليلاً لعل Player ID يتوفر
                await new Promise(r => setTimeout(r, 1000));
                const currentPlayerId = sessionStorage.getItem(PENDING_PLAYER_KEY) || 
                                       (window.OneSignal?.User?.PushSubscription?.id || null);
                if (currentPlayerId) {
                    await registerUser(pendingUser, currentPlayerId);
                    sessionStorage.removeItem('onesignal_pending_user');
                } else {
                    // إذا لم يتوفر، ننتظر أكثر
                    await new Promise(r => setTimeout(r, 3000));
                    const newPlayerId = window.OneSignal?.User?.PushSubscription?.id || null;
                    if (newPlayerId) {
                        sessionStorage.setItem(PENDING_PLAYER_KEY, newPlayerId);
                        await registerUser(pendingUser, newPlayerId);
                        sessionStorage.removeItem('onesignal_pending_user');
                    }
                }
            }

            // 7. تحديث واجهة الحالة
            updateStatusDisplay(OneSignal);

            // 8. دوال مساعدة
            window.getPlayerId = () => {
                try {
                    return window.OneSignal?.User?.PushSubscription?.id || null;
                } catch (e) {
                    return null;
                }
            };
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: window.getPlayerId()
            });

            // 9. مراقبة تغيير الإذن
            if (Notification.permission === 'denied') {
                console.warn('⚠️ Notifications permission denied by user.');
                const statusEl = document.getElementById('osStatusText');
                if (statusEl) {
                    statusEl.textContent = '🔇 الإشعارات مرفوضة، يرجى تغيير الإعدادات';
                    statusEl.className = 'status-value denied';
                }
            }

        } catch (err) {
            console.error("❌ OneSignal Initialization Error", err);
            const statusEl = document.getElementById('osStatusText');
            if (statusEl) {
                statusEl.textContent = '❌ خطأ في تهيئة الإشعارات';
                statusEl.className = 'status-value error';
            }
        }
    });

    // ─── تحديث واجهة الحالة ───
    function updateStatusDisplay(OneSignal) {
        const statusEl = document.getElementById("osStatusText");
        if (!statusEl) return;
        try {
            const sub = OneSignal.User?.PushSubscription;
            if (sub?.id) {
                statusEl.textContent = "✅ مفعلة (Subscribed)";
                statusEl.className = "status-value subscribed";
                const playerIdEl = document.getElementById("osPlayerId");
                if (playerIdEl) playerIdEl.textContent = `Player ID: ${sub.id}`;
            } else if (Notification.permission === 'denied') {
                statusEl.textContent = "🔇 مرفوضة (Denied)";
                statusEl.className = "status-value denied";
            } else {
                statusEl.textContent = "⏳ غير مشترك بعد (Waiting)";
                statusEl.className = "status-value unsubscribed";
            }
        } catch (e) {
            statusEl.textContent = "❌ حالة غير معروفة";
            statusEl.className = "status-value error";
        }
    }

    // ─── إصلاح مشكلة Tracking Prevention: محاولة استخدام fallback للتخزين ───
    // إذا كان sessionStorage محظوراً، نستخدم متغير مؤقت في الذاكرة
    if (!isStorageAvailable()) {
        console.warn('⚠️ sessionStorage is blocked. Using memory fallback.');
        // نضيف متغيرات عامة كحل بديل
        window.__memoryStorage = {};
        const originalSetItem = sessionStorage.setItem;
        const originalGetItem = sessionStorage.getItem;
        const originalRemoveItem = sessionStorage.removeItem;

        sessionStorage.setItem = function(key, value) {
            try {
                originalSetItem.call(this, key, value);
            } catch (e) {
                window.__memoryStorage[key] = value;
            }
        };
        sessionStorage.getItem = function(key) {
            try {
                return originalGetItem.call(this, key);
            } catch (e) {
                return window.__memoryStorage[key] || null;
            }
        };
        sessionStorage.removeItem = function(key) {
            try {
                originalRemoveItem.call(this, key);
            } catch (e) {
                delete window.__memoryStorage[key];
            }
        };
    }

    console.log("🚀 onesignal-init.js v4 loaded (with Tracking Prevention handling)");
})();
