/**
 * ========================================================
 * support-notifications.js – مركز الإشعارات الكامل
 * الإصدار v3 – متكامل مع Supabase + OneSignal + Realtime
 * ========================================================
 */

(function() {
    'use strict';

    if (window.__notificationsInitialized) return;
    window.__notificationsInitialized = true;

    // ===== الحالة =====
    let currentPage = 1;
    let currentTab = 'inbox';
    let selectedIds = new Set();
    let allNotifications = [];
    let filteredNotifications = [];
    let totalCount = 0;
    let unreadCount = 0;
    let isInfiniteScroll = true;
    const pageSize = 20;
    let isLoading = false;
    let hasMore = true;
    let supabase = null;
    let currentUser = null;
    let realtimeChannel = null;
    let toastTimeout = null;
    let audioElement = null;

    // ===== المراجع =====
    const $ = id => document.getElementById(id);
    const listEl = $('notificationsList');
    const paginationEl = $('pagination');
    const searchInput = $('searchInput');
    const filterType = $('filterType');
    const filterStatus = $('filterStatus');
    const filterPriority = $('filterPriority');
    const sortOrder = $('sortOrder');
    const refreshBtn = $('refreshBtn');
    const selectAllBtn = $('selectAllBtn');
    const markReadBtn = $('markReadBtn');
    const archiveBtn = $('archiveBtn');
    const deleteBtn = $('deleteBtn');
    const unreadBadge = $('unreadBadge');
    const modal = $('detailModal');
    const modalBody = $('modalBody');
    const modalTitle = $('modalTitle');
    const closeDetailModal = $('closeDetailModal');
    const alertsPanel = document.querySelector('#alertsPanel');
    const alertsContainer = document.querySelector('#alertsContainer');

    // ===== أدوات مساعدة =====
    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }

    function formatTimeAgo(iso) {
        if (!iso) return '';
        const diff = Math.floor((new Date() - new Date(iso)) / 1000);
        if (diff < 60) return 'الآن';
        if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} يوم`;
        return formatDate(iso);
    }

    function getTypeIcon(type) {
        const map = {
            general: 'fa-bell',
            system: 'fa-server',
            investment: 'fa-chart-line',
            contract: 'fa-file-contract',
            payment: 'fa-hand-holding-usd',
            profit: 'fa-coins',
            kyc: 'fa-id-card',
            security: 'fa-shield-alt',
            support: 'fa-headset',
            promotion: 'fa-gift',
            portfolio: 'fa-wallet',
            verification: 'fa-check-circle',
            due: 'fa-clock'
        };
        return map[type] || 'fa-bell';
    }

    function getTypeLabel(type) {
        const map = {
            general: 'عام',
            system: 'نظام',
            investment: 'استثمار',
            contract: 'عقد',
            payment: 'دفعة',
            profit: 'أرباح',
            kyc: 'التحقق من الهوية',
            security: 'أمان',
            support: 'دعم فني',
            promotion: 'ترويجي',
            portfolio: 'محفظة',
            verification: 'تحقق',
            due: 'مستحق'
        };
        return map[type] || type;
    }

    function getTypeClass(type) {
        return 'type-' + (type || 'general');
    }

    function getPriorityLabel(p) {
        const map = { urgent: 'عاجل', high: 'مرتفع', normal: 'متوسط', low: 'منخفض' };
        return map[p] || p;
    }

    function getPriorityClass(p) {
        const map = { urgent: 'critical', high: 'high', normal: 'medium', low: 'low' };
        return map[p] || 'medium';
    }

    function getStatusLabel(s) {
        const map = { unread: 'غير مقروء', read: 'مقروء', archived: 'مؤرشف', deleted: 'محذوف' };
        return map[s] || s;
    }

    function getStatusClass(s) {
        const map = { unread: 'unread', read: 'read', archived: 'archived', deleted: 'deleted' };
        return map[s] || '';
    }

    // ===== الحصول على Supabase والمستخدم =====
    async function getSupabase() {
        if (supabase) return supabase;
        try {
            if (window.Support && window.Support.getSupabase) {
                supabase = await window.Support.getSupabase();
            } else {
                supabase = window.teraSupabase || await window.waitForSupabase?.();
            }
            return supabase;
        } catch (e) {
            console.error('❌ Supabase غير متوفر:', e);
            return null;
        }
    }

    async function getCurrentUser() {
        if (currentUser) return currentUser;
        try {
            if (window.Support && window.Support.getCurrentUser) {
                currentUser = await window.Support.getCurrentUser();
                return currentUser;
            }
            if (window.Auth && window.Auth.getCurrentUser) {
                currentUser = await window.Auth.getCurrentUser();
                return currentUser;
            }
            const sb = await getSupabase();
            if (!sb) return null;
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) return null;
            currentUser = user;
            return user;
        } catch (e) {
            console.warn('⚠️ فشل جلب المستخدم:', e);
            return null;
        }
    }

    // ===== تحميل الإشعارات =====
    async function loadNotifications(page = 1, append = false) {
        if (isLoading) return;
        isLoading = true;

        try {
            const user = await getCurrentUser();
            if (!user) {
                listEl.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                        <i class="fas fa-sign-in-alt" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                        <span style="font-weight:700;font-size:18px;">يرجى تسجيل الدخول</span>
                        <p style="margin-top:8px;font-size:14px;">يجب تسجيل الدخول لعرض الإشعارات.</p>
                    </div>
                `;
                isLoading = false;
                return;
            }

            const sb = await getSupabase();
            if (!sb) {
                listEl.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;color:var(--danger);">
                        <i class="fas fa-database" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                        <span style="font-weight:700;font-size:18px;">Supabase غير متصل</span>
                        <p style="margin-top:8px;font-size:14px;">يرجى التحقق من الاتصال بقاعدة البيانات.</p>
                    </div>
                `;
                isLoading = false;
                return;
            }

            const search = searchInput.value.trim();
            const type = filterType.value;
            const status = filterStatus.value;
            const priority = filterPriority.value;
            const sort = sortOrder.value;

            let query = sb
                .from('notifications')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: sort === 'asc' });

            if (type !== 'all') query = query.eq('type', type);
            if (status !== 'all') query = query.eq('status', status);
            if (priority !== 'all') query = query.eq('priority', priority);
            if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, count, error } = await query;

            if (error) {
                if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
                    listEl.innerHTML = `
                        <div style="text-align:center;padding:60px 20px;color:var(--warning);">
                            <i class="fas fa-lock" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                            <span style="font-weight:700;font-size:18px;">ليس لديك صلاحية لعرض الإشعارات</span>
                            <p style="margin-top:8px;font-size:14px;">يرجى التواصل مع الدعم الفني لتفعيل صلاحيات الإشعارات.</p>
                        </div>
                    `;
                    isLoading = false;
                    return;
                }
                throw error;
            }

            totalCount = count || 0;
            const newNotifications = data || [];

            if (append) {
                allNotifications = [...allNotifications, ...newNotifications];
            } else {
                allNotifications = newNotifications;
                currentPage = page;
            }

            filteredNotifications = allNotifications;

            // تحديث العداد
            await updateStats();
            await updateBadge();

            renderNotifications(filteredNotifications);
            updatePagination(page);

            hasMore = (page * pageSize) < totalCount;

        } catch (err) {
            console.error('❌ Error loading notifications:', err);
            listEl.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--danger);">
                    <i class="fas fa-exclamation-circle" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                    <span style="font-weight:700;font-size:18px;">خطأ في تحميل الإشعارات</span>
                    <p style="margin-top:8px;font-size:14px;">${err.message}</p>
                    <button class="btn-tool primary" onclick="window.__loadNotifications(1)" style="margin-top:12px;">
                        <i class="fas fa-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        } finally {
            isLoading = false;
        }
    }

    // ===== عرض الإشعارات =====
    function renderNotifications(notifications) {
        if (!notifications || notifications.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:80px 20px;color:var(--gray-400);">
                    <i class="fas fa-inbox" style="font-size:64px;display:block;margin-bottom:20px;color:var(--gray-300);"></i>
                    <span style="font-weight:700;font-size:20px;color:var(--gray-600);">لا توجد إشعارات</span>
                    <p style="margin-top:8px;font-size:14px;">سيتم عرض الإشعارات هنا عند ورودها.</p>
                </div>
            `;
            return;
        }

        let html = '';
        notifications.forEach((n, index) => {
            const isUnread = n.status === 'unread';
            const priorityClass = getPriorityClass(n.priority || 'normal');
            const icon = getTypeIcon(n.type);
            const typeLabel = getTypeLabel(n.type);
            const typeClass = getTypeClass(n.type);
            const statusLabel = getStatusLabel(n.status);
            const isSelected = selectedIds.has(n.id);

            html += `
                <div class="notification-card ${isUnread ? 'unread' : ''} ${isSelected ? 'selected' : ''}" 
                     data-id="${n.id}" data-index="${index}"
                     style="${isSelected ? 'border-left:4px solid var(--primary);' : ''}">
                    <div class="notif-icon ${typeClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="notif-content">
                        <div class="notif-title">
                            ${n.title || 'بدون عنوان'}
                            <span class="priority-badge ${priorityClass}">${getPriorityLabel(n.priority)}</span>
                            ${isUnread ? '<span style="font-size:10px;color:var(--primary);font-weight:800;">● جديد</span>' : ''}
                        </div>
                        <div class="notif-desc">${n.body || ''}</div>
                        <div class="notif-meta">
                            <span><i class="far fa-clock"></i> ${formatTimeAgo(n.created_at)}</span>
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

        // Infinite Scroll trigger
        if (hasMore && isInfiniteScroll) {
            html += `
                <div id="loadMoreTrigger" style="text-align:center;padding:20px;color:var(--gray-400);">
                    <span>جاري تحميل المزيد...</span>
                </div>
            `;
        }

        listEl.innerHTML = html;

        // ربط الأحداث
        listEl.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', () => openDetail(btn.dataset.id));
        });
        listEl.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', () => markAsRead(btn.dataset.id));
        });
        listEl.querySelectorAll('.archive-btn').forEach(btn => {
            btn.addEventListener('click', () => archiveNotification(btn.dataset.id));
        });
        listEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteNotification(btn.dataset.id));
        });

        // النقر على البطاقة لفتح التفاصيل
        listEl.querySelectorAll('.notification-card').forEach(card => {
            card.addEventListener('click', function(e) {
                // منع الفتح إذا تم النقر على زر
                if (e.target.closest('button')) return;
                const id = this.dataset.id;
                if (id) openDetail(id);
            });
        });

        // تحديث حالة التحديد
        updateSelectAllState();

        // مراقبة Infinite Scroll
        if (hasMore && isInfiniteScroll) {
            const trigger = document.getElementById('loadMoreTrigger');
            if (trigger) {
                const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting && !isLoading && hasMore) {
                        loadNotifications(currentPage + 1, true);
                    }
                }, { rootMargin: '100px' });
                observer.observe(trigger);
            }
        }
    }

    // ===== تحديث الإحصائيات =====
    async function updateStats() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            if (!sb) return;

            // إجمالي الإشعارات (غير المحذوفة)
            const { count: total } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .neq('status', 'deleted');

            // غير المقروءة
            const { count: unread } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'unread');

            // المقروءة
            const { count: read } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'read');

            // المؤرشفة
            const { count: archived } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'archived');

            // المهمة (عالية الأولوية)
            const { count: important } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('priority', ['urgent', 'high'])
                .neq('status', 'deleted');

            $('statTotal').textContent = total || 0;
            $('statUnread').textContent = unread || 0;
            $('statRead').textContent = read || 0;
            $('statArchived').textContent = archived || 0;
            $('statImportant').textContent = important || 0;

            unreadCount = unread || 0;

            // تحديث عداد التاب
            if (unreadBadge) unreadBadge.textContent = unread || 0;

            // تحديث العداد العام
            if (window.Support && window.Support.updateNotificationBadge) {
                await window.Support.updateNotificationBadge();
            }

        } catch (err) {
            console.warn('⚠️ Failed to update stats:', err);
        }
    }

    // ===== تحديث البادج =====
    async function updateBadge() {
        try {
            const user = await getCurrentUser();
            if (!user) return;
            const sb = await getSupabase();
            if (!sb) return;

            const { count } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'unread');

            if (unreadBadge) unreadBadge.textContent = count || 0;

            // تحديث عداد الـ Tab
            const tabBadge = document.querySelector('.tab-btn[data-tab="inbox"] .badge-count');
            if (tabBadge) tabBadge.textContent = count || 0;

            // تحديث عداد الـ Header إذا وجد
            const headerBadge = document.querySelector('.header-notification-badge');
            if (headerBadge) headerBadge.textContent = count || 0;

            // تحديث عنوان الصفحة
            if (count > 0) {
                document.title = `(${count}) مركز الإشعارات | Tera Investor Portal`;
            } else {
                document.title = 'مركز الإشعارات | Tera Investor Portal';
            }

        } catch (e) {}
    }

    // ===== Pagination =====
    function updatePagination(page) {
        const totalPages = Math.ceil(totalCount / pageSize);
        if (totalPages <= 1 || isInfiniteScroll) {
            paginationEl.innerHTML = '';
            return;
        }

        let html = '';
        html += `<button ${page <= 1 ? 'disabled' : ''} data-page="${page-1}">‹</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button ${page >= totalPages ? 'disabled' : ''} data-page="${page+1}">›</button>`;

        paginationEl.innerHTML = html;
        paginationEl.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p && p !== currentPage) {
                    currentPage = p;
                    loadNotifications(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    // ===== تحديد الكل =====
    function updateSelectAllState() {
        const cards = listEl.querySelectorAll('.notification-card');
        const allIds = Array.from(cards).map(el => el.dataset.id).filter(id => id);
        const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
        if (selectAllBtn) {
            selectAllBtn.innerHTML = allSelected ?
                '<i class="fas fa-check-square"></i> إلغاء التحديد' :
                '<i class="fas fa-check-double"></i> تحديد الكل';
        }
    }

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const cards = listEl.querySelectorAll('.notification-card');
            const allIds = Array.from(cards).map(el => el.dataset.id).filter(id => id);
            if (allIds.length === 0) return;

            const allSelected = allIds.every(id => selectedIds.has(id));

            if (allSelected) {
                selectedIds.clear();
            } else {
                allIds.forEach(id => selectedIds.add(id));
            }

            // تحديث المظهر
            cards.forEach(el => {
                const id = el.dataset.id;
                if (selectedIds.has(id)) {
                    el.style.borderLeft = '4px solid var(--primary)';
                    el.classList.add('selected');
                } else {
                    el.style.borderLeft = '';
                    el.classList.remove('selected');
                }
            });

            updateSelectAllState();
        });
    }

    // ===== تعليم كمقروء =====
    async function markAsRead(id) {
        if (!id) return;
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            const { error } = await sb
                .from('notifications')
                .update({ status: 'read', read_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            // تحديث واجهة المستخدم
            const card = listEl.querySelector(`.notification-card[data-id="${id}"]`);
            if (card) {
                card.classList.remove('unread');
                card.style.borderRight = '';
                const readBtn = card.querySelector('.mark-read-btn');
                if (readBtn) readBtn.remove();
                const statusBadge = card.querySelector('.notif-meta span:last-child');
                if (statusBadge) statusBadge.textContent = 'الحالة: مقروء';
            }

            selectedIds.delete(id);
            await updateStats();
            await updateBadge();

            // تحديث العداد العام
            if (window.Support && window.Support.updateNotificationBadge) {
                await window.Support.updateNotificationBadge();
            }

        } catch (err) {
            console.error('❌ Error marking as read:', err);
            alert('خطأ: ' + err.message);
        }
    }

    // ===== تعليم عدة كمقروء =====
    if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
            const ids = Array.from(selectedIds);
            if (ids.length === 0) return alert('يرجى تحديد إشعارات أولاً');
            if (!confirm(`هل تريد تعليم ${ids.length} إشعار كمقروء؟`)) return;

            try {
                const user = await getCurrentUser();
                if (!user) return;

                const sb = await getSupabase();
                const { error } = await sb
                    .from('notifications')
                    .update({ status: 'read', read_at: new Date().toISOString() })
                    .in('id', ids)
                    .eq('user_id', user.id);

                if (error) throw error;

                selectedIds.clear();
                await loadNotifications(currentPage);
                await updateStats();
                await updateBadge();

                if (window.Support && window.Support.updateNotificationBadge) {
                    await window.Support.updateNotificationBadge();
                }

            } catch (err) {
                alert('خطأ: ' + err.message);
            }
        });
    }

    // ===== أرشفة =====
    async function archiveNotification(id) {
        if (!id) return;
        if (!confirm('هل تريد أرشفة هذا الإشعار؟')) return;

        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            const { error } = await sb
                .from('notifications')
                .update({ status: 'archived', archived_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            selectedIds.delete(id);
            await loadNotifications(currentPage);
            await updateStats();
            await updateBadge();

        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    }

    if (archiveBtn) {
        archiveBtn.addEventListener('click', async () => {
            const ids = Array.from(selectedIds);
            if (ids.length === 0) return alert('يرجى تحديد إشعارات أولاً');
            if (!confirm(`هل تريد أرشفة ${ids.length} إشعار؟`)) return;

            try {
                const user = await getCurrentUser();
                if (!user) return;

                const sb = await getSupabase();
                const { error } = await sb
                    .from('notifications')
                    .update({ status: 'archived', archived_at: new Date().toISOString() })
                    .in('id', ids)
                    .eq('user_id', user.id);

                if (error) throw error;

                selectedIds.clear();
                await loadNotifications(currentPage);
                await updateStats();
                await updateBadge();

            } catch (err) {
                alert('خطأ: ' + err.message);
            }
        });
    }

    // ===== حذف =====
    async function deleteNotification(id) {
        if (!id) return;
        if (!confirm('هل أنت متأكد من حذف هذا الإشعار نهائياً؟')) return;

        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            const { error } = await sb
                .from('notifications')
                .update({ status: 'deleted', deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            selectedIds.delete(id);
            await loadNotifications(currentPage);
            await updateStats();
            await updateBadge();

        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const ids = Array.from(selectedIds);
            if (ids.length === 0) return alert('يرجى تحديد إشعارات أولاً');
            if (!confirm(`هل تريد حذف ${ids.length} إشعار نهائياً؟`)) return;

            try {
                const user = await getCurrentUser();
                if (!user) return;

                const sb = await getSupabase();
                const { error } = await sb
                    .from('notifications')
                    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
                    .in('id', ids)
                    .eq('user_id', user.id);

                if (error) throw error;

                selectedIds.clear();
                await loadNotifications(currentPage);
                await updateStats();
                await updateBadge();

            } catch (err) {
                alert('خطأ: ' + err.message);
            }
        });
    }

    // ===== عرض التفاصيل =====
    async function openDetail(id) {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            const { data, error } = await sb
                .from('notifications')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            if (!data) return alert('الإشعار غير موجود');

            modalTitle.textContent = data.title || 'تفاصيل الإشعار';

            const html = `
                <div class="detail-row"><span class="label">العنوان</span><span class="value">${data.title || '—'}</span></div>
                <div class="detail-row"><span class="label">الوصف</span><span class="value">${data.body || '—'}</span></div>
                <div class="detail-row"><span class="label">التاريخ والوقت</span><span class="value">${formatDate(data.created_at)}</span></div>
                <div class="detail-row"><span class="label">المرسل</span><span class="value">${data.sender || 'النظام'}</span></div>
                <div class="detail-row"><span class="label">النوع</span><span class="value">${getTypeLabel(data.type)}</span></div>
                <div class="detail-row"><span class="label">الأولوية</span><span class="value">${getPriorityLabel(data.priority)}</span></div>
                <div class="detail-row"><span class="label">الحالة</span><span class="value">${getStatusLabel(data.status)}</span></div>
                ${data.action_url ? `
                <div class="detail-row">
                    <span class="label">الإجراء</span>
                    <span class="value">
                        <a href="${data.action_url}" target="_blank" class="action-link">
                            <i class="fas fa-arrow-left"></i> تنفيذ الإجراء
                        </a>
                    </span>
                </div>` : ''}
                ${data.metadata && Object.keys(data.metadata).length > 0 ? `
                <div class="detail-row">
                    <span class="label">بيانات إضافية</span>
                    <span class="value" style="font-size:12px;font-family:monospace;direction:ltr;text-align:left;">${JSON.stringify(data.metadata, null, 2)}</span>
                </div>` : ''}
            `;

            modalBody.innerHTML = html;
            modal.classList.add('active');

            // تعليم كمقروء تلقائياً عند الفتح
            if (data.status === 'unread') {
                await markAsRead(id);
            }

        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    }

    // ===== إغلاق المودال =====
    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    // ===== تحديث =====
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadNotifications(1);
        });
    }

    // ===== البحث والفلترة =====
    const filterElements = [searchInput, filterType, filterStatus, filterPriority, sortOrder];
    filterElements.forEach(el => {
        if (!el) return;
        const eventType = el.tagName === 'INPUT' ? 'input' : 'change';
        el.addEventListener(eventType, () => {
            // إعادة تعيين الصفحة إلى الأولى عند تغيير الفلتر
            currentPage = 1;
            if (isInfiniteScroll) {
                loadNotifications(1);
            } else {
                loadNotifications(1);
            }
        });
    });

    // ===== تبويبات =====
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            const panel = document.getElementById('panel-' + tab);
            if (panel) panel.classList.add('active');

            currentTab = tab;

            if (tab === 'inbox') {
                loadNotifications(1);
            } else if (tab === 'history') {
                loadHistory(1);
            }
        });
    });

    // ===== تحميل سجل الإشعارات =====
    async function loadHistory(page = 1) {
        const tbody = $('historyTableBody');
        if (!tbody) return;

        try {
            const user = await getCurrentUser();
            if (!user) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">يرجى تسجيل الدخول</td></tr>';
                return;
            }

            const sb = await getSupabase();
            const { data, count, error } = await sb
                .from('notifications')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .in('status', ['read', 'archived'])
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">لا توجد إشعارات في السجل</td></tr>';
                return;
            }

            let html = '';
            data.forEach(n => {
                html += `
                    <tr>
                        <td style="font-size:12px;color:var(--gray-400);">${n.id.substring(0, 8)}</td>
                        <td>${getTypeLabel(n.type)}</td>
                        <td>${n.title || '—'}</td>
                        <td>${n.sender || 'النظام'}</td>
                        <td><span class="status-badge ${n.status === 'archived' ? 'status-archived' : 'status-read'}">${getStatusLabel(n.status)}</span></td>
                        <td>${formatDate(n.created_at)}</td>
                        <td>
                            <button class="action-btn view" onclick="window.__openDetail('${n.id}')"><i class="fas fa-eye"></i></button>
                            <button class="action-btn danger" onclick="window.__deleteNotification('${n.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            // Pagination للسجل
            const totalPages = Math.ceil((count || 0) / pageSize);
            const hp = $('historyPagination');
            if (!hp) return;
            if (totalPages <= 1) { hp.innerHTML = ''; return; }

            let ph = '';
            for (let i = 1; i <= totalPages; i++) {
                ph += `<button class="${i === page ? 'active' : ''}" data-hpage="${i}">${i}</button>`;
            }
            hp.innerHTML = ph;
            hp.querySelectorAll('button[data-hpage]').forEach(b => {
                b.addEventListener('click', () => loadHistory(parseInt(b.dataset.hpage)));
            });

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);">خطأ: ${err.message}</td></tr>`;
        }
    }

    // ===== Toast Notification =====
    function showToast(message, type = 'info', duration = 5000) {
        // إزالة Toast السابق
        const existingToast = document.querySelector('.tera-toast');
        if (existingToast) existingToast.remove();

        if (toastTimeout) clearTimeout(toastTimeout);

        const colors = {
            info: { bg: '#028090', icon: 'fa-info-circle' },
            success: { bg: '#10b981', icon: 'fa-check-circle' },
            warning: { bg: '#f59e0b', icon: 'fa-exclamation-triangle' },
            error: { bg: '#dc2626', icon: 'fa-times-circle' }
        };

        const color = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.className = 'tera-toast';
        toast.style.cssText = `
            position: fixed;
            top: 90px;
            right: 50%;
            transform: translateX(50%);
            background: ${color.bg};
            color: #fff;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 15px;
            z-index: 10000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 90%;
            min-width: 300px;
            animation: slideDown 0.4s ease;
            direction: rtl;
            border: 1px solid rgba(255,255,255,0.15);
        `;

        // إضافة أنماط الرسوم المتحركة
        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                @keyframes slideDown {
                    from { opacity: 0; transform: translateX(50%) translateY(-30px); }
                    to { opacity: 1; transform: translateX(50%) translateY(0); }
                }
                @keyframes slideUp {
                    from { opacity: 1; transform: translateX(50%) translateY(0); }
                    to { opacity: 0; transform: translateX(50%) translateY(-30px); }
                }
            `;
            document.head.appendChild(style);
        }

        toast.innerHTML = `
            <i class="fas ${color.icon}" style="font-size:20px;"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:18px;margin-right:auto;">✕</button>
        `;

        document.body.appendChild(toast);

        // تشغيل صوت
        try {
            if (!audioElement) {
                audioElement = new Audio('/sounds/notification.mp3');
                audioElement.volume = 0.5;
            }
            audioElement.play().catch(() => {});
        } catch (e) {}

        // إزالة تلقائية
        toastTimeout = setTimeout(() => {
            if (toast && toast.parentElement) {
                toast.style.animation = 'slideUp 0.4s ease forwards';
                setTimeout(() => {
                    if (toast.parentElement) toast.remove();
                }, 400);
            }
        }, duration);

        // Toast قابل للإزالة بالنقر
        toast.addEventListener('click', () => {
            if (toast.parentElement) {
                toast.style.animation = 'slideUp 0.4s ease forwards';
                setTimeout(() => {
                    if (toast.parentElement) toast.remove();
                }, 400);
            }
            if (toastTimeout) clearTimeout(toastTimeout);
        });
    }

    // ===== OneSignal Integration =====
    async function checkOneSignalStatus() {
        const statusEl = document.getElementById('osStatusText');
        const playerIdEl = document.getElementById('osPlayerId');

        if (!statusEl) return;

        try {
            // الانتظار حتى يصبح OneSignal متاحاً
            let attempts = 0;
            const maxAttempts = 20;

            while (typeof window.OneSignal === 'undefined' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }

            if (typeof window.OneSignal === 'undefined' || !window.OneSignal.User) {
                statusEl.textContent = '⏳ غير متاح';
                statusEl.className = 'status-value unsubscribed';
                if (playerIdEl) playerIdEl.textContent = 'يرجى تحديث الصفحة';
                return;
            }

            const OneSignal = window.OneSignal;
            const subscription = await OneSignal.User.pushSubscription.getCurrentSubscription();

            if (subscription && subscription.id) {
                statusEl.textContent = '✅ مفعل';
                statusEl.className = 'status-value subscribed';

                // تخزين Player ID
                if (playerIdEl) playerIdEl.textContent = `Player ID: ${subscription.id}`;

                // تحديث External ID في OneSignal
                try {
                    const user = await getCurrentUser();
                    if (user && user.id) {
                        await OneSignal.User.addAlias({ external_id: user.id });
                        console.log('✅ OneSignal External ID set:', user.id);
                    }
                } catch (e) {
                    console.warn('⚠️ فشل تعيين External ID:', e);
                }

            } else {
                statusEl.textContent = '❌ غير مفعل';
                statusEl.className = 'status-value unsubscribed';
                if (playerIdEl) playerIdEl.textContent = 'يرجى تفعيل الإشعارات في المتصفح';
            }

        } catch (err) {
            console.error('❌ OneSignal error:', err);
            statusEl.textContent = '⚠️ خطأ';
            statusEl.className = 'status-value unsubscribed';
            if (playerIdEl) playerIdEl.textContent = err.message || 'حدث خطأ في التحقق';
        }
    }

    // ===== استقبال الإشعارات من OneSignal =====
    function setupOneSignalListener() {
        if (typeof window.OneSignal === 'undefined') {
            console.warn('⚠️ OneSignal غير موجود، سيتم إعداد المستمع عند تحميله');
            // محاولة مرة أخرى بعد تأخير
            setTimeout(setupOneSignalListener, 2000);
            return;
        }

        try {
            // مستمع للإشعارات الواردة
            window.OneSignal.Notifications?.addListener('foregroundWillDisplay', async (notification) => {
                console.log('📩 OneSignal Notification received:', notification);

                const data = notification.data || notification;
                const title = data.title || notification.title || 'إشعار جديد';
                const body = data.body || notification.body || '';

                // عرض Toast
                showToast(`🔔 ${title}: ${body.substring(0, 60)}${body.length > 60 ? '...' : ''}`, 'info', 8000);

                // تشغيل صوت
                try {
                    if (!audioElement) {
                        audioElement = new Audio('/sounds/notification.mp3');
                        audioElement.volume = 0.5;
                    }
                    audioElement.play().catch(() => {});
                } catch (e) {}

                // تحديث القائمة إذا كنا في صفحة الإشعارات
                if (document.getElementById('notificationsList')) {
                    await refreshNotifications();
                }

                // تحديث العداد العام
                if (window.Support && window.Support.updateNotificationBadge) {
                    await window.Support.updateNotificationBadge();
                }
            });

            console.log('✅ OneSignal listener ready');

        } catch (err) {
            console.warn('⚠️ فشل إعداد مستمع OneSignal:', err);
        }
    }

    // ===== تحديث القائمة (مستعمل للـ Realtime و OneSignal) =====
    async function refreshNotifications() {
        await loadNotifications(1);
        await updateStats();
        await updateBadge();
    }

    // ===== Supabase Realtime =====
    async function setupRealtime() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            if (!sb) return;

            // إلغاء القناة السابقة
            if (realtimeChannel) {
                await sb.removeChannel(realtimeChannel);
                realtimeChannel = null;
            }

            // إنشاء قناة جديدة
            realtimeChannel = sb
                .channel('notifications-realtime')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    async (payload) => {
                        console.log('📩 New notification via Realtime:', payload);

                        const newNotif = payload.new;

                        // عرض Toast
                        showToast(`🔔 ${newNotif.title || 'إشعار جديد'}: ${(newNotif.body || '').substring(0, 60)}${(newNotif.body || '').length > 60 ? '...' : ''}`, 'info', 8000);

                        // تشغيل صوت
                        try {
                            if (!audioElement) {
                                audioElement = new Audio('/sounds/notification.mp3');
                                audioElement.volume = 0.5;
                            }
                            audioElement.play().catch(() => {});
                        } catch (e) {}

                        // إضافة الإشعار أعلى القائمة
                        if (document.getElementById('notificationsList') && currentTab === 'inbox') {
                            // إعادة تحميل الصفحة الأولى لإظهار الإشعار الجديد
                            await loadNotifications(1);
                        }

                        // تحديث العداد
                        await updateStats();
                        await updateBadge();

                        if (window.Support && window.Support.updateNotificationBadge) {
                            await window.Support.updateNotificationBadge();
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    async (payload) => {
                        // تحديث عند تغيير الحالة (مثلاً تعليم كمقروء من جهاز آخر)
                        await updateStats();
                        await updateBadge();
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Realtime status:', status);
                });

            console.log('✅ Realtime connected');

        } catch (err) {
            console.warn('⚠️ فشل إعداد Realtime:', err);
        }
    }

    // ===== تهيئة الصفحة =====
    async function init() {
        console.log('🚀 Initializing Notification Center...');

        try {
            const user = await getCurrentUser();
            if (!user) {
                listEl.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                        <i class="fas fa-sign-in-alt" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                        <span style="font-weight:700;font-size:18px;">يرجى تسجيل الدخول</span>
                        <p style="margin-top:8px;font-size:14px;">يجب تسجيل الدخول لعرض الإشعارات.</p>
                        <a href="/auth/auth/login/login.html" class="btn-table-link" style="margin-top:12px;">تسجيل الدخول</a>
                    </div>
                `;
                return;
            }

            // تحديث اسم المستخدم في الهيدر
            const nameEl = document.getElementById('headerUserName');
            const avatarEl = document.getElementById('headerAvatar');
            if (nameEl) {
                const storedName = sessionStorage.getItem('otpName');
                nameEl.textContent = storedName || user.user_metadata?.full_name || user.email || 'مستخدم';
            }
            if (avatarEl) {
                const name = sessionStorage.getItem('otpName') || user.user_metadata?.full_name || user.email || 'مستخدم';
                avatarEl.textContent = name.charAt(0).toUpperCase();
            }

            // تحميل الإشعارات
            await loadNotifications(1);

            // تحديث الإحصائيات
            await updateStats();

            // تحديث البادج
            await updateBadge();

            // التحقق من OneSignal
            await checkOneSignalStatus();

            // إعداد مستمع OneSignal
            setupOneSignalListener();

            // إعداد Realtime
            await setupRealtime();

            // تحميل السجل
            await loadHistory(1);

            // تعرض الدوال العامة
            window.__openDetail = openDetail;
            window.__deleteNotification = deleteNotification;
            window.__loadNotifications = loadNotifications;
            window.__refreshNotifications = refreshNotifications;

            console.log('✅ Notification Center ready');

        } catch (err) {
            console.error('❌ Error initializing notification center:', err);
            listEl.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--danger);">
                    <i class="fas fa-exclamation-circle" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                    <span style="font-weight:700;font-size:18px;">فشل تحميل الإشعارات</span>
                    <p style="margin-top:8px;font-size:14px;">${err.message || 'خطأ غير معروف'}</p>
                    <button onclick="location.reload()" class="btn-tool primary" style="margin-top:12px;">إعادة المحاولة</button>
                </div>
            `;
        }
    }

    // ===== تصدير عام =====
    window.__openDetail = openDetail;
    window.__deleteNotification = deleteNotification;
    window.__loadNotifications = loadNotifications;
    window.__refreshNotifications = refreshNotifications;

    // ===== التشغيل =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
