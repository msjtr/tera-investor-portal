/**
 * support-notifications.js – تهيئة مركز الإشعارات مع RLS-safe
 * يعتمد على withAuth لتجنب 403 ولا يرسل user_id في الفلتر
 * استخدام NotificationCache و NotificationUI لعرض الإشعارات
 * تم إضافة إعادة محاولة الجلب تلقائياً
 */
(function() {
    'use strict';

    if (window.__supportNotificationsReady) return;
    window.__supportNotificationsReady = true;

    let supabaseClient = null;
    let authChannel = null;

    // ─── دالة withAuth ───
    async function withAuth(callback) {
        if (!supabaseClient) {
            console.warn('⚠️ [withAuth] Supabase client not available');
            return null;
        }
        
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error || !session) {
                console.warn('⏳ [withAuth] No active session');
                return null;
            }
            console.log('✅ [withAuth] Session active for user:', session.user.id);
            return await callback(session);
        } catch (e) {
            console.warn('⚠️ [withAuth] Error:', e.message);
            return null;
        }
    }

    // ─── جلب الإشعارات مع إعادة محاولة ───
    async function fetchNotificationsWithRetry(maxRetries = 3) {
        console.log('🔍 [fetchNotifications] Attempting to fetch notifications...');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await withAuth(async (session) => {
                    console.log(`🔍 [fetchNotifications] Attempt ${attempt} for user:`, session.user.id);
                    
                    const { data, error } = await supabaseClient
                        .from('notifications')
                        .select('*')
                        .is('deleted_at', null)
                        .order('created_at', { ascending: false })
                        .limit(50);
                        
                    if (error) {
                        console.error('❌ [fetchNotifications] Query error:', error);
                        throw error;
                    }
                    
                    console.log(`✅ [fetchNotifications] Fetched ${data?.length || 0} notifications (attempt ${attempt})`);
                    return data;
                });
                
                if (result && result.length > 0) {
                    return result;
                }
                
                if (attempt < maxRetries) {
                    console.log(`⏳ No data yet, retrying in 500ms... (${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (e) {
                console.warn(`⚠️ [fetchNotifications] Attempt ${attempt} failed:`, e.message);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        
        console.warn('⚠️ [fetchNotifications] All attempts failed or returned empty');
        return [];
    }

    // ─── دوال الإعدادات ───
    function loadSettings() {
        try {
            const saved = localStorage.getItem('notificationSettings');
            if (!saved) return;
            const settings = JSON.parse(saved);
            document.querySelectorAll('.toggle-switch').forEach(el => {
                const key = el.dataset.key;
                if (settings[key] !== undefined) {
                    if (settings[key]) el.classList.add('active');
                    else el.classList.remove('active');
                }
            });
        } catch (e) { /* ignore */ }
    }

    function saveSettings() {
        const toggles = document.querySelectorAll('.toggle-switch');
        const settings = {};
        toggles.forEach(el => {
            const key = el.dataset.key;
            settings[key] = el.classList.contains('active');
        });
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(settings));
            alert('✅ تم حفظ الإعدادات بنجاح');
        } catch (e) {
            alert('⚠️ حدث خطأ أثناء الحفظ');
        }
    }

    function bindToggles() {
        document.querySelectorAll('.toggle-switch').forEach(el => {
            el.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('active');
            });
        });
    }

    function initSettings() {
        loadSettings();
        bindToggles();
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveSettings);
        console.log('✅ Notification settings ready');
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
        } catch { return null; }
    }

    // ─── تحديث العداد ───
    async function updateBadge() {
        const cache = window.NotificationCache;
        if (cache && typeof cache.getStats === 'function') {
            const stats = cache.getStats();
            const badge = document.getElementById('notificationBadge');
            if (badge) badge.textContent = stats.unread || 0;
        }
    }

    // ─── عرض الإشعارات ───
    function renderNotifications() {
        const cache = window.NotificationCache;
        if (cache && typeof cache.getAll === 'function') {
            const all = cache.getAll();
            console.log(`📊 [renderNotifications] Rendering ${all.length} notifications`);
            const filtered = window.NotificationFilters?.apply(all) || all;
            if (window.NotificationUI && typeof window.NotificationUI.render === 'function') {
                window.NotificationUI.render(filtered, 1);
                if (typeof window.NotificationUI.updateStats === 'function') {
                    window.NotificationUI.updateStats(cache.getStats());
                }
            }
        } else {
            console.warn('⚠️ [renderNotifications] NotificationCache not available');
        }
    }

    // ─── إضافة إشعار للكاش والعرض ───
    function addNotificationToCache(notification) {
        console.log('📨 [addNotificationToCache] Adding notification:', notification.id);
        const cache = window.NotificationCache;
        if (cache && typeof cache.add === 'function') {
            cache.add(notification);
        } else {
            console.warn('⚠️ [addNotificationToCache] NotificationCache.add not available');
        }
        renderNotifications();
    }

    // ─── تحديث إشعار في الكاش ───
    function updateNotificationInCache(id, updates) {
        console.log('🔄 [updateNotificationInCache] Updating notification:', id);
        const cache = window.NotificationCache;
        if (cache && typeof cache.update === 'function') {
            cache.update(id, updates);
        }
        renderNotifications();
    }

    // ─── Realtime ───
    async function setupRealtime() {
        const userId = await getCurrentUserId();
        if (!userId || !supabaseClient) {
            console.log('⏳ Realtime skipped - no user or client');
            return;
        }
        
        if (authChannel) {
            await supabaseClient.removeChannel(authChannel);
            authChannel = null;
        }
        
        const channel = supabaseClient
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => {
                    const newNotif = payload.new;
                    console.log('📨 [Realtime] New notification received:', newNotif.id);
                    addNotificationToCache(newNotif);
                    if (window.NotificationService && window.NotificationService._showToast) {
                        window.NotificationService._showToast(newNotif);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => {
                    const updated = payload.new;
                    console.log('🔄 [Realtime] Notification updated:', updated.id);
                    updateNotificationInCache(updated.id, updated);
                }
            )
            .subscribe();
            
        authChannel = channel;
        console.log('✅ Realtime subscription active for user:', userId);
    }

    // ─── OneSignal ───
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
                    console.log('📨 [OneSignal] Notification received:', notification.id);
                    addNotificationToCache(notification);
                });
            }
        } catch (e) {
            console.warn('⚠️ OneSignal setup skipped:', e.message);
        }
    }

    // ─── مستمع المصادقة ───
    function setupAuthListener() {
        if (!supabaseClient) return;
        
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
                console.log('🔄 User signed in, refreshing notifications');
                const data = await fetchNotificationsWithRetry(3);
                if (data && data.length > 0) {
                    const cache = window.NotificationCache;
                    if (cache && typeof cache.init === 'function') {
                        cache.init(data);
                    }
                    renderNotifications();
                    await setupRealtime();
                    await updateBadge();
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('🧹 User signed out, clearing notifications');
                const cache = window.NotificationCache;
                if (cache && typeof cache.clear === 'function') {
                    cache.clear();
                }
                renderNotifications();
                const badge = document.getElementById('notificationBadge');
                if (badge) badge.textContent = '0';
                if (authChannel) {
                    await supabaseClient.removeChannel(authChannel);
                    authChannel = null;
                }
            }
        });
    }

    // ─── التهيئة الرئيسية ───
    async function init() {
        if (!document.getElementById('notificationsList')) {
            console.log('ℹ️ support-notifications: skipped – no notificationsList element.');
            return;
        }

        console.log('🚀 Initializing Notification System (RLS-safe)...');

        try {
            // 1. الحصول على Supabase
            supabaseClient = await getSupabaseClient();
            if (!supabaseClient) {
                console.error('❌ Supabase client not available');
                return;
            }
            console.log('✅ Supabase client obtained');

            // 2. التحقق من الجلسة الحالية
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                console.log('👤 User already logged in:', session.user.id);
            } else {
                console.log('👤 No active session - notifications will be loaded after login');
            }

            // 3. تهيئة NotificationService إن وجد
            if (window.NotificationService && typeof window.NotificationService.init === 'function') {
                await window.NotificationService.init(supabaseClient);
            }

            // 4. تهيئة NotificationManager (إذا كان موجوداً)
            const manager = window.NotificationManager;
            if (manager && typeof manager.init === 'function') {
                await manager.init();
            }

            // 5. جلب الإشعارات الأولية مع إعادة المحاولة
            let initialData = [];
            try {
                initialData = await fetchNotificationsWithRetry(3);
                if (initialData && initialData.length > 0) {
                    const cache = window.NotificationCache;
                    if (cache && typeof cache.init === 'function') {
                        cache.init(initialData);
                        console.log(`✅ Loaded ${initialData.length} initial notifications into cache`);
                    } else {
                        console.warn('⚠️ NotificationCache.init not available');
                    }
                } else {
                    console.log('ℹ️ No notifications found in database');
                }
            } catch (e) {
                console.warn('⚠️ Initial fetch failed:', e.message);
            }

            // 6. تهيئة UI
            if (window.NotificationUI && typeof window.NotificationUI.init === 'function') {
                window.NotificationUI.init();
            }

            // 7. عرض الإشعارات
            renderNotifications();

            // 8. ربط Realtime (فقط إذا كان هناك مستخدم)
            if (session) {
                await setupRealtime();
            }

            // 9. OneSignal (إن وجد)
            await setupOneSignal();

            // 10. تحديث العداد
            await updateBadge();

            // 11. السجل
            if (window.NotificationHistory && typeof window.NotificationHistory.load === 'function') {
                window.NotificationHistory.load(1);
            }

            // 12. الإعدادات
            initSettings();

            // 13. الاستماع لأحداث المصادقة
            setupAuthListener();

            console.log('✅ Notification System ready');

        } catch (err) {
            console.error('❌ Notification System init failed:', err);
        }
    }

    // ─── دوال للاستخدام في HTML ───
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
