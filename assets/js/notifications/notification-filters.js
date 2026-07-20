/**
 * ============================================================
 * notification-filters.js – إدارة الفلاتر
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationFilters) return;
    window.__notificationFilters = true;

    const DEFAULT = { search: '', type: 'all', status: 'all', priority: 'all', sort: 'desc' };
    let current = { ...DEFAULT };
    let listeners = [];

    function load() {
        try {
            const saved = localStorage.getItem('notificationFilters');
            if (saved) current = { ...DEFAULT, ...JSON.parse(saved) };
        } catch (e) { /* ignore */ }
        return current;
    }

    function save() {
        try { localStorage.setItem('notificationFilters', JSON.stringify(current)); } catch (e) { /* ignore */ }
    }

    function get() { return { ...current }; }

    function update(newFilters) {
        current = { ...current, ...newFilters };
        save();
        listeners.forEach(cb => cb(current));
        return current;
    }

    function reset() {
        current = { ...DEFAULT };
        save();
        listeners.forEach(cb => cb(current));
        return current;
    }

    function addListener(cb) {
        listeners.push(cb);
        return () => { listeners = listeners.filter(l => l !== cb); };
    }

    function apply(notifications) {
        if (!notifications) return [];
        const { search, type, status, priority, sort } = current;
        let result = notifications.filter(n => n.status !== 'deleted');
        if (type !== 'all') result = result.filter(n => n.type === type);
        if (status !== 'all') result = result.filter(n => n.status === status);
        if (priority !== 'all') result = result.filter(n => n.priority === priority);
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(n =>
                (n.title?.toLowerCase().includes(s)) ||
                (n.body?.toLowerCase().includes(s))
            );
        }
        result.sort((a, b) => {
            const da = new Date(a.created_at);
            const db = new Date(b.created_at);
            return sort === 'asc' ? da - db : db - da;
        });
        return result;
    }

    window.NotificationFilters = { get, update, reset, addListener, apply, load, save, DEFAULT };
    console.log('✅ notification-filters.js ready');
})();
