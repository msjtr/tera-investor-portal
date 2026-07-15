/**
 * security-registered-devices.js – v27 (عرض محسّن للشبكة مع مصدر البيانات)
 */
(function() {
    let supabase, currentUser, sessions = [];

    // ---------- دوال مساعدة ----------
    function formatDate(d) { return d ? new Date(d).toLocaleString('ar-SA') : '-'; }
    function getStatusLabel(s) {
        const l = {
            active: 'نشطة',
            logged_out: 'تم تسجيل الخروج',
            timeout: 'انتهت بسبب عدم النشاط',
            terminated_by_system: 'أنهيت بواسطة النظام',
            terminated_by_user: 'أنهيت بواسطة المستخدم'
        };
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

    function getDeviceIcon(session) {
        const type = session.device_type;
        const os = (session.operating_system || '').toLowerCase();
        if (type === 'mobile') return 'fa-mobile-alt';
        if (type === 'tablet') return 'fa-tablet-alt';
        if (os.includes('mac') || os.includes('ios')) return 'fa-apple';
        if (os.includes('windows')) return 'fa-windows';
        if (os.includes('android')) return 'fa-android';
        return 'fa-desktop';
    }

    // ======== تصحيح تلقائي للجلسة الحالية ========
    async function ensureCurrentSessionFlag() {
        if (!currentUser || !supabase) return;
        const activeWithFlag = sessions.some(s => s.status === 'active' && s.is_current_session);
        if (activeWithFlag) return;

        const activeSessions = sessions
            .filter(s => s.status === 'active')
            .sort((a, b) => new Date(b.login_at) - new Date(a.login_at));
        if (activeSessions.length === 0) return;
        const newestActive = activeSessions[0];

        try {
            await supabase.from('user_login_sessions')
                .update({ is_current_session: false })
                .eq('user_id', currentUser.id)
                .neq('id', newestActive.id);
            await supabase.from('user_login_sessions')
                .update({ is_current_session: true })
                .eq('id', newestActive.id)
                .eq('user_id', currentUser.id);
            sessions.forEach(s => { s.is_current_session = (s.id === newestActive.id); });
        } catch (e) { /* ignore */ }
    }

    // بطاقة الجلسة الحالية
    function renderCurrentSessionCard() {
        const card = document.getElementById('currentSessionCard');
        if (!card) return;
        let current = sessions.find(s => s.status === 'active' && s.is_current_session);
        if (!current) current = sessions.find(s => s.status === 'active');
        if (!current) { card.style.display = 'none'; return; }
        card.style.display = 'block';
        const fmt = formatDate;
        const devIcon = getDeviceIcon(current);
        const browser = current.browser_name ? `${current.browser_name} ${current.browser_version || ''}` : '—';
        const location = [current.city, current.country].filter(Boolean).join('، ') || '—';
        const ip = current.ip_address || '—';

        card.innerHTML = `
            <div class="card-header" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                <i class="fas ${devIcon}" style="font-size:28px; color:var(--primary);"></i>
                <div style="flex:1;">
                    <div class="card-title" style="font-weight:700; font-size:16px; display:flex; align-items:center; gap:8px;">
                        الجلسة الحالية
                        <span class="badge-current" style="background:var(--primary); color:white; padding:2px 8px; border-radius:10px; font-size:11px;">أنت هنا</span>
                    </div>
                    <div class="card-meta" style="font-size:13px; color:var(--gray-500);">${current.session_number} • ${fmt(current.login_at)}</div>
                </div>
                <button class="btn-action danger" onclick="window.terminateSession('${current.id}')"><i class="fas fa-sign-out-alt"></i> إنهاء</button>
            </div>
            <div class="card-details" style="margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:10px;">
                <div><strong>الجهاز:</strong> ${current.device_type || '—'}</div>
                <div><strong>المتصفح:</strong> ${browser}</div>
                <div><strong>IP:</strong> ${ip}</div>
                <div><strong>الموقع:</strong> ${location}</div>
            </div>
        `;
    }

    // ---------- عمليات الجلسات ----------
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
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>';
        }
        updateStats();
        applyFilters();
        renderCurrentSessionCard();
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
            (s.session_number || '').includes(q) || (s.ip_address || '').includes(q) ||
            (s.browser_name || '').toLowerCase().includes(q) || (s.country || '').includes(q) ||
            (s.city || '').includes(q) || (s.district || '').includes(q));
        renderTable(filtered);
        const filterCountEl = document.getElementById('filterCount');
        if (filterCountEl) filterCountEl.textContent = `عرض ${filtered.length} جلسة`;
    }

    function renderTable(list) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!tbody) return;
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:50px;">لا توجد جلسات</td></tr>';
            renderCurrentSessionCard();
            return;
        }
        const fmt = formatDate;
        const lbl = getStatusLabel;
        tbody.innerHTML = list.map(s => {
            const devIcon = getDeviceIcon(s);
            const isCurrent = s.status === 'active' && s.is_current_session;
            return `
            <tr class="${isCurrent ? 'current-session-row' : ''}">
                <td>
                    <i class="fas ${devIcon}" style="margin-left:6px; color:var(--gray-500);"></i>
                    ${s.session_number || '-'}
                    ${isCurrent ? '<span class="badge-current">أنت هنا</span>' : ''}
                </td>
                <td>${fmt(s.login_at)}</td>
                <td><span class="status-badge status-${s.status}">${lbl(s.status)}</span></td>
                <td><button class="btn-action" onclick="window.showSessionDetail('${s.id}')"><i class="fas fa-eye"></i> عرض</button></td>
                <td>${s.status === 'active' ? `<button class="btn-action danger" onclick="window.terminateSession('${s.id}')"><i class="fas fa-sign-out-alt"></i> خروج</button>` : '-'}</td>
            </tr>`;
        }).join('');
        renderCurrentSessionCard();
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

    window.terminateAllSessions = async function() {
        if (!confirm('هل أنت متأكد من إنهاء جميع الجلسات النشطة الأخرى؟')) return;
        if (window.SessionManager?.terminateAllSessions) {
            const result = await window.SessionManager.terminateAllSessions(currentUser.id);
            if (result.success) {
                if (window.UIHelpers?.showToast) {
                    window.UIHelpers.showToast(`تم إنهاء ${result.count} جلسة نشطة أخرى.`, 'info', 3000);
                } else {
                    alert(`تم إنهاء ${result.count} جلسة نشطة أخرى.`);
                }
                await fetchSessions();
            }
        } else {
            alert('الميزة غير متاحة حالياً.');
        }
    };

    async function handleIdleTimeout(reason) {
        const currentSession = sessions.find(s => s.is_current_session);
        if (currentSession) {
            if (window.SessionManager?.terminateSession) {
                await window.SessionManager.terminateSession(currentSession.id, currentUser.id);
            } else {
                await supabase.from('user_login_sessions').update({ status: 'timeout', logout_at: new Date().toISOString() }).eq('id',currentSession.id).eq('user_id',currentUser.id);
            }
        }
        if (window.Auth?.logout) await window.Auth.logout();
        else window.location.href = '/auth/auth/login/login.html?reason=timeout';
    }

    // ---------- نافذة التفاصيل (محسنة بمصدر البيانات) ----------
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

        // معالجة connection_info و extra_device_info بأمان
        let conn = null;
        try {
            conn = (typeof session.connection_info === 'string') ? JSON.parse(session.connection_info) : session.connection_info;
        } catch (e) { conn = session.connection_info; }

        let extraDev = null;
        try {
            extraDev = (typeof session.extra_device_info === 'string') ? JSON.parse(session.extra_device_info) : session.extra_device_info;
        } catch (e) { extraDev = session.extra_device_info; }

        function addRow(rows, label, value) {
            if (value !== undefined && value !== null && value !== '' && value !== '—') {
                rows.push([label, value]);
            }
        }

        const groups = [];

        // 1. معلومات أساسية
        const basicRows = [];
        addRow(basicRows, 'رقم الجلسة', session.session_number);
        addRow(basicRows, 'وقت الدخول', formatDate(session.login_at));
        addRow(basicRows, 'آخر نشاط', session.last_activity_at ? formatDate(session.last_activity_at) : null);
        addRow(basicRows, 'الخروج', session.logout_at ? formatDate(session.logout_at) : (session.status === 'active' ? 'ما زالت نشطة' : '—'));
        addRow(basicRows, 'الحالة', getStatusLabel(session.status));
        addRow(basicRows, 'مزود الجلسة', session.location_provider);
        groups.push({ title: 'معلومات أساسية', icon: 'fa-info-circle', rows: basicRows });

        // 2. بيانات الجهاز والمتصفح
        const deviceRows = [];
        addRow(deviceRows, 'نوع الجهاز', session.device_type);
        addRow(deviceRows, 'نظام التشغيل', session.operating_system ? `${session.operating_system} ${session.os_version || ''} (${session.os_architecture || ''})` : null);
        addRow(deviceRows, 'المنصة', session.platform);
        addRow(deviceRows, 'المتصفح', session.browser_name ? `${session.browser_name} ${session.browser_version || ''} (${session.browser_engine || ''})` : null);
        addRow(deviceRows, 'وكيل المستخدم', session.user_agent);
        addRow(deviceRows, 'اللغة', session.language);
        addRow(deviceRows, 'دقة الشاشة', session.screen_resolution);
        addRow(deviceRows, 'نسبة البكسل', session.pixel_ratio);
        addRow(deviceRows, 'عمق اللون', session.color_depth);
        addRow(deviceRows, 'اللمس', session.touch_supported ? 'نعم' : 'لا');
        addRow(deviceRows, 'المعالج (نوى)', session.cpu_architecture || session.cpu_cores);
        addRow(deviceRows, 'ذاكرة الجهاز', session.device_memory);
        addRow(deviceRows, 'الكوكيز', session.cookies_enabled ? 'نعم' : 'لا');
        addRow(deviceRows, 'Local Storage', session.local_storage ? 'نعم' : 'لا');
        addRow(deviceRows, 'Session Storage', session.session_storage ? 'نعم' : 'لا');
        addRow(deviceRows, 'IndexedDB', session.indexed_db ? 'نعم' : 'لا');
        addRow(deviceRows, 'WebGL', session.webgl_supported ? 'نعم' : 'لا');
        addRow(deviceRows, 'البصمة', session.fingerprint);
        addRow(deviceRows, 'المنطقة الزمنية', session.timezone);
        groups.push({ title: 'بيانات الجهاز والمتصفح', icon: 'fa-laptop', rows: deviceRows });

        // 3. الشبكة والاتصال – إظهار جميع الصفوف مع مصدر البيانات
        const netRows = [
            ['IP العام', session.ip_address || '—'],
            ['IP المحلي', conn?.ip?.local || '—'],
            ['مزود الخدمة', session.isp || conn?.ip?.isp || '—'],
            ['ASN', conn?.ip?.asn || '—'],
            ['نوع الشبكة', session.network_type || conn?.network?.type || '—'],
            ['حالة الاتصال', session.network_online !== null ? (session.network_online ? 'متصل' : 'غير متصل') : '—'],
            ['نوع الاتصال الفعّال', session.network_effective_type || conn?.network?.effectiveType || '—'],
            ['سرعة التحميل (Mbps)', session.network_downlink ?? conn?.network?.downlinkSpeed ?? '—'],
            ['تأخير (RTT ms)', session.network_rtt ?? conn?.network?.latency ?? '—'],
            ['توفير البيانات', session.network_save_data ? 'نعم' : 'لا']
        ];
        // إضافة مصدر البيانات إذا كان متاحاً
        const dataSources = conn?.security?.sources || [];
        if (dataSources.length > 0) {
            netRows.push(['مصدر البيانات', dataSources.join('، ')]);
        }
        groups.push({ title: 'الشبكة والاتصال', icon: 'fa-network-wired', rows: netRows });

        // 4. أمان الشبكة
        const secRows = [
            ['VPN', session.vpn_detected ? 'نعم' : 'لا'],
            ['Proxy', session.proxy_detected ? 'نعم' : 'لا'],
            ['Tor', session.tor_detected ? 'نعم' : 'لا'],
            ['استضافة/داتا سنتر', session.hosting_detected ? 'نعم' : 'لا'],
            ['مصادر الكشف', conn?.security?.sources?.join(', ') || '—']
        ];
        groups.push({ title: 'أمان الشبكة', icon: 'fa-shield-alt', rows: secRows });

        // 5. ميزات المتصفح
        const features = extraDev?.browser_features;
        if (features) {
            const featureRows = Object.entries(features).map(([key, val]) => [key.replace(/_/g, ' '), val ? '✓' : '✗']);
            groups.push({ title: 'ميزات المتصفح', icon: 'fa-puzzle-piece', rows: featureRows });
        }

        // 6. البطارية
        if (extraDev?.battery) {
            const b = extraDev.battery;
            const battRows = [];
            addRow(battRows, 'الشحن', b.charging ? 'قيد الشحن' : 'غير موصول');
            addRow(battRows, 'النسبة', b.level);
            addRow(battRows, 'وقت الشحن المتبقي (دقيقة)', b.charging_time === 'لا نهائي' ? null : (b.charging_time / 60).toFixed(1));
            addRow(battRows, 'الوقت حتى التفريغ (دقيقة)', b.discharging_time === 'لا نهائي' ? null : (b.discharging_time / 60).toFixed(1));
            groups.push({ title: 'البطارية', icon: 'fa-battery-half', rows: battRows });
        }

        // 7. الوضع الخفي
        if (extraDev?.incognito_likely !== undefined) {
            groups.push({ title: 'معلومات إضافية', icon: 'fa-user-secret', rows: [['وضع التصفح المخفي (تقديري)', extraDev.incognito_likely ? 'نعم' : 'لا']] });
        }

        // 8. الموقع الجغرافي
        const locationRows = [];
        const country = session.country || extraLocation?.country;
        const country_code = session.country_code || extraLocation?.country_code;
        const city = session.city || extraLocation?.city;
        const neighbourhood = session.neighbourhood || session.district || extraLocation?.neighbourhood;
        const province = session.province || extraLocation?.province;
        const state = session.state || extraLocation?.state;
        const postal_code = session.postal_code || extraLocation?.postcode;
        const display_name = session.display_name || extraLocation?.display_name;
        addRow(locationRows, 'الدولة', country);
        addRow(locationRows, 'الرمز الدولي', country_code);
        addRow(locationRows, 'المدينة', city);
        addRow(locationRows, 'الحي', neighbourhood);
        addRow(locationRows, 'المنطقة/المحافظة', province || state);
        addRow(locationRows, 'الرمز البريدي', postal_code);
        if (session.latitude && session.longitude) {
            locationRows.push(['الإحداثيات', `${session.latitude}, ${session.longitude}`]);
            locationRows.push(['الخريطة', `<a href="https://maps.google.com/?q=${session.latitude},${session.longitude}" target="_blank" rel="noopener"><i class="fas fa-map-pin"></i> عرض على الخريطة</a>`]);
        }
        if (locationRows.length === 0 && display_name) locationRows.push(['العنوان الكامل', display_name]);
        else if (locationRows.length === 0) locationRows.push(['الموقع', 'غير متوفر']);
        groups.push({ title: 'الموقع الجغرافي', icon: 'fa-globe', rows: locationRows });

        // 9. تفاصيل الموقع (LocationIQ)
        const advancedLocationRows = [];
        const locFields = ['place_id','licence','osm_type','osm_id','display_name','name','class','type','match_code','match_type','match_level',
                          'house_number','road','quarter','suburb','town','village','municipality','county','state_district','state_code','postcode','government'];
        locFields.forEach(f => { if (session[f]) advancedLocationRows.push([f, session[f]]); });
        if (session.boundingbox) advancedLocationRows.push(['boundingbox', Array.isArray(session.boundingbox) ? session.boundingbox.join(', ') : session.boundingbox]);
        if (advancedLocationRows.length > 0) groups.push({ title: 'تفاصيل الموقع (LocationIQ)', icon: 'fa-map-marked-alt', rows: advancedLocationRows });

        // 10. معلومات الاستعلام (Lookup) مع تصحيح الحالة
        const lookupRows = [];
        addRow(lookupRows, 'وقت بدء الطلب', session.request_started_at ? formatDate(session.request_started_at) : null);
        addRow(lookupRows, 'وقت استلام الرد', session.response_received_at ? formatDate(session.response_received_at) : null);
        addRow(lookupRows, 'زمن التنفيذ (ms)', session.execution_time_ms);
        addRow(lookupRows, 'مصدر GPS', session.gps_source);
        addRow(lookupRows, 'دقة GPS (متر)', session.gps_accuracy);
        let lookupStatusLabel = 'غير معروف';
        if (session.lookup_status === 1 || session.place_id || session.display_name || session.latitude) {
            lookupStatusLabel = 'نجاح';
        } else if (session.lookup_status === 0) {
            lookupStatusLabel = 'فشل';
        }
        addRow(lookupRows, 'حالة الاستعلام', lookupStatusLabel);
        addRow(lookupRows, 'HTTP Status', session.http_status);
        addRow(lookupRows, 'رمز الخطأ', session.error_code);
        if (lookupRows.length > 0) groups.push({ title: 'معلومات الاستعلام (Lookup)', icon: 'fa-search', rows: lookupRows });

        // 11. Raw JSON
        if (session.locationiq_response) {
            groups.push({
                title: 'الرد الخام (Raw JSON)', icon: 'fa-code',
                rows: [[ 'JSON', `<pre style="max-height:250px;overflow:auto;background:#1e293b;color:#e2e8f0;padding:8px;border-radius:6px;font-size:12px;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(session.locationiq_response, null, 2)}</pre>` ]]
            });
        }

        // بناء HTML
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
            if (group.rows.length === 0) return;
            html += `<div class="detail-group">
                <div class="group-header" onclick="this.classList.toggle('collapsed'); this.nextElementSibling.classList.toggle('collapsed');">
                    <i class="fas ${group.icon}"></i>
                    <h4>${group.title}</h4>
                    <i class="fas fa-chevron-down" style="margin-right:auto;"></i>
                </div>
                <div class="group-content">`;
            group.rows.forEach(row => {
                html += `<div class="detail-row"><span class="detail-label">${row[0]}:</span><span class="detail-value">${row[1]}</span></div>`;
            });
            html += `</div></div>`;
        });

        if (buttonsHTML) html += `<div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap;">${buttonsHTML}</div>`;

        detailContent.innerHTML = html || '<p>لا توجد تفاصيل كافية لعرضها.</p>';
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

    // ---------- أحداث ----------
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

    function listenForSessionTermination() {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            const channel = new BroadcastChannel('tera_session_channel');
            channel.onmessage = (event) => {
                if (event.data && event.data.action === 'SESSION_TERMINATED_BY_NEW_LOGIN') {
                    if (window.UIHelpers?.showToast) {
                        window.UIHelpers.showToast('تم إنهاء هذه الجلسة لوجود جلسة أحدث في مكان آخر.', 'warning', 5000);
                    } else {
                        alert('تم إنهاء هذه الجلسة لوجود جلسة أحدث في مكان آخر.');
                    }
                    setTimeout(() => {
                        if (window.Auth?.logout) window.Auth.logout();
                        else window.location.href = '/auth/auth/login/login.html?reason=new_session';
                    }, 2000);
                }
            };
        } catch (e) {}
    }

    function injectStyles() {
        if (document.getElementById('tera-session-styles')) return;
        const style = document.createElement('style');
        style.id = 'tera-session-styles';
        style.textContent = `
            .current-session-row { background-color: #e0f2fe !important; }
            .badge-current { background: #028090; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-right: 6px; display: inline-block; }
            #currentSessionCard { background: #ffffff; border: 1px solid var(--gray-200); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
            .group-content.collapsed { display: none; }
            .group-header.collapsed .fa-chevron-down { transform: rotate(-90deg); }
            .group-header .fa-chevron-down { transition: transform 0.2s; }
            .detail-group .group-header { cursor: pointer; user-select: none; display: flex; align-items: center; gap: 8px; }
            .detail-group .group-header h4 { margin: 0; flex: 1; }
            @media (max-width: 768px) {
                .detail-label { min-width: 100%; margin-bottom: 2px; }
                .detail-row { flex-direction: column; }
            }
        `;
        document.head.appendChild(style);
    }

    // ---------- التهيئة ----------
    async function init() {
        injectStyles();
        if (!window.Auth) { window.location.replace('/auth/auth/login/login.html'); return; }
        const user = await window.Auth.requireAuth();
        if (!user) return;
        currentUser = user;
        supabase = window.teraSupabase || await window.waitForSupabase();
        updateHeader(user);

        listenForSessionTermination();

        await fetchSessions();
        await ensureCurrentSessionFlag();
        bindEvents();

        const sessionId = sessionStorage.getItem('currentSessionId');
        if (window.SessionManager?.startSessionGuard && sessionId) {
            window.SessionManager.startSessionGuard(currentUser.id, sessionId);
        }

        if (window.ActivityTracker?.startIdleTimer) {
            window.ActivityTracker.startIdleTimer(handleIdleTimeout, currentUser.id);
        } else {
            console.warn('ActivityTracker غير محمل');
        }
    }

    init();
})();
