/**
 * verify-otp.js – v57 (تحسين معالجة أخطاء OTP البريدي)
 */
(function() {
    const OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300; // 5 دقائق
    let countdownInterval, redirectTimer;

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');
    const backLink = document.getElementById('backLink');

    async function init() {
        updateUserDisplayFromSession();
        bindEvents();
        startCountdown();
        updateEmailDisplay();
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
                    otpInputs[index + 1]?.focus();
                }
                checkComplete();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1]?.focus();
                }
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (digits.length === OTP_LENGTH) {
                    for (let i = 0; i < OTP_LENGTH; i++) otpInputs[i].value = digits[i] || '';
                    checkComplete();
                }
            });
        });
        if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);
        if (resendBtn) resendBtn.addEventListener('click', handleResend);
    }

    function getOtpCode() {
        let code = '';
        otpInputs.forEach(inp => code += inp.value);
        return code;
    }

    function checkComplete() {
        if (verifyBtn) verifyBtn.disabled = getOtpCode().length !== OTP_LENGTH;
    }

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
        if (email) {
            const el = document.getElementById('instructionEmailText');
            if (el) el.textContent = email;
        }
    }

    function clearOtpSession() {
        sessionStorage.removeItem('otpEmail');
        sessionStorage.removeItem('otpName');
        sessionStorage.removeItem('loginMethod');
    }

    async function tryCreateSessionRecord(userId) {
        if (!window.SessionManager) return;
        try {
            const result = await window.SessionManager.createSessionRecord(userId);
            if (result?.success) {
                sessionStorage.setItem('currentSessionId', result.sessionId);
                window.SessionManager.startSessionGuard?.(userId, result.sessionId);
            }
        } catch (e) {
            console.warn('تعذر تسجيل الجلسة:', e);
        }
    }

    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) {
            showError('يرجى إدخال رمز التحقق كاملاً (8 أرقام)');
            return;
        }
        clearMessages();
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const email = sessionStorage.getItem('otpEmail');
            if (!email) throw new Error('انتهت الجلسة. يرجى العودة لصفحة الدخول.');

            console.log('محاولة التحقق من OTP للبريد:', email);
            const data = await window.Auth.verifyOTP(email, code);
            console.log('استجابة verifyOTP:', data);

            if (!data?.session) throw new Error('رمز التحقق غير صحيح');

            const user = data.session.user;
            await tryCreateSessionRecord(user.id);
            clearOtpSession();

            if (successMsg) {
                successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...';
                successMsg.style.display = 'block';
            }

            redirectTimer = setTimeout(() => {
                window.location.href = '/pages/dashboard/index.html';
            }, 3000);
        } catch (error) {
            console.error('خطأ في verifyOTP:', error);
            let message = error.message || 'حدث خطأ';
            if (error.message?.includes('otp_expired')) {
                message = 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.';
            } else if (error.message?.includes('Invalid OTP') || error.message?.includes('Token has expired')) {
                message = 'الرمز غير صحيح أو منتهي الصلاحية. حاول مرة أخرى أو اطلب رمزاً جديداً.';
            }
            showError(message);
            resetBtn();
            // تفريغ الحقول ليتمكن من إدخال رمز جديد
            otpInputs.forEach(inp => inp.value = '');
            otpInputs[0]?.focus();
        }
    }

    async function handleResend() {
        const email = sessionStorage.getItem('otpEmail');
        if (!email) return;
        clearMessages();
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
        try {
            await window.Auth.sendOTP(email);
            if (successMsg) {
                successMsg.textContent = 'تم إرسال رمز جديد';
                successMsg.style.display = 'block';
            }
            resetCountdown();
        } catch (e) {
            showError('فشل الإرسال. تأكد من البريد وحاول لاحقاً.');
        } finally {
            resendBtn.disabled = false;
            resendBtn.textContent = 'إعادة إرسال الرمز';
        }
    }

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
                if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = 'إعادة إرسال الرمز'; }
                if (timerSpan) timerSpan.textContent = '';
                return;
            }
            seconds--;
        };
        update();
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
