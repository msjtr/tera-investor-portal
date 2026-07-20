/**
 * ============================================================
 * notification-manager.js – المدير المركزي للإشعارات
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationManager) return;
    window.__notificationManager = true;

    // ─── Event Bus ───
    class EventBus {
        constructor() {
            this.events = {};
        }
        on(event, callback) {
            if (!this.events[event]) this.events[event] = [];
            this.events[event].push(callback);
            return () => this.off(event, callback);
        }
        off(event, callback) {
            if (!this.events[event]) return;
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
        emit(event, data) {
            if (!this.events[event]) return;
            this.events[event].forEach(cb => cb(data));
        }
        once(event, callback) {
            const wrapper = (data) => { callback(data); this.off(event, wrapper); };
            this.on(event, wrapper);
        }
    }

    // ─── الحالة المركزية ───
    class NotificationState {
        constructor() {
            this.cache = [];
            this.selected = new Set();
            this.unreadCount = 0;
            this.totalCount = 0;
            this.filters = { search: '', type: 'all', status: 'all', priority: 'all', sort: 'desc' };
            this.subscribers = [];
        }

        add(notification) {
            if (this.cache.some(n => n.id === notification.id)) return;
            this.cache.unshift(notification);
            this.recalculate();
        }

        update(id, updates) {
            const idx = this.cache.findIndex(n => n.id === id);
            if (idx === -1) return false;
            this.cache[idx] = { ...this.cache[idx], ...updates };
            this.recalculate();
            return true;
        }

        remove(id) {
            this.cache = this.cache.filter(n => n.id !== id);
            this.selected.delete(id);
            this.recalculate();
        }

        recalculate() {
            this.unreadCount = this.cache.filter(n => n.status === 'unread').length;
            this.totalCount = this.cache.filter(n => n.status !== 'deleted').length;
            this.notify();
        }

        notify() {
            this.subscribers.forEach(cb => cb(this));
        }

        subscribe(callback) {
            this.subscribers.push(callback);
            return () => { this.subscribers = this.subscribers.filter(cb => cb !== callback); };
        }
    }

    // ─── المدير الرئيسي ───
    class NotificationManager {
        constructor() {
            if (NotificationManager.instance) return NotificationManager.instance;
            NotificationManager.instance = this;
            this.events = new EventBus();
            this.state = new NotificationState();
            this.isInitialized = false;
        }

        init() {
            if (this.isInitialized) return this;
            this.isInitialized = true;
            console.log('✅ NotificationManager initialized');
            return this;
        }

        addNotification(n) { this.state.add(n); this.events.emit('notification:added', n); return n; }
        updateNotification(id, updates) { const r = this.state.update(id, updates); if (r) this.events.emit('notification:updated', { id, updates }); return r; }
        deleteNotification(id) { this.state.remove(id); this.events.emit('notification:deleted', id); }
        getState() { return this.state; }
        on(event, cb) { return this.events.on(event, cb); }
    }

    const manager = new NotificationManager();
    window.__notificationManager = manager;
    window.NotificationManager = {
        getInstance: () => manager,
        init: () => manager.init(),
        addNotification: (n) => manager.addNotification(n),
        updateNotification: (id, u) => manager.updateNotification(id, u),
        deleteNotification: (id) => manager.deleteNotification(id),
        getState: () => manager.getState(),
        on: (event, cb) => manager.on(event, cb)
    };

    console.log('✅ notification-manager.js ready');
})();
