/**
 * login.js – v26 (تبويب TOTP: بريد فقط ← تحويل إلى verify-totp.html)
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
        tabPassword.classList.add('active'); tabTOTP.classList.remove('active');
        passwordSection.style.display = 'block'; totpSection.style.display = 'none';
        clearError();
    });
    if (tabTOTP) tabTOTP.addEventListener('click', () => {
        tabTOTP.classList.add('active'); tabPassword.classList.remove('active');
        passwordSection.style.display = 'none'; totpSection.style.display = 'block';
        clearError();
    });

    // --- الدخول بكلمة المرور (يرسل OTP بريدي) ---
    async function handlePasswordLogin(e) {
        if (e) e.preventDefault();
        clearError();
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        if (!email || !password) { showError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
        if (!isValidEmail(email)) { showError('بريد إلكتروني غير صحيح'); return; }
        if (!window.Auth) { showError('خدمة المصادقة غير متاحة'); return; }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        try {
            await window.Auth.loginWithPassword(email, password);
            await window.Auth.sendOTP(email);
            sessionStorage.setItem('loginMethod', 'password_otp');
            sessionStorage.setItem('otpEmail', email);
            sessionStorage.setItem('otpName', email.split('@')[0]);
            window.location.href = '/auth/verify-otp.html';
        } catch (error) {
            console.error('خطأ:', error);
            let message = 'حدث خطأ، حاول مرة أخرى';
            if (error.message?.includes('Invalid login credentials')) message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            showError(message);
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
        }
    }

    // --- تبويب المصادقة الثنائية (بريد فقط) ---
    async function handleTOTPTabSubmit(e) {
        if (e) e.preventDefault();
        clearError();

        const email = totpEmailInput?.value.trim();
        if (!email) { showError('يرجى إدخال البريد الإلكتروني'); return; }
        if (!isValidEmail(email)) { showError('بريد إلكتروني غير صحيح'); return; }
        if (!window.Auth) { showError('خدمة المصادقة غير متاحة'); return; }

        // تخزين البريد والانتقال إلى صفحة إدخال رمز TOTP
        sessionStorage.setItem('otpEmail', email);
        sessionStorage.setItem('otpName', email.split('@')[0]);
        sessionStorage.setItem('loginMethod', 'totp_direct'); // علامة للدخول المباشر عبر TOTP
        window.location.href = '/auth/verify-totp.html';
    }

    if (form) form.addEventListener('submit', handlePasswordLogin);
    if (totpSubmitBtn) totpSubmitBtn.addEventListener('click', handleTOTPTabSubmit);

    // فحص الجلسة عند تحميل الصفحة
    async function checkExistingSession() {
        if (!window.Auth) return;
        try {
            const valid = await window.Auth.isSessionValid();
            if (!valid) return;
            const sessionId = sessionStorage.getItem('currentSessionId');
            const loginMethod = sessionStorage.getItem('loginMethod');
            if (sessionId) {
                window.location.replace('/pages/dashboard/index.html');
            } else if (loginMethod === 'password_totp' || loginMethod === 'totp_direct') {
                window.location.replace('/auth/verify-totp.html');
            } else {
                await window.Auth.logout();
            }
        } catch (e) {}
    }
    window.addEventListener('load', () => setTimeout(checkExistingSession, 300));
})();
