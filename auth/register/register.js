/**
 * TERA Investor Portal - Registration Wizard Engine (Fixed)
 */

document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    const formSteps = Array.from(registerForm.querySelectorAll('.form-step'));
    const stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    const nextButtons = registerForm.querySelectorAll('.btn-next');
    const prevButtons = registerForm.querySelectorAll('.btn-prev');
    
    // استخدام Optional Chaining أو التحقق من وجود العنصر لتجنب أخطاء Null
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const passwordMatchSpan = document.getElementById('passwordMatch');

    let currentStep = 0;

    // === التنقل بين الخطوات ===
    function updateFormSteps() {
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        stepNodes.forEach((node, index) => {
            node.classList.toggle('active', index <= currentStep);
        });

        document.querySelector('.register-card-wide').scrollIntoView({ behavior: 'smooth' });
    }

    nextButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); // منع الإرسال التلقائي
            if (validateCurrentStep() && currentStep < formSteps.length - 1) {
                currentStep++;
                updateFormSteps();
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentStep > 0) {
                currentStep--;
                updateFormSteps();
            }
        });
    });

    // === التحقق من الحقول (مُحسّن) ===
    function validateCurrentStep() {
        const activeStepFields = formSteps[currentStep].querySelectorAll('input[required], select[required]');
        for (let field of activeStepFields) {
            if (!field.checkValidity()) {
                field.reportValidity();
                return false;
            }
        }
        return true;
    }

    // === معالجة كلمة المرور (آمنة) ===
    if (passwordInput && confirmPasswordInput) {
        const checkStrength = (val) => {
            let score = 0;
            if (val.length >= 8) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            return score;
        };

        [passwordInput, confirmPasswordInput].forEach(el => {
            el.addEventListener('input', () => {
                const score = checkStrength(passwordInput.value);
                if (strengthFill) {
                    strengthFill.style.width = (score * 33) + '%';
                    strengthFill.className = 'strength-fill ' + (score < 2 ? 'weak' : score === 2 ? 'medium' : 'strong');
                }
                if (passwordMatchSpan) {
                    const match = passwordInput.value === confirmPasswordInput.value;
                    passwordMatchSpan.textContent = confirmPasswordInput.value ? (match ? '✓ متطابقة' : '✕ غير متطابقة') : '';
                    passwordMatchSpan.style.color = match ? '#10b981' : '#ef4444';
                }
            });
        });
    }

    // === تسجيل الاستمارة ===
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        
        // التحقق النهائي من تطابق كلمات المرور قبل الإرسال
        if (passwordInput.value !== confirmPasswordInput.value) {
            alert('كلمات المرور غير متطابقة');
            return;
        }

        const submitBtn = registerForm.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري المعالجة...';

        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) throw new Error('فشل الاتصال بالخادم');
            
            const result = await response.json();
            window.location.href = result.redirectUrl || '/dashboard';
        } catch (error) {
            alert(error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'إنشاء الحساب';
        }
    });
});
