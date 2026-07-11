/**
 * security-registered-devices.js – v11 (محسن)
 * - يستخدم Auth.requireAuth لتوحيد فحص الجلسة
 * - معالجة أخطاء fetchSessions
 * - التحقق من وجود عناصر DOM قبل ربط الأحداث
 * - إنهاء جلسة Supabase إذا تم إنهاء الجلسة الحالية
 * - تحسين عرض الموقع الجغرافي (هروب آمن للروابط)
 */
(function() {
    let supabase, currentUser, sessions = [];
    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000;

    function formatDate(d) { return d ? new Date(d).toLocaleString('ar-SA') : '-'; }
    function getStatusLabel(s) {
        const l = { active:'نشطة', logged_out:'تم تسجيل الخروج', timeout:'انتهت بسبب عدم النشاط', terminated_by_system:'أنهيت بواسطة النظام', terminated_by_user:'أنهيت بواسطة المستخدم' };
        return l[s] || s;
    }

    async function init() {
        if (!window.Auth) {
            window.location.replace('/auth/auth/login/login.html');
            return;
        }
        const user = await window.Auth.requireAuth();
        if (!user) return;

        currentUser = user;
        supabase = window.teraSupabase || await window.waitForSupabase();

        await updateHeader(user);
        await fetchSessions();
        bindEvents();
        initIdleTimer();
    }

    async function updateHeader(user) {
        const name = user.user_metadata?.full_name || user.email || 'مستخدم';
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (nameEl) nameEl.textContent = name;
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    }

    async function fetchSessions() {
        const { data, error } = await supabase
            .from('user_login_sessions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('login_at', { ascending: false });

        if (error) {
            console.error('فشل جلب الجلسات:', error);
            const tbody = document.getElementById('sessionsTableBody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:50px;">تعذر تحميل الجلسات. حاول مجدداً لاحقاً.</td></tr>';
            return;
        }

        sessions = data || [];
        updateStats();
        applyFilters();
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
        if (q) {
            filtered = filtered.filter(s =>
                (s.session_number || '').includes(q) ||
                (s.ip_address || '').includes(q) ||
                (s.browser_name || '').toLowerCase().includes(q) ||
                (s.country || '').includes(q) ||
                (s.city || '').includes(q) ||
                (s.district || '').includes(q)
            );
        }
        renderTable(filtered);

        const filterCountEl = document.getElementById('filterCount');
        if (filterCountEl) filterCountEl.textContent = `عرض ${filtered.length} جلسة`;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!tbody) return;
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(s => `
            <tr>
                <td>${s.session_number || '-'}</td>
                <td>${formatDate(s.login_at)}</td>
                <td><span class="status-badge status-${s.status}">${getStatusLabel(s.status)}</span></td>
                <td><button class="btn-action" onclick="window.showSessionDetail('${s.id}')"><i class="fas fa-eye"></i> عرض</button></td>
                <td>${s.status === 'active' ? `<button class="btn-action danger" onclick="window.terminateSession('${s.id}')"><i class="fas fa-sign-out-alt"></i> خروج</button>` : '-'}</td>
            </tr>
        `).join('');
    }

    window.terminateSession = async function(sessionId) {
        if (!confirm('إنهاء هذه الجلسة؟')) return;

        const sessionToTerminate = sessions.find(s => s.id === sessionId);
        const isCurrent = sessionToTerminate && sessionToTerminate.is_current_session;

        const { error } = await supabase
            .from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('فشل إنهاء الجلسة:', error);
            alert('حدث خطأ أثناء إنهاء الجلسة.');
            return;
        }

        if (isCurrent && window.Auth?.logout) {
            await window.Auth.logout();
            return;
        }

        await fetchSessions();
    };

    window.showSessionDetail = function(sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const detailContent = document.getElementById('detailContent');
        const modal = document.getElementById('detailModal');
        if (!detailContent || !modal) return;
        modal.classList.add('show');

        function getLocationRows() {
            const rows = [];
            if (session.country) rows.push(['الدولة', session.country]);
            if (session.country_code) rows.push(['الرمز الدولي', session.country_code]);
            if (session.city) rows.push(['المدينة', session.city]);
            if (session.district || session.neighbourhood) rows.push(['الحي', session.neighbourhood || session.district]);
            if (session.province || session.state) rows.push(['المنطقة/المحافظة', session.province || session.state]);
            if (session.postal_code) rows.push(['الرمز البريدي', session.postal_code]);
            if (session.latitude && session.longitude) {
                rows.push(['الإحداثيات', `${session.latitude}, ${session.longitude}`]);
                const lat = encodeURIComponent(session.latitude);
                const lon = encodeURIComponent(session.longitude);
                rows.push(['الخريطة', `<a href="https://maps.google.com/?q=${lat},${lon}" target="_blank" rel="noopener">🗺️ عرض</a>`]);
            }
            if (rows.length === 0) rows.push(['الموقع', 'غير متوفر']);
            return rows;
        }

        const groups = [
            {
                title: 'هوية الجهاز', icon: 'fa-id-card',
                rows: [
                    ['الرقم التعريفي للجلسة', session.id],
                    ['نوع الجهاز', session.device_type || '—'],
                    ['نظام التشغيل', session.operating_system ? `${session.operating_system} ${session.os_version || ''}` : '—'],
                    ['المنصة', session.platform || '—'],
                    ['المعالج (عدد النوى)', session.cpu_architecture || '—'],
                    ['الذاكرة (GB)', session.device_memory || '—']
                ]
            },
            {
                title: 'بيانات المتصفح', icon: 'fa-chrome',
                rows: [
                    ['المتصفح', session.browser_name ? `${session.browser_name} ${session.browser_version || ''}` : '—'],
                    ['المحرك', session.browser_engine || '—'],
                    ['وكيل المستخدم', session.user_agent || '—'],
                    ['اللغة', session.language || '—'],
                    ['المنطقة الزمنية', session.timezone || '—']
                ]
            },
            {
                title: 'الشاشة والإمكانيات', icon: 'fa-desktop',
                rows: [
                    ['دقة الشاشة', session.screen_resolution || '—'],
                    ['نسبة البكسل', session.pixel_ratio || '—'],
                    ['اللمس', session.touch_supported ? 'نعم' : 'لا'],
                    ['الكوكيز', session.cookies_enabled ? 'نعم' : 'لا'],
                    ['تخزين محلي', session.local_storage ? 'نعم' : 'لا'],
                    ['تخزين الجلسة', session.session_storage ? 'نعم' : 'لا'],
                    ['IndexedDB', session.indexed_db ? 'نعم' : 'لا'],
                    ['WebGL', session.webgl_supported ? 'نعم' : 'لا']
                ]
            },
            {
                title: 'بيانات الشبكة', icon: 'fa-network-wired',
                rows: [
                    ['IP العام', session.ip_address || '—'],
                    ['مزود الخدمة', session.isp || '—'],
                    ['نوع الشبكة', session.network_type || '—'],
                    ['VPN', session.vpn_detected ? 'نعم' : 'لا'],
                    ['Proxy', session.proxy_detected ? 'نعم' : 'لا'],
                    ['Tor', session.tor_detected ? 'نعم' : 'لا'],
                    ['استضافة/داتا سنتر', session.hosting_detected ? 'نعم' : 'لا']
                ]
            },
            {
                title: 'الموقع الجغرافي', icon: 'fa-map-marker-alt',
                rows: getLocationRows()
            },
            {
                title: 'معلومات الجلسة', icon: 'fa-clock',
                rows: [
                    ['رقم الجلسة', session.session_number],
                    ['وقت الدخول', formatDate(session.login_at)],
                    ['وقت الخروج', session.logout_at ? formatDate(session.logout_at) : 'مازالت نشطة']
                ]
            }
        ];

        let html = '';
        groups.forEach(group => {
            const hasData = group.rows.some(row => row[1] && row[1] !== '—');
            if (!hasData) return;
            html += `<div class="detail-group"><h4><i class="fas ${group.icon}"></i> ${group.title}</h4>`;
            group.rows.forEach(row => {
                html += `<div class="detail-row"><span class="detail-label">${row[0]}:</span><span class="detail-value">${row[1]}</span></div>`;
            });
            html += `</div>`;
        });

        detailContent.innerHTML = html || '<p>لا توجد تفاصيل</p>';
    };

    function bindEvents() {
        const statusEl = document.getElementById('statusFilter');
        const searchEl = document.getElementById('searchInput');
        const closeModalBtn = document.getElementById('closeDetailModal');
        const closeDetailBtn = document.getElementById('closeDetailBtn');
        const modal = document.getElementById('detailModal');

        if (statusEl) statusEl.addEventListener('change', applyFilters);
        if (searchEl) searchEl.addEventListener('input', applyFilters);
        if (closeModalBtn && modal) closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));
        if (closeDetailBtn && modal) closeDetailBtn.addEventListener('click', () => modal.classList.remove('show'));
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('show');
            });
        }

        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
            document.addEventListener(ev, resetIdleTimer);
        });
    }

    function initIdleTimer() { resetIdleTimer(); }

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
        const w = document.getElementById('idleWarning');
        if (w) w.style.display = 'none';

        idleWarningTimer = setTimeout(() => {
            if (w) w.style.display = 'flex';
        }, IDLE_TIME - 30000);

        idleTimer = setTimeout(async () => {
            await supabase.from('user_login_sessions')
                .update({ status: 'timeout', logout_at: new Date().toISOString() })
                .eq('user_id', currentUser.id)
                .eq('status', 'active');

            if (window.Auth?.logout) {
                await window.Auth.logout();
            } else {
                window.location.href = '/auth/auth/login/login.html?reason=timeout';
            }
        }, IDLE_TIME);
    }

    init();
})();
