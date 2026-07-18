/**
 * login-totp.js – معالج تبويب المصادقة الثنائية (بريد + كلمة مرور + فحص التفعيل)
 */
(function() {
    const totpEmailInput = document.getElementById('totpEmail');
    const totpPasswordInput = document.getElementById('totpPassword');
    const totpSubmitBtn = document.getElementById('totpSubmitBtn');
    const errorMsg = document.getElementById('loginError');

    if (!totpEmailInput || !totpPasswordInput || !totpSubmitBtn) return;

    function showError(msg) {
        if (errorMsg) {
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
            errorMsg.style.display = 'block';
        }
    }
    function clearError() { if (errorMsg) errorMsg.style.display = 'none'; }

    function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

    async function handleSubmit(e) {
        e.preventDefault();
        clearError();

        const email = totpEmailInput.value.trim();
        const password = totpPasswordInput.value.trim();
        if (!email || !password) { showError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
        if (!isValidEmail(email)) { showError('بريد إلكتروني غير صحيح'); return; }
        if (!window.Auth) { showError('خدمة المصادقة غير متاحة'); return; }

        totpSubmitBtn.disabled = true;
        totpSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const result = await window.Auth.loginWithPassword(email, password);
            if (!result.requiresTwoFactor) {
                showError('المصادقة الثنائية غير مفعلة لحسابك. يرجى الدخول العادي ثم تفعيلها من صفحة الإعدادات.');
                return;
            }

            sessionStorage.setItem('loginMethod', 'password_totp');
            sessionStorage.setItem('otpEmail', email);
            sessionStorage.setItem('otpName', email.split('@')[0]);

            window.location.href = '/auth/verify-totp.html';
        } catch (error) {
            console.error('خطأ:', error);
            let message = 'حدث خطأ، حاول مرة أخرى';
            if (error.message?.includes('Invalid login credentials')) {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            }
            showError(message);
        } finally {
            totpSubmitBtn.disabled = false;
            totpSubmitBtn.innerHTML = '<i class="fas fa-shield-alt"></i> متابعة إلى التحقق';
        }
    }

    totpSubmitBtn.addEventListener('click', handleSubmit);
})();
