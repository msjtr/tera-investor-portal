/**
 * ============================================================
 * support-notifications.js – تهيئة نظام الإشعارات (مُصلح بالكامل)
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
                await onesignal.setExternalId(user.id);
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
                await refreshUI();
            });
        }

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
                await refreshUI();
            });
        }

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
                await refreshUI();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const result = await window.NotificationAPI?.fetchNotifications(true);
                if (result?.data) {
                    const manager = window.NotificationManager;
                    if (manager) {
                        manager.getState().cache = [];
                        result.data.forEach(n => manager.addNotification(n));
                    }
                }
                await refreshUI();
            });
        }

        console.log('✅ Toolbar buttons bound');
    }

    // ─── ربط التبويبات ───
    function bindTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        if (!tabs || tabs.length === 0) {
            console.warn('⚠️ No tabs found');
            return;
        }

        tabs.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();

                // إزالة التنشيط عن جميع التبويبات
                tabs.forEach(b => b.classList.remove('active'));

                // تفعيل التبويب المحدد
                this.classList.add('active');

                // إخفاء جميع الألواح
                const panels = document.querySelectorAll('.tab-panel');
                panels.forEach(p => p.classList.remove('active'));

                // إظهار اللوحة المطابقة
                const tabName = this.dataset.tab;
                const targetPanel = document.getElementById(`panel-${tabName}`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                } else {
                    console.warn(`⚠️ Panel panel-${tabName} not found`);
                }

                // تحميل المحتوى حسب التبويب
                if (tabName === 'inbox') {
                    // تحديث قائمة الوارد
                    refreshUI();
                } else if (tabName === 'history') {
                    // تحميل السجل
                    if (window.NotificationHistory && typeof window.NotificationHistory.load === 'function') {
                        window.NotificationHistory.load(1);
                    } else {
                        console.warn('⚠️ NotificationHistory not available');
                    }
                } else if (tabName === 'settings') {
                    // لا حاجة لتحميل شيء
                }
            });
        });

        // تفعيل التبويب النشط افتراضياً (على أساس class active)
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const tabName = activeTab.dataset.tab;
            const targetPanel = document.getElementById(`panel-${tabName}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        }

        console.log('✅ Tabs bound');
    }

    // ─── تحديث الواجهة ───
    async function refreshUI() {
        const manager = window.NotificationManager;
        if (!manager) return;

        const cache = window.NotificationCache;
        let notifications = [];
        if (cache && typeof cache.getAll === 'function') {
            notifications = cache.getAll();
        } else {
            notifications = manager.getState().cache || [];
        }

        // تحديث الإحصائيات
        updateUI(manager.getState());

        // عرض القائمة فقط إذا كان التبويب النشط هو الوارد
        const activeTab = document.querySelector('.tab-btn.active');
        const tabName = activeTab ? activeTab.dataset.tab : 'inbox';
        if (tabName === 'inbox') {
            if (window.NotificationUI && typeof window.NotificationUI.render === 'function') {
                window.NotificationUI.render(notifications, 1, 20);
            } else {
                console.warn('⚠️ NotificationUI.render not available');
            }
        }

        // تحديث العداد
        await window.Support?.updateNotificationBadge?.();
    }

    // ─── تحديث الإحصائيات والعدادات (UI) ───
    function updateUI(state) {
        const badges = document.querySelectorAll('.badge-count, #unreadBadge');
        badges.forEach(el => {
            if (el) {
                el.textContent = state.unreadCount;
                el.style.display = state.unreadCount > 0 ? 'inline-block' : 'none';
            }
        });

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

        document.title = unreadCount > 0 ? `(${unreadCount}) مركز الإشعارات | Tera` : 'مركز الإشعارات | Tera';
    }

    // ─── التهيئة ───
    async function init() {
        console.log('🚀 Initializing Notification System...');

        try {
            await waitForModules();

            const manager = window.NotificationManager;
            const api = window.NotificationAPI;
            const onesignal = window.OneSignalManager;
            const realtime = window.RealtimeManager;

            if (!manager || !api) {
                throw new Error('Core modules not loaded');
            }

            await manager.init();

            // OneSignal
            let oneSignalReady = false;
            try {
                if (onesignal && typeof onesignal.waitForOneSignal === 'function') {
                    const OneSignalInstance = await onesignal.waitForOneSignal(10000);
                    if (OneSignalInstance) {
                        await linkOneSignalUser(onesignal);
                        await onesignal.addListener(async (notification) => {
                            manager.addNotification(notification);
                            await refreshUI();
                        });
                        oneSignalReady = true;
                    }
                }
            } catch (err) {
                console.warn('⚠️ OneSignal initialization skipped:', err.message);
            }

            // جلب الإشعارات الأولية
            let initialData = [];
            try {
                const result = await api.fetchNotifications();
                if (result?.data) {
                    initialData = result.data;
                    initialData.forEach(n => manager.addNotification(n));
                }
            } catch (err) {
                console.warn('⚠️ Failed to fetch initial notifications:', err.message);
            }

            // ربط التبويبات (يجب أن يتم قبل عرض القائمة)
            bindTabs();

            // عرض الإشعارات
            await refreshUI();

            // ربط أزرار شريط الأدوات
            bindToolbarButtons();

            // بدء Realtime
            try {
                const user = await window.Auth?.getCurrentUser?.();
                if (user?.id && realtime && typeof realtime.start === 'function') {
                    await realtime.start(
                        user.id,
                        async (newNotif) => {
                            manager.addNotification(newNotif);
                            await refreshUI();
                        },
                        async (updatedNotif) => {
                            manager.updateNotification(updatedNotif.id, updatedNotif);
                            await refreshUI();
                        }
                    );
                }
            } catch (err) {
                console.warn('⚠️ Realtime connection failed:', err.message);
            }

            // الاستماع لتغييرات الحالة
            manager.on('state:changed', async (state) => {
                updateUI(state);
                const activeTab = document.querySelector('.tab-btn.active');
                const tabName = activeTab ? activeTab.dataset.tab : 'inbox';
                if (tabName === 'inbox') {
                    const cache = window.NotificationCache;
                    if (cache && typeof cache.getAll === 'function') {
                        const all = cache.getAll();
                        if (window.NotificationUI && typeof window.NotificationUI.render === 'function') {
                            window.NotificationUI.render(all, 1, 20);
                        }
                    }
                }
            });

            // Auth state change
            if (window.Auth && typeof window.Auth.onAuthStateChange === 'function') {
                window.Auth.onAuthStateChange(async (event, session) => {
                    if (event === 'SIGNED_IN' && session?.user) {
                        if (oneSignalReady && onesignal) {
                            await linkOneSignalUser(onesignal);
                        }
                        await refreshUI();
                    } else if (event === 'SIGNED_OUT') {
                        if (oneSignalReady && onesignal && typeof onesignal.logout === 'function') {
                            await onesignal.logout();
                        }
                    }
                });
            }

            console.log('✅ Notification System ready');
            console.log(`📊 Total notifications: ${initialData.length}`);

        } catch (err) {
            console.error('❌ Notification System initialization failed:', err);
        }
    }

    // ─── التشغيل ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ─── تصدير API عامة ───
    window.__openDetail = (id) => {
        const manager = window.NotificationManager;
        if (manager) {
            const notification = manager.getState().cache.find(n => n.id === id);
            if (notification && window.NotificationUI && typeof window.NotificationUI.openDetail === 'function') {
                window.NotificationUI.openDetail(notification);
            }
        }
    };

    window.__deleteNotification = async (id) => {
        await window.NotificationActions?.deleteNotification(id);
        await refreshUI();
    };

    window.__refreshNotifications = async () => {
        await refreshUI();
    };

    window.__refreshUI = refreshUI;

    console.log('✅ support-notifications.js ready');
})();
