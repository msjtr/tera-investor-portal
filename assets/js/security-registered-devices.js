/**
 * security-registered-devices.js – v30 (تقرير شبكة شامل مع إحداثيات IP ونوع الشبكة)
 */
(function() {
    let supabase, currentUser, sessions = [];

    // ---------- دوال مساعدة ----------
    function formatDate(d) { return d ? new Date(d).toLocaleString('ar-SA') : '-'; }
    function getStatusLabel(s) {
        const l = {
            active: 'نشطة',
            logged_out: 'تم تسجيل الخروج',
            timeout: 'انتهت بسبب عدم النشاط',
            terminated_by_system: 'أنهيت بواسطة النظام',
            terminated_by_user: 'أنهيت بواسطة المستخدم'
        };
        return l[s] || s;
    }

    function updateHeader(user) {
        if (window.UIHelpers?.updateHeader) return window.UIHelpers.updateHeader(user);
        const name = user.user_metadata?.full_name || user.email || 'مستخدم';
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (nameEl) nameEl.textContent = name;
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    }

    function getDeviceIcon(session) {
        const type = session.device_type;
        const os = (session.operating_system || '').toLowerCase();
        if (type === 'mobile') return 'fa-mobile-alt';
        if (type === 'tablet') return 'fa-tablet-alt';
        if (os.includes('mac') || os.includes('ios')) return 'fa-apple';
        if (os.includes('windows')) return 'fa-windows';
        if (os.includes('android')) return 'fa-android';
        return 'fa-desktop';
    }

    // ======== تصحيح تلقائي للجلسة الحالية ========
    async function ensureCurrentSessionFlag() {
        if (!currentUser || !supabase) return;
        const activeWithFlag = sessions.some(s => s.status === 'active' && s.is_current_session);
        if (activeWithFlag) return;

        const activeSessions = sessions
            .filter(s => s.status === 'active')
            .sort((a, b) => new Date(b.login_at) - new Date(a.login_at));
        if (activeSessions.length === 0) return;
        const newestActive = activeSessions[0];

        try {
            await supabase.from('user_login_sessions')
                .update({ is_current_session: false })
                .eq('user_id', currentUser.id)
                .neq('id', newestActive.id);
            await supabase.from('user_login_sessions')
                .update({ is_current_session: true })
                .eq('id', newestActive.id)
                .eq('user_id', currentUser.id);
            sessions.forEach(s => { s.is_current_session = (s.id === newestActive.id); });
        } catch (e) { /* ignore */ }
    }

    // بطاقة الجلسة الحالية
    function renderCurrentSessionCard() {
        const card = document.getElementById('currentSessionCard');
        if (!card) return;
        let current = sessions.find(s => s.status === 'active' && s.is_current_session);
        if (!current) current = sessions.find(s => s.status === 'active');
        if (!current) { card.style.display = 'none'; return; }
        card.style.display = 'block';
        const fmt = formatDate;
        const devIcon = getDeviceIcon(current);
        const browser = current.browser_name ? `${current.browser_name} ${current.browser_version || ''}` : '—';
        const location = [current.city, current.country].filter(Boolean).join('، ') || '—';
        const ip = current.ip_address || '—';

        card.innerHTML = `
            <div class="card-header" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                <i class="fas ${devIcon}" style="font-size:28px; color:var(--primary);"></i>
                <div style="flex:1;">
                    <div class="card-title" style="font-weight:700; font-size:16px; display:flex; align-items:center; gap:8px;">
                        الجلسة الحالية
                        <span class="badge-current" style="background:var(--primary); color:white; padding:2px 8px; border-radius:10px; font-size:11px;">أنت هنا</span>
                    </div>
                    <div class="card-meta" style="font-size:13px; color:var(--gray-500);">${current.session_number} • ${fmt(current.login_at)}</div>
                </div>
                <button class="btn-action danger" onclick="window.terminateSession('${current.id}')"><i class="fas fa-sign-out-alt"></i> إنهاء</button>
            </div>
            <div class="card-details" style="margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:10px;">
                <div><strong>الجهاز:</strong> ${current.device_type || '—'}</div>
                <div><strong>المتصفح:</strong> ${browser}</div>
                <div><strong>IP:</strong> ${ip}</div>
                <div><strong>الموقع:</strong> ${location}</div>
            </div>
        `;
    }

    // ---------- عمليات الجلسات ----------
    async function fetchSessions() {
        if (window.SessionManager?.fetchSessions) sessions = await window.SessionManager.fetchSessions(currentUser.id);
        else {
            const { data, error } = await supabase.from('user_login_sessions')
                .select('*').eq('user_id', currentUser.id).order('login_at', { ascending: false });
            if (error) sessions = [];
            else sessions = data || [];
        }
        if (sessions.length === 0) {
            const tbody = document.getElementById('sessionsTableBody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>';
        }
        updateStats();
        applyFilters();
        renderCurrentSessionCard();
    }

    function updateStats() {
        const totalEl = document.getElementById('totalCount');
        const activeEl = document.getElementById('activeCount');
        if (totalEl) totalEl.textContent = sessions.length;
        if (activeEl) activeEl.textContent = sessions.filter(s => s.status === 'active').length;
    }

    function applyFilters() {
        const statusEl = document.getElementById('statusFilter');
        const searchEl = document.getElementById('searchInput');
        const st = statusEl ? statusEl.value : 'all';
        const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
        let filtered = sessions;
        if (st !== 'all') filtered = filtered.filter(s => s.status === st);
        if (q) filtered = filtered.filter(s =>
            (s.session_number || '').includes(q) || (s.ip_address || '').includes(q) ||
            (s.browser_name || '').toLowerCase().includes(q) || (s.country || '').includes(q) ||
            (s.city || '').includes(q) || (s.district || '').includes(q));
        renderTable(filtered);
        const filterCountEl = document.getElementById('filterCount');
        if (filterCountEl) filterCountEl.textContent = `عرض ${filtered.length} جلسة`;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!tbody) return;
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>';
            renderCurrentSessionCard();
            return;
        }
        const fmt = formatDate;
        const lbl = getStatusLabel;
        tbody.innerHTML = list.map(s => {
            const devIcon = getDeviceIcon(s);
            const isCurrent = s.status === 'active' && s.is_current_session;
            return `
            <tr class="${isCurrent ? 'current-session-row' : ''}">
                <td>
                    <i class="fas ${devIcon}" style="margin-left:6px; color:var(--gray-500);"></i>
                    ${s.session_number || '-'}
                    ${isCurrent ? '<span class="badge-current">أنت هنا</span>' : ''}
                </td>
                <td>${fmt(s.login_at)}</td>
                <td><span class="status-badge status-${s.status}">${lbl(s.status)}</span></td>
                <td><button class="btn-action" onclick="window.showSessionDetail('${s.id}')"><i class="fas fa-eye"></i> عرض</button></td>
                <td>${s.status === 'active' ? `<button class="btn-action danger" onclick="window.terminateSession('${s.id}')"><i class="fas fa-sign-out-alt"></i> خروج</button>` : '-'}</td>
            </tr>`;
        }).join('');
        renderCurrentSessionCard();
    }

    window.terminateSession = async function(sessionId) {
        if (!confirm('إنهاء هذه الجلسة؟')) return;
        const sessionToTerminate = sessions.find(s => s.id === sessionId);
        const isCurrent = sessionToTerminate && sessionToTerminate.is_current_session;
        let result = { success: false };
        if (window.SessionManager?.terminateSession) result = await window.SessionManager.terminateSession(sessionId, currentUser.id);
        else {
            const { error } = await supabase.from('user_login_sessions').update({ status:'terminated_by_user', logout_at:new Date().toISOString() }).eq('id',sessionId).eq('user_id',currentUser.id);
            result.success = !error;
            if (error) alert(error.code === '42501' ? 'ليس لديك صلاحية.' : 'حدث خطأ.');
        }
        if (!result.success) { alert('تعذر إنهاء الجلسة.'); return; }
        if (isCurrent && window.Auth?.logout) { await window.Auth.logout(); return; }
        await fetchSessions();
    };

    window.terminateAllSessions = async function() {
        if (!confirm('هل أنت متأكد من إنهاء جميع الجلسات النشطة الأخرى؟')) return;
        if (window.SessionManager?.terminateAllSessions) {
            const result = await window.SessionManager.terminateAllSessions(currentUser.id);
            if (result.success) {
                if (window.UIHelpers?.showToast) {
                    window.UIHelpers.showToast(`تم إنهاء ${result.count} جلسة نشطة أخرى.`, 'info', 3000);
                } else {
                    alert(`تم إنهاء ${result.count} جلسة نشطة أخرى.`);
                }
                await fetchSessions();
            }
        } else {
            alert('الميزة غير متاحة حالياً.');
        }
    };

    async function handleIdleTimeout(reason) {
        const currentSession = sessions.find(s => s.is_current_session);
        if (currentSession) {
            if (window.SessionManager?.terminateSession) {
                await window.SessionManager.terminateSession(currentSession.id, currentUser.id);
            } else {
                await supabase.from('user_login_sessions').update({ status: 'timeout', logout_at: new Date().toISOString() }).eq('id',currentSession.id).eq('user_id',currentUser.id);
            }
        }
        if (window.Auth?.logout) await window.Auth.logout();
        else window.location.href = '/auth/auth/login/login.html?reason=timeout';
    }

    // ---------- نافذة التفاصيل (تقرير الشبكة الشامل) ----------
    window.showSessionDetail = async function(sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const detailContent = document.getElementById('detailContent');
        const modal = document.getElementById('detailModal');
        if (!detailContent || !modal) return;
        modal.classList.add('show');

        let extraLocation = null;
        const hasMissingTextData = !session.country || !session.city || !session.neighbourhood || !session.postal_code;
        if (session.latitude && session.longitude && hasMissingTextData) {
            if (window.LocationServices?.fetchLocationIQ) {
                detailContent.innerHTML = '<p style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل تفاصيل الموقع...</p>';
                try { extraLocation = await window.LocationServices.fetchLocationIQ(session.latitude, session.longitude); } catch (err) {}
            }
        }

        let conn = null;
        try {
            conn = (typeof session.connection_info === 'string') ? JSON.parse(session.connection_info) : session.connection_info;
        } catch (e) { conn = session.connection_info; }

        let extraDev = null;
        try {
            extraDev = (typeof session.extra_device_info === 'string') ? JSON.parse(session.extra_device_info) : session.extra_device_info;
        } catch (e) { extraDev = session.extra_device_info; }

        function addRow(rows, label, value) {
            if (value !== undefined && value !== null && value !== '' && value !== '—') {
                rows.push([label, value]);
            }
        }

        const groups = [];

        // 1. معلومات أساسية (دون تغيير)
        const basicRows = [];
        addRow(basicRows, 'رقم الجلسة', session.session_number);
        addRow(basicRows, 'وقت الدخول', formatDate(session.login_at));
        addRow(basicRows, 'آخر نشاط', session.last_activity_at ? formatDate(session.last_activity_at) : null);
        addRow(basicRows, 'الخروج', session.logout_at ? formatDate(session.logout_at) : (session.status === 'active' ? 'ما زالت نشطة' : '—'));
        addRow(basicRows, 'الحالة', getStatusLabel(session.status));
        addRow(basicRows, 'مزود الجلسة', session.location_provider);
        groups.push({ title: 'معلومات أساسية', icon: 'fa-info-circle', rows: basicRows });

        // 2. بيانات الجهاز والمتصفح (دون تغيير)
        const deviceRows = [];
        addRow(deviceRows, 'نوع الجهاز', session.device_type);
        addRow(deviceRows, 'نظام التشغيل', session.operating_system ? `${session.operating_system} ${session.os_version || ''} (${session.os_architecture || ''})` : null);
        addRow(deviceRows, 'المنصة', session.platform);
        addRow(deviceRows, 'المتصفح', session.browser_name ? `${session.browser_name} ${session.browser_version || ''} (${session.browser_engine || ''})` : null);
        addRow(deviceRows, 'وكيل المستخدم', session.user_agent);
        addRow(deviceRows, 'اللغة', session.language);
        addRow(deviceRows, 'دقة الشاشة', session.screen_resolution);
        addRow(deviceRows, 'نسبة البكسل', session.pixel_ratio);
        addRow(deviceRows, 'عمق اللون', session.color_depth);
        addRow(deviceRows, 'اللمس', session.touch_supported ? 'نعم' : 'لا');
        addRow(deviceRows, 'المعالج (نوى)', session.cpu_architecture || session.cpu_cores);
        addRow(deviceRows, 'ذاكرة الجهاز', session.device_memory);
        addRow(deviceRows, 'الكوكيز', session.cookies_enabled ? 'نعم' : 'لا');
        addRow(deviceRows, 'Local Storage', session.local_storage ? 'نعم' : 'لا');
        addRow(deviceRows, 'Session Storage', session.session_storage ? 'نعم' : 'لا');
        addRow(deviceRows, 'IndexedDB', session.indexed_db ? 'نعم' : 'لا');
        addRow(deviceRows, 'WebGL', session.webgl_supported ? 'نعم' : 'لا');
        addRow(deviceRows, 'البصمة', session.fingerprint);
        addRow(deviceRows, 'المنطقة الزمنية', session.timezone);
        groups.push({ title: 'بيانات الجهاز والمتصفح', icon: 'fa-laptop', rows: deviceRows });

        // 3. تقرير الشبكة والاتصال الشامل (جديد بالكامل)
        const netRows = [];
        // IP العام والمحلي
        addRow(netRows, 'IP العام', session.ip_address || conn?.ip?.public);
        addRow(netRows, 'IP المحلي', conn?.ip?.local);
        // مزود الخدمة و ASN
        addRow(netRows, 'مزود الخدمة', session.isp || conn?.ip?.isp);
        addRow(netRows, 'ASN', conn?.ip?.asn);
        // نوع الشبكة وسرعة الاتصال
        addRow(netRows, 'نوع الشبكة', session.network_type || conn?.network?.type);
        addRow(netRows, 'حالة الاتصال', session.network_online !== null ? (session.network_online ? 'متصل' : 'غير متصل') : (conn?.network?.online !== undefined ? (conn.network.online ? 'متصل' : 'غير متصل') : null));
        addRow(netRows, 'نوع الاتصال الفعّال', session.network_effective_type || conn?.network?.effectiveType);
        const downlink = session.network_downlink ?? conn?.network?.downlinkSpeed;
        addRow(netRows, 'سرعة التحميل (Mbps)', downlink !== null ? downlink : null);
        const rtt = session.network_rtt ?? conn?.network?.latency;
        addRow(netRows, 'تأخير (RTT ms)', rtt !== null ? rtt : null);
        addRow(netRows, 'توفير البيانات', session.network_save_data !== null ? (session.network_save_data ? 'نعم' : 'لا') : (conn?.network?.saveData !== undefined ? (conn.network.saveData ? 'نعم' : 'لا') : null));
        // إحداثيات IP (تقريبية من مزود الخدمة)
        if (conn?.ip?.lat && conn?.ip?.lon) {
            netRows.push(['إحداثيات IP (تقريبي)', `${conn.ip.lat}, ${conn.ip.lon}`]);
        }
        // مصدر البيانات
        const dataSources = conn?.security?.sources || [];
        addRow(netRows, 'مصدر البيانات', dataSources.length > 0 ? dataSources.join('، ') : null);
        groups.push({ title: 'الشبكة والاتصال', icon: 'fa-network-wired', rows: netRows });

        // 4. أمان الشبكة (دون تغيير)
        const secRows = [
            ['VPN', session.vpn_detected ? 'نعم' : 'لا'],
            ['Proxy', session.proxy_detected ? 'نعم' : 'لا'],
            ['Tor', session.tor_detected ? 'نعم' : 'لا'],
            ['استضافة/داتا سنتر', session.hosting_detected ? 'نعم' : 'لا'],
            ['مصادر الكشف', conn?.security?.sources?.join(', ') || '—']
        ];
        groups.push({ title: 'أمان الشبكة', icon: 'fa-shield-alt', rows: secRows });

        // ... (باقي الأقسام: ميزات المتصفح، البطارية، الموقع الجغرافي، تفاصيل LocationIQ، معلومات الاستعلام، Raw JSON) تبقى كما هي بدون تغيير ...
        // يجب عليك إضافتها هنا كما في النسخة الكاملة السابقة (v29). لقد اختصرتها لتجنب التكرار، لكن تأكد من وجودها في ملفك.

        // بناء HTML (نفس المنطق)
        let buttonsHTML = '';
        if (session.latitude && session.longitude) {
            buttonsHTML += `<button class="btn-action" onclick="window.open('https://maps.google.com/?q=${session.latitude},${session.longitude}', '_blank')"><i class="fas fa-map-marker-alt"></i> عرض على الخريطة</button>`;
            buttonsHTML += `<button class="btn-action" onclick="navigator.clipboard.writeText('${session.latitude}, ${session.longitude}')"><i class="fas fa-copy"></i> نسخ الإحداثيات</button>`;
        }
        if (session.locationiq_response) {
            const raw = JSON.stringify(session.locationiq_response);
            buttonsHTML += `<button class="btn-action" onclick="navigator.clipboard.writeText('${raw.replace(/'/g, "\\'")}')"><i class="fas fa-code"></i> نسخ JSON</button>`;
            buttonsHTML += `<button class="btn-action" onclick="window.downloadJSON('${session.session_number}', ${raw})"><i class="fas fa-download"></i> تحميل JSON</button>`;
        }

        let html = '';
        groups.forEach(group => {
            if (group.rows.length === 0) return;
            html += `<div class="detail-group">
                <div class="group-header" onclick="this.classList.toggle('collapsed'); this.nextElementSibling.classList.toggle('collapsed');">
                    <i class="fas ${group.icon}"></i>
                    <h4>${group.title}</h4>
                    <i class="fas fa-chevron-down" style="margin-right:auto;"></i>
                </div>
                <div class="group-content">`;
            group.rows.forEach(row => {
                html += `<div class="detail-row"><span class="detail-label">${row[0]}:</span><span class="detail-value">${row[1]}</span></div>`;
            });
            html += `</div></div>`;
        });

        if (buttonsHTML) html += `<div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap;">${buttonsHTML}</div>`;

        detailContent.innerHTML = html || '<p>لا توجد تفاصيل كافية لعرضها.</p>';
    };

    // ... باقي الدوال (downloadJSON, bindEvents, listenForSessionTermination, injectStyles, init) تبقى كما في v29 ...

})();
