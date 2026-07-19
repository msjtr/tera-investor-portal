/**
 * ========================================================
 * support-notifications.js – مركز الإشعارات الكامل
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
    let totalCount = 0;
    const pageSize = 20;

    // ===== المراجع =====
    const $ = id => document.getElementById(id);
    const listEl = $('notificationsList');
    const paginationEl = $('pagination');
    const searchInput = $('searchInput');
    const filterType = $('filterType');
    const filterStatus = $('filterStatus');
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

    // ===== Supabase client =====
    const supabase = window.supabaseClient || window.__supabase;

    // ===== الأدوات المساعدة =====
    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }

    function getTypeIcon(type) {
        const map = {
            general: 'fa-bell',
            investment: 'fa-chart-line',
            profit: 'fa-coins',
            due: 'fa-hand-holding-usd',
            contract: 'fa-file-contract',
            verification: 'fa-id-card',
            security: 'fa-shield-alt',
            portfolio: 'fa-wallet',
            support: 'fa-headset',
            system: 'fa-server'
        };
        return map[type] || 'fa-bell';
    }

    function getTypeClass(type) {
        return 'type-' + (type || 'general');
    }

    function getPriorityLabel(p) {
        const map = { critical: 'عاجل', high: 'مرتفع', medium: 'متوسط', low: 'منخفض' };
        return map[p] || p;
    }

    function getStatusLabel(s) {
        const map = { unread: 'غير مقروء', read: 'مقروء', archived: 'مؤرشف', deleted: 'محذوف' };
        return map[s] || s;
    }

    // ===== عرض الإشعارات =====
    function renderNotifications(notifications) {
        if (!notifications || notifications.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                    <i class="fas fa-inbox" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                    <span style="font-weight:700;font-size:18px;">لا توجد إشعارات</span>
                    <p style="margin-top:8px;font-size:14px;">سيتم عرض الإشعارات هنا عند ورودها.</p>
                </div>
            `;
            return;
        }

        let html = '';
        notifications.forEach(n => {
            const isUnread = n.status === 'unread';
            const priorityClass = n.priority || 'low';
            const icon = getTypeIcon(n.type);
            const typeClass = getTypeClass(n.type);
            const statusLabel = getStatusLabel(n.status);

            html += `
                <div class="notification-card ${isUnread ? 'unread' : ''}" data-id="${n.id}">
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
                            <span><i class="far fa-clock"></i> ${formatDate(n.created_at)}</span>
                            <span class="type-badge"><i class="fas ${icon}"></i> ${n.type || 'عام'}</span>
                            <span>الحالة: ${statusLabel}</span>
                            ${n.sender ? `<span><i class="fas fa-user"></i> ${n.sender}</span>` : ''}
                        </div>
                    </div>
                    <div class="notif-actions">
                        <button class="view-details" data-id="${n.id}" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i> تفاصيل
                        </button>
                        ${isUnread ? `<button class="mark-read-btn" data-id="${n.id}" title="تعليم كمقروء"><i class="fas fa-envelope-open"></i></button>` : ''}
                        <button class="archive-btn" data-id="${n.id}" title="أرشفة"><i class="fas fa-archive"></i></button>
                        <button class="delete-btn danger" data-id="${n.id}" title="حذف"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;

        // ===== ربط الأحداث =====
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

        // ===== تحديث التحديد =====
        selectedIds.clear();
        updateSelectAllState();
    }

    // ===== تحميل الإشعارات =====
    async function loadNotifications(page = 1) {
        if (!supabase) {
            listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--danger);">Supabase غير متصل</div>';
            return;
        }

        try {
            const user = await getCurrentUser();
            if (!user) {
                listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);">يرجى تسجيل الدخول</div>';
                return;
            }

            const search = searchInput.value.trim();
            const type = filterType.value;
            const status = filterStatus.value;
            const sort = sortOrder.value;

            let query = supabase
                .from('notifications')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: sort === 'asc' });

            if (type !== 'all') query = query.eq('type', type);
            if (status !== 'all') query = query.eq('status', status);
            if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, count, error } = await query;

            if (error) throw error;

            totalCount = count || 0;
            allNotifications = data || [];

            renderNotifications(allNotifications);
            updateStats();
            updatePagination(page);
            updateBadge();

        } catch (err) {
            console.error('❌ Error loading notifications:', err);
            listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--danger);">خطأ في تحميل الإشعارات: ${err.message}</div>`;
        }
    }

    // ===== الحصول على المستخدم الحالي =====
    async function getCurrentUser() {
        if (window.Auth && window.Auth.getCurrentUser) {
            const user = window.Auth.getCurrentUser();
            if (user) return user;
        }
        try {
            const { data } = await supabase.auth.getUser();
            return data?.user || null;
        } catch {
            return null;
        }
    }

    // ===== تحديث الإحصائيات =====
    async function updateStats() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const { count: total } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            const { count: unread } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'unread');

            const { count: read } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'read');

            const { count: archived } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'archived');

            const { count: important } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('priority', ['critical', 'high']);

            $('statTotal').textContent = total || 0;
            $('statUnread').textContent = unread || 0;
            $('statRead').textContent = read || 0;
            $('statArchived').textContent = archived || 0;
            $('statImportant').textContent = important || 0;

        } catch (err) {
            console.warn('⚠️ Failed to update stats:', err);
        }
    }

    // ===== تحديث البادج =====
    async function updateBadge() {
        try {
            const user = await getCurrentUser();
            if (!user) return;
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'unread');
            if (unreadBadge) unreadBadge.textContent = count || 0;
        } catch {}
    }

    // ===== Pagination =====
    function updatePagination(page) {
        const totalPages = Math.ceil(totalCount / pageSize);
        if (totalPages <= 1) {
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
                }
            });
        });
    }

    // ===== تحديد الكل =====
    function updateSelectAllState() {
        const cards = listEl.querySelectorAll('.notification-card');
        const allIds = Array.from(cards).map(el => el.dataset.id).filter(id => id);
        const allSelected = allIds.every(id => selectedIds.has(id));
    }

    // ===== تحديد الكل =====
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
            } else {
                el.style.borderLeft = '';
            }
        });
    });

    // ===== تعليم كمقروء =====
    async function markAsRead(id) {
        if (!id) return;
        try {
            const user = await getCurrentUser();
            if (!user) return;
            const { error } = await supabase
                .from('notifications')
                .update({ status: 'read', read_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
            await loadNotifications(currentPage);
        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    }

    // ===== تعليم عدة كمقروء =====
    markReadBtn.addEventListener('click', async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return alert('يرجى تحديد إشعارات أولاً');
        if (!confirm(`هل تريد تعليم ${ids.length} إشعار كمقروء؟`)) return;
        try {
            const user = await getCurrentUser();
            if (!user) return;
            const { error } = await supabase
                .from('notifications')
                .update({ status: 'read', read_at: new Date().toISOString() })
                .in('id', ids)
                .eq('user_id', user.id);
            if (error) throw error;
            selectedIds.clear();
            await loadNotifications(currentPage);
        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    });

    // ===== أرشفة =====
    async function archiveNotification(id) {
        if (!id) return;
        if (!confirm('هل تريد أرشفة هذا الإشعار؟')) return;
        try {
            const user = await getCurrentUser();
            if (!user) return;
            const { error } = await supabase
                .from('notifications')
                .update({ status: 'archived', archived_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
            await loadNotifications(currentPage);
        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    }

    archiveBtn.addEventListener('click', async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return alert('يرجى تحديد إشعارات أولاً');
        if (!confirm(`هل تريد أرشفة ${ids.length} إشعار؟`)) return;
        try {
            const user = await getCurrentUser();
            if (!user) return;
            const { error } = await supabase
                .from('notifications')
                .update({ status: 'archived', archived_at: new Date().toISOString() })
                .in('id', ids)
                .eq('user_id', user.id);
            if (error) throw error;
            selectedIds.clear();
            await loadNotifications(currentPage);
        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    });

    // ===== حذف =====
    async function deleteNotification(id) {
        if (!id) return;
        if (!confirm('هل أنت متأكد من حذف هذا الإشعار نهائياً؟')) return;
        try {
            const user = await getCurrentUser();
            if (!user) return;
            const { error } = await supabase
                .from('notifications')
                .update({ status: 'deleted', deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
            await loadNotifications(currentPage);
        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    }

    deleteBtn.addEventListener('click', async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return alert('يرجى تحديد إشعارات أولاً');
        if (!confirm(`هل تريد حذف ${ids.length} إشعار نهائياً؟`)) return;
        try {
            const user = await getCurrentUser();
            if (!user) return;
            const { error } = await supabase
                .from('notifications')
                .update({ status: 'deleted', deleted_at: new Date().toISOString() })
                .in('id', ids)
                .eq('user_id', user.id);
            if (error) throw error;
            selectedIds.clear();
            await loadNotifications(currentPage);
        } catch (err) {
            alert('خطأ: ' + err.message);
        }
    });

    // ===== عرض التفاصيل =====
    async function openDetail(id) {
        try {
            const user = await getCurrentUser();
            if (!user) return;
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();
            if (error) throw error;
            if (!data) return alert('الإشعار غير موجود');

            modalTitle.textContent = data.title || 'تفاصيل الإشعار';

            let html = `
                <div class="detail-row"><span class="label">العنوان</span><span class="value">${data.title || '—'}</span></div>
                <div class="detail-row"><span class="label">الوصف</span><span class="value">${data.body || '—'}</span></div>
                <div class="detail-row"><span class="label">التاريخ والوقت</span><span class="value">${formatDate(data.created_at)}</span></div>
                <div class="detail-row"><span class="label">المرسل</span><span class="value">${data.sender || 'النظام'}</span></div>
                <div class="detail-row"><span class="label">النوع</span><span class="value">${data.type || 'عام'}</span></div>
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
    $('closeDetailModal').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // ===== تحديث =====
    refreshBtn.addEventListener('click', () => {
        loadNotifications(currentPage);
    });

    // ===== البحث والفلترة =====
    [searchInput, filterType, filterStatus, sortOrder].forEach(el => {
        el.addEventListener('change', () => { currentPage = 1; loadNotifications(1); });
        if (el.tagName === 'INPUT') {
            el.addEventListener('input', () => { currentPage = 1; loadNotifications(1); });
        }
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
                loadNotifications(currentPage);
            } else if (tab === 'history') {
                loadHistory();
            }
        });
    });

    // ===== تحميل سجل الإشعارات =====
    async function loadHistory(page = 1) {
        const tbody = $('historyTableBody');
        try {
            const user = await getCurrentUser();
            if (!user) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">يرجى تسجيل الدخول</td></tr>';
                return;
            }
            const { data, count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .in('status', ['read', 'archived', 'deleted'])
                .order('created_at', { ascending: false })
                .range((page-1)*pageSize, page*pageSize-1);

            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">لا توجد إشعارات في السجل</td></tr>';
                return;
            }

            let html = '';
            data.forEach(n => {
                html += `
                    <tr>
                        <td style="font-size:12px;color:var(--gray-400);">${n.id.substring(0,8)}</td>
                        <td>${n.type || 'عام'}</td>
                        <td>${n.title || '—'}</td>
                        <td>${n.sender || 'النظام'}</td>
                        <td><span class="status-badge ${n.status === 'archived' ? 'status-archived' : ''}">${getStatusLabel(n.status)}</span></td>
                        <td>${formatDate(n.created_at)}</td>
                        <td>
                            <button class="action-btn view" onclick="window.__openDetail('${n.id}')"><i class="fas fa-eye"></i></button>
                            ${n.status !== 'deleted' ? `<button class="action-btn danger" onclick="window.__deleteNotification('${n.id}')"><i class="fas fa-trash"></i></button>` : ''}
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            // Pagination للسجل
            const totalPages = Math.ceil((count || 0) / pageSize);
            const hp = $('historyPagination');
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

    // ============================================================
    // 🔧 الجزء المُصلَح: التكامل مع OneSignal
    // ============================================================
    async function checkOneSignalStatus() {
        const statusEl = document.getElementById('osStatusText');
        const playerIdEl = document.getElementById('osPlayerId');

        try {
            // الانتظار حتى يصبح OneSignal متاحاً (مع timeout 10 ثوانٍ)
            let attempts = 0;
            const maxAttempts = 20; // 20 * 500ms = 10 ثوانٍ

            while (typeof window.OneSignal === 'undefined' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }

            // إذا لم يتم تحميل OneSignal بعد المحاولات
            if (typeof window.OneSignal === 'undefined' || !window.OneSignal.Notifications) {
                statusEl.textContent = '⏳ لم يتم التحميل بعد';
                statusEl.className = 'status-value unsubscribed';
                playerIdEl.textContent = 'حاول تحديث الصفحة';
                console.warn('⚠️ OneSignal not loaded after waiting');
                return;
            }

            const OneSignal = window.OneSignal;
            const isSubscribed = await OneSignal.Notifications.getPermissionAsync();
            const subscription = await OneSignal.User.pushSubscription.getCurrentSubscription();

            if (isSubscribed && subscription) {
                statusEl.textContent = '✅ مفعل';
                statusEl.className = 'status-value subscribed';
                const pid = subscription.id || 'غير متاح';
                playerIdEl.textContent = `Player ID: ${pid}`;
            } else {
                statusEl.textContent = '❌ غير مفعل';
                statusEl.className = 'status-value unsubscribed';
                playerIdEl.textContent = 'يرجى تفعيل الإشعارات في المتصفح';
            }

        } catch (err) {
            console.error('❌ OneSignal error:', err);
            statusEl.textContent = '⚠️ خطأ';
            statusEl.className = 'status-value unsubscribed';
            playerIdEl.textContent = err.message || 'حدث خطأ في التحقق';
        }
    }

    // ===== حفظ إعدادات الإشعارات =====
    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
        const toggles = document.querySelectorAll('.toggle-switch');
        const settings = {};
        toggles.forEach(t => {
            const key = t.dataset.key;
            settings[key] = t.classList.contains('active');
        });
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(settings));
            alert('✅ تم حفظ الإعدادات بنجاح');
        } catch (e) {
            alert('⚠️ حدث خطأ أثناء الحفظ');
        }
    });

    // ===== تحميل الإعدادات المحفوظة =====
    function loadSettings() {
        try {
            const raw = localStorage.getItem('notificationSettings');
            if (!raw) return;
            const settings = JSON.parse(raw);
            document.querySelectorAll('.toggle-switch').forEach(t => {
                const key = t.dataset.key;
                if (settings[key] !== undefined) {
                    if (settings[key]) t.classList.add('active');
                    else t.classList.remove('active');
                }
            });
        } catch {}
    }

    // ===== تبديل التبديلات =====
    document.addEventListener('click', (e) => {
        const toggle = e.target.closest('.toggle-switch');
        if (toggle && !toggle.style.pointerEvents) {
            toggle.classList.toggle('active');
        }
    });

    // ===== تصدير دوال للاستخدام في HTML =====
    window.__openDetail = openDetail;
    window.__deleteNotification = deleteNotification;

    // ===== التهيئة =====
    async function init() {
        // تحديث اسم المستخدم
        const user = await getCurrentUser();
        if (user) {
            const nameEl = document.getElementById('headerUserName');
            const avatarEl = document.getElementById('headerAvatar');
            const fullName = user.user_metadata?.full_name || user.email || 'مستخدم';
            if (nameEl) nameEl.textContent = fullName;
            if (avatarEl) avatarEl.textContent = fullName.charAt(0).toUpperCase();
        }

        loadSettings();
        await checkOneSignalStatus();
        await loadNotifications(1);
        // تحميل السجل مبدئياً
        await loadHistory(1);

        console.log('✅ support-notifications.js ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
