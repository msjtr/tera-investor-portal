/**
 * support-notifications.js – تهيئة مركز الإشعارات مع RLS-safe
 * تم فصله من HTML إلى ملف مستقل
 * يعتمد على withAuth لتجنب 403 ولا يرسل user_id في الفلتر
 * تم إصلاح: استخدام .is('deleted_at', null) بدلاً من .eq
 * إضافة رسائل تصحيح لتتبع الجلسة
 * استخدام NotificationCache و NotificationUI بشكل صحيح
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
            
            if (error) {
                console.warn('⚠️ [withAuth] Session error:', error.message);
                return null;
            }
            
            if (!session) {
                console.warn('⏳ [withAuth] No active session - user is not logged in');
                return null;
            }
            
            console.log('✅ [withAuth] Session active for user:', session.user.id);
            return await callback(session);
            
        } catch (e) {
            console.warn('⚠️ [withAuth] Unexpected error:', e.message);
            return null;
        }
    }

    // ─── جلب الإشعارات ───
    async function fetchNotifications() {
        console.log('🔍 [fetchNotifications] Attempting to fetch notifications...');
        
        const result = await withAuth(async (session) => {
            console.log('🔍 [fetchNotifications] Executing query for user:', session.user.id);
            
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
            
            console.log(`✅ [fetchNotifications] Fetched ${data?.length || 0} notifications`);
            return data;
        });
        
        if (result === null) {
            console.warn('⏳ [fetchNotifications] Skipped - no active session');
        }
        
        return result || [];
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
            if (badge) {
                const unreadCount = stats.unread || 0;
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'inline' : 'none';
            }
            // تحديث الإحصائيات في الواجهة
            updateStatsDisplay(stats);
        }
    }

    // ─── تحديث عرض الإحصائيات ───
    function updateStatsDisplay(stats) {
        const totalEl = document.getElementById('statTotal');
        const unreadEl = document.getElementById('statUnread');
        const readEl = document.getElementById('statRead');
        const importantEl = document.getElementById('statImportant');
        const archivedEl = document.getElementById('statArchived');
        
        if (totalEl) totalEl.textContent = stats.total || 0;
        if (unreadEl) unreadEl.textContent = stats.unread || 0;
        if (readEl) readEl.textContent = (stats.total || 0) - (stats.unread || 0);
        // للأسف important و archived غير موجودين في stats، نضع 0 مؤقتاً
        if (importantEl) importantEl.textContent = 0;
        if (archivedEl) archivedEl.textContent = 0;
    }

    // ─── عرض الإشعارات ───
    function renderNotifications() {
        const cache = window.NotificationCache;
        if (!cache) {
            console.warn('⚠️ NotificationCache not available');
            return;
        }
        
        if (typeof cache.getAll !== 'function') {
            console.warn('⚠️ NotificationCache.getAll is not a function');
            return;
        }
        
        const all = cache.getAll();
        console.log(`📊 Rendering ${all.length} notifications`);
        
        const filtered = window.NotificationFilters?.apply(all) || all;
        
        if (window.NotificationUI && typeof window.NotificationUI.render === 'function') {
            window.NotificationUI.render(filtered, 1);
            if (typeof window.NotificationUI.updateStats === 'function') {
                const stats = typeof cache.getStats === 'function' ? cache.getStats() : { total: all.length, unread: 0 };
                window.NotificationUI.updateStats(stats);
            }
        }
        
        // تحديث الإحصائيات
        if (typeof cache.getStats === 'function') {
            updateStatsDisplay(cache.getStats());
        }
        
        // تحديث العداد
        updateBadge();
    }

    // ─── إضافة إشعار للكاش ───
    function addNotificationToCache(notification) {
        const cache = window.NotificationCache;
        if (cache && typeof cache.add === 'function') {
            cache.add(notification);
        }
        renderNotifications();
    }

    // ─── تحديث إشعار في الكاش ───
    function updateNotificationInCache(id, updates) {
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
                    console.log('📨 New notification via Realtime:', newNotif.id);
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
                    console.log('🔄 Updated notification via Realtime:', updated.id);
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
                    console.log('📨 OneSignal notification received:', notification);
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
                const data = await fetchNotifications();
                const cache = window.NotificationCache;
                if (cache && typeof cache.init === 'function') {
                    cache.init(data);
                }
                renderNotifications();
                await setupRealtime();
                await updateBadge();
            } else if (event === 'SIGNED_OUT') {
                console.log('🧹 User signed out, clearing notifications');
                const cache = window.NotificationCache;
                if (cache && typeof cache.clear === 'function') {
                    cache.clear();
                }
                renderNotifications();
                const badge = document.getElementById('notificationBadge');
                if (badge) {
                    badge.textContent = '0';
                    badge.style.display = 'none';
                }
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

            // 5. جلب الإشعارات الأولية
            let initialData = [];
            try {
                const data = await fetchNotifications();
                if (data && data.length > 0) {
                    initialData = data;
                    console.log(`✅ Fetched ${initialData.length} notifications from database`);
                } else {
                    console.log('ℹ️ No notifications found in database');
                }
            } catch (e) {
                console.warn('⚠️ Initial fetch failed:', e.message);
            }

            // 6. تهيئة الكاش (بغض النظر عن وجود بيانات)
            const cache = window.NotificationCache;
            if (cache && typeof cache.init === 'function') {
                console.log('📦 Initializing NotificationCache with', initialData.length, 'items');
                cache.init(initialData);
            } else {
                console.warn('⚠️ NotificationCache not available or missing init method');
            }

            // 7. تهيئة UI
            if (window.NotificationUI && typeof window.NotificationUI.init === 'function') {
                console.log('🎨 Initializing NotificationUI');
                window.NotificationUI.init();
            }

            // 8. عرض الإشعارات
            renderNotifications();

            // 9. ربط Realtime (فقط إذا كان هناك مستخدم)
            if (session) {
                await setupRealtime();
            }

            // 10. OneSignal (إن وجد)
            await setupOneSignal();

            // 11. تحديث العداد
            await updateBadge();

            // 12. السجل
            if (window.NotificationHistory && typeof window.NotificationHistory.load === 'function') {
                window.NotificationHistory.load(1);
            }

            // 13. الإعدادات
            initSettings();

            // 14. الاستماع لأحداث المصادقة
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
