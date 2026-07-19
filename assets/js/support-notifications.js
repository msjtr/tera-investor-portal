/**
 * ============================================================
 * notification-manager.js – المدير المركزي للإشعارات
 * ============================================================
 * يدير جميع مصادر الإشعارات، الحالة، والأحداث
 * يستخدم Event Bus لتوزيع التحديثات
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
            this.events[event].forEach(callback => callback(data));
        }

        once(event, callback) {
            const wrapper = (data) => {
                callback(data);
                this.off(event, wrapper);
            };
            this.on(event, wrapper);
        }
    }

    // ─── الحالة المركزية ───
    class NotificationState {
        constructor() {
            this.cache = [];              // جميع الإشعارات
            this.filtered = [];           // بعد التصفية
            this.selected = new Set();    // المعرفات المحددة
            this.unreadCount = 0;
            this.totalCount = 0;
            this.page = 1;
            this.pageSize = 20;
            this.hasMore = true;
            this.isLoading = false;
            this.filters = {
                search: '',
                type: 'all',
                status: 'all',
                priority: 'all',
                sort: 'desc'
            };
            this.subscribers = [];
        }

        // ─── تحديث جزئي للإشعارات ───
        updateNotification(id, updates) {
            const index = this.cache.findIndex(n => n.id === id);
            if (index === -1) return false;
            this.cache[index] = { ...this.cache[index], ...updates };
            this.recalculate();
            return true;
        }

        addNotification(notification) {
            // منع التكرار
            if (this.cache.some(n => n.id === notification.id)) return;
            this.cache.unshift(notification);
            this.recalculate();
        }

        removeNotification(id) {
            this.cache = this.cache.filter(n => n.id !== id);
            this.selected.delete(id);
            this.recalculate();
        }

        recalculate() {
            this.unreadCount = this.cache.filter(n => n.status === 'unread').length;
            this.totalCount = this.cache.length;
            this.applyFilters();
            this.notifySubscribers();
        }

        applyFilters() {
            const { search, type, status, priority, sort } = this.filters;
            let filtered = this.cache.filter(n => n.status !== 'deleted');

            if (type !== 'all') filtered = filtered.filter(n => n.type === type);
            if (status !== 'all') filtered = filtered.filter(n => n.status === status);
            if (priority !== 'all') filtered = filtered.filter(n => n.priority === priority);
            if (search) {
                const s = search.toLowerCase();
                filtered = filtered.filter(n =>
                    (n.title?.toLowerCase().includes(s)) ||
                    (n.body?.toLowerCase().includes(s))
                );
            }

            filtered.sort((a, b) => {
                const dateA = new Date(a.created_at);
                const dateB = new Date(b.created_at);
                return sort === 'asc' ? dateA - dateB : dateB - dateA;
            });

            this.filtered = filtered;
        }

        subscribe(callback) {
            this.subscribers.push(callback);
            return () => {
                this.subscribers = this.subscribers.filter(cb => cb !== callback);
            };
        }

        notifySubscribers() {
            this.subscribers.forEach(cb => cb(this));
        }

        reset() {
            this.cache = [];
            this.filtered = [];
            this.selected = new Set();
            this.unreadCount = 0;
            this.totalCount = 0;
            this.hasMore = true;
            this.isLoading = false;
            this.notifySubscribers();
        }
    }

    // ─── إدارة الصوت ───
    class NotificationSound {
        constructor() {
            this.audio = null;
            this.enabled = true;
        }

        play() {
            if (!this.enabled) return;
            try {
                if (!this.audio) {
                    this.audio = new Audio('/sounds/notification.mp3');
                    this.audio.volume = 0.5;
                }
                this.audio.play().catch(() => {});
            } catch (e) { /* تجاهل */ }
        }

        toggle(enable) {
            this.enabled = enable;
        }
    }

    // ─── المدير الرئيسي ───
    class NotificationManager {
        constructor() {
            if (NotificationManager.instance) return NotificationManager.instance;
            NotificationManager.instance = this;

            this.events = new EventBus();
            this.state = new NotificationState();
            this.sound = new NotificationSound();
            this.isInitialized = false;
            this.sources = {
                realtime: false,
                onesignal: false,
                polling: false
            };
        }

        // ─── التهيئة ───
        async init() {
            if (this.isInitialized) return;
            this.isInitialized = true;

            // الاستماع لتغييرات الحالة
            this.state.subscribe((state) => {
                this.events.emit('state:changed', state);
            });

            console.log('✅ NotificationManager initialized');
            return this;
        }

        // ─── إضافة إشعار واحد ───
        addNotification(notification) {
            // التحقق من عدم التكرار
            if (this.state.cache.some(n => n.id === notification.id)) return;
            this.state.addNotification(notification);
            this.events.emit('notification:added', notification);
            this.sound.play();
            return notification;
        }

        // ─── تحديث إشعار ───
        updateNotification(id, updates) {
            const updated = this.state.updateNotification(id, updates);
            if (updated) {
                this.events.emit('notification:updated', { id, updates });
            }
            return updated;
        }

        // ─── حذف إشعار ───
        deleteNotification(id) {
            this.state.removeNotification(id);
            this.events.emit('notification:deleted', id);
        }

        // ─── تعليم كمقروء ───
        markAsRead(id) {
            const notif = this.state.cache.find(n => n.id === id);
            if (notif && notif.status === 'unread') {
                this.updateNotification(id, {
                    status: 'read',
                    is_read: true,
                    read_at: new Date().toISOString()
                });
                this.events.emit('notification:read', id);
                return true;
            }
            return false;
        }

        // ─── تعليم الكل كمقروء ───
        markAllAsRead() {
            const unreadIds = this.state.cache
                .filter(n => n.status === 'unread')
                .map(n => n.id);
            unreadIds.forEach(id => this.markAsRead(id));
            return unreadIds;
        }

        // ─── الحصول على الحالة ───
        getState() {
            return this.state;
        }

        // ─── الحصول على المشتركين ───
        on(event, callback) {
            return this.events.on(event, callback);
        }

        // ─── تنظيف ───
        destroy() {
            this.state.reset();
            this.isInitialized = false;
            this.events = new EventBus();
            console.log('🧹 NotificationManager destroyed');
        }
    }

    // ─── تصدير المدير ───
    const manager = new NotificationManager();
    window.__notificationManager = manager;

    // ─── API عامة ───
    window.NotificationManager = {
        getInstance: () => manager,
        init: () => manager.init(),
        addNotification: (n) => manager.addNotification(n),
        updateNotification: (id, updates) => manager.updateNotification(id, updates),
        deleteNotification: (id) => manager.deleteNotification(id),
        markAsRead: (id) => manager.markAsRead(id),
        markAllAsRead: () => manager.markAllAsRead(),
        getState: () => manager.getState(),
        on: (event, callback) => manager.on(event, callback),
        destroy: () => manager.destroy()
    };

    console.log('✅ notification-manager.js ready');

})();
