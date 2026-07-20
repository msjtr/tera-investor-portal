// ============================================================
// notification-actions.js – CRUD موحد
// ============================================================
// جميع عمليات الإشعارات (قراءة، تحديث، حذف، أرشفة)
// ============================================================

(function() {
    'use strict';

    if (window.__notificationActions) return;
    window.__notificationActions = true;

    // ─── مراجع للوحدات الأخرى ───
    function getAPI() { return window.NotificationAPI; }
    function getCache() { return window.NotificationCache; }
    function getManager() { return window.NotificationManager; }

    // ─── تعليم كمقروء (فردي) ───
    async function markAsRead(id) {
        if (!id) return { success: false, error: 'معرف الإشعار مطلوب' };

        try {
            const api = getAPI();
            const cache = getCache();

            // تحديث في قاعدة البيانات
            const result = await api.updateNotification(id, {
                status: 'read',
                is_read: true,
                read_at: new Date().toISOString()
            });

            // تحديث الكاش
            cache.markAsRead(id);

            // إطلاق حدث
            if (getManager()) {
                getManager().onNotificationUpdated?.({ id, status: 'read' });
            }

            return { success: true, data: result };
        } catch (err) {
            console.error('❌ markAsRead error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── تعليم كمقروء (متعدد) ───
    async function markAllAsRead(ids) {
        if (!ids || ids.length === 0) {
            return { success: false, error: 'يجب تحديد إشعارات أولاً' };
        }

        try {
            const api = getAPI();
            const cache = getCache();

            // تحديث لكل إشعار
            const promises = ids.map(id =>
                api.updateNotification(id, {
                    status: 'read',
                    is_read: true,
                    read_at: new Date().toISOString()
                })
            );
            await Promise.all(promises);

            // تحديث الكاش
            cache.markAllAsRead(ids);

            return { success: true, count: ids.length };
        } catch (err) {
            console.error('❌ markAllAsRead error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── أرشفة إشعار ───
    async function archive(id) {
        if (!id) return { success: false, error: 'معرف الإشعار مطلوب' };

        try {
            const api = getAPI();
            const cache = getCache();

            const result = await api.updateNotification(id, {
                status: 'archived',
                archived_at: new Date().toISOString()
            });

            cache.archive(id);

            return { success: true, data: result };
        } catch (err) {
            console.error('❌ archive error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── أرشفة متعددة ───
    async function archiveMultiple(ids) {
        if (!ids || ids.length === 0) {
            return { success: false, error: 'يجب تحديد إشعارات أولاً' };
        }

        try {
            const api = getAPI();
            const cache = getCache();

            const promises = ids.map(id =>
                api.updateNotification(id, {
                    status: 'archived',
                    archived_at: new Date().toISOString()
                })
            );
            await Promise.all(promises);

            ids.forEach(id => cache.archive(id));

            return { success: true, count: ids.length };
        } catch (err) {
            console.error('❌ archiveMultiple error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── حذف إشعار ───
    async function deleteNotification(id) {
        if (!id) return { success: false, error: 'معرف الإشعار مطلوب' };

        try {
            const api = getAPI();
            const cache = getCache();

            const result = await api.updateNotification(id, {
                status: 'deleted',
                deleted_at: new Date().toISOString()
            });

            cache.delete(id);

            return { success: true, data: result };
        } catch (err) {
            console.error('❌ deleteNotification error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── حذف متعدد ───
    async function deleteMultiple(ids) {
        if (!ids || ids.length === 0) {
            return { success: false, error: 'يجب تحديد إشعارات أولاً' };
        }

        try {
            const api = getAPI();
            const cache = getCache();

            const promises = ids.map(id =>
                api.updateNotification(id, {
                    status: 'deleted',
                    deleted_at: new Date().toISOString()
                })
            );
            await Promise.all(promises);

            cache.deleteMultiple(ids);

            return { success: true, count: ids.length };
        } catch (err) {
            console.error('❌ deleteMultiple error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── جلب الإشعارات من الخادم ───
    async function fetchNotifications(force = false) {
        try {
            const api = getAPI();
            const cache = getCache();

            // استخدام الكاش إذا كان موجوداً وليس force
            if (!force && cache.size() > 0) {
                return { success: true, data: cache.getAll(), fromCache: true };
            }

            const result = await api.fetchNotifications();

            if (result?.data) {
                cache.init(result.data);
                return { success: true, data: result.data, fromCache: false };
            }

            return { success: false, error: 'لا توجد بيانات' };
        } catch (err) {
            console.error('❌ fetchNotifications error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── إرسال إشعار جديد ───
    async function sendNotification(data) {
        try {
            const api = getAPI();
            const result = await api.sendNotification(data);

            if (result?.notificationId) {
                // إضافة إلى الكاش (سيتم عبر Realtime أيضاً)
                return { success: true, notificationId: result.notificationId };
            }

            return { success: false, error: 'فشل إرسال الإشعار' };
        } catch (err) {
            console.error('❌ sendNotification error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── API العامة ───
    window.NotificationActions = {
        markAsRead,
        markAllAsRead,
        archive,
        archiveMultiple,
        deleteNotification,
        deleteMultiple,
        fetchNotifications,
        sendNotification
    };

    console.log('✅ notification-actions.js ready');

})();
