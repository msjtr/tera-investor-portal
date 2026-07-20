/**
 * ============================================================
 * notification-ui.js – عرض الواجهة والتفاعل
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationUI) return;
    window.__notificationUI = true;

    const DOM = {
        list: document.getElementById('notificationsList'),
        pagination: document.getElementById('pagination'),
        stats: {
            total: document.getElementById('statTotal'),
            unread: document.getElementById('statUnread'),
            read: document.getElementById('statRead'),
            archived: document.getElementById('statArchived'),
            important: document.getElementById('statImportant')
        },
        unreadBadge: document.getElementById('unreadBadge'),
        modal: document.getElementById('detailModal'),
        modalBody: document.getElementById('modalBody'),
        modalTitle: document.getElementById('modalTitle'),
        closeModal: document.getElementById('closeDetailModal'),
        search: document.getElementById('searchInput'),
        filterType: document.getElementById('filterType'),
        filterStatus: document.getElementById('filterStatus'),
        filterPriority: document.getElementById('filterPriority'),
        sortOrder: document.getElementById('sortOrder')
    };

    let allNotifications = [];
    let currentPage = 1;
    const pageSize = 20;

    // ─── مساعدات ───
    const Utils = {
        formatTimeAgo(iso) {
            if (!iso) return '';
            const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
            if (diff < 60) return 'الآن';
            if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
            if (diff < 604800) return `${Math.floor(diff / 86400)} يوم`;
            return new Date(iso).toLocaleDateString('ar-SA');
        },
        getTypeIcon(t) {
            const map = { general: 'fa-bell', system: 'fa-server', investment: 'fa-chart-line', contract: 'fa-file-contract', payment: 'fa-hand-holding-usd', profit: 'fa-coins', kyc: 'fa-id-card', security: 'fa-shield-alt', support: 'fa-headset', promotion: 'fa-gift' };
            return map[t] || 'fa-bell';
        },
        getTypeLabel(t) {
            const map = { general: 'عام', system: 'نظام', investment: 'استثمار', contract: 'عقد', payment: 'دفعة', profit: 'أرباح', kyc: 'التحقق من الهوية', security: 'أمان', support: 'دعم فني', promotion: 'ترويجي' };
            return map[t] || t;
        },
        getTypeClass(t) { return 'type-' + (t || 'general'); },
        getPriorityLabel(p) {
            const map = { urgent: 'عاجل', high: 'مرتفع', medium: 'متوسط', normal: 'عادي', low: 'منخفض' };
            return map[p] || p;
        },
        getPriorityClass(p) {
            const map = { urgent: 'critical', high: 'high', medium: 'medium', normal: 'medium', low: 'low' };
            return map[p] || 'medium';
        },
        getStatusLabel(s) {
            const map = { unread: 'غير مقروء', read: 'مقروء', archived: 'مؤرشف', deleted: 'محذوف' };
            return map[s] || s;
        },
        isExpired(exp) { return exp ? new Date(exp) < new Date() : false; },
        formatDate(iso) {
            if (!iso) return '—';
            const d = new Date(iso);
            return d.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        }
    };

    // ─── عرض الإشعارات ───
    function render(notifications, page = 1) {
        allNotifications = notifications || [];
        currentPage = page;

        const filtered = allNotifications.filter(n => !Utils.isExpired(n.expires_at));
        if (filtered.length === 0) {
            DOM.list.innerHTML = `
                <div style="text-align:center;padding:80px 20px;color:var(--gray-400);">
                    <i class="fas fa-inbox" style="font-size:64px;display:block;margin-bottom:20px;color:var(--gray-300);"></i>
                    <span style="font-weight:700;font-size:20px;color:var(--gray-600);">لا توجد إشعارات</span>
                    <p style="margin-top:8px;font-size:14px;">سيتم عرض الإشعارات هنا عند ورودها.</p>
                </div>
            `;
            renderPagination(0);
            return;
        }

        const from = (page - 1) * pageSize;
        const to = Math.min(from + pageSize, filtered.length);
        const pageItems = filtered.slice(from, to);

        let html = '';
        pageItems.forEach(n => {
            const isUnread = n.status === 'unread';
            const icon = Utils.getTypeIcon(n.type);
            const typeLabel = Utils.getTypeLabel(n.type);
            const typeClass = Utils.getTypeClass(n.type);
            const priorityClass = Utils.getPriorityClass(n.priority);
            const statusLabel = Utils.getStatusLabel(n.status);

            html += `
                <div class="notification-card ${isUnread ? 'unread' : ''}" data-id="${n.id}">
                    <div class="notif-icon ${typeClass}"><i class="fas ${icon}"></i></div>
                    <div class="notif-content">
                        <div class="notif-title">
                            ${n.title || 'بدون عنوان'}
                            <span class="priority-badge ${priorityClass}">${Utils.getPriorityLabel(n.priority)}</span>
                            ${isUnread ? '<span class="new-badge" style="font-size:10px;color:var(--primary);font-weight:800;">● جديد</span>' : ''}
                        </div>
                        <div class="notif-desc">${n.body || ''}</div>
                        <div class="notif-meta">
                            <span><i class="far fa-clock"></i> ${Utils.formatTimeAgo(n.created_at)}</span>
                            <span class="type-badge"><i class="fas ${icon}"></i> ${typeLabel}</span>
                            <span>الحالة: ${statusLabel}</span>
                            ${n.sender ? `<span><i class="fas fa-user"></i> ${n.sender}</span>` : ''}
                        </div>
                    </div>
                    <div class="notif-actions">
                        <button class="view-details" data-id="${n.id}"><i class="fas fa-eye"></i></button>
                        ${isUnread ? `<button class="mark-read-btn" data-id="${n.id}"><i class="fas fa-envelope-open"></i></button>` : ''}
                        ${n.status !== 'archived' ? `<button class="archive-btn" data-id="${n.id}"><i class="fas fa-archive"></i></button>` : ''}
                        <button class="delete-btn danger" data-id="${n.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });

        DOM.list.innerHTML = html;
        DOM.list.removeEventListener('click', handleCardClick);
        DOM.list.addEventListener('click', handleCardClick);

        renderPagination(filtered.length);
    }

    // ─── معالج النقر على البطاقات ───
    function handleCardClick(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const card = btn.closest('.notification-card');
        if (!card) return;
        const id = card.dataset.id;
        if (!id) return;

        const notification = allNotifications.find(n => n.id === id);
        if (!notification) return;

        if (btn.classList.contains('view-details') || e.target.closest('.notif-content') || e.target === card) {
            e.stopPropagation();
            openDetail(notification);
            return;
        }

        if (btn.classList.contains('mark-read-btn')) {
            e.stopPropagation();
            window.NotificationActions?.markAsRead(id).then(() => refresh());
            return;
        }

        if (btn.classList.contains('archive-btn')) {
            e.stopPropagation();
            window.NotificationActions?.archive(id).then(() => refresh());
            return;
        }

        if (btn.classList.contains('delete-btn')) {
            e.stopPropagation();
            if (confirm('حذف هذا الإشعار؟')) {
                window.NotificationActions?.deleteNotification(id).then(() => refresh());
            }
        }
    }

    // ─── Pagination ───
    function renderPagination(total) {
        const totalPages = Math.ceil(total / pageSize);
        if (totalPages <= 1) { DOM.pagination.innerHTML = ''; return; }

        let html = '';
        html += `<button ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;
        DOM.pagination.innerHTML = html;

        DOM.pagination.querySelectorAll('button[data-page]').forEach(b => {
            b.addEventListener('click', function() {
                const p = parseInt(this.dataset.page);
                if (p && p !== currentPage) {
                    currentPage = p;
                    const filtered = window.NotificationFilters?.apply(allNotifications) || allNotifications;
                    render(filtered, p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    // ─── تحديث الإحصائيات ───
    function updateStats(stats) {
        if (!stats) {
            const cache = window.NotificationCache;
            if (cache) stats = cache.getStats();
        }
        if (!stats) return;
        if (DOM.stats.total) DOM.stats.total.textContent = stats.total || 0;
        if (DOM.stats.unread) DOM.stats.unread.textContent = stats.unread || 0;
        if (DOM.stats.read) DOM.stats.read.textContent = stats.read || 0;
        if (DOM.stats.archived) DOM.stats.archived.textContent = stats.archived || 0;
        if (DOM.stats.important) DOM.stats.important.textContent = stats.important || 0;
        if (DOM.unreadBadge) {
            DOM.unreadBadge.textContent = stats.unread || 0;
            DOM.unreadBadge.style.display = stats.unread > 0 ? 'inline-block' : 'none';
        }
        document.title = stats.unread > 0 ? `(${stats.unread}) مركز الإشعارات | Tera` : 'مركز الإشعارات | Tera';
    }

    // ─── عرض التفاصيل ───
    function openDetail(n) {
        if (!DOM.modal) return;
        DOM.modalTitle.textContent = n.title || 'تفاصيل';
        DOM.modalBody.innerHTML = `
            <div class="detail-row"><span class="label">العنوان</span><span class="value">${n.title || '—'}</span></div>
            <div class="detail-row"><span class="label">الوصف</span><span class="value">${n.body || '—'}</span></div>
            <div class="detail-row"><span class="label">التاريخ</span><span class="value">${Utils.formatDate(n.created_at)}</span></div>
            <div class="detail-row"><span class="label">المرسل</span><span class="value">${n.sender || 'النظام'}</span></div>
            <div class="detail-row"><span class="label">النوع</span><span class="value">${Utils.getTypeLabel(n.type)}</span></div>
            <div class="detail-row"><span class="label">الأولوية</span><span class="value">${Utils.getPriorityLabel(n.priority)}</span></div>
            <div class="detail-row"><span class="label">الحالة</span><span class="value">${Utils.getStatusLabel(n.status)}</span></div>
            ${n.action_url ? `<div class="detail-row"><span class="label">الإجراء</span><span class="value"><a href="${n.action_url}" target="_blank" class="action-link">تنفيذ</a></span></div>` : ''}
        `;
        DOM.modal.classList.add('active');
        if (n.status === 'unread') window.NotificationActions?.markAsRead(n.id).then(() => refresh());
    }

    function closeDetail() { if (DOM.modal) DOM.modal.classList.remove('active'); }

    // ─── تحديث القائمة ───
    function refresh() {
        const cache = window.NotificationCache;
        if (cache) {
            const all = cache.getAll();
            const filtered = window.NotificationFilters?.apply(all) || all;
            render(filtered, currentPage);
            updateStats(cache.getStats());
        }
    }

    // ─── ربط الفلاتر ───
    function bindFilters() {
        const elements = [DOM.search, DOM.filterType, DOM.filterStatus, DOM.filterPriority, DOM.sortOrder];
        elements.forEach(el => {
            if (!el) return;
            el.addEventListener('input', handleFilterChange);
            el.addEventListener('change', handleFilterChange);
        });
    }

    function handleFilterChange() {
        const filters = {
            search: DOM.search?.value?.trim() || '',
            type: DOM.filterType?.value || 'all',
            status: DOM.filterStatus?.value || 'all',
            priority: DOM.filterPriority?.value || 'all',
            sort: DOM.sortOrder?.value || 'desc'
        };
        window.NotificationFilters?.update(filters);
        refresh();
    }

    // ─── التهيئة ───
    function init() {
        if (DOM.closeModal) DOM.closeModal.addEventListener('click', closeDetail);
        if (DOM.modal) DOM.modal.addEventListener('click', (e) => { if (e.target === DOM.modal) closeDetail(); });
        bindFilters();

        // استمع لتحديثات الكاش
        const cache = window.NotificationCache;
        if (cache) {
            cache.addListener((items, stats) => {
                allNotifications = items;
                const filtered = window.NotificationFilters?.apply(items) || items;
                render(filtered, currentPage);
                updateStats(stats);
            });
        }

        console.log('✅ notification-ui.js ready');
    }

    window.NotificationUI = { render, refresh, updateStats, openDetail, closeDetail, init };
    console.log('✅ notification-ui.js ready');
})();
