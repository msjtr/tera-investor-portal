/**
 * TERA Investor Portal - Registration Wizard Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    const formSteps = Array.from(registerForm.querySelectorAll('.form-step'));
    const stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    let currentStep = 0;

    // 1. تحديث واجهة الخطوات
    const updateUI = () => {
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        stepNodes.forEach((node, index) => {
            node.classList.toggle('active', index === currentStep);
            node.classList.toggle('completed', index < currentStep);
        });
    };

    // 2. التحقق من الحقول قبل الانتقال
    const validateStep = () => {
        const fields = formSteps[currentStep].querySelectorAll('input[required], select[required]');
        for (let field of fields) {
            if (!field.checkValidity()) {
                field.reportValidity();
                return false;
            }
        }
        return true;
    };

    // 3. التبديل الديناميكي لمسميات الهوية
    const nationalitySelect = document.getElementById('nationality');
    const identityLabel = document.getElementById('identityLabel');
    
    if (nationalitySelect && identityLabel) {
        nationalitySelect.addEventListener('change', (e) => {
            const labels = {
                'saudi': 'رقم الهوية الوطنية',
                'gcc': 'رقم الهوية الخليجية',
                'resident': 'رقم الإقامة',
                'foreign': 'رقم جواز السفر'
            };
            identityLabel.textContent = labels[e.target.value] || 'رقم الهوية';
        });
    }

    // 4. معالجة النقرات (التالي والسابق)
    registerForm.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-next')) {
            if (validateStep() && currentStep < formSteps.length - 1) {
                currentStep++;
                updateUI();
            }
        } else if (e.target.classList.contains('btn-prev')) {
            if (currentStep > 0) {
                currentStep--;
                updateUI();
            }
        }
    });

    // 5. إرسال النموذج النهائي
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = registerForm.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري الإنشاء...';

        try {
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            const response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('فشل تسجيل الحساب، يرجى المحاولة لاحقاً');
            
            window.location.href = '/pages/dashboard/index.html';
        } catch (error) {
            alert(error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'إنشاء الحساب';
        }
    });
});
