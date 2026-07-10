/**
 * security-registered-devices.js – v8 (مركز أمان متكامل + VPN/Proxy)
 */
(function() {
    let supabase, currentUser, sessions = [];
    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000; // 5 دقائق

    function formatDate(d) { 
        return d ? new Date(d).toLocaleString('ar-SA') : '-'; 
    }
    
    function getDuration(start, end) {
        if (!start) return '-';
        const e = end ? new Date(end) : new Date();
        const diff = Math.floor((e - new Date(start)) / 1000);
        if (diff < 0) return '-';
        const h = Math.floor(diff/3600), m = Math.floor((diff%3600)/60), s = diff%60;
        return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    
    function getStatusLabel(s) {
        const l = { 
            active:'نشطة', 
            logged_out:'تم تسجيل الخروج', 
            timeout:'انتهت بسبب عدم النشاط', 
            terminated_by_system:'أنهيت بواسطة النظام', 
            terminated_by_user:'أنهيت بواسطة المستخدم' 
        };
        return l[s] || s;
    }

    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { 
            window.location.replace('/auth/auth/login/login.html'); 
            return; 
        }
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
            
        if (error) { 
            console.error(error); 
            return; 
        }
        sessions = data || [];
        updateStats();
        applyFilters();
    }

    function updateStats() {
        document.getElementById('totalCount').textContent = sessions.length;
        document.getElementById('activeCount').textContent = sessions.filter(s => s.status === 'active').length;
        // الأجهزة الموثوقة: إن وجد عمود is_trusted، وإلا 0
        const trusted = sessions.filter(s => s.is_trusted === true).length;
        document.getElementById('trustedDevicesCount').textContent = trusted;
        const last = sessions.reduce((a, b) => b.login_at > a ? b.login_at : a, '');
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
            filtered = filtered.filter(s => 
                (s.session_number || '').includes(q) ||
                (s.ip_address || '').includes(q) ||
                (s.isp || '').toLowerCase().includes(q) ||
                (s.browser_name || '').toLowerCase().includes(q) ||
                (s.country || '').includes(q) ||
                (s.city || '').includes(q) ||
                (s.district || '').includes(q)
            );
        }
        
        renderTable(filtered);
        document.getElementById('filterCount').textContent = `عرض ${filtered.length} جلسة`;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>';
            return;
        }
        
        tbody.innerHTML = list.map(s => {
            // رابط الخريطة
            let mapLink = '-';
            if (s.latitude && s.longitude) {
                mapLink = `<a href="https://maps.google.com/?q=${s.latitude},${s.longitude}" target="_blank" title="فتح في خرائط قوقل">🗺️ عرض</a>`;
            }
            
            // حالة VPN/Proxy (مؤقتاً —، يمكن ربطها بحقل من قاعدة البيانات)
            let vpnProxy = '—';
            if (s.is_vpn) vpnProxy = '✅ VPN';
            else if (s.is_proxy) vpnProxy = '⚠️ Proxy';
            
            return `
                <tr>
                    <td>${s.session_number || '-'}</td>
                    <td>${formatDate(s.login_at)}</td>
                    <td>${getDuration(s.login_at, s.logout_at)}</td>
                    <td>${s.device_type || '-'}</td>
                    <td>${s.browser_name || '-'}</td>
                    <td>${s.ip_address || '-'}</td>
                    <td>${s.isp || '-'}</td>
                    <td>${s.country || ''} ${s.city ? ' - ' + s.city : ''}</td>
                    <td>${vpnProxy}</td>
                    <td>${mapLink}</td>
                    <td><span class="status-badge status-${s.status}">${getStatusLabel(s.status)}</span></td>
                    <td>
                        ${s.status === 'active' ? 
                            `<button class="btn-terminate" onclick="window.terminateSession('${s.id}')" title="إنهاء الجلسة">⏹️ إنهاء</button>` 
                            : '-'
                        }
                    </td>
                </tr>
            `;
        }).join('');
    }

    function bindEvents() {
        document.getElementById('statusFilter').addEventListener('change', applyFilters);
        document.getElementById('deviceFilter').addEventListener('change', applyFilters);
        document.getElementById('searchInput').addEventListener('input', applyFilters);
        
        // أزرار الإجراءات الرئيسية (مكانيك الحدث سيتم إضافته هنا)
        document.getElementById('logoutAllSessionsBtn').addEventListener('click', async () => {
            if (!confirm('هل أنت متأكد من تسجيل الخروج من جميع الأجهزة الأخرى؟')) return;
            // إنهاء جميع الجلسات النشطة ما عدا الحالية
            const { error } = await supabase
                .from('user_login_sessions')
                .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
                .eq('user_id', currentUser.id)
                .eq('status', 'active')
                .neq('id', sessions.find(s => s.status === 'active')?.id); // استثناء الجلسة الحالية (أول نشطة)
            if (error) {
                alert('حدث خطأ أثناء إنهاء الجلسات');
                console.error(error);
            } else {
                await fetchSessions();
                alert('تم إنهاء جميع الجلسات الأخرى بنجاح.');
            }
        });

        document.getElementById('refreshLocationBtn').addEventListener('click', () => {
            // يمكن طلب تحديث الموقع عبر واجهة المتصفح أو إعادة تحميل الصفحة
            alert('سيتم تحديث موقعك الجغرافي عند إعادة تحميل الصفحة أو تسجيل الدخول مجدداً.');
            window.location.reload();
        });

        // إعادة تعيين مؤقت الخمول عند أي نشاط
        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
            document.addEventListener(ev, resetIdleTimer);
        });
    }

    window.terminateSession = async function(sessionId) {
        if (!confirm('هل أنت متأكد من إنهاء هذه الجلسة؟')) return;
        
        const { error } = await supabase
            .from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', currentUser.id);
            
        if (error) {
            alert('حدث خطأ أثناء إنهاء الجلسة');
            console.error(error);
            return;
        }
        
        await fetchSessions();
    };

    // --- نظام كشف الخمول ---
    function initIdleTimer() {
        resetIdleTimer();
    }

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
        
        const warning = document.getElementById('idleWarning');
        if (warning) warning.classList.remove('show');
        
        idleWarningTimer = setTimeout(() => {
            if (warning) warning.classList.add('show');
        }, IDLE_TIME - 30000);
        
        idleTimer = setTimeout(async () => {
            const { error } = await supabase
                .from('user_login_sessions')
                .update({ status: 'timeout', logout_at: new Date().toISOString() })
                .eq('user_id', currentUser.id)
                .eq('status', 'active');
                
            if (!error) {
                window.location.href = '/auth/auth/login/login.html?reason=timeout';
            }
        }, IDLE_TIME);
    }

    init();
})();
