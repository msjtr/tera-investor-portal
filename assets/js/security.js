/* ============================================================
   TERA INVESTOR PORTAL - SECURITY LOGIC
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const currentPasswordInput = document.getElementById('currentPassword');
    const submitBtn = document.getElementById('submitBtn');
    const matchError = document.getElementById('passwordMatchError');

    // 1. منطق إظهار/إخفاء كلمة المرور
    document.querySelectorAll('.btn-toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const inputElement = document.getElementById(targetId);
            const iconElement = this.querySelector('i');

            if (inputElement.type === 'password') {
                inputElement.type = 'text';
                iconElement.setAttribute('data-lucide', 'eye-off');
            } else {
                inputElement.type = 'password';
                iconElement.setAttribute('data-lucide', 'eye');
            }
            lucide.createIcons();
        });
    });

    // 2. التحقق المباشر من الشروط
    const validatePassword = () => {
        if (!newPasswordInput) return false;
        
        const val = newPasswordInput.value;
        const rules = {
            length: val.length >= 8,
            upper: /[A-Z]/.test(val),
            number: /[0-9]/.test(val),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(val)
        };

        updateRequirementItem('req-length', rules.length);
        updateRequirementItem('req-upper', rules.upper);
        updateRequirementItem('req-number', rules.number);
        updateRequirementItem('req-special', rules.special);

        return Object.values(rules).every(Boolean);
    };

    const updateRequirementItem = (elementId, isValid) => {
        const item = document.getElementById(elementId);
        if (!item) return;
        
        const icon = item.querySelector('i');
        
        if (isValid) {
            item.classList.remove('text-muted');
            item.classList.add('text-success');
            icon.setAttribute('data-lucide', 'check-circle');
            icon.style.color = '#16A34A';
        } else {
            item.classList.add('text-muted');
            item.classList.remove('text-success');
            icon.setAttribute('data-lucide', 'x-circle');
            icon.style.color = '#DC2626';
        }
        lucide.createIcons();
    };

    // 3. التحقق من تطابق كلمتي المرور
    const checkMatch = () => {
        if (!confirmPasswordInput || !newPasswordInput || !matchError) return false;
        
        if (confirmPasswordInput.value.length > 0) {
            if (newPasswordInput.value !== confirmPasswordInput.value) {
                matchError.style.display = 'block';
                return false;
            } else {
                matchError.style.display = 'none';
                return true;
            }
        }
        matchError.style.display = 'none';
        return false;
    };

    // 4. إدارة حالة زر الإرسال
    const checkFormValidity = () => {
        if (!submitBtn) return;
        
        const isCurrentFilled = currentPasswordInput && currentPasswordInput.value.length > 0;
        const isNewValid = validatePassword();
        const isMatch = checkMatch();

        submitBtn.disabled = !(isCurrentFilled && isNewValid && isMatch);
    };

    // ربط الأحداث
    if (currentPasswordInput) currentPasswordInput.addEventListener('input', checkFormValidity);
    if (newPasswordInput) newPasswordInput.addEventListener('input', checkFormValidity);
    if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', checkFormValidity);

    // 5. محاكاة الإرسال
    const form = document.getElementById('changePasswordForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('تم تحديث كلمة المرور بنجاح.');
            form.reset();
            checkFormValidity();
        });
    }
}); // هذا هو القوس الذي كان مفقوداً ويسبب الخطأ
