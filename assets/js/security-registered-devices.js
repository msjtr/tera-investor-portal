/**
 * security-registered-devices.js – v8 (مركز أمان متكامل + VPN/Proxy)
 */
(function() {
    let supabase, currentUser, sessions = [];
    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000; // 5 دقائق

    // تنسيق التاريخ بالعربية
    function formatDate(d) { 
        return d ? new Date(d).toLocaleString('ar-SA') : '-'; 
    }
    
    // حساب مدة الجلسة
    function getDuration(start, end) {
        if (!start) return '-';
        const e = end ? new Date(end) : new Date();
        const diff = Math.floor((e - new Date(start)) / 1000);
        if (diff < 0) return '-';
        const h = Math.floor(diff/3600), m = Math.floor((diff%3600)/60), s = diff%60;
        return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    
    // ترجمة حالة الجلسة
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

    // تهيئة الصفحة
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

    // تحديث بيانات المستخدم في الهيدر
    async function updateHeader(user) {
        let name = user.user_metadata?.full_name || user.email || 'مستخدم';
        document.getElementById('headerUserName').textContent = name;
        document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
    }

    // جلب جميع جلسات المستخدم
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

    // تحديث الإحصائيات
    function updateStats() {
        document.getElementById('totalCount').textContent = sessions.length;
        document.getElementById('activeCount').textContent = sessions.filter(s => s.status === 'active').length;
        const last = sessions.reduce((a, b) => b.login_at > a ? b.login_at : a, '');
        document.getElementById('lastLoginTime').textContent = last ? formatDate(last) : '-';
    }

    // تطبيق الفلاتر والبحث
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

    // عرض جدول الجلسات
    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>';
            return;
        }
        
        tbody.innerHTML = list.map(s => {
            // رابط الخريطة (الإصلاح هنا)
            let mapLink = '-';
            if (s.latitude && s.longitude) {
                mapLink = `<a href="https://maps.google.com/?q=${s.latitude},${s.longitude}" target="_blank" title="فتح في خرائط قوقل">🗺️ عرض الموقع</a>`;
            }
            
            // بناء صف الجدول
            return `
                <tr>
                    <td>${s.session_number || '-'}</td>
                    <td>${formatDate(s.login_at)}</td>
                    <td>${getDuration(s.login_at, s.logout_at)}</td>
                    <td>${s.ip_address || '-'}</td>
                    <td>${s.isp || '-'}</td>
                    <td>${s.country || '-'} - ${s.city || '-'}</td>
                    <td>${s.device_type || '-'}</td>
                    <td>${s.browser_name || '-'}</td>
                    <td><span class="status-badge status-${s.status}">${getStatusLabel(s.status)}</span></td>
                    <td>${mapLink}</td>
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

    // ربط الأحداث (الفلاتر، الأزرار)
    function bindEvents() {
        document.getElementById('statusFilter').addEventListener('change', applyFilters);
        document.getElementById('deviceFilter').addEventListener('change', applyFilters);
        document.getElementById('searchInput').addEventListener('input', applyFilters);
        
        // إعادة تعيين مؤقت الخمول عند أي نشاط
        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
            document.addEventListener(ev, resetIdleTimer);
        });
    }

    // إنهاء جلسة معينة (دالة عامة تُستدعى من الأزرار)
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
        
        // تحديث القائمة
        await fetchSessions();
    };

    // --- نظام كشف الخمول وإنهاء الجلسة ---
    function initIdleTimer() {
        resetIdleTimer();
    }

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
        
        // إخفاء تحذير الخمول إن وجد
        const warning = document.getElementById('idleWarning');
        if (warning) warning.style.display = 'none';
        
        // تحذير قبل 30 ثانية من انتهاء المهلة
        idleWarningTimer = setTimeout(() => {
            const warn = document.getElementById('idleWarning');
            if (warn) warn.style.display = 'block';
        }, IDLE_TIME - 30000);
        
        // إنهاء الجلسة تلقائياً بعد المدة المحددة
        idleTimer = setTimeout(async () => {
            // إنهاء جميع جلسات المستخدم النشطة (أو الجلسة الحالية فقط حسب التصميم)
            const { error } = await supabase
                .from('user_login_sessions')
                .update({ status: 'timeout', logout_at: new Date().toISOString() })
                .eq('user_id', currentUser.id)
                .eq('status', 'active');
                
            if (!error) {
                // إعادة التوجيه لصفحة تسجيل الخروج
                window.location.href = '/auth/auth/login/login.html?reason=timeout';
            }
        }, IDLE_TIME);
    }

    // بدء التطبيق
    init();
})();
