/**
 * login.js – v19 (إرسال OTP بريدي عند الدخول العادي، توجيه إلى verify-otp.html)
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

    // عناصر التبويب الثاني (TOTP) – ستبقى موجودة لكن لن تستخدم في هذا الإصدار
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

    // تبديل التبويبات (لن نستخدمها كثيرًا)
    if (tabPassword) {
        tabPassword.addEventListener('click', () => {
            tabPassword.classList.add('active');
            tabTOTP.classList.remove('active');
            passwordSection.style.display = 'block';
            totpSection.style.display = 'none';
            clearError();
        });
    }
    if (tabTOTP) {
        tabTOTP.addEventListener('click', () => {
            tabTOTP.classList.add('active');
            tabPassword.classList.remove('active');
            passwordSection.style.display = 'none';
            totpSection.style.display = 'block';
            clearError();
        });
    }

    async function handlePasswordLogin(e) {
        if (e) e.preventDefault();
        clearError();

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        if (!email || !password) { showError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
        if (!isValidEmail(email)) { showError('يرجى إدخال بريد إلكتروني صحيح'); return; }
        if (!window.Auth) { showError('خدمة المصادقة غير متاحة'); return; }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            // التحقق من صحة كلمة المرور (دون متابعة TOTP)
            await window.Auth.checkPasswordAnd2FA(email, password);
            // إرسال OTP بريدي
            await window.Auth.sendOTP(email);
            // تخزين البيانات والتوجيه إلى صفحة OTP
            sessionStorage.setItem('otpEmail', email);
            sessionStorage.setItem('otpName', email.split('@')[0]);
            sessionStorage.setItem('loginMethod', 'password_otp');
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

    // معالج الدخول المباشر بـ TOTP (يبقى اختياريًا)
    async function handleTOTPLogin(e) {
        if (e) e.preventDefault();
        clearError();
        const email = totpEmailInput?.value.trim();
        const token = totpTokenOnly?.value.trim();
        if (!email || !token) { showError('يرجى إدخال البريد ورمز المصادقة'); return; }
        if (!window.Auth) { showError('خدمة المصادقة غير متاحة'); return; }

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

    async function checkExistingSession() {
        try {
            const valid = window.Auth?.isSessionValid && await window.Auth.isSessionValid();
            if (valid) window.location.replace('/pages/dashboard/index.html');
        } catch (e) {}
    }
    window.addEventListener('load', () => setTimeout(checkExistingSession, 300));
})();
