/**
 * verify-otp.js – v30 (تشخيص كامل + منع توجيه مع أي خطأ)
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
        await updateUserDisplay();
        bindEvents();
        startCountdown();
        updateEmailDisplay();
        setupBackLink();
    }

    async function updateUserDisplay() {
        try {
            let user = null;
            if (window.Auth?.getUser) {
                user = await window.Auth.getUser();
            } else if (supabase) {
                const { data } = await supabase.auth.getUser();
                user = data?.user;
            }
            if (user) {
                const name = user.user_metadata?.full_name || user.email || 'مستخدم';
                document.getElementById('headerUserName').textContent = name;
                document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
            }
        } catch (e) {}
    }

    function bindEvents() { /* نفس الكود السابق */ }
    function getOtpCode() { let code = ''; otpInputs.forEach(i => code += i.value); return code; }
    function checkComplete() { if (verifyBtn) verifyBtn.disabled = getOtpCode().length !== OTP_LENGTH; }
    function showError(msg) { if (errorMsg) { errorMsg.textContent = msg; errorMsg.style.display = 'block'; } if (successMsg) successMsg.style.display = 'none'; }
    function clearMessages() { if (errorMsg) errorMsg.style.display = 'none'; if (successMsg) successMsg.style.display = 'none'; }
    function updateEmailDisplay() {
        const email = sessionStorage.getItem('otpEmail');
        if (email) document.getElementById('instructionEmailText').textContent = email;
    }
    function setupBackLink() {
        const backLink = document.getElementById('backLink');
        if (backLink) backLink.href = document.referrer || '/auth/auth/login/login.html';
    }

    async function createSessionRecord(userId) {
        console.log('📦 [verify-otp] محاولة تسجيل الجلسة...');
        if (!window.SessionManager) {
            console.error('❌ SessionManager غير محمل.');
            return false;
        }
        try {
            let gpsCoords = null;
            if (window.LocationServices?.getGPSCoords) gpsCoords = await window.LocationServices.getGPSCoords();

            let geo = {};
            if (window.LocationServices?.fetchBasicGeo) geo = await window.LocationServices.fetchBasicGeo();

            let loc = {};
            const lat = gpsCoords?.latitude || geo.lat;
            const lon = gpsCoords?.longitude || geo.lon;
            if (lat && lon && window.LocationServices?.fetchLocationIQ) loc = await window.LocationServices.fetchLocationIQ(lat, lon);

            const success = await window.SessionManager.createSessionRecord(userId, {
                geo: geo, locationIQ: loc, gps: gpsCoords, ip: geo.ip
            });

            if (success) {
                console.log('✅ [verify-otp] تم تسجيل الجلسة');
                if (window.SessionManager.deactivateOtherSessions) {
                    await window.SessionManager.deactivateOtherSessions(userId, null);
                }
            } else {
                console.error('❌ [verify-otp] createSessionRecord فشل');
            }
            return success;
        } catch (e) {
            console.error('❌ [verify-otp] استثناء:', e);
            return false;
        }
    }

    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) { showError('يرجى إدخال رمز التحقق كاملاً'); return; }
        clearMessages();
        if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...'; }
        const email = sessionStorage.getItem('otpEmail');

        // إلغاء أي توجيه سابق
        if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }

        let sessionRecorded = false;

        try {
            if (!window.Auth?.verifyOTP) throw new Error('خدمة المصادقة غير متوفرة');
            const data = await window.Auth.verifyOTP(email, code);

            if (data?.session) {
                const sessionCreated = await createSessionRecord(data.session.user.id);
                if (!sessionCreated) {
                    showError('فشل تسجيل الجلسة. يرجى التواصل مع الدعم.');
                    // لا نوجه
                } else {
                    sessionStorage.removeItem('otpEmail');
                    if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...'; successMsg.style.display = 'block'; }
                    sessionRecorded = true;
                }
            } else {
                if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح'; successMsg.style.display = 'block'; }
                if (window.onOtpVerified) window.onOtpVerified(code);
            }
        } catch (error) {
            console.error(error);
            showError(getArabicErrorMessage(error.message));
        } finally {
            if (sessionRecorded) {
                redirectTimer = setTimeout(() => { window.location.href = '/pages/dashboard/index.html'; }, 2000);
            } else {
                if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة'; }
            }
        }
    }

    async function handleResend() { /* نفس الكود السابق */ }
    function startCountdown() { /* ... */ }
    function resetCountdown() { clearInterval(countdownInterval); startCountdown(); }
    function updateTimerDisplay(seconds) { /* ... */ }
    function getArabicErrorMessage(msg) { /* ... */ }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
