/**
 * login.js – صفحة تسجيل الدخول (مُستقرَّة)
 * يتكامل مع supabase-client.js و auth.js و security.js
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
    const loaderScreen = document.getElementById('creativeLoaderScreen'); // إن وجد

    // إخفاء شاشة التحميل العامة فور بدء السكربت
    if (loaderScreen) loaderScreen.style.display = 'none';

    // انتظار Supabase مع حد أقصى للوقت
    async function getSupabase() {
        if (supabase) return supabase;
        try {
            supabase = window.teraSupabase || await window.waitForSupabase?.();
        } catch (e) {
            console.error('فشل الاتصال بخدمة المصادقة');
            showError('تعذَّر الاتصال بالخدمة. حاول مرة أخرى لاحقاً.');
        }
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

    // إظهار/إخفاء كلمة المرور
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

    // معالجة تسجيل الدخول
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

            // "تذكرني"
            if (rememberMe?.checked) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }

            // التوجيه بعد النجاح
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
                loginBtn.innerHTML = '<i class="fas fa-lock"></i> تسجيل الدخول الآمن';
            }
        }
    }

    // معالجة الدخول برمز OTP (إن وُجد الزر)
    const otpBtn = document.getElementById('sendOtpBtn');
    if (otpBtn) {
        otpBtn.addEventListener('click', async () => {
            const email = emailInput?.value.trim();
            if (!email || !isValidEmail(email)) {
                showError('يرجى إدخال بريد إلكتروني صحيح لإرسال الرمز');
                return;
            }
            try {
                const sb = await getSupabase();
                if (!sb) return;
                const { error } = await sb.auth.signInWithOtp({ email });
                if (error) throw error;
                sessionStorage.setItem('otpEmail', email);
                window.location.href = '/auth/verify-otp.html';
            } catch (error) {
                showError('فشل إرسال رمز التحقق، حاول مرة أخرى');
            }
        });
    }

    // ربط النموذج وزر Enter
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin(e);
        });
    }

    // ───── التحقق من وجود جلسة سابقة (مع منع الحلقة) ─────
    async function checkExistingSession() {
        try {
            const sb = await getSupabase();
            if (!sb) return;

            const { data: { session } } = await sb.auth.getSession();
            if (!session) return; // لا توجد جلسة، ابق في صفحة الدخول

            // تحقَّق من صلاحية الجلسة بجلب بيانات المستخدم
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) {
                // الجلسة غير صالحة ← نظفها بهدوء
                await sb.auth.signOut();
                return;
            }

            // الجلسة سليمة ← انتقل إلى لوحة التحكم
            window.location.href = '/pages/dashboard/index.html';
        } catch (e) {
            // فشل التحقق، ابق في صفحة الدخول
        }
    }

    // بدء الفحص بعد تحميل الصفحة مباشرةً
    checkExistingSession();

})();
