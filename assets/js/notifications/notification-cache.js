/**
 * ============================================================
 * notification-cache.js – الكاش المحلي
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationCache) return;
    window.__notificationCache = true;

    class NotificationCache {
        constructor() {
            this.items = [];
            this.listeners = [];
        }

        init(items) {
            this.items = items || [];
            this.notify();
            return this;
        }

        add(item) {
            if (this.items.some(n => n.id === item.id)) return false;
            this.items.unshift(item);
            this.notify();
            return true;
        }

        update(id, updates) {
            const idx = this.items.findIndex(n => n.id === id);
            if (idx === -1) return false;
            this.items[idx] = { ...this.items[idx], ...updates };
            this.notify();
            return true;
        }

        delete(id) {
            const idx = this.items.findIndex(n => n.id === id);
            if (idx === -1) return false;
            this.items.splice(idx, 1);
            this.notify();
            return true;
        }

        getAll() {
            return [...this.items];
        }

        get(id) {
            return this.items.find(n => n.id === id) || null;
        }

        getStats() {
            const items = this.items.filter(n => n.status !== 'deleted');
            return {
                total: items.length,
                unread: items.filter(n => n.status === 'unread').length,
                read: items.filter(n => n.status === 'read').length,
                archived: items.filter(n => n.status === 'archived').length,
                important: items.filter(n => n.priority === 'urgent' || n.priority === 'high').length
            };
        }

        addListener(callback) {
            this.listeners.push(callback);
            return () => { this.listeners = this.listeners.filter(cb => cb !== callback); };
        }

        notify() {
            const stats = this.getStats();
            this.listeners.forEach(cb => cb(this.items, stats));
        }
    }

    const cache = new NotificationCache();
    window.__notificationCache = cache;
    window.NotificationCache = {
        init: (items) => cache.init(items),
        add: (n) => cache.add(n),
        update: (id, u) => cache.update(id, u),
        delete: (id) => cache.delete(id),
        getAll: () => cache.getAll(),
        get: (id) => cache.get(id),
        getStats: () => cache.getStats(),
        addListener: (cb) => cache.addListener(cb)
    };

    console.log('✅ notification-cache.js ready');
})();
