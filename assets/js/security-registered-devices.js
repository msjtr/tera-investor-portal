/**
 * security-registered-devices.js – v8 (مركز أمان متكامل + VPN/Proxy)
 */
(function() {
    let supabase, currentUser, sessions = [];
    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000;

    function formatDate(d) { return d ? new Date(d).toLocaleString('ar-SA') : '-'; }
    function getDuration(start, end) {
        if (!start) return '-';
        const e = end ? new Date(end) : new Date();
        const diff = Math.floor((e - new Date(start)) / 1000);
        if (diff < 0) return '-';
        const h = Math.floor(diff/3600), m = Math.floor((diff%3600)/60), s = diff%60;
        return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
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
        let name = user.user_metadata?.full_name || user.email || 'مستخدم';
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
        const last = sessions.reduce((a,b)=> b.login_at > a ? b.login_at : a, '');
        document.getElementById('lastLoginTime').textContent = last ? formatDate(last) : '-';
    }

    function applyFilters() {
        const st = document.getElementById('statusFilter').value;
        const dev = document.getElementById('deviceFilter').value;
        const q = document.getElementById('searchInput').value.trim().toLowerCase();
        let filtered = sessions;
        if (st !== 'all') filtered = filtered.filter(s => s.status === st);
        if (dev !== 'all') filtered = filtered.filter(s => s.device_type === dev);
        if (q) filtered = filtered.filter(s => (s.session_number||'').includes(q) || (s.ip_address||'').includes(q) || (s.isp||'').toLowerCase().includes(q) || (s.browser_name||'').toLowerCase().includes(q) || (s.country||'').includes(q) || (s.city||'').includes(q) || (s.district||'').includes(q));
        renderTable(filtered);
        document.getElementById('filterCount').textContent = `عرض ${filtered.length} جلسة`;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>'; return; }
        tbody.innerHTML = list.map(s => {
            let map = '';
            if (s.latitude && s.longitude) map = `<a href="https://maps.google.com/?q=${s.latitude
