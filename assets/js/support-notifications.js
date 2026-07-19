/**
 * ============================================================
 * support-notifications.js – الإصدار المحسّن v5
 * متوافق مع جدول notifications الحالي
 * تم تحسين الأداء، إدارة الحالة، والأمان
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationsInitialized) return;
    window.__notificationsInitialized = true;

    // ============================================================
    // 1. إدارة الحالة المركزية (State Management)
    // ============================================================
    const state = {
        supabase: null,
        currentUser: null,
        allNotifications: [],
        filteredNotifications: [],
        currentPage: 1,
        pageSize: 20,
        hasMore: true,
        isLoading: false,
        selectedIds: new Set(),
        realtimeChannel: null,
        audioElement: null,
        toastTimeout: null,
        unreadCount: 0,
        isInfiniteScroll: true,
        filters: {
            search: '',
            type: 'all',
            status: 'all',
            priority: 'all',
            sort: 'desc'
        },
        isRealtimeConnected: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5
    };

    // ============================================================
    // 2. المراجع DOM (محسّنة)
    // ============================================================
    const DOM = {
        list: document.getElementById('notificationsList'),
        pagination: document.getElementById('pagination'),
        search: document.getElementById('searchInput'),
        filterType: document.getElementById('filterType'),
        filterStatus: document.getElementById('filterStatus'),
        filterPriority: document.getElementById('filterPriority'),
        sortOrder: document.getElementById('sortOrder'),
        refresh: document.getElementById('refreshBtn'),
        selectAll: document.getElementById('selectAllBtn'),
        markRead: document.getElementById('markReadBtn'),
        archive: document.getElementById('archiveBtn'),
        delete: document.getElementById('deleteBtn'),
        unreadBadge: document.getElementById('unreadBadge'),
        modal: document.getElementById('detailModal'),
        modalBody: document.getElementById('modalBody'),
        modalTitle: document.getElementById('modalTitle'),
        closeModal: document.getElementById('closeDetailModal'),
        stats: {
            total: document.getElementById('statTotal'),
            unread: document.getElementById('statUnread'),
            read: document.getElementById('statRead'),
            archived: document.getElementById('statArchived'),
            important: document.getElementById('statImportant')
        },
        history: {
            body: document.getElementById('historyTableBody'),
            pagination: document.getElementById('historyPagination')
        },
        oneSignal: {
            status: document.getElementById('osStatusText'),
            playerId: document.getElementById('osPlayerId')
        }
    };

    // ============================================================
    // 3. الأدوات المساعدة (محسّنة)
    // ============================================================
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
        },

        getTypeLabel(type) {
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
        },

        // توليد معرف فريد للـ Toast
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        }
    };

    // ============================================================
    // 4. إدارة السجلات (Logging)
    // ============================================================
    const Logger = {
        levels: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
        currentLevel: 0, // DEBUG

        log(level, message, data = null) {
            if (level < this.currentLevel) return;
            const prefix = {
                0: '🔍 [DEBUG]',
                1: 'ℹ️ [INFO]',
                2: '⚠️ [WARN]',
                3: '❌ [ERROR]'
            } [level] || '[LOG]';
            console.log(prefix, message, data || '');
        },

        debug(msg, data) { this.log(0, msg, data); },
        info(msg, data) { this.log(1, msg, data); },
        warn(msg, data) { this.log(2, msg, data); },
        error(msg, data) { this.log(3, msg, data); }
    };

    // ============================================================
    // 5. الحصول على Supabase والمستخدم (محسّن مع التخزين المؤقت)
    // ============================================================
    async function getSupabase() {
        if (state.supabase) return state.supabase;
        try {
            if (window.Support?.getSupabase) {
                state.supabase = await window.Support.getSupabase();
            } else if (window.teraSupabase) {
                state.supabase = window.teraSupabase;
            } else if (window.waitForSupabase) {
                state.supabase = await window.waitForSupabase();
            }
            if (!state.supabase) throw new Error('Supabase غير متوفر');
            return state.supabase;
        } catch (e) {
            Logger.error('فشل الحصول على Supabase', e);
            return null;
        }
    }

    async function getCurrentUser(force = false) {
        if (state.currentUser && !force) return state.currentUser;
        try {
            // محاولة من مصادر متعددة
            if (window.Support?.getCurrentUser) {
                state.currentUser = await window.Support.getCurrentUser();
                if (state.currentUser) return state.currentUser;
            }
            if (window.Auth?.getCurrentUser) {
                state.currentUser = await window.Auth.getCurrentUser();
                if (state.currentUser) return state.currentUser;
            }
            const sb = await getSupabase();
            if (!sb) return null;
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) {
                Logger.warn('فشل جلب المستخدم', error);
                return null;
            }
            state.currentUser = user;
            return user;
        } catch (e) {
            Logger.error('فشل جلب المستخدم', e);
            return null;
        }
    }

    // ============================================================
    // 6. تحميل الإشعارات (محسّن)
    // ============================================================
    async function loadNotifications(page = 1, append = false) {
        if (state.isLoading) return;
        state.isLoading = true;

        try {
            const user = await getCurrentUser();
            if (!user) {
                renderEmptyState('يجب تسجيل الدخول لعرض الإشعارات', 'fa-sign-in-alt');
                state.isLoading = false;
                return;
            }

            const sb = await getSupabase();
            if (!sb) {
                renderEmptyState('Supabase غير متصل', 'fa-database', 'error');
                state.isLoading = false;
                return;
            }

            const { search, type, status, priority, sort } = state.filters;

            let query = sb
                .from('notifications')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .neq('status', 'deleted')
                .order('created_at', { ascending: sort === 'asc' });

            if (type !== 'all') query = query.eq('type', type);
            if (status !== 'all') query = query.eq('status', status);
            if (priority !== 'all') query = query.eq('priority', priority);

            if (search) {
                query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
            }

            // إضافة شرط صلاحية الإشعار
            query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            const from = (page - 1) * state.pageSize;
            const to = from + state.pageSize - 1;
            query = query.range(from, to);

            const { data, count, error } = await query;

            if (error) {
                if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
                    renderEmptyState('ليس لديك صلاحية لعرض الإشعارات', 'fa-lock', 'warning');
                } else {
                    throw error;
                }
                state.isLoading = false;
                return;
            }

            const newNotifications = data || [];
            if (append) {
                state.allNotifications = [...state.allNotifications, ...newNotifications];
            } else {
                state.allNotifications = newNotifications;
                state.currentPage = page;
            }

            state.filteredNotifications = state.allNotifications;
            state.totalCount = count || 0;
            state.hasMore = (page * state.pageSize) < state.totalCount;

            await updateStatsAndBadges();
            renderNotifications(state.filteredNotifications);
            updatePagination(page);

        } catch (err) {
            Logger.error('خطأ في تحميل الإشعارات', err);
            renderEmptyState('حدث خطأ في تحميل الإشعارات', 'fa-exclamation-circle', 'error', err.message);
        } finally {
            state.isLoading = false;
        }
    }

    // ============================================================
    // 7. عرض الإشعارات (محسّن مع DocumentFragment)
    // ============================================================
    function renderNotifications(notifications) {
        if (!notifications || notifications.length === 0) {
            renderEmptyState('لا توجد إشعارات حالياً', 'fa-inbox');
            return;
        }

        const fragment = document.createDocumentFragment();

        notifications.forEach(n => {
            if (Utils.isExpired(n.expires_at)) return;

            const isUnread = n.status === 'unread';
            const priorityClass = Utils.getPriorityClass(n.priority || 'normal');
            const icon = Utils.getTypeIcon(n.type);
            const typeLabel = Utils.getTypeLabel(n.type);
            const typeClass = Utils.getTypeClass(n.type);
            const statusLabel = Utils.getStatusLabel(n.status);
            const isSelected = state.selectedIds.has(n.id);

            const imageHtml = n.image_url ?
                `<img src="${n.image_url}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;margin-left:12px;">` :
                '';

            const card = document.createElement('div');
            card.className = `notification-card ${isUnread ? 'unread' : ''} ${isSelected ? 'selected' : ''}`;
            card.dataset.id = n.id;
            if (isSelected) card.style.borderLeft = '4px solid var(--primary)';

            card.innerHTML = `
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
            `;

            // ربط الأحداث مباشرة على البطاقة
            card.querySelector('.view-details')?.addEventListener('click', (e) => {
                e.stopPropagation();
                openDetail(n.id);
            });
            card.querySelector('.mark-read-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                markAsRead(n.id);
            });
            card.querySelector('.archive-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                archiveNotification(n.id);
            });
            card.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNotification(n.id);
            });

            // النقر على البطاقة لفتح التفاصيل
            card.addEventListener('click', function() {
                openDetail(this.dataset.id);
            });

            fragment.appendChild(card);
        });

        // استبدال المحتوى دفعة واحدة
        DOM.list.innerHTML = '';
        DOM.list.appendChild(fragment);

        // Infinite Scroll
        if (state.hasMore && state.isInfiniteScroll) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !state.isLoading && state.hasMore) {
                    loadNotifications(state.currentPage + 1, true);
                }
            }, { rootMargin: '100px' });
            const trigger = document.createElement('div');
            trigger.id = 'loadMoreTrigger';
            trigger.style.textAlign = 'center';
            trigger.style.padding = '20px';
            trigger.style.color = 'var(--gray-400)';
            trigger.textContent = 'جاري تحميل المزيد...';
            DOM.list.appendChild(trigger);
            observer.observe(trigger);
        }

        updateSelectAllState();
    }

    // ============================================================
    // 8. عرض حالة فارغة
    // ============================================================
    function renderEmptyState(message, icon = 'fa-inbox', type = 'info', details = '') {
        const colors = {
            info: 'var(--gray-400)',
            warning: 'var(--warning)',
            error: 'var(--danger)'
        };
        const color = colors[type] || colors.info;
        DOM.list.innerHTML = `
            <div style="text-align:center;padding:80px 20px;color:${color};">
                <i class="fas ${icon}" style="font-size:64px;display:block;margin-bottom:20px;color:${color};"></i>
                <span style="font-weight:700;font-size:20px;display:block;">${message}</span>
                ${details ? `<p style="margin-top:8px;font-size:14px;color:var(--gray-500);">${details}</p>` : ''}
                ${type === 'error' ? `<button onclick="location.reload()" class="btn-tool primary" style="margin-top:16px;"><i class="fas fa-redo"></i> إعادة المحاولة</button>` : ''}
            </div>
        `;
    }

    // ============================================================
    // 9. تحديث الإحصائيات والعدادات (محسّن – استعلام واحد)
    // ============================================================
    async function updateStatsAndBadges() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            if (!sb) return;

            // استعلام واحد يجمع جميع الإحصائيات
            const { data, error } = await sb
                .from('notifications')
                .select('status, priority', { count: 'exact' })
                .eq('user_id', user.id)
                .neq('status', 'deleted')
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            if (error) throw error;

            // حساب الإحصائيات من البيانات المسترجعة
            const stats = {
                total: data?.length || 0,
                unread: data?.filter(n => n.status === 'unread').length || 0,
                read: data?.filter(n => n.status === 'read').length || 0,
                archived: data?.filter(n => n.status === 'archived').length || 0,
                important: data?.filter(n => n.priority === 'urgent' || n.priority === 'high').length || 0
            };

            // تحديث الواجهة
            if (DOM.stats.total) DOM.stats.total.textContent = stats.total;
            if (DOM.stats.unread) DOM.stats.unread.textContent = stats.unread;
            if (DOM.stats.read) DOM.stats.read.textContent = stats.read;
            if (DOM.stats.archived) DOM.stats.archived.textContent = stats.archived;
            if (DOM.stats.important) DOM.stats.important.textContent = stats.important;

            state.unreadCount = stats.unread;

            // تحديث البادجات
            await updateBadges(stats.unread);

        } catch (err) {
            Logger.warn('فشل تحديث الإحصائيات', err);
        }
    }

    // ============================================================
    // 10. تحديث البادجات
    // ============================================================
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
            if (window.Support?.updateNotificationBadge) {
                await window.Support.updateNotificationBadge();
            }

        } catch (e) {
            Logger.warn('فشل تحديث البادجات', e);
        }
    }

    // ============================================================
    // 11. Pagination
    // ============================================================
    function updatePagination(page) {
        const totalPages = Math.ceil(state.totalCount / state.pageSize);
        if (totalPages <= 1 || state.isInfiniteScroll) {
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
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p && p !== state.currentPage) {
                    state.currentPage = p;
                    loadNotifications(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    // ============================================================
    // 12. تحديد الكل
    // ============================================================
    function updateSelectAllState() {
        const cards = DOM.list.querySelectorAll('.notification-card');
        const allIds = Array.from(cards).map(el => el.dataset.id).filter(id => id);
        const allSelected = allIds.length > 0 && allIds.every(id => state.selectedIds.has(id));
        if (DOM.selectAll) {
            DOM.selectAll.innerHTML = allSelected ?
                '<i class="fas fa-check-square"></i> إلغاء التحديد' :
                '<i class="fas fa-check-double"></i> تحديد الكل';
        }
    }

    if (DOM.selectAll) {
        DOM.selectAll.addEventListener('click', () => {
            const cards = DOM.list.querySelectorAll('.notification-card');
            const allIds = Array.from(cards).map(el => el.dataset.id).filter(id => id);
            if (allIds.length === 0) return;

            const allSelected = allIds.every(id => state.selectedIds.has(id));
            if (allSelected) {
                state.selectedIds.clear();
            } else {
                allIds.forEach(id => state.selectedIds.add(id));
            }

            cards.forEach(el => {
                const id = el.dataset.id;
                if (state.selectedIds.has(id)) {
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

    // ============================================================
    // 13. تعليم كمقروء (مع تحسينات)
    // ============================================================
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
                    is_read: true,
                    read_at: now
                })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            // تحديث الواجهة
            const card = DOM.list.querySelector(`.notification-card[data-id="${id}"]`);
            if (card) {
                card.classList.remove('unread');
                card.style.borderRight = '';
                const readBtn = card.querySelector('.mark-read-btn');
                if (readBtn) readBtn.remove();
                const statusSpan = card.querySelector('.notif-meta span:last-child');
                if (statusSpan) statusSpan.textContent = 'الحالة: مقروء';
                const newBadge = card.querySelector('.new-badge');
                if (newBadge) newBadge.remove();
            }

            state.selectedIds.delete(id);
            await updateStatsAndBadges();

        } catch (err) {
            Logger.error('خطأ في تعليم كمقروء', err);
            alert('خطأ: ' + err.message);
        }
    }

    if (DOM.markRead) {
        DOM.markRead.addEventListener('click', async () => {
            const ids = Array.from(state.selectedIds);
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

                state.selectedIds.clear();
                await loadNotifications(state.currentPage);
                await updateStatsAndBadges();

            } catch (err) {
                alert('خطأ: ' + err.message);
            }
        });
    }

    // ============================================================
    // 14. أرشفة
    // ============================================================
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

            state.selectedIds.delete(id);
            await loadNotifications(state.currentPage);
            await updateStatsAndBadges();

        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    }

    if (DOM.archive) {
        DOM.archive.addEventListener('click', async () => {
            const ids = Array.from(state.selectedIds);
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

                state.selectedIds.clear();
                await loadNotifications(state.currentPage);
                await updateStatsAndBadges();

            } catch (err) {
                alert('خطأ: ' + err.message);
            }
        });
    }

    // ============================================================
    // 15. حذف
    // ============================================================
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

            state.selectedIds.delete(id);
            await loadNotifications(state.currentPage);
            await updateStatsAndBadges();

        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    }

    if (DOM.delete) {
        DOM.delete.addEventListener('click', async () => {
            const ids = Array.from(state.selectedIds);
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

                state.selectedIds.clear();
                await loadNotifications(state.currentPage);
                await updateStatsAndBadges();

            } catch (err) {
                alert('خطأ: ' + err.message);
            }
        });
    }

    // ============================================================
    // 16. عرض التفاصيل (Modal)
    // ============================================================
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

            DOM.modalTitle.textContent = data.title || 'تفاصيل الإشعار';

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

            DOM.modalBody.innerHTML = `
                <div class="detail-row"><span class="label">العنوان</span><span class="value">${data.title || '—'}</span></div>
                <div class="detail-row"><span class="label">الوصف</span><span class="value">${data.body || '—'}</span></div>
                ${imageHtml}
                <div class="detail-row"><span class="label">التاريخ والوقت</span><span class="value">${Utils.formatDate(data.created_at)}</span></div>
                <div class="detail-row"><span class="label">المرسل</span><span class="value">${data.sender || 'النظام'}</span></div>
                <div class="detail-row"><span class="label">النوع</span><span class="value">${Utils.getTypeLabel(data.type)}</span></div>
                <div class="detail-row"><span class="label">الأولوية</span><span class="value">${Utils.getPriorityLabel(data.priority)}</span></div>
                <div class="detail-row"><span class="label">الحالة</span><span class="value">${Utils.getStatusLabel(data.status)}</span></div>
                ${data.expires_at ? `<div class="detail-row"><span class="label">تنتهي في</span><span class="value">${Utils.formatDate(data.expires_at)}</span></div>` : ''}
                ${actionHtml}
                ${metaHtml}
            `;

            DOM.modal.classList.add('active');

            // تعليم كمقروء تلقائياً
            if (data.status === 'unread') {
                await markAsRead(id);
            }

            // زيادة عدد المشاهدات
            try {
                await sb.rpc('increment_view_count', { notif_id: id });
            } catch (e) { /* تجاهل */ }

        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    }

    // ============================================================
    // 17. إغلاق المودال
    // ============================================================
    if (DOM.closeModal) {
        DOM.closeModal.addEventListener('click', () => DOM.modal.classList.remove('active'));
    }
    if (DOM.modal) {
        DOM.modal.addEventListener('click', (e) => {
            if (e.target === DOM.modal) DOM.modal.classList.remove('active');
        });
    }

    // ============================================================
    // 18. تحديث
    // ============================================================
    if (DOM.refresh) {
        DOM.refresh.addEventListener('click', () => loadNotifications(1));
    }

    // ============================================================
    // 19. البحث والفلترة مع حفظ التفضيلات
    // ============================================================
    function saveFilters() {
        try {
            localStorage.setItem('notificationFilters', JSON.stringify(state.filters));
        } catch (e) { /* تجاهل */ }
    }

    function loadFilters() {
        try {
            const saved = localStorage.getItem('notificationFilters');
            if (saved) {
                const parsed = JSON.parse(saved);
                state.filters = { ...state.filters, ...parsed };
            }
        } catch (e) { /* تجاهل */ }
    }

    // تطبيق الفلاتر على الواجهة
    function applyFiltersToUI() {
        if (DOM.search) DOM.search.value = state.filters.search || '';
        if (DOM.filterType) DOM.filterType.value = state.filters.type || 'all';
        if (DOM.filterStatus) DOM.filterStatus.value = state.filters.status || 'all';
        if (DOM.filterPriority) DOM.filterPriority.value = state.filters.priority || 'all';
        if (DOM.sortOrder) DOM.sortOrder.value = state.filters.sort || 'desc';
    }

    // ربط أحداث الفلاتر
    [DOM.search, DOM.filterType, DOM.filterStatus, DOM.filterPriority, DOM.sortOrder].forEach(el => {
        if (!el) return;
        const eventType = el.tagName === 'INPUT' ? 'input' : 'change';
        el.addEventListener(eventType, () => {
            state.filters.search = DOM.search ? DOM.search.value.trim() : '';
            state.filters.type = DOM.filterType ? DOM.filterType.value : 'all';
            state.filters.status = DOM.filterStatus ? DOM.filterStatus.value : 'all';
            state.filters.priority = DOM.filterPriority ? DOM.filterPriority.value : 'all';
            state.filters.sort = DOM.sortOrder ? DOM.sortOrder.value : 'desc';
            saveFilters();
            state.currentPage = 1;
            loadNotifications(1);
        });
    });

    // ============================================================
    // 20. تبويبات
    // ============================================================
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

    // ============================================================
    // 21. تحميل سجل الإشعارات
    // ============================================================
    async function loadHistory(page = 1) {
        if (!DOM.history.body) return;

        try {
            const user = await getCurrentUser();
            if (!user) {
                DOM.history.body.innerHTML = '<tr><td colspan="7" style="text-align:center;">يرجى تسجيل الدخول</td></tr>';
                return;
            }

            const sb = await getSupabase();
            const { data, count, error } = await sb
                .from('notifications')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .in('status', ['read', 'archived'])
                .order('created_at', { ascending: false })
                .range((page - 1) * state.pageSize, page * state.pageSize - 1);

            if (error) throw error;

            if (!data || data.length === 0) {
                DOM.history.body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">لا توجد إشعارات في السجل</td></tr>';
                return;
            }

            let html = '';
            data.forEach(n => {
                html += `
                    <tr>
                        <td style="font-size:12px;color:var(--gray-400);">${n.id.substring(0, 8)}</td>
                        <td>${Utils.getTypeLabel(n.type)}</td>
                        <td>${n.title || '—'}</td>
                        <td>${n.sender || 'النظام'}</td>
                        <td><span class="status-badge ${n.status === 'archived' ? 'status-archived' : 'status-read'}">${Utils.getStatusLabel(n.status)}</span></td>
                        <td>${Utils.formatDate(n.created_at)}</td>
                        <td>
                            <button class="action-btn view" onclick="window.__openDetail('${n.id}')"><i class="fas fa-eye"></i></button>
                            <button class="action-btn danger" onclick="window.__deleteNotification('${n.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
            DOM.history.body.innerHTML = html;

            // Pagination للسجل
            const totalPages = Math.ceil((count || 0) / state.pageSize);
            if (!DOM.history.pagination) return;
            if (totalPages <= 1) { DOM.history.pagination.innerHTML = ''; return; }

            let ph = '';
            for (let i = 1; i <= totalPages; i++) {
                ph += `<button class="${i === page ? 'active' : ''}" data-hpage="${i}">${i}</button>`;
            }
            DOM.history.pagination.innerHTML = ph;
            DOM.history.pagination.querySelectorAll('button[data-hpage]').forEach(b => {
                b.addEventListener('click', () => loadHistory(parseInt(b.dataset.hpage)));
            });

        } catch (err) {
            DOM.history.body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);">خطأ: ${err.message}</td></tr>`;
        }
    }

    // ============================================================
    // 22. Toast Notification (مع دعم التراص)
    // ============================================================
    let toastContainer = null;

    function getToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                top: 90px;
                right: 50%;
                transform: translateX(50%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-width: 90%;
                width: 500px;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    function showToast(message, type = 'info', duration = 5000) {
        const container = getToastContainer();
        const colors = {
            info: { bg: '#028090', icon: 'fa-info-circle' },
            success: { bg: '#10b981', icon: 'fa-check-circle' },
            warning: { bg: '#f59e0b', icon: 'fa-exclamation-triangle' },
            error: { bg: '#dc2626', icon: 'fa-times-circle' }
        };
        const color = colors[type] || colors.info;

        const toast = document.createElement('div');
        const toastId = Utils.generateId();
        toast.className = 'tera-toast';
        toast.dataset.id = toastId;
        toast.style.cssText = `
            background: ${color.bg};
            color: #fff;
            padding: 16px 20px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            border: 1px solid rgba(255,255,255,0.15);
            animation: slideDown 0.4s ease;
            direction: rtl;
            pointer-events: auto;
            min-width: 200px;
        `;

        // إضافة أنماط إذا لم تكن موجودة
        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                @keyframes slideDown { from { opacity:0; transform:translateY(-30px); } to { opacity:1; transform:translateY(0); } }
                @keyframes slideUp { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-30px); } }
            `;
            document.head.appendChild(style);
        }

        toast.innerHTML = `
            <i class="fas ${color.icon}" style="font-size:20px;flex-shrink:0;"></i>
            <span style="flex:1;">${message}</span>
            <button onclick="this.closest('.tera-toast').remove()" style="background:transparent;border:none;color:rgba(255,255,255,0.7);cursor:pointer;font-size:18px;padding:0 4px;">✕</button>
        `;

        container.appendChild(toast);

        // إزالة تلقائية
        const timeoutId = setTimeout(() => {
            if (toast && toast.parentElement) {
                toast.style.animation = 'slideUp 0.4s ease forwards';
                setTimeout(() => {
                    if (toast.parentElement) toast.remove();
                    if (container.children.length === 0 && container.parentElement) {
                        // نترك الحاوية موجودة
                    }
                }, 400);
            }
        }, duration);

        // إلغاء المؤقت عند النقر على الإغلاق
        toast.querySelector('button')?.addEventListener('click', () => {
            clearTimeout(timeoutId);
        });

        // النقر على الـ Toast لإزالته
        toast.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            clearTimeout(timeoutId);
            toast.style.animation = 'slideUp 0.4s ease forwards';
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 400);
        });

        // تشغيل الصوت
        try {
            if (!state.audioElement) {
                state.audioElement = new Audio('/sounds/notification.mp3');
                state.audioElement.volume = 0.5;
            }
            state.audioElement.play().catch(() => {});
        } catch (e) { /* تجاهل */ }
    }

    // ============================================================
    // 23. OneSignal Integration
    // ============================================================
    async function checkOneSignalStatus() {
        if (!DOM.oneSignal.status) return;

        try {
            let attempts = 0;
            const maxAttempts = 20;
            while (typeof window.OneSignal === 'undefined' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }

            if (typeof window.OneSignal === 'undefined' || !window.OneSignal.User) {
                DOM.oneSignal.status.textContent = '⏳ غير متاح';
                DOM.oneSignal.status.className = 'status-value unsubscribed';
                if (DOM.oneSignal.playerId) DOM.oneSignal.playerId.textContent = 'يرجى تحديث الصفحة';
                return;
            }

            const OneSignal = window.OneSignal;
            const subscription = await OneSignal.User.pushSubscription.getCurrentSubscription();

            if (subscription && subscription.id) {
                DOM.oneSignal.status.textContent = '✅ مفعل';
                DOM.oneSignal.status.className = 'status-value subscribed';
                if (DOM.oneSignal.playerId) DOM.oneSignal.playerId.textContent = `Player ID: ${subscription.id}`;

                try {
                    const user = await getCurrentUser();
                    if (user?.id) {
                        await OneSignal.User.addAlias({ external_id: user.id });
                        Logger.info('OneSignal External ID set', user.id);
                    }
                } catch (e) {
                    Logger.warn('فشل تعيين External ID', e);
                }

            } else {
                DOM.oneSignal.status.textContent = '❌ غير مفعل';
                DOM.oneSignal.status.className = 'status-value unsubscribed';
                if (DOM.oneSignal.playerId) DOM.oneSignal.playerId.textContent = 'يرجى تفعيل الإشعارات في المتصفح';
            }

        } catch (err) {
            Logger.error('OneSignal error', err);
            DOM.oneSignal.status.textContent = '⚠️ خطأ';
            DOM.oneSignal.status.className = 'status-value unsubscribed';
            if (DOM.oneSignal.playerId) DOM.oneSignal.playerId.textContent = err.message || 'حدث خطأ في التحقق';
        }
    }

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
                }

                await refreshNotifications();
            });

            Logger.info('OneSignal listener ready');

        } catch (err) {
            Logger.warn('فشل إعداد مستمع OneSignal', err);
        }
    }

    // ============================================================
    // 24. Supabase Realtime (مع إعادة الاتصال التلقائي)
    // ============================================================
    async function setupRealtime() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const sb = await getSupabase();
            if (!sb) return;

            // إلغاء القناة السابقة
            if (state.realtimeChannel) {
                await sb.removeChannel(state.realtimeChannel);
                state.realtimeChannel = null;
            }

            state.realtimeChannel = sb
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
                        if (Utils.isExpired(newNotif.expires_at)) return;

                        if (!newNotif.is_silent) {
                            showToast(`🔔 ${newNotif.title || 'إشعار جديد'}: ${(newNotif.body || '').substring(0, 60)}${(newNotif.body || '').length > 60 ? '...' : ''}`, 'info', 8000);
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
                    state.isRealtimeConnected = status === 'SUBSCRIBED';
                    if (status === 'SUBSCRIBED') {
                        state.reconnectAttempts = 0;
                        Logger.info('Realtime connected');
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        Logger.warn('Realtime connection lost, attempting to reconnect...');
                        handleRealtimeReconnect();
                    }
                });

            Logger.info('Realtime setup complete');

        } catch (err) {
            Logger.error('فشل إعداد Realtime', err);
            setTimeout(setupRealtime, 5000);
        }
    }

    function handleRealtimeReconnect() {
        if (state.reconnectAttempts >= state.maxReconnectAttempts) {
            Logger.warn('Max reconnect attempts reached');
            return;
        }
        state.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);
        Logger.info(`Reconnecting in ${delay}ms (attempt ${state.reconnectAttempts})`);
        setTimeout(setupRealtime, delay);
    }

    // ============================================================
    // 25. تحديث القائمة (مستعمل من Realtime و OneSignal)
    // ============================================================
    async function refreshNotifications() {
        await loadNotifications(1);
        await updateStatsAndBadges();
    }

    // ============================================================
    // 26. دوال مُصدَّرة مع تحقق من الصلاحية
    // ============================================================
    async function __openDetail(id) {
        if (!id) return;
        const user = await getCurrentUser();
        if (!user) {
            alert('يرجى تسجيل الدخول');
            return;
        }
        await openDetail(id);
    }

    async function __deleteNotification(id) {
        if (!id) return;
        const user = await getCurrentUser();
        if (!user) {
            alert('يرجى تسجيل الدخول');
            return;
        }
        await deleteNotification(id);
    }

    async function __loadNotifications(page) {
        const user = await getCurrentUser();
        if (!user) {
            alert('يرجى تسجيل الدخول');
            return;
        }
        await loadNotifications(page || 1);
    }

    async function __refreshNotifications() {
        const user = await getCurrentUser();
        if (!user) {
            alert('يرجى تسجيل الدخول');
            return;
        }
        await refreshNotifications();
    }

    // تصدير الدوال
    window.__openDetail = __openDetail;
    window.__deleteNotification = __deleteNotification;
    window.__loadNotifications = __loadNotifications;
    window.__refreshNotifications = __refreshNotifications;

    // ============================================================
    // 27. التهيئة
    // ============================================================
    async function init() {
        Logger.info('🚀 تشغيل مركز الإشعارات (v5)');

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

            // تحميل الفلاتر المحفوظة
            loadFilters();
            applyFiltersToUI();

            // تحميل البيانات
            await loadNotifications(1);
            await updateStatsAndBadges();
            await checkOneSignalStatus();

            // إعداد المستمعات
            setupOneSignalListener();
            await setupRealtime();
            await loadHistory(1);

            Logger.info('✅ مركز الإشعارات جاهز');

        } catch (err) {
            Logger.error('فشل التهيئة', err);
            renderEmptyState('فشل تحميل الإشعارات', 'fa-exclamation-circle', 'error', err.message);
        }
    }

    // ============================================================
    // 28. التشغيل
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
