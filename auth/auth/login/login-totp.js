/**
 * login-totp.js – v2 (بريد فقط ➔ تحقق TOTP، مع تحقق من صحة البريد)
 */
(function() {
    const totpEmailInput = document.getElementById('totpEmail');
    const totpSubmitBtn = document.getElementById('totpSubmitBtn');
    const errorMsg = document.getElementById('loginError');

    // نتأكد أن العناصر موجودة (حقل بريد + زر)
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
            // تحقق اختياري: هل المستخدم موجود؟ (يمكن الاستغناء عنه إذا كانت Edge Function تتولى ذلك)
            // لكننا نكتفي بتخزين البيانات والانتقال

            // تخزين البيانات المطلوبة لصفحة التحقق
            sessionStorage.setItem('loginMethod', 'totp_direct');
            sessionStorage.setItem('otpEmail', email);
            sessionStorage.setItem('otpName', email.split('@')[0]);

            // الانتقال إلى صفحة إدخال رمز TOTP
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

    // دعم إرسال النموذج بالضغط على Enter
    totpEmailInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(e);
        }
    });
})();
