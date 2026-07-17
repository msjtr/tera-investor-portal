/**
 * login.js – v24 (يعيد إرسال OTP بريدي للمستخدمين غير المفعلين TOTP)
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

    // عناصر التبويب TOTP
    const tabPassword = document.getElementById('tabPassword');
    const tabTOTP = document.getElementById('tabTOTP');
    const passwordSection = document.getElementById('passwordSection');
    const totpSection = document.getElementById('totpSection');
    const totpEmailInput = document.getElementById('totpEmail');
    const totpTokenOnly = document.getElementById('totpTokenOnly');
    const totpSubmitBtn = document.getElementById('totpSubmitBtn');

    if (loaderScreen) loaderScreen.style.display = 'none';

    function showError(msg) {
        if (errorMsg) {
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
            errorMsg.style.display = 'block';
        }
    }
    function clearError() { if (errorMsg) errorMsg.style.display = 'none'; }

    if (togglePassword) {
        togglePassword.addEventListener('change', function() {
            const type = this.checked ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = this.nextElementSibling?.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye', !this.checked);
                icon.classList.toggle('fa-eye-slash', this.checked);
            }
        });
    }

    function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

    // تبديل التبويبات
    if (tabPassword) tabPassword.addEventListener('click', () => {
        tabPassword.classList.add('active');
        tabTOTP.classList.remove('active');
        passwordSection.style.display = 'block';
        totpSection.style.display = 'none';
        clearError();
    });
    if (tabTOTP) tabTOTP.addEventListener('click', () => {
        tabTOTP.classList.add('active');
        tabPassword.classList.remove('active');
        passwordSection.style.display = 'none';
        totpSection.style.display = 'block';
        clearError();
    });

    // ضمان وجود Auth
    async function waitForAuth(timeout = 5000) {
        if (window.Auth) return true;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (window.Auth) return true;
        }
        return false;
    }

    // معالج الدخول بكلمة المرور
    async function handlePasswordLogin(e) {
        if (e) e.preventDefault();
        clearError();

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        if (!email || !password) { showError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
        if (!isValidEmail(email)) { showError('بريد إلكتروني غير صحيح'); return; }
        if (!await waitForAuth()) { showError('خدمة المصادقة غير متاحة'); return; }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const result = await window.Auth.loginWithPassword(email, password);

            if (result.requiresTwoFactor) {
                // المستخدم مفعّل TOTP → انتقل إلى صفحة TOTP
                sessionStorage.setItem('loginMethod', 'password_totp');
                sessionStorage.setItem('otpEmail', email);
                sessionStorage.setItem('otpName', email.split('@')[0]);
                window.location.href = '/auth/verify-totp.html';
                return;
            }

            // لا توجد TOTP → أرسل OTP بريدي وانتقل إلى صفحة OTP
            await window.Auth.sendOTP(email);
            sessionStorage.setItem('loginMethod', 'password_otp');
            sessionStorage.setItem('otpEmail', email);
            sessionStorage.setItem('otpName', email.split('@')[0]);
            window.location.href = '/auth/verify-otp.html';

        } catch (error) {
            console.error('خطأ:', error);
            let message = error.message || 'حدث خطأ';
            if (error.message?.includes('Invalid login credentials')) {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            }
            showError(message);
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
        }
    }

    // معالج تبويب TOTP المباشر
    async function handleTOTPLogin(e) {
        if (e) e.preventDefault();
        clearError();

        const email = totpEmailInput?.value.trim();
        const token = totpTokenOnly?.value.trim();
        if (!email || !token) { showError('يرجى إدخال البريد ورمز المصادقة'); return; }
        if (!await waitForAuth()) { showError('خدمة المصادقة غير متاحة'); return; }

        totpSubmitBtn.disabled = true;
        totpSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        try {
            await window.Auth.loginWithTOTP(email, token);
            window.location.href = '/pages/dashboard/index.html';
        } catch (error) {
            showError(error.message || 'فشل تسجيل الدخول');
        } finally {
            totpSubmitBtn.disabled = false;
            totpSubmitBtn.innerHTML = '<i class="fas fa-shield-alt"></i> تسجيل الدخول';
        }
    }

    if (form) form.addEventListener('submit', handlePasswordLogin);
    if (totpSubmitBtn) totpSubmitBtn.addEventListener('click', handleTOTPLogin);

    // فحص الجلسة عند تحميل صفحة الدخول
    async function checkExistingSession() {
        if (!window.Auth) await waitForAuth(2000);
        if (!window.Auth) return;

        try {
            const valid = await window.Auth.isSessionValid();
            if (!valid) return;

            const sessionId = sessionStorage.getItem('currentSessionId');
            const loginMethod = sessionStorage.getItem('loginMethod');

            if (sessionId) {
                window.location.replace('/pages/dashboard/index.html');
            } else if (loginMethod === 'password_totp') {
                window.location.replace('/auth/verify-totp.html');
            } else {
                // جلسة قديمة → إنهاء
                await window.Auth.logout();
            }
        } catch (e) {
            console.warn('تعذر فحص الجلسة:', e);
        }
    }

    window.addEventListener('load', () => setTimeout(checkExistingSession, 300));
})();
