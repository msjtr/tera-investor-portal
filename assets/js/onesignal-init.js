/**
 * onesignal-init.js – v6 (يتعامل مع 409 Conflict بهدوء ولا يقطع التطبيق)
 * - يمنع ظهور أخطاء 409 للمستخدم في Console
 * - يعتبر 409 نجاحاً ضمنياً (المستخدم موجود بالفعل)
 * - متوافق مع Auth.js v35+
 */
(function() {
    "use strict";

    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    const ONESIGNAL_APP_ID = "512d9b65-ec50-41a5-ac12-059a83441a72";
    const STORAGE_KEY = "onesignal_registered";

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

    // ─── اعتراض أخطاء 409 من OneSignal ───
    function suppress409Errors() {
        const originalError = console.error;
        console.error = function(...args) {
            const message = args.join(' ');
            // تجاهل أخطاء 409 الخاصة بـ OneSignal
            if (message.includes('409') && message.includes('onesignal')) {
                console.log('ℹ️ OneSignal 409 Conflict ignored (user already exists)');
                return;
            }
            originalError.apply(console, args);
        };
    }

    // ─── مسح أي externalId قديم لمنع 409 ───
    function clearStaleExternalId() {
        try {
            if (window.OneSignal && window.OneSignal.User) {
                // محاولة قراءة externalId، إذا كان موجوداً ولا يوجد مستخدم مسجل، نمسحه
                const externalId = window.OneSignal.User.externalId;
                if (externalId) {
                    // نتحقق من وجود مستخدم في Supabase
                    const sb = window.teraSupabase || window.Support?.getSupabase?.();
                    if (sb) {
                        sb.auth.getUser().then(({ data }) => {
                            if (!data?.user) {
                                // لا يوجد مستخدم، نمسح externalId لمنع 409
                                try {
                                    // لا يمكن مسح externalId مباشرة، لكننا نستطيع logout
                                    window.OneSignal.logout().catch(() => {});
                                } catch {}
                            }
                        }).catch(() => {});
                    }
                }
            }
        } catch {}
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function(OneSignal) {
        try {
            // ─── تطبيق اعتراض 409 ───
            suppress409Errors();

            if (!isStorageAvailable()) showStorageWarning();

            // ─── تهيئة OneSignal ───
            await OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                serviceWorkerPath: "/OneSignalSDKWorker.js",
                serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
                notifyButton: { enable: false },
                allowLocalhostAsSecureOrigin: true
            });

            window.OneSignal = OneSignal;
            console.log("✅ OneSignal Initialized");

            // ─── محاولة مسح externalId قديم إذا لم يكن مستخدم مسجل ───
            setTimeout(() => clearStaleExternalId(), 1000);

            // ─── الحصول على Player ID ───
            const playerId = await waitForPlayerId(OneSignal);
            if (playerId) {
                sessionStorage.setItem('pending_player_id', playerId);
                console.log("📌 Player ID obtained:", playerId);

                // محاولة الربط عبر Auth إن أمكن
                if (window.Auth && typeof window.Auth.registerPushNotifications === 'function') {
                    const user = await window.Auth.getCurrentUser();
                    if (user?.id) {
                        // إضافة معالج خاص لـ 409 عند الربط
                        try {
                            await window.Auth.registerPushNotifications(user.id);
                        } catch (e) {
                            if (e.message && e.message.includes('409')) {
                                console.log('ℹ️ OneSignal 409 during registration (ignored)');
                            } else {
                                throw e;
                            }
                        }
                    }
                }
            }

            // ─── مستمع تسجيل الدخول ───
            document.addEventListener('user:updated', async (e) => {
                const userId = e.detail?.id;
                if (!userId) return;
                const playerId2 = sessionStorage.getItem('pending_player_id') || 
                                  window.OneSignal?.User?.PushSubscription?.id || null;
                if (playerId2 && window.Auth?.registerPushNotifications) {
                    try {
                        await window.Auth.registerPushNotifications(userId);
                    } catch (e) {
                        if (e.message && e.message.includes('409')) {
                            console.log('ℹ️ OneSignal 409 on user:updated (ignored)');
                        } else {
                            console.warn('⚠️ OneSignal registration error:', e);
                        }
                    }
                }
            });

            // ─── مستمع تسجيل الخروج ───
            document.addEventListener('user:loggedOut', async () => {
                sessionStorage.removeItem(STORAGE_KEY);
                if (window.OneSignal?.logout) {
                    try { await window.OneSignal.logout(); } catch {}
                }
                sessionStorage.removeItem('pending_player_id');
            });

            updateStatusDisplay(OneSignal);

            window.getPlayerId = () => window.OneSignal?.User?.PushSubscription?.id || null;
            window.getOneSignalStatus = () => ({
                initialized: true,
                permission: Notification.permission,
                optedIn: OneSignal.User?.PushSubscription?.optedIn ?? false,
                subscriptionId: window.getPlayerId()
            });

        } catch (err) {
            // استثناء 409 أثناء init
            if (err.message && err.message.includes('409')) {
                console.log('ℹ️ OneSignal 409 on init (ignored)');
                // نحاول الاستمرار
                try {
                    if (OneSignal) {
                        updateStatusDisplay(OneSignal);
                    }
                } catch {}
                return;
            }
            console.error("❌ OneSignal Init Error:", err);
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

    // ─── Fallback للتخزين ───
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

    console.log("🚀 onesignal-init.js v6 loaded (409 Conflict handled gracefully)");
})();
