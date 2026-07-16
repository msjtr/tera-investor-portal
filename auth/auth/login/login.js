/**
 * login.js – v6 (متوافقة مع auth.js v20 – دعم تسجيل الدخول الذكي وإرسال رموز OTP)
 * - تبويب كلمة المرور: يتحقق من صحة البريد وكلمة المرور، ثم يطلب TOTP إن لزم، ويرسل OTP
 * - تبويب TOTP: تسجيل دخول مباشر برمز TOTP فقط
 */
(function() {
    if (window.__loginInitialized) return;
    window.__loginInitialized = true;

    // ─── العناصر ──────────────────────────────────────
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const totpGroup = document.getElementById('totpGroup');         // الحاوية التي تحوي حقل TOTP ورسالته
    const totpInput = document.getElementById('totp');             // حقل رمز TOTP
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
    const totpTokenOnly = document.getElementById('totpTokenOnly');
    const totpSubmitBtn = document.getElementById('totpSubmitBtn');

    let activeMode = 'password';

    // متغير لتخزين آخر بريد وكلمة مرور تم إدخالهما (لإعادة المحاولة مع TOTP)
    let lastEmail = null;
    let lastPassword = null;

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
        // إخفاء حقل TOTP عند التبديل
        if (totpGroup) totpGroup.style.display = 'none';
        lastEmail = null;
        lastPassword = null;
    }

    if (tabPassword) tabPassword.addEventListener('click', () => switchMode('password'));
    if (tabTOTP) tabTOTP.addEventListener('click', () => switchMode('totp'));

    // ─── تسجيل الدخول بكلمة المرور (مع إرسال OTP) ────
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

        // حفظ البريد وكلمة المرور الحاليين لاستخدامهما في إعادة المحاولة مع TOTP
        lastEmail = email;
        lastPassword = password;

        try {
            // الخطوة 1: التحقق من صحة بيانات الدخول (وطلب TOTP إن لزم)
            await window.Auth.checkPasswordAnd2FA(email, password, totpToken);

            // الخطوة 2: إرسال رمز OTP إلى البريد
            await window.Auth.sendOTP(email);

            // تخزين البيانات المطلوبة في sessionStorage لصفحة التحقق
            sessionStorage.setItem('otpEmail', email);
            sessionStorage.setItem('otpName', email.split('@')[0]); // اسم مؤقت
            sessionStorage.setItem('loginMethod', 'password_otp');

            // إخفاء حقل TOTP بعد النجاح (في حال ظهر)
            if (totpGroup) totpGroup.style.display = 'none';

            // الانتقال إلى صفحة إدخال OTP
            window.location.href = '/auth/verify-otp.html';
        } catch (error) {
            console.error('خطأ:', error);
            if (error.message === 'TOTP_REQUIRED') {
                // النظام يطلب رمز TOTP: إظهار حقل الإدخال
                if (totpGroup) totpGroup.style.display = 'block';
                if (totpInput) totpInput.focus();
                showError('حسابك محمي بمصادقة ثنائية. يرجى إدخال رمز التحقق من تطبيق المصادقة.');
            } else {
                showError(getArabicErrorMessage(error.message));
            }
        } finally {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
            }
        }
    }

    // ─── تسجيل الدخول بـ TOTP فقط (بدون كلمة مرور) ───
    async function handleTOTPLogin(e) {
        if (e) e.preventDefault();
        clearError();

        const email = totpEmailInput?.value.trim();
        const token = totpTokenOnly?.value.trim();

        if (!email || !token) {
            showError('يرجى إدخال البريد الإلكتروني ورمز المصادقة.');
            return;
        }
        if (!window.Auth) {
            showError('خدمة المصادقة غير متاحة مؤقتاً، حاول لاحقاً.');
            return;
        }

        if (totpSubmitBtn) {
            totpSubmitBtn.disabled = true;
            totpSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        }

        try {
            await window.Auth.loginWithTOTP(email, token);
            // نجاح – انتقال مباشر للوحة التحكم
            window.location.href = '/pages/dashboard/index.html';
        } catch (error) {
            console.error('خطأ:', error);
            showError(error.message || 'فشل تسجيل الدخول. تأكد من الرمز.');
        } finally {
            if (totpSubmitBtn) {
                totpSubmitBtn.disabled = false;
                totpSubmitBtn.innerHTML = '<i class="fas fa-shield-alt"></i> دخول';
            }
        }
    }

    // ─── ربط الأحداث ─────────────────────────────────
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (activeMode === 'password') handlePasswordLogin(e);
            else handleTOTPLogin(e);
        });
    }

    // زر TOTP المنفصل
    if (totpSubmitBtn) totpSubmitBtn.addEventListener('click', handleTOTPLogin);

    // الضغط على Enter من حقل كلمة المرور
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handlePasswordLogin(e);
        });
    }

    // ─── ترجمة أخطاء شائعة ───────────────────────────
    function getArabicErrorMessage(msg) {
        const map = {
            'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
            'Email not confirmed': 'يرجى تأكيد البريد الإلكتروني أولاً',
            'User not found': 'المستخدم غير موجود',
        };
        return map[msg] || msg || 'حدث خطأ غير معروف';
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
        } catch (e) { /* تجاهل */ }
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
