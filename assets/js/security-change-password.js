/**
 * ============================================================
 * تغيير كلمة المرور - Change Password
 * ============================================================
 * الموقع: /assets/js/security-change-password.js
 * ============================================================
 */

// التأكد من وجود الكائن العام
window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['change-password'] = {
    init: function() {
        console.log('🔑 Initializing Change Password page...');

        // تهيئة زر إظهار/إخفاء كلمة المرور
        document.querySelectorAll('.password-toggle').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const input = document.getElementById(targetId);
                if (!input) return;

                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    if (icon) icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    if (icon) icon.className = 'fas fa-eye';
                }
            });
        });

        // تهيئة مؤشر قوة كلمة المرور
        const passwordInput = document.getElementById('newPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', function() {
                const strength = Security.calculatePasswordStrength(this.value);
                const strengthFill = document.getElementById('strengthFill');
                const strengthLabel = document.getElementById('strengthLabel');

                if (strengthFill) {
                    strengthFill.style.width = strength.percentage + '%';
                    if (strength.percentage < 30) {
                        strengthFill.style.background = '#dc2626';
                        if (strengthLabel) {
                            strengthLabel.className = 'strength-label weak';
                            strengthLabel.textContent = 'ضعيفة';
                        }
                    } else if (strength.percentage < 50) {
                        strengthFill.style.background = '#f59e0b';
                        if (strengthLabel) {
                            strengthLabel.className = 'strength-label medium';
                            strengthLabel.textContent = 'متوسطة';
                        }
                    } else if (strength.percentage < 75) {
                        strengthFill.style.background = '#16a34a';
                        if (strengthLabel) {
                            strengthLabel.className = 'strength-label strong';
                            strengthLabel.textContent = 'قوية';
                        }
                    } else {
                        strengthFill.style.background = '#028090';
                        if (strengthLabel) {
                            strengthLabel.className = 'strength-label very-strong';
                            strengthLabel.textContent = 'قوية جداً';
                        }
                    }
                }

                // تحديث متطلبات كلمة المرور
                Security.updatePasswordRequirements(this.value);
            });

            // تهيئة متطلبات كلمة المرور
            Security.updatePasswordRequirements('');
        }

        // تهيئة التحقق من تطابق كلمة المرور
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const confirmHint = document.getElementById('confirmPasswordHint');

        if (newPassword && confirmPassword && confirmHint) {
            const checkMatch = function() {
                if (confirmPassword.value.length === 0) {
                    confirmHint.textContent = '';
                    confirmPassword.style.borderColor = '';
                    return;
                }

                if (newPassword.value === confirmPassword.value) {
                    confirmHint.textContent = '✅ كلمة المرور متطابقة';
                    confirmHint.style.color = '#16a34a';
                    confirmPassword.style.borderColor = '#16a34a';
                } else {
                    confirmHint.textContent = '❌ كلمة المرور غير متطابقة';
                    confirmHint.style.color = '#dc2626';
                    confirmPassword.style.borderColor = '#dc2626';
                }
            };

            newPassword.addEventListener('input', checkMatch);
            confirmPassword.addEventListener('input', checkMatch);
        }

        // معالج إرسال النموذج
        const form = document.getElementById('changePasswordForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();

                const currentPassword = document.getElementById('currentPassword');
                const newPassword = document.getElementById('newPassword');
                const confirmPassword = document.getElementById('confirmPassword');

                if (!currentPassword || !currentPassword.value) {
                    Security.showAlert('يرجى إدخال كلمة المرور الحالية.', 'error');
                    currentPassword.focus();
                    return;
                }

                if (!newPassword || !newPassword.value) {
                    Security.showAlert('يرجى إدخال كلمة المرور الجديدة.', 'error');
                    newPassword.focus();
                    return;
                }

                const strength = Security.calculatePasswordStrength(newPassword.value);
                if (strength.percentage < 50) {
                    Security.showAlert('كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى.', 'error');
                    newPassword.focus();
                    return;
                }

                if (newPassword.value !== confirmPassword.value) {
                    Security.showAlert('كلمة المرور الجديدة وتأكيدها غير متطابقين.', 'error');
                    confirmPassword.focus();
                    return;
                }

                const submitBtn = document.getElementById('submitBtn');
                Security.showAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
                }

                setTimeout(function() {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-save"></i> تغيير كلمة المرور';
                    }
                    form.reset();
                    Security.updatePasswordRequirements('');
                    const strengthFill = document.getElementById('strengthFill');
                    if (strengthFill) strengthFill.style.width = '0%';
                    const strengthLabel = document.getElementById('strengthLabel');
                    if (strengthLabel) {
                        strengthLabel.className = 'strength-label';
                        strengthLabel.textContent = 'ضعيفة';
                    }
                    if (confirmHint) confirmHint.textContent = '';
                }, 2500);
            });
        }

        console.log('✅ Change Password page initialized successfully.');
    }
};
