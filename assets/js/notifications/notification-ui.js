/**
 * ============================================================
 * notification-ui.js – عرض وتحديث الواجهة (مُصلح)
 * ============================================================
 * مسؤول عن عرض الإشعارات وتحديث الـ DOM بكفاءة
 * ربط الأحداث عبر Delegation لتجنب فقدان الربط
 */

(function() {
    'use strict';

    if (window.__notificationUI) return;
    window.__notificationUI = true;

    // ─── المراجع الأساسية ───
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
        modalTitle: document.getElementById('modalTitle')
    };

    let currentPage = 1;
    let pageSize = 20;
    let allNotifications = [];

    // ─── الأدوات المساعدة ───
    const Utils = {
        formatDate(iso) {
            if (!iso) return '—';
            const d = new Date(iso);
            return d.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
                ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        },

        formatTimeAgo(iso) {
            if (!iso) return '';
            const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
            if (diff < 60) return 'الآن';
            if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
            if (diff < 604800) return `${Math.floor(diff / 86400)} يوم`;
            return this.formatDate(iso);
        },

        getTypeIcon(type) {
            const map = {
                general: 'fa-bell', system: 'fa-server',
                investment: 'fa-chart-line', contract: 'fa-file-contract',
                payment: 'fa-hand-holding-usd', profit: 'fa-coins',
                kyc: 'fa-id-card', security: 'fa-shield-alt',
                support: 'fa-headset', promotion: 'fa-gift'
            };
            return map[type] || 'fa-bell';
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

        getTypeClass(type) {
            return 'type-' + (type || 'general');
        },

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

        isExpired(expiresAt) {
            if (!expiresAt) return false;
            return new Date(expiresAt) < new Date();
        }
    };

    // ─── عرض الإشعارات (الدالة الرئيسية) ───
    function renderNotifications(notifications, page = 1, pageSize = 20) {
        console.log('🔔 renderNotifications called with', notifications?.length, 'items');
        
        if (!DOM.list) {
            console.warn('⚠️ notificationsList element not found!');
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
            renderPagination(0, page, pageSize);
            return;
        }

        const from = (page - 1) * pageSize;
        const to = Math.min(from + pageSize, filtered.length);
        const pageItems = filtered.slice(from, to);

        let html = '';
        pageItems.forEach(n => {
            const isUnread = n.status === 'unread';
            const priorityClass = Utils.getPriorityClass(n.priority || 'normal');
            const icon = Utils.getTypeIcon(n.type);
            const typeLabel = Utils.getTypeLabel(n.type);
            const typeClass = Utils.getTypeClass(n.type);
            const statusLabel = Utils.getStatusLabel(n.status);

            const imageHtml = n.image_url ?
                `<img src="${n.image_url}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;margin-left:12px;">` :
                '';

            html += `
                <div class="notification-card ${isUnread ? 'unread' : ''}" data-id="${n.id}">
                    <div class="notif-icon ${typeClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    ${imageHtml}
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
                        <button class="view-details" data-id="${n.id}" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${isUnread ? `<button class="mark-read-btn" data-id="${n.id}" title="تعليم كمقروء"><i class="fas fa-envelope-open"></i></button>` : ''}
                        ${n.status !== 'archived' ? `<button class="archive-btn" data-id="${n.id}" title="أرشفة"><i class="fas fa-archive"></i></button>` : ''}
                        <button class="delete-btn danger" data-id="${n.id}" title="حذف"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });

        DOM.list.innerHTML = html;

        // ربط الأحداث باستخدام Delegation
        DOM.list.removeEventListener('click', handleCardClick);
        DOM.list.addEventListener('click', handleCardClick);

        renderPagination(filtered.length, page, pageSize);
        console.log(`✅ Rendered ${pageItems.length} notifications`);
    }

    // ─── معالج أحداث البطاقات ───
    function handleCardClick(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const card = target.closest('.notification-card');
        if (!card) return;

        const id = card.dataset.id;
        if (!id) return;

        if (target.classList.contains('view-details')) {
            e.stopPropagation();
            const notification = allNotifications.find(n => n.id === id);
            if (notification) {
                openDetail(notification);
            }
            return;
        }

        if (target.classList.contains('mark-read-btn')) {
            e.stopPropagation();
            if (window.NotificationActions && typeof window.NotificationActions.markAsRead === 'function') {
                window.NotificationActions.markAsRead(id).then(() => {
                    refreshCurrentList();
                });
            }
            return;
        }

        if (target.classList.contains('archive-btn')) {
            e.stopPropagation();
            if (window.NotificationActions && typeof window.NotificationActions.archive === 'function') {
                window.NotificationActions.archive(id).then(() => {
                    refreshCurrentList();
                });
            }
            return;
        }

        if (target.classList.contains('delete-btn')) {
            e.stopPropagation();
            if (window.NotificationActions && typeof window.NotificationActions.deleteNotification === 'function') {
                window.NotificationActions.deleteNotification(id).then(() => {
                    refreshCurrentList();
                });
            }
            return;
        }

        // النقر على البطاقة نفسها
        if (target === card || target.closest('.notif-content')) {
            const notification = allNotifications.find(n => n.id === id);
            if (notification) {
                openDetail(notification);
            }
        }
    }

    // ─── تحديث القائمة الحالية ───
    function refreshCurrentList() {
        const cache = window.NotificationCache;
        if (cache) {
            const all = cache.getAll();
            renderNotifications(all, currentPage, pageSize);
        } else {
            console.warn('⚠️ NotificationCache not available');
        }
    }

    // ─── عرض Pagination ───
    function renderPagination(total, page, pageSize) {
        if (!DOM.pagination) return;

        const totalPages = Math.ceil(total / pageSize);
        if (totalPages <= 1) {
            DOM.pagination.innerHTML = '';
            return;
        }

        let html = '';
        html += `<button ${page <= 1 ? 'disabled' : ''} data-page="${page-1}">‹</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button ${page >= totalPages ? 'disabled' : ''} data-page="${page+1}">›</button>`;

        DOM.pagination.innerHTML = html;

        DOM.pagination.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', function() {
                const p = parseInt(this.dataset.page);
                if (p && p !== currentPage) {
                    currentPage = p;
                    renderNotifications(allNotifications, p, pageSize);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    // ─── تحديث الإحصائيات ───
    function updateStats(stats) {
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
    function openDetail(notification) {
        if (!DOM.modal || !DOM.modalBody || !DOM.modalTitle) {
            console.warn('⚠️ Modal elements missing');
            return;
        }

        if (!notification) {
            console.warn('⚠️ Notification not found for detail');
            return;
        }

        DOM.modalTitle.textContent = notification.title || 'تفاصيل الإشعار';

        const imageHtml = notification.image_url ? `
            <div class="detail-row">
                <span class="label">الصورة</span>
                <span class="value"><img src="${notification.image_url}" alt="" style="max-width:100%;max-height:150px;border-radius:8px;border:1px solid var(--gray-200);"></span>
            </div>` : '';

        const actionHtml = notification.action_url ? `
            <div class="detail-row">
                <span class="label">الإجراء</span>
                <span class="value">
                    <a href="${notification.action_url}" target="_blank" class="action-link">
                        <i class="fas fa-arrow-left"></i> تنفيذ الإجراء
                    </a>
                </span>
            </div>` : '';

        const metaHtml = notification.metadata && Object.keys(notification.metadata).length > 0 ? `
            <div class="detail-row">
                <span class="label">بيانات إضافية</span>
                <span class="value" style="font-size:12px;font-family:monospace;direction:ltr;text-align:left;">${JSON.stringify(notification.metadata, null, 2)}</span>
            </div>` : '';

        DOM.modalBody.innerHTML = `
            <div class="detail-row"><span class="label">العنوان</span><span class="value">${notification.title || '—'}</span></div>
            <div class="detail-row"><span class="label">الوصف</span><span class="value">${notification.body || '—'}</span></div>
            ${imageHtml}
            <div class="detail-row"><span class="label">التاريخ والوقت</span><span class="value">${Utils.formatDate(notification.created_at)}</span></div>
            <div class="detail-row"><span class="label">المرسل</span><span class="value">${notification.sender || 'النظام'}</span></div>
            <div class="detail-row"><span class="label">النوع</span><span class="value">${Utils.getTypeLabel(notification.type)}</span></div>
            <div class="detail-row"><span class="label">الأولوية</span><span class="value">${Utils.getPriorityLabel(notification.priority)}</span></div>
            <div class="detail-row"><span class="label">الحالة</span><span class="value">${Utils.getStatusLabel(notification.status)}</span></div>
            ${notification.expires_at ? `<div class="detail-row"><span class="label">تنتهي في</span><span class="value">${Utils.formatDate(notification.expires_at)}</span></div>` : ''}
            ${actionHtml}
            ${metaHtml}
        `;

        DOM.modal.classList.add('active');

        if (notification.status === 'unread') {
            if (window.NotificationActions && typeof window.NotificationActions.markAsRead === 'function') {
                window.NotificationActions.markAsRead(notification.id);
            }
        }
    }

    // ─── إغلاق المودال ───
    function closeDetail() {
        if (DOM.modal) {
            DOM.modal.classList.remove('active');
        }
    }

    // ─── API العامة ───
    window.NotificationUI = {
        render: renderNotifications,
        renderPagination,
        updateStats,
        openDetail,
        closeDetail,
        goToPage: (page) => {
            if (page && page !== currentPage) {
                currentPage = page;
                const cache = window.NotificationCache;
                if (cache) {
                    const all = cache.getAll();
                    renderNotifications(all, page, pageSize);
                }
            }
        },
        refresh: refreshCurrentList,
        DOM
    };

    // ─── إغلاق المودال ───
    if (DOM.modal) {
        DOM.modal.addEventListener('click', (e) => {
            if (e.target === DOM.modal) closeDetail();
        });
    }

    const closeBtn = document.getElementById('closeDetailModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDetail);
    }

    console.log('✅ notification-ui.js ready');
})();
