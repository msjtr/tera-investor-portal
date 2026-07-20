/**
 * ============================================================
 * support-notifications.js – التهيئة النهائية + إعدادات الإشعارات
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__supportNotificationsReady) return;
    window.__supportNotificationsReady = true;

    // ─── إعدادات الإشعارات (التبديلات والحفظ) ───
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

    function bindSaveButton() {
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveSettings);
        }
    }

    function initSettings() {
        loadSettings();
        bindToggles();
        bindSaveButton();
        console.log('✅ Notification settings ready');
    }

    // ─── التهيئة الرئيسية ───
    async function init() {
        console.log('🚀 Initializing Notification System (modules)...');

        try {
            // 1. تهيئة المدير
            const manager = window.NotificationManager;
            if (manager) manager.init();

            // 2. جلب الإشعارات الأولية
            let initialData = [];
            try {
                const result = await window.NotificationAPI?.fetchNotifications();
                if (result?.data) {
                    initialData = result.data;
                    window.NotificationCache?.init(initialData);
                    // إضافة إلى المدير
                    initialData.forEach(n => window.NotificationManager?.addNotification(n));
                }
            } catch (e) {
                console.warn('⚠️ Initial fetch failed:', e.message);
            }

            // 3. تهيئة الواجهة
            window.NotificationUI?.init();

            // 4. عرض الإشعارات
            const cache = window.NotificationCache;
            if (cache) {
                const all = cache.getAll();
                const filtered = window.NotificationFilters?.apply(all) || all;
                window.NotificationUI?.render(filtered, 1);
                window.NotificationUI?.updateStats(cache.getStats());
            }

            // 5. ربط Realtime
            try {
                const user = await window.Auth?.getCurrentUser?.();
                if (user?.id && window.RealtimeManager) {
                    await window.RealtimeManager.start(
                        user.id,
                        (newNotif) => {
                            // INSERT
                            window.NotificationCache?.add(newNotif);
                            window.NotificationManager?.addNotification(newNotif);
                            window.NotificationUI?.refresh();
                        },
                        (updatedNotif) => {
                            // UPDATE
                            window.NotificationCache?.update(updatedNotif.id, updatedNotif);
                            window.NotificationManager?.updateNotification(updatedNotif.id, updatedNotif);
                            window.NotificationUI?.refresh();
                        }
                    );
                }
            } catch (e) {
                console.warn('⚠️ Realtime setup failed:', e.message);
            }

            // 6. OneSignal (بدون إلزام)
            try {
                const os = window.OneSignalManager;
                if (os) {
                    const user = await window.Auth?.getCurrentUser?.();
                    if (user?.id) await os.setExternalId(user.id);
                    await os.addListener((notification) => {
                        window.NotificationManager?.addNotification(notification);
                        window.NotificationUI?.refresh();
                    });
                }
            } catch (e) {
                console.warn('⚠️ OneSignal setup skipped:', e.message);
            }

            // 7. الاستماع لتغييرات المدير
            window.NotificationManager?.on('state:changed', () => {
                window.NotificationUI?.refresh();
            });

            // 8. تحديث العداد العام
            await window.Support?.updateNotificationBadge?.();

            // 9. تحميل السجل إذا كان التبويب نشطاً
            window.NotificationHistory?.load(1);

            // 10. تهيئة إعدادات الإشعارات (التبديلات)
            initSettings();

            console.log('✅ Notification System ready (modules)');

        } catch (err) {
            console.error('❌ Notification System init failed:', err);
        }
    }

    // ─── تصدير دوال مساعدة للاستخدام في HTML ───
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

    // ─── بدء التهيئة ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ support-notifications.js ready');
})();
