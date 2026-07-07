/**
 * security-registered-devices.js – v6 (مركز أمان متكامل)
 * - جلسات مع تقييم مخاطر، VPN، موقع إجباري
 * - مراقبة مستمرة للموقع
 * - أجهزة موثوقة
 * - إجراءات جماعية
 */
(function() {
    let supabase, currentUser, sessions = [], trustedDevices = [];
    let idleTimer, idleWarningTimer;
    let locationWatchId = null;
    const IDLE_TIME = 5 * 60 * 1000;

    function formatDate(d) { return d ? new Date(d).toLocaleString('ar-SA') : '-'; }
    function getStatusLabel(s) {
        const labels = { active: 'نشطة', logged_out: 'تم تسجيل الخروج', timeout: 'انتهت بسبب عدم النشاط', terminated_by_system: 'أنهيت بواسطة النظام', terminated_by_user: 'أنهيت بواسطة المستخدم' };
        return labels[s] || s;
    }
    function getStatusClass(s) {
        if (s === 'active') return 'status-active';
        if (s === 'logged_out') return 'status-logged_out';
        if (s === 'timeout') return 'status-timeout';
        return 'status-terminated';
    }
    function getDuration(start, end) {
        if (!start) return '-';
        const endTime = end ? new Date(end) : new Date();
        const diff = Math.floor((endTime - new Date(start)) / 1000);
        if (diff < 0) return '-';
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    function getRiskLabel(level) {
        if (level === 'high') return '🔴 مرتفع';
        if (level === 'medium') return '🟡 متوسط';
        return '🟢 منخفض';
    }
    function getRiskClass(level) {
        if (level === 'high') return 'risk-high';
        if (level === 'medium') return 'risk-medium';
        return 'risk-low';
    }

    async function init() {
        try {
            supabase = window.teraSupabase || await waitForSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { window.location.replace('/auth/auth/login/login.html'); return; }
            currentUser = user;
            await updateHeader(user);
            await fetchSessions();
            await fetchTrustedDevices();
            bindEvents();
            initIdleTimer();
            startContinuousLocationWatch();
            checkVPNAndAlerts();
        } catch (e) { console.error(e); }
    }

    async function updateHeader(user) {
        let name = user.user_metadata?.full_name || user.user_metadata?.name || 'مستخدم';
        if (name === 'مستخدم') {
            try {
                const { data } = await supabase.from('auth_register').select('full_name').eq('user_id', user.id).maybeSingle();
                if (data?.full_name) name = data.full_name;
            } catch (e) {}
        }
        const hName = document.getElementById('headerUserName');
        const hAvatar = document.getElementById('headerAvatar');
        if (hName) hName.textContent = name;
        if (hAvatar) hAvatar.textContent = name.charAt(0).toUpperCase();
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

    async function fetchTrustedDevices() {
        const { data } = await supabase
            .from('auth_devices')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_trusted', true);
        trustedDevices = data || [];
        document.getElementById('trustedDevicesCount').textContent = trustedDevices.length;
    }

    function updateStats() {
        document.getElementById('totalCount').textContent = sessions.length;
        const activeSessions = sessions.filter(s => s.status === 'active');
        document.getElementById('activeCount').textContent = activeSessions.length;
        const lastLogin = sessions.reduce((latest, s) => s.login_at && new Date(s.login_at) > new Date(latest) ? s.login_at : latest, null);
        document.getElementById('lastLoginTime').textContent = lastLogin ? formatDate(lastLogin) : '-';
    }

    function applyFilters() {
        const status = document.getElementById('statusFilter').value;
        const device = document.getElementById('deviceFilter').value;
        const search = document.getElementById('searchInput').value.trim().toLowerCase();

        let filtered = sessions;
        if (status !== 'all') filtered = filtered.filter(s => s.status === status);
        if (device !== 'all') filtered = filtered.filter(s => s.device_type === device);
        if (search) {
            filtered = filtered.filter(s => {
                return (s.session_number && s.session_number.toLowerCase().includes(search)) ||
                       (s.ip_address && s.ip_address.includes(search)) ||
                       (s.device_name && s.device_name.toLowerCase().includes(search)) ||
                       (s.browser_name && s.browser_name.toLowerCase().includes(search)) ||
                       (s.country && s.country.toLowerCase().includes(search)) ||
                       (s.city && s.city.toLowerCase().includes(search));
            });
        }
        renderTable(filtered);
        document.getElementById('filterCount').textContent = `عرض ${filtered.length} جلسة`;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:50px; color:var(--gray-500);">
                <i class="fas fa-inbox" style="font-size:48px; margin-bottom:12px; color:var(--gray-300); display:block;"></i>
                <p style="margin:0; font-weight:700;">لا توجد عمليات تسجيل دخول مسجلة بعد.</p>
            </td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(s => `
            <tr>
                <td>${s.session_number || '-'}</td>
                <td>${formatDate(s.login_at)}</td>
                <td>${s.device_type || '-'}</td>
                <td>${s.browser_name || '-'}</td>
                <td>${s.city ? s.city + (s.country ? ', ' + s.country : '') : s.country || '-'}</td>
                <td>${s.ip_address || '-'}</td>
                <td><span class="risk-badge ${getRiskClass(s.risk_level)}">${getRiskLabel(s.risk_level)}</span></td>
                <td><span class="status-badge ${getStatusClass(s.status)}">${getStatusLabel(s.status)}</span></td>
                <td>
                    <button class="btn-icon view-detail" data-id="${s.id}"><i class="fas fa-eye"></i></button>
                    ${s.status === 'active' && s.is_current_session ? `<button class="btn-icon text-danger" id="logoutCurrentBtn" data-id="${s.id}" title="تسجيل الخروج"><i class="fas fa-sign-out-alt"></i></button>` : ''}
                    ${s.status === 'active' && !s.is_current_session ? `<button class="btn-icon text-danger terminate-session" data-id="${s.id}" title="إنهاء هذه الجلسة"><i class="fas fa-times-circle"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
        bindRowEvents();
    }

    function bindRowEvents() {
        document.querySelectorAll('.view-detail').forEach(btn => btn.addEventListener('click', () => showDetail(btn.dataset.id)));
        document.querySelectorAll('.terminate-session').forEach(btn => btn.addEventListener('click', () => terminateSession(btn.dataset.id)));
        const logoutBtn = document.getElementById('logoutCurrentBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => logoutCurrentSession());
    }

    async function showDetail(id) {
        const session = sessions.find(s => s.id === id);
        if (!session) return;
        const html = `
            <div class="detail-section"><h4>معلومات الجلسة</h4>
                <div class="detail-item"><span class="label">رقم الجلسة</span><span class="value">${session.session_number || '-'}</span></div>
                <div class="detail-item"><span class="label">وقت الدخول</span><span class="value">${formatDate(session.login_at)}</span></div>
                <div class="detail-item"><span class="label">وقت الخروج</span><span class="value">${session.logout_at ? formatDate(session.logout_at) : '-'}</span></div>
                <div class="detail-item"><span class="label">مدة الجلسة</span><span class="value">${getDuration(session.login_at, session.logout_at)}</span></div>
                <div class="detail-item"><span class="label">طريقة الدخول</span><span class="value">${session.login_method || 'كلمة مرور'}</span></div>
                <div class="detail-item"><span class="label">سبب الخروج</span><span class="value">${session.logout_reason || '-'}</span></div>
                <div class="detail-item"><span class="label">الحالة</span><span class="value"><span class="status-badge ${getStatusClass(session.status)}">${getStatusLabel(session.status)}</span></span></div>
            </div>
            <div class="detail-section"><h4>معلومات الجهاز</h4>
                <div class="detail-item"><span class="label">نوع الجهاز</span><span class="value">${session.device_type || '-'}</span></div>
                <div class="detail-item"><span class="label">اسم الجهاز</span><span class="value">${session.device_name || '-'}</span></div>
                <div class="detail-item"><span class="label">نظام التشغيل</span><span class="value">${session.operating_system || '-'}</span></div>
                <div class="detail-item"><span class="label">المتصفح</span><span class="value">${session.browser_name || '-'} ${session.browser_version || ''}</span></div>
                <div class="detail-item"><span class="label">دقة الشاشة</span><span class="value">${session.screen_resolution || '-'}</span></div>
                <div class="detail-item"><span class="label">لغة الجهاز</span><span class="value">${session.language || '-'}</span></div>
                <div class="detail-item"><span class="label">بصمة الجهاز</span><span class="value">${session.fingerprint || '-'}</span></div>
            </div>
            <div class="detail-section"><h4>معلومات الشبكة</h4>
                <div class="detail-item"><span class="label">عنوان IP</span><span class="value">${session.ip_address || '-'}</span></div>
                <div class="detail-item"><span class="label">مزود الخدمة</span><span class="value">${session.isp || '-'}</span></div>
                <div class="detail-item"><span class="label">VPN</span><span class="value">${session.vpn_detected ? '✅ نعم' : '❌ لا'}</span></div>
                <div class="detail-item"><span class="label">Proxy</span><span class="value">${session.proxy_detected ? '✅ نعم' : '❌ لا'}</span></div>
                <div class="detail-item"><span class="label">Tor</span><span class="value">${session.tor_detected ? '✅ نعم' : '❌ لا'}</span></div>
            </div>
            <div class="detail-section"><h4>معلومات الموقع</h4>
                <div class="detail-item"><span class="label">الدولة</span><span class="value">${session.country || '-'} ${session.country_flag || ''}</span></div>
                <div class="detail-item"><span class="label">المدينة</span><span class="value">${session.city || '-'}</span></div>
                <div class="detail-item"><span class="label">المنطقة الزمنية</span><span class="value">${session.timezone || '-'}</span></div>
                <div class="detail-item"><span class="label">خط العرض</span><span class="value">${session.latitude || '-'}</span></div>
                <div class="detail-item"><span class="label">خط الطول</span><span class="value">${session.longitude || '-'}</span></div>
            </div>
            <div class="detail-section"><h4>معلومات الأمان</h4>
                <div class="detail-item"><span class="label">الجلسة الحالية</span><span class="value">${session.is_current_session ? '✅ نعم' : '❌ لا'}</span></div>
                <div class="detail-item"><span class="label">مستوى الخطورة</span><span class="value"><span class="risk-badge ${getRiskClass(session.risk_level)}">${getRiskLabel(session.risk_level)}</span></span></div>
                <div class="detail-item"><span class="label">يحتاج مراجعة</span><span class="value">${session.requires_security_review ? '✅ نعم' : '❌ لا'}</span></div>
                <div class="detail-item"><span class="label">ملاحظات</span><span class="value">${session.security_notes || '-'}</span></div>
            </div>
        `;
        document.getElementById('detailContent').innerHTML = html;
        const terminateBtn = document.getElementById('terminateSessionBtn');
        if (session.status === 'active' && !session.is_current_session) {
            terminateBtn.style.display = 'inline-flex';
            terminateBtn.onclick = () => terminateSession(session.id);
        } else {
            terminateBtn.style.display = 'none';
        }
        document.getElementById('detailModal').classList.add('show');
    }

    async function terminateSession(id) {
        if (!confirm('هل أنت متأكد من إنهاء هذه الجلسة؟')) return;
        const { error } = await supabase
            .from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_reason: 'إنهاء بواسطة المستخدم', logout_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', id);
        if (!error) { alert('تم إنهاء الجلسة بنجاح'); fetchSessions(); document.getElementById('detailModal').classList.remove('show'); }
        else alert('فشل إنهاء الجلسة');
    }

    async function logoutAllOtherSessions() {
        if (!confirm('سيتم إنهاء جميع الجلسات الأخرى وتسجيل خروجك من الأجهزة الأخرى. هل تريد المتابعة؟')) return;
        await supabase
            .from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_reason: 'إنهاء بواسطة المستخدم (جماعي)', logout_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('user_id', currentUser.id)
            .eq('status', 'active')
            .eq('is_current_session', false);
        alert('تم إنهاء جميع الجلسات الأخرى بنجاح.');
        fetchSessions();
    }

    async function logoutCurrentSession() {
        if (window.TeraAuth?.logout) await window.TeraAuth.logout();
        else window.location.replace('/auth/auth/login/login.html');
    }

    // ========== مراقبة الموقع المستمرة ==========
    function startContinuousLocationWatch() {
        if (!navigator.geolocation) return;
        if (locationWatchId) navigator.geolocation.clearWatch(locationWatchId);

        locationWatchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    await supabase
                        .from('user_login_sessions')
                        .update({ latitude, longitude, last_activity_at: new Date().toISOString() })
                        .eq('user_id', currentUser.id).eq('status', 'active').eq('is_current_session', true);
                } catch (e) {}
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
                    stopContinuousLocationWatch();
                    showLocationDeniedMessage();
                }
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
    }

    function stopContinuousLocationWatch() {
        if (locationWatchId) { navigator.geolocation.clearWatch(locationWatchId); locationWatchId = null; }
    }

    function showLocationDeniedMessage() {
        document.body.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:100vh; background:#f1f5f9; font-family:'Tajawal',sans-serif;">
                <div style="background:#fff; padding:40px; border-radius:16px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.1); max-width:500px;">
                    <i class="fas fa-map-marker-alt" style="font-size:64px; color:#dc2626; margin-bottom:20px;"></i>
                    <h2 style="color:#0A1B3F; margin-bottom:12px;">تم إيقاف الخدمة</h2>
                    <p style="color:#475569; margin-bottom:24px;">نظرًا لعدم اتباع سياسة المنصة ورفض مشاركة الموقع الجغرافي، لا يمكنك متابعة استخدام الخدمة.</p>
                    <button onclick="location.reload()" style="background:#028090; color:#fff; border:none; padding:12px 32px; border-radius:8px; font-weight:700; cursor:pointer;">إعادة المحاولة</button>
                </div>
            </div>
        `;
    }

    window.startContinuousLocationWatch = startContinuousLocationWatch;
    window.stopContinuousLocationWatch = stopContinuousLocationWatch;

    // ========== فحص VPN/Proxy وتنبيهات ==========
    function checkVPNAndAlerts() {
        const currentSession = sessions.find(s => s.is_current_session && s.status === 'active');
        if (currentSession) {
            const vpnAlert = document.getElementById('vpnAlert');
            const vpnMsg = document.getElementById('vpnAlertMessage');
            if (currentSession.vpn_detected) {
                if (vpnAlert) { vpnAlert.classList.add('show'); vpnMsg.textContent = '⚠️ تم اكتشاف استخدام VPN. بعض الخدمات قد تكون محدودة.'; }
            } else if (currentSession.proxy_detected || currentSession.tor_detected) {
                if (vpnAlert) { vpnAlert.classList.add('show'); vpnMsg.textContent = '⚠️ تم اكتشاف Proxy/Tor. يرجى تعطيله للمتابعة.'; }
            }
        }
    }

    // ========== مؤقت الخمول (مختصر) ==========
    function initIdleTimer() {
        function resetIdle() {
            clearTimeout(idleTimer); clearInterval(idleWarningTimer); closeIdleWarning();
            idleTimer = setTimeout(showIdleWarning, IDLE_TIME);
        }
        function showIdleWarning() { /* ... نفس كود النافذة السابق ... */ }
        function closeIdleWarning() { const m = document.getElementById('idleWarningModal'); if (m) m.remove(); }
        ['mousemove','keydown','click','scroll','touchstart'].forEach(e => document.addEventListener(e, resetIdle));
        resetIdle();
    }

    function bindEvents() {
        document.getElementById('searchInput').addEventListener('input', applyFilters);
        document.getElementById('statusFilter').addEventListener('change', applyFilters);
        document.getElementById('deviceFilter').addEventListener('change', applyFilters);
        document.getElementById('closeDetailModal').addEventListener('click', () => document.getElementById('detailModal').classList.remove('show'));
        document.getElementById('closeDetailBtn').addEventListener('click', () => document.getElementById('detailModal').classList.remove('show'));
        document.getElementById('logoutAllSessionsBtn').addEventListener('click', logoutAllOtherSessions);
        document.getElementById('refreshLocationBtn').addEventListener('click', () => {
            if (window.refreshGeoInfo) window.refreshGeoInfo();
            else if (window.requestPreciseLocation) window.requestPreciseLocation();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
