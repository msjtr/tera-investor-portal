/**
 * ============================================================
 * reset-password.js - إعادة تعيين كلمة المرور (Enterprise)
 * ============================================================
 * الموقع: /assets/js/reset-password.js
 * - ينتظر جاهزية Supabase.
 * - يتحقق من وجود جلسة (المستخدم قادم من رابط البريد).
 * - يتحقق من قوة كلمة المرور وتطابقها.
 * - يستخدم supabase.auth.updateUser لتحديث كلمة المرور.
 * - يوجه إلى لوحة التحكم بعد النجاح (مسار مطلق).
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        const form = document.getElementById('resetPasswordForm');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const submitBtn = document.getElementById('submitBtn');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const loaderOverlay = document.getElementById('creativeLoaderScreen');
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        const passwordMatch = document.getElementById('passwordMatch');

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

        // التأكد من وجود جلسة (الرابط من البريد يعطي جلسة تلقائية)
        const { data: { session } } = await window.teraSupabase.auth.getSession();
        if (!session) {
            showAlert('انتهت صلاحية الرابط أو أن الجلسة غير صالحة. يرجى طلب رابط جديد.', 'error');
            if (newPasswordInput) newPasswordInput.disabled = true;
            if (confirmPasswordInput) confirmPasswordInput.disabled = true;
            if (submitBtn) submitBtn.disabled = true;
            return;
        }

        // مؤشر قوة كلمة المرور
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            updateStrengthUI(strength);
            updatePasswordRequirements(password);
            if (confirmPasswordInput.value) checkMatch();
        });

        // التحقق من التطابق
        confirmPasswordInput.addEventListener('input', function() {
            checkMatch();
        });

        function calculatePasswordStrength(password) {
            let score = 0;
            if (password.length >= 8) score += 20;
            if (/[A-Z]/.test(password)) score += 20;
            if (/[a-z]/.test(password)) score += 20;
            if (/[0-9]/.test(password)) score += 20;
            if (/[!@#$%^&*]/.test(password)) score += 20;
            return Math.min(score, 100);
        }

        function updateStrengthUI(strength) {
            strengthFill.style.width = strength + '%';
            if (strength < 30) {
                strengthFill.style.background = '#dc2626';
                strengthText.textContent = 'ضعيفة';
                strengthText.style.color = '#dc2626';
            } else if (strength < 60) {
                strengthFill.style.background = '#f59e0b';
                strengthText.textContent = 'متوسطة';
                strengthText.style.color = '#f59e0b';
            } else if (strength < 80) {
                strengthFill.style.background = '#16a34a';
                strengthText.textContent = 'قوية';
                strengthText.style.color = '#16a34a';
            } else {
                strengthFill.style.background = '#028090';
                strengthText.textContent = 'قوية جداً';
                strengthText.style.color = '#028090';
            }
        }

        function updatePasswordRequirements(password) {
            const checks = {
                'req-length': password.length >= 8,
                'req-uppercase': /[A-Z]/.test(password),
                'req-lowercase': /[a-z]/.test(password),
                'req-number': /[0-9]/.test(password),
                'req-special': /[!@#$%^&*]/.test(password)
            };

            Object.entries(checks).forEach(([id, valid]) => {
                const el = document.getElementById(id);
                if (!el) return;
                const icon = el.querySelector('i');
                if (password.length === 0) {
                    el.style.color = '#64748b';
                    if (icon) icon.className = 'fas fa-circle';
                } else if (valid) {
                    el.style.color = '#16a34a';
                    if (icon) icon.className = 'fas fa-check-circle';
                } else {
                    el.style.color = '#dc2626';
                    if (icon) icon.className = 'fas fa-times-circle';
                }
            });
        }

        function checkMatch() {
            const newPwd = newPasswordInput.value;
            const confirmPwd = confirmPasswordInput.value;
            const errorEl = document.getElementById('confirmPassword-error');
            if (confirmPwd.length === 0) {
                passwordMatch.textContent = '';
                confirmPasswordInput.style.borderColor = '';
                if (errorEl) errorEl.textContent = '';
                return;
            }
            if (newPwd === confirmPwd) {
                passwordMatch.textContent = '✅ كلمة المرور متطابقة';
                passwordMatch.style.color = '#16a34a';
                confirmPasswordInput.style.borderColor = '#16a34a';
                if (errorEl) errorEl.textContent = '';
            } else {
                passwordMatch.textContent = '❌ كلمة المرور غير متطابقة';
                passwordMatch.style.color = '#dc2626';
                confirmPasswordInput.style.borderColor = '#dc2626';
                if (errorEl) errorEl.textContent = 'كلمة المرور غير متطابقة';
            }
        }

        // تقديم النموذج
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            hideAlert();
            document.getElementById('newPassword-error').textContent = '';
            document.getElementById('confirmPassword-error').textContent = '';

            const password = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            let hasError = false;

            if (!password) {
                document.getElementById('newPassword-error').textContent = 'كلمة المرور الجديدة مطلوبة';
                hasError = true;
            } else {
                const strength = calculatePasswordStrength(password);
                if (strength < 60) {
                    document.getElementById('newPassword-error').textContent = 'كلمة المرور ضعيفة جداً';
                    hasError = true;
                }
            }

            if (!confirmPassword) {
                document.getElementById('confirmPassword-error').textContent = 'تأكيد كلمة المرور مطلوب';
                hasError = true;
            } else if (password !== confirmPassword) {
                document.getElementById('confirmPassword-error').textContent = 'كلمة المرور غير متطابقة';
                hasError = true;
            }

            if (hasError) return;

            showLoader(true);
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

            try {
                const { error } = await window.teraSupabase.auth.updateUser({
                    password: password
                });

                if (error) throw error;

                showAlert('✅ تم تغيير كلمة المرور بنجاح! جاري التوجيه إلى لوحة التحكم...', 'success');

                setTimeout(() => {
                    // توجيه إلى لوحة التحكم (مسار مطلق)
                    window.location.replace('/pages/dashboard/index.html');
                }, 2000);

            } catch (error) {
                console.error('❌ خطأ في إعادة تعيين كلمة المرور:', error);
                showAlert(error.message || 'تعذر حفظ كلمة المرور. حاول مرة أخرى.', 'error');
            } finally {
                showLoader(false);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ كلمة المرور الجديدة';
            }
        });

        function showAlert(message, type) {
            if (!alertBox || !alertMessage) return;
            alertBox.style.display = 'flex';
            alertBox.className = 'alert-box show ' + (type || 'error');
            if (alertIcon) {
                alertIcon.innerHTML = type === 'success'
                    ? '<i class="fas fa-check-circle"></i>'
                    : '<i class="fas fa-exclamation-circle"></i>';
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
