/**
 * ============================================================
 * forgot-password.js - معالجة نسيان كلمة المرور (Enterprise)
 * ============================================================
 * الموقع: /assets/js/forgot-password.js
 * - ينتظر جاهزية Supabase.
 * - يرسل رابط إعادة تعيين كلمة المرور عبر البريد.
 * - يخزن نوع العملية (recovery) لتوجيه verify-otp لاحقاً.
 * - يعرض مؤشرات تحميل وتنبيهات للمستخدم.
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        const form = document.getElementById('forgotPasswordForm');
        const identityInput = document.getElementById('identity');
        const submitBtn = document.getElementById('submitBtn');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const loaderOverlay = document.getElementById('creativeLoaderScreen');
        const identityError = document.getElementById('identity-error');

        if (!form) return;

        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                    document.addEventListener('supabase:ready', (e) => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
                    document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('Supabase load error')); }, { once: true });
                });
            } catch (err) {
                showAlert('تعذر الاتصال بخدمة المصادقة. تأكد من اتصالك بالإنترنت.', 'error');
                if (submitBtn) submitBtn.disabled = true;
                return;
            }
        }

        const supabaseClient = window.teraSupabase;

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideAlert();
            if (identityError) identityError.textContent = '';

            const email = identityInput.value.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                if (identityError) identityError.textContent = 'يرجى إدخال بريد إلكتروني صحيح';
                identityInput.focus();
                return;
            }

            // تخزين البريد ونوع العملية
            localStorage.setItem('pendingVerificationEmail', email);
            localStorage.setItem('tera_verify_type', 'recovery');

            showLoader(true);
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

            try {
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/auth/reset-password.html'
                });

                if (error) throw error;

                showAlert('✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.', 'success');
                // ننتقل إلى صفحة التحقق لإدخال الرمز إن أردت، أو نكتفي بالرسالة
                // لكن حسب التصميم السابق، المستخدم سيذهب إلى verify-otp.html
                // لذا نوجهه إلى هناك مع الاحتفاظ بالبريد ونوع recovery
                window.location.replace('/auth/verify-otp.html');

            } catch (error) {
                console.error('❌ فشل إرسال رابط الاستعادة:', error);
                let msg = 'تعذر إرسال رابط الاستعادة.';
                if (error.message.includes('User not found')) msg = 'لا يوجد حساب مرتبط بهذا البريد.';
                else if (error.message) msg = error.message;
                showAlert(msg, 'error');
            } finally {
                showLoader(false);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رابط الاستعادة';
            }
        });

        function showAlert(message, type) {
            if (!alertBox || !alertMessage) return;
            alertBox.style.display = 'flex';
            alertBox.className = 'alert-box show ' + (type || 'error');
            if (alertIcon) {
                alertIcon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
            }
            alertMessage.textContent = message;
            clearTimeout(window._alertTimer);
            window._alertTimer = setTimeout(() => alertBox.classList.remove('show'), 8000);
        }

        function hideAlert() {
            if (!alertBox) return;
            alertBox.classList.remove('show');
            alertBox.style.display = 'none';
        }

        function showLoader(show) {
            if (!loaderOverlay) return;
            loaderOverlay.style.display = show ? 'flex' : 'none';
            const progressBar = document.getElementById('progressFillBar');
            if (show && progressBar) {
                progressBar.style.width = '0%';
                setTimeout(() => { progressBar.style.width = '70%'; }, 500);
                setTimeout(() => { progressBar.style.width = '90%'; }, 1500);
            } else if (progressBar) {
                progressBar.style.width = '0%';
            }
        }
    });
})();
