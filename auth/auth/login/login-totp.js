/**
 * login-totp.js – معالج تبويب المصادقة الثنائية (بريد فقط ➔ verify-totp.html)
 */
(function() {
    const totpEmailInput = document.getElementById('totpEmail');
    const totpSubmitBtn = document.getElementById('totpSubmitBtn');
    const errorMsg = document.getElementById('loginError');

    if (!totpEmailInput || !totpSubmitBtn) return;

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
        if (!email) { showError('يرجى إدخال البريد الإلكتروني'); return; }
        if (!isValidEmail(email)) { showError('بريد إلكتروني غير صحيح'); return; }
        if (!window.Auth) { showError('خدمة المصادقة غير متاحة'); return; }

        totpSubmitBtn.disabled = true;
        totpSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            sessionStorage.setItem('loginMethod', 'totp_direct');
            sessionStorage.setItem('otpEmail', email);
            sessionStorage.setItem('otpName', email.split('@')[0]);

            window.location.href = '/auth/verify-totp.html';
        } catch (error) {
            console.error('خطأ:', error);
            showError(error.message || 'حدث خطأ غير متوقع');
        } finally {
            totpSubmitBtn.disabled = false;
            totpSubmitBtn.innerHTML = '<i class="fas fa-shield-alt"></i> متابعة إلى التحقق';
        }
    }

    totpSubmitBtn.addEventListener('click', handleSubmit);
})();
