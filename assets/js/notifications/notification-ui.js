/**
 * ============================================================
 * notification-ui.js – عرض الواجهة والتفاعل (مُصلح بالكامل)
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationUI) return;
    window.__notificationUI = true;

    // ─── المراجع – نعيد تعريفها بشكل آمن ───
    let DOM = {};

    function refreshDOMReferences() {
        DOM = {
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
            sortOrder: document.getElementById('sortOrder'),
            selectAllBtn: document.getElementById('selectAllBtn'),
            markReadBtn: document.getElementById('markReadBtn'),
            archiveBtn: document.getElementById('archiveBtn'),
            deleteBtn: document.getElementById('deleteBtn')
        };

        if (!DOM.list) {
            console.warn('⚠️ notificationsList not found, will retry on next render');
        }
    }

    // ─── تحديث المراجع عند الحاجة ───
    refreshDOMReferences();

    let allNotifications = [];
    let currentPage = 1;
    const pageSize = 20;
    let selectedIds = new Set();

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
        // تحديث المراجع قبل الاستخدام
        refreshDOMReferences();

        if (!DOM.list) {
            console.warn('⚠️ notificationsList element not found, cannot render');
            // محاولة مرة أخرى بعد تأخير (مرة واحدة فقط)
            if (!render._retry) {
                render._retry = true;
                setTimeout(() => {
                    render._retry = false;
                    refreshDOMReferences();
                    if (DOM.list) {
                        render(notifications, page);
                    } else {
                        console.error('❌ notificationsList still not found after retry');
                    }
                }, 500);
            }
            return;
        }

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
            updateSelectAllButton();
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
            const isSelected = selectedIds.has(n.id);

            html += `
                <div class="notification-card ${isUnread ? 'unread' : ''} ${isSelected ? 'selected' : ''}" 
                     data-id="${n.id}"
                     style="${isSelected ? 'border-left:4px solid var(--primary);' : ''}">
                    <div class="notif-checkbox">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${n.id}" />
                    </div>
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

        // ربط أحداث الـ Checkbox
        DOM.list.querySelectorAll('.notif-checkbox input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                if (this.checked) {
                    selectedIds.add(id);
                } else {
                    selectedIds.delete(id);
                }
                const card = this.closest('.notification-card');
                if (card) {
                    card.classList.toggle('selected');
                    if (this.checked) {
                        card.style.borderLeft = '4px solid var(--primary)';
                    } else {
                        card.style.borderLeft = '';
                    }
                }
                updateSelectAllButton();
            });
        });

        // النقر على البطاقة نفسها لفتح التفاصيل
        DOM.list.querySelectorAll('.notification-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.closest('button') || e.target.closest('.notif-checkbox')) return;
                const id = this.dataset.id;
                if (id) {
                    const notification = allNotifications.find(n => n.id === id);
                    if (notification) openDetail(notification);
                }
            });
        });

        renderPagination(filtered.length);
        updateSelectAllButton();
    }
    // منع إعادة المحاولة المتكررة
    render._retry = false;

    // ─── معالج النقر على الأزرار ───
    function handleCardClick(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const card = btn.closest('.notification-card');
        if (!card) return;
        const id = card.dataset.id;
        if (!id) return;

        const notification = allNotifications.find(n => n.id === id);
        if (!notification) return;

        if (btn.classList.contains('view-details')) {
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
            if (confirm('هل تريد أرشفة هذا الإشعار؟')) {
                window.NotificationActions?.archive(id).then(() => refresh());
            }
            return;
        }

        if (btn.classList.contains('delete-btn')) {
            e.stopPropagation();
            if (confirm('هل أنت متأكد من حذف هذا الإشعار نهائياً؟')) {
                window.NotificationActions?.deleteNotification(id).then(() => refresh());
            }
            return;
        }
    }

    // ─── Pagination ───
    function renderPagination(total) {
        if (!DOM.pagination) return;
        const totalPages = Math.ceil(total / pageSize);
        if (totalPages <= 1) {
            DOM.pagination.innerHTML = '';
            return;
        }

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

    // ─── تحديث زر "تحديد الكل" ───
    function updateSelectAllButton() {
        if (!DOM.selectAllBtn) return;
        const cards = document.querySelectorAll('.notification-card');
        const allIds = Array.from(cards).map(el => el.dataset.id).filter(id => id);
        if (allIds.length === 0) {
            DOM.selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> تحديد الكل';
            return;
        }
        const allSelected = allIds.every(id => selectedIds.has(id));
        DOM.selectAllBtn.innerHTML = allSelected ?
            '<i class="fas fa-check-square"></i> إلغاء التحديد' :
            '<i class="fas fa-check-double"></i> تحديد الكل';
    }

    // ─── تحديد الكل / إلغاء التحديد ───
    function toggleSelectAll() {
        const cards = document.querySelectorAll('.notification-card');
        const allIds = Array.from(cards).map(el => el.dataset.id).filter(id => id);
        if (allIds.length === 0) return;

        const allSelected = allIds.every(id => selectedIds.has(id));
        if (allSelected) {
            selectedIds.clear();
        } else {
            allIds.forEach(id => selectedIds.add(id));
        }

        cards.forEach(el => {
            const id = el.dataset.id;
            const checkbox = el.querySelector('.notif-checkbox input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = selectedIds.has(id);
            }
            if (selectedIds.has(id)) {
                el.classList.add('selected');
                el.style.borderLeft = '4px solid var(--primary)';
            } else {
                el.classList.remove('selected');
                el.style.borderLeft = '';
            }
        });
        updateSelectAllButton();
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
        if (n.status === 'unread') {
            window.NotificationActions?.markAsRead(n.id).then(() => refresh());
        }
    }

    function closeDetail() {
        if (DOM.modal) DOM.modal.classList.remove('active');
    }

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

    // ─── ربط أزرار شريط الأدوات ───
    function bindToolbarButtons() {
        if (DOM.selectAllBtn) {
            DOM.selectAllBtn.addEventListener('click', toggleSelectAll);
        }

        if (DOM.markReadBtn) {
            DOM.markReadBtn.addEventListener('click', async function() {
                const ids = Array.from(selectedIds);
                if (ids.length === 0) {
                    alert('يرجى تحديد إشعارات أولاً');
                    return;
                }
                if (!confirm(`هل تريد تعليم ${ids.length} إشعار كمقروء؟`)) return;

                for (const id of ids) {
                    await window.NotificationActions?.markAsRead(id);
                }
                selectedIds.clear();
                refresh();
                await window.Support?.updateNotificationBadge?.();
            });
        }

        if (DOM.archiveBtn) {
            DOM.archiveBtn.addEventListener('click', async function() {
                const ids = Array.from(selectedIds);
                if (ids.length === 0) {
                    alert('يرجى تحديد إشعارات أولاً');
                    return;
                }
                if (!confirm(`هل تريد أرشفة ${ids.length} إشعار؟`)) return;

                for (const id of ids) {
                    await window.NotificationActions?.archive(id);
                }
                selectedIds.clear();
                refresh();
                await window.Support?.updateNotificationBadge?.();
            });
        }

        if (DOM.deleteBtn) {
            DOM.deleteBtn.addEventListener('click', async function() {
                const ids = Array.from(selectedIds);
                if (ids.length === 0) {
                    alert('يرجى تحديد إشعارات أولاً');
                    return;
                }
                if (!confirm(`هل تريد حذف ${ids.length} إشعار نهائياً؟`)) return;

                for (const id of ids) {
                    await window.NotificationActions?.deleteNotification(id);
                }
                selectedIds.clear();
                refresh();
                await window.Support?.updateNotificationBadge?.();
            });
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
        selectedIds.clear();
        refresh();
    }

    // ─── التهيئة ───
    function init() {
        // تأكد من وجود العنصر
        const list = document.getElementById('notificationsList');
        if (!list) {
            console.warn('⏳ notificationsList not ready, retrying in 500ms');
            setTimeout(init, 500);
            return;
        }

        refreshDOMReferences();
        bindFilters();
        bindToolbarButtons();

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

    // ─── API العامة ───
    window.NotificationUI = {
        render,
        refresh,
        updateStats,
        openDetail,
        closeDetail,
        init,
        selectedIds: () => selectedIds,
        toggleSelectAll
    };

    // تشغيل التهيئة إذا كان DOM جاهزاً
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // إذا كان DOM جاهزاً بالفعل، حاول التهيئة فوراً
        init();
    }

    console.log('✅ notification-ui.js ready');
})();
