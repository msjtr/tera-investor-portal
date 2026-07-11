/**
 * security-registered-devices.js – v9 (تقرير كامل مع موقع جغرافي)
 */
(function() {
    let supabase, currentUser, sessions = [];
    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000;
    const LOCATIONIQ_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';

    function formatDate(d) { return d ? new Date(d).toLocaleString('ar-SA') : '-'; }
    function getStatusLabel(s) {
        const l = { active:'نشطة', logged_out:'تم تسجيل الخروج', timeout:'انتهت بسبب عدم النشاط', terminated_by_system:'أنهيت بواسطة النظام', terminated_by_user:'أنهيت بواسطة المستخدم' };
        return l[s] || s;
    }

    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.replace('/auth/auth/login/login.html'); return; }
        currentUser = user;
        await updateHeader(user);
        await fetchSessions();
        bindEvents();
        initIdleTimer();
    }

    async function updateHeader(user) {
        const name = user.user_metadata?.full_name || user.email || 'مستخدم';
        document.getElementById('headerUserName').textContent = name;
        document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
    }

    async function fetchSessions() {
        const { data, error } = await supabase.from('user_login_sessions').select('*').eq('user_id', currentUser.id).order('login_at', { ascending: false });
        if (error) { console.error(error); return; }
        sessions = data || [];
        updateStats();
        applyFilters();
    }

    function updateStats() {
        document.getElementById('totalCount').textContent = sessions.length;
        document.getElementById('activeCount').textContent = sessions.filter(s=>s.status==='active').length;
    }

    function applyFilters() {
        const st = document.getElementById('statusFilter').value;
        const q = document.getElementById('searchInput').value.trim().toLowerCase();
        let filtered = sessions;
        if (st !== 'all') filtered = filtered.filter(s => s.status === st);
        if (q) filtered = filtered.filter(s => (s.session_number||'').includes(q) || (s.ip_address||'').includes(q) || (s.browser_name||'').toLowerCase().includes(q) || (s.country||'').includes(q) || (s.city||'').includes(q) || (s.district||'').includes(q));
        renderTable(filtered);
        document.getElementById('filterCount').textContent = `عرض ${filtered.length} جلسة`;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="5">لا توجد جلسات</td></tr>'; return; }
        tbody.innerHTML = list.map(s => `
            <tr>
                <td>${s.session_number||'-'}</td>
                <td>${formatDate(s.login_at)}</td>
                <td><span class="status-badge status-${s.status}">${getStatusLabel(s.status)}</span></td>
                <td><button class="btn-action" onclick="window.showSessionDetail('${s.id}')"><i class="fas fa-eye"></i> عرض</button></td>
                <td>${s.status==='active'?`<button class="btn-action danger" onclick="window.terminateSession('${s.id}')"><i class="fas fa-sign-out-alt"></i> خروج</button>`:'-'}</td>
            </tr>
        `).join('');
    }

    window.terminateSession = async function(sessionId) {
        if (!confirm('إنهاء هذه الجلسة؟')) return;
        await supabase.from('user_login_sessions').update({ status:'terminated_by_user', logout_at:new Date().toISOString() }).eq('id',sessionId).eq('user_id',currentUser.id);
        await fetchSessions();
    };

    // عرض التقرير الكامل
    window.showSessionDetail = async function(sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const detailContent = document.getElementById('detailContent');
        detailContent.innerHTML = '<p style="text-align:center">جاري التحميل...</p>';
        document.getElementById('detailModal').classList.add('show');

        let locationData = null;
        if (session.latitude && session.longitude) {
            locationData = await fetchLocationDetails(session.latitude, session.longitude);
        }

        const groups = [
            {
                title: 'هوية الجهاز', icon: 'fa-id-card',
                rows: [
                    ['الرقم التعريفي للجلسة', session.id],
                    ['نوع الجهاز', session.device_type || '—'],
                    ['نظام التشغيل', session.operating_system ? `${session.operating_system} ${session.os_version||''}` : '—'],
                    ['المنصة', session.platform || '—'],
                    ['المعالج (عدد النوى)', session.cpu_architecture || '—'],
                    ['الذاكرة (GB)', session.device_memory || '—']
                ]
            },
            {
                title: 'بيانات المتصفح', icon: 'fa-chrome',
                rows: [
                    ['المتصفح', session.browser_name ? `${session.browser_name} ${session.browser_version||''}` : '—'],
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
                rows: (locationData && locationData.country) ? [
                    ['الدولة', locationData.country],
                    ['الرمز الدولي', locationData.country_code],
                    ['المدينة', locationData.city],
                    ['المنطقة/المحافظة', locationData.province || locationData.state],
                    ['الحي', locationData.neighbourhood],
                    ['الرمز البريدي', locationData.postcode || session.postal_code],
                    ['الإحداثيات', `${session.latitude}, ${session.longitude}`],
                    ['الخريطة', `<a href="https://maps.google.com/?q=${session.latitude},${session.longitude}" target="_blank">🗺️ عرض</a>`]
                ] : (session.country ? [
                    ['الدولة', session.country],
                    ['المدينة', session.city],
                    ['المنطقة', session.province || session.state],
                    ['الإحداثيات', session.latitude && session.longitude ? `${session.latitude}, ${session.longitude}` : '—'],
                    ['الخريطة', session.latitude && session.longitude ? `<a href="https://maps.google.com/?q=${session.latitude},${session.longitude}" target="_blank">🗺️ عرض</a>` : '—']
                ] : [
                    ['الموقع', 'غير متوفر']
                ])
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

    async function fetchLocationDetails(lat, lon) {
        if (!lat || !lon) return null;
        const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&accept-language=ar`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('فشل');
            const data = await res.json();
            return {
                neighbourhood: data.neighbourhood || data.suburb || '',
                city: data.city || '',
                province: data.province || '',
                state: data.state || '',
                postcode: data.postcode || '',
                country: data.country || '',
                country_code: data.country_code || '',
                display_name: data.display_name || ''
            };
        } catch (e) { return null; }
    }

    function bindEvents() {
        document.getElementById('statusFilter').addEventListener('change', applyFilters);
        document.getElementById('searchInput').addEventListener('input', applyFilters);
        document.getElementById('closeDetailModal').addEventListener('click', ()=> document.getElementById('detailModal').classList.remove('show'));
        document.getElementById('closeDetailBtn').addEventListener('click', ()=> document.getElementById('detailModal').classList.remove('show'));
        ['click','mousemove','keydown','scroll','touchstart'].forEach(ev => document.addEventListener(ev, resetIdleTimer));
    }

    function initIdleTimer() { resetIdleTimer(); }
    function resetIdleTimer() {
        clearTimeout(idleTimer); clearTimeout(idleWarningTimer);
        const w = document.getElementById('idleWarning');
        if (w) w.style.display = 'none';
        idleWarningTimer = setTimeout(() => { if (w) w.style.display = 'flex'; }, IDLE_TIME - 30000);
        idleTimer = setTimeout(async () => {
            await supabase.from('user_login_sessions').update({ status:'timeout', logout_at:new Date().toISOString() }).eq('user_id',currentUser.id).eq('status','active');
            window.location.href = '/auth/auth/login/login.html?reason=timeout';
        }, IDLE_TIME);
    }

    init();
})();
