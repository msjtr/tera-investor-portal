/**
 * ============================================================
 * notification-actions.js – CRUD موحد (مُصلح)
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationActions) return;
    window.__notificationActions = true;

    // ─── مراجع للوحدات الأخرى ───
    function getAPI() { return window.NotificationAPI; }
    function getCache() { return window.NotificationCache; }

    // ─── تعليم كمقروء (فردي) ───
    async function markAsRead(id) {
        if (!id) return { success: false, error: 'معرف الإشعار مطلوب' };

        try {
            const api = getAPI();
            const cache = getCache();

            if (api && typeof api.updateNotification === 'function') {
                await api.updateNotification(id, {
                    status: 'read',
                    is_read: true,
                    read_at: new Date().toISOString()
                });
            }

            if (cache && typeof cache.markAsRead === 'function') {
                cache.markAsRead(id);
            }

            // إطلاق حدث تحديث
            document.dispatchEvent(new CustomEvent('notification:updated', { detail: { id, status: 'read' } }));

            return { success: true };
        } catch (err) {
            console.error('❌ markAsRead error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── أرشفة ───
    async function archive(id) {
        if (!id) return { success: false, error: 'معرف الإشعار مطلوب' };

        try {
            const api = getAPI();
            const cache = getCache();

            if (api && typeof api.updateNotification === 'function') {
                await api.updateNotification(id, {
                    status: 'archived',
                    archived_at: new Date().toISOString()
                });
            }

            if (cache && typeof cache.archive === 'function') {
                cache.archive(id);
            }

            document.dispatchEvent(new CustomEvent('notification:updated', { detail: { id, status: 'archived' } }));

            return { success: true };
        } catch (err) {
            console.error('❌ archive error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── حذف ───
    async function deleteNotification(id) {
        if (!id) return { success: false, error: 'معرف الإشعار مطلوب' };

        try {
            const api = getAPI();
            const cache = getCache();

            if (api && typeof api.updateNotification === 'function') {
                await api.updateNotification(id, {
                    status: 'deleted',
                    deleted_at: new Date().toISOString()
                });
            }

            if (cache && typeof cache.delete === 'function') {
                cache.delete(id);
            }

            document.dispatchEvent(new CustomEvent('notification:deleted', { detail: { id } }));

            return { success: true };
        } catch (err) {
            console.error('❌ deleteNotification error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── API العامة ───
    window.NotificationActions = {
        markAsRead,
        archive,
        deleteNotification
    };

    console.log('✅ notification-actions.js ready');
})();
