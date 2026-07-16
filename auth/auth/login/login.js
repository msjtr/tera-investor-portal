/**
 * login.js – v5 (متوافقة مع auth.js v19 – دعم تسجيل الدخول الذكي)
 * - تبويب كلمة المرور: يستخدم Auth.loginWithPassword (يفحص المخاطر ويفرض 2FA تلقائياً)
 * - تبويب TOTP: يستخدم Auth.loginWithTOTP (دخول مباشر برمز المصادقة)
 */
(function() {
    if (window.__loginInitialized) return;
    window.__loginInitialized = true;

    // ─── العناصر ──────────────────────────────────────
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const totpInput = document.getElementById('totp');          // 🆕 حقل اختياري لرمز TOTP
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');
    const togglePassword = document.getElementById('togglePassword');
    const loaderScreen = document.getElementById('creativeLoaderScreen');

    // تبويبات
    const tabPassword = document.getElementById('tabPassword');
    const tabTOTP = document.getElementById('tabTOTP');
    const passwordSection = document.getElementById('passwordSection');
    const totpSection = document.getElementById('totpSection');
    const totpEmailInput = document.getElementById('totpEmail');

    let activeMode = 'password'; // 'password' أو 'totp'

    let sessionCheckDone = false;
    if (loaderScreen) loaderScreen.style.display = 'none';

    // ─── دوال مساعدة ─────────────────────────────────
    function showError(message) {
        if (errorMsg) {
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
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

    // ─── تبديل التبويبات ─────────────────────────────
    function switchMode(mode) {
        activeMode = mode;
        clearError();
        if (tabPassword && tabTOTP && passwordSection && totpSection) {
            if (mode === 'password') {
                tabPassword.classList.add('active');
                tabTOTP.classList.remove('active');
                passwordSection.style.display = 'block';
                totpSection.style.display = 'none';
            } else {
                tabTOTP.classList.add('active');
                tabPassword.classList.remove('active');
                passwordSection.style.display = 'none';
                totpSection.style.display = 'block';
            }
        }
    }

    if (tabPassword) tabPassword.addEventListener('click', () => switchMode('password'));
    if (tabTOTP) tabTOTP.addEventListener('click', () => switchMode('totp'));

    // ─── تسجيل الدخول بكلمة المرور ──────────────────
    async function handlePasswordLogin(e) {
        if (e) e.preventDefault();
        clearError();

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        const totpToken = totpInput?.value.trim() || null;

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

        if (window.SecurityEnforcer?.enforceSecureConnection) {
            const isSafe = await window.SecurityEnforcer.enforceSecureConnection();
            if (!isSafe) return;
        }

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        }

        try {
            // استخدام الدالة الذكية loginWithPassword (تفحص المخاطر وتطلب TOTP إن لزم)
            await window.Auth.loginWithPassword(email, password, totpToken);
            // نجاح – انتقل إلى OTP أو اللوحة (حسب إعدادات النظام)
            window.location.href = '/auth/verify-otp.html';
        } catch (error) {
            console.error('خطأ:', error);
            let message = 'حدث خطأ، حاول مرة أخرى';
            if (error.message === 'TOTP_REQUIRED') {
                // النظام طلب رمز TOTP، نطلب من المستخدم إدخاله
                const code = prompt('مطلوب رمز المصادقة الثنائية. أدخل الرمز من تطبيقك:');
                if (code && code.length === 6) {
                    // إعادة المحاولة مع الرمز
                    if (loginBtn) loginBtn.disabled = false;
                    await handlePasswordLoginWithTOTP(email, password, code);
                    return;
                } else {
                    message = 'يجب إدخال رمز المصادقة الثنائية للمتابعة.';
                }
            } else if (error.message?.includes('Invalid login credentials')) {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            } else if (error.message?.includes('تجاوز عدد المحاولات')) {
                message = error.message;
            } else if (error.message?.includes('Email not confirmed')) {
                message = 'يرجى تأكيد البريد الإلكتروني أولاً';
            }
            showError(message);
        } finally {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
            }
        }
    }

    // مساعد لإعادة المحاولة مع TOTP بعد الطلب الأول
    async function handlePasswordLoginWithTOTP(email, password, totpToken) {
        try {
            await window.Auth.checkPasswordAnd2FA(email, password, totpToken);
            // نجاح
            window.location.href = '/auth/verify-otp.html';
        } catch (e) {
            showError(e.message || 'فشل التحقق. تأكد من الرمز.');
        }
    }

    // ─── تسجيل الدخول بـ TOTP فقط ────────────────────
    async function handleTOTPLogin(e) {
        if (e) e.preventDefault();
        clearError();

        const email = totpEmailInput?.value.trim();
        const token = document.getElementById('totpTokenOnly')?.value.trim();

        if (!email || !token) {
            showError('يرجى إدخال البريد الإلكتروني ورمز المصادقة.');
            return;
        }
        if (!window.Auth) {
            showError('خدمة المصادقة غير متاحة مؤقتاً، حاول لاحقاً.');
            return;
        }

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        }

        try {
            await window.Auth.loginWithTOTP(email, token);
            window.location.href = '/pages/dashboard/index.html';
        } catch (error) {
            console.error('خطأ:', error);
            showError(error.message || 'فشل تسجيل الدخول. تأكد من الرمز.');
        } finally {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-paper-plane"></i> دخول';
            }
        }
    }

    // ─── ربط الأحداث ─────────────────────────────────
    if (form) form.addEventListener('submit', (e) => {
        if (activeMode === 'password') handlePasswordLogin(e);
        else handleTOTPLogin(e);
    });

    // زر إضافي لنموذج TOTP
    const totpSubmitBtn = document.getElementById('totpSubmitBtn');
    if (totpSubmitBtn) totpSubmitBtn.addEventListener('click', handleTOTPLogin);

    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handlePasswordLogin(e);
        });
    }

    // ─── التحقق من جلسة سابقة ────────────────────────
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
        } catch (e) { /* ابق في صفحة الدخول */ }
        finally {
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
