/**
 * verify-otp.js – v54 (إصلاح مؤقت إعادة الإرسال + دعم OTP/TOTP)
 */
(function() {
    let OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300; // 5 دقائق
    const TOTP_SESSION_TIMEOUT = 10 * 60 * 1000; // 10 دقائق
    let countdownInterval, redirectTimer, totpTimeout;
    let currentLoginMethod = 'password_otp';

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');
    const backLink = document.getElementById('backLink');

    async function init() {
        currentLoginMethod = sessionStorage.getItem('loginMethod') || 'password_otp';
        configureUI();
        updateUserDisplayFromSession();
        bindEvents();
        if (currentLoginMethod === 'password_otp') {
            startCountdown();
        } else {
            if (timerSpan) timerSpan.style.display = 'none';
            if (resendBtn) resendBtn.style.display = 'none';
            startTOTPSessionTimer();
        }
        updateEmailDisplay();
    }

    function configureUI() {
        if (currentLoginMethod === 'password_totp') {
            OTP_LENGTH = 6;
            const titleEl = document.querySelector('.page-subheader h1');
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-shield-alt"></i> التحقق من المصادقة الثنائية';
            const inst = document.getElementById('instructionText');
            if (inst) inst.textContent = 'أدخل رمز التحقق المكون من 6 أرقام من تطبيق المصادقة.';
            otpInputs.forEach((input, index) => { if (index >= 6) input.style.display = 'none'; });
        }
    }

    function updateUserDisplayFromSession() {
        const name = sessionStorage.getItem('otpName');
        if (name) {
            const nameEl = document.getElementById('headerUserName');
            if (nameEl) nameEl.textContent = name;
            const avatarEl = document.getElementById('headerAvatar');
            if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
        }
    }

    function bindEvents() {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value && index < OTP_LENGTH - 1) {
                    const next = otpInputs[index + 1];
                    if (next && next.style.display !== 'none') next.focus();
                }
                checkComplete();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    const prev = otpInputs[index - 1];
                    if (prev && prev.style.display !== 'none') prev.focus();
                }
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (digits.length === OTP_LENGTH) {
                    for (let i = 0; i < OTP_LENGTH; i++) {
                        if (otpInputs[i] && otpInputs[i].style.display !== 'none') otpInputs[i].value = digits[i] || '';
                    }
                    checkComplete();
                }
            });
        });
        if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);
        if (resendBtn) resendBtn.addEventListener('click', handleResend);

        if (backLink) {
            backLink.addEventListener('click', async (e) => {
                if (currentLoginMethod === 'password_totp') {
                    e.preventDefault();
                    await cancelAndGoBack();
                }
            });
        }
    }

    function startTOTPSessionTimer() {
        clearTimeout(totpTimeout);
        totpTimeout = setTimeout(async () => {
            console.log('⏰ انتهت مهلة جلسة TOTP');
            await cancelAndGoBack();
        }, TOTP_SESSION_TIMEOUT);
    }

    async function cancelAndGoBack() {
        clearTimeout(totpTimeout);
        if (window.Auth?.cancelTOTPLogin) {
            await window.Auth.cancelTOTPLogin();
        }
        clearOtpSession();
        window.location.href = '/auth/auth/login/login.html';
    }

    function getOtpCode() {
        let code = '';
        otpInputs.forEach((inp, i) => { if (i < OTP_LENGTH && inp.style.display !== 'none') code += inp.value; });
        return code;
    }
    function checkComplete() { if (verifyBtn) verifyBtn.disabled = getOtpCode().length !== OTP_LENGTH; }
    function showError(msg) { if (errorMsg) { errorMsg.textContent = msg; errorMsg.style.display = 'block'; } }
    function clearMessages() { if (errorMsg) errorMsg.style.display = 'none'; }

    function updateEmailDisplay() {
        const email = sessionStorage.getItem('otpEmail');
        if (email) { const el = document.getElementById('instructionEmailText'); if (el) el.textContent = email; }
    }

    function clearOtpSession() {
        sessionStorage.removeItem('otpEmail');
        sessionStorage.removeItem('otpName');
        sessionStorage.removeItem('loginMethod');
    }

    async function tryCreateSessionRecord(userId) {
        if (!window.SessionManager) return;
        try {
            let fullLocation = null;
            if (window.LocationServices?.getGPSCoords) {
                const gpsMeta = await window.LocationServices.getGPSCoords();
                const lat = gpsMeta.coords?.latitude, lon = gpsMeta.coords?.longitude;
                if (lat && lon) fullLocation = await window.LocationServices.fetchLocationIQFull(lat, lon, gpsMeta, 'login');
            }
            const result = await window.SessionManager.createSessionRecord(userId, { locationIQ: fullLocation || {} });
            if (result?.success) {
                sessionStorage.setItem('currentSessionId', result.sessionId);
                window.SessionManager.startSessionGuard?.(userId, result.sessionId);
            }
        } catch (e) {
            console.warn('تعذر تسجيل الجلسة، استمرار بدونها:', e);
        }
    }

    async function verifyTOTP(code) {
        const result = await window.Auth.completeLoginWithTOTP(code);
        if (!result?.user) throw new Error('لم يتم الحصول على المستخدم');
        return result.user;
    }

    async function verifyEmailOTP(code) {
        const email = sessionStorage.getItem('otpEmail');
        if (!email) throw new Error('جلسة منتهية');
        const data = await window.Auth.verifyOTP(email, code);
        if (!data?.session) throw new Error('فشل التحقق');
        return data.session.user;
    }

    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) { showError(`يرجى إدخال رمز كامل (${OTP_LENGTH} أرقام)`); return; }
        clearMessages();
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        let userId = null;
        try {
            if (currentLoginMethod === 'password_totp') {
                userId = (await verifyTOTP(code)).id;
            } else {
                userId = (await verifyEmailOTP(code)).id;
            }

            if (userId) {
                await tryCreateSessionRecord(userId);
                clearTimeout(totpTimeout);
                clearOtpSession();
                if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...'; successMsg.style.display = 'block'; }
                if (window.UIHelpers?.showToast) window.UIHelpers.showToast('مرحباً بعودتك!', 'success', 3000);

                redirectTimer = setTimeout(async () => {
                    if (window.Auth?.isSessionValid) {
                        const valid = await window.Auth.isSessionValid();
                        if (!valid) {
                            showError('انتهت الجلسة، يرجى تسجيل الدخول مجدداً.');
                            resetBtn();
                            return;
                        }
                    }
                    window.location.href = '/pages/dashboard/index.html';
                }, 3000);
            }
        } catch (error) {
            showError(error.message || 'حدث خطأ');
            resetBtn();
        }
    }

    async function handleResend() {
        if (currentLoginMethod !== 'password_otp') return;
        const email = sessionStorage.getItem('otpEmail');
        if (!email) return;
        clearMessages();
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
        try {
            await window.Auth.sendOTP(email);
            if (successMsg) { successMsg.textContent = 'تم إرسال رمز جديد'; successMsg.style.display = 'block'; }
            resetCountdown();
        } catch (e) { showError('فشل الإرسال'); }
        finally { resendBtn.disabled = false; resendBtn.textContent = 'إعادة إرسال الرمز'; }
    }

    // 🕒 مؤقت محسّن
    function startCountdown() {
        clearInterval(countdownInterval);
        let seconds = RESEND_TIMEOUT;
        const update = () => {
            if (timerSpan) {
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                timerSpan.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
            }
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'إعادة إرسال الرمز';
                }
                if (timerSpan) timerSpan.textContent = '';
                return;
            }
            seconds--;
        };
        update(); // تحديث فوري
        countdownInterval = setInterval(update, 1000);
    }

    function resetCountdown() {
        clearInterval(countdownInterval);
        startCountdown();
    }

    function resetBtn() {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
