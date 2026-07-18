/**
 * verify-totp.js – v4 (يدعم totp_direct + password_totp)
 */
(function() {
    const OTP_LENGTH = 6;
    const TOTP_SESSION_TIMEOUT = 10 * 60 * 1000;
    let totpTimeout, redirectTimer;

    const inputs = document.querySelectorAll('#totpFieldsContainer .otp-input');
    const verifyBtn = document.getElementById('verifyTotpBtn');
    const errorEl = document.getElementById('totpError');
    const successEl = document.getElementById('totpSuccess');
    const backLink = document.getElementById('backLink');

    function updateUserDisplay() {
        const name = sessionStorage.getItem('otpName');
        const email = sessionStorage.getItem('otpEmail');
        const displayName = name || (email ? email.split('@')[0] : 'مستخدم');
        document.getElementById('headerUserName').textContent = displayName;
        document.getElementById('headerAvatar').textContent = displayName.charAt(0).toUpperCase();
    }

    function showEmail() {
        const email = sessionStorage.getItem('otpEmail');
        if (email) {
            document.getElementById('instructionEmailText').textContent = email;
        } else {
            showError('انتهت الجلسة. يرجى العودة لصفحة الدخول.');
            if (verifyBtn) verifyBtn.disabled = true; // منع الإدخال
        }
    }

    function getCode() { let code = ''; inputs.forEach(i => code += i.value); return code; }
    function checkComplete() { if (verifyBtn) verifyBtn.disabled = getCode().length !== OTP_LENGTH; }
    function showError(msg) {
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'flex'; }
        if (successEl) successEl.style.display = 'none';
    }
    function clearMessages() {
        if (errorEl) errorEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
    }

    // أحداث الحقول
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value && index < OTP_LENGTH - 1) inputs[index + 1]?.focus();
            checkComplete();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) inputs[index - 1]?.focus();
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
            if (digits.length === OTP_LENGTH) {
                for (let i = 0; i < OTP_LENGTH; i++) inputs[i].value = digits[i] || '';
                checkComplete();
            }
        });
    });

    verifyBtn.addEventListener('click', async () => {
        const code = getCode();
        if (code.length !== OTP_LENGTH) return;
        clearMessages();
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const email = sessionStorage.getItem('otpEmail');
            if (!email) throw new Error('البريد الإلكتروني غير متوفر');

            const loginMethod = sessionStorage.getItem('loginMethod');

            if (loginMethod === 'password_totp') {
                // يوجد جلسة – استخدم completeLoginWithTOTP
                const result = await window.Auth.completeLoginWithTOTP(code);
                if (!result?.user) throw new Error('فشل التحقق');
                await tryCreateSessionRecord(result.user.id);
                // تحديث الاسم الحقيقي إن وُجد
                if (result.user.user_metadata?.full_name) {
                    sessionStorage.setItem('otpName', result.user.user_metadata.full_name);
                }
            } else {
                // دخول مباشر من تبويب TOTP (totp_direct) – استخدم loginWithTOTP
                await window.Auth.loginWithTOTP(email, code);
                // بعد تسجيل الدخول، نجلب المستخدم لإنشاء سجل الجلسة
                const user = await window.Auth.getUser();
                if (user) {
                    await tryCreateSessionRecord(user.id);
                    if (user.user_metadata?.full_name) {
                        sessionStorage.setItem('otpName', user.user_metadata.full_name);
                    }
                }
            }

            clearTimeout(totpTimeout);
            sessionStorage.removeItem('loginMethod');
            sessionStorage.removeItem('otpEmail');
            // ابقاء otpName للوحة التحكم

            if (successEl) {
                successEl.textContent = 'تم التحقق بنجاح، جاري تحويلك...';
                successEl.style.display = 'flex';
            }
            setTimeout(() => { window.location.href = '/pages/dashboard/index.html'; }, 3000);
        } catch (error) {
            showError(error.message || 'رمز التحقق غير صحيح');
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تحقق';
        }
    });

    async function tryCreateSessionRecord(userId) {
        if (!window.SessionManager) return;
        try {
            const result = await window.SessionManager.createSessionRecord(userId);
            if (result?.success) {
                sessionStorage.setItem('currentSessionId', result.sessionId);
                window.SessionManager.startSessionGuard?.(userId, result.sessionId);
            }
        } catch (e) {}
    }

    function startTimeout() {
        totpTimeout = setTimeout(async () => {
            if (window.Auth?.cancelTOTPLogin) await window.Auth.cancelTOTPLogin();
            sessionStorage.removeItem('loginMethod');
            sessionStorage.removeItem('otpEmail');
            sessionStorage.removeItem('otpName');
            window.location.href = '/auth/auth/login/login.html';
        }, TOTP_SESSION_TIMEOUT);
    }

    if (backLink) {
        backLink.addEventListener('click', async (e) => {
            e.preventDefault();
            if (window.Auth?.cancelTOTPLogin) await window.Auth.cancelTOTPLogin();
            sessionStorage.removeItem('loginMethod');
            sessionStorage.removeItem('otpEmail');
            sessionStorage.removeItem('otpName');
            window.location.href = backLink.href;
        });
    }

    window.addEventListener('beforeunload', () => { if (totpTimeout) clearTimeout(totpTimeout); });

    // التهيئة
    updateUserDisplay();
    showEmail();
    startTimeout();
})();
