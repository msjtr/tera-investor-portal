/**
 * login-totp.js – معالج تبويب المصادقة الثنائية (بريد + كلمة مرور + فحص التفعيل)
 * يعمل مع auth.js v28 و verify-totp.js v4
 */
(function() {
    const totpEmailInput = document.getElementById('totpEmail');
    const totpPasswordInput = document.getElementById('totpPassword');
    const totpSubmitBtn = document.getElementById('totpSubmitBtn');
    const errorMsg = document.getElementById('loginError');

    // نتأكد من وجود جميع العناصر المطلوبة (حقل بريد + حقل كلمة مرور + زر)
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
            // 1. تسجيل الدخول بكلمة المرور (ينشئ جلسة Supabase)
            const result = await window.Auth.loginWithPassword(email, password);

            // 2. فحص حالة المصادقة الثنائية
            if (!result.requiresTwoFactor) {
                showError('المصادقة الثنائية غير مفعلة لحسابك. يرجى الدخول العادي ثم تفعيلها من صفحة الإعدادات.');
                return;
            }

            // 3. تخزين بيانات الجلسة للتوجيه إلى صفحة TOTP
            sessionStorage.setItem('loginMethod', 'password_totp');
            sessionStorage.setItem('otpEmail', email);
            sessionStorage.setItem('otpName', email.split('@')[0]);

            // 4. الانتقال إلى صفحة إدخال رمز TOTP
            window.location.href = '/auth/verify-totp.html';
        } catch (error) {
            console.error('خطأ:', error);
            let message = 'حدث خطأ، حاول مرة أخرى';
            if (error.message?.includes('Invalid login credentials')) {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            } else if (error.message?.includes('تجاوز عدد المحاولات')) {
                message = error.message;
            }
            showError(message);
        } finally {
            totpSubmitBtn.disabled = false;
            totpSubmitBtn.innerHTML = '<i class="fas fa-shield-alt"></i> متابعة إلى التحقق';
        }
    }

    // دعم الضغط على Enter من أي حقل
    totpEmailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); totpPasswordInput?.focus(); }
    });
    totpPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSubmit(e); }
    });

    totpSubmitBtn.addEventListener('click', handleSubmit);
})();
