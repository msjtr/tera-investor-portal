/**
 * TERA Investor Portal - Registration Wizard Engine
 * --------------------------------------------------
 * تم تحسين الكود لضمان الاستقرار ومنع التعارضات
 */

document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    // تهيئة العناصر باستخدام const لضمان نطاق المتغيرات
    const formSteps = Array.from(registerForm.querySelectorAll('.form-step'));
    const stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    const nextButtons = registerForm.querySelectorAll('.btn-next');
    const prevButtons = registerForm.querySelectorAll('.btn-prev');
    
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const passwordMatchSpan = document.getElementById('passwordMatch');
    
    const nationalitySelect = document.getElementById('nationality');
    const identityLabel = document.getElementById('identityLabel');
    const identityInput = document.getElementById('identityNumber');
    const typeCards = document.querySelectorAll('.type-selector-card');
    const investorTypeHidden = document.getElementById('investorType');

    let currentStep = 0;

    // === التنقل بين الخطوات ===
    function updateFormSteps() {
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        stepNodes.forEach((node, index) => {
            node.classList.toggle('active', index <= currentStep);
        });

        const container = document.querySelector('.register-card-wide');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (validateCurrentStep() && currentStep < formSteps.length - 1) {
                currentStep++;
                updateFormSteps();
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateFormSteps();
            }
        });
    });

    // === التحقق من الحقول ===
    function validateCurrentStep() {
        const activeStepFields = formSteps[currentStep].querySelectorAll('input[required], select[required]');
        for (let field of activeStepFields) {
            if (!field.checkValidity()) {
                field.reportValidity();
                return false;
            }
        }

        // منطق التحقق الإضافي
        if (currentStep === 0) {
            if (document.getElementById('email').value !== document.getElementById('confirmEmail').value) {
                alert('البريد الإلكتروني وتأكيده غير متطابقين.');
                return false;
            }
            if (passwordInput.value !== confirmPasswordInput.value) {
                alert('كلمات المرور غير متطابقة.');
                return false;
            }
            if (checkPasswordStrength(passwordInput.value) < 3) {
                alert('الرجاء اختيار كلمة مرور أقوى.');
                return false;
            }
        }
        return true;
    }

    // === معالجة كلمة المرور ===
    function checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    }

    function validatePasswordMatch() {
        if (!passwordMatchSpan) return;
        const isMatch = passwordInput.value === confirmPasswordInput.value;
        passwordMatchSpan.textContent = confirmPasswordInput.value === '' ? '' : (isMatch ? '✓ متطابقة' : '✕ غير متطابقة');
        passwordMatchSpan.style.color = isMatch ? '#00cc66' : '#ff4d4d';
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const score = checkPasswordStrength(passwordInput.value);
            if (strengthFill) {
                strengthFill.className = 'strength-fill';
                strengthFill.classList.add(score <= 2 ? 'weak' : (score === 3 ? 'medium' : 'strong'));
                strengthFill.style.width = score === 0 ? '0%' : (score <= 2 ? '33%' : (score === 3 ? '66%' : '100%'));
            }
            if (strengthText) {
                strengthText.textContent = score <= 2 ? 'ضعيفة جداً' : (score === 3 ? 'متوسطة' : 'قوية');
            }
            validatePasswordMatch();
        });
    }

    // === تسجيل الاستمارة ===
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validateCurrentStep()) return;

        const submitBtn = registerForm.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري المعالجة...';

        try {
            const response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(registerForm)))
            });
            const result = await response.json();
            if (response.ok) {
                window.location.href = result.redirectUrl || '/pages/dashboard/index.html';
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert('فشل التسجيل: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'إنشاء الحساب';
        }
    });
});
