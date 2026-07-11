/**
 * login.js – تدفق آمن: تحقق من كلمة المرور -> إرسال OTP -> صفحة التحقق
 * يعتمد على Auth.loginWithPasswordAndOTP من auth.js
 */
(function() {
    let supabase;

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');
    const togglePassword = document.getElementById('togglePassword');
    const loaderScreen = document.getElementById('creativeLoaderScreen');

    if (loaderScreen) loaderScreen.style.display = 'none';

    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

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

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق من البيانات...';
        }

        try {
            // استخدام الدالة المركزية من auth.js
            await window.Auth.loginWithPasswordAndOTP(email, password);

            // تم إرسال OTP بنجاح -> توجيه إلى صفحة التحقق
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

    if (form) {
        form.addEventListener('submit', handleLogin);
    }
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin(e);
        });
    }

    // فحص الجلسة السابقة
    async function checkExistingSession() {
        try {
            const sb = await getSupabase();
            if (!sb) return;
            const { data: { session } } = await sb.auth.getSession();
            if (!session) return;
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) {
                await sb.auth.signOut();
                return;
            }
            window.location.href = '/pages/dashboard/index.html';
        } catch (e) {}
    }
    checkExistingSession();
})();
