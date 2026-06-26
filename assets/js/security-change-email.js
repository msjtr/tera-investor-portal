/**
 * ============================================================
 * تغيير البريد الإلكتروني - Change Email
 * ============================================================
 * الموقع: /assets/js/security-change-email.js
 * ============================================================
 */

// التأكد من وجود الكائن العام
window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['change-email'] = {
    init: function() {
        console.log('📧 Initializing Change Email page...');

        const form = document.getElementById('changeEmailForm');
        if (!form) {
            console.warn('⚠️ Change Email form not found.');
            return;
        }

        const newEmail = document.getElementById('newEmail');
        const confirmEmail = document.getElementById('confirmEmail');
        const newEmailHint = document.getElementById('newEmailHint');
        const confirmHint = document.getElementById('confirmEmailHint');

        // ============================================
        // 1. التحقق من صحة البريد الإلكتروني الجديد
        // ============================================
        if (newEmail && newEmailHint) {
            newEmail.addEventListener('input', function() {
                const value = this.value.trim();
                const isValid = value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

                if (value === '') {
                    newEmailHint.className = 'email-hint';
                    newEmailHint.innerHTML = '<i class="fas fa-info-circle"></i> أدخل بريداً إلكترونياً صحيحاً وفعالاً.';
                    this.style.borderColor = '';
                } else if (isValid) {
                    newEmailHint.className = 'email-hint success';
                    newEmailHint.innerHTML = '<i class="fas fa-check-circle"></i> البريد الإلكتروني صحيح.';
                    this.style.borderColor = '#16a34a';
                } else {
                    newEmailHint.className = 'email-hint error';
                    newEmailHint.innerHTML = '<i class="fas fa-times-circle"></i> يرجى إدخال بريد إلكتروني صحيح.';
                    this.style.borderColor = '#dc2626';
                }

                // إعادة التحقق من التطابق إذا كان حقل التأكيد يحتوي على قيمة
                if (confirmEmail && confirmEmail.value) {
                    checkMatch();
                }
            });
        }

        // ============================================
        // 2. التحقق من تطابق البريدين
        // ============================================
        function checkMatch() {
            if (!newEmail || !confirmEmail || !confirmHint) return;

            const newVal = newEmail.value.trim();
            const confirmVal = confirmEmail.value.trim();

            if (confirmVal === '') {
                confirmHint.className = 'email-hint';
                confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع البريد الإلكتروني الجديد.';
                confirmEmail.style.borderColor = '';
                return;
            }

            if (newVal === confirmVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(confirmVal)) {
                confirmHint.className = 'email-hint success';
                confirmHint.innerHTML = '<i class="fas fa-check-circle"></i> البريدان متطابقان.';
                confirmEmail.style.borderColor = '#16a34a';
            } else {
                confirmHint.className = 'email-hint error';
                confirmHint.innerHTML = '<i class="fas fa-times-circle"></i> البريدان غير متطابقين.';
                confirmEmail.style.borderColor = '#dc2626';
            }
        }

        if (newEmail && confirmEmail && confirmHint) {
            confirmEmail.addEventListener('input', checkMatch);
            // إعادة التحقق عند تغيير البريد الجديد بعد كتابة التأكيد
            newEmail.addEventListener('input', function() {
                if (confirmEmail.value) checkMatch();
            });
        }

        // ============================================
        // 3. معالج إرسال النموذج
        // ============================================
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const newEmailVal = newEmail.value.trim();
            const confirmVal = confirmEmail.value.trim();

            // التحقق من صحة البريد الإلكتروني الجديد
            if (!newEmailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmailVal)) {
                Security.showAlert('يرجى إدخال بريد إلكتروني جديد صحيح.', 'error');
                newEmail.focus();
                return;
            }

            // التحقق من تطابق البريدين
            if (newEmailVal !== confirmVal) {
                Security.showAlert('البريد الإلكتروني الجديد وتأكيده غير متطابقين.', 'error');
                confirmEmail.focus();
                return;
            }

            // التأكد من أن البريد الجديد مختلف عن الحالي
            const currentEmail = document.getElementById('currentEmail');
            if (currentEmail && currentEmail.value === newEmailVal) {
                Security.showAlert('البريد الإلكتروني الجديد مطابق للبريد الحالي. يرجى اختيار بريد آخر.', 'error');
                newEmail.focus();
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            Security.showAlert('✅ تم تغيير البريد الإلكتروني بنجاح. جاري إرسال رمز التحقق...', 'success');

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
            }

            setTimeout(function() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> تغيير البريد الإلكتروني';
                }
                form.reset();
                // إعادة تعيين التلميحات
                if (newEmailHint) {
                    newEmailHint.className = 'email-hint';
                    newEmailHint.innerHTML = '<i class="fas fa-info-circle"></i> أدخل بريداً إلكترونياً صحيحاً وفعالاً.';
                }
                if (confirmHint) {
                    confirmHint.className = 'email-hint';
                    confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع البريد الإلكتروني الجديد.';
                }
                // إعادة تعيين لون الحدود
                if (newEmail) newEmail.style.borderColor = '';
                if (confirmEmail) confirmEmail.style.borderColor = '';

                // إعادة تعيين البريد الحالي (قيمة افتراضية)
                const currentEmailInput = document.getElementById('currentEmail');
                if (currentEmailInput) {
                    currentEmailInput.value = 'mohammed@example.com';
                }
            }, 3000);
        });

        console.log('✅ Change Email page initialized successfully.');
    }
};
