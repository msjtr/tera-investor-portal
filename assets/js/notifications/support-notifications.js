/**
 * ============================================================
 * support-notifications.js – التهيئة النهائية + إعدادات الإشعارات
 * يعمل فقط في الصفحات التي تحتوي على عنصر #notificationsList
 * تم التحديث لاستخدام NotificationService كطبقة وسيطة
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__supportNotificationsReady) return;
    window.__supportNotificationsReady = true;

    // مرجع لـ Supabase بعد التهيئة
    let supabaseClient = null;

    // ─── إعدادات الإشعارات (التبديلات والحفظ) ───
    function loadSettings() { /* بدون تغيير */ }
    function saveSettings() { /* بدون تغيير */ }
    function bindToggles() { /* بدون تغيير */ }
    function bindSaveButton() { /* بدون تغيير */ }

    function initSettings() {
        loadSettings();
        bindToggles();
        bindSaveButton();
        console.log('✅ Notification settings ready');
    }

    // ─── التهيئة الرئيسية (فقط في صفحات الإشعارات) ───
    async function init() {
        if (!document.getElementById('notificationsList')) {
            console.log('ℹ️ support-notifications: skipped – no notificationsList element.');
            return;
        }

        console.log('🚀 Initializing Notification System (with NotificationService)...');

        try {
            // 1. الحصول على Supabase
            supabaseClient = await getSupabaseClient();
            if (!supabaseClient) {
                console.error('❌ Supabase client not available');
                return;
            }

            // 2. تهيئة NotificationService
            await window.NotificationService.init(supabaseClient);

            // 3. تهيئة المدير والكاش (للاحتفاظ بالحالة المحلية)
            const manager = window.NotificationManager;
            if (manager) manager.init();

            // 4. جلب الإشعارات الأولية
            let initialData = [];
            try {
                const { data, error } = await supabaseClient
                    .from('notifications')
                    .select('*')
                    .eq('user_id', (await getCurrentUserId()))
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (!error && data) {
                    initialData = data;
                    window.NotificationCache?.init(initialData);
                    initialData.forEach(n => window.NotificationManager?.addNotification(n));
                }
            } catch (e) {
                console.warn('⚠️ Initial fetch failed:', e.message);
            }

            // 5. تهيئة الواجهة
            window.NotificationUI?.init();

            // 6. عرض الإشعارات
            const cache = window.NotificationCache;
            if (cache) {
                const all = cache.getAll();
                const filtered = window.NotificationFilters?.apply(all) || all;
                window.NotificationUI?.render(filtered, 1);
                window.NotificationUI?.updateStats(cache.getStats());
            }

            // 7. ربط Realtime مباشرة بجدول الإشعارات
            const userId = await getCurrentUserId();
            if (userId && supabaseClient) {
                const channel = supabaseClient
                    .channel('notifications-changes')
                    .on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                        (payload) => {
                            const newNotif = payload.new;
                            window.NotificationCache?.add(newNotif);
                            window.NotificationManager?.addNotification(newNotif);
                            window.NotificationUI?.refresh();
                            // إظهار Toast محلي (إن لم يظهر تلقائياً)
                            if (window.NotificationService && window.NotificationService._showToast) {
                                window.NotificationService._showToast(newNotif);
                            }
                        }
                    )
                    .on(
                        'postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                        (payload) => {
                            const updatedNotif = payload.new;
                            window.NotificationCache?.update(updatedNotif.id, updatedNotif);
                            window.NotificationManager?.updateNotification(updatedNotif.id, updatedNotif);
                            window.NotificationUI?.refresh();
                        }
                    )
                    .subscribe();
            }

            // 8. OneSignal listener (يبقى كما هو)
            try {
                const os = window.OneSignalManager;
                if (os) {
                    const user = await window.Auth?.getCurrentUser?.();
                    if (user?.id) await os.setExternalId(user.id);
                    await os.addListener((notification) => {
                        // نضيف الإشعار القادم من OneSignal إلى الواجهة (لكن لا ندرجه في DB)
                        window.NotificationManager?.addNotification(notification);
                        window.NotificationUI?.refresh();
                    });
                }
            } catch (e) {
                console.warn('⚠️ OneSignal setup skipped:', e.message);
            }

            // 9. الاستماع لتغييرات المدير (إن وُجد)
            window.NotificationManager?.on('state:changed', () => {
                window.NotificationUI?.refresh();
            });

            // 10. تحديث العداد العام
            await window.Support?.updateNotificationBadge?.();

            // 11. تحميل السجل إذا كان التبويب نشطاً
            window.NotificationHistory?.load(1);

            // 12. تهيئة إعدادات الإشعارات (التبديلات)
            initSettings();

            console.log('✅ Notification System ready (powered by NotificationService)');

        } catch (err) {
            console.error('❌ Notification System init failed:', err);
        }
    }

    // ─── دوال مساعدة ───
    async function getSupabaseClient() {
        if (window.Support?.getSupabase) return await window.Support.getSupabase();
        if (window.teraSupabase) return window.teraSupabase;
        if (window.waitForSupabase) return await window.waitForSupabase();
        return null;
    }

    async function getCurrentUserId() {
        if (window.Auth?.getCurrentUser) {
            const user = await window.Auth.getCurrentUser();
            return user?.id || null;
        }
        if (window.teraSupabase) {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            return user?.id || null;
        }
        return null;
    }

    // تصدير دوال مساعدة للاستخدام في HTML
    window.__openDetail = (id) => {
        const cache = window.NotificationCache;
        if (cache) {
            const n = cache.get(id);
            if (n) window.NotificationUI?.openDetail(n);
        }
    };

    window.__deleteNotification = async (id) => {
        await window.NotificationActions?.deleteNotification(id);
        window.NotificationUI?.refresh();
    };

    // بدء التهيئة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ support-notifications.js ready');
})();
