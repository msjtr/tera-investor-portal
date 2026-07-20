/**
 * ============================================================
 * notification-history.js – سجل الإشعارات (المقروءة والمؤرشفة)
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationHistory) return;
    window.__notificationHistory = true;

    const DOM = {
        body: document.getElementById('historyTableBody'),
        pagination: document.getElementById('historyPagination')
    };

    let allHistoryData = [];
    let currentPage = 1;
    const pageSize = 20;

    // ─── تحميل السجل من الكاش أو من الـ API ───
    async function load(page = 1) {
        if (!DOM.body) return;

        // محاولة جلب البيانات من الكاش أولاً
        const cache = window.NotificationCache;
        let notifications = [];

        if (cache && typeof cache.getAll === 'function') {
            notifications = cache.getAll();
        } else {
            // إذا لم يكن الكاش جاهزاً، حاول جلب البيانات من الـ API
            try {
                const result = await window.NotificationAPI?.fetchNotifications();
                if (result?.data) {
                    notifications = result.data;
                    // تخزين في الكاش إذا كان متاحاً
                    if (cache && typeof cache.init === 'function') {
                        cache.init(notifications);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Failed to fetch notifications for history:', e.message);
                DOM.body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">فشل تحميل السجل</td></tr>';
                return;
            }
        }

        // تصفية المقروءة والمؤرشفة
        allHistoryData = notifications.filter(n => n.status === 'read' || n.status === 'archived');
        // ترتيب تنازلي (الأحدث أولاً)
        allHistoryData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const from = (page - 1) * pageSize;
        const to = Math.min(from + pageSize, allHistoryData.length);
        const pageItems = allHistoryData.slice(from, to);

        if (pageItems.length === 0) {
            DOM.body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">لا توجد إشعارات في السجل</td></tr>';
            renderPagination(0);
            return;
        }

        let html = '';
        pageItems.forEach(n => {
            const label = n.status === 'archived' ? 'مؤرشف' : 'مقروء';
            const typeLabel = window.NotificationUI?.getTypeLabel?.(n.type) || n.type || 'عام';
            html += `
                <tr>
                    <td style="font-size:12px;color:var(--gray-400);">${n.id.substring(0, 8)}</td>
                    <td>${typeLabel}</td>
                    <td>${n.title || '—'}</td>
                    <td>${n.sender || 'النظام'}</td>
                    <td><span class="status-badge ${n.status === 'archived' ? 'status-archived' : 'status-read'}">${label}</span></td>
                    <td>${new Date(n.created_at).toLocaleDateString('ar-SA')}</td>
                    <td>
                        <button class="action-btn view" onclick="window.__openDetail('${n.id}')"><i class="fas fa-eye"></i></button>
                        <button class="action-btn danger" onclick="window.__deleteNotification('${n.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        DOM.body.innerHTML = html;
        renderPagination(allHistoryData.length);
    }

    // ─── Pagination للسجل ───
    function renderPagination(total) {
        if (!DOM.pagination) return;
        const totalPages = Math.ceil(total / pageSize);
        if (totalPages <= 1) {
            DOM.pagination.innerHTML = '';
            return;
        }

        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        DOM.pagination.innerHTML = html;
        DOM.pagination.querySelectorAll('button[data-page]').forEach(b => {
            b.addEventListener('click', function() {
                const p = parseInt(this.dataset.page);
                if (p && p !== currentPage) {
                    currentPage = p;
                    load(p);
                }
            });
        });
    }

    // ─── تحديث السجل (يعيد تحميل البيانات من الكاش) ───
    function refresh() {
        load(currentPage);
    }

    // ─── تصدير API ───
    window.NotificationHistory = {
        load,
        refresh,
        setPage: (page) => { currentPage = page; load(page); }
    };

    // ─── الاستماع لتغييرات الكاش لتحديث السجل تلقائياً ───
    const cache = window.NotificationCache;
    if (cache && typeof cache.addListener === 'function') {
        cache.addListener(() => {
            // إذا كان التبويب النشط هو السجل، نعيد تحميله
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab && activeTab.dataset.tab === 'history') {
                load(currentPage);
            }
        });
    }

    console.log('✅ notification-history.js ready');
})();
