/**
 * TERA Investor Portal - Registration Wizard Engine (Fixed & Enhanced)
 * المسار: /auth/register/register.js
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    const formSteps = Array.from(registerForm.querySelectorAll('.form-step'));
    const stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    let currentStep = 0;

    // === 1. تحديث واجهة الخطوات وشريط التتبع ===
    const updateUI = () => {
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        stepNodes.forEach((node, index) => {
            node.classList.toggle('active', index === currentStep);
            node.classList.toggle('completed', index < currentStep);
        });

        // التمرير السلس لأعلى النموذج عند الانتقال لراحة المستخدم
        const card = document.querySelector('.register-card-wide');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // === 2. التحقق الذكي من الحقول والخطوات الحالية ===
    const validateStep = () => {
        const currentStepEl = formSteps[currentStep];
        const fields = currentStepEl.querySelectorAll('input[required], select[required]');
        
        for (let field of fields) {
            if (!field.checkValidity()) {
                field.reportValidity();
                return false;
            }
        }

        // تحقق إضافي خاص بالخطوة الأولى: تطابق البريد الإلكتروني وكلمات المرور
        if (currentStep === 0) {
            const email = currentStepEl.querySelector('input[name="email"]');
            const confirmEmail = currentStepEl.querySelector('input[name="confirm_email"]');
            const password = document.getElementById('password');
            const confirmPassword = currentStepEl.querySelector('input[name="confirm_password"]');

            if (email && confirmEmail && email.value !== confirmEmail.value) {
                confirmEmail.setCustomValidity('البريد الإلكتروني غير متطابق');
                confirmEmail.reportValidity();
                return false;
            } else if (confirmEmail) {
                confirmEmail.setCustomValidity('');
            }

            if (password && confirmPassword && password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('كلمة المرور غير متطابقة');
                confirmPassword.reportValidity();
                return false;
            } else if (confirmPassword) {
                confirmPassword.setCustomValidity('');
            }
        }

        return true;
    };

    // === 3. مؤشر قوة كلمة المرور (خطوة 1) ===
    const passwordInput = document.getElementById('password');
    const strengthFill = document.getElementById('strengthFill');

    if (passwordInput && strengthFill) {
        passwordInput.addEventListener('input', (e) => {
            const val = e.target.value;
            let score = 0;

            if (val.length >= 8) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;

            // حساب العرض وتغيير الألوان بناءً على التنسيق الجديد
            strengthFill.style.width = val.length === 0 ? '0%' : (score === 0 ? '10%' : (score * 33.3) + '%');
            strengthFill.className = 'strength-fill ' + (score < 2 ? 'weak' : score === 2 ? 'medium' : 'strong');
        });
    }

    // === 4. التبديل الديناميكي لمسميات الهوية (خطوة 3) ===
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

    // === 5. معالجة نقرات الأزرار بالتفويض ===
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

    // === 6. معالجة الإرسال النهائي وتجهيز الـ FormData ===
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateStep()) return;

        const submitBtn = registerForm.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري الإنشاء...';

        try {
            // بما أن النموذج يحتوي على ملفات (ملفات خطوة 6)، يفضل إرسال البيانات كـ FormData للباك اند
            // وإذا كان الباك اند يستقبل فقط JSON، نقوم بتحويل النصيات فقط كما فعلت سابقاً:
            const formData = new FormData(registerForm);
            
            // في حال الاستثمار الحقيقي والرفع الفعلي للملفات، يرسل الـ formData مباشرة:
            // body: formData بدون تحديد Content-Type (المتصفح سيحددها تلقائياً مع الـ boundary)
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
            submitBtn.textContent = 'تأكيد وإنشاء الحساب';
        }
    });
});
