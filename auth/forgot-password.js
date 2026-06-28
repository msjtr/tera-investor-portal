/**
 * ============================================================
 * forgot-password.js - معالجة نسيان كلمة المرور (Enterprise)
 * ============================================================
 * - ينتظر جاهزية Supabase عبر 'supabase:ready'.
 * - يرسل رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني.
 * - يستخدم المسارات المطلقة.
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

        if (!form) return;

        // انتظار جاهزية Supabase
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('انتهت مهلة انتظار Supabase')), 10000);
                    document.addEventListener('supabase:ready', (e) => {
                        clearTimeout(timeout);
                        resolve(e.detail.client);
                    }, { once: true });
                    document.addEventListener('supabase:error', () => {
                        clearTimeout(timeout);
                        reject(new Error('فشل تحميل Supabase'));
                    }, { once: true });
                });
            } catch (err) {
                showAlert('تعذر الاتصال بخدمة المصادقة. تأكد من اتصالك بالإنترنت.', 'error');
                return;
            }
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = identityInput.value.trim();

            // تحقق بسيط من صحة البريد
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showAlert('يرجى إدخال بريد إلكتروني صحيح.', 'error');
                identityInput.focus();
                return;
            }

            // إظهار اللودر وتعطيل الزر
            showLoader(true);
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

            try {
                const { error } = await window.teraSupabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/auth/reset-password.html'
                });

                if (error) throw error;

                showAlert('✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تحقق من صندوق الوارد.', 'success');
                form.reset();

            } catch (error) {
                console.error('❌ خطأ في إرسال رابط الاستعادة:', error);
                let msg = 'تعذر إرسال رابط الاستعادة.';
                if (error.message.includes('User not found')) {
                    msg = 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.';
                } else if (error.message) {
                    msg = error.message;
                }
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
            alertBox.className = 'alert-box show ' + type;
            if (alertIcon) {
                alertIcon.innerHTML = type === 'success' 
                    ? '<i class="fas fa-check-circle"></i>' 
                    : '<i class="fas fa-exclamation-circle"></i>';
            }
            alertMessage.textContent = message;

            // إخفاء تلقائي بعد 8 ثوانٍ
            clearTimeout(window._alertTimer);
            window._alertTimer = setTimeout(() => {
                alertBox.classList.remove('show');
            }, 8000);
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
