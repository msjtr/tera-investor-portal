/**
 * TERA Investor Portal - Registration Wizard Engine
 * --------------------------------------------------
 * موديول إدارة عملية التسجيل متعددة الخطوات بمنصة تيرا
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. تحديد العناصر الأساسية من واجهة المستخدم
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
    const passwordMatch = document.getElementById('passwordMatch');

    // عناصر فئة المستثمر والجنسية
    const typeCards = document.querySelectorAll('.type-selector-card');
    const investorTypeInput = document.getElementById('investorType');
    const nationalitySelect = document.getElementById('nationality');
    const identityLabel = document.getElementById('identityLabel');

    let currentStep = 0;

    // --- [أولاً: إدارة التنقل بين الخطوات] ---
    
    const updateStepUI = () => {
        // تحديث ظهور الخطوات (الفورم)
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        // تحديث مؤشرات شريط الخطوات العلوي
        stepNodes.forEach((node, index) => {
            if (index <= currentStep) {
                node.classList.add('active');
            } else {
                node.classList.remove('active');
            }
        });

        // التمرير التلقائي لأعلى الكارت عند الانتقال لخطوة جديدة لراحة المستخدم
        const card = document.querySelector('.register-card-wide');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // التحقق من صحة الحقول في الخطوة الحالية قبل الانتقال
    const validateCurrentStep = () => {
        const currentStepFields = formSteps[currentStep].querySelectorAll('input, select, textarea');
        let isValid = true;

        currentStepFields.forEach(field => {
            if (!field.checkValidity()) {
                field.reportValidity(); // إظهار التنبيه الافتراضي للمتصفح بشكل أنيق
                isValid = false;
            }
        });

        // تحقق إضافي مخصص للبريد الإلكتروني وكلمة المرور في الخطوة الأولى
        if (currentStep === 0) {
            const email = document.getElementById('email').value;
            const confirmEmail = document.getElementById('confirmEmail').value;
            
            if (email !== confirmEmail) {
                document.getElementById('confirmEmail').setCustomValidity('البريد الإلكتروني غير متطابق');
                document.getElementById('confirmEmail').reportValidity();
                isValid = false;
            } else {
                document.getElementById('confirmEmail').setCustomValidity('');
            }

            if (passwordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.setCustomValidity('كلمة المرور غير متطابقة');
                confirmPasswordInput.reportValidity();
                isValid = false;
            } else {
                confirmPasswordInput.setCustomValidity('');
            }
        }

        return isValid;
    };

    // مستمعي الأحداث لأزرار التالي والسابق
    nextButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateCurrentStep()) {
                if (currentStep < formSteps.length - 1) {
                    currentStep++;
                    updateStepUI();
                }
            }
        });
    });

    prevButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateStepUI();
            }
        });
    });


    // --- [ثانياً: التحقق المتقدم من كلمة المرور] ---

    const checkPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        // تحديث شريط القوة والألوان بناءً على النتيجة
        strengthFill.className = 'strength-fill'; // إعادة تعيين الكلاسات
        
        if (password.length === 0) {
            strengthFill.style.width = '0%';
            strengthText.textContent = 'أدخل كلمة المرور';
            strengthText.style.color = 'var(--text-muted)';
        } else if (strength <= 2) {
            strengthFill.style.width = '33%';
            strengthFill.classList.add('weak');
            strengthText.textContent = 'ضعيفة جداً';
            strengthText.style.color = '#ef4444';
        } else if (strength <= 4) {
            strengthFill.style.width = '66%';
            strengthFill.classList.add('medium');
            strengthText.textContent = 'متوسطة الأمان';
            strengthText.style.color = '#f59e0b';
        } else {
            strengthFill.style.width = '100%';
            strengthFill.classList.add('strong');
            strengthText.textContent = 'كلمة مرور قوية ومؤمنة';
            strengthText.style.color = 'var(--accent-primary)';
        }
    };

    const matchPasswords = () => {
        if (confirmPasswordInput.value === '') {
            passwordMatch.textContent = '';
            return;
        }

        if (passwordInput.value === confirmPasswordInput.value) {
            passwordMatch.textContent = '✓ كلمتا المرور متطابقتان';
            passwordMatch.style.color = 'var(--accent-primary)';
            confirmPasswordInput.setCustomValidity('');
        } else {
            passwordMatch.textContent = '✕ كلمتا المرور غير متطابقتان';
            passwordMatch.style.color = '#ef4444';
            confirmPasswordInput.setCustomValidity('غير متطابقة');
        }
    };

    passwordInput.addEventListener('input', (e) => {
        checkPasswordStrength(e.target.value);
        matchPasswords();
    });
    confirmPasswordInput.addEventListener('input', matchPasswords);


    // --- [ثالثاً: إدارة فئة المستثمر والتعديلات الديناميكية] ---

    typeCards.forEach(card => {
        card.addEventListener('click', () => {
            // إزالة التحديد النشط من جميع الكروت وإضافته للكارت المختار
            typeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            // تحديث قيمة الحقل المخفي لإرساله للسيرفر
            const selectedType = card.getAttribute('data-type');
            investorTypeInput.value = selectedType;

            // تغيير المسميات ديناميكياً لتناسب الشركات (KYC Adaptation)
            const nameArLabel = document.querySelector('label[for="fullNameAr"]');
            const nameEnLabel = document.querySelector('label[for="fullNameEn"]');

            if (selectedType === 'corporate') {
                if (nameArLabel) nameArLabel.textContent = 'اسم الشركة / المؤسسة الرسمي (بالعربية)';
                if (nameEnLabel) nameEnLabel.textContent = 'اسم الشركة الرسمي (بالإنجليزية)';
            } else {
                if (nameArLabel) nameArLabel.textContent = 'الاسم الكامل (بالعربية)';
                if (nameEnLabel) nameEnLabel.textContent = 'الاسم الكامل (بالإنجليزية)';
            }
        });
    });

    // تغيير نصوص التوثيق بناءً على الجنسية المختارة
    if (nationalitySelect) {
        nationalitySelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'saudi') {
                identityLabel.textContent = 'رقم الهوية الوطنية';
            } else if (val === 'resident') {
                identityLabel.textContent = 'رقم الإقامة';
            } else if (val === 'gcc') {
                identityLabel.textContent = 'رقم الهوية الخليجية / جواز السفر';
            } else {
                identityLabel.textContent = 'رقم جواز السفر للوافد الأجنبي';
            }
        });
    }


    // --- [رابعاً: معالجة إرسال البيانات النهائي للهوم بيج أو الـ API] ---

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // تجميع كل البيانات بطريقة احترافية معتمدة على الـ HTML Attributes المصلحة
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        // إظهار مؤشر تحميل على زر الإرسال لتجربة مستخدم متميزة
        const submitBtn = registerForm.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري معالجة وطلب إنشاء الحساب...';

        try {
            console.log('TERA Portal Submission Payload:', data);
            
            // محاكاة الاتصال بالنظام الخلفي للمنصة (API Endpoint Integration)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // عند النجاح يتم توجيه المستثمر لصفحة الترحيب أو لوحة التحكم مباشرة
            alert('تمإليك كود جافا سكريبت الكامل والمتطور للملف `register.js`. تم بناؤه باستخدام نظام الـ **ES Modules (`type="module"`)** ليتوافق تماماً مع الاستدعاء الموجود في ملف الـ HTML، وتم تدعيمه بآليات التحقق الذكي والانتقال السلس بين الخطوات، بالإضافة إلى فحص قوة كلمة المرور ودعم التغيير الديناميكي للتوثيق بناءً على الجنسية.

### 📄 كود الملف (`tera-investor-portal/auth/register/register.js`)

```javascript
/**
 * TERA Investor Portal - Registration Wizard Engine
 * نظام إدارة استمارة التسجيل متعددة الخطوات - منصة تيرا الاستثمارية
 */

