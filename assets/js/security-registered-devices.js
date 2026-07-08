/**
 * security-registered-devices.js – v8 (مركز أمان متكامل + VPN/Proxy)
 * - عرض جميع الجلسات، إحصائيات، بحث، فلترة
 * - تفاصيل كاملة (جلسة، جهاز، شبكة، موقع، أمان) مع دعم VPN/Proxy
 * - رابط خرائط قوقل
 * - أزرار: تسجيل الخروج، إنهاء الجلسات الأخرى
 * - تمت إزالة تحديث الموقع (refreshLocation)
 */
(function() {
    let supabase, currentUser, sessions = [];
    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000; // 5 دقائق

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
    function getRiskLabel(l) {
        if (l==='high') return '🔴 مرتفع';
        if (l==='medium') return '🟡 متوسط';
        return '🟢 منخفض';
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
        const { data, error } = await supabase
            .from('user_login_sessions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('login_at', { ascending: false });
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
        if (q) {
            filtered = filtered.filter(s => (s.session_number||'').includes(q) || (s.ip_address||'').includes(q) || (s.isp||'').toLowerCase().includes(q) || (s.browser_name||'').toLowerCase().includes(q) || (s.country||'').includes(q) || (s.city||'').includes(q) || (s.district||'').includes(q));
        }
        renderTable(filtered);
        document.getElementById('filterCount').textContent = `عرض ${filtered.length} جلسة`;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(s => {
            let map = '';
            if (s.latitude && s.longitude) {
                map = `<a href="https://maps.google.com/?q=${s.latitude},${s.longitude}" target="_blank" title="فتح في خرائط قوقل"><i class="fas fa-map-marker-alt"></i></a>`;
            }
            // حالة VPN/Proxy
            const vpnDetected = s.proxy_detected || s.tor_detected || s.hosting_detected;
            const vpnStatus = vpnDetected
                ? '<span style="color:#dc2626;font-weight:700;">⚠️ VPN/Proxy</span>'
                : '<span style="color:#10b981;">آمن</span>';
            // الموقع: الدولة، المدينة، الحي
            const locationParts = [];
            if (s.country) locationParts.push(s.country);
            if (s.city) locationParts.push(s.city);
            if (s.district) locationParts.push(s.district);
            const locationStr = locationParts.length > 0 ? locationParts.join('، ') : '-';

            return `<tr>
                <td>${s.session_number||'-'}</td>
                <td>${formatDate(s.login_at)}</td>
                <td>${s.device_type||'-'}</td>
                <td>${s.browser_name||'-'}</td>
                <td>${s.ip_address||'-'}<br><small>${s.isp||''}</small></td>
                <td>${locationStr} ${map}</td>
                <td>${vpnStatus}</td>
                <td><span class="status-badge status-${s.status}">${getStatusLabel(s.status)}</span></td>
                <td>
                    <button class="btn-icon view-detail" data-id="${s.id}"><i class="fas fa-eye"></i></button>
                    ${s.status==='active'&&s.is_current_session?`<button class="btn-icon text-danger logout-curr"><i class="fas fa-sign-out-alt"></i></button>`:''}
                    ${s.status==='active'&&!s.is_current_session?`<button class="btn-icon text-danger terminate-sess" data-id="${s.id}"><i class="fas fa-times-circle"></i></button>`:''}
                </td>
            </tr>`;
        }).join('');
        // ربط الأحداث
        document.querySelectorAll('.view-detail').forEach(b => b.addEventListener('click', ()=>showDetail(b.dataset.id)));
        document.querySelectorAll('.terminate-sess').forEach(b => b.addEventListener('click', ()=>terminateSession(b.dataset.id)));
        const lc = document.querySelector('.logout-curr');
        if (lc) lc.addEventListener('click', logoutCurrent);
    }

    async function showDetail(id) {
        const s = sessions.find(x=>x.id===id); if(!s)return;
        let map='';
        if(s.latitude&&s.longitude) map=`<a href="https://maps.google.com/?q=${s.latitude},${s.longitude}" target="_blank" class="btn-primary" style="display:inline-block;margin-top:8px;">فتح في الخرائط</a>`;
        const html = `
            <div class="detail-section"><h4>معلومات الجلسة</h4>
                <div class="detail-item"><span class="label">رقم الجلسة</span><span class="value">${s.session_number||'-'}</span></div>
                <div class="detail-item"><span class="label">وقت الدخول</span><span class="value">${formatDate(s.login_at)}</span></div>
                <div class="detail-item"><span class="label">وقت الخروج</span><span class="value">${s.logout_at?formatDate(s.logout_at):'-'}</span></div>
                <div class="detail-item"><span class="label">مدة الجلسة</span><span class="value">${getDuration(s.login_at,s.logout_at)}</span></div>
                <div class="detail-item"><span class="label">الحالة</span><span class="value">${getStatusLabel(s.status)}</span></div>
            </div>
            <div class="detail-section"><h4>الجهاز</h4>
                <div class="detail-item"><span class="label">نوع الجهاز</span><span class="value">${s.device_type||'-'}</span></div>
                <div class="detail-item"><span class="label">نظام التشغيل</span><span class="value">${s.operating_system||'-'}</span></div>
                <div class="detail-item"><span class="label">المتصفح</span><span class="value">${s.browser_name||'-'} ${s.browser_version||''}</span></div>
                <div class="detail-item"><span class="label">دقة الشاشة</span><span class="value">${s.screen_resolution||'-'}</span></div>
            </div>
            <div class="detail-section"><h4>الشبكة والموقع</h4>
                <div class="detail-item"><span class="label">IP</span><span class="value">${s.ip_address||'-'}</span></div>
                <div class="detail-item"><span class="label">ISP</span><span class="value">${s.isp||'-'}</span></div>
                <div class="detail-item"><span class="label">VPN/Proxy</span><span class="value">${(s.proxy_detected||s.tor_detected||s.hosting_detected)?'⚠️ نعم':'لا'}</span></div>
                <div class="detail-item"><span class="label">الدولة</span><span class="value">${s.country||'-'}</span></div>
                <div class="detail-item"><span class="label">المدينة</span><span class="value">${s.city||'-'}</span></div>
                <div class="detail-item"><span class="label">الحي</span><span class="value">${s.district||'-'}</span></div>
                <div class="detail-item"><span class="label">الإحداثيات</span><span class="value">${s.latitude||'-'}, ${s.longitude||'-'} ${map}</span></div>
            </div>
        `;
        document.getElementById('detailContent').innerHTML = html;
        document.getElementById('detailModal').classList.add('show');
        document.getElementById('terminateSessionBtn').style.display = (s.status==='active'&&!s.is_current_session)?'inline-flex':'none';
        document.getElementById('terminateSessionBtn').onclick = ()=>terminateSession(s.id);
    }

    async function terminateSession(id) {
        if(!confirm('إنهاء هذه الجلسة؟'))return;
        await supabase.from('user_login_sessions').update({status:'terminated_by_user',logout_reason:'إنهاء بواسطة المستخدم',logout_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
        alert('تم إنهاء الجلسة');
        fetchSessions();
        document.getElementById('detailModal').classList.remove('show');
    }

    async function logoutAll() {
        if(!confirm('تسجيل الخروج من جميع الأجهزة الأخرى؟'))return;
        await supabase.from('user_login_sessions').update({status:'terminated_by_user',logout_reason:'إنهاء جماعي',logout_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('user_id',currentUser.id).eq('status','active').neq('is_current_session',true);
        alert('تم إنهاء الجلسات الأخرى');
        fetchSessions();
    }

    function logoutCurrent() {
        window.TeraAuth.logout();
    }

    function initIdleTimer() {
        function reset(){clearTimeout(idleTimer);clearInterval(idleWarningTimer);closeWarning();idleTimer=setTimeout(showWarning,IDLE_TIME);}
        function showWarning(){
            const m=document.createElement('div');m.id='idleWarningModal';m.className='modal-overlay show';
            m.innerHTML=`<div class="modal-box" style="max-width:400px;text-align:center;"><i class="fas fa-clock" style="font-size:48px;color:#f59e0b;"></i><h4>انتهت الجلسة بسبب عدم النشاط</h4><p>سيتم تسجيل الخروج خلال <strong id="cd">60</strong> ثانية</p><button class="btn-primary" id="extendBtn">تمديد</button><button class="btn-danger" id="logoutNowBtn">خروج الآن</button></div>`;
            document.body.appendChild(m);
            let c=60;idleWarningTimer=setInterval(()=>{c--;document.getElementById('cd').textContent=c;if(c<=0){clearInterval(idleWarningTimer);closeWarning();logoutCurrent();}},1000);
            document.getElementById('extendBtn').onclick=reset;
            document.getElementById('logoutNowBtn').onclick=()=>{clearInterval(idleWarningTimer);closeWarning();logoutCurrent();};
        }
        function closeWarning(){const m=document.getElementById('idleWarningModal');if(m)m.remove();}
        ['mousemove','keydown','click','scroll','touchstart'].forEach(e=>document.addEventListener(e,reset));
        reset();
    }

    function bindEvents(){
        document.getElementById('searchInput').addEventListener('input',applyFilters);
        document.getElementById('statusFilter').addEventListener('change',applyFilters);
        document.getElementById('deviceFilter').addEventListener('change',applyFilters);
        document.getElementById('closeDetailModal').addEventListener('click',()=>document.getElementById('detailModal').classList.remove('show'));
        document.getElementById('closeDetailBtn').addEventListener('click',()=>document.getElementById('detailModal').classList.remove('show'));
        document.getElementById('logoutAllSessionsBtn').addEventListener('click',logoutAll);
        // تم إزالة زر تحديث الموقع
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
