/**
 * security-registered-devices.js – v10 (متكامل مع LocationIQ)
 * متوافق مع هيكل مشروع tera-investor-portal
 */
(function() {
    let supabase, currentUser, sessions = [];
    let idleTimer, idleWarningTimer;
    const IDLE_TIME = 5 * 60 * 1000; // 5 دقائق
    const LOCATIONIQ_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';

    // ---------- دوال مساعدة ----------
    function formatDate(d) {
        return d ? new Date(d).toLocaleString('ar-SA') : '-';
    }

    function getStatusLabel(s) {
        const map = {
            active: 'نشطة',
            logged_out: 'تم تسجيل الخروج',
            timeout: 'انتهت بسبب عدم النشاط',
            terminated_by_system: 'أنهيت بواسطة النظام',
            terminated_by_user: 'أنهيت بواسطة المستخدم'
        };
        return map[s] || s;
    }

    // ---------- التهيئة ----------
    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.replace('/auth/auth/login/login.html');
            return;
        }
        currentUser = user;
        updateHeader(user);
        await fetchSessions();
        bindEvents();
        initIdleTimer();
    }

    function updateHeader(user) {
        const name = user.user_metadata?.full_name || user.email || 'مستخدم';
        document.getElementById('headerUserName').textContent = name;
        document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
    }

    // ---------- جلب الجلسات ----------
    async function fetchSessions() {
        const { data, error } = await supabase
            .from('user_login_sessions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('login_at', { ascending: false });

        if (error) {
            console.error('خطأ في جلب الجلسات:', error);
            return;
        }
        sessions = data || [];
        updateStats();
        applyFilters();
    }

    function updateStats() {
        document.getElementById('totalCount').textContent = sessions.length;
        document.getElementById('activeCount').textContent = sessions.filter(s => s.status === 'active').length;
    }

    // ---------- فلترة وبحث ----------
    function applyFilters() {
        const status = document.getElementById('statusFilter').value;
        const search = document.getElementById('searchInput').value.trim().toLowerCase();
        let filtered = sessions;

        if (status !== 'all') {
            filtered = filtered.filter(s => s.status === status);
        }

        if (search) {
            filtered = filtered.filter(s =>
                (s.session_number || '').toString().includes(search) ||
                formatDate(s.login_at).includes(search)
            );
        }

        renderTable(filtered);
        document.getElementById('filterCount').textContent = `عرض ${filtered.length} جلسة`;
    }

    // ---------- عرض الجدول ----------
    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:50px;">
                <i class="fas fa-folder-open" style="font-size:40px;color:var(--gray-300);display:block;margin-bottom:12px;"></i>
                لا توجد جلسات متطابقة
            </td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(s => {
            const statusClass = `status-${s.status}`;
            return `
                <tr>
                    <td>${s.session_number || '-'}</td>
                    <td>${formatDate(s.login_at)}</td>
                    <td><span class="status-badge ${statusClass}">${getStatusLabel(s.status)}</span></td>
                    <td>
                        <button class="btn-action" onclick="window.showSessionDetail('${s.id}')">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                    </td>
                    <td>
                        ${s.status === 'active' ? `
                            <button class="btn-action danger" onclick="window.terminateSession('${s.id}')">
                                <i class="fas fa-sign-out-alt"></i> خروج
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ---------- LocationIQ API ----------
    async function fetchLocationDetails(lat, lon) {
        if (!lat || !lon) return null;
        const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&accept-language=ar`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return {
                neighbourhood: data.neighbourhood || data.suburb || data.village || data.hamlet || '',
                city: data.city || data.town || '',
                province: data.province || '',
                state: data.state || '',
                postcode: data.postcode || '',
                country: data.country || '',
                country_code: data.country_code || '',
                display_name: data.display_name || ''
            };
        } catch (error) {
            console.error('LocationIQ فشل:', error);
            return null;
        }
    }

    // ---------- عرض التقرير المفصل ----------
    window.showSessionDetail = async function(sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const detailContent = document.getElementById('detailContent');
        detailContent.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <i class="fas fa-spinner fa-pulse" style="font-size:32px;color:var(--primary);"></i>
                <p style="margin-top:12px;color:var(--gray-500);">جاري تحميل تقرير الجلسة...</p>
            </div>`;
        document.getElementById('detailModal').classList.add('show');

        // جلب بيانات الموقع إذا توفرت الإحداثيات
        let locationData = null;
        if (session.latitude && session.longitude) {
            locationData = await fetchLocationDetails(session.latitude, session.longitude);
        }

        // تعريف مجموعات التقرير
        const groups = [
            {
                title: 'هوية الجهاز', icon: 'fa-id-card',
                rows: [
                    ['الرقم التعريفي للجلسة', session.id],
                    ['معرف الجهاز (UUID)', session.device_uuid],
                    ['بصمة المتصفح', session.browser_fingerprint],
                    ['بصمة العتاد', session.hardware_fingerprint],
                    ['مستوى الثقة', session.trust_level],
                    ['حالة الجهاز', session.device_status]
                ]
            },
            {
                title: 'معلومات الجهاز', icon: 'fa-laptop',
                rows: [
                    ['النوع', session.device_type],
                    ['المصنع', session.manufacturer],
                    ['الماركة', session.brand],
                    ['الطراز', session.model],
                    ['المنتج', session.product],
                    ['المنصة', session.platform],
                    ['إصدار المنصة', session.platform_version],
                    ['نظام التشغيل', session.operating_system],
                    ['إصدار النظام', session.operating_system_version],
                    ['المعالج', session.cpu_name],
                    ['الذاكرة (GB)', session.device_memory]
                ]
            },
            {
                title: 'مواصفات الشاشة', icon: 'fa-desktop',
                rows: [
                    ['العرض', session.screen_width],
                    ['الارتفاع', session.screen_height],
                    ['نسبة البكسل', session.pixel_ratio],
                    ['عمق الألوان', session.color_depth],
                    ['الاتجاه', session.orientation]
                ]
            },
            {
                title: 'بيانات المتصفح', icon: 'fa-chrome',
                rows: [
                    ['المتصفح', session.browser_name],
                    ['الإصدار', session.browser_version],
                    ['المحرك', session.browser_engine],
                    ['وكيل المستخدم', session.user_agent],
                    ['اللغة', session.language],
                    ['المنطقة الزمنية', session.timezone]
                ]
            },
            {
                title: 'إمكانيات الجهاز', icon: 'fa-microchip',
                rows: [
                    ['اللمس', session.touch_supported ? 'نعم' : 'لا'],
                    ['الكوكيز', session.cookies_enabled ? 'نعم' : 'لا'],
                    ['تخزين محلي', session.local_storage ? 'نعم' : 'لا'],
                    ['IndexedDB', session.indexed_db ? 'نعم' : 'لا'],
                    ['WebGL', session.webgl_supported ? 'نعم' : 'لا']
                ]
            },
            {
                title: 'بيانات الشبكة', icon: 'fa-network-wired',
                rows: [
                    ['IP العام', session.ip_address],
                    ['مزود الخدمة', session.isp],
                    ['المنظمة', session.organization],
                    ['نوع الشبكة', session.network_type],
                    ['VPN', session.is_vpn ? 'نعم' : 'لا'],
                    ['Proxy', session.is_proxy ? 'نعم' : 'لا'],
                    ['Tor', session.is_tor ? 'نعم' : 'لا'],
                    ['استضافة/داتا سنتر', session.hosting_detected ? 'نعم' : 'لا']
                ]
            },
            {
                title: 'الموقع الجغرافي', icon: 'fa-map-marker-alt',
                rows: locationData ? [
                    ['الدولة', locationData.country],
                    ['الرمز الدولي', locationData.country_code],
                    ['المدينة', locationData.city],
                    ['المحافظة/المنطقة', locationData.province || locationData.state],
                    ['الحي', locationData.neighbourhood],
                    ['الرمز البريدي', locationData.postcode],
                    ['الإحداثيات', `${session.latitude}, ${session.longitude}`],
                    ['العنوان الكامل', locationData.display_name]
                ] : [
                    ['الدولة', session.country],
                    ['المدينة', session.city],
                    ['المنطقة', session.district],
                    ['الإحداثيات', session.latitude && session.longitude ? `${session.latitude}, ${session.longitude}` : '—']
                ]
            },
            {
                title: 'معلومات الجلسة', icon: 'fa-clock',
                rows: [
                    ['رقم الجلسة', session.session_number],
                    ['وقت الدخول', formatDate(session.login_at)],
                    ['وقت الخروج', session.logout_at ? formatDate(session.logout_at) : 'مازالت نشطة'],
                    ['عدد الدخول', session.login_count],
                    ['محاولات فاشلة', session.failed_login_count]
                ]
            },
            {
                title: 'بيانات الثقة والأمان', icon: 'fa-shield-alt',
                rows: [
                    ['موثوق', session.is_trusted ? 'نعم' : 'لا'],
                    ['درجة الثقة', session.trust_score],
                    ['درجة المخاطرة', session.risk_score],
                    ['تقييم الجهاز', session.device_score],
                    ['تقييم الشبكة', session.network_score],
                    ['تقييم الموقع', session.location_score]
                ]
            },
            {
                title: 'معلومات التسجيل', icon: 'fa-history',
                rows: [
                    ['أول ظهور', session.first_seen ? formatDate(session.first_seen) : '—'],
                    ['آخر ظهور', session.last_seen ? formatDate(session.last_seen) : '—'],
                    ['IP التسجيل', session.registration_ip],
                    ['مدينة التسجيل', session.registration_city],
                    ['متصفح التسجيل', session.registration_browser]
                ]
            }
        ];

        // بناء HTML
        let html = '';
        groups.forEach(group => {
            const hasData = group.rows.some(row => row[1] && row[1] !== '—');
            if (!hasData) return;

            html += `
                <div class="detail-group">
                    <h4><i class="fas ${group.icon}"></i> ${group.title}</h4>
                    ${group.rows.map(row => `
                        <div class="detail-row">
                            <span class="detail-label">${row[0]}:</span>
                            <span class="detail-value">${row[1] || '—'}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        });

        detailContent.innerHTML = html || '<p style="text-align:center;color:gray;">لا توجد تفاصيل إضافية لهذه الجلسة.</p>';
    };

    // ---------- إنهاء جلسة ----------
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

    // ---------- ربط الأحداث ----------
    function bindEvents() {
        document.getElementById('statusFilter').addEventListener('change', applyFilters);
        document.getElementById('searchInput').addEventListener('input', applyFilters);

        document.getElementById('closeDetailModal').addEventListener('click', () => {
            document.getElementById('detailModal').classList.remove('show');
        });
        document.getElementById('closeDetailBtn').addEventListener('click', () => {
            document.getElementById('detailModal').classList.remove('show');
        });
        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('detailModal')) {
                document.getElementById('detailModal').classList.remove('show');
            }
        });

        // مؤقت الخمول
        ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(ev => {
            document.addEventListener(ev, resetIdleTimer);
        });
    }

    // ---------- مؤقت الخمول ----------
    function initIdleTimer() { resetIdleTimer(); }

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        clearTimeout(idleWarningTimer);
        const warning = document.getElementById('idleWarning');
        if (warning) warning.style.display = 'none';

        idleWarningTimer = setTimeout(() => {
            if (warning) warning.style.display = 'flex';
        }, IDLE_TIME - 30000);

        idleTimer = setTimeout(async () => {
            await supabase.from('user_login_sessions')
                .update({ status: 'timeout', logout_at: new Date().toISOString() })
                .eq('user_id', currentUser.id)
                .eq('status', 'active');
            window.location.href = '/auth/auth/login/login.html?reason=timeout';
        }, IDLE_TIME);
    }

    // ---------- بدء التطبيق ----------
    init();
})();
