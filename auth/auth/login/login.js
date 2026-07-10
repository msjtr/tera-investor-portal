/**
 * login.js – صفحة تسجيل الدخول
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

    // انتظار Supabase
    async function getSupabase() {
        if (supabase) return supabase;
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        return supabase;
    }

    // عرض رسالة خطأ
    function showError(message) {
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }
    }

    function clearError() {
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
    }

    // إظهار/إخفاء كلمة المرور
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // التحقق من صحة البريد الإلكتروني
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // معالجة تسجيل الدخول
    async function handleLogin(e) {
        e.preventDefault();
        clearError();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // التحقق من الحقول
        if (!email || !password) {
            showError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }

        if (!isValidEmail(email)) {
            showError('يرجى إدخال بريد إلكتروني صحيح');
            return;
        }

        // تعطيل الزر وإظهار التحميل
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
        }

        try {
            const sb = await getSupabase();
            const { data, error } = await sb.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // إذا كان هناك remember me، قد نضبط الجلسة لتظل لفترة أطول (افتراضياً Supabase يديرها)
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }

            // نجاح تسجيل الدخول - التوجيه للوحة التحكم أو الصفحة المطلوبة
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/pages/dashboard/index.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;

        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            let message = 'حدث خطأ أثناء تسجيل الدخول';
            
            if (error.message.includes('Invalid login credentials')) {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            } else if (error.message.includes('Email not confirmed')) {
                message = 'يرجى تأكيد البريد الإلكتروني أولاً';
            } else if (error.message.includes('Too many requests')) {
                message = 'محاولات كثيرة، يرجى المحاولة لاحقاً';
            }
            
            showError(message);
        } finally {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'تسجيل الدخول';
            }
        }
    }

    // معالجة OTP (إذا كانت الصفحة تدعم الدخول برمز)
    const otpBtn = document.getElementById('sendOtpBtn');
    if (otpBtn) {
        otpBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            if (!email || !isValidEmail(email)) {
                showError('يرجى إدخال بريد إلكتروني صحيح لإرسال الرمز');
                return;
            }

            try {
                const sb = await getSupabase();
                const { error } = await sb.auth.signInWithOtp({ email });
                if (error) throw error;
                
                // تخزين البريد للتحقق لاحقاً
                sessionStorage.setItem('otpEmail', email);
                window.location.href = '/auth/verify-otp.html';
            } catch (error) {
                showError('فشل إرسال رمز التحقق، حاول مرة أخرى');
            }
        });
    }

    // ربط النموذج
    if (form) {
        form.addEventListener('submit', handleLogin);
    }

    // تفعيل زر Enter
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin(e);
            }
        });
    }

    // التحقق من وجود مستخدم مسجل مسبقاً (في حال الرجوع للصفحة)
    async function checkExistingSession() {
        try {
            const sb = await getSupabase();
            const { data: { session } } = await sb.auth.getSession();
            if (session) {
                // إذا كان هناك جلسة صالحة، ننتقل مباشرة
                window.location.href = '/pages/dashboard/index.html';
            }
        } catch (e) {
            // لا جلسة، البقاء في الصفحة
        }
    }

    // تنفيذ الفحص الأولي
    checkExistingSession();

})();
