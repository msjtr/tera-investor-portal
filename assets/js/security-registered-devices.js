/**
 * security-registered-devices.js – v4 (موقع، VPN، خمول، مؤقت تنازلي)
 * يستخدم ipwhois.app لجلب معلومات الموقع والشبكة
 */
(function() {
    let supabase, currentUser, sessions = [];
    let idleTimer, idleWarningTimer, idleCountdown = 60;
    const IDLE_TIME = 5 * 60 * 1000; // 5 دقائق
    const WARNING_TIME = 60 * 1000;  // 60 ثانية تنازلية

    function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleString('ar-SA') : '-'; }
    function getStatusLabel(status) {
        const labels = {
            active: 'نشطة', logged_out: 'تم تسجيل الخروج', timeout: 'انتهت بسبب عدم النشاط',
            terminated_by_system: 'أنهيت بواسطة النظام', terminated_by_user: 'أنهيت بواسطة المستخدم'
        };
        return labels[status] || status;
    }
    function getStatusClass(status) {
        if (status === 'active') return 'status-active';
        if (status === 'logged_out') return 'status-logged_out';
        if (status === 'timeout') return 'status-timeout';
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

    async function init() {
        try {
            supabase = window.teraSupabase || await waitForSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { window.location.replace('/auth/auth/login/login.html'); return; }
            currentUser = user;
            await updateHeader(user);
            await fetchSessions();
            bindEvents();
            initIdleTimer();
            initLocationPrompt();
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
        const headerName = document.getElementById('headerUserName');
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerName) headerName.textContent = name;
        if (headerAvatar) headerAvatar.textContent = name.charAt(0).toUpperCase();
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
        const activeSessions = sessions.filter(s => s.status === 'active');
        document.getElementById('activeCount').textContent = activeSessions.length;
        const lastLogin = sessions.reduce((latest, s) => s.login_at && new Date(s.login_at) > new Date(latest) ? s.login_at : latest, null);
        document.getElementById('lastLoginTime').textContent = lastLogin ? formatDate(lastLogin) : '-';
        const lastLogout = sessions.reduce((latest, s) => s.logout_at && new Date(s.logout_at) > new Date(latest) ? s.logout_at : latest, null);
        document.getElementById('lastLogoutTime').textContent = lastLogout ? formatDate(lastLogout) : '-';
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
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:50px; color:var(--gray-500);">
                <i class="fas fa-inbox" style="font-size:48px; margin-bottom:12px; color:var(--gray-300); display:block;"></i>
                <p style="margin:0; font-weight:700;">لا توجد عمليات تسجيل دخول مسجلة بعد.</p>
                <p style="font-size:13px; margin-top:8px;">سيتم تسجيل الدخول الحالي تلقائياً في السجل.</p>
            </td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(s => `
            <tr>
                <td>${s.session_number || '-'}</td>
                <td>${formatDate(s.login_at)}</td>
                <td>${s.logout_at ? formatDate(s.logout_at) : '-'}</td>
                <td>${getDuration(s.login_at, s.logout_at)}</td>
                <td><span class="status-badge ${getStatusClass(s.status)}">${getStatusLabel(s.status)}</span></td>
                <td>${s.device_type || '-'}</td>
                <td>${s.operating_system || '-'}</td>
                <td>${s.browser_name || '-'}</td>
                <td>${s.city ? s.city + (s.country ? ', ' + s.country : '') : s.country || '-'}</td>
                <td>${s.ip_address || '-'}</td>
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
                <div class="detail-item"><span class="label">سبب انتهاء الجلسة</span><span class="value">${session.logout_reason || '-'}</span></div>
                <div class="detail-item"><span class="label">الحالة</span><span class="value"><span class="status-badge ${getStatusClass(session.status)}">${getStatusLabel(session.status)}</span></span></div>
            </div>
            <div class="detail-section"><h4>معلومات الجهاز</h4>
                <div class="detail-item"><span class="label">نوع الجهاز</span><span class="value">${session.device_type || '-'}</span></div>
                <div class="detail-item"><span class="label">اسم الجهاز</span><span class="value">${session.device_name || '-'}</span></div>
                <div class="detail-item"><span class="label">الشركة المصنعة</span><span class="value">${session.device_brand || '-'}</span></div>
                <div class="detail-item"><span class="label">نظام التشغيل</span><span class="value">${session.operating_system || '-'}</span></div>
                <div class="detail-item"><span class="label">إصدار النظام</span><span class="value">${session.os_version || '-'}</span></div>
                <div class="detail-item"><span class="label">المتصفح</span><span class="value">${session.browser_name || '-'}</span></div>
                <div class="detail-item"><span class="label">إصدار المتصفح</span><span class="value">${session.browser_version || '-'}</span></div>
                <div class="detail-item"><span class="label">دقة الشاشة</span><span class="value">${session.screen_resolution || '-'}</span></div>
                <div class="detail-item"><span class="label">لغة الجهاز</span><span class="value">${session.language || '-'}</span></div>
            </div>
            <div class="detail-section"><h4>معلومات الشبكة</h4>
                <div class="detail-item"><span class="label">عنوان IP</span><span class="value">${session.ip_address || '-'}</span></div>
                <div class="detail-item"><span class="label">مزود الخدمة (ISP)</span><span class="value">${session.isp || '-'}</span></div>
                <div class="detail-item"><span class="label">نوع الاتصال</span><span class="value">${session.connection_type || '-'}</span></div>
                <div class="detail-item"><span class="label">VPN/Proxy</span><span class="value">${session.vpn_detected ? 'تم الاكتشاف' : 'لا يوجد'}</span></div>
            </div>
            <div class="detail-section"><h4>معلومات الموقع</h4>
                <div class="detail-item"><span class="label">الدولة</span><span class="value">${session.country || '-'}</span></div>
                <div class="detail-item"><span class="label">المنطقة</span><span class="value">${session.region || '-'}</span></div>
                <div class="detail-item"><span class="label">المدينة</span><span class="value">${session.city || '-'}</span></div>
                <div class="detail-item"><span class="label">الحي</span><span class="value">${session.district || '-'}</span></div>
                <div class="detail-item"><span class="label">الرمز البريدي</span><span class="value">${session.postal_code || '-'}</span></div>
                <div class="detail-item"><span class="label">المنطقة الزمنية</span><span class="value">${session.timezone || '-'}</span></div>
                <div class="detail-item"><span class="label">خط العرض</span><span class="value">${session.latitude || '-'}</span></div>
                <div class="detail-item"><span class="label">خط الطول</span><span class="value">${session.longitude || '-'}</span></div>
            </div>
            <div class="detail-section"><h4>معلومات الأمان</h4>
                <div class="detail-item"><span class="label">الجلسة الحالية</span><span class="value">${session.is_current_session ? '✅ نعم' : '❌ لا'}</span></div>
                <div class="detail-item"><span class="label">جهاز موثوق</span><span class="value">${session.is_trusted_device ? 'نعم' : 'لا'}</span></div>
                <div class="detail-item"><span class="label">بصمة الجهاز</span><span class="value">${session.fingerprint || '-'}</span></div>
                <div class="detail-item"><span class="label">آخر نشاط</span><span class="value">${session.last_activity_at ? formatDate(session.last_activity_at) : '-'}</span></div>
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

    async function logoutCurrentSession() {
        if (window.TeraAuth?.logout) await window.TeraAuth.logout();
        else window.location.replace('/auth/auth/login/login.html');
    }

    // ========== مؤقت الخمول ==========
    function initIdleTimer() {
        function resetIdle() {
            clearTimeout(idleTimer);
            clearInterval(idleWarningTimer);
            closeIdleWarning();
            idleTimer = setTimeout(showIdleWarning, IDLE_TIME);
        }

        function showIdleWarning() {
            const modal = document.createElement('div');
            modal.id = 'idleWarningModal';
            modal.className = 'modal-overlay show';
            modal.innerHTML = `
                <div class="modal-box" style="max-width:420px; text-align:center;">
                    <i class="fas fa-clock" style="font-size:48px; color:var(--warning); margin-bottom:12px;"></i>
                    <h4 style="margin:0 0 8px; color:var(--gray-900);">انتهت صلاحية الجلسة بسبب عدم النشاط</h4>
                    <p style="margin-bottom:16px; color:var(--gray-700);">سيتم تسجيل خروجك تلقائياً خلال <strong id="countdownDisplay">60</strong> ثانية.</p>
                    <div style="display:flex; gap:12px; justify-content:center;">
                        <button id="extendSessionBtn" class="btn-primary">تمديد الجلسة</button>
                        <button id="forceLogoutBtn" class="btn-danger">تسجيل الخروج</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            let count = 60;
            const countdownEl = document.getElementById('countdownDisplay');
            idleWarningTimer = setInterval(() => {
                count--;
                if (countdownEl) countdownEl.textContent = count;
                if (count <= 0) {
                    clearInterval(idleWarningTimer);
                    closeIdleWarning();
                    logoutCurrentSession();
                }
            }, 1000);

            document.getElementById('extendSessionBtn').addEventListener('click', () => {
                resetIdle();
            });
            document.getElementById('forceLogoutBtn').addEventListener('click', () => {
                clearInterval(idleWarningTimer);
                closeIdleWarning();
                logoutCurrentSession();
            });
        }

        function closeIdleWarning() {
            const modal = document.getElementById('idleWarningModal');
            if (modal) modal.remove();
        }

        ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, resetIdle);
        });

        resetIdle();
    }

    // ========== طلب إذن الموقع ==========
    function initLocationPrompt() {
        const activeSession = sessions.find(s => s.is_current_session && s.status === 'active');
        if (activeSession && !activeSession.country) {
            const bar = document.querySelector('.search-filter-bar');
            if (bar && !document.getElementById('locationPrompt')) {
                const prompt = document.createElement('div');
                prompt.id = 'locationPrompt';
                prompt.style.cssText = 'margin-top:12px; padding:10px 14px; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; color:#9a3412; font-size:14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap;';
                prompt.innerHTML = `
                    <span><i class="fas fa-map-marker-alt"></i> لم يتم تحديد موقعك بعد. قد تكون بعض التفاصيل غير دقيقة.</span>
                    <button id="enableLocationBtn" class="btn-primary" style="padding:6px 14px; font-size:13px;">تفعيل تحديد الموقع</button>
                `;
                bar.parentNode.insertBefore(prompt, bar.nextSibling);
                document.getElementById('enableLocationBtn').addEventListener('click', () => {
                    refreshGeoInfo();
                    prompt.remove();
                });
            }
        }
    }

    window.refreshGeoInfo = async function() {
        try {
            const response = await fetch('https://ipwhois.app/json/');
            const data = await response.json();
            await supabase
                .from('user_login_sessions')
                .update({
                    ip_address: data.ip,
                    country: data.country,
                    region: data.region,
                    city: data.city,
                    postal_code: data.postal,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timezone: data.timezone,
                    isp: data.isp
                })
                .eq('user_id', currentUser.id)
                .eq('status', 'active')
                .eq('is_current_session', true);
            alert('تم تحديث معلومات الموقع بنجاح.');
            fetchSessions();
        } catch (e) {
            alert('تعذر الاتصال بخدمة تحديد الموقع.');
        }
    };

    window.requestPreciseLocation = async function() {
        if (!navigator.geolocation) {
            alert('متصفحك لا يدعم تحديد الموقع الجغرافي.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await supabase
                    .from('user_login_sessions')
                    .update({ latitude, longitude })
                    .eq('user_id', currentUser.id)
                    .eq('status', 'active')
                    .eq('is_current_session', true);
                alert('تم تحديث موقعك الدقيق بنجاح.');
                fetchSessions();
            },
            (error) => {
                alert('لم نتمكن من الحصول على موقعك الدقيق. تأكد من تفعيل خدمة الموقع.');
            }
        );
    };

    function bindEvents() {
        document.getElementById('searchInput').addEventListener('input', applyFilters);
        document.getElementById('statusFilter').addEventListener('change', applyFilters);
        document.getElementById('deviceFilter').addEventListener('change', applyFilters);
        document.getElementById('closeDetailModal').addEventListener('click', () => document.getElementById('detailModal').classList.remove('show'));
        document.getElementById('closeDetailBtn').addEventListener('click', () => document.getElementById('detailModal').classList.remove('show'));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
