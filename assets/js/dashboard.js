/**
 * dashboard.js – v10 (محسّن الأداء والتوافق)
 * متوافق مع auth.js v31، supabase-client.js، support.js v2
 * يدعم عرض التنبيهات مع روابط وقراءة المزيد
 * متكامل مع نظام الإشعارات Realtime
 */

(function() {
    'use strict';

    // ============================================================
    // 1. الحالة والمتغيرات العامة
    // ============================================================
    let supabase = null;
    let chartInstance = null;
    let requestData = null;
    const sessionStart = new Date();
    let updateActivityInterval = null;
    let alertsData = [];
    let unreadCount = 0;
    let realtimeChannel = null;
    let isRealtimeConnected = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    let isInitialized = false;
    let refreshInterval = null;

    // ============================================================
    // 2. الأدوات المساعدة (متوافقة مع support-notifications.js)
    // ============================================================
    const Utils = {
        formatDateTime(iso) {
            if (!iso) return '';
            return new Date(iso).toLocaleDateString('ar-SA', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        },

        formatTimeAgo(iso) {
            if (!iso) return '';
            const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
            if (diff < 60) return 'الآن';
            if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
            if (diff < 604800) return `${Math.floor(diff / 86400)} يوم`;
            return this.formatDateTime(iso);
        },

        getElapsedDays(iso) {
            if (!iso) return '';
            const diff = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
            return diff < 1 ? 'أقل من يوم' : `${diff} يوم`;
        },

        getStatusLabel(status) {
            const labels = {
                draft: 'مسودة',
                pending_information: 'بانتظار استكمال البيانات',
                under_review: 'قيد المراجعة',
                needs_revision: 'يحتاج تعديل',
                has_notes: 'توجد ملاحظات',
                approved: 'معتمد',
                rejected: 'مرفوض',
                suspended: 'موقوف'
            };
            return labels[status] || status;
        },

        getAlertIcon(type) {
            const icons = {
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle',
                success: 'fa-check-circle',
                danger: 'fa-times-circle',
                primary: 'fa-bell',
                investment: 'fa-chart-line',
                profit: 'fa-coins',
                security: 'fa-shield-alt',
                system: 'fa-server',
                general: 'fa-bell'
            };
            return icons[type] || 'fa-bell';
        },

        getAlertClass(type) {
            const classes = {
                warning: 'alert-warning',
                info: 'alert-info',
                success: 'alert-success',
                danger: 'alert-danger',
                primary: 'alert-primary'
            };
            return classes[type] || 'alert-info';
        },

        // دالة مساعدة للتحقق من صحة الكائنات
        safeGet(obj, path, fallback = null) {
            try {
                return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? fallback;
            } catch {
                return fallback;
            }
        }
    };

    // ============================================================
    // 3. الحصول على Supabase والمستخدم (باستخدام window.Support)
    // ============================================================
    async function getSupabase() {
        if (supabase) return supabase;
        try {
            if (window.Support?.getSupabase) {
                supabase = await window.Support.getSupabase();
            } else if (window.teraSupabase) {
                supabase = window.teraSupabase;
            } else if (window.waitForSupabase) {
                supabase = await window.waitForSupabase();
            }
            return supabase;
        } catch (e) {
            console.warn('⚠️ Supabase غير جاهز:', e);
            return null;
        }
    }

    async function getCurrentUser(force = false) {
        try {
            if (window.Support?.getCurrentUser) {
                return await window.Support.getCurrentUser(force);
            }
            if (window.Auth?.getCurrentUser) {
                return await window.Auth.getCurrentUser();
            }
            const sb = await getSupabase();
            if (!sb) return null;
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) return null;
            return user;
        } catch (e) {
            console.warn('⚠️ فشل جلب المستخدم:', e);
            return null;
        }
    }

    // ============================================================
    // 4. إدارة Realtime (مع إعادة الاتصال التلقائي)
    // ============================================================
    async function setupRealtime(user) {
        if (!user?.id) {
            console.warn('⚠️ No user ID for Realtime');
            return;
        }

        try {
            const sb = await getSupabase();
            if (!sb) return;

            if (realtimeChannel) {
                try { await sb.removeChannel(realtimeChannel); } catch (e) { /* تجاهل */ }
                realtimeChannel = null;
            }

            realtimeChannel = sb
                .channel('dashboard-notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    async () => {
                        await onNotificationChanged(user);
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
                        await onNotificationChanged(user);
                    }
                )
                .subscribe((status) => {
                    isRealtimeConnected = status === 'SUBSCRIBED';
                    if (status === 'SUBSCRIBED') {
                        reconnectAttempts = 0;
                        console.log('✅ Realtime (dashboard) connected');
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn('⚠️ Realtime lost, reconnecting...');
                        handleRealtimeReconnect(user);
                    }
                });

        } catch (err) {
            console.warn('⚠️ فشل إعداد Realtime:', err);
            setTimeout(() => setupRealtime(user), 5000);
        }
    }

    function handleRealtimeReconnect(user) {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('⚠️ Max reconnect attempts reached');
            return;
        }
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        setTimeout(() => setupRealtime(user), delay);
    }

    async function onNotificationChanged(user) {
        await Promise.all([
            updateNotificationBadge(),
            loadAlerts(user)
        ]);
    }

    // ============================================================
    // 5. تحديث عداد الإشعارات (باستخدام Support)
    // ============================================================
    async function updateNotificationBadge() {
        try {
            if (window.Support?.updateNotificationBadge) {
                unreadCount = await window.Support.updateNotificationBadge() || 0;
            } else {
                // طريقة احتياطية
                const user = await getCurrentUser();
                if (!user) return 0;
                const sb = await getSupabase();
                if (!sb) return 0;
                const { count, error } = await sb
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('status', 'unread');
                if (error) throw error;
                unreadCount = count || 0;
            }

            // تحديث البادجات في كل مكان
            const badges = document.querySelectorAll('.notification-badge, .badge-count, #unreadBadge');
            badges.forEach(el => {
                if (el) {
                    el.textContent = unreadCount;
                    el.style.display = unreadCount > 0 ? 'inline-block' : 'none';
                }
            });

            // عداد الهيدر
            const headerBadge = document.querySelector('.header-notification-badge');
            if (headerBadge) {
                headerBadge.textContent = unreadCount;
                headerBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }

            // عداد القائمة الجانبية
            const sidebarBadge = document.querySelector('.sidebar-notification-badge');
            if (sidebarBadge) {
                sidebarBadge.textContent = unreadCount;
                sidebarBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }

            return unreadCount;
        } catch (e) {
            console.warn('⚠️ فشل تحديث عداد الإشعارات:', e);
            return 0;
        }
    }

    // ============================================================
    // 6. تحميل وعرض التنبيهات (محسّن مع التحقق من العناصر)
    // ============================================================
    async function loadAlerts(user) {
        const container = document.getElementById('alertsPanel');
        if (!container) {
            console.debug('⚠️ alertsPanel element not found');
            return;
        }

        try {
            const alerts = [];

            // 1. تنبيهات الملف الشخصي
            const { data: req, error: reqError } = await supabase
                .from('verification_requests')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!reqError) {
                const profileSteps = [
                    { key: 'personal_info_completed', label: 'المعلومات الشخصية', link: '/pages/profile/personal-information.html' },
                    { key: 'contact_info_completed', label: 'معلومات التواصل', link: '/pages/profile/contact-information.html' },
                    { key: 'national_address_completed', label: 'العنوان الوطني', link: '/pages/profile/national-address.html' },
                    { key: 'bank_info_completed', label: 'المعلومات البنكية', link: '/pages/profile/bank-information.html' },
                    { key: 'attachments_completed', label: 'المرفقات والوثائق', link: '/pages/profile/attachments.html' }
                ];
                const missingSteps = profileSteps.filter(s => !req?.[s.key]);

                if (missingSteps.length > 0) {
                    alerts.push({
                        id: 'profile_incomplete',
                        type: 'warning',
                        icon: 'fa-user-edit',
                        title: 'استكمال الملف الشخصي',
                        description: `يجب استكمال ${missingSteps.length} مرحلة لإتمام طلب التحقق: ${missingSteps.map(s => s.label).join('، ')}`,
                        link: '/pages/profile/personal-information.html',
                        linkText: 'استكمال الملف',
                        readMore: `المراحل المطلوبة: <ul>${missingSteps.map(s => `<li><a href="${s.link}">${s.label}</a></li>`).join('')}</ul>`,
                        date: req?.updated_at || new Date().toISOString(),
                        priority: 'high'
                    });
                }

                if (req?.submitted) {
                    const statusMap = {
                        'under_review': { type: 'info', title: 'طلبك قيد المراجعة', description: 'تم استلام طلب التحقق وهو قيد المراجعة من قبل الفريق.' },
                        'approved': { type: 'success', title: 'تم اعتماد طلبك 🎉', description: 'تم اعتماد طلب التحقق بنجاح. يمكنك الآن الاستفادة من جميع خدمات المنصة.' },
                        'rejected': { type: 'danger', title: 'تم رفض الطلب', description: req.notes || 'لم يتم قبول طلب التحقق. يرجى التواصل مع الدعم.' },
                        'needs_revision': { type: 'warning', title: 'طلبك يحتاج تعديل', description: req.notes || 'يحتاج طلبك إلى تعديلات قبل الموافقة.' },
                        'pending_information': { type: 'info', title: 'بانتظار استكمال البيانات', description: 'يرجى استكمال البيانات المطلوبة لإتمام الطلب.' }
                    };
                    const statusInfo = statusMap[req.status];
                    if (statusInfo) {
                        alerts.push({
                            id: `request_status_${req.status}`,
                            type: statusInfo.type,
                            icon: 'fa-clipboard-check',
                            title: statusInfo.title,
                            description: statusInfo.description,
                            link: req.status === 'needs_revision' || req.status === 'pending_information' ? '/pages/profile/personal-information.html' : null,
                            linkText: req.status === 'needs_revision' || req.status === 'pending_information' ? 'تعديل البيانات' : null,
                            readMore: req.notes ? `<strong>ملاحظات:</strong> ${req.notes}` : null,
                            date: req.updated_at,
                            priority: req.status === 'rejected' ? 'critical' : (req.status === 'needs_revision' ? 'high' : 'medium')
                        });
                    }
                }
            }

            // 2. تنبيهات من الإشعارات غير المقروءة (آخر 5)
            try {
                const { data: notifications, error: notifError } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'unread')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (!notifError && notifications && notifications.length > 0) {
                    notifications.forEach(n => {
                        const typeMap = {
                            'investment': 'investment',
                            'profit': 'profit',
                            'security': 'security',
                            'system': 'system',
                            'general': 'info'
                        };
                        alerts.push({
                            id: `notif_${n.id}`,
                            type: typeMap[n.type] || 'info',
                            icon: Utils.getAlertIcon(n.type),
                            title: n.title || 'إشعار جديد',
                            description: n.body || '',
                            link: n.action_url || null,
                            linkText: 'عرض التفاصيل',
                            readMore: n.body || null,
                            date: n.created_at,
                            priority: n.priority || 'medium'
                        });
                    });
                }
            } catch (e) { /* تجاهل */ }

            // 3. تنبيهات النظام
            if (user && !user.email_confirmed_at) {
                alerts.push({
                    id: 'email_verification',
                    type: 'warning',
                    icon: 'fa-envelope',
                    title: 'تأكيد البريد الإلكتروني',
                    description: 'لم يتم تأكيد بريدك الإلكتروني بعد. يرجى التحقق من صندوق الوارد.',
                    link: '/auth/verify-email.html',
                    linkText: 'إعادة إرسال التأكيد',
                    readMore: 'تأكيد البريد الإلكتروني ضروري لتفعيل جميع خدمات المنصة.',
                    date: new Date().toISOString(),
                    priority: 'high'
                });
            }

            // 4. تنبيهات مخصصة من localStorage
            const dismissedAlerts = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
            const systemMessage = localStorage.getItem('systemMessage');
            if (systemMessage && !dismissedAlerts.includes('system_message')) {
                try {
                    const msg = JSON.parse(systemMessage);
                    alerts.push({
                        id: 'system_message',
                        type: msg.type || 'info',
                        icon: 'fa-server',
                        title: msg.title || 'تحديث النظام',
                        description: msg.body || '',
                        link: msg.link || null,
                        linkText: msg.linkText || 'قراءة المزيد',
                        readMore: msg.fullText || null,
                        date: msg.date || new Date().toISOString(),
                        priority: msg.priority || 'medium',
                        dismissible: true
                    });
                } catch (e) { /* تجاهل */ }
            }

            // ترتيب حسب الأولوية والتاريخ
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            alerts.sort((a, b) => {
                const pa = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 3;
                const pb = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 3;
                if (pa !== pb) return pa - pb;
                return new Date(b.date) - new Date(a.date);
            });

            alertsData = alerts;
            renderAlerts(alerts, container);

        } catch (e) {
            console.warn('⚠️ تعذر تحميل التنبيهات:', e);
        }
    }

    function renderAlerts(alerts, container) {
        if (!container || !alerts || alerts.length === 0) {
            if (container) container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

        const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
        const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id));

        if (visibleAlerts.length === 0) {
            container.style.display = 'none';
            return;
        }

        let html = `
            <div class="panel-card" id="alertsContainer">
                <div class="panel-header">
                    <i class="fas fa-bell"></i>
                    <h3>التنبيهات <span class="panel-badge" style="background:var(--danger);color:#fff;padding:2px 10px;border-radius:12px;font-size:12px;">${visibleAlerts.length}</span></h3>
                    ${visibleAlerts.length > 3 ? `<button class="btn-text-action" id="toggleAllAlerts">عرض الكل</button>` : ''}
                </div>
                <div id="alertsList" style="display:flex;flex-direction:column;gap:12px;">
        `;

        const showAll = visibleAlerts.length <= 3;
        const alertsToShow = showAll ? visibleAlerts : visibleAlerts.slice(0, 3);

        alertsToShow.forEach((alert) => {
            const alertClass = Utils.getAlertClass(alert.type);
            const icon = alert.icon || Utils.getAlertIcon(alert.type);
            const isDismissible = alert.dismissible !== false;

            html += `
                <div class="alert-item-box ${alertClass}" data-alert-id="${alert.id}" style="position:relative;padding:16px 20px;border-radius:12px;border:1px solid;display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;align-items:flex-start;gap:12px;width:100%;">
                        <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.05);flex-shrink:0;">
                            <i class="fas ${icon}" style="font-size:18px;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:4px;">
                                <strong style="font-size:15px;color:var(--gray-900);">${alert.title}</strong>
                                ${alert.priority === 'critical' ? '<span style="font-size:10px;background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:12px;font-weight:700;">عاجل</span>' : ''}
                                ${alert.priority === 'high' ? '<span style="font-size:10px;background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:12px;font-weight:700;">مرتفع</span>' : ''}
                                <span style="font-size:11px;color:var(--gray-400);margin-right:auto;">${Utils.formatTimeAgo(alert.date)}</span>
                            </div>
                            <p style="margin:0;font-size:14px;color:var(--gray-600);line-height:1.6;">${alert.description}</p>
                            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;align-items:center;">
                                ${alert.link ? `<a href="${alert.link}" class="btn-table-link" style="padding:4px 14px;font-size:12px;"><i class="fas fa-arrow-left"></i> ${alert.linkText || 'عرض التفاصيل'}</a>` : ''}
                                ${alert.readMore ? `<button class="read-more-btn" data-alert-id="${alert.id}" style="background:transparent;border:none;color:var(--primary);font-weight:700;font-size:13px;cursor:pointer;padding:4px 8px;">قراءة المزيد <i class="fas fa-chevron-down" style="font-size:10px;"></i></button>` : ''}
                                ${isDismissible ? `<button class="dismiss-alert-btn" data-alert-id="${alert.id}" style="background:transparent;border:none;color:var(--gray-400);cursor:pointer;font-size:14px;padding:4px;margin-right:auto;" title="تجاهل التنبيه"><i class="fas fa-times"></i></button>` : ''}
                            </div>
                            ${alert.readMore ? `<div class="read-more-content" id="readmore_${alert.id}" style="display:none;margin-top:8px;padding:12px 16px;background:rgba(0,0,0,0.03);border-radius:8px;font-size:13px;color:var(--gray-700);line-height:1.8;">${alert.readMore}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        if (!showAll && visibleAlerts.length > 3) {
            const hiddenCount = visibleAlerts.length - 3;
            html += `
                <div id="hiddenAlerts" style="display:none;flex-direction:column;gap:12px;">
            `;
            visibleAlerts.slice(3).forEach(alert => {
                const alertClass = Utils.getAlertClass(alert.type);
                const icon = alert.icon || Utils.getAlertIcon(alert.type);
                const isDismissible = alert.dismissible !== false;
                html += `
                    <div class="alert-item-box ${alertClass}" data-alert-id="${alert.id}" style="position:relative;padding:16px 20px;border-radius:12px;border:1px solid;display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;align-items:flex-start;gap:12px;width:100%;">
                            <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.05);flex-shrink:0;">
                                <i class="fas ${icon}" style="font-size:18px;"></i>
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:4px;">
                                    <strong style="font-size:15px;color:var(--gray-900);">${alert.title}</strong>
                                    ${alert.priority === 'critical' ? '<span style="font-size:10px;background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:12px;font-weight:700;">عاجل</span>' : ''}
                                    ${alert.priority === 'high' ? '<span style="font-size:10px;background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:12px;font-weight:700;">مرتفع</span>' : ''}
                                    <span style="font-size:11px;color:var(--gray-400);margin-right:auto;">${Utils.formatTimeAgo(alert.date)}</span>
                                </div>
                                <p style="margin:0;font-size:14px;color:var(--gray-600);line-height:1.6;">${alert.description}</p>
                                <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;align-items:center;">
                                    ${alert.link ? `<a href="${alert.link}" class="btn-table-link" style="padding:4px 14px;font-size:12px;"><i class="fas fa-arrow-left"></i> ${alert.linkText || 'عرض التفاصيل'}</a>` : ''}
                                    ${alert.readMore ? `<button class="read-more-btn" data-alert-id="${alert.id}" style="background:transparent;border:none;color:var(--primary);font-weight:700;font-size:13px;cursor:pointer;padding:4px 8px;">قراءة المزيد <i class="fas fa-chevron-down" style="font-size:10px;"></i></button>` : ''}
                                    ${isDismissible ? `<button class="dismiss-alert-btn" data-alert-id="${alert.id}" style="background:transparent;border:none;color:var(--gray-400);cursor:pointer;font-size:14px;padding:4px;margin-right:auto;" title="تجاهل التنبيه"><i class="fas fa-times"></i></button>` : ''}
                                </div>
                                ${alert.readMore ? `<div class="read-more-content" id="readmore_${alert.id}" style="display:none;margin-top:8px;padding:12px 16px;background:rgba(0,0,0,0.03);border-radius:8px;font-size:13px;color:var(--gray-700);line-height:1.8;">${alert.readMore}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            html += `</div>
                <button class="btn-text-action" id="showMoreAlerts" style="text-align:center;width:100%;padding:8px;font-size:13px;">
                    <i class="fas fa-chevron-down"></i> عرض ${hiddenCount} تنبيهات إضافية
                </button>
                <button class="btn-text-action" id="showLessAlerts" style="display:none;text-align:center;width:100%;padding:8px;font-size:13px;">
                    <i class="fas fa-chevron-up"></i> عرض أقل
                </button>
            `;
        }

        html += `</div></div>`;
        container.innerHTML = html;

        // ربط الأحداث
        container.querySelectorAll('.dismiss-alert-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                dismissAlert(this.dataset.alertId);
            });
        });

        container.querySelectorAll('.read-more-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const alertId = this.dataset.alertId;
                const content = document.getElementById(`readmore_${alertId}`);
                const icon = this.querySelector('i');
                if (content) {
                    if (content.style.display === 'none' || content.style.display === '') {
                        content.style.display = 'block';
                        if (icon) icon.className = 'fas fa-chevron-up';
                    } else {
                        content.style.display = 'none';
                        if (icon) icon.className = 'fas fa-chevron-down';
                    }
                }
            });
        });

        const showMoreBtn = document.getElementById('showMoreAlerts');
        const showLessBtn = document.getElementById('showLessAlerts');
        const hiddenAlerts = document.getElementById('hiddenAlerts');

        if (showMoreBtn && hiddenAlerts) {
            showMoreBtn.addEventListener('click', () => {
                hiddenAlerts.style.display = 'flex';
                showMoreBtn.style.display = 'none';
                if (showLessBtn) showLessBtn.style.display = 'block';
            });
        }

        if (showLessBtn && hiddenAlerts) {
            showLessBtn.addEventListener('click', () => {
                hiddenAlerts.style.display = 'none';
                showLessBtn.style.display = 'none';
                if (showMoreBtn) showMoreBtn.style.display = 'block';
            });
        }
    }

    function dismissAlert(alertId) {
        const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
        if (!dismissed.includes(alertId)) {
            dismissed.push(alertId);
            localStorage.setItem('dismissedAlerts', JSON.stringify(dismissed));
        }
        const container = document.getElementById('alertsPanel');
        if (container && alertsData.length > 0) {
            renderAlerts(alertsData, container);
        }
        const visibleAlerts = alertsData.filter(a => !dismissed.includes(a.id));
        if (visibleAlerts.length === 0 && container) {
            container.style.display = 'none';
        }
    }

    // ============================================================
    // 7. حالة الطلب والملف الشخصي
    // ============================================================
    async function loadCustomerJourney(user) {
        try {
            const { data: req, error: reqError } = await supabase
                .from('verification_requests')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (reqError) {
                console.error('فشل تحميل طلب التحقق:', reqError);
                return;
            }

            requestData = req;

            const banner = document.getElementById('profileAlertBanner');
            if (banner) banner.style.display = (!req || !req.submitted) ? 'flex' : 'none';

            const contactAlert = document.getElementById('contactInfoAlert');
            if (contactAlert) contactAlert.style.display = (!req || !req.contact_info_completed) ? 'flex' : 'none';

            const panel = document.getElementById('requestStatusPanel');
            if (!panel) return;

            if (!req || !req.submitted) {
                renderIncompleteProfile(panel, req);
            } else {
                renderRequestStatus(panel, req);
            }
        } catch (e) {
            console.warn('تعذر تحميل حالة الطلب:', e);
        }
    }

    function renderIncompleteProfile(panel, req) {
        if (!panel) return;
        const stages = [
            { key: 'personal_info_completed', label: 'المعلومات الشخصية', icon: 'fa-user', link: '/pages/profile/personal-information.html' },
            { key: 'contact_info_completed', label: 'معلومات التواصل', icon: 'fa-phone', link: '/pages/profile/contact-information.html' },
            { key: 'national_address_completed', label: 'العنوان الوطني الموثق', icon: 'fa-map-marker-alt', link: '/pages/profile/national-address.html' },
            { key: 'bank_info_completed', label: 'المعلومات البنكية', icon: 'fa-university', link: '/pages/profile/bank-information.html' },
            { key: 'attachments_completed', label: 'المرفقات والوثائق', icon: 'fa-paperclip', link: '/pages/profile/attachments.html' },
            { key: 'agreed', label: 'الإقرار', icon: 'fa-check', link: null },
            { key: 'submitted', label: 'المراجعة النهائية', icon: 'fa-paper-plane', link: null }
        ];

        let html = `<div class="panel-card">
            <div class="panel-header"><i class="fas fa-clipboard-check"></i><h3>حالة الاستكمال</h3></div>
            <div class="stages-grid">`;

        stages.forEach(stage => {
            const done = req?.[stage.key] === true;
            html += `
            <div class="stage-item ${done ? 'completed' : 'pending'}">
                ${stage.link ? `<a href="${stage.link}">` : ''}
                    <i class="fas ${stage.icon}" style="color:${done ? '#10b981' : '#94a3b8'};"></i>
                    <div class="stage-label" style="color:${done ? '#166534' : '#334155'};">${stage.label}</div>
                    <div class="stage-status" style="color:${done ? '#10b981' : '#64748b'};">
                        ${done ? '✔ مكتمل' : '⏳ مطلوب'}
                    </div>
                ${stage.link ? '</a>' : ''}
            </div>`;
        });

        html += `</div>`;
        if (stages.some(s => !req?.[s.key])) {
            html += `<div style="margin-top:12px; text-align:center;"><a href="/pages/profile/personal-information.html" class="btn-table-link">استكمال الملف الشخصي</a></div>`;
        } else {
            html += `<div class="alert-item-box alert-success" style="margin-top:12px;"><i class="fas fa-check-circle"></i> تم استلام طلبكم بنجاح، وسيتم تحويله للمراجعة.</div>`;
        }
        html += `</div>`;
        panel.innerHTML = html;
    }

    function renderRequestStatus(panel, req) {
        if (!panel || !req) return;
        const statusIcons = {
            'under_review': 'fa-search',
            'approved': 'fa-check-circle',
            'rejected': 'fa-times-circle',
            'needs_revision': 'fa-edit',
            'pending_information': 'fa-info-circle'
        };
        const statusIcon = statusIcons[req.status] || 'fa-clock';
        const statusColor = req.status === 'approved' ? '#10b981' : (req.status === 'rejected' ? '#dc2626' : '#f59e0b');
        const statusLabel = Utils.getStatusLabel(req.status);

        let html = `<div class="request-status-card-full">
            <div class="request-header">
                <div class="request-header-icon"><i class="fas fa-clipboard-check"></i></div>
                <h3>حالة الطلب</h3>
            </div>
            <div style="text-align:center; padding:20px 0;">
                <i class="fas ${statusIcon} status-icon-large" style="color:${statusColor};"></i>
                <div><span class="status-badge-large" style="background:${statusColor}20; color:${statusColor};">${statusLabel}</span></div>
            </div>
            <div class="request-details-list">
                <div class="request-detail-item"><i class="fas fa-calendar-plus"></i><strong>تاريخ التقديم:</strong><span>${Utils.formatDateTime(req.submitted_at)}</span></div>
                <div class="request-detail-item"><i class="fas fa-history"></i><strong>آخر تحديث:</strong><span>${Utils.formatDateTime(req.updated_at)}</span></div>
                <div class="request-detail-item"><i class="fas fa-hourglass-half"></i><strong>المدة المنقضية:</strong><span>${Utils.getElapsedDays(req.submitted_at)}</span></div>
                <div class="request-detail-item"><i class="fas fa-chart-line"></i><strong>نسبة الإنجاز:</strong><span>${req.progress || 0}%</span></div>
                <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${req.progress || 0}%;"></div></div>
                ${req.notes ? `<div class="request-detail-item" style="margin-top:10px;"><i class="fas fa-sticky-note"></i><strong>ملاحظات:</strong><span>${req.notes}</span></div>` : ''}
            </div>`;

        if (req.status === 'needs_revision' || req.status === 'pending_information') {
            const stagesToCheck = [
                { key: 'personal_info_completed', label: 'المعلومات الشخصية', link: '/pages/profile/personal-information.html' },
                { key: 'contact_info_completed', label: 'معلومات التواصل', link: '/pages/profile/contact-information.html' },
                { key: 'national_address_completed', label: 'العنوان الوطني الموثق', link: '/pages/profile/national-address.html' },
                { key: 'bank_info_completed', label: 'المعلومات البنكية', link: '/pages/profile/bank-information.html' },
                { key: 'attachments_completed', label: 'المرفقات والوثائق', link: '/pages/profile/attachments.html' }
            ];
            const pendingStages = stagesToCheck.filter(s => !req[s.key]);
            if (pendingStages.length > 0) {
                html += `<div class="alert-warning-box">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div><strong>تنبيه:</strong> بعض المراحل تحتاج إلى استكمال أو تعديل:<ul>`;
                pendingStages.forEach(s => html += `<li><a href="${s.link}">${s.label}</a></li>`);
                html += `</ul></div></div>`;
            }
            html += `<div style="margin-top:16px; text-align:center;"><a href="/pages/profile/personal-information.html" class="btn-table-link">تعديل البيانات</a></div>`;
        }

        html += `</div>`;
        panel.innerHTML = html;
    }

    // ============================================================
    // 8. الإحصائيات والمخطط
    // ============================================================
    async function loadStats(user) {
        try {
            const { data, error } = await supabase
                .from('user_portfolio')
                .select('total_value, active_contracts, available_balance')
                .eq('user_id', user.id)
                .maybeSingle();
            if (error) { console.error('فشل تحميل الإحصائيات:', error); return; }
            if (data) {
                const statCards = document.querySelectorAll('.stat-card .stat-value');
                if (statCards.length >= 3) {
                    statCards[0].textContent = (data.total_value || 0).toLocaleString() + ' ر.س';
                    statCards[1].textContent = (data.active_contracts || 0) + ' عقود نشطة';
                    statCards[2].textContent = (data.available_balance || 0).toLocaleString() + ' ر.س';
                }
            }
        } catch (e) {
            console.warn('تعذر تحميل الإحصائيات:', e);
        }
    }

    async function loadChartData(user) {
        const ctx = document.getElementById('mainChart');
        if (!ctx || typeof Chart === 'undefined') return;

        let labels = [], values = [];
        try {
            const { data, error } = await supabase
                .from('portfolio_history')
                .select('month, value')
                .eq('user_id', user.id)
                .order('month', { ascending: true });

            if (error) throw error;
            if (data && data.length > 0) {
                labels = data.map(r => r.month);
                values = data.map(r => r.value);
            }
        } catch (e) {
            console.warn('تعذر تحميل المخطط:', e);
        }

        if (labels.length === 0) {
            labels = ['لا توجد بيانات'];
            values = [0];
        }

        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'قيمة المحفظة (ر.س)',
                    data: values,
                    borderColor: '#028090',
                    backgroundColor: 'rgba(2, 128, 144, 0.1)',
                    tension: 0.3, fill: true,
                    pointBackgroundColor: '#028090',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: { family: 'Tajawal', size: 12 }, color: '#334155', padding: 20 } },
                    tooltip: { callbacks: { label: ctx => ctx.parsed.y.toLocaleString() + ' ر.س' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { font: { family: 'Tajawal', size: 11 }, color: '#64748b', callback: v => v.toLocaleString() + ' ر.س' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Tajawal', size: 11 }, color: '#64748b' }
                    }
                }
            }
        });
    }

    // ============================================================
    // 9. التهيئة
    // ============================================================
    async function init() {
        if (isInitialized) return;
        isInitialized = true;

        // التحقق من وجود Auth
        if (!window.Auth || typeof window.Auth.requireAuth !== 'function') {
            console.error('❌ نظام المصادقة غير متوفر');
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        const user = await window.Auth.requireAuth();
        if (!user) {
            isInitialized = false;
            return;
        }

        supabase = await getSupabase();
        if (!supabase) {
            console.error('❌ Supabase غير متوفر');
            isInitialized = false;
            return;
        }

        // بدء حماية الجلسة
        const sessionId = sessionStorage.getItem('currentSessionId');
        if (window.SessionManager && sessionId) {
            try { window.SessionManager.startSessionGuard(user.id, sessionId); } catch (e) { console.warn('Session guard start failed:', e); }
        } else if (window.SessionManager && !sessionId) {
            try {
                const result = await window.SessionManager.createSessionRecord(user.id);
                if (result?.success) {
                    sessionStorage.setItem('currentSessionId', result.sessionId);
                    window.SessionManager.startSessionGuard(user.id, result.sessionId);
                }
            } catch (e) {
                console.warn('تعذر إنشاء جلسة تلقائياً:', e);
            }
        }

        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.classList.add('active');

        // تحديث الهيدر
        const storedName = sessionStorage.getItem('otpName');
        const displayName = storedName || user.user_metadata?.full_name || user.email || 'مستخدم';
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (nameEl) nameEl.textContent = displayName;
        if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

        const h2 = document.querySelector('.welcome-banner h2');
        if (h2) {
            h2.innerHTML = `<i class="fas fa-hand-peace"></i> مرحباً بك، ${displayName}!`;
        }

        // طلب الموقع
        if (window.Auth?.getCurrentPosition) {
            window.Auth.getCurrentPosition().then(pos => {
                sessionStorage.setItem('userLat', pos.latitude);
                sessionStorage.setItem('userLon', pos.longitude);
            }).catch(() => {});
        }

        // تتبع النشاط
        if (window.ActivityTracker) {
            window.ActivityTracker.startIdleTimer(async () => {
                if (window.Auth?.logout) await window.Auth.logout();
            }, user.id);

            try { await window.ActivityTracker.updateLastActivity(user.id); } catch (e) {}

            updateActivityInterval = setInterval(async () => {
                try {
                    await window.ActivityTracker.updateLastActivity(user.id);
                } catch (e) {
                    if (e?.code === 401 || e?.message?.includes('401')) {
                        clearInterval(updateActivityInterval);
                    }
                }
            }, 60000);
        }

        // تحميل البيانات بالتوازي لتحسين الأداء
        try {
            await Promise.all([
                loadCustomerJourney(user),
                loadStats(user),
                loadChartData(user),
                loadAlerts(user),
                updateNotificationBadge()
            ]);
        } catch (e) {
            console.warn('⚠️ بعض البيانات لم تُحمّل:', e);
        }

        // إعداد Realtime بعد تحميل البيانات
        await setupRealtime(user);

        // تحديث الوقت
        const updateDateTime = () => {
            const now = new Date();
            const dateEl = document.getElementById('currentDate');
            const timeEl = document.getElementById('currentTime');
            const sessionEl = document.getElementById('sessionTimer');
            if (dateEl) dateEl.textContent = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
            if (timeEl) timeEl.textContent = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            if (sessionEl) {
                const mins = Math.floor((now - sessionStart) / 60000);
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                sessionEl.textContent = h > 0 ? `${h} ساعة و ${m} دقيقة` : `${m} دقيقة`;
            }
        };
        updateDateTime();
        refreshInterval = setInterval(updateDateTime, 30000);

        if (loadingOverlay) loadingOverlay.classList.remove('active');
        console.log('✅ dashboard.js v10 ready (محسّن الأداء والتوافق)');
    }

    // ============================================================
    // 10. التنظيف عند إغلاق الصفحة
    // ============================================================
    function cleanup() {
        if (updateActivityInterval) {
            clearInterval(updateActivityInterval);
            updateActivityInterval = null;
        }
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        if (realtimeChannel) {
            getSupabase().then(sb => {
                if (sb && realtimeChannel) {
                    sb.removeChannel(realtimeChannel).catch(() => {});
                    realtimeChannel = null;
                }
            }).catch(() => {});
        }
        isInitialized = false;
    }

    window.addEventListener('beforeunload', cleanup);

    // ============================================================
    // 11. تشغيل التهيئة
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // إذا كان DOM جاهزاً، انتظر قليلاً للتأكد من تحميل جميع المكونات
        setTimeout(init, 100);
    }

})();
