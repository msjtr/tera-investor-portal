/**
 * ============================================================
 * notification-actions.js – دوال CRUD
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationActions) return;
    window.__notificationActions = true;

    const cache = window.NotificationCache;
    const api = window.NotificationAPI;

    async function markAsRead(id) {
        try {
            await api.updateNotification(id, { status: 'read', is_read: true, read_at: new Date().toISOString() });
            cache.update(id, { status: 'read', is_read: true, read_at: new Date().toISOString() });
            return { success: true };
        } catch (err) {
            console.error('❌ markAsRead error:', err);
            return { success: false, error: err.message };
        }
    }

    async function archive(id) {
        try {
            await api.updateNotification(id, { status: 'archived', archived_at: new Date().toISOString() });
            cache.update(id, { status: 'archived', archived_at: new Date().toISOString() });
            return { success: true };
        } catch (err) {
            console.error('❌ archive error:', err);
            return { success: false, error: err.message };
        }
    }

    async function deleteNotification(id) {
        try {
            await api.updateNotification(id, { status: 'deleted', deleted_at: new Date().toISOString() });
            cache.delete(id);
            return { success: true };
        } catch (err) {
            console.error('❌ deleteNotification error:', err);
            return { success: false, error: err.message };
        }
    }

    window.NotificationActions = { markAsRead, archive, deleteNotification };
    console.log('✅ notification-actions.js ready');
})();
