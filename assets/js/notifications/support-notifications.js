/**
 * support-notifications.js – تهيئة مركز الإشعارات مع RLS-safe
 * تم فصله من HTML إلى ملف مستقل
 * يعتمد على withAuth لتجنب 403 ولا يرسل user_id في الفلتر
 */
(function() {
    'use strict';

    if (window.__supportNotificationsReady) return;
    window.__supportNotificationsReady = true;

    let supabaseClient = null;
    let authChannel = null;

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

    // ─── جلب الإشعارات باستخدام withAuth ───
    async function fetchNotifications() {
        return withAuth(async (session) => {
            const { data, error } = await supabaseClient
                .from('notifications')
                .select('*')
                .is('deleted_at', null)          // ✅ إصلاح: استخدام is بدلاً من eq
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data;
        });
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
            const filtered = window.NotificationFilters?.apply(all) || all;
            if (window.NotificationUI && typeof window.NotificationUI.render === 'function') {
                window.NotificationUI.render(filtered, 1);
                window.NotificationUI.updateStats(cache.getStats());
            }
        }
    }

    // ─── Realtime ───
    async function setupRealtime() {
        const userId = await getCurrentUserId();
        if (!userId || !supabaseClient) return;
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
                    if (window.NotificationCache?.add) window.NotificationCache.add(newNotif);
                    if (window.NotificationManager?.addNotification) window.NotificationManager.addNotification(newNotif);
                    renderNotifications();
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
                    if (window.NotificationCache?.update) window.NotificationCache.update(updated.id, updated);
                    if (window.NotificationManager?.updateNotification) window.NotificationManager.updateNotification(updated.id, updated);
                    renderNotifications();
                }
            )
            .subscribe();
        authChannel = channel;
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

    // ─── مستمع المصادقة ───
    function setupAuthListener() {
        if (!supabaseClient) return;
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state changed:', event);
            if (event === 'SIGNED_IN' && session) {
                const data = await fetchNotifications();
                if (data) {
                    if (window.NotificationCache?.init) window.NotificationCache.init(data);
                    if (window.NotificationManager?.clear) window.NotificationManager.clear();
                    data.forEach(n => window.NotificationManager?.addNotification(n));
                    renderNotifications();
                    await setupRealtime();
                    await updateBadge();
                }
            } else if (event === 'SIGNED_OUT') {
                if (window.NotificationCache?.clear) window.NotificationCache.clear();
                if (window.NotificationManager?.clear) window.NotificationManager.clear();
                renderNotifications();
                const badge = document.getElementById('notificationBadge');
                if (badge) badge.textContent = '0';
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

            // 2. تهيئة NotificationService إن وجد
            if (window.NotificationService && typeof window.NotificationService.init === 'function') {
                await window.NotificationService.init(supabaseClient);
            }

            // 3. تهيئة NotificationManager (إذا لم يكن له init، نضيفها)
            const manager = window.NotificationManager;
            if (manager) {
                if (typeof manager.init !== 'function') {
                    manager.init = function() {
                        console.log('NotificationManager.init (fallback) called');
                    };
                }
                manager.init();
            }

            // 4. جلب الإشعارات الأولية (بطريقة آمنة)
            let initialData = [];
            try {
                const data = await fetchNotifications();
                if (data) {
                    initialData = data;
                    if (window.NotificationCache && typeof window.NotificationCache.init === 'function') {
                        window.NotificationCache.init(initialData);
                    }
                    if (manager && typeof manager.addNotification === 'function') {
                        initialData.forEach(n => manager.addNotification(n));
                    }
                }
            } catch (e) {
                console.warn('⚠️ Initial fetch failed:', e.message);
            }

            // 5. تهيئة UI
            if (window.NotificationUI && typeof window.NotificationUI.init === 'function') {
                window.NotificationUI.init();
            }

            // 6. عرض الإشعارات
            renderNotifications();

            // 7. ربط Realtime
            await setupRealtime();

            // 8. OneSignal (إن وجد)
            await setupOneSignal();

            // 9. الاستماع لتغييرات المدير
            if (manager && typeof manager.on === 'function') {
                manager.on('state:changed', () => {
                    renderNotifications();
                });
            }

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

            console.log('✅ Notification System ready (with 403 prevention)');

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
