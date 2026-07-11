/**
 * login.js – تدفق آمن (محسّن)
 * يعتمد على Auth.loginWithPasswordAndOTP و Auth.getUser
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

    // إخفاء شاشة التحميل مباشرة، مع إظهارها مؤقتًا أثناء فحص الجلسة
    if (loaderScreen) {
        loaderScreen.style.display = 'flex';
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

        if (!window.Auth) {
            showError('خدمة المصادقة غير متاحة مؤقتاً، حاول لاحقاً.');
            return;
        }

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق من البيانات...';
        }

        try {
            await window.Auth.loginWithPasswordAndOTP(email, password);
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

    if (form) form.addEventListener('submit', handleLogin);
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin(e);
        });
    }

    // فحص الجلسة السابقة باستخدام الدوال المركزية
    async function checkExistingSession() {
        try {
            // الانتظار حتى يصبح Auth متاحاً (إذا لم يكن)
            if (!window.Auth) {
                // محاولة انتظار قصيرة
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (window.Auth) {
                const user = await window.Auth.getUser();
                if (user) {
                    // جلسة صالحة، انتقل للوحة التحكم
                    window.location.href = '/pages/dashboard/index.html';
                    return;
                }
            } else {
                // fallback للمباشرة إذا لم يوجد Auth
                const sb = window.teraSupabase || await window.waitForSupabase?.();
                if (sb) {
                    const { data: { user } } = await sb.auth.getUser();
                    if (user) {
                        window.location.href = '/pages/dashboard/index.html';
                        return;
                    }
                }
            }
        } catch (e) {
            // تجاهل الأخطاء، ابق في صفحة الدخول
        } finally {
            // إخفاء شاشة التحميل بعد الفحص
            if (loaderScreen) loaderScreen.style.display = 'none';
        }
    }

    checkExistingSession();
})();
