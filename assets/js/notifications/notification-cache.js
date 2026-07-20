/**
 * ============================================================
 * notification-cache.js – إدارة الكاش (تحديث جزئي)
 * ============================================================
 * مسؤول عن تخزين الإشعارات وتحديثها بشكل ذكي دون إعادة تحميل كامل
 */

(function() {
    'use strict';

    if (window.__notificationCache) return;
    window.__notificationCache = true;

    class NotificationCache {
        constructor() {
            this.items = [];
            this.maxSize = 500;
            this.listeners = [];
            this.isInitialized = false;
        }

        init(notifications) {
            this.items = notifications || [];
            this.isInitialized = true;
            this.notifyListeners();
            return this;
        }

        add(notification) {
            if (!notification || !notification.id) return false;
            const exists = this.items.some(n => n.id === notification.id);
            if (exists) return false;
            this.items.unshift(notification);
            if (this.items.length > this.maxSize) {
                this.items = this.items.slice(0, this.maxSize);
            }
            this.notifyListeners();
            return true;
        }

        update(id, updates) {
            if (!id || !updates) return false;
            const index = this.items.findIndex(n => n.id === id);
            if (index === -1) return false;
            this.items[index] = { ...this.items[index], ...updates };
            this.notifyListeners();
            return true;
        }

        delete(id) {
            const index = this.items.findIndex(n => n.id === id);
            if (index === -1) return false;
            this.items.splice(index, 1);
            this.notifyListeners();
            return true;
        }

        deleteMultiple(ids) {
            if (!ids || ids.length === 0) return false;
            this.items = this.items.filter(n => !ids.includes(n.id));
            this.notifyListeners();
            return true;
        }

        markAsRead(id) {
            return this.update(id, {
                status: 'read',
                is_read: true,
                read_at: new Date().toISOString()
            });
        }

        markAllAsRead(ids) {
            if (!ids || ids.length === 0) return false;
            const now = new Date().toISOString();
            let updated = 0;
            this.items.forEach((n, i) => {
                if (ids.includes(n.id) && n.status === 'unread') {
                    this.items[i] = { ...n, status: 'read', is_read: true, read_at: now };
                    updated++;
                }
            });
            if (updated > 0) this.notifyListeners();
            return updated > 0;
        }

        archive(id) {
            return this.update(id, {
                status: 'archived',
                archived_at: new Date().toISOString()
            });
        }

        getAll() {
            return [...this.items];
        }

        get(id) {
            return this.items.find(n => n.id === id) || null;
        }

        getStats() {
            const total = this.items.filter(n => n.status !== 'deleted').length;
            const unread = this.items.filter(n => n.status === 'unread').length;
            const read = this.items.filter(n => n.status === 'read').length;
            const archived = this.items.filter(n => n.status === 'archived').length;
            const important = this.items.filter(n => n.priority === 'urgent' || n.priority === 'high').length;
            return { total, unread, read, archived, important };
        }

        getUnreadCount() {
            return this.items.filter(n => n.status === 'unread').length;
        }

        reset() {
            this.items = [];
            this.isInitialized = false;
            this.notifyListeners();
        }

        addListener(callback) {
            this.listeners.push(callback);
            return () => {
                this.listeners = this.listeners.filter(cb => cb !== callback);
            };
        }

        notifyListeners() {
            const stats = this.getStats();
            this.listeners.forEach(cb => {
                try {
                    cb(this.items, stats);
                } catch (e) {
                    console.warn('⚠️ Cache listener error:', e);
                }
            });
        }

        size() {
            return this.items.length;
        }
    }

    const cache = new NotificationCache();
    window.__notificationCache = cache;

    window.NotificationCache = {
        getInstance: () => cache,
        init: (data) => cache.init(data),
        add: (n) => cache.add(n),
        update: (id, updates) => cache.update(id, updates),
        delete: (id) => cache.delete(id),
        deleteMultiple: (ids) => cache.deleteMultiple(ids),
        markAsRead: (id) => cache.markAsRead(id),
        markAllAsRead: (ids) => cache.markAllAsRead(ids),
        archive: (id) => cache.archive(id),
        getAll: () => cache.getAll(),
        get: (id) => cache.get(id),
        getStats: () => cache.getStats(),
        getUnreadCount: () => cache.getUnreadCount(),
        reset: () => cache.reset(),
        addListener: (cb) => cache.addListener(cb),
        size: () => cache.size()
    };

    console.log('✅ notification-cache.js ready');
})();
