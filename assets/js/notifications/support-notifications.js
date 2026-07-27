/**
 * ============================================================
 * support-notifications.js – التهيئة النهائية + إعدادات الإشعارات
 * يعمل فقط في الصفحات التي تحتوي على عنصر #notificationsList
 * تم التحديث لاستخدام NotificationService و withAuth لتجنب 403
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__supportNotificationsReady) return;
    window.__supportNotificationsReady = true;

    // ─── متغيرات عامة ───
    let supabaseClient = null;
    let authChannel = null; // لمتابعة تغييرات المصادقة

    // ─── دوال الإعدادات (بدون تغيير) ───
    function loadSettings() {
        // ... الكود الحالي ...
    }
    function saveSettings() {
        // ... الكود الحالي ...
    }
    function bindToggles() {
        // ... الكود الحالي ...
    }
    function bindSaveButton() {
        // ... الكود الحالي ...
    }
    function initSettings() {
        loadSettings();
        bindToggles();
        bindSaveButton();
        console.log('✅ Notification settings ready');
    }

    // ─── الانتظار حتى يصبح NotificationManager جاهزاً ───
    function waitForManager(timeout = 5000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                const manager = window.NotificationManager;
                if (manager && typeof manager.init === 'function') {
                    resolve(manager);
                    return;
                }
                if (Date.now() - start > timeout) {
                    reject(new Error('NotificationManager.init not available after timeout'));
                    return;
                }
                setTimeout(check, 200);
            };
            check();
        });
    }

    // ─── دالة withAuth (نسخة مستقلة) ───
    async function withAuth(callback) {
        if (!supabaseClient) {
            console.warn('⚠️ [withAuth] Supabase client not available');
            return null;
        }
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error || !session) {
                console.log('⏳ [withAuth] No active session, skipping request');
                return null;
            }
            return await callback(session);
        } catch (e) {
            console.warn('⚠️ [withAuth] Error:', e.message);
            return null;
        }
    }

    // ─── جلب الإشعارات الأولية (باستخدام withAuth) ───
    async function fetchInitialNotifications() {
        return withAuth(async (session) => {
            const { data, error } = await supabaseClient
                .from('notifications')
                .select('*')
                .eq('deleted_at', null)        // استثناء المحذوف منطقياً
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data;
        });
    }

    // ─── التهيئة الرئيسية ───
    async function init() {
        // التحقق من وجود عنصر القائمة
        if (!document.getElementById('notificationsList')) {
            console.log('ℹ️ support-notifications: skipped – no notificationsList element.');
            return;
        }

        console.log('🚀 Initializing Notification System (with RLS-safe methods)...');

        try {
            // 1. الحصول على Supabase Client
            supabaseClient = await getSupabaseClient();
            if (!supabaseClient) {
                console.error('❌ Supabase client not available');
                return;
            }

            // 2. الانتظار حتى تحميل NotificationManager
            let manager;
            try {
                manager = await waitForManager(8000);
                console.log('✅ NotificationManager ready');
            } catch (e) {
                console.warn('⚠️ NotificationManager not loaded, using fallback methods');
                // نعطي قيمة افتراضية لتجنب الأعطال
                manager = {
                    init: () => {},
                    addNotification: () => {},
                    updateNotification: () => {},
                    on: () => {}
                };
            }

            // 3. تهيئة المدير (إذا كان لديه init)
            if (manager && typeof manager.init === 'function') {
                await manager.init();
            }

            // 4. تهيئة NotificationService (إذا وجد)
            if (window.NotificationService && typeof window.NotificationService.init === 'function') {
                await window.NotificationService.init(supabaseClient);
            }

            // 5. جلب الإشعارات الأولية (بطريقة آمنة)
            let initialData = [];
            try {
                const data = await fetchInitialNotifications();
                if (data) {
                    initialData = data;
                    // تحديث الكاش (إن وجد)
                    if (window.NotificationCache && typeof window.NotificationCache.init === 'function') {
                        window.NotificationCache.init(initialData);
                    }
                    // إضافة كل إشعار للمدير
                    if (manager && typeof manager.addNotification === 'function') {
                        initialData.forEach(n => manager.addNotification(n));
                    }
                }
            } catch (e) {
                console.warn('⚠️ Initial fetch failed:', e.message);
                // إذا كان الخطأ بسبب الجلسة، فهذا متوقع
            }

            // 6. تهيئة واجهة المستخدم (UI)
            if (window.NotificationUI && typeof window.NotificationUI.init === 'function') {
                window.NotificationUI.init();
            }

            // 7. عرض الإشعارات في الواجهة
            renderNotifications();

            // 8. ربط Realtime (مع فلتر user_id من RLS)
            await setupRealtime();

            // 9. إعداد OneSignal (إن وجد)
            await setupOneSignal();

            // 10. الاستماع لتغييرات المدير (لتحديث الواجهة)
            if (manager && typeof manager.on === 'function') {
                manager.on('state:changed', () => {
                    renderNotifications();
                });
            }

            // 11. تحديث العداد العام
            await updateBadge();

            // 12. تحميل السجل (إن وجد)
            if (window.NotificationHistory && typeof window.NotificationHistory.load === 'function') {
                window.NotificationHistory.load(1);
            }

            // 13. تهيئة إعدادات التبديلات
            initSettings();

            // 14. الاستماع لتغيرات المصادقة لتحديث البيانات
            setupAuthListener();

            console.log('✅ Notification System ready (with 403 prevention)');

        } catch (err) {
            console.error('❌ Notification System init failed:', err);
        }
    }

    // ─── عرض الإشعارات في الواجهة ───
    function renderNotifications() {
        const cache = window.NotificationCache;
        if (cache && typeof cache.getAll === 'function') {
            const all = cache.getAll();
            const filtered = window.NotificationFilters?.apply(all) || all;
            if (window.NotificationUI && typeof window.NotificationUI.render === 'function') {
                window.NotificationUI.render(filtered, 1);
                window.NotificationUI.updateStats(cache.getStats());
            }
        }
    }

    // ─── إعداد Realtime ───
    async function setupRealtime() {
        const userId = await getCurrentUserId();
        if (!userId || !supabaseClient) return;

        // إلغاء الاشتراك من القناة السابقة إن وجدت
        if (authChannel) {
            await supabaseClient.removeChannel(authChannel);
            authChannel = null;
        }

        const channel = supabaseClient
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const newNotif = payload.new;
                    if (window.NotificationCache?.add) window.NotificationCache.add(newNotif);
                    if (window.NotificationManager?.addNotification) window.NotificationManager.addNotification(newNotif);
                    renderNotifications();
                    // عرض Toast (إن وجد)
                    if (window.NotificationService && window.NotificationService._showToast) {
                        window.NotificationService._showToast(newNotif);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const updated = payload.new;
                    if (window.NotificationCache?.update) window.NotificationCache.update(updated.id, updated);
                    if (window.NotificationManager?.updateNotification) window.NotificationManager.updateNotification(updated.id, updated);
                    renderNotifications();
                }
            )
            .subscribe();

        authChannel = channel;
    }

    // ─── إعداد OneSignal ───
    async function setupOneSignal() {
        try {
            const os = window.OneSignalManager;
            if (!os) return;
            const user = await getCurrentUserId();
            if (user && typeof os.setExternalId === 'function') {
                await os.setExternalId(user);
            }
            if (typeof os.addListener === 'function') {
                await os.addListener((notification) => {
                    // إضافة الإشعار الوارد من OneSignal (لكن لا ندرجه في DB)
                    if (window.NotificationManager?.addNotification) {
                        window.NotificationManager.addNotification(notification);
                        renderNotifications();
                    }
                });
            }
        } catch (e) {
            console.warn('⚠️ OneSignal setup skipped:', e.message);
        }
    }

    // ─── تحديث العداد ───
    async function updateBadge() {
        if (window.Support?.updateNotificationBadge) {
            await window.Support.updateNotificationBadge();
        } else {
            // محاولة جلب العدد من الكاش
            const cache = window.NotificationCache;
            if (cache && typeof cache.getStats === 'function') {
                const stats = cache.getStats();
                const badge = document.getElementById('notificationBadge');
                if (badge) badge.textContent = stats.unread || 0;
            }
        }
    }

    // ─── الاستماع لتغيرات المصادقة ───
    function setupAuthListener() {
        if (!supabaseClient) return;
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state changed:', event);
            if (event === 'SIGNED_IN' && session) {
                // إعادة تحميل الإشعارات بعد تسجيل الدخول
                const data = await fetchInitialNotifications();
                if (data) {
                    if (window.NotificationCache?.init) window.NotificationCache.init(data);
                    if (window.NotificationManager?.clear) window.NotificationManager.clear();
                    data.forEach(n => window.NotificationManager?.addNotification(n));
                    renderNotifications();
                    // إعادة ربط Realtime
                    await setupRealtime();
                    await updateBadge();
                }
            } else if (event === 'SIGNED_OUT') {
                // مسح الإشعارات المحلية
                if (window.NotificationCache?.clear) window.NotificationCache.clear();
                if (window.NotificationManager?.clear) window.NotificationManager.clear();
                renderNotifications();
                const badge = document.getElementById('notificationBadge');
                if (badge) badge.textContent = '0';
            }
        });
    }

    // ─── دوال مساعدة ───
    async function getSupabaseClient() {
        if (window.Support?.getSupabase) return await window.Support.getSupabase();
        if (window.teraSupabase) return window.teraSupabase;
        if (window.waitForSupabase) return await window.waitForSupabase();
        return null;
    }

    async function getCurrentUserId() {
        if (!supabaseClient) return null;
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            return user?.id || null;
        } catch {
            return null;
        }
    }

    // ─── تصدير دوال للاستخدام في HTML ───
    window.__openDetail = (id) => {
        const cache = window.NotificationCache;
        if (cache && typeof cache.get === 'function') {
            const n = cache.get(id);
            if (n && window.NotificationUI?.openDetail) {
                window.NotificationUI.openDetail(n);
            }
        }
    };

    window.__deleteNotification = async (id) => {
        if (window.NotificationActions?.deleteNotification) {
            await window.NotificationActions.deleteNotification(id);
            renderNotifications();
        }
    };

    // ─── بدء التهيئة ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ support-notifications.js (RLS-safe) loaded');
})();
