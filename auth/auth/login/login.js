/**
 * login.js – v16 (يدعم تبويب كلمة المرور وتبويب TOTP، مع تحسين إعادة التوجيه)
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

    // عناصر التبويب الثاني
    const tabPassword = document.getElementById('tabPassword');
    const tabTOTP = document.getElementById('tabTOTP');
    const passwordSection = document.getElementById('passwordSection');
    const totpSection = document.getElementById('totpSection');
    const totpEmailInput = document.getElementById('totpEmail');
    const totpTokenOnly = document.getElementById('totpTokenOnly');
    const totpSubmitBtn = document.getElementById('totpSubmitBtn');

    if (loaderScreen) loaderScreen.style.display = 'none';

    let activeTab = 'password';

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

    // تبديل التبويبات
    if (tabPassword) {
        tabPassword.addEventListener('click', () => {
            activeTab = 'password';
            tabPassword.classList.add('active');
            tabTOTP.classList.remove('active');
            passwordSection.style.display = 'block';
            totpSection.style.display = 'none';
            clearError();
        });
    }
    if (tabTOTP) {
        tabTOTP.addEventListener('click', () => {
            activeTab = 'totp';
            tabTOTP.classList.add('active');
            tabPassword.classList.remove('active');
            passwordSection.style.display = 'none';
            totpSection.style.display = 'block';
            clearError();
        });
    }

    // معالج الدخول بكلمة المرور
    async function handlePasswordLogin(e) {
        if (e) e.preventDefault();
        clearError();

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        if (!email || !password) { showError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
        if (!isValidEmail(email)) { showError('يرجى إدخال بريد إلكتروني صحيح'); return; }
        if (!window.Auth) { showError('خدمة المصادقة غير متاحة'); return; }

        // إلغاء أي جلسة TOTP معلقة من محاولة سابقة
        const pendingTOTP = sessionStorage.getItem('loginMethod') === 'password_totp';
        if (pendingTOTP) {
            try { await window.Auth.cancelTOTPLogin(); } catch(e) {}
            ['loginMethod', 'otpEmail', 'otpName'].forEach(k => sessionStorage.removeItem(k));
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

            // دخول مباشر ناجح – نحاول تسجيل جلسة (اختياري) ثم الانتقال للوحة التحكم
            if (window.SessionManager) {
                try {
                    const user = result.user || await window.Auth.getUser();
                    if (user) {
                        const sessionResult = await window.SessionManager.createSessionRecord(user.id);
                        if (sessionResult?.success) {
                            sessionStorage.setItem('currentSessionId', sessionResult.sessionId);
                            window.SessionManager.startSessionGuard?.(user.id, sessionResult.sessionId);
                        }
                    }
                } catch (e) { console.warn('تعذر تسجيل الجلسة، الاستمرار بدونها.'); }
            }
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

    // معالج الدخول المباشر بـ TOTP
    async function handleTOTPLogin(e) {
        if (e) e.preventDefault();
        clearError();

        const email = totpEmailInput?.value.trim();
        const token = totpTokenOnly?.value.trim();
        if (!email || !token) { showError('يرجى إدخال البريد الإلكتروني ورمز المصادقة'); return; }
        if (!window.Auth) { showError('خدمة المصادقة غير متاحة'); return; }

        totpSubmitBtn.disabled = true;
        totpSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            await window.Auth.loginWithTOTP(email, token);
            // loginWithTOTP تقوم بضبط الجلسة داخلياً، نحاول تسجيلها
            if (window.SessionManager) {
                try {
                    const user = await window.Auth.getUser();
                    if (user) {
                        const sessionResult = await window.SessionManager.createSessionRecord(user.id);
                        if (sessionResult?.success) {
                            sessionStorage.setItem('currentSessionId', sessionResult.sessionId);
                            window.SessionManager.startSessionGuard?.(user.id, sessionResult.sessionId);
                        }
                    }
                } catch (e) { console.warn('تعذر تسجيل الجلسة.'); }
            }
            window.location.href = '/pages/dashboard/index.html';
        } catch (error) {
            console.error('خطأ:', error);
            showError(error.message || 'فشل تسجيل الدخول. تأكد من الرمز.');
        } finally {
            totpSubmitBtn.disabled = false;
            totpSubmitBtn.innerHTML = '<i class="fas fa-shield-alt"></i> تسجيل الدخول';
        }
    }

    if (form) form.addEventListener('submit', handlePasswordLogin);
    if (totpSubmitBtn) totpSubmitBtn.addEventListener('click', handleTOTPLogin);

    async function checkExistingSession() {
        try {
            if (window.Auth?.isSessionValid) {
                const valid = await window.Auth.isSessionValid();
                if (valid) window.location.replace('/pages/dashboard/index.html');
            }
        } catch (e) {}
    }
    window.addEventListener('load', () => setTimeout(checkExistingSession, 300));
})();
