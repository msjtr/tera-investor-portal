/**
 * ============================================================
 * OneSignal Initialization – Tera Investor Portal
 * المسار: assets/js/onesignal-init.js
 * ============================================================
 * يقوم بتهيئة OneSignal SDK وربط المستخدم الحالي
 * يدعم تحديث External ID تلقائياً عند تغيير المستخدم
 * ============================================================
 */

(function() {
    'use strict';

    // ─── منع التهيئة المتكررة ───
    if (window.__onesignalInitialized) return;
    window.__onesignalInitialized = true;

    // ─── إعدادات OneSignal ───
    const ONESIGNAL_CONFIG = {
        appId: "512d9b65-ec50-41a5-ac12-059a83441a72",
        serviceWorkerPath: "/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/" },
        notifyButton: {
            enable: false
        },
        // إعدادات إضافية لتحسين الأداء
        session: {
            enable: true,
            interval: 60 // دقيقة
        }
    };

    // ─── دالة ربط External ID ───
    async function setExternalId(OneSignal) {
        try {
            // محاولة الحصول على المستخدم من Auth
            let userId = null;
            if (window.Auth && typeof window.Auth.getCurrentUser === 'function') {
                const user = await window.Auth.getCurrentUser();
                userId = user?.id;
            } else if (window.teraSupabase) {
                const { data: { user } } = await window.teraSupabase.auth.getUser();
                userId = user?.id;
            }

            if (!userId) {
                console.log('ℹ️ OneSignal: لا يوجد مستخدم مسجل دخول لتحديث External ID');
                return;
            }

            // تعيين External ID
            await OneSignal.User.addAlias({ external_id: userId });
            console.log('✅ OneSignal External ID set:', userId);

            // تخزين في sessionStorage لتتبع الحالة
            sessionStorage.setItem('onesignal_external_id', userId);

        } catch (err) {
            console.error('❌ OneSignal: فشل تعيين External ID', err);
        }
    }

    // ─── دالة تحديث الحالة عند تغيير المستخدم ───
    function listenForUserChanges(OneSignal) {
        // استماع لتغييرات المستخدم عبر حدث مخصص
        document.addEventListener('user:updated', async (event) => {
            const user = event.detail;
            if (user?.id) {
                try {
                    await OneSignal.User.addAlias({ external_id: user.id });
                    console.log('✅ OneSignal: تحديث External ID للمستخدم الجديد', user.id);
                } catch (err) {
                    console.error('❌ OneSignal: فشل تحديث External ID', err);
                }
            }
        });

        // استماع لتسجيل الخروج
        document.addEventListener('user:loggedOut', async () => {
            try {
                // إزالة External ID (اختياري)
                await OneSignal.User.removeAlias('external_id');
                console.log('✅ OneSignal: تم إزالة External ID بعد تسجيل الخروج');
            } catch (err) {
                console.warn('⚠️ OneSignal: فشل إزالة External ID', err);
            }
        });
    }

    // ─── التهيئة الرئيسية ───
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function (OneSignal) {
        try {
            // 1. تهيئة OneSignal
            await OneSignal.init(ONESIGNAL_CONFIG);

            // 2. جعل OneSignal متاحاً عالمياً
            window.OneSignal = OneSignal;

            // 3. ربط المستخدم الحالي
            await setExternalId(OneSignal);

            // 4. الاستماع لتغييرات المستخدم
            listenForUserChanges(OneSignal);

            // 5. تحديث حالة الاشتراك (اختياري)
            try {
                const subscription = await OneSignal.User.pushSubscription.getCurrentSubscription();
                const isSubscribed = subscription && subscription.id;
                console.log(`📨 OneSignal: ${isSubscribed ? '✅ مفعل' : '❌ غير مفعل'}`);
                if (isSubscribed) {
                    sessionStorage.setItem('onesignal_player_id', subscription.id);
                } else {
                    sessionStorage.removeItem('onesignal_player_id');
                }
            } catch (err) {
                console.warn('⚠️ OneSignal: فشل جلب حالة الاشتراك', err);
            }

            console.log('✅ OneSignal: تم التهيئة بنجاح');

        } catch (err) {
            console.error('❌ OneSignal: فشل التهيئة', err);
            // محاولة إعادة التهيئة بعد 10 ثوانٍ
            setTimeout(() => {
                console.log('🔄 OneSignal: محاولة إعادة التهيئة...');
                window.OneSignalDeferred?.push?.(async (OneSignal) => {
                    try {
                        await OneSignal.init(ONESIGNAL_CONFIG);
                        window.OneSignal = OneSignal;
                        await setExternalId(OneSignal);
                        console.log('✅ OneSignal: إعادة التهيئة ناجحة');
                    } catch (retryErr) {
                        console.error('❌ OneSignal: فشل إعادة التهيئة', retryErr);
                    }
                });
            }, 10000);
        }
    });

    // ─── دالة مساعدة للاستخدام في ملفات أخرى ───
    window.waitForOneSignal = function(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (window.OneSignal) {
                resolve(window.OneSignal);
                return;
            }

            const timer = setTimeout(() => {
                reject(new Error('OneSignal initialization timeout'));
            }, timeout);

            document.addEventListener('onesignal:ready', () => {
                clearTimeout(timer);
                resolve(window.OneSignal);
            }, { once: true });
        });
    };

    // ─── إطلاق حدث عند اكتمال التهيئة ───
    const originalPush = window.OneSignalDeferred.push.bind(window.OneSignalDeferred);
    window.OneSignalDeferred.push = function(callback) {
        originalPush(async (OneSignal) => {
            await callback(OneSignal);
            document.dispatchEvent(new CustomEvent('onesignal:ready'));
        });
    };

    console.log('🚀 OneSignal: جارٍ التهيئة...');

})();
