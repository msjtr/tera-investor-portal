/**
 * ============================================================
 * support-notifications.js – تهيئة نظام الإشعارات
 * ============================================================
 * ملف التهيئة فقط، جميع المنطق في الوحدات المستقلة
 */

(function() {
    'use strict';

    if (window.__supportNotificationsReady) return;
    window.__supportNotificationsReady = true;

    // ─── انتظار تحميل جميع الوحدات ───
    async function waitForModules() {
        const modules = [
            'NotificationManager',
            'NotificationAPI',
            'OneSignalManager',
            'RealtimeManager',
            'NotificationCache',
            'NotificationActions',
            'NotificationUI',
            'NotificationFilters',
            'NotificationHistory'
        ];

        for (const name of modules) {
            let attempts = 0;
            while (!window[name] && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            if (!window[name]) {
                console.warn(`⚠️ Module ${name} not loaded after waiting`);
            }
        }
    }

    // ─── التهيئة ───
    async function init() {
        console.log('🚀 Initializing Notification System...');

        try {
            // 1. انتظار الوحدات
            await waitForModules();

            const manager = window.NotificationManager;
            const api = window.NotificationAPI;
            const onesignal = window.OneSignalManager;
            const realtime = window.RealtimeManager;

            // 2. تهيئة المدير
            await manager.init();

            // 3. انتظار OneSignal (بدون تهيئة)
            try {
                const OneSignal = await onesignal.waitForOneSignal();
                if (OneSignal) {
                    const user = await window.Auth?.getCurrentUser?.();
                    if (user?.id) {
                        await onesignal.setExternalId(user.id);
                    }
                    onesignal.addListener(async (notification) => {
                        manager.addNotification(notification);
                    });
                }
            } catch (err) {
                console.warn('⚠️ OneSignal not available:', err.message);
            }

            // 4. جلب الإشعارات الأولية
            const result = await api.fetchNotifications();
            if (result?.data) {
                result.data.forEach(n => manager.addNotification(n));
            }

            // 5. بدء Realtime
            const user = await window.Auth?.getCurrentUser?.();
            if (user?.id) {
                await realtime.start(
                    user.id,
                    (newNotif) => {
                        manager.addNotification(newNotif);
                    },
                    (updatedNotif) => {
                        manager.updateNotification(updatedNotif.id, updatedNotif);
                    }
                );
            }

            // 6. الاستماع لتغييرات الحالة وتحديث الواجهة
            manager.on('state:changed', (state) => {
                updateUI(state);
            });

            console.log('✅ Notification System ready');

        } catch (err) {
            console.error('❌ Notification System initialization failed:', err);
        }
    }

    // ─── تحديث الواجهة ───
    function updateUI(state) {
        // تحديث العداد
        const badges = document.querySelectorAll('.badge-count, #unreadBadge');
        badges.forEach(el => {
            if (el) {
                el.textContent = state.unreadCount;
                el.style.display = state.unreadCount > 0 ? 'inline-block' : 'none';
            }
        });

        // تحديث الإحصائيات
        const stats = {
            total: document.getElementById('statTotal'),
            unread: document.getElementById('statUnread'),
            read: document.getElementById('statRead'),
            archived: document.getElementById('statArchived'),
            important: document.getElementById('statImportant')
        };

        if (stats.total) stats.total.textContent = state.totalCount;
        if (stats.unread) stats.unread.textContent = state.unreadCount;
        if (stats.read) stats.read.textContent = state.cache.filter(n => n.status === 'read').length;
        if (stats.archived) stats.archived.textContent = state.cache.filter(n => n.status === 'archived').length;
        if (stats.important) stats.important.textContent = state.cache.filter(n => n.priority === 'urgent' || n.priority === 'high').length;

        // تحديث عنوان الصفحة
        document.title = state.unreadCount > 0 ? `(${state.unreadCount}) مركز الإشعارات | Tera` : 'مركز الإشعارات | Tera';
    }

    // ─── التشغيل ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ─── تصدير API عامة للاستخدام في HTML ───
    window.__openDetail = (id) => {
        console.log('📖 Open notification detail:', id);
    };

    window.__deleteNotification = async (id) => {
        const manager = window.NotificationManager;
        if (manager) {
            await window.NotificationAPI.updateNotification(id, { status: 'deleted' });
            manager.deleteNotification(id);
        }
    };

    console.log('✅ support-notifications.js ready');
})();
