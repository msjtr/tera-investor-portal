/**
 * ============================================================
 * notification-cache.js – الكاش المحلي (مُحسّن ومتكامل)
 * ============================================================
 * 
 * ✅ يدير الإشعارات محلياً مع تحديث تلقائي للواجهة
 * ✅ يستمع للتغييرات ويُعلم المكونات الأخرى
 * ✅ يتكامل مع NotificationUI و Support و NotificationManager
 * ✅ يمنع التحديثات المتكررة عبر debounce
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
            this._uiTimer = null;
            this._badgeTimer = null;
        }

        // ─── تهيئة الكاش ───
        init(items) {
            // منع التكرارات
            const uniqueItems = items ? this._deduplicate(items) : [];
            this.items = uniqueItems;
            this.isInitialized = true;
            this.notify();
            return this;
        }

        // ─── إزالة التكرارات ───
        _deduplicate(items) {
            const seen = new Set();
            return items.filter(item => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            });
        }

        // ─── إضافة إشعار جديد ───
        add(item) {
            if (!item || !item.id) return false;
            // منع التكرار
            if (this.items.some(n => n.id === item.id)) {
                // إذا كان موجوداً، نحدثه بدلاً من إضافته
                return this.update(item.id, item);
            }
            this.items.unshift(item);
            this._scheduleUIUpdate();
            return true;
        }

        // ─── تحديث إشعار ───
        update(id, updates) {
            if (!id || !updates) return false;
            const idx = this.items.findIndex(n => n.id === id);
            if (idx === -1) return false;
            this.items[idx] = { ...this.items[idx], ...updates };
            this._scheduleUIUpdate();
            return true;
        }

        // ─── حذف إشعار ───
        delete(id) {
            if (!id) return false;
            const idx = this.items.findIndex(n => n.id === id);
            if (idx === -1) return false;
            this.items.splice(idx, 1);
            this._scheduleUIUpdate();
            return true;
        }

        // ─── حذف عدة إشعارات ───
        deleteMultiple(ids) {
            if (!ids || ids.length === 0) return false;
            this.items = this.items.filter(n => !ids.includes(n.id));
            this._scheduleUIUpdate();
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
            this._scheduleUIUpdate();
        }

        // ─── إضافة مستمع ───
        addListener(callback) {
            this.listeners.push(callback);
            // إرجاع دالة لإزالة المستمع
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

        // ─── جدولة تحديث الواجهة (debounce) ───
        _scheduleUIUpdate() {
            // إخطار المستمعين أولاً
            this.notify();

            // تحديث الواجهة بعد تأخير قصير (لتجميع التغييرات المتعددة)
            if (this._uiTimer) {
                clearTimeout(this._uiTimer);
                this._uiTimer = null;
            }
            this._uiTimer = setTimeout(() => {
                this._uiTimer = null;
                this._updateUI();
            }, 80);
        }

        // ─── تحديث الواجهة والعداد تلقائياً ───
        _updateUI() {
            // 1. تحديث الـ UI
            if (window.NotificationUI && typeof window.NotificationUI.refresh === 'function') {
                try {
                    window.NotificationUI.refresh();
                } catch (e) {
                    console.warn('⚠️ UI refresh error:', e);
                }
            }

            // 2. تحديث العداد العام
            if (window.Support && typeof window.Support.updateNotificationBadge === 'function') {
                if (this._badgeTimer) {
                    clearTimeout(this._badgeTimer);
                    this._badgeTimer = null;
                }
                this._badgeTimer = setTimeout(() => {
                    this._badgeTimer = null;
                    try {
                        window.Support.updateNotificationBadge();
                    } catch (e) {
                        console.warn('⚠️ Badge update error:', e);
                    }
                }, 50);
            }

            // 3. إعلام NotificationManager بتغير البيانات (إن وجد)
            if (window.NotificationManager && typeof window.NotificationManager.refreshUI === 'function') {
                try {
                    window.NotificationManager.refreshUI();
                } catch (e) {
                    // تجاهل
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
        // للوصول الداخلي
        _instance: cache
    };

    // ─── إضافة متغير داخلي للوصول السريع ───
    window.__notificationCacheInstance = cache;

    console.log('✅ notification-cache.js ready (enhanced with auto-refresh and debounce)');
})();
