/**
 * security-registered-devices.js – v19 (بطاقة الجلسة الحالية + أيقونات + أسهم)
 * يعرض كل تفاصيل الجلسة، ويستجيب لإنهاء الجلسة من علامات تبويب أخرى.
 * يضيف بطاقة الجلسة الحالية وأيقونات الأجهزة وإصلاح أسهم الطي.
 */
(function() {
    let supabase, currentUser, sessions = [];

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

    // أيقونة الجهاز
    function getDeviceIcon(deviceInfo) {
        if (!deviceInfo) return 'fa-desktop';
        const type = deviceInfo.device_type;
        const os = deviceInfo.operating_system?.toLowerCase() || '';
        if (type === 'mobile') return 'fa-mobile-alt';
        if (type === 'tablet') return 'fa-tablet-alt';
        if (os.includes('mac')) return 'fa-apple';
        if (os.includes('windows')) return 'fa-windows';
        return 'fa-desktop';
    }

    // عرض بطاقة الجلسة الحالية
    function renderCurrentSessionCard() {
        const current = sessions.find(s => s.is_current_session);
        const cardContainer = document.getElementById('currentSessionCard');
        if (!cardContainer) return;
        if (!current) {
            cardContainer.style.display = 'none';
            return;
        }
        cardContainer.style.display = 'block';
        const fmt = window.UIHelpers?.formatDate || formatDate;
        const lbl = window.UIHelpers?.getStatusLabel || getStatusLabel;
        const devIcon = getDeviceIcon(current);
        const browserName = current.browser_name ? `${current.browser_name} ${current.browser_version || ''}` : '—';
        const location = [current.city, current.country].filter(Boolean).join('، ') || '—';

        cardContainer.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                <i class="fas ${devIcon}" style="font-size:28px; color:var(--primary);"></i>
                <div style="flex:1;">
                    <div style="font-weight:700; font-size:16px;">الجلسة الحالية</div>
                    <div style="font-size:13px; color:var(--gray-500);">${current.session_number} • ${fmt(current.login_at)}</div>
                </div>
                <button class="btn-action danger" onclick="window.terminateSession('${current.id}')"><i class="fas fa-sign-out-alt"></i> إنهاء الجلسة</button>
            </div>
            <div style="margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:10px;">
                <div><strong>الجهاز:</strong> ${current.device_type || '—'}</div>
                <div><strong>المتصفح:</strong> ${browserName}</div>
                <div><strong>IP:</strong> ${current.ip_address || '—'}</div>
                <div><strong>الموقع:</strong> ${location}</div>
            </div>
        `;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!tbody) return;
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>'; return; }
        const fmt = window.UIHelpers?.formatDate || formatDate;
        const lbl = window.UIHelpers?.getStatusLabel || getStatusLabel;
        tbody.innerHTML = list.map(s => {
            const devIcon = getDeviceIcon(s);
            return `
                <tr class="${s.is_current_session ? 'current-session-row' : ''}">
                    <td>
                        <i class="fas ${devIcon}" style="margin-left:6px; color:var(--gray-500);"></i>
                        ${s.session_number || '-'}
                        ${s.is_current_session ? '<span class="badge-current">أنت هنا</span>' : ''}
                    </td>
                    <td>${fmt(s.login_at)}</td>
                    <td><span class="status-badge status-${s.status}">${lbl(s.status)}</span></td>
                    <td><button class="btn-action" onclick="window.showSessionDetail('${s.id}')"><i class="fas fa-eye"></i> عرض</button></td>
                    <td>${s.status === 'active' ? `<button class="btn-action danger" onclick="window.terminateSession('${s.id}')"><i class="fas fa-sign-out-alt"></i> خروج</button>` : '-'}</td>
                </tr>
            `;
        }).join('');
        renderCurrentSessionCard();
    }

    // إنهاء جميع الجلسات النشطة الأخرى
    window.terminateAllSessions = async function() {
        if (!confirm('هل أنت متأكد من إنهاء جميع الجلسات النشطة الأخرى؟')) return;
        if (window.SessionManager?.terminateAllSessions) {
            const result = await window.SessionManager.terminateAllSessions(currentUser.id);
            if (result.success) {
                const msg = result.count > 0
                    ? `تم إنهاء ${result.count} جلسة نشطة أخرى.`
                    : 'لا توجد جلسات نشطة أخرى.';
                if (window.UIHelpers?.showToast) {
                    window.UIHelpers.showToast(msg, 'info', 3000);
                } else {
                    alert(msg);
                }
                await fetchSessions();
            }
        } else {
            alert('الميزة غير متاحة حالياً.');
        }
    };

    // إنهاء جلسة محددة
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

    async function handleIdleTimeout(reason) {
        const currentSession = sessions.find(s => s.is_current_session);
        if (currentSession && window.SessionManager?.handleIdleTimeout) {
            await window.SessionManager.handleIdleTimeout(reason);
        } else {
            if (window.Auth?.logout) await window.Auth.logout();
            else window.location.href = '/auth/auth/login/login.html?reason=timeout';
        }
    }

    // عرض التفاصيل مع إصلاح الأسهم
    window.showSessionDetail = async function(sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const detailContent = document.getElementById('detailContent');
        const modal = document.getElementById('detailModal');
        if (!detailContent || !modal) return;
        modal.classList.add('show');

        let extraLocation = null;
        const hasMissingTextData = !session.country || !session.city || !session.neighbourhood || !session.postal_code;
        if (session.latitude && session.longitude && hasMissingTextData) {
            if (window.LocationServices?.fetchLocationIQ) {
                detailContent.innerHTML = '<p style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل تفاصيل الموقع...</p>';
                try { extraLocation = await window.LocationServices.fetchLocationIQ(session.latitude, session.longitude); } catch (err) {}
            }
        }

        const conn = (typeof session.connection_info === 'string') ? JSON.parse(session.connection_info) : session.connection_info;
        const extraDev = (typeof session.extra_device_info === 'string') ? JSON.parse(session.extra_device_info) : session.extra_device_info;

        const groups = [
            {
                title: 'معلومات أساسية', icon: 'fa-info-circle',
                rows: [
                    ['رقم الجلسة', session.session_number],
                    ['وقت الدخول', formatDate(session.login_at)],
                    ['آخر نشاط', session.last_activity_at ? formatDate(session.last_activity_at) : '—'],
                    ['الخروج', session.logout_at ? formatDate(session.logout_at) : (session.status === 'active' ? 'ما زالت نشطة' : '—')],
                    ['الحالة', getStatusLabel(session.status)],
                    ['مزود الجلسة', session.location_provider || '—']
                ]
            },
            {
                title: 'بيانات الجهاز والمتصفح', icon: 'fa-laptop',
                rows: [
                    ['نوع الجهاز', session.device_type || '—'],
                    ['نظام التشغيل', session.operating_system ? `${session.operating_system} ${session.os_version || ''} (${session.os_architecture || ''})` : '—'],
                    ['المنصة', session.platform || '—'],
                    ['المتصفح', session.browser_name ? `${session.browser_name} ${session.browser_version || ''} (${session.browser_engine || ''})` : '—'],
                    ['وكيل المستخدم', session.user_agent || '—'],
                    ['اللغة', session.language || '—'],
                    ['دقة الشاشة', session.screen_resolution || '—'],
                    ['نسبة البكسل', session.pixel_ratio || '—'],
                    ['عمق اللون', session.color_depth || '—'],
                    ['اللمس', session.touch_supported ? `نعم (${session.max_touch_points || extraDev?.touch_points || '?'} نقطة)` : 'لا'],
                    ['المعالج (نوى)', session.cpu_architecture || session.cpu_cores || '—'],
                    ['ذاكرة الجهاز', session.device_memory || '—'],
                    ['الكوكيز', session.cookies_enabled ? 'نعم' : 'لا'],
                    ['Local Storage', session.local_storage ? 'نعم' : 'لا'],
                    ['Session Storage', session.session_storage ? 'نعم' : 'لا'],
                    ['IndexedDB', session.indexed_db ? 'نعم' : 'لا'],
                    ['WebGL', session.webgl_supported ? 'نعم' : 'لا'],
                    ['البصمة', session.fingerprint || '—'],
                    ['المنطقة الزمنية', session.timezone || '—'],
                ]
            },
            {
                title: 'الشبكة والاتصال', icon: 'fa-network-wired',
                rows: [
                    ['IP العام', session.ip_address || '—'],
                    ['IP المحلي', conn?.ip?.local || '—'],
                    ['مزود الخدمة', session.isp || conn?.ip?.isp || '—'],
                    ['ASN', conn?.ip?.asn || '—'],
                    ['نوع الشبكة', session.network_type || conn?.network?.type || '—'],
                    ['حالة الاتصال', session.network_online !== null ? (session.network_online ? 'متصل' : 'غير متصل') : '—'],
                    ['نوع الاتصال الفعّال', session.network_effective_type || conn?.network?.effectiveType || '—'],
                    ['سرعة التحميل (Mbps)', session.network_downlink ?? conn?.network?.downlinkSpeed ?? '—'],
                    ['تأخير (RTT ms)', session.network_rtt ?? conn?.network?.latency ?? '—'],
                    ['توفير البيانات', session.network_save_data ? 'نعم' : 'لا'],
                ]
            },
            {
                title: 'أمان الشبكة', icon: 'fa-shield-alt',
                rows: [
                    ['VPN', session.vpn_detected ? 'نعم' : 'لا'],
                    ['Proxy', session.proxy_detected ? 'نعم' : 'لا'],
                    ['Tor', session.tor_detected ? 'نعم' : 'لا'],
                    ['استضافة/داتا سنتر', session.hosting_detected ? 'نعم' : 'لا'],
                    ['مصادر الكشف', conn?.security?.sources?.join(', ') || '—']
                ]
            }
        ];

        const features = extraDev?.browser_features;
        if (features) {
            const featureRows = Object.entries(features).map(([key, val]) => [key.replace(/_/g, ' '), val ? '✓' : '✗']);
            groups.push({ title: 'ميزات المتصفح', icon: 'fa-puzzle-piece', rows: featureRows });
        }

        if (extraDev?.battery) {
            const b = extraDev.battery;
            groups.push({
                title: 'البطارية', icon: 'fa-battery-half',
                rows: [
                    ['الشحن', b.charging ? 'قيد الشحن' : 'غير موصول'],
                    ['النسبة', b.level || '—'],
                    ['وقت الشحن المتبقي (دقيقة)', b.charging_time === 'لا نهائي' ? '—' : (b.charging_time / 60).toFixed(1)],
                    ['الوقت حتى التفريغ (دقيقة)', b.discharging_time === 'لا نهائي' ? '—' : (b.discharging_time / 60).toFixed(1)]
                ]
            });
        }

        if (extraDev?.incognito_likely !== undefined) {
            groups.push({ title: 'معلومات إضافية', icon: 'fa-user-secret', rows: [['وضع التصفح المخفي (تقديري)', extraDev.incognito_likely ? 'نعم' : 'لا']] });
        }

        const locationRows = [];
        const country = session.country || extraLocation?.country;
        const country_code = session.country_code || extraLocation?.country_code;
        const city = session.city || extraLocation?.city;
        const neighbourhood = session.neighbourhood || session.district || extraLocation?.neighbourhood;
        const province = session.province || extraLocation?.province;
        const state = session.state || extraLocation?.state;
        const postal_code = session.postal_code || extraLocation?.postcode;
        const display_name = session.display_name || extraLocation?.display_name;
        if (country) locationRows.push(['الدولة', country]);
        if (country_code) locationRows.push(['الرمز الدولي', country_code]);
        if (city) locationRows.push(['المدينة', city]);
        if (neighbourhood) locationRows.push(['الحي', neighbourhood]);
        if (province || state) locationRows.push(['المنطقة/المحافظة', province || state]);
        if (postal_code) locationRows.push(['الرمز البريدي', postal_code]);
        if (session.latitude && session.longitude) {
            locationRows.push(['الإحداثيات', `${session.latitude}, ${session.longitude}`]);
            locationRows.push(['الخريطة', `<a href="https://maps.google.com/?q=${session.latitude},${session.longitude}" target="_blank" rel="noopener"><i class="fas fa-map-pin"></i> عرض على الخريطة</a>`]);
        }
        if (locationRows.length === 0 && display_name) locationRows.push(['العنوان الكامل', display_name]);
        else if (locationRows.length === 0) locationRows.push(['الموقع', 'غير متوفر']);
        groups.push({ title: 'الموقع الجغرافي', icon: 'fa-globe', rows: locationRows });

        const advancedLocationRows = [];
        const locFields = ['place_id','licence','osm_type','osm_id','display_name','name','class','type','match_code','match_type','match_level',
                          'house_number','road','quarter','suburb','town','village','municipality','county','state_district','state_code','postcode','government'];
        locFields.forEach(f => { if (session[f]) advancedLocationRows.push([f, session[f]]); });
        if (session.boundingbox) advancedLocationRows.push(['boundingbox', Array.isArray(session.boundingbox) ? session.boundingbox.join(', ') : session.boundingbox]);
        if (advancedLocationRows.length > 0) groups.push({ title: 'تفاصيل الموقع (LocationIQ)', icon: 'fa-map-marked-alt', rows: advancedLocationRows });

        const lookupRows = [];
        const lookupFields = ['location_provider','api_endpoint','http_status','lookup_status','request_started_at','response_received_at','execution_time_ms','gps_source','gps_accuracy','error_code','error_message'];
        lookupFields.forEach(f => {
            let val = session[f];
            if (f === 'lookup_status') val = val === 1 ? 'نجاح' : val === 0 ? 'فشل' : val;
            if (f.endsWith('_at')) val = formatDate(val);
            if (val !== null && val !== undefined) lookupRows.push([f, val]);
        });
        if (lookupRows.length > 0) groups.push({ title: 'معلومات الاستعلام (Lookup)', icon: 'fa-search', rows: lookupRows });

        if (session.locationiq_response) {
            groups.push({
                title: 'الرد الخام (Raw JSON)', icon: 'fa-code',
                rows: [[ 'JSON', `<pre style="max-height:250px;overflow:auto;background:#1e293b;color:#e2e8f0;padding:8px;border-radius:6px;font-size:12px;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(session.locationiq_response, null, 2)}</pre>` ]]
            });
        }

        let buttonsHTML = '';
        if (session.latitude && session.longitude) {
            buttonsHTML += `<button class="btn-action" onclick="window.open('https://maps.google.com/?q=${session.latitude},${session.longitude}', '_blank')"><i class="fas fa-map-marker-alt"></i> عرض على الخريطة</button>`;
            buttonsHTML += `<button class="btn-action" onclick="navigator.clipboard.writeText('${session.latitude}, ${session.longitude}')"><i class="fas fa-copy"></i> نسخ الإحداثيات</button>`;
        }
        if (session.locationiq_response) {
            const raw = JSON.stringify(session.locationiq_response);
            buttonsHTML += `<button class="btn-action" onclick="navigator.clipboard.writeText('${raw.replace(/'/g, "\\'")}')"><i class="fas fa-code"></i> نسخ JSON</button>`;
            buttonsHTML += `<button class="btn-action" onclick="window.downloadJSON('${session.session_number}', ${raw})"><i class="fas fa-download"></i> تحميل JSON</button>`;
        }

        let html = '';
        groups.forEach(group => {
            const dataRows = group.rows.filter(r => r[1] && r[1] !== '—');
            if (dataRows.length === 0) return;
            html += `
                <div class="detail-group">
                    <div class="group-header" onclick="this.closest('.detail-group').querySelector('.group-content').classList.toggle('collapsed'); this.classList.toggle('collapsed');" style="cursor:pointer; display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <i class="fas ${group.icon}"></i>
                        <h4>${group.title}</h4>
                        <i class="fas fa-chevron-down" style="margin-right:auto; transition: transform 0.2s;"></i>
                    </div>
                    <div class="group-content">`;
            dataRows.forEach(row => {
                html += `<div class="detail-row"><span class="detail-label">${row[0]}:</span><span class="detail-value">${row[1]}</span></div>`;
            });
            html += `</div></div>`;
        });

        if (buttonsHTML) html += `<div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap;">${buttonsHTML}</div>`;

        detailContent.innerHTML = html || '<p>لا توجد تفاصيل</p>';
    };

    window.downloadJSON = function(filename, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_location.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // مستمع BroadcastChannel
    function listenForSessionTermination() {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            const channel = new BroadcastChannel('tera_session_channel');
            channel.onmessage = (event) => {
                if (event.data && event.data.action === 'SESSION_TERMINATED_BY_NEW_LOGIN') {
                    if (window.UIHelpers && window.UIHelpers.showToast) {
                        window.UIHelpers.showToast('تم إنهاء هذه الجلسة لوجود جلسة أحدث في مكان آخر.', 'warning', 5000);
                    } else {
                        alert('تم إنهاء هذه الجلسة لوجود جلسة أحدث في مكان آخر.');
                    }
                    setTimeout(() => {
                        if (window.Auth?.logout) {
                            window.Auth.logout();
                        } else {
                            window.location.href = '/auth/auth/login/login.html?reason=new_session';
                        }
                    }, 2000);
                }
            };
        } catch (e) { /* تجاهل */ }
    }

    async function init() {
        if (!window.Auth) { window.location.replace('/auth/auth/login/login.html'); return; }
        const user = await window.Auth.requireAuth();
        if (!user) return;
        currentUser = user;
        supabase = window.teraSupabase || await window.waitForSupabase();
        updateHeader(user);
        listenForSessionTermination();
        await fetchSessions();
        bindEvents();

        if (window.ActivityTracker && window.ActivityTracker.startIdleTimer) {
            window.ActivityTracker.startIdleTimer(handleIdleTimeout, currentUser.id);
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
        updateStats();
        applyFilters();
        // بدء حماية الجلسة عند أول جلب للجلسات
        const current = sessions.find(s => s.is_current_session);
        if (current && window.SessionManager?.startSessionGuard) {
            window.SessionManager.startSessionGuard(currentUser.id, current.id);
        }
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

    init();
})();
