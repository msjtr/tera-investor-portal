/**
 * ============================================================
 * notification-cache.js – الكاش المحلي (مُحسّن ومتكامل)
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
            this.isInitialized = false;
        }

        // ─── تهيئة الكاش ───
        init(items) {
            this.items = items || [];
            this.isInitialized = true;
            this.notify();
            return this;
        }

        // ─── إضافة إشعار جديد ───
        add(item) {
            if (!item || !item.id) return false;
            if (this.items.some(n => n.id === item.id)) return false;
            this.items.unshift(item);
            this.notify();
            this.triggerUIUpdate();
            return true;
        }

        // ─── تحديث إشعار ───
        update(id, updates) {
            if (!id || !updates) return false;
            const idx = this.items.findIndex(n => n.id === id);
            if (idx === -1) return false;
            this.items[idx] = { ...this.items[idx], ...updates };
            this.notify();
            this.triggerUIUpdate();
            return true;
        }

        // ─── حذف إشعار ───
        delete(id) {
            if (!id) return false;
            const idx = this.items.findIndex(n => n.id === id);
            if (idx === -1) return false;
            this.items.splice(idx, 1);
            this.notify();
            this.triggerUIUpdate();
            return true;
        }

        // ─── حذف عدة إشعارات ───
        deleteMultiple(ids) {
            if (!ids || ids.length === 0) return false;
            this.items = this.items.filter(n => !ids.includes(n.id));
            this.notify();
            this.triggerUIUpdate();
            return true;
        }

        // ─── تعليم كمقروء ───
        markAsRead(id) {
            return this.update(id, {
                status: 'read',
                is_read: true,
                read_at: new Date().toISOString()
            });
        }

        // ─── أرشفة ───
        archive(id) {
            return this.update(id, {
                status: 'archived',
                archived_at: new Date().toISOString()
            });
        }

        // ─── الحصول على جميع الإشعارات ───
        getAll() {
            return [...this.items];
        }

        // ─── الحصول على إشعار واحد ───
        get(id) {
            return this.items.find(n => n.id === id) || null;
        }

        // ─── الإحصائيات ───
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

        // ─── عدد الإشعارات ───
        size() {
            return this.items.length;
        }

        // ─── إعادة تعيين الكاش ───
        reset() {
            this.items = [];
            this.isInitialized = false;
            this.notify();
            this.triggerUIUpdate();
        }

        // ─── إضافة مستمع ───
        addListener(callback) {
            this.listeners.push(callback);
            return () => {
                this.listeners = this.listeners.filter(cb => cb !== callback);
            };
        }

        // ─── إخطار المستمعين ───
        notify() {
            const stats = this.getStats();
            const items = this.getAll();
            this.listeners.forEach(cb => {
                try {
                    cb(items, stats);
                } catch (e) {
                    console.warn('⚠️ Cache listener error:', e);
                }
            });
        }

        // ─── تحديث الواجهة والعداد تلقائياً ───
        triggerUIUpdate() {
            // تحديث الـ UI إذا كان متاحاً
            if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                // نستخدم setTimeout لتجنب التكرار المتكرر
                if (this._uiTimer) clearTimeout(this._uiTimer);
                this._uiTimer = setTimeout(() => {
                    window.NotificationUI.refresh();
                    this._uiTimer = null;
                }, 100);
            }

            // تحديث العداد العام
            if (window.Support && typeof window.Support.updateNotificationBadge === 'function') {
                if (this._badgeTimer) clearTimeout(this._badgeTimer);
                this._badgeTimer = setTimeout(() => {
                    window.Support.updateNotificationBadge();
                    this._badgeTimer = null;
                }, 150);
            }

            // تحديث المدير إذا كان متاحاً
            if (window.NotificationManager) {
                const manager = window.NotificationManager;
                if (manager.getState && manager.getState().notify) {
                    // إعلام المدير بتغير البيانات
                    manager.getState().cache = this.items;
                    manager.getState().recalculate();
                }
            }
        }
    }

    // ─── إنشاء مثيل الكاش ───
    const cache = new NotificationCache();

    // ─── تصدير الكاش ───
    window.NotificationCache = {
        init: (items) => cache.init(items),
        add: (n) => cache.add(n),
        update: (id, u) => cache.update(id, u),
        delete: (id) => cache.delete(id),
        deleteMultiple: (ids) => cache.deleteMultiple(ids),
        markAsRead: (id) => cache.markAsRead(id),
        archive: (id) => cache.archive(id),
        getAll: () => cache.getAll(),
        get: (id) => cache.get(id),
        getStats: () => cache.getStats(),
        size: () => cache.size(),
        reset: () => cache.reset(),
        addListener: (cb) => cache.addListener(cb),
        _instance: cache // للوصول الداخلي
    };

    // ─── إضافة متغير داخلي للوصول السريع ───
    window.__notificationCacheInstance = cache;

    console.log('✅ notification-cache.js ready (enhanced with auto-refresh)');
})();
