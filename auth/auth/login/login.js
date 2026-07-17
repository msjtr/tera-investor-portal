/**
 * login.js – v27 (تبويب TOTP يعمل بكلمة مرور + تحويل إلى verify-totp.html)
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

    // عناصر تبويب TOTP (سنعيد توظيفها)
    const tabPassword = document.getElementById('tabPassword');
    const tabTOTP = document.getElementById('tabTOTP');
    const passwordSection = document.getElementById('passwordSection');
    const totpSection = document.getElementById('totpSection');
    // سنضيف حقول جديدة لتبويب TOTP
    const totpEmailInput = document.getElementById('totpEmail');
    const totpPasswordInput = document.getElementById('totpPassword'); // حقل كلمة المرور الجديد
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

    // --- الدخول بكلمة المرور (يرسل OTP بريدي دائمًا) ---
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
            const result = await window.Auth.loginWithPassword(email, password);
            if (result.requiresTwoFactor) {
                // المستخدم مفعل TOTP – ننتقل إلى صفحة TOTP
                sessionStorage.setItem('loginMethod', 'password_totp');
                sessionStorage.setItem('otpEmail', email);
                sessionStorage.setItem('otpName', email.split('@')[0]);
                window.location.href = '/auth/verify-totp.html';
                return;
            }
            // لا TOTP – نرسل OTP بريدي
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

    // --- تبويب المصادقة الثنائية (بريد + كلمة مرور) ---
    async function handleTOTPTabSubmit(e) {
        if (e) e.preventDefault();
        clearError();

        const email = totpEmailInput?.value.trim();
        const password = totpPasswordInput?.value.trim();
        if (!email || !password) { showError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
        if (!isValidEmail(email)) { showError('بريد إلكتروني غير صحيح'); return; }
        if (!window.Auth) { showError('خدمة المصادقة غير متاحة'); return; }

        totpSubmitBtn.disabled = true;
        totpSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        try {
            // تسجيل الدخول بالبريد وكلمة المرور (مع فحص TOTP)
            const result = await window.Auth.loginWithPassword(email, password);

            if (!result.requiresTwoFactor) {
                // هذا المستخدم ليس لديه TOTP مفعلة، أبلغه
                showError('المصادقة الثنائية غير مفعلة لحسابك. الرجاء استخدام تبويب كلمة المرور.');
                return;
            }

            // المستخدم مفعل TOTP – خزّن البيانات وانتقل إلى صفحة TOTP
            sessionStorage.setItem('loginMethod', 'password_totp');
            sessionStorage.setItem('otpEmail', email);
            sessionStorage.setItem('otpName', email.split('@')[0]);
            window.location.href = '/auth/verify-totp.html';
        } catch (error) {
            console.error('خطأ:', error);
            let message = 'حدث خطأ، حاول مرة أخرى';
            if (error.message?.includes('Invalid login credentials')) message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            showError(message);
        } finally {
            totpSubmitBtn.disabled = false;
            totpSubmitBtn.innerHTML = '<i class="fas fa-shield-alt"></i> متابعة إلى التحقق';
        }
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
            } else if (loginMethod === 'password_totp') {
                window.location.replace('/auth/verify-totp.html');
            } else {
                await window.Auth.logout();
            }
        } catch (e) {}
    }
    window.addEventListener('load', () => setTimeout(checkExistingSession, 300));
})();
