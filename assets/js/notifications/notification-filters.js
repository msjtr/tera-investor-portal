// ============================================================
// notification-filters.js – البحث والفلترة والترتيب
// ============================================================
// إدارة حالة الفلاتر وتطبيقها على الإشعارات
// ============================================================

(function() {
    'use strict';

    if (window.__notificationFilters) return;
    window.__notificationFilters = true;

    // ─── الحالة الافتراضية ───
    const DEFAULT_FILTERS = {
        search: '',
        type: 'all',
        status: 'all',
        priority: 'all',
        sort: 'desc'
    };

    let currentFilters = { ...DEFAULT_FILTERS };
    let listeners = [];

    // ─── المراجع DOM ───
    const DOM = {
        search: document.getElementById('searchInput'),
        type: document.getElementById('filterType'),
        status: document.getElementById('filterStatus'),
        priority: document.getElementById('filterPriority'),
        sort: document.getElementById('sortOrder')
    };

    // ─── تحميل الفلاتر المحفوظة ───
    function loadFilters() {
        try {
            const saved = localStorage.getItem('notificationFilters');
            if (saved) {
                const parsed = JSON.parse(saved);
                currentFilters = { ...DEFAULT_FILTERS, ...parsed };
                applyFiltersToUI();
            }
        } catch (e) { /* تجاهل */ }
        return currentFilters;
    }

    // ─── حفظ الفلاتر ───
    function saveFilters() {
        try {
            localStorage.setItem('notificationFilters', JSON.stringify(currentFilters));
        } catch (e) { /* تجاهل */ }
    }

    // ─── تطبيق الفلاتر على الواجهة ───
    function applyFiltersToUI() {
        if (DOM.search) DOM.search.value = currentFilters.search || '';
        if (DOM.type) DOM.type.value = currentFilters.type || 'all';
        if (DOM.status) DOM.status.value = currentFilters.status || 'all';
        if (DOM.priority) DOM.priority.value = currentFilters.priority || 'all';
        if (DOM.sort) DOM.sort.value = currentFilters.sort || 'desc';
    }

    // ─── قراءة الفلاتر من الواجهة ───
    function readFiltersFromUI() {
        return {
            search: DOM.search ? DOM.search.value.trim() : '',
            type: DOM.type ? DOM.type.value : 'all',
            status: DOM.status ? DOM.status.value : 'all',
            priority: DOM.priority ? DOM.priority.value : 'all',
            sort: DOM.sort ? DOM.sort.value : 'desc'
        };
    }

    // ─── تحديث الفلاتر ───
    function updateFilters(newFilters) {
        currentFilters = { ...currentFilters, ...newFilters };
        saveFilters();
        applyFiltersToUI();
        notifyListeners();
        return currentFilters;
    }

    // ─── إعادة تعيين الفلاتر ───
    function resetFilters() {
        currentFilters = { ...DEFAULT_FILTERS };
        saveFilters();
        applyFiltersToUI();
        notifyListeners();
        return currentFilters;
    }

    // ─── الحصول على الفلاتر الحالية ───
    function getFilters() {
        return { ...currentFilters };
    }

    // ─── تطبيق الفلاتر على الإشعارات ───
    function applyFilters(notifications) {
        if (!notifications || notifications.length === 0) return [];

        let result = notifications.filter(n => n.status !== 'deleted');

        const { search, type, status, priority } = currentFilters;

        if (type !== 'all') {
            result = result.filter(n => n.type === type);
        }

        if (status !== 'all') {
            result = result.filter(n => n.status === status);
        }

        if (priority !== 'all') {
            result = result.filter(n => n.priority === priority);
        }

        if (search) {
            const s = search.toLowerCase();
            result = result.filter(n =>
                (n.title?.toLowerCase().includes(s)) ||
                (n.body?.toLowerCase().includes(s))
            );
        }

        // ترتيب
        const sort = currentFilters.sort || 'desc';
        result.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sort === 'asc' ? dateA - dateB : dateB - dateA;
        });

        return result;
    }

    // ─── إضافة مستمع ───
    function addListener(callback) {
        listeners.push(callback);
        return () => {
            listeners = listeners.filter(cb => cb !== callback);
        };
    }

    // ─── إخطار المستمعين ───
    function notifyListeners() {
        const filters = getFilters();
        listeners.forEach(cb => {
            try {
                cb(filters);
            } catch (e) {
                console.warn('⚠️ Filter listener error:', e);
            }
        });
    }

    // ─── ربط أحداث الواجهة ───
    function bindEvents() {
        const elements = [DOM.search, DOM.type, DOM.status, DOM.priority, DOM.sort];
        elements.forEach(el => {
            if (!el) return;
            const eventType = el.tagName === 'INPUT' ? 'input' : 'change';
            el.addEventListener(eventType, () => {
                const newFilters = readFiltersFromUI();
                updateFilters(newFilters);
            });
        });
    }

    // ─── تهيئة الفلاتر ───
    function init() {
        loadFilters();
        bindEvents();
        console.log('✅ notification-filters.js ready');
    }

    // ─── API العامة ───
    window.NotificationFilters = {
        getFilters,
        updateFilters,
        resetFilters,
        applyFilters,
        addListener,
        loadFilters,
        saveFilters,
        DEFAULT_FILTERS,
        init
    };

    // تهيئة تلقائية
    init();

})();
