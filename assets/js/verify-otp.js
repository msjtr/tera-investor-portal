/**
 * verify-otp.js – v10 (متوافق مع الأعمدة الفعلية للجدول)
 */
(function() {
    const OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300;
    const LOCATIONIQ_KEY = 'pk.ca7b33e8b24ce857f868fa5ec4dce8d0';

    let supabase;

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');

    let countdownInterval;

    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        bindEvents();
        startCountdown();
    }

    function bindEvents() {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = value;
                if (value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
                checkComplete();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) otpInputs[index - 1].focus();
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (digits.length === OTP_LENGTH) {
                    for (let i = 0; i < OTP_LENGTH; i++) if (otpInputs[i]) otpInputs[i].value = digits[i] || '';
                    otpInputs[OTP_LENGTH - 1].focus();
                    checkComplete();
                }
            });
        });
        if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);
        if (resendBtn) resendBtn.addEventListener('click', handleResend);
    }

    function getOtpCode() { let code = ''; otpInputs.forEach(i => code += i.value); return code; }
    function checkComplete() { if (verifyBtn) verifyBtn.disabled = getOtpCode().length !== OTP_LENGTH; }

    function showError(msg) {
        if (errorMsg) { errorMsg.textContent = msg; errorMsg.style.display = 'block'; }
        if (successMsg) successMsg.style.display = 'none';
    }
    function clearMessages() {
        if (errorMsg) errorMsg.style.display = 'none';
        if (successMsg) successMsg.style.display = 'none';
    }

    function getDeviceAndBrowserInfo() {
        const ua = navigator.userAgent;
        let os = 'Unknown', osVersion = '';
        if (/Windows NT 10/.test(ua)) { os = 'Windows'; osVersion = '10'; }
        else if (/Windows NT 6.3/.test(ua)) { os = 'Windows'; osVersion = '8.1'; }
        else if (/Mac OS X/.test(ua)) { os = 'macOS'; let m = ua.match(/Mac OS X (\d+[._]\d+)/); if(m) osVersion = m[1].replace('_', '.'); }
        else if (/Android/.test(ua)) { os = 'Android'; let m = ua.match(/Android (\d+\.?\d*)/); if(m) osVersion = m[1]; }
        else if (/iPhone|iPad/.test(ua)) { os = 'iOS'; let m = ua.match(/OS (\d+[._]\d+)/); if(m) osVersion = m[1].replace('_', '.'); }
        else if (/Linux/.test(ua)) os = 'Linux';

        let browserName = 'Unknown', browserVersion = '';
        if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) { browserName = 'Chrome'; let m = ua.match(/Chrome\/(\d+)/); if(m) browserVersion = m[1]; }
        else if (/Firefox/i.test(ua)) { browserName = 'Firefox'; let m = ua.match(/Firefox\/(\d+)/); if(m) browserVersion = m[1]; }
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) { browserName = 'Safari'; let m = ua.match(/Version\/(\d+)/); if(m) browserVersion = m[1]; }
        else if (/Edg/i.test(ua)) { browserName = 'Edge'; let m = ua.match(/Edg\/(\d+)/); if(m) browserVersion = m[1]; }

        let deviceType = 'computer';
        if (/Mobi|Android|iPhone/i.test(ua)) deviceType = 'mobile';
        else if (/iPad|Tablet/i.test(ua)) deviceType = 'tablet';

        return {
            device_type: deviceType,
            browser_name: browserName,
            browser_version: browserVersion,
            browser_engine: '',
            user_agent: ua,
            operating_system: os,
            os_version: osVersion,
            platform: navigator.platform || '',
            language: navigator.language || '',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            color_depth: window.screen.colorDepth || '',
            pixel_ratio: window.devicePixelRatio || 1,
            cpu_cores: navigator.hardwareConcurrency || '',
            device_memory: navigator.deviceMemory || '',
            touch_supported: !!('ontouchstart' in window || navigator.maxTouchPoints > 0),
            cookies_enabled: navigator.cookieEnabled,
            local_storage: typeof Storage !== 'undefined' && !!window.localStorage,
            session_storage: typeof Storage !== 'undefined' && !!window.sessionStorage,
            indexed_db: !!window.indexedDB,
            webgl_supported: (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch(e){ return false; } })(),
            fingerprint: btoa(ua + window.screen.width + window.screen.height + navigator.language).substring(0, 32),
            network_type: navigator.connection?.effectiveType || ''
        };
    }

    async function getPublicIP() {
        try { const r = await fetch('https://api.ipify.org?format=json'); const d = await r.json(); return d.ip; } catch (e) { return null; }
    }

    async function fetchBasicGeo() {
        try {
            const r = await fetch('https://ipapi.co/json/');
            if (!r.ok) throw new Error('ipapi');
            const d = await r.json();
            return { ip: d.ip, city: d.city, country: d.country_name, country_code: d.country_code, isp: d.org, lat: d.latitude, lon: d.longitude, proxy: d.proxy || false, hosting: d.hosting || false };
        } catch (e) { return {}; }
    }

    async function fetchLocationIQ(lat, lon) {
        if (!lat || !lon) return {};
        const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&accept-language=ar`;
        try {
            const r = await fetch(url);
            if (!r.ok) throw new Error('LocationIQ');
            const data = await r.json();
            return {
                neighbourhood: data.neighbourhood || data.suburb || data.village || '',
                province: data.province || '',
                state: data.state || '',
                postal_code: data.postcode || '',
                display_name: data.display_name || '',
                city: data.city || '',
                district: data.county || data.district || ''
            };
        } catch (e) { return {}; }
    }

    async function createSessionRecord(userId) {
        if (!supabase) return;
        try {
            const ip = await getPublicIP();
            const d = getDeviceAndBrowserInfo();
            const sessionNumber = 'SES-' + Date.now().toString(36).toUpperCase();
            const geo = await fetchBasicGeo();
            const loc = await fetchLocationIQ(geo.lat, geo.lon);

            const record = {
                user_id: userId,
                session_number: sessionNumber,
                login_at: new Date().toISOString(),
                status: 'active',
                ip_address: geo.ip || ip || 'غير معروف',
                isp: geo.isp || null,
                country: geo.country || null,
                country_code: geo.country_code || null,
                city: loc.city || geo.city || null,
                district: loc.neighbourhood || loc.district || null,
                neighbourhood: loc.neighbourhood || null,
                province: loc.province || null,
                state: loc.state || null,
                postal_code: loc.postal_code || null,
                display_name: loc.display_name || null,
                latitude: geo.lat || null,
                longitude: geo.lon || null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
                vpn_detected: geo.proxy || false,
                proxy_detected: geo.proxy || false,
                hosting_detected: geo.hosting || false,
                device_type: d.device_type,
                browser_name: d.browser_name,
                browser_version: d.browser_version,
                browser_engine: d.browser_engine,
                user_agent: d.user_agent,
                operating_system: d.operating_system,
                os_version: d.os_version,
                platform: d.platform,
                language: d.language,
                screen_resolution: d.screen_resolution,
                pixel_ratio: d.pixel_ratio,
                color_depth: d.color_depth,
                cpu_architecture: d.cpu_cores || null,   // استخدام عمود cpu_architecture الموجود
                device_memory: d.device_memory,
                touch_supported: d.touch_supported,
                cookies_enabled: d.cookies_enabled,
                local_storage: d.local_storage,
                session_storage: d.session_storage,
                indexed_db: d.indexed_db,
                webgl_supported: d.webgl_supported,
                fingerprint: d.fingerprint,
                network_type: d.network_type || null,
                is_current_session: true
            };

            const { error } = await supabase.from('user_login_sessions').insert(record);
            if (error) console.error('❌ فشل تسجيل الجلسة:', error);
            else console.log('✅ تم تسجيل الجلسة');
        } catch (e) { console.error('خطأ في تسجيل الجلسة:', e); }
    }

    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) { showError('يرجى إدخال رمز التحقق كاملاً'); return; }
        clearMessages();
        if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...'; }
        const email = sessionStorage.getItem('otpEmail');

        try {
            const sb = supabase || (window.teraSupabase || await window.waitForSupabase?.());
            if (!sb) throw new Error('الخدمة غير متوفرة');
            const { data, error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
            if (error) throw error;

            if (data?.session) {
                await createSessionRecord(data.session.user.id);
                sessionStorage.removeItem('otpEmail');
                if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...'; successMsg.style.display = 'block'; }
                setTimeout(() => { window.location.href = '/pages/dashboard/index.html'; }, 1500);
            } else {
                if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح'; successMsg.style.display = 'block'; }
                if (window.onOtpVerified) window.onOtpVerified(code);
                else setTimeout(() => window.location.href = '/pages/dashboard/index.html', 1000);
            }
        } catch (error) {
            console.error(error);
            showError(getArabicErrorMessage(error.message));
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة'; }
        }
    }

    async function handleResend() {
        const email = sessionStorage.getItem('otpEmail');
        if (!email) { showError('البريد الإلكتروني غير متوفر'); return; }
        clearMessages();
        if (resendBtn) { resendBtn.disabled = true; resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...'; }
        try {
            const sb = supabase || (window.teraSupabase || await window.waitForSupabase?.());
            if (!sb) throw new Error('الخدمة غير متوفرة');
            const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
            if (error) throw error;
            if (successMsg) { successMsg.textContent = 'تم إرسال رمز جديد'; successMsg.style.display = 'block'; }
            resetCountdown();
        } catch (e) { showError('فشل إعادة الإرسال'); }
        finally { if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = 'إعادة إرسال الرمز'; } }
    }

    function startCountdown() {
        let seconds = RESEND_TIMEOUT;
        updateTimerDisplay(seconds);
        if (resendBtn) resendBtn.disabled = true;
        countdownInterval = setInterval(() => {
            seconds--;
            updateTimerDisplay(seconds);
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = 'إعادة إرسال الرمز'; }
                if (timerSpan) timerSpan.textContent = '';
            }
        }, 1000);
    }
    function resetCountdown() { clearInterval(countdownInterval); startCountdown(); }
    function updateTimerDisplay(seconds) {
        if (timerSpan) {
            const m = Math.floor(seconds / 60), s = seconds % 60;
            timerSpan.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }
    function getArabicErrorMessage(msg) {
        const map = {
            'Token has expired or is invalid': 'انتهت صلاحية الرمز أو أنه غير صحيح',
            'Invalid OTP': 'رمز التحقق غير صحيح',
            'Email not confirmed': 'البريد الإلكتروني غير مفعل',
            'User not found': 'المستخدم غير موجود'
        };
        return map[msg] || msg || 'حدث خطأ غير معروف';
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
