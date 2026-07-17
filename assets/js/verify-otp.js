/**
 * verify-otp.js – v52 (الخيار الرابع: مؤقت 10 دقائق، تنظيف الجلسة عند الإلغاء أو انتهاء الوقت)
 */
(function() {
    let OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300;
    const TOTP_SESSION_TIMEOUT = 10 * 60 * 1000; // 10 دقائق بالمللي ثانية
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
            startTOTPSessionTimer(); // بدء مؤقت انتهاء الجلسة
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

    // بدء مؤقت انتهاء صلاحية جلسة TOTP (10 دقائق)
    function startTOTPSessionTimer() {
        clearTimeout(totpTimeout);
        totpTimeout = setTimeout(async () => {
            console.log('⏰ انتهت مهلة جلسة TOTP');
            await cancelAndGoBack();
        }, TOTP_SESSION_TIMEOUT);
    }

    // إلغاء الجلسة والعودة إلى صفحة الدخول
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

    async function createSessionRecord(userId) {
        if (!window.SessionManager) return null;
        let fullLocation = null;
        try {
            if (window.LocationServices?.getGPSCoords) {
                const gpsMeta = await window.LocationServices.getGPSCoords();
                const lat = gpsMeta.coords?.latitude, lon = gpsMeta.coords?.longitude;
                if (lat && lon) fullLocation = await window.LocationServices.fetchLocationIQFull(lat, lon, gpsMeta, 'login');
            }
        } catch (e) {}
        const extraData = { locationIQ: fullLocation || {} };
        try {
            const result = await window.SessionManager.createSessionRecord(userId, extraData);
            if (result?.success) {
                sessionStorage.setItem('currentSessionId', result.sessionId);
                window.SessionManager.startSessionGuard?.(userId, result.sessionId);
                return result.sessionId;
            }
        } catch (e) {}
        return null;
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

        let sessionRecorded = false, userId = null;
        try {
            if (currentLoginMethod === 'password_totp') {
                userId = (await verifyTOTP(code)).id;
            } else {
                userId = (await verifyEmailOTP(code)).id;
            }

            if (userId) {
                const sessionId = await createSessionRecord(userId);
                if (sessionId) {
                    clearTimeout(totpTimeout);
                    clearOtpSession();
                    if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...'; successMsg.style.display = 'block'; }
                    if (window.UIHelpers?.showToast) window.UIHelpers.showToast('مرحباً بعودتك!', 'success', 3000);
                    sessionRecorded = true;
                } else showError('فشل تسجيل الجلسة.');
            }
        } catch (error) {
            showError(error.message || 'حدث خطأ');
        } finally {
            if (sessionRecorded) {
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
            } else resetBtn();
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

    function startCountdown() {
        let seconds = RESEND_TIMEOUT;
        const update = () => {
            if (timerSpan) timerSpan.textContent = `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = 'إعادة إرسال الرمز'; }
                if (timerSpan) timerSpan.textContent = '';
            }
            seconds--;
        };
        update();
        countdownInterval = setInterval(update, 1000);
    }
    function resetCountdown() { clearInterval(countdownInterval); startCountdown(); }
    function resetBtn() { verifyBtn.disabled = false; verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة'; }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
