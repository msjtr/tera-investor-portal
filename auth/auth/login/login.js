/**
 * login.js – v14 (تحسين: إلغاء الجلسة فقط إذا كانت TOTP معلقة)
 */
(function() {
    if (window.__loginInitialized) return;
    window.__loginInitialized = true;

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');
    const togglePassword = document.getElementById('togglePassword');
    const loaderScreen = document.getElementById('creativeLoaderScreen');

    if (loaderScreen) loaderScreen.style.display = 'none';

    function showError(msg) {
        if (errorMsg) {
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
            errorMsg.style.display = 'block';
        }
    }
    function clearError() { if (errorMsg) errorMsg.style.display = 'none'; }

    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = this.querySelector('i');
            if (icon) { icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash'); }
        });
    }

    function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

    // تنظيف بيانات OTP المؤقتة
    function clearOtpSession() {
        sessionStorage.removeItem('loginMethod');
        sessionStorage.removeItem('otpEmail');
        sessionStorage.removeItem('otpName');
    }

    async function handleLogin(e) {
        if (e) e.preventDefault();
        clearError();

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        if (!email || !password) {
            showError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }
        if (!isValidEmail(email)) {
            showError('يرجى إدخال بريد إلكتروني صحيح');
            return;
        }
        if (!window.Auth) {
            showError('خدمة المصادقة غير متاحة مؤقتاً');
            return;
        }

        if (window.SecurityEnforcer?.enforceSecureConnection) {
            const isSafe = await window.SecurityEnforcer.enforceSecureConnection();
            if (!isSafe) return;
        }

        // إلغاء جلسة TOTP معلقة فقط إذا كان المستخدم في منتصف عملية TOTP
        const pendingTOTP = sessionStorage.getItem('loginMethod') === 'password_totp';
        if (pendingTOTP) {
            try {
                const session = await window.Auth.getSession();
                if (session) {
                    console.log('🔁 إلغاء جلسة TOTP المعلقة قبل بدء تسجيل دخول جديد.');
                    await window.Auth.cancelTOTPLogin();
                }
            } catch (e) {
                // إذا فشل إلغاء الجلسة، نستمر لأنها ربما لم تعد موجودة
            }
            clearOtpSession();
        }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const result = await window.Auth.loginWithPassword(email, password);

            if (result.requiresTwoFactor) {
                sessionStorage.setItem('loginMethod', 'password_totp');
                sessionStorage.setItem('otpEmail', email);
                sessionStorage.setItem('otpName', email.split('@')[0]);
                window.location.href = '/auth/verify-otp.html';
                return;
            }

            // دخول مباشر
            window.location.href = '/pages/dashboard/index.html';
        } catch (error) {
            console.error('خطأ:', error);
            let message = 'حدث خطأ، حاول مرة أخرى';
            if (error.message?.includes('Invalid login credentials')) {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            } else if (error.message?.includes('تجاوز عدد المحاولات')) {
                message = error.message;
            } else if (error.message?.includes('Email not confirmed')) {
                message = 'يرجى تأكيد البريد الإلكتروني أولاً';
            }
            showError(message);
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
        }
    }

    if (form) form.addEventListener('submit', handleLogin);

    async function checkExistingSession() {
        try {
            const valid = window.Auth?.isSessionValid && await window.Auth.isSessionValid();
            if (valid) window.location.replace('/pages/dashboard/index.html');
        } catch (e) {}
    }
    window.addEventListener('load', () => setTimeout(checkExistingSession, 300));
})();
