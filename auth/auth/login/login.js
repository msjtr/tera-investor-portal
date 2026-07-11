/**
 * login.js – صفحة تسجيل الدخول (v4 - مستقر)
 * يمنع حلقة إعادة التوجيه مع dashboard
 */
(function() {
    let supabase;

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');
    const togglePassword = document.getElementById('togglePassword');
    const rememberMe = document.getElementById('rememberMe');

    // إخفاء شاشة التحميل فوراً
    const loader = document.getElementById('creativeLoaderScreen');
    if (loader) loader.style.display = 'none';

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
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
        }

        try {
            const sb = await getSupabase();
            if (!sb) throw new Error('الخدمة غير متوفرة');

            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;

            if (rememberMe?.checked) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }

            const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/pages/dashboard/index.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;

        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            let message = 'حدث خطأ أثناء تسجيل الدخول';
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
                loginBtn.innerHTML = '<i class="fa-solid fa-lock"></i> تسجيل الدخول الآمن';
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

    // فحص الجلسة المسبقة مع منع الحلقة
    async function checkExistingSession() {
        try {
            const sb = await getSupabase();
            if (!sb) return;

            const { data: { session } } = await sb.auth.getSession();
            if (!session) return;

            // التحقق من صلاحية الجلسة
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) {
                // جلسة غير صالحة - نسجل الخروج ونبقى في صفحة الدخول
                await sb.auth.signOut();
                localStorage.removeItem('rememberMe');
                return;
            }

            // جلسة صالحة - ننتقل للوحة التحكم
            window.location.href = '/pages/dashboard/index.html';
        } catch (e) {
            console.warn('فحص الجلسة فشل:', e);
        }
    }

    checkExistingSession();

})();
