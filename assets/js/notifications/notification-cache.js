// ============================================================
// notification-cache.js – إدارة الكاش (تحديث جزئي)
// ============================================================
// مسؤول عن تخزين الإشعارات وتحديثها بشكل ذكي دون إعادة تحميل كامل
// ============================================================

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

        // ─── تهيئة الكاش ───
        init(notifications) {
            this.items = notifications || [];
            this.isInitialized = true;
            this.notifyListeners();
            return this;
        }

        // ─── إضافة إشعار (مع منع التكرار) ───
        add(notification) {
            if (!notification || !notification.id) return false;

            // منع التكرار
            const exists = this.items.some(n => n.id === notification.id);
            if (exists) return false;

            // إضافة في البداية (الأحدث أولاً)
            this.items.unshift(notification);

            // تقليل الحجم إذا تجاوز الحد الأقصى
            if (this.items.length > this.maxSize) {
                this.items = this.items.slice(0, this.maxSize);
            }

            this.notifyListeners();
            return true;
        }

        // ─── تحديث إشعار (جزئي) ───
        update(id, updates) {
            if (!id || !updates) return false;

            const index = this.items.findIndex(n => n.id === id);
            if (index === -1) return false;

            // تحديث جزئي (دمج البيانات)
            this.items[index] = { ...this.items[index], ...updates };
            this.notifyListeners();
            return true;
        }

        // ─── حذف إشعار ───
        delete(id) {
            const index = this.items.findIndex(n => n.id === id);
            if (index === -1) return false;

            this.items.splice(index, 1);
            this.notifyListeners();
            return true;
        }

        // ─── حذف متعدد ───
        deleteMultiple(ids) {
            if (!ids || ids.length === 0) return false;
            this.items = this.items.filter(n => !ids.includes(n.id));
            this.notifyListeners();
            return true;
        }

        // ─── تعليم كمقروء (واحد) ───
        markAsRead(id) {
            return this.update(id, {
                status: 'read',
                is_read: true,
                read_at: new Date().toISOString()
            });
        }

        // ─── تعليم كمقروء (متعدد) ───
        markAllAsRead(ids) {
            if (!ids || ids.length === 0) return false;
            const now = new Date().toISOString();
            let updated = 0;
            this.items.forEach((n, i) => {
                if (ids.includes(n.id) && n.status === 'unread') {
                    this.items[i] = {
                        ...n,
                        status: 'read',
                        is_read: true,
                        read_at: now
                    };
                    updated++;
                }
            });
            if (updated > 0) this.notifyListeners();
            return updated > 0;
        }

        // ─── أرشفة ───
        archive(id) {
            return this.update(id, {
                status: 'archived',
                archived_at: new Date().toISOString()
            });
        }

        // ─── البحث داخل الكاش ───
        search(query) {
            if (!query) return this.items;
            const q = query.toLowerCase();
            return this.items.filter(n =>
                (n.title?.toLowerCase().includes(q)) ||
                (n.body?.toLowerCase().includes(q)) ||
                (n.type?.toLowerCase().includes(q))
            );
        }

        // ─── التصفية ───
        filter(filters) {
            let result = this.items.filter(n => n.status !== 'deleted');

            if (filters.type && filters.type !== 'all') {
                result = result.filter(n => n.type === filters.type);
            }
            if (filters.status && filters.status !== 'all') {
                result = result.filter(n => n.status === filters.status);
            }
            if (filters.priority && filters.priority !== 'all') {
                result = result.filter(n => n.priority === filters.priority);
            }
            if (filters.search) {
                result = result.filter(n =>
                    (n.title?.toLowerCase().includes(filters.search.toLowerCase())) ||
                    (n.body?.toLowerCase().includes(filters.search.toLowerCase()))
                );
            }

            // الترتيب
            const sort = filters.sort || 'desc';
            result.sort((a, b) => {
                const dateA = new Date(a.created_at);
                const dateB = new Date(b.created_at);
                return sort === 'asc' ? dateA - dateB : dateB - dateA;
            });

            return result;
        }

        // ─── الحصول على إشعار بواسطة ID ───
        get(id) {
            return this.items.find(n => n.id === id) || null;
        }

        // ─── الحصول على الإحصائيات ───
        getStats() {
            const total = this.items.filter(n => n.status !== 'deleted').length;
            const unread = this.items.filter(n => n.status === 'unread').length;
            const read = this.items.filter(n => n.status === 'read').length;
            const archived = this.items.filter(n => n.status === 'archived').length;
            const important = this.items.filter(n =>
                (n.priority === 'urgent' || n.priority === 'high') &&
                n.status !== 'deleted'
            ).length;

            return { total, unread, read, archived, important };
        }

        // ─── الحصول على عدد غير المقروء ───
        getUnreadCount() {
            return this.items.filter(n => n.status === 'unread').length;
        }

        // ─── الحصول على جميع الإشعارات ───
        getAll() {
            return [...this.items];
        }

        // ─── إعادة تعيين الكاش ───
        reset() {
            this.items = [];
            this.isInitialized = false;
            this.notifyListeners();
        }

        // ─── إضافة مستمع للتغييرات ───
        addListener(callback) {
            this.listeners.push(callback);
            return () => {
                this.listeners = this.listeners.filter(cb => cb !== callback);
            };
        }

        // ─── إخطار المستمعين ───
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

        // ─── الحصول على حجم الكاش ───
        size() {
            return this.items.length;
        }
    }

    // ─── تصدير الكاش ───
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
        search: (q) => cache.search(q),
        filter: (f) => cache.filter(f),
        get: (id) => cache.get(id),
        getStats: () => cache.getStats(),
        getUnreadCount: () => cache.getUnreadCount(),
        getAll: () => cache.getAll(),
        reset: () => cache.reset(),
        addListener: (cb) => cache.addListener(cb),
        size: () => cache.size()
    };

    console.log('✅ notification-cache.js ready');

})();
