/**
 * ============================================================
 * support-notifications.js – تهيئة نظام الإشعارات
 * ============================================================
 * ملف التهيئة فقط، جميع المنطق في الوحدات المستقلة
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__supportNotificationsReady) return;
    window.__supportNotificationsReady = true;

    // ─── انتظار تحميل جميع الوحدات ───
    async function waitForModules(timeout = 10000) {
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

        const startTime = Date.now();

        for (const name of modules) {
            let attempts = 0;
            while (!window[name] && attempts < 20 && (Date.now() - startTime) < timeout) {
                await new Promise(resolve => setTimeout(resolve, 300));
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

            if (!manager || !api) {
                throw new Error('Core modules not loaded');
            }

            // 2. تهيئة المدير
            await manager.init();

            // 3. OneSignal (استخدام التهيئة الموجودة فقط)
            try {
                if (onesignal && typeof onesignal.waitForOneSignal === 'function') {
                    const OneSignalInstance = await onesignal.waitForOneSignal(10000);
                    if (OneSignalInstance) {
                        const user = await window.Auth?.getCurrentUser?.();
                        if (user?.id) {
                            await onesignal.setExternalId(user.id);
                        }
                        // إضافة مستمع للإشعارات الواردة
                        await onesignal.addListener(async (notification) => {
                            manager.addNotification(notification);
                        });
                    }
                } else {
                    console.warn('⚠️ OneSignalManager not available or missing waitForOneSignal');
                }
            } catch (err) {
                console.warn('⚠️ OneSignal initialization skipped:', err.message);
            }

            // 4. جلب الإشعارات الأولية
            try {
                const result = await api.fetchNotifications();
                if (result?.data) {
                    result.data.forEach(n => manager.addNotification(n));
                }
            } catch (err) {
                console.warn('⚠️ Failed to fetch initial notifications:', err.message);
            }

            // 5. بدء Realtime
            try {
                const user = await window.Auth?.getCurrentUser?.();
                if (user?.id && realtime && typeof realtime.start === 'function') {
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
            } catch (err) {
                console.warn('⚠️ Realtime connection failed:', err.message);
            }

            // 6. الاستماع لتغييرات الحالة
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

        const cache = state.cache || [];
        const unreadCount = state.unreadCount || 0;
        const totalCount = state.totalCount || cache.length;
        const readCount = cache.filter(n => n.status === 'read').length;
        const archivedCount = cache.filter(n => n.status === 'archived').length;
        const importantCount = cache.filter(n => n.priority === 'urgent' || n.priority === 'high').length;

        if (stats.total) stats.total.textContent = totalCount;
        if (stats.unread) stats.unread.textContent = unreadCount;
        if (stats.read) stats.read.textContent = readCount;
        if (stats.archived) stats.archived.textContent = archivedCount;
        if (stats.important) stats.important.textContent = importantCount;

        // تحديث عنوان الصفحة
        document.title = unreadCount > 0 ? `(${unreadCount}) مركز الإشعارات | Tera` : 'مركز الإشعارات | Tera';
    }

    // ─── التشغيل ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // إذا كان DOM جاهزاً بالفعل، شغل التهيئة فوراً
        init();
    }

    // ─── تصدير API عامة للاستخدام في HTML ───
    window.__openDetail = (id) => {
        console.log('📖 Open notification detail:', id);
        // يمكن توسيعها لفتح الـ Modal
        const manager = window.NotificationManager;
        if (manager) {
            const notification = manager.getState().cache.find(n => n.id === id);
            if (notification) {
                window.NotificationUI?.openDetail?.(notification);
            }
        }
    };

    window.__deleteNotification = async (id) => {
        const manager = window.NotificationManager;
        if (manager) {
            await window.NotificationAPI?.updateNotification?.(id, { status: 'deleted' });
            manager.deleteNotification(id);
        }
    };

    window.__refreshNotifications = async () => {
        const manager = window.NotificationManager;
        if (manager) {
            const api = window.NotificationAPI;
            const result = await api.fetchNotifications(true);
            if (result?.data) {
                manager.getState().cache = [];
                result.data.forEach(n => manager.addNotification(n));
            }
        }
    };

    console.log('✅ support-notifications.js ready');

})();
