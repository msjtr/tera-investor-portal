/**
 * ==========================================================================
 * TERA - Register Page Logic (Full Integrated)
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

    // 1. التنقل بين الخطوات
    function updateSteps() {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === currentStep);
        });

        stepIndicators.forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');
            if (index + 1 === currentStep) {
                indicator.classList.add('active');
            } else if (index + 1 < currentStep) {
                indicator.classList.add('completed');
            }
        });

        btnPrev.classList.toggle('hidden', currentStep === 1);
        
        if (currentStep === totalSteps) {
            btnNext.classList.add('hidden');
            btnSubmit.classList.remove('hidden');
        } else {
            btnNext.classList.remove('hidden');
            btnSubmit.classList.add('hidden');
        }
    }

    // 2. التحقق من الحقول الفارغة
    function validateCurrentStep() {
        const currentSection = document.getElementById(`step${currentStep}`);
        const requiredInputs = currentSection.querySelectorAll('input[required], select[required]');
        let isValid = true;

        requiredInputs.forEach(input => {
            if ((input.type !== 'checkbox' && input.value.trim() === '') || 
                (input.type === 'checkbox' && !input.checked)) {
                isValid = false;
                input.style.borderColor = '#dc3545';
                input.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
            } else {
                input.style.borderColor = '#d1d5db';
                input.style.boxShadow = 'none';
            }
        });

        if (!isValid) {
            alert('يرجى تعبئة جميع الحقول المطلوبة.');
            return false;
        }

        if (currentStep === 1) {
            if (currentSection.querySelectorAll('.invalid').length > 0) {
                alert('يرجى التأكد من استيفاء جميع شروط اسم المستخدم وكلمة المرور.');
                return false;
            }
            if (document.getElementById('email').value !== document.getElementById('confirm-email').value) {
                alert('البريد الإلكتروني غير متطابق.');
                return false;
            }
            if (document.getElementById('password').value !== document.getElementById('confirm-password').value) {
                alert('كلمة المرور غير متطابقة.');
                return false;
            }
        }
        return true;
    }

    btnNext.addEventListener('click', () => {
        if (validateCurrentStep() && currentStep < totalSteps) {
            currentStep++;
            updateSteps();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateSteps();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // 3. منع اللغة العربية
    function preventArabicInput(e) {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
        if (arabicRegex.test(e.target.value)) {
            e.target.value = e.target.value.replace(arabicRegex, '');
        }
    }

    const englishOnlyFields = [
        document.getElementById('username'),
        document.getElementById('email'),
        document.getElementById('confirm-email'),
        document.getElementById('password'),
        document.getElementById('confirm-password'),
        document.getElementById('nameEn')
    ];

    englishOnlyFields.forEach(field => {
        if (field) field.addEventListener('input', preventArabicInput);
    });

    // 4. زر الإظهار والإخفاء (مصلح)
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const wrapper = this.closest('.password-wrapper');
            const input = wrapper.querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = 'إخفاء';
            } else {
                input.type = 'password';
                this.textContent = 'إظهار';
            }
        });
    });

    // 5. التحقق الحي (Live Validation)
    function toggleValid(element, isValid) {
        element.classList.toggle('invalid', !isValid);
        element.classList.toggle('valid', isValid);
    }

    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            const val = e.target.value;
            const rules = document.querySelectorAll('#user-validation li');
            toggleValid(rules[0], val.length >= 4 && val.length <= 20);
            toggleValid(rules[1], /^[a-zA-Z0-9]+$/.test(val));
            toggleValid(rules[2], !/\s/.test(val) && val.length > 0);
            toggleValid(rules[3], !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(val));
            toggleValid(rules[4], val.length > 3);
        });
    }

    const passInput = document.getElementById('password');
    if (passInput) {
        passInput.addEventListener('input', (e) => {
            const val = e.target.value;
            const rules = document.querySelectorAll('#pass-validation li');
            const strengthBar = document.querySelector('.strength-bar');
            
            toggleValid(rules[0], val.length >= 8);
            toggleValid(rules[1], /[A-Z]/.test(val));
            toggleValid(rules[2], /[a-z]/.test(val));
            toggleValid(rules[3], /[0-9]/.test(val));
            toggleValid(rules[4], /[!@#$%^&*(),.?":{}|<>]/.test(val));
        });
    }

    // 6. الإرسال النهائي
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if(validateCurrentStep()) {
            alert('تم إنشاء الحساب بنجاح.');
            window.location.href = '../verify-otp.html';
        }
    });
});
