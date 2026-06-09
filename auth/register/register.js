/**
 * TERA Investor Portal - Registration Wizard Engine (Optimized)
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    const formSteps = Array.from(registerForm.querySelectorAll('.form-step'));
    const stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    let currentStep = 0;

    // === التنقل بين الخطوات ===
    const updateFormSteps = () => {
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        stepNodes.forEach((node, index) => {
            node.classList.toggle('active', index === currentStep);
            node.classList.toggle('completed', index < currentStep);
        });

        // التمرير إلى أعلى النموذج عند الانتقال
        const header = document.querySelector('h1');
        if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // === التحقق من الحقول في الخطوة الحالية ===
    const validateCurrentStep = () => {
        const fields = formSteps[currentStep].querySelectorAll('input[required], select[required]');
        for (let field of fields) {
            if (!field.checkValidity()) {
                field.reportValidity();
                return false;
            }
        }
        return true;
    };

    // تفويض الحدث (Event Delegation) للأزرار
    registerForm.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-next')) {
            if (validateCurrentStep() && currentStep < formSteps.length - 1) {
                currentStep++;
                updateFormSteps();
            }
        } else if (e.target.classList.contains('btn-prev')) {
            if (currentStep > 0) {
                currentStep--;
                updateFormSteps();
            }
        }
    });

    // === منطق كلمة المرور (مع التحقق من وجود الحقول) ===
    const passwordInput = document.getElementById('password');
    const confirmInput = document.querySelector('input[name="confirm_password"]');
    
    if (passwordInput && confirmInput) {
        const validatePasswords = () => {
            const match = passwordInput.value === confirmInput.value;
            confirmInput.setCustomValidity(match ? '' : 'كلمات المرور غير متطابقة');
            
            // تحديث الـ UI (مؤشر القوة)
            const score = (passwordInput.value.length >= 8) + /[A-Z]/.test(passwordInput.value) + /[0-9]/.test(passwordInput.value);
            const strengthFill = document.getElementById('strengthFill');
            if (strengthFill) {
                strengthFill.style.width = (score * 33) + '%';
                strengthFill.className = `strength-fill ${score < 2 ? 'weak' : score === 2 ? 'medium' : 'strong'}`;
            }
        };
        [passwordInput, confirmInput].forEach(el => el.addEventListener('input', validatePasswords));
    }

    // === تسجيل الاستمارة ===
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = registerForm.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري المعالجة...';

        const data = Object.fromEntries(new FormData(registerForm).entries());

        try {
            const response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('حدث خطأ أثناء التسجيل، حاول مجدداً.');
            
            const result = await response.json();
            window.location.href = result.redirectUrl || '/dashboard';
        } catch (error) {
            console.error(error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'إنشاء الحساب';
            // استبدل alert بـ Toast أو رسالة تظهر داخل الصفحة
            alert(error.message); 
        }
    });
});
