/**
 * login.js – v21 (فحص جلسة محسّن، يمنع الدخول التلقائي بعد إغلاق المتصفح)
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

    // عناصر التبويب الثاني (TOTP)
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

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const result = await window.Auth.loginWithPassword(email, password);

            if (result.requiresTwoFactor) {
                sessionStorage.setItem('loginMethod', 'password_totp');
                sessionStorage.setItem('otpEmail', email);
                sessionStorage.setItem('otpName', email.split('@')[0]);
                window.location.href = '/auth/verify-totp.html';
                return;
            }

            // دخول مباشر ناجح
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
            loginBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
        }
    }

    // معالج الدخول المباشر بـ TOTP (تبويب المصادقة الثنائية)
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

    // 🆕 فحص الجلسة عند تحميل صفحة الدخول
    async function checkExistingSession() {
        try {
            if (window.Auth?.isSessionValid) {
                const valid = await window.Auth.isSessionValid();
                if (valid) {
                    // توجد جلسة Supabase صالحة (كوكيز)، لكن هل مررنا بتدفق تسجيل الدخول كاملاً؟
                    const sessionId = sessionStorage.getItem('currentSessionId');
                    const loginMethod = sessionStorage.getItem('loginMethod');
                    
                    // إذا لم توجد currentSessionId، فهذه جلسة قديمة (من إغلاق متصفح وإعادة فتح)
                    if (!sessionId && !loginMethod) {
                        // إنهاء الجلسة القديمة وإجبار المستخدم على تسجيل الدخول
                        console.log('🔄 تم اكتشاف جلسة قديمة، جاري إنهاؤها...');
                        await window.Auth.logout();
                        return; // يبقى في صفحة الدخول
                    }
                    
                    // إذا كانت الجلسة كاملة، ننتقل إلى Dashboard
                    window.location.replace('/pages/dashboard/index.html');
                }
            }
        } catch (e) {
            // في حال فشل الفحص، نبقى في صفحة الدخول
            console.warn('تعذر فحص الجلسة:', e);
        }
    }

    window.addEventListener('load', () => setTimeout(checkExistingSession, 300));
})();
