/**
 * register.js – صفحة إنشاء حساب جديد
 * يعتمد على Auth.register من auth.js
 */
(function() {
    const form = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const registerBtn = document.getElementById('registerBtn');
    const errorMsg = document.getElementById('registerError');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const loaderScreen = document.getElementById('creativeLoaderScreen');

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

    // إظهار/إخفاء كلمة المرور
    function setupPasswordToggle(toggleCheckbox, passwordField) {
        if (toggleCheckbox && passwordField) {
            toggleCheckbox.addEventListener('click', function() {
                const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordField.setAttribute('type', type);
                const icon = this.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                }
            });
        }
    }

    setupPasswordToggle(togglePassword, passwordInput);
    setupPasswordToggle(toggleConfirmPassword, confirmPasswordInput);

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async function handleRegister(e) {
        if (e) e.preventDefault();
        clearError();

        const fullName = fullNameInput?.value.trim();
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;

        // التحقق من الحقول
        if (!fullName || !email || !password || !confirmPassword) {
            showError('يرجى تعبئة جميع الحقول المطلوبة');
            return;
        }
        if (!isValidEmail(email)) {
            showError('يرجى إدخال بريد إلكتروني صحيح');
            return;
        }
        if (password !== confirmPassword) {
            showError('كلمة المرور وتأكيدها غير متطابقين');
            return;
        }

        if (!window.Auth) {
            showError('خدمة المصادقة غير متاحة مؤقتاً، حاول لاحقاً.');
            return;
        }

        if (registerBtn) {
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إنشاء الحساب...';
        }

        try {
            // استخدام Auth.register مع metadata (الاسم الكامل)
            await window.Auth.register(email, password, { full_name: fullName });
            
            // نجاح التسجيل - توجيه إلى صفحة التحقق أو الدخول
            sessionStorage.setItem('otpEmail', email);
            window.location.href = '/auth/verify-otp.html';
            
        } catch (error) {
            console.error('خطأ في التسجيل:', error);
            let message = 'حدث خطأ أثناء إنشاء الحساب';
            if (error.message?.includes('already registered')) {
                message = 'البريد الإلكتروني مسجل بالفعل';
            } else if (error.message?.includes('كلمة المرور')) {
                message = error.message; // رسالة التحقق من كلمة المرور
            } else if (error.message?.includes('Too many requests')) {
                message = 'محاولات كثيرة، يرجى المحاولة لاحقاً';
            }
            showError(message);
        } finally {
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء حساب جديد';
            }
        }
    }

    if (form) form.addEventListener('submit', handleRegister);
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleRegister(e);
        });
    }

    // فحص الجلسة السابقة (إذا كان المستخدم مسجل دخوله بالفعل)
    async function checkExistingSession() {
        try {
            if (window.Auth) {
                const user = await window.Auth.getUser();
                if (user) {
                    window.location.href = '/pages/dashboard/index.html';
                    return;
                }
            }
        } catch (e) {
            // لا توجد جلسة صالحة، البقاء في صفحة التسجيل
        }
    }

    checkExistingSession();
})();