document.addEventListener('DOMContentLoaded', () => {
    // === 1. تعريف عناصر واجهة المستخدم (DOM Elements) ===
    const registerForm = document.getElementById('registerForm');
    const formSteps = Array.from(document.querySelectorAll('.form-step'));
    const stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    const nextButtons = document.querySelectorAll('.btn-next');
    const prevButtons = document.querySelectorAll('.btn-prev');
    
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
    
    // زر التالي
    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (validateCurrentStep()) {
                currentStep++;
                updateFormSteps();
            }
        });
    });

    // زر السابق
    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentStep--;
            updateFormSteps();
        });
    });

    // تحديث الواجهة الرسومية للخطوات
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

        // التمرير التلقائي لأعلى البطاقة عند الانتقال لراحة المستخدم
        document.querySelector('.register-card-wide').scrollIntoView({ behavior: 'smooth' });
    }

    // === 3. التحقق الذكي من حقول الخطوة الحالية (Validation) ===
    function validateCurrentStep() {
        const activeStepFields = formSteps[currentStep].querySelectorAll('input[required], select[required]');
        let isStepValid = true;

        // التحقق من الحقول المطلوبة القياسية في HTML5
        activeStepFields.forEach(field => {
            if (!field.checkValidity()) {
                field.reportValidity();
                isStepValid = false;
            }
        });

        if (!isStepValid) return false;

        // تحققات مخصصة منطقية حسب الخطوة
        if (currentStep === 0) {
            // مطابقة البريد الإلكتروني
            const email = document.getElementById('email').value;
            const confirmEmail = document.getElementById('confirmEmail').value;
            if (email !== confirmEmail) {
                alert('البريد الإلكتروني وتأكيده غير متطابقين.');
                return false;
            }

            // مطابقة كلمة المرور وقوتها
            if (passwordInput.value !== confirmPasswordInput.value) {
                alert('كلمات المرور غير متطابقة.');
                return false;
            }
            
            if (checkPasswordStrength(passwordInput.value) < 3) {
                alert('الرجاء اختيار كلمة مرور أقوى قبل الانتقال للخطوة التالية.');
                return false;
            }
        }

        if (currentStep === 2) {
            // التحقق من طول الهوية الوطنية أو الإقامة (10 أرقام في السعودية)
            const nationality = nationalitySelect.value;
            if ((nationality === 'saudi' || nationality === 'resident') && identityInput.value.length !== 10) {
                alert('يجب أن يتكون رقم الهوية أو الإقامة من 10 أرقام.');
                return false;
            }
        }

        return true;
    }

    // === 4. فحص قوة كلمة المرور ومطابقتها (Password Security) ===
    passwordInput.addEventListener('input', () => {
        const pass = passwordInput.value;
        const score = checkPasswordStrength(pass);
        
        // تحديث مؤشر القوة الرسومي
        strengthFill.className = 'strength-fill'; // إعادة تعيين الكلاسات
        
        if (pass.length === 0) {
            strengthText.textContent = 'أدخل كلمة المرور';
            strengthFill.style.width = '0%';
        } else if (score <= 2) {
            strengthText.textContent = 'ضعيفة جداً ⚠️';
            strengthText.style.color = '#ff4d4d';
            strengthFill.classList.add('weak');
            strengthFill.style.width = '33%';
        } else if (score === 3) {
            strengthText.textContent = 'متوسطة 👍';
            strengthText.style.color = '#ffaa00';
            strengthFill.classList.add('medium');
            strengthFill.style.width = '66%';
        } else {
            strengthText.textContent = 'قوية ومؤمنة ممتازة ✨';
            strengthText.style.color = '#00cc66';
            strengthFill.classList.add('strong');
            strengthFill.style.width = '100%';
        }
        
        validatePasswordMatch();
    });

    confirmPasswordInput.addEventListener('input', validatePasswordMatch);

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

    // === 5. التحكم الديناميكي بفئة المستثمر والجنسية ===
    
    // بطاقات تحديد فئة المستثمر (فرد / مؤسسة)
    typeCards.forEach(card => {
        card.addEventListener('click', () => {
            typeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            const selectedType = card.getAttribute('data-type');
            investorTypeHidden.value = selectedType;
            
            // تخصيص حقول التوثيق بناءً على نوع الكيان القانوني للمستثمر
            if (selectedType === 'corporate') {
                identityLabel.textContent = 'رقم السجل التجاري للمنشأة';
                identityInput.placeholder = 'أدخل رقم السجل التجاري المكون من 10 أرقام';
            } else {
                updateIdentityLabelByNationality(nationalitySelect.value);
            }
        });
    });

    // تغير المسميات التوثيقية بناءً على الجنسية المختارة لمطابقة أنظمة الـ KYC
    nationalitySelect.addEventListener('change', (e) => {
        if (investorTypeHidden.value === 'individual') {
            updateIdentityLabelByNationality(e.target.value);
        }
    });

    function updateIdentityLabelByNationality(nationality) {
        switch (nationality) {
            case 'saudi':
                identityLabel.textContent = 'رقم الهوية الوطنية';
                identityInput.placeholder = '1xxxxxxxx';
                break;
            case 'resident':
                identityLabel.textContent = 'رقم هوية مقيم (الإقامة)';
                identityInput.placeholder = '2xxxxxxxx';
                break;
            case 'gcc':
                identityLabel.textContent = 'رقم الهوية الخليجية أو جواز السفر';
                identityInput.placeholder = 'أدخل رقم الهوية أو الجواز';
                break;
            default:
                identityLabel.textContent = 'رقم جواز السفر الدولي';
                identityInput.placeholder = 'أدخل رقم جواز السفر';
        }
    }

    // منع إدخال أي شيء عدا الأرقام لحقول الاتصال والهويات
    identityInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g
