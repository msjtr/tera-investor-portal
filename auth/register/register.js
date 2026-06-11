/**
 * ==========================================================================
 * TERA - Register Page Logic (Full Flow & Validation)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    const totalSteps = 4;

    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnSubmit = document.getElementById('btn-submit');
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.step');

    // 1. منطق التنقل بين المراحل
    function updateSteps() {
        // إظهار/إخفاء الأقسام
        steps.forEach((section, index) => {
            section.classList.toggle('active', index + 1 === currentStep);
        });

        // تحديث المؤشرات (Stepper)
        stepIndicators.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === currentStep);
            step.classList.toggle('completed', index + 1 < currentStep);
        });

        // إدارة ظهور الأزرار
        btnPrev.classList.toggle('hidden', currentStep === 1);
        btnNext.classList.toggle('hidden', currentStep === totalSteps);
        btnSubmit.classList.toggle('hidden', currentStep !== totalSteps);
    }

    // 2. التحقق من الحقول (Validation)
    function validateForm() {
        const currentSection = document.querySelector('.form-step.active');
        const inputs = currentSection.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.style.borderColor = '#dc3545';
                isValid = false;
            } else {
                input.style.borderColor = '#d1d5db';
            }
        });
        return isValid;
    }

    // 3. أوامر التنقل
    btnNext.addEventListener('click', () => {
        if (validateForm() && currentStep < totalSteps) {
            currentStep++;
            updateSteps();
        } else if (!validateForm()) {
            alert('يرجى تعبئة الحقول المطلوبة في هذه المرحلة.');
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateSteps();
        }
    });

    // 4. أوامر كلمة المرور (إظهار/قوة)
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            input.type = (input.type === 'password') ? 'text' : 'password';
            this.textContent = (input.type === 'text') ? 'إخفاء' : 'إظهار';
        });
    });

    const passInput = document.getElementById('password');
    if (passInput) {
        passInput.addEventListener('input', function() {
            const val = this.value;
            const bar = document.querySelector('.strength-bar');
            const text = document.querySelector('.strength-text');
            let score = (val.length >= 8) + (/[A-Z]/.test(val)) + (/[0-9]/.test(val));
            bar.className = 'strength-bar ' + (val.length === 0 ? '' : score === 1 ? 'weak' : score === 2 ? 'medium' : 'strong');
            text.textContent = 'مؤشر القوة: ' + (val.length === 0 ? 'ضعيفة' : score === 1 ? 'ضعيفة' : score === 2 ? 'متوسطة' : 'قوية');
        });
    }

    // 5. أوامر منع العربية في الحقول الإنجليزية
    const engFields = ['username', 'email', 'nameEn', 'password', 'confirm-password'];
    engFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                this.value = this.value.replace(/[\u0600-\u06FF]/g, '');
            });
        }
    });

    // 6. أمر الإرسال النهائي
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('تم تقديم الطلب بنجاح! سيتم تحويلك لصفحة التفعيل.');
        window.location.href = '../verify-otp.html';
    });
});
