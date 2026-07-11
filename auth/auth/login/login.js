/**
 * login.js – نسخة مستقرة تمامًا (مضادة للحلقات)
 */
(function() {
    // منع التنفيذ المتكرر
    if (window.__loginInitialized) return;
    window.__loginInitialized = true;

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');
    const togglePassword = document.getElementById('togglePassword');
    const loaderScreen = document.getElementById('creativeLoaderScreen');

    let sessionCheckDone = false;

    // إخفاء شاشة التحميل فوراً
    if (loaderScreen) loaderScreen.style.display = 'none';

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

    // فحص الجلسة لمرة واحدة فقط
    async function checkExistingSession() {
        if (sessionCheckDone) return;
        sessionCheckDone = true;

        // تعطيل الزر أثناء الفحص
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق من الجلسة...';
        }

        try {
            if (window.Auth && window.Auth.isSessionValid) {
                const valid = await window.Auth.isSessionValid();
                if (valid) {
                    window.location.replace('/pages/dashboard/index.html');
                    return;
                }
            } else {
                // fallback
                const sb = window.teraSupabase || await window.waitForSupabase?.();
                if (sb) {
                    const { data: { user } } = await sb.auth.getUser();
                    if (user) {
                        window.location.replace('/pages/dashboard/index.html');
                        return;
                    }
                }
            }
        } catch (e) {
            // أي خطأ، تجاهل وابق في الصفحة
        } finally {
            // إعادة تمكين الزر
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
            }
        }
    }

    // تنفيذ الفحص بعد تحميل الصفحة بالكامل
    window.addEventListener('load', () => {
        // تأخير بسيط لضمان تحميل auth.js
        setTimeout(checkExistingSession, 300);
    });

})();
