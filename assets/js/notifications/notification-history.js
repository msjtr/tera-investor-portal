/**
 * ============================================================
 * notification-history.js – سجل الإشعارات
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

    let allData = [];
    let currentPage = 1;
    const pageSize = 20;

    function load(page = 1) {
        if (!DOM.body) return;
        const cache = window.NotificationCache;
        if (!cache) { DOM.body.innerHTML = '<tr><td colspan="7">الكاش غير متوفر</td></tr>'; return; }

        allData = cache.getAll().filter(n => n.status === 'read' || n.status === 'archived');
        allData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const from = (page - 1) * pageSize;
        const to = Math.min(from + pageSize, allData.length);
        const pageItems = allData.slice(from, to);

        if (pageItems.length === 0) {
            DOM.body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">لا توجد إشعارات في السجل</td></tr>';
            renderPagination(0);
            return;
        }

        let html = '';
        pageItems.forEach(n => {
            const label = n.status === 'archived' ? 'مؤرشف' : 'مقروء';
            html += `
                <tr>
                    <td style="font-size:12px;color:var(--gray-400);">${n.id.substring(0, 8)}</td>
                    <td>${window.NotificationUI?.getTypeLabel?.(n.type) || n.type}</td>
                    <td>${n.title || '—'}</td>
                    <td>${n.sender || 'النظام'}</td>
                    <td><span class="status-badge">${label}</span></td>
                    <td>${new Date(n.created_at).toLocaleDateString('ar-SA')}</td>
                    <td>
                        <button class="action-btn view" onclick="window.__openDetail('${n.id}')"><i class="fas fa-eye"></i></button>
                        <button class="action-btn danger" onclick="window.__deleteNotification('${n.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        DOM.body.innerHTML = html;
        renderPagination(allData.length);
    }

    function renderPagination(total) {
        if (!DOM.pagination) return;
        const totalPages = Math.ceil(total / pageSize);
        if (totalPages <= 1) { DOM.pagination.innerHTML = ''; return; }

        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        DOM.pagination.innerHTML = html;
        DOM.pagination.querySelectorAll('button[data-page]').forEach(b => {
            b.addEventListener('click', function() {
                const p = parseInt(this.dataset.page);
                if (p && p !== currentPage) { currentPage = p; load(p); }
            });
        });
    }

    window.NotificationHistory = { load };
    console.log('✅ notification-history.js ready');
})();
