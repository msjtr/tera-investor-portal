/**
 * ============================================================
 * notification-actions.js – دوال CRUD (تستخدم Edge Function)
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationActions) return;
    window.__notificationActions = true;

    const API = window.NotificationAPI;

    // ─── تعليم كمقروء ───
    async function markAsRead(id) {
        if (!id) return { success: false, error: 'id required' };
        try {
            const result = await API.updateNotification(id, {
                status: 'read',
                is_read: true,
                read_at: new Date().toISOString()
            });
            // تحديث الكاش
            const cache = window.NotificationCache;
            if (cache && typeof cache.update === 'function') {
                cache.update(id, { status: 'read', is_read: true });
            }
            // تحديث الواجهة
            if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                window.NotificationUI.refresh();
            }
            // تحديث العداد
            await window.Support?.updateNotificationBadge?.();
            return { success: true, data: result };
        } catch (err) {
            console.error('❌ markAsRead error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── أرشفة ───
    async function archive(id) {
        if (!id) return { success: false, error: 'id required' };
        if (!confirm('هل تريد أرشفة هذا الإشعار؟')) return { success: false, cancelled: true };
        try {
            const result = await API.updateNotification(id, {
                status: 'archived',
                archived_at: new Date().toISOString()
            });
            const cache = window.NotificationCache;
            if (cache && typeof cache.update === 'function') {
                cache.update(id, { status: 'archived' });
            }
            if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                window.NotificationUI.refresh();
            }
            await window.Support?.updateNotificationBadge?.();
            return { success: true, data: result };
        } catch (err) {
            console.error('❌ archive error:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── حذف ───
    async function deleteNotification(id) {
        if (!id) return { success: false, error: 'id required' };
        if (!confirm('هل أنت متأكد من حذف هذا الإشعار نهائياً؟')) return { success: false, cancelled: true };
        try {
            const result = await API.updateNotification(id, {
                status: 'deleted',
                deleted_at: new Date().toISOString()
            });
            const cache = window.NotificationCache;
            if (cache && typeof cache.delete === 'function') {
                cache.delete(id);
            } else if (cache && typeof cache.update === 'function') {
                cache.update(id, { status: 'deleted' });
            }
            if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                window.NotificationUI.refresh();
            }
            await window.Support?.updateNotificationBadge?.();
            return { success: true, data: result };
        } catch (err) {
            console.error('❌ deleteNotification error:', err);
            return { success: false, error: err.message };
        }
    }

    window.NotificationActions = {
        markAsRead,
        archive,
        deleteNotification
    };

    console.log('✅ notification-actions.js ready (using Edge Functions)');
})();
