/**
 * security-registered-devices.js – v14 (تقرير موقع جغرافي مقسم + أيقونات محسنة + أزرار تفاعلية)
 * يعرض تفاصيل الجلسة مع ثلاثة أقسام للموقع: Lookup Information, Location Information, Raw JSON Response
 */
(function() {
    let supabase, currentUser, sessions = [];
    const IDLE_TIME = 5 * 60 * 1000;

    function formatDate(d) { return d ? new Date(d).toLocaleString('ar-SA') : '-'; }
    function getStatusLabel(s) {
        const l = { active:'نشطة', logged_out:'تم تسجيل الخروج', timeout:'انتهت بسبب عدم النشاط', terminated_by_system:'أنهيت بواسطة النظام', terminated_by_user:'أنهيت بواسطة المستخدم' };
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

    async function init() {
        if (!window.Auth) { window.location.replace('/auth/auth/login/login.html'); return; }
        const user = await window.Auth.requireAuth();
        if (!user) return;
        currentUser = user;
        supabase = window.teraSupabase || await window.waitForSupabase();
        updateHeader(user);
        await fetchSessions();
        bindEvents();
        if (window.ActivityTracker) {
            window.ActivityTracker.startIdleTimer(handleIdleTimeout, currentUser.id);
        } else {
            initLegacyIdleTimer();
        }
    }

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
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:50px;">تعذر تحميل الجلسات. حاول مجدداً لاحقاً.</td></tr>';
        }
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
        if (q) filtered = filtered.filter(s =>
            (s.session_number || '').includes(q) || (s.ip_address || '').includes(q) || (s.browser_name || '').toLowerCase().includes(q) ||
            (s.country || '').includes(q) || (s.city || '').includes(q) || (s.district || '').includes(q));
        renderTable(filtered);
        const filterCountEl = document.getElementById('filterCount');
        if (filterCountEl) filterCountEl.textContent = `عرض ${filtered.length} جلسة`;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!tbody) return;
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>'; return; }
        const fmt = window.UIHelpers?.formatDate || formatDate;
        const lbl = window.UIHelpers?.getStatusLabel || getStatusLabel;
        tbody.innerHTML = list.map(s => `
            <tr><td>${s.session_number || '-'}</td><td>${fmt(s.login_at)}</td><td><span class="status-badge status-${s.status}">${lbl(s.status)}</span></td>
            <td><button class="btn-action" onclick="window.showSessionDetail('${s.id}')"><i class="fas fa-eye"></i> عرض</button></td>
            <td>${s.status === 'active' ? `<button class="btn-action danger" onclick="window.terminateSession('${s.id}')"><i class="fas fa-sign-out-alt"></i> خروج</button>` : '-'}</td></tr>
        `).join('');
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

    // ──────────────────────────────────────────────
    // عرض تفاصيل الجلسة مع أقسام الموقع الجديدة
    // ──────────────────────────────────────────────
    window.showSessionDetail = async function(sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const detailContent = document.getElementById('detailContent');
        const modal = document.getElementById('detailModal');
        if (!detailContent || !modal) return;
        modal.classList.add('show');

        // محاولة جلب بيانات إضافية من LocationIQ إذا كانت ناقصة
        let extraLocation = null;
        const hasMissingTextData = !session.country || !session.city || !session.neighbourhood || !session.postal_code;
        if (session.latitude && session.longitude && hasMissingTextData) {
            if (window.LocationServices?.fetchLocationIQ) {
                detailContent.innerHTML = '<p style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل تفاصيل الموقع...</p>';
                try { extraLocation = await window.LocationServices.fetchLocationIQ(session.latitude, session.longitude); } catch (err) {}
            }
        }

        // ── دوال مساعدة ──
        function getLocationRows() {
            const rows = [];
            const country = session.country || extraLocation?.country;
            const country_code = session.country_code || extraLocation?.country_code;
            const city = session.city || extraLocation?.city;
            const neighbourhood = session.neighbourhood || session.district || extraLocation?.neighbourhood;
            const province = session.province || extraLocation?.province;
            const state = session.state || extraLocation?.state;
            const postal_code = session.postal_code || extraLocation?.postcode;
            const display_name = session.display_name || extraLocation?.display_name;

            if (country) rows.push(['الدولة', country]);
            if (country_code) rows.push(['الرمز الدولي', country_code]);
            if (city) rows.push(['المدينة', city]);
            if (neighbourhood) rows.push(['الحي', neighbourhood]);
            if (province || state) rows.push(['المنطقة/المحافظة', province || state]);
            if (postal_code) rows.push(['الرمز البريدي', postal_code]);
            if (session.latitude && session.longitude) {
                rows.push(['الإحداثيات', `${session.latitude}, ${session.longitude}`]);
                rows.push(['الخريطة', `<a href="https://maps.google.com/?q=${session.latitude},${session.longitude}" target="_blank" rel="noopener"><i class="fas fa-map-pin"></i> عرض على الخريطة</a>`]);
            }
            if (rows.length === 0 && display_name) {
                rows.push(['العنوان الكامل', display_name]);
            } else if (rows.length === 0) {
                rows.push(['الموقع', 'غير متوفر']);
            }
            return rows;
        }

        // بناء قسم Lookup Information (إن وجدت بيانات)
        function getLookupRows() {
            const rows = [];
            if (session.location_provider) rows.push(['مزود الخدمة', session.location_provider]);
            if (session.api_endpoint) rows.push(['API Endpoint', session.api_endpoint]);
            if (session.http_status) rows.push(['HTTP Status', session.http_status]);
            if (session.lookup_status !== undefined && session.lookup_status !== null) rows.push(['Lookup Status', session.lookup_status === 1 ? 'نجاح' : 'فشل']);
            if (session.request_started_at) rows.push(['وقت بدء الطلب', formatDate(session.request_started_at)]);
            if (session.response_received_at) rows.push(['وقت استلام الرد', formatDate(session.response_received_at)]);
            if (session.execution_time_ms) rows.push(['زمن التنفيذ', `${session.execution_time_ms} ms`]);
            if (session.gps_source) rows.push(['مصدر GPS', session.gps_source]);
            if (session.gps_accuracy) rows.push(['دقة GPS', `${session.gps_accuracy} متر`]);
            return rows;
        }

        // بناء قسم Location Information المتقدم (من LocationIQ)
        function getAdvancedLocationRows() {
            const rows = [];
            if (session.place_id) rows.push(['Place ID', session.place_id]);
            if (session.licence) rows.push(['Licence', session.licence]);
            if (session.osm_type) rows.push(['OSM Type', session.osm_type]);
            if (session.osm_id) rows.push(['OSM ID', session.osm_id]);
            if (session.display_name) rows.push(['Display Name', session.display_name]);
            if (session.name) rows.push(['Name', session.name]);
            if (session.postal_address) rows.push(['Postal Address', session.postal_address]);
            if (session.class) rows.push(['Class', session.class]);
            if (session.type) rows.push(['Type', session.type]);
            if (session.match_code) rows.push(['Match Code', session.match_code]);
            if (session.match_type) rows.push(['Match Type', session.match_type]);
            if (session.match_level) rows.push(['Match Level', session.match_level]);
            if (session.house_number) rows.push(['House Number', session.house_number]);
            if (session.road) rows.push(['Road', session.road]);
            if (session.neighbourhood) rows.push(['Neighbourhood', session.neighbourhood]);
            if (session.suburb) rows.push(['Suburb', session.suburb]);
            if (session.quarter) rows.push(['Quarter', session.quarter]);
            if (session.district) rows.push(['District', session.district]);
            if (session.city) rows.push(['City', session.city]);
            if (session.town) rows.push(['Town', session.town]);
            if (session.village) rows.push(['Village', session.village]);
            if (session.municipality) rows.push(['Municipality', session.municipality]);
            if (session.county) rows.push(['County', session.county]);
            if (session.state_district) rows.push(['State District', session.state_district]);
            if (session.state) rows.push(['State', session.state]);
            if (session.state_code) rows.push(['State Code', session.state_code]);
            if (session.postcode) rows.push(['Postcode', session.postcode]);
            if (session.country) rows.push(['Country', session.country]);
            if (session.country_code) rows.push(['Country Code', session.country_code]);
            return rows;
        }

        // بناء أزرار التحكم
        function getLocationButtons() {
            const lat = session.latitude;
            const lon = session.longitude;
            const raw = session.locationiq_response;
            let btns = '';
            if (lat && lon) {
                btns += `<button class="btn-action" onclick="window.open('https://maps.google.com/?q=${lat},${lon}', '_blank')"><i class="fas fa-map-marker-alt"></i> عرض على الخريطة</button>`;
                btns += `<button class="btn-action" onclick="navigator.clipboard.writeText('${lat}, ${lon}')"><i class="fas fa-copy"></i> نسخ الإحداثيات</button>`;
            }
            if (raw) {
                btns += `<button class="btn-action" onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(raw)}, null, 2))"><i class="fas fa-code"></i> نسخ JSON</button>`;
                btns += `<button class="btn-action" onclick="downloadJSON('${session.session_number || 'response'}', ${JSON.stringify(raw)})"><i class="fas fa-download"></i> تحميل JSON</button>`;
            }
            return btns;
        }

        // ── تجميع المجموعات ──
        const groups = [
            {
                title: 'هوية الجهاز', icon: 'fa-id-card',
                rows: [
                    ['الرقم التعريفي للجلسة', session.id],
                    ['نوع الجهاز', session.device_type || '—'],
                    ['نظام التشغيل', session.operating_system ? `${session.operating_system} ${session.os_version || ''}` : '—'],
                    ['المنصة', session.platform || '—'],
                    ['المعالج (عدد النوى)', session.cpu_architecture || session.cpu_cores || '—'],
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
                title: 'الموقع الجغرافي (LocationIQ)', icon: 'fa-globe',
                rows: getLocationRows()
            }
        ];

        // إضافة قسم Lookup Information إذا وُجدت بيانات
        const lookupRows = getLookupRows();
        if (lookupRows.length > 0) {
            groups.push({
                title: 'معلومات عملية الاستعلام (Lookup)', icon: 'fa-search-location',
                rows: lookupRows
            });
        }

        // إضافة قسم Location Information (متقدم) إذا وُجدت بيانات
        const advRows = getAdvancedLocationRows();
        if (advRows.length > 0) {
            groups.push({
                title: 'تفاصيل الموقع (Location Details)', icon: 'fa-info-circle',
                rows: advRows
            });
        }

        // قسم Raw JSON (إن وُجد)
        if (session.locationiq_response) {
            groups.push({
                title: 'Raw JSON Response', icon: 'fa-code',
                rows: [[ 'الاستجابة الأصلية', `<pre style="max-height:200px;overflow:auto;background:#1e293b;color:#e2e8f0;padding:8px;border-radius:6px;font-size:12px;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(session.locationiq_response, null, 2)}</pre>` ]]
            });
        }

        groups.push({
            title: 'معلومات الجلسة', icon: 'fa-clock',
            rows: [
                ['رقم الجلسة', session.session_number],
                ['وقت الدخول', (window.UIHelpers?.formatDate || formatDate)(session.login_at)],
                ['وقت الخروج', session.logout_at ? (window.UIHelpers?.formatDate || formatDate)(session.logout_at) : 'مازالت نشطة']
            ]
        });

        // ── توليد HTML ──
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

        // أزرار التحكم
        const buttons = getLocationButtons();
        if (buttons) {
            html += `<div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap;">${buttons}</div>`;
        }

        detailContent.innerHTML = html || '<p>لا توجد تفاصيل</p>';
    };

    // دالة مساعدة لتحميل JSON (توضع عامة)
    window.downloadJSON = function(filename, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_location.json`;
        a.click();
        URL.revokeObjectURL(url);
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
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
    }

    let idleTimer, idleWarningTimer;
    function initLegacyIdleTimer() {
        resetLegacyTimer();
        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, resetLegacyTimer));
    }
    function resetLegacyTimer() {
        clearTimeout(idleTimer); clearTimeout(idleWarningTimer);
        const w = document.getElementById('idleWarning');
        if (w) w.style.display = 'none';
        idleWarningTimer = setTimeout(() => { if (w) w.style.display = 'flex'; }, IDLE_TIME - 30000);
        idleTimer = setTimeout(handleIdleTimeout, IDLE_TIME);
    }
    async function handleIdleTimeout() {
        const currentSession = sessions.find(s => s.is_current_session);
        if (currentSession && window.SessionManager?.terminateSession) await window.SessionManager.terminateSession(currentSession.id, currentUser.id);
        else if (currentSession) await supabase.from('user_login_sessions').update({ status:'timeout', logout_at:new Date().toISOString() }).eq('id',currentSession.id).eq('user_id',currentUser.id);
        if (window.Auth?.logout) await window.Auth.logout();
        else window.location.href = '/auth/auth/login/login.html?reason=timeout';
    }

    init();
})();
