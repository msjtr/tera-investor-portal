/**
 * verify-otp.js – v36 (استخدام fetchLocationIQFull + تخزين كامل للموقع)
 */
(function() {
    const OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300;

    let supabase;
    let countdownInterval;
    let redirectTimer = null;

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');

    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        updateUserDisplayFromSession();
        await updateUserDisplayFromAuth();
        bindEvents();
        startCountdown();
        updateEmailDisplay();
        setupBackLink();
    }

    function updateUserDisplayFromSession() {
        const name = sessionStorage.getItem('otpName');
        if (name) {
            document.getElementById('headerUserName').textContent = name;
            document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
        }
    }

    async function updateUserDisplayFromAuth() {
        try {
            let user = null;
            if (window.Auth?.getUser) user = await window.Auth.getUser();
            else if (supabase) { const { data } = await supabase.auth.getUser(); user = data?.user; }
            if (user) {
                const name = user.user_metadata?.full_name || user.email || 'مستخدم';
                document.getElementById('headerUserName').textContent = name;
                document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
            }
        } catch (e) {}
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

    function updateEmailDisplay() {
        const email = sessionStorage.getItem('otpEmail');
        if (email) document.getElementById('instructionEmailText').textContent = email;
    }

    function setupBackLink() {
        const backLink = document.getElementById('backLink');
        if (backLink) backLink.href = document.referrer || '/auth/auth/login/login.html';
    }

    // ── إنشاء سجل الجلسة مع بيانات LocationIQ الكاملة ──
    async function createSessionRecord(userId) {
        console.log('📦 [verify-otp] محاولة تسجيل الجلسة...');
        if (!window.SessionManager) {
            console.error('❌ SessionManager غير محمل.');
            return false;
        }

        let gpsMeta = { status: 'FAILED' };
        let fullLocation = null;

        try {
            // الحصول على إحداثيات GPS (إن أمكن)
            if (window.LocationServices?.getGPSCoords) {
                gpsMeta = await window.LocationServices.getGPSCoords();
            }
            // استدعاء LocationIQ عبر الخادم (أو المفتاح العام حسب الإعداد)
            const lat = gpsMeta.coords?.latitude || null;
            const lon = gpsMeta.coords?.longitude || null;
            if (lat && lon && window.LocationServices?.fetchLocationIQFull) {
                fullLocation = await window.LocationServices.fetchLocationIQFull(lat, lon, gpsMeta, 'auto_login');
            }
        } catch (e) {
            console.warn('⚠️ تعذر جمع بيانات الموقع، استمرار بدونها.');
        }

        try {
            const success = await window.SessionManager.createSessionRecord(userId, {
                geo: {},                         // لم نعد نستخدم IP
                locationIQ: fullLocation || {}, // الكائن الكامل
                gps: gpsMeta.coords || null,
                ip: null
            });

            if (success) {
                console.log('✅ [verify-otp] تم تسجيل الجلسة');
                if (window.SessionManager.deactivateOtherSessions) {
                    await window.SessionManager.deactivateOtherSessions(userId);
                }
            } else {
                console.error('❌ [verify-otp] createSessionRecord فشل');
            }
            return success;
        } catch (e) {
            console.error('❌ [verify-otp] استثناء أثناء تسجيل الجلسة:', e);
            return false;
        }
    }

    async function handleVerify() { /* ... مطابق للإصدار السابق ... */ }
    async function handleResend() { /* ... مطابق للإصدار السابق ... */ }
    function startCountdown() { /* ... */ }
    function resetCountdown() { clearInterval(countdownInterval); startCountdown(); }
    function updateTimerDisplay(seconds) { /* ... */ }
    function getArabicErrorMessage(msg) { /* ... */ }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
