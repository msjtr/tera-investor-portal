/**
 * verify-otp.js - تأكيد البريد برمز OTP (6 أرقام) – إنتاج
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        const form = document.getElementById('otpForm');
        const otpInput = document.getElementById('otp');
        const submitBtn = document.getElementById('submitBtn');
        const resendBtn = document.getElementById('resendCode');
        const otpError = document.getElementById('otp-error');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const instructionText = document.getElementById('instructionText');
        const loaderOverlay = document.getElementById('creativeLoaderScreen');

        if (!form) return;

        // انتظار Supabase
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                    document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
                    document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('error')); }, { once: true });
                });
            } catch {
                showAlert('تعذر الاتصال بالخدمة.', 'error');
                return;
            }
        }

        const supabase = window.teraSupabase;
        const email = localStorage.getItem('pendingVerificationEmail');
        const type = localStorage.getItem('tera_verify_type') || 'signup';

        if (email) instructionText.textContent = `الرمز المرسل إلى: ${email}`;
        else showAlert('لا يوجد بريد معلق.', 'error');

        otpInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length === 6) {
                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                else form.dispatchEvent(new Event('submit'));
            }
        });

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideAlert();
            if (otpError) otpError.textContent = '';
            const token = otpInput.value.trim();
            if (token.length !== 6) {
                if (otpError) otpError.textContent = 'يجب إدخال 6 أرقام';
                return;
            }
            if (!email) { showAlert('بيانات الجلسة مفقودة.', 'error'); return; }

            showLoader(true);
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

            try {
                const { error } = await supabase.auth.verifyOtp({ email, token, type });
                if (error) throw error;

                localStorage.removeItem('pendingVerificationEmail');
                localStorage.removeItem('tera_verify_type');
                showAlert('✅ تم تأكيد البريد بنجاح!', 'success');
                setTimeout(() => window.location.replace('/auth/complete-profile.html'), 1500);
            } catch (error) {
                let msg = error.message || 'رمز غير صحيح';
                showAlert(msg, 'error');
                otpInput.value = '';
                otpInput.focus();
            } finally {
                showLoader(false);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز';
            }
        });

        if (resendBtn) {
            resendBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                if (!email) { showAlert('لا يوجد بريد.', 'error'); return; }
                resendBtn.style.pointerEvents = 'none';
                resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> إعادة الإرسال...';
                try {
                    const { error } = await supabase.auth.resend({ type, email });
                    if (error) throw error;
                    showAlert('✅ تمت إعادة الإرسال.', 'success');
                } catch (error) {
                    showAlert(error.message || 'فشل', 'error');
                } finally {
                    resendBtn.style.pointerEvents = 'auto';
                    resendBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة الإرسال';
                }
            });
        }

        function showLoader(s) { if (loaderOverlay) loaderOverlay.style.display = s ? 'flex' : 'none'; }
        function showAlert(msg, type) {
            if (!alertBox || !alertMessage) return;
            alertBox.style.display = 'flex';
            alertBox.className = `alert-box show ${type || 'error'}`;
            alertIcon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
            alertMessage.textContent = msg;
        }
        function hideAlert() { if (alertBox) { alertBox.classList.remove('show'); alertBox.style.display = 'none'; } }
    });
})();
