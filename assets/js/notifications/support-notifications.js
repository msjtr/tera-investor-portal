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

    // ─── ربط OneSignal بالمستخدم الحالي ───
    async function linkOneSignalUser(onesignal) {
        try {
            const user = await window.Auth?.getCurrentUser?.();
            if (user?.id) {
                await onesignal.setExternalId(user.id); // يستخدم OneSignal.login()
                return true;
            }
            return false;
        } catch (err) {
            console.warn('⚠️ Failed to link OneSignal user:', err.message);
            return false;
        }
    }

    // ─── ربط أزرار شريط الأدوات ───
    function bindToolbarButtons() {
        const selectAllBtn = document.getElementById('selectAllBtn');
        const markReadBtn = document.getElementById('markReadBtn');
        const archiveBtn = document.getElementById('archiveBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        const refreshBtn = document.getElementById('refreshBtn');

        // تحديد الكل
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                const cards = document.querySelectorAll('.notification-card');
                const allIds = Array.from(cards).map(el => el.dataset.id).filter(id => id);
                if (allIds.length === 0) return;

                const manager = window.NotificationManager;
                if (!manager) return;
                const state = manager.getState();
                const allSelected = allIds.every(id => state.selected.has(id));

                if (allSelected) {
                    state.selected.clear();
                } else {
                    allIds.forEach(id => state.selected.add(id));
                }

                cards.forEach(el => {
                    const id = el.dataset.id;
                    if (state.selected.has(id)) {
                        el.style.borderLeft = '4px solid var(--primary)';
                        el.classList.add('selected');
                    } else {
                        el.style.borderLeft = '';
                        el.classList.remove('selected');
                    }
                });

                selectAllBtn.innerHTML = state.selected.size > 0 ?
                    '<i class="fas fa-check-square"></i> إلغاء التحديد' :
                    '<i class="fas fa-check-double"></i> تحديد الكل';
            });
        }

        // تعليم كمقروء (للمحددين)
        if (markReadBtn) {
            markReadBtn.addEventListener('click', async () => {
                const manager = window.NotificationManager;
                if (!manager) return;
                const selected = Array.from(manager.getState().selected);
                if (selected.length === 0) {
                    alert('يرجى تحديد إشعارات أولاً');
                    return;
                }
                if (!confirm(`هل تريد تعليم ${selected.length} إشعار كمقروء؟`)) return;

                for (const id of selected) {
                    await window.NotificationActions.markAsRead(id);
                }
                manager.getState().selected.clear();
                // تحديث القائمة
                if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                    window.NotificationUI.refresh();
                }
                // تحديث العداد
                await window.Support?.updateNotificationBadge?.();
            });
        }

        // أرشفة (للمحددين)
        if (archiveBtn) {
            archiveBtn.addEventListener('click', async () => {
                const manager = window.NotificationManager;
                if (!manager) return;
                const selected = Array.from(manager.getState().selected);
                if (selected.length === 0) {
                    alert('يرجى تحديد إشعارات أولاً');
                    return;
                }
                if (!confirm(`هل تريد أرشفة ${selected.length} إشعار؟`)) return;

                for (const id of selected) {
                    await window.NotificationActions.archive(id);
                }
                manager.getState().selected.clear();
                if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                    window.NotificationUI.refresh();
                }
                await window.Support?.updateNotificationBadge?.();
            });
        }

        // حذف (للمحددين)
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const manager = window.NotificationManager;
                if (!manager) return;
                const selected = Array.from(manager.getState().selected);
                if (selected.length === 0) {
                    alert('يرجى تحديد إشعارات أولاً');
                    return;
                }
                if (!confirm(`هل تريد حذف ${selected.length} إشعار نهائياً؟`)) return;

                for (const id of selected) {
                    await window.NotificationActions.deleteNotification(id);
                }
                manager.getState().selected.clear();
                if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                    window.NotificationUI.refresh();
                }
                await window.Support?.updateNotificationBadge?.();
            });
        }

        // تحديث (Refresh)
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                    window.NotificationUI.refresh();
                }
                // إعادة تحميل من الخادم
                window.NotificationAPI?.fetchNotifications(true).then(result => {
                    if (result?.data) {
                        const manager = window.NotificationManager;
                        if (manager) {
                            manager.getState().cache = [];
                            result.data.forEach(n => manager.addNotification(n));
                        }
                    }
                });
            });
        }

        console.log('✅ Toolbar buttons bound');
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
            let oneSignalReady = false;
            try {
                if (onesignal && typeof onesignal.waitForOneSignal === 'function') {
                    const OneSignalInstance = await onesignal.waitForOneSignal(10000);
                    if (OneSignalInstance) {
                        await linkOneSignalUser(onesignal);

                        // إضافة مستمع للإشعارات الواردة
                        await onesignal.addListener(async (notification) => {
                            manager.addNotification(notification);
                        });

                        oneSignalReady = true;
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

            // 5. عرض الإشعارات في الواجهة
            if (window.NotificationUI && typeof window.NotificationUI.render === 'function') {
                const cache = window.NotificationCache;
                if (cache) {
                    const all = cache.getAll();
                    window.NotificationUI.render(all, 1, 20);
                } else {
                    // إذا لم يكن الكاش جاهزاً، استخدم المدير
                    const state = manager.getState();
                    window.NotificationUI.render(state.cache, 1, 20);
                }
            }

            // 6. ربط أزرار شريط الأدوات
            bindToolbarButtons();

            // 7. بدء Realtime
            try {
                const user = await window.Auth?.getCurrentUser?.();
                if (user?.id && realtime && typeof realtime.start === 'function') {
                    await realtime.start(
                        user.id,
                        (newNotif) => {
                            manager.addNotification(newNotif);
                            // تحديث الواجهة عند إضافة جديد
                            if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                                window.NotificationUI.refresh();
                            }
                        },
                        (updatedNotif) => {
                            manager.updateNotification(updatedNotif.id, updatedNotif);
                            if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                                window.NotificationUI.refresh();
                            }
                        }
                    );
                }
            } catch (err) {
                console.warn('⚠️ Realtime connection failed:', err.message);
            }

            // 8. الاستماع لتغييرات الحالة
            manager.on('state:changed', (state) => {
                updateUI(state);
                // تحديث الواجهة عند تغير الحالة
                if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                    window.NotificationUI.refresh();
                }
            });

            // 9. الاستماع لتغييرات تسجيل الدخول/الخروج لتحديث OneSignal
            if (window.Auth && typeof window.Auth.onAuthStateChange === 'function') {
                window.Auth.onAuthStateChange(async (event, session) => {
                    if (event === 'SIGNED_IN' && session?.user) {
                        if (oneSignalReady && onesignal) {
                            await linkOneSignalUser(onesignal);
                        }
                    } else if (event === 'SIGNED_OUT') {
                        if (oneSignalReady && onesignal && typeof onesignal.logout === 'function') {
                            await onesignal.logout();
                        }
                    }
                });
            }

            console.log('✅ Notification System ready');

        } catch (err) {
            console.error('❌ Notification System initialization failed:', err);
        }
    }

    // ─── تحديث الواجهة (الإحصائيات والعدادات) ───
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
        const manager = window.NotificationManager;
        if (manager) {
            const notification = manager.getState().cache.find(n => n.id === id);
            if (notification && window.NotificationUI && typeof window.NotificationUI.openDetail === 'function') {
                window.NotificationUI.openDetail(notification);
            } else if (notification) {
                console.warn('⚠️ NotificationUI not available, cannot open detail');
            }
        }
    };

    window.__deleteNotification = async (id) => {
        const manager = window.NotificationManager;
        if (manager) {
            await window.NotificationAPI?.updateNotification?.(id, { status: 'deleted' });
            manager.deleteNotification(id);
            if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                window.NotificationUI.refresh();
            }
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
