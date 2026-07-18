/**
 * verify-totp.js – v2 (مستقل لصفحة TOTP 6 أرقام، متوافق مع النظام الحالي)
 */
(function() {
    const OTP_LENGTH = 6;
    const TOTP_SESSION_TIMEOUT = 10 * 60 * 1000; // 10 دقائق
    let totpTimeout, redirectTimer;

    const inputs = document.querySelectorAll('#totpFieldsContainer .otp-input');
    const verifyBtn = document.getElementById('verifyTotpBtn');
    const errorEl = document.getElementById('totpError');
    const successEl = document.getElementById('totpSuccess');
    const backLink = document.getElementById('backLink');

    function updateUserDisplay() {
        // جلب اسم العميل من sessionStorage (تم تخزينه من login-totp.js)
        const name = sessionStorage.getItem('otpName');
        const email = sessionStorage.getItem('otpEmail');
        
        if (name) {
            document.getElementById('headerUserName').textContent = name;
            document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
        } else if (email) {
            // استخدام جزء البريد كاسم مؤقت
            const fallbackName = email.split('@')[0];
            document.getElementById('headerUserName').textContent = fallbackName;
            document.getElementById('headerAvatar').textContent = fallbackName.charAt(0).toUpperCase();
        }

        // عرض البريد في مكانه المخصص
        if (email) {
            const emailEl = document.getElementById('instructionEmailText');
            if (emailEl) emailEl.textContent = email;
        }
    }

    function bindEvents() {
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value && index < OTP_LENGTH - 1) {
                    inputs[index + 1]?.focus();
                }
                checkComplete();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1]?.focus();
                }
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

        if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);

        if (backLink) {
            backLink.addEventListener('click', async (e) => {
                e.preventDefault();
                if (window.Auth?.cancelTOTPLogin) await window.Auth.cancelTOTPLogin();
                sessionStorage.removeItem('loginMethod');
                sessionStorage.removeItem('otpEmail');
                sessionStorage.removeItem('otpName');
                window.location.href = '/auth/auth/login/login.html';
            });
        }
    }

    function getCode() {
        let code = '';
        inputs.forEach(inp => code += inp.value);
        return code;
    }

    function checkComplete() {
        if (verifyBtn) verifyBtn.disabled = getCode().length !== OTP_LENGTH;
    }

    function showError(msg) {
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'flex'; }
        if (successEl) successEl.style.display = 'none';
    }

    function clearMessages() {
        if (errorEl) errorEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
    }

    function startTimeout() {
        clearTimeout(totpTimeout);
        totpTimeout = setTimeout(async () => {
            if (window.Auth?.cancelTOTPLogin) await window.Auth.cancelTOTPLogin();
            sessionStorage.removeItem('loginMethod');
            sessionStorage.removeItem('otpEmail');
            sessionStorage.removeItem('otpName');
            window.location.href = '/auth/auth/login/login.html';
        }, TOTP_SESSION_TIMEOUT);
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
        const code = getCode();
        if (code.length !== OTP_LENGTH) return;
        clearMessages();
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            if (!window.Auth || !window.Auth.completeLoginWithTOTP) throw new Error('خدمة المصادقة غير متاحة');
            const result = await window.Auth.completeLoginWithTOTP(code);
            if (result?.user) {
                // تحديث الاسم الحقيقي من بيانات المستخدم إن وجد
                if (result.user.user_metadata?.full_name) {
                    sessionStorage.setItem('otpName', result.user.user_metadata.full_name);
                    document.getElementById('headerUserName').textContent = result.user.user_metadata.full_name;
                    document.getElementById('headerAvatar').textContent = result.user.user_metadata.full_name.charAt(0).toUpperCase();
                }
                
                await tryCreateSessionRecord(result.user.id);
                clearTimeout(totpTimeout);
                sessionStorage.removeItem('loginMethod');
                sessionStorage.removeItem('otpEmail');
                // نبقي otpName لتظهر في Dashboard
                sessionStorage.setItem('otpName', sessionStorage.getItem('otpName') || result.user.email?.split('@')[0]);

                if (successEl) {
                    successEl.textContent = 'تم التحقق بنجاح، جاري تحويلك...';
                    successEl.style.display = 'flex';
                }

                redirectTimer = setTimeout(async () => {
                    // تحقق من صلاحية الجلسة قبل الانتقال
                    if (window.Auth?.isSessionValid) {
                        const valid = await window.Auth.isSessionValid();
                        if (!valid) {
                            showError('انتهت الجلسة، يرجى تسجيل الدخول مجدداً.');
                            verifyBtn.disabled = false;
                            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تحقق';
                            return;
                        }
                    }
                    window.location.href = '/pages/dashboard/index.html';
                }, 3000);
            }
        } catch (error) {
            showError(error.message || 'رمز التحقق غير صحيح');
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تحقق';
        }
    }

    // التهيئة
    updateUserDisplay();
    bindEvents();
    startTimeout();

    window.addEventListener('beforeunload', () => {
        if (totpTimeout) clearTimeout(totpTimeout);
        if (redirectTimer) clearTimeout(redirectTimer);
    });
})();
