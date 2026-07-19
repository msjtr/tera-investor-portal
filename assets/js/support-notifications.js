/**
 * ============================================================
 * support-notifications.js – الإصدار النهائي v4
 * متوافق مع جدول notifications الحالي (بعد التعديلات)
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationsInitialized) return;
    window.__notificationsInitialized = true;

    // ===== الحالة العامة =====
    let supabase = null;
    let currentUser = null;
    let allNotifications = [];
    let filteredNotifications = [];
    let currentPage = 1;
    const pageSize = 20;
    let hasMore = true;
    let isLoading = false;
    let selectedIds = new Set();
    let realtimeChannel = null;
    let audioElement = null;
    let toastTimeout = null;
    let unreadCount = 0;
    let isInfiniteScroll = true;

    // ===== المراجع DOM =====
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
    const statsTotal = $('statTotal');
    const statsUnread = $('statUnread');
    const statsRead = $('statRead');
    const statsArchived = $('statArchived');
    const statsImportant = $('statImportant');
    const historyTableBody = $('historyTableBody');
    const historyPagination = $('historyPagination');

    // ===== الأدوات المساعدة =====
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
            promotion: 'fa-gift'
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
            promotion: 'ترويجي'
        };
        return map[type] || type;
    }

    function getTypeClass(type) {
        return 'type-' + (type || 'general');
    }

    function getPriorityLabel(p) {
        // توحيد القيم: إذا كانت 'medium' نعرضها كـ 'متوسط'، وإذا كانت 'normal' نعرضها 'عادي'
        const map = {
            urgent: 'عاجل',
            high: 'مرتفع',
            medium: 'متوسط',
            normal: 'عادي',
            low: 'منخفض'
        };
        return map[p] || p;
    }

    function getPriorityClass(p) {
        // تحويل priority إلى class للتلوين
        const map = {
            urgent: 'critical',
            high: 'high',
            medium: 'medium',
            normal: 'medium',
            low: 'low'
        };
        return map[p] || 'medium';
    }

    function getStatusLabel(s) {
        const map = { unread: 'غير مقروء', read: 'مقروء', archived: 'مؤرشف', deleted: 'محذوف' };
        return map[s] || s;
    }

    function isExpired(expiresAt) {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
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
                renderEmptyState('يجب تسجيل الدخول لعرض الإشعارات', 'fa-sign-in-alt');
                isLoading = false;
                return;
            }

            const sb = await getSupabase();
            if (!sb) {
                renderEmptyState('Supabase غير متصل', 'fa-database', 'error');
                isLoading = false;
                return;
            }

            const search = searchInput.value.trim();
            const type = filterType.value;
            const status = filterStatus.value;
            const priority = filterPriority.value;
            const sort = sortOrder.value;

            // بناء الاستعلام مع مراعاة الحقول الفعلية في الجدول
            let query = sb
                .from('notifications')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .neq('status', 'deleted')   // استبعاد المحذوف
                .order('created_at', { ascending: sort === 'asc' });

            if (type !== 'all') query = query.eq('type', type);
            if (status !== 'all') query = query.eq('status', status);
            if (priority !== 'all') query = query.eq('priority', priority);

            if (search) {
                query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
            }

            // إضافة شرط صلاحية الإشعار (expires_at)
            query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, count, error } = await query;

            if (error) {
                if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
                    renderEmptyState('ليس لديك صلاحية لعرض الإشعارات', 'fa-lock', 'warning');
                } else {
                    throw error;
                }
                isLoading = false;
                return;
            }

            const newNotifications = data || [];
            if (append) {
                allNotifications = [...allNotifications, ...newNotifications];
            } else {
                allNotifications = newNotifications;
                currentPage = page;
            }

            filteredNotifications = allNotifications;
            totalCount = count || 0;
            hasMore = (page * pageSize) < totalCount;

            // تحديث الإحصائيات والعدادات
            await updateStatsAndBadges();
            renderNotifications(filteredNotifications);
            updatePagination(page);

        } catch (err) {
            console.error('❌ خطأ في تحميل الإشعارات:', err);
            renderEmptyState('حدث خطأ في تحميل الإشعارات', 'fa-exclamation-circle', 'error', err.message);
        } finally {
            isLoading = false;
        }
    }

    // ===== عرض الإشعارات =====
    function renderNotifications(notifications) {
        if (!notifications || notifications.length === 0) {
            renderEmptyState('لا توجد إشعارات حالياً', 'fa-inbox');
            return;
        }

        let html = '';
        notifications.forEach(n => {
            // تجاهل الإشعارات المنتهية الصلاحية
            if (isExpired(n.expires_at)) return;

            const isUnread = n.status === 'unread';
            const priorityClass = getPriorityClass(n.priority || 'normal');
            const icon = getTypeIcon(n.type);
            const typeLabel = getTypeLabel(n.type);
            const typeClass = getTypeClass(n.type);
            const statusLabel = getStatusLabel(n.status);
            const isSelected = selectedIds.has(n.id);

            // عرض الصورة إن وجدت (نستخدم image_url لأن image تم دمجه)
            const imageHtml = n.image_url ? `<img src="${n.image_url}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;margin-left:12px;">` : '';

            html += `
                <div class="notification-card ${isUnread ? 'unread' : ''} ${isSelected ? 'selected' : ''}" 
                     data-id="${n.id}" 
                     style="${isSelected ? 'border-left:4px solid var(--primary);' : ''}">
                    <div class="notif-icon ${typeClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    ${imageHtml}
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

        listEl.innerHTML = html;

        // ربط الأحداث
        listEl.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDetail(btn.dataset.id);
            });
        });
        listEl.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                markAsRead(btn.dataset.id);
            });
        });
        listEl.querySelectorAll('.archive-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                archiveNotification(btn.dataset.id);
            });
        });
        listEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNotification(btn.dataset.id);
            });
        });

        // النقر على البطاقة لفتح التفاصيل
        listEl.querySelectorAll('.notification-card').forEach(card => {
            card.addEventListener('click', function() {
                const id = this.dataset.id;
                if (id) openDetail(id);
            });
        });

        // تحديث حالة التحديد
        updateSelectAllState();

        // Infinite Scroll
        if (hasMore && isInfiniteScroll) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isLoading && hasMore) {
                    loadNotifications(currentPage + 1, true);
                }
            }, { rootMargin: '100px' });
            const trigger = document.createElement('div');
            trigger.id = 'loadMoreTrigger';
            trigger.style.textAlign = 'center';
            trigger.style.padding = '20px';
            trigger.style.color = 'var(--gray-400)';
            trigger.textContent = 'جاري تحميل المزيد...';
            listEl.appendChild(trigger);
            observer.observe(trigger);
        }
    }

    // ===== عرض حالة فارغة =====
    function renderEmptyState(message, icon = 'fa-inbox', type = 'info', details = '') {
        const colors = {
            info: 'var(--gray-400)',
            warning: 'var(--warning)',
            error: 'var(--danger)'
        };
        const color = colors[type] || colors.info;
        listEl.innerHTML = `
            <div style="text-align:center;padding:80px 20px;color:${color};">
                <i class="fas ${icon}" style="font-size:64px;display:block;margin-bottom:20px;color:${color};"></i>
                <span style="font-weight:700;font-size:20px;display:block;">${message}</span>
                ${details ? `<p style="margin-top:8px;font-size:14px;color:var(--gray-500);">${details}</p>` : ''}
                ${type === 'error' ? `<button onclick="location.reload()" class="btn-tool primary" style="margin-top:16px;"><i class="fas fa-redo"></i> إعادة المحاولة</button>` : ''}
            </div>
        `;
    }

    // ===== تحديث الإحصائيات والعدادات =====
    async function updateStatsAndBadges() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            if (!sb) return;

            // إجمالي الإشعارات (غير المحذوفة وغير المنتهية)
            const { count: total } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .neq('status', 'deleted')
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            // غير المقروءة
            const { count: unread } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'unread')
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            // المقروءة
            const { count: read } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'read')
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            // المؤرشفة
            const { count: archived } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'archived')
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            // المهمة (urgent أو high)
            const { count: important } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('priority', ['urgent', 'high'])
                .neq('status', 'deleted')
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            if (statsTotal) statsTotal.textContent = total || 0;
            if (statsUnread) statsUnread.textContent = unread || 0;
            if (statsRead) statsRead.textContent = read || 0;
            if (statsArchived) statsArchived.textContent = archived || 0;
            if (statsImportant) statsImportant.textContent = important || 0;

            unreadCount = unread || 0;

            // تحديث البادجات
            await updateBadges(unread);

        } catch (err) {
            console.warn('⚠️ فشل تحديث الإحصائيات:', err);
        }
    }

    // ===== تحديث البادجات =====
    async function updateBadges(unreadCount = null) {
        try {
            if (unreadCount === null) {
                const user = await getCurrentUser();
                if (!user) return;
                const sb = await getSupabase();
                if (!sb) return;
                const { count } = await sb
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('status', 'unread')
                    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
                unreadCount = count || 0;
            }

            const badges = document.querySelectorAll('.notification-badge, .badge-count, #unreadBadge');
            badges.forEach(el => {
                if (el) {
                    el.textContent = unreadCount;
                    el.style.display = unreadCount > 0 ? 'inline-block' : 'none';
                }
            });

            // تحديث عداد التاب
            const tabBadge = document.querySelector('.tab-btn[data-tab="inbox"] .badge-count');
            if (tabBadge) {
                tabBadge.textContent = unreadCount;
                tabBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }

            // عداد الهيدر
            const headerBadge = document.querySelector('.header-notification-badge');
            if (headerBadge) {
                headerBadge.textContent = unreadCount;
                headerBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }

            // تحديث عنوان الصفحة
            document.title = unreadCount > 0 ? `(${unreadCount}) مركز الإشعارات | Tera` : 'مركز الإشعارات | Tera';

            // تحديث العداد العام عبر support.js
            if (window.Support && window.Support.updateNotificationBadge) {
                await window.Support.updateNotificationBadge();
            }

        } catch (e) {
            console.warn('⚠️ فشل تحديث البادجات:', e);
        }
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

    // ===== تعليم كمقروء (فردي) =====
    async function markAsRead(id) {
        if (!id) return;
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            const now = new Date().toISOString();
            const { error } = await sb
                .from('notifications')
                .update({
                    status: 'read',
                    is_read: true,    // تحديث كلا الحقلين للتوافق
                    read_at: now
                })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            // تحديث الواجهة
            const card = listEl.querySelector(`.notification-card[data-id="${id}"]`);
            if (card) {
                card.classList.remove('unread');
                card.style.borderRight = '';
                const readBtn = card.querySelector('.mark-read-btn');
                if (readBtn) readBtn.remove();
                const statusSpan = card.querySelector('.notif-meta span:last-child');
                if (statusSpan) statusSpan.textContent = 'الحالة: مقروء';
            }

            selectedIds.delete(id);
            await updateStatsAndBadges();

        } catch (err) {
            console.error('❌ خطأ في تعليم كمقروء:', err);
            alert('خطأ: ' + err.message);
        }
    }

    // ===== تعليم كمقروء (جماعي) =====
    if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
            const ids = Array.from(selectedIds);
            if (ids.length === 0) return alert('يرجى تحديد إشعارات أولاً');
            if (!confirm(`هل تريد تعليم ${ids.length} إشعار كمقروء؟`)) return;

            try {
                const user = await getCurrentUser();
                if (!user) return;

                const sb = await getSupabase();
                const now = new Date().toISOString();
                const { error } = await sb
                    .from('notifications')
                    .update({
                        status: 'read',
                        is_read: true,
                        read_at: now
                    })
                    .in('id', ids)
                    .eq('user_id', user.id);

                if (error) throw error;

                selectedIds.clear();
                await loadNotifications(currentPage);
                await updateStatsAndBadges();

            } catch (err) {
                alert('خطأ: ' + err.message);
            }
        });
    }

    // ===== أرشفة (فردي) =====
    async function archiveNotification(id) {
        if (!id) return;
        if (!confirm('هل تريد أرشفة هذا الإشعار؟')) return;

        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            const { error } = await sb
                .from('notifications')
                .update({
                    status: 'archived',
                    archived_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            selectedIds.delete(id);
            await loadNotifications(currentPage);
            await updateStatsAndBadges();

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
                    .update({
                        status: 'archived',
                        archived_at: new Date().toISOString()
                    })
                    .in('id', ids)
                    .eq('user_id', user.id);

                if (error) throw error;

                selectedIds.clear();
                await loadNotifications(currentPage);
                await updateStatsAndBadges();

            } catch (err) {
                alert('خطأ: ' + err.message);
            }
        });
    }

    // ===== حذف (فردي) =====
    async function deleteNotification(id) {
        if (!id) return;
        if (!confirm('هل أنت متأكد من حذف هذا الإشعار نهائياً؟')) return;

        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            const { error } = await sb
                .from('notifications')
                .update({
                    status: 'deleted',
                    deleted_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            selectedIds.delete(id);
            await loadNotifications(currentPage);
            await updateStatsAndBadges();

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
                    .update({
                        status: 'deleted',
                        deleted_at: new Date().toISOString()
                    })
                    .in('id', ids)
                    .eq('user_id', user.id);

                if (error) throw error;

                selectedIds.clear();
                await loadNotifications(currentPage);
                await updateStatsAndBadges();

            } catch (err) {
                alert('خطأ: ' + err.message);
            }
        });
    }

    // ===== عرض التفاصيل (Modal) =====
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

            const imageHtml = data.image_url ? `
                <div class="detail-row">
                    <span class="label">الصورة</span>
                    <span class="value"><img src="${data.image_url}" alt="" style="max-width:100%;max-height:150px;border-radius:8px;border:1px solid var(--gray-200);"></span>
                </div>` : '';

            const actionHtml = data.action_url ? `
                <div class="detail-row">
                    <span class="label">الإجراء</span>
                    <span class="value">
                        <a href="${data.action_url}" target="_blank" class="action-link">
                            <i class="fas fa-arrow-left"></i> تنفيذ الإجراء
                        </a>
                    </span>
                </div>` : '';

            const metaHtml = data.metadata && Object.keys(data.metadata).length > 0 ? `
                <div class="detail-row">
                    <span class="label">بيانات إضافية</span>
                    <span class="value" style="font-size:12px;font-family:monospace;direction:ltr;text-align:left;">${JSON.stringify(data.metadata, null, 2)}</span>
                </div>` : '';

            const html = `
                <div class="detail-row"><span class="label">العنوان</span><span class="value">${data.title || '—'}</span></div>
                <div class="detail-row"><span class="label">الوصف</span><span class="value">${data.body || '—'}</span></div>
                ${imageHtml}
                <div class="detail-row"><span class="label">التاريخ والوقت</span><span class="value">${formatDate(data.created_at)}</span></div>
                <div class="detail-row"><span class="label">المرسل</span><span class="value">${data.sender || 'النظام'}</span></div>
                <div class="detail-row"><span class="label">النوع</span><span class="value">${getTypeLabel(data.type)}</span></div>
                <div class="detail-row"><span class="label">الأولوية</span><span class="value">${getPriorityLabel(data.priority)}</span></div>
                <div class="detail-row"><span class="label">الحالة</span><span class="value">${getStatusLabel(data.status)}</span></div>
                ${data.expires_at ? `<div class="detail-row"><span class="label">تنتهي في</span><span class="value">${formatDate(data.expires_at)}</span></div>` : ''}
                ${actionHtml}
                ${metaHtml}
            `;

            modalBody.innerHTML = html;
            modal.classList.add('active');

            // تعليم كمقروء تلقائياً عند الفتح (تحديث كلا الحقلين)
            if (data.status === 'unread') {
                await markAsRead(id);
            }

            // زيادة عدد المشاهدات (اختياري)
            try {
                await sb.rpc('increment_view_count', { notif_id: id });
            } catch (e) { /* تجاهل */ }

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
        refreshBtn.addEventListener('click', () => loadNotifications(1));
    }

    // ===== البحث والفلترة =====
    [searchInput, filterType, filterStatus, filterPriority, sortOrder].forEach(el => {
        if (!el) return;
        const eventType = el.tagName === 'INPUT' ? 'input' : 'change';
        el.addEventListener(eventType, () => {
            currentPage = 1;
            loadNotifications(1);
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

            if (tab === 'inbox') {
                loadNotifications(1);
            } else if (tab === 'history') {
                loadHistory(1);
            }
        });
    });

    // ===== تحميل سجل الإشعارات =====
    async function loadHistory(page = 1) {
        if (!historyTableBody) return;

        try {
            const user = await getCurrentUser();
            if (!user) {
                historyTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">يرجى تسجيل الدخول</td></tr>';
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
                historyTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">لا توجد إشعارات في السجل</td></tr>';
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
            historyTableBody.innerHTML = html;

            // Pagination للسجل
            const totalPages = Math.ceil((count || 0) / pageSize);
            if (!historyPagination) return;
            if (totalPages <= 1) { historyPagination.innerHTML = ''; return; }

            let ph = '';
            for (let i = 1; i <= totalPages; i++) {
                ph += `<button class="${i === page ? 'active' : ''}" data-hpage="${i}">${i}</button>`;
            }
            historyPagination.innerHTML = ph;
            historyPagination.querySelectorAll('button[data-hpage]').forEach(b => {
                b.addEventListener('click', () => loadHistory(parseInt(b.dataset.hpage)));
            });

        } catch (err) {
            historyTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);">خطأ: ${err.message}</td></tr>`;
        }
    }

    // ===== Toast Notification =====
    function showToast(message, type = 'info', duration = 5000) {
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
            position: fixed; top: 90px; right: 50%; transform: translateX(50%);
            background: ${color.bg}; color: #fff; padding: 16px 24px; border-radius: 12px;
            font-weight: 700; font-size: 15px; z-index: 10000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            display: flex; align-items: center; gap: 12px;
            max-width: 90%; min-width: 300px;
            animation: slideDown 0.4s ease; direction: rtl;
            border: 1px solid rgba(255,255,255,0.15);
        `;

        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                @keyframes slideDown { from { opacity:0; transform:translateX(50%) translateY(-30px); } to { opacity:1; transform:translateX(50%) translateY(0); } }
                @keyframes slideUp { from { opacity:1; transform:translateX(50%) translateY(0); } to { opacity:0; transform:translateX(50%) translateY(-30px); } }
            `;
            document.head.appendChild(style);
        }

        toast.innerHTML = `
            <i class="fas ${color.icon}" style="font-size:20px;"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:18px;margin-right:auto;">✕</button>
        `;

        document.body.appendChild(toast);

        // تشغيل الصوت إذا لم يكن الإشعار صامتاً
        try {
            if (!audioElement) {
                audioElement = new Audio('/sounds/notification.mp3');
                audioElement.volume = 0.5;
            }
            audioElement.play().catch(() => {});
        } catch (e) {}

        toastTimeout = setTimeout(() => {
            if (toast && toast.parentElement) {
                toast.style.animation = 'slideUp 0.4s ease forwards';
                setTimeout(() => { if (toast.parentElement) toast.remove(); }, 400);
            }
        }, duration);

        toast.addEventListener('click', () => {
            if (toast.parentElement) {
                toast.style.animation = 'slideUp 0.4s ease forwards';
                setTimeout(() => { if (toast.parentElement) toast.remove(); }, 400);
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
                if (playerIdEl) playerIdEl.textContent = `Player ID: ${subscription.id}`;

                // ربط المستخدم الحالي مع OneSignal (External ID)
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
            setTimeout(setupOneSignalListener, 2000);
            return;
        }

        try {
            window.OneSignal.Notifications?.addListener('foregroundWillDisplay', async (notification) => {
                const data = notification.data || notification;
                const title = data.title || notification.title || 'إشعار جديد';
                const body = data.body || notification.body || '';
                const isSilent = data.is_silent === true;

                if (!isSilent) {
                    showToast(`🔔 ${title}: ${body.substring(0, 60)}${body.length > 60 ? '...' : ''}`, 'info', 8000);
                    try {
                        if (!audioElement) {
                            audioElement = new Audio('/sounds/notification.mp3');
                            audioElement.volume = 0.5;
                        }
                        audioElement.play().catch(() => {});
                    } catch (e) {}
                }

                // تحديث القائمة والعدادات
                await refreshNotifications();
            });

            console.log('✅ OneSignal listener ready');

        } catch (err) {
            console.warn('⚠️ فشل إعداد مستمع OneSignal:', err);
        }
    }

    // ===== تحديث القائمة (يُستخدم من Realtime و OneSignal) =====
    async function refreshNotifications() {
        await loadNotifications(1);
        await updateStatsAndBadges();
    }

    // ===== Supabase Realtime =====
    async function setupRealtime() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            if (!sb) return;

            if (realtimeChannel) {
                await sb.removeChannel(realtimeChannel);
                realtimeChannel = null;
            }

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
                        const newNotif = payload.new;
                        if (isExpired(newNotif.expires_at)) return;

                        if (!newNotif.is_silent) {
                            showToast(`🔔 ${newNotif.title || 'إشعار جديد'}: ${(newNotif.body || '').substring(0, 60)}${(newNotif.body || '').length > 60 ? '...' : ''}`, 'info', 8000);
                            try {
                                if (!audioElement) {
                                    audioElement = new Audio('/sounds/notification.mp3');
                                    audioElement.volume = 0.5;
                                }
                                audioElement.play().catch(() => {});
                            } catch (e) {}
                        }

                        await refreshNotifications();
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
                    async () => {
                        await updateStatsAndBadges();
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

    // ===== التهيئة =====
    async function init() {
        console.log('🚀 تشغيل مركز الإشعارات...');

        try {
            const user = await getCurrentUser();
            if (!user) {
                renderEmptyState('يجب تسجيل الدخول لعرض الإشعارات', 'fa-sign-in-alt');
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

            // تحميل البيانات
            await loadNotifications(1);
            await updateStatsAndBadges();
            await checkOneSignalStatus();
            setupOneSignalListener();
            await setupRealtime();
            await loadHistory(1);

            // تصدير الدوال العامة
            window.__openDetail = openDetail;
            window.__deleteNotification = deleteNotification;
            window.__loadNotifications = loadNotifications;
            window.__refreshNotifications = refreshNotifications;

            console.log('✅ مركز الإشعارات جاهز');

        } catch (err) {
            console.error('❌ فشل التهيئة:', err);
            renderEmptyState('فشل تحميل الإشعارات', 'fa-exclamation-circle', 'error', err.message);
        }
    }

    // ===== التشغيل =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
