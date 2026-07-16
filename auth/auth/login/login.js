/**
 * login.js – v4 (دعم المصادقة الثنائية + auth.js v15)
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

    let sessionCheckDone = false;
    if (loaderScreen) loaderScreen.style.display = 'none';

    function showError(message) {
        if (errorMsg) {
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
            errorMsg.style.display = 'block';
        }
    }

    function clearError() {
        if (errorMsg) errorMsg.style.display = 'none';
    }

    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        });
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
            showError('خدمة المصادقة غير متاحة مؤقتاً، حاول لاحقاً.');
            return;
        }

        // 🛡️ فحص أمان الشبكة (اختياري)
        if (window.SecurityEnforcer?.enforceSecureConnection) {
            const isSafe = await window.SecurityEnforcer.enforceSecureConnection();
            if (!isSafe) return;
        }

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق من البيانات...';
        }

        try {
            // 1. التحقق من حالة المصادقة الثنائية (إن كانت الخدمة متاحة)
            let totpToken = null;
            try {
                const status = await window.Auth.getTwoFactorStatus();
                if (status && status.two_factor_enabled) {
                    // طلب رمز TOTP من المستخدم
                    totpToken = prompt('أدخل رمز المصادقة الثنائية من تطبيقك:');
                    if (!totpToken || totpToken.length !== 6) {
                        showError('يرجى إدخال رمز المصادقة الثنائية الصحيح.');
                        return;
                    }
                    // التحقق من الرمز عبر Edge Function
                    await window.Auth.verifyTwoFactor(totpToken);
                }
            } catch (e) {
                // إذا فشل الاتصال بـ Edge Function أو كانت 2FA غير مفعلة، نستمر بشكل طبيعي
                console.warn('تعذر التحقق من المصادقة الثنائية:', e);
                // إذا كان الخطأ بسبب رمز خاطئ، نتوقف
                if (e.message?.includes('Invalid TOTP') || e.message?.includes('TOTP')) {
                    showError('رمز المصادقة الثنائية غير صحيح.');
                    return;
                }
                // أي خطأ آخر نستمر فيه (مثل عدم وجود الخدمة)
            }

            // 2. إرسال OTP
            await window.Auth.loginWithPasswordAndOTP(email, password);
            window.location.href = '/auth/verify-otp.html';

        } catch (error) {
            console.error('خطأ:', error);
            let message = 'حدث خطأ، حاول مرة أخرى';
            if (error.message?.includes('Invalid login credentials')) {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            } else if (error.message?.includes('Email not confirmed')) {
                message = 'يرجى تأكيد البريد الإلكتروني أولاً';
            } else if (error.message?.includes('Too many requests')) {
                message = 'محاولات كثيرة، يرجى المحاولة لاحقاً';
            }
            showError(message);
        } finally {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
            }
        }
    }

    if (form) form.addEventListener('submit', handleLogin);
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin(e);
        });
    }

    async function checkExistingSession() {
        if (sessionCheckDone) return;
        sessionCheckDone = true;

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق من الجلسة...';
        }

        try {
            if (window.Auth?.isSessionValid) {
                const valid = await window.Auth.isSessionValid();
                if (valid) {
                    window.location.replace('/pages/dashboard/index.html');
                    return;
                }
            } else {
                const sb = window.teraSupabase || await window.waitForSupabase?.();
                if (sb) {
                    const { data: { user } } = await sb.auth.getUser();
                    if (user) {
                        window.location.replace('/pages/dashboard/index.html');
                        return;
                    }
                }
            }
        } catch (e) {
            // ابق في صفحة الدخول
        } finally {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
            }
        }
    }

    window.addEventListener('load', () => {
        setTimeout(checkExistingSession, 300);
    });
})();
