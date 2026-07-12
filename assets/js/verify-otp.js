/**
 * verify-otp.js – منسق خفيف (يستخدم LocationServices, SessionManager, DeviceInfo)
 */
(function() {
    const OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300;
    let supabase, countdownInterval;

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');

    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        bindEvents();
        startCountdown();
    }

    function bindEvents() { /* ... كما هي ... */ }
    function getOtpCode() { let code = ''; otpInputs.forEach(i => code += i.value); return code; }
    function checkComplete() { if (verifyBtn) verifyBtn.disabled = getOtpCode().length !== OTP_LENGTH; }

    function showError(msg) { if (errorMsg) { errorMsg.textContent = msg; errorMsg.style.display = 'block'; } if (successMsg) successMsg.style.display = 'none'; }
    function clearMessages() { if (errorMsg) errorMsg.style.display = 'none'; if (successMsg) successMsg.style.display = 'none'; }

    async function createSessionViaModules(userId) {
        if (!window.LocationServices || !window.SessionManager || !window.DeviceInfo) {
            console.warn('⚠️ بعض الوحدات غير متوفرة');
            return;
        }
        try {
            const gps = await window.LocationServices.getGPSCoords();
            const geo = await window.LocationServices.fetchBasicGeo();
            const lat = gps?.latitude || geo.lat;
            const lon = gps?.longitude || geo.lon;
            const loc = await window.LocationServices.fetchLocationIQ(lat, lon);

            await window.SessionManager.createSessionRecord(userId, { geo, locationIQ: loc, gps, ip: geo.ip });

            // إنهاء الجلسات القديمة بعد إنشاء الجلسة الجديدة
            await window.SessionManager.deactivateOtherSessions(userId, null);
        } catch (e) { console.error('فشل في إنشاء سجل الجلسة:', e); }
    }

    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) { showError('يرجى إدخال رمز التحقق كاملاً'); return; }
        clearMessages();
        if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...'; }
        const email = sessionStorage.getItem('otpEmail');

        try {
            if (!window.Auth?.verifyOTP) throw new Error('خدمة المصادقة غير متوفرة');
            const data = await window.Auth.verifyOTP(email, code);
            if (data?.session) {
                await createSessionViaModules(data.session.user.id);
                sessionStorage.removeItem('otpEmail');
                if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...'; successMsg.style.display = 'block'; }
                setTimeout(() => { window.location.href = '/pages/dashboard/index.html'; }, 2000);
            } else {
                if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح'; successMsg.style.display = 'block'; }
                if (window.onOtpVerified) window.onOtpVerified(code);
                else setTimeout(() => window.location.href = '/pages/dashboard/index.html', 1500);
            }
        } catch (error) {
            console.error(error);
            showError(getArabicErrorMessage(error.message));
            if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة'; }
        }
    }

    async function handleResend() { /* ... كما هي ... */ }
    function startCountdown() { /* ... */ }
    function resetCountdown() { /* ... */ }
    function updateTimerDisplay(seconds) { /* ... */ }
    function getArabicErrorMessage(msg) { /* ... */ }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
