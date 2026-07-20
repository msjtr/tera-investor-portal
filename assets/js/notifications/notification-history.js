// ============================================================
// notification-history.js – سجل الإشعارات
// ============================================================
// عرض وتحميل سجل الإشعارات (المقروءة والمؤرشفة)
// ============================================================

(function() {
    'use strict';

    if (window.__notificationHistory) return;
    window.__notificationHistory = true;

    const PAGE_SIZE = 20;
    let currentPage = 1;
    let totalItems = 0;
    let historyData = [];

    // ─── المراجع DOM ───
    const DOM = {
        body: document.getElementById('historyTableBody'),
        pagination: document.getElementById('historyPagination')
    };

    // ─── الأدوات المساعدة ───
    const Utils = {
        formatDate(iso) {
            if (!iso) return '—';
            const d = new Date(iso);
            return d.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
                ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        },

        getTypeLabel(type) {
            const map = {
                general: 'عام', system: 'نظام',
                investment: 'استثمار', contract: 'عقد',
                payment: 'دفعة', profit: 'أرباح',
                kyc: 'التحقق من الهوية', security: 'أمان',
                support: 'دعم فني', promotion: 'ترويجي'
            };
            return map[type] || type;
        },

        getStatusLabel(s) {
            const map = { unread: 'غير مقروء', read: 'مقروء', archived: 'مؤرشف', deleted: 'محذوف' };
            return map[s] || s;
        }
    };

    // ─── تحميل التاريخ ───
    function loadHistory(page = 1) {
        if (!DOM.body) return;

        // الحصول على البيانات من الكاش
        const cache = window.NotificationCache;
        if (!cache) {
            DOM.body.innerHTML = '<tr><td colspan="7" style="text-align:center;">نظام الكاش غير متوفر</td></tr>';
            return;
        }

        const allNotifications = cache.getAll();
        historyData = allNotifications.filter(n =>
            n.status === 'read' || n.status === 'archived'
        );

        // ترتيب تنازلي (الأحدث أولاً)
        historyData.sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        totalItems = historyData.length;

        // Pagination
        const from = (page - 1) * PAGE_SIZE;
        const to = Math.min(from + PAGE_SIZE, totalItems);
        const pageItems = historyData.slice(from, to);

        if (pageItems.length === 0) {
            DOM.body.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">
                        لا توجد إشعارات في السجل
                    </td>
                </tr>
            `;
            renderHistoryPagination(page);
            return;
        }

        let html = '';
        pageItems.forEach(n => {
            html += `
                <tr>
                    <td style="font-size:12px;color:var(--gray-400);">${n.id.substring(0, 8)}</td>
                    <td>${Utils.getTypeLabel(n.type)}</td>
                    <td>${n.title || '—'}</td>
                    <td>${n.sender || 'النظام'}</td>
                    <td>
                        <span class="status-badge ${n.status === 'archived' ? 'status-archived' : 'status-read'}">
                            ${Utils.getStatusLabel(n.status)}
                        </span>
                    </td>
                    <td>${Utils.formatDate(n.created_at)}</td>
                    <td>
                        <button class="action-btn view" onclick="window.NotificationUI?.openDetail?.({
                            id: '${n.id}',
                            title: '${n.title || ''}',
                            body: '${n.body || ''}',
                            type: '${n.type || ''}',
                            priority: '${n.priority || ''}',
                            status: '${n.status || ''}',
                            sender: '${n.sender || ''}',
                            created_at: '${n.created_at || ''}',
                            image_url: '${n.image_url || ''}',
                            action_url: '${n.action_url || ''}',
                            metadata: ${JSON.stringify(n.metadata || {})}
                        })">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${n.status !== 'deleted' ? `
                            <button class="action-btn danger" onclick="window.NotificationActions?.deleteNotification?.('${n.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        DOM.body.innerHTML = html;
        currentPage = page;
        renderHistoryPagination(page);
    }

    // ─── عرض Pagination للسجل ───
    function renderHistoryPagination(page) {
        if (!DOM.pagination) return;

        const totalPages = Math.ceil(totalItems / PAGE_SIZE);
        if (totalPages <= 1) {
            DOM.pagination.innerHTML = '';
            return;
        }

        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        DOM.pagination.innerHTML = html;
        DOM.pagination.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', function() {
                const p = parseInt(this.dataset.page);
                if (p && p !== currentPage) {
                    loadHistory(p);
                }
            });
        });
    }

    // ─── تحديث السجل تلقائياً عند تغيير الكاش ───
    function setupAutoRefresh() {
        const cache = window.NotificationCache;
        if (cache) {
            cache.addListener(() => {
                // إعادة تحميل السجل إذا كنا في علامة التبويب المناسبة
                const activeTab = document.querySelector('.tab-panel.active');
                if (activeTab && activeTab.id === 'panel-history') {
                    loadHistory(currentPage);
                }
            });
        }
    }

    // ─── API العامة ───
    window.NotificationHistory = {
        load: loadHistory,
        refresh: () => loadHistory(currentPage),
        setPage: (page) => loadHistory(page || 1),
        getCurrentPage: () => currentPage,
        getTotalItems: () => totalItems
    };

    // ─── تهيئة ───
    function init() {
        setupAutoRefresh();
        loadHistory(1);
        console.log('✅ notification-history.js ready');
    }

    // ─── استماع لتغيير التبويب ───
    document.addEventListener('tab:changed', (e) => {
        if (e.detail?.tab === 'history') {
            loadHistory(currentPage);
        }
    });

    // ─── تشغيل التهيئة ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
