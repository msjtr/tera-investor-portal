/**
 * TERA Investor Portal - Registration Wizard Engine
 * --------------------------------------------------
 * نظام إدارة استمارة التسجيل متعددة الخطوات - منصة تيرا الاستثمارية
 */

document.addEventListener('DOMContentLoaded', () => {
    // === 1. تعريف عناصر واجهة المستخدم (DOM Elements) ===
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    const formSteps = Array.from(registerForm.querySelectorAll('.form-step'));
    const stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    const nextButtons = registerForm.querySelectorAll('.btn-next');
    const prevButtons = registerForm.querySelectorAll('.btn-prev');
    
    // عناصر التحقق من كلمة المرور
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const passwordMatchSpan = document.getElementById('passwordMatch');
    
    // عناصر ديناميكية (الجنسية ونوع الحساب)
    const nationalitySelect = document.getElementById('nationality');
    const identityLabel = document.getElementById('identityLabel');
    const identityInput = document.getElementById('identityNumber');
    const typeCards = document.querySelectorAll('.type-selector-card');
    const investorTypeHidden = document.getElementById('investorType');

    let currentStep = 0;

    // === 2. نظام التنقل بين الخطوات (Wizard Navigation) ===
    
    // تحديث الواجهة الرسومية للخطوات والشريط العلوي
    function updateFormSteps() {
        // تحديث ظهور الحقول
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        // تحديث شريط الحالة العلوي (Stepper)
        stepNodes.forEach((node, index) => {
            if (index <= currentStep) {
                node.classList.add('active');
            } else {
                node.classList.remove('active');
            }
        });

        // التمرير التلقائي لأعلى البطاقة لراحة المستخدم عند التنقل
        const container = document.querySelector('.register-card-wide');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // زر التالي
    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (validateCurrentStep()) {
                if (currentStep < formSteps.length - 1) {
                    currentStep++;
                    updateFormSteps();
                }
            }
        });
    });

    // زر السابق
    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateFormSteps();
            }
        });
    });

    // === 3. التحقق الذكي من حقول الخطوة الحالية (Validation) ===
    function validateCurrentStep() {
        const activeStepFields = formSteps[currentStep].querySelectorAll('input[required], select[required]');
        let isStepValid = true;

        // التحقق القياسي للمتصفح (HTML5 Validation)
        activeStepFields.forEach(field => {
            if (!field.checkValidity()) {
                field.reportValidity();
                isStepValid = false;
            }
        });

        if (!isStepValid) return false;

        // تحققات منطقية مخصصة بناءً على رقم الخطوة الحالية
        if (currentStep === 0) {
            // مطابقة البريد الإلكتروني
            const email = document.getElementById('email').value;
            const confirmEmail = document.getElementById('confirmEmail').value;
            if (email !== confirmEmail) {
                alert('البريد الإلكتروني وتأكيده غير متطابقين.');
                return false;
            }

            // مطابقة كلمة المرور
            if (passwordInput.value !== confirmPasswordInput.value) {
                alert('كلمات المرور غير متطابقة.');
                return false;
            }
            
            // إلزام المستخدم بحد أدنى من الأمان
            if (checkPasswordStrength(passwordInput.value) < 3) {
                alert('الرجاء اختيار كلمة مرور أقوى تحتوي على مزيج من الأحرف والأرقام قبل الانتقال.');
                return false;
            }
        }

        if (currentStep === 2) {
            // تحقق كفاءة رقم الهوية أو الإقامة للمملكة العربية السعودية (10 أرقام)
            const nationality = nationalitySelect.value;
            if ((nationality === 'saudi' || nationality === 'resident') && identityInput.value.length !== 10) {
                alert('يجب أن يتكون رقم الهوية الوطنية أو الإقامة من 10 أرقام صحيحة.');
                return false;
            }
        }

        return true;
    }

    // === 4. فحص قوة كلمة المرور ومطابقتها (Password Security) ===
    function checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    }

    function validatePasswordMatch() {
        if (confirmPasswordInput.value === '') {
            passwordMatchSpan.textContent = '';
            return;
        }
        if (passwordInput.value === confirmPasswordInput.value) {
            passwordMatchSpan.textContent = '✓ كلمات المرور متطابقة';
            passwordMatchSpan.style.color = '#00cc66';
        } else {
            passwordMatchSpan.textContent = '✕ كلمات المرور غير متطابقة';
            passwordMatchSpan.style.color = '#ff4d4d';
        }
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const pass = passwordInput.value;
            const score = checkPasswordStrength(pass);
            
            strengthFill.className = 'strength-fill'; // إعادة تعيين كلاس الألوان
            
            if (pass.length === 0) {
                strengthText.textContent = 'أدخل كلمة المرور';
                strengthFill.style.width = '0%';
            } else if (score <= 2) {
                strengthText.textContent = 'ضعيفة جداً ⚠️';
                strengthText.style.color = '#ff4d4d';
                strengthFill.classList.add('weak');
                strengthFill.style.width = '33%';
            } else if (score === 3) {
                strengthText.textContent = 'متوسطة الأمان 👍';
                strengthText.style.color = '#ffaa00';
                strengthFill.classList.add('medium');
                strengthFill.style.width = '66%';
            } else {
                strengthText.textContent = 'قوية ومؤمنة تماماً ✨';
                strengthText.style.color = '#00cc66';
                strengthFill.classList.add('strong');
                strengthFill.style.width = '100%';
            }
            
            validatePasswordMatch();
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    // === 5. التحكم الديناميكي بفئة المستثمر والجنسية ===
    
    // تبديل واجهات كروت اختيار فئة المستثمر (أفراد / شركات)
    typeCards.forEach(card => {
        card.addEventListener('click', () => {
            typeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            const selectedType = card.getAttribute('data-type');
            if (investorTypeHidden) investorTypeHidden.value = selectedType;
