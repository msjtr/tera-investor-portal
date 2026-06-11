document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================
    // 1. التنقل بين المراحل (Multi-Step Logic)
    // ==========================================
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.register-steps .step');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    let currentStep = 0;

    function updateFormSteps() {
        // إخفاء جميع المراحل وتحديث المؤشرات
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
            
            // تحديث شريط الخطوات العلوي
            if(index === currentStep) {
                stepIndicators[index].classList.add('active');
            } else if (index < currentStep) {
                stepIndicators[index].classList.add('completed');
                stepIndicators[index].classList.remove('active');
            } else {
                stepIndicators[index].classList.remove('active', 'completed');
            }
        });

        // التحكم في الأزرار
        prevBtn.classList.toggle('d-none', currentStep === 0);
        
        if (currentStep === steps.length - 1) {
            nextBtn.classList.add('d-none');
            submitBtn.classList.remove('d-none');
        } else {
            nextBtn.classList.remove('d-none');
            submitBtn.classList.add('d-none');
        }
    }

    nextBtn.addEventListener('click', () => {
        // يمكن إضافة دوال التحقق من الحقول هنا قبل الانتقال
        if (currentStep < steps.length - 1) {
            currentStep++;
            updateFormSteps();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateFormSteps();
        }
    });

    // التهيئة المبدئية
    updateFormSteps();

    // ==========================================
    // 2. التحقق اللحظي للمرحلة الأولى
    // ==========================================
    
    // إظهار/إخفاء كلمة المرور
    document.getElementById('showPassword').addEventListener('change', function() {
        document.getElementById('password').type = this.checked ? 'text' : 'password';
    });
    
    document.getElementById('showConfirmPassword').addEventListener('change', function() {
        document.getElementById('confirmPassword').type = this.checked ? 'text' : 'password';
    });

    // التحقق من اسم المستخدم
    const usernameInput = document.getElementById('username');
    usernameInput.addEventListener('input', function() {
        const val = this.value;
        const r1 = val.length >= 4 && val.length <= 20;
        const r2 = /^[A-Za-z0-9]+$/.test(val); // أحرف وأرقام فقط بدون رموز أو مسافات
        const r3 = !/\s/.test(val);

        toggleValidation('userRule1', r1);
        toggleValidation('userRule2', /^[a-zA-Z]/.test(val)); // يبدأ بحرف
        toggleValidation('userRule4', r3);
        toggleValidation('userRule5', r2);
    });

    // التحقق من قوة كلمة المرور
    const passwordInput = document.getElementById('password');
    const strengthText = document.getElementById('passwordStrength');
    
    passwordInput.addEventListener('input', function() {
        const val = this.value;
        const hasUpper = /[A-Z]/.test(val);
        const hasLower = /[a-z]/.test(val);
        const hasNum = /[0-9]/.test(val);
        const hasSpec = /[!@#$%^&*(),.?":{}|<>]/.test(val);
        const isLength = val.length >= 8;

        toggleValidation('passRule1', isLength);
        toggleValidation('passRule2', hasUpper);
        toggleValidation('passRule3', hasLower);
        toggleValidation('passRule4', hasNum);
        toggleValidation('passRule5', hasSpec);

        let strength = 0;
        if(isLength) strength++;
        if(hasUpper && hasLower) strength++;
        if(hasNum) strength++;
        if(hasSpec) strength++;

        if (strength <= 1) {
            strengthText.innerHTML = '🔴 ضعيفة';
            strengthText.style.color = 'red';
        } else if (strength === 2 || strength === 3) {
            strengthText.innerHTML = '🟡 متوسطة';
            strengthText.style.color = 'orange';
        } else if (strength === 4) {
            strengthText.innerHTML = '🟢 قوية';
            strengthText.style.color = 'green';
        } else {
            strengthText.innerHTML = '';
        }
    });

    function toggleValidation(elementId, isValid) {
        const el = document.getElementById(elementId);
        if(el) {
            if(isValid) {
                el.classList.add('valid');
                el.classList.remove('invalid');
                el.innerHTML = el.innerHTML.replace('☐', '☑');
            } else {
                el.classList.add('invalid');
                el.classList.remove('valid');
                el.innerHTML = el.innerHTML.replace('☑', '☐');
            }
        }
    }

    // ==========================================
    // 3. منطق المرحلة الثانية (الهوية والفئة)
    // ==========================================
    const accountCategory = document.getElementById('accountCategory');
    const identityWrappers = document.querySelectorAll('.identity-wrapper');

    accountCategory.addEventListener('change', function() {
        // إخفاء جميع الحقول أولاً
        identityWrappers.forEach(wrap => wrap.classList.add('d-none'));
        
        // إظهار الحقول بناءً على الاختيار
        if(this.value === 'saudi') {
            document.getElementById('saudiFields').classList.remove('d-none');
        } else if(this.value === 'resident') {
            document.getElementById('residentFields').classList.remove('d-none');
        } else if(this.value === 'gcc') {
            document.getElementById('gccFields').classList.remove('d-none');
        } else if(this.value === 'foreign') {
            document.getElementById('foreignFields').classList.remove('d-none');
        }
    });

    // تبديل وثيقة الأجنبي (هوية/جواز)
    const documentType = document.getElementById('documentType');
    documentType.addEventListener('change', function() {
        document.getElementById('foreignNationalIdFields').classList.add('d-none');
        document.getElementById('passportFields').classList.add('d-none');

        if(this.value === 'nid') {
            document.getElementById('foreignNationalIdFields').classList.remove('d-none');
        } else if(this.value === 'passport') {
            document.getElementById('passportFields').classList.remove('d-none');
        }
    });

    // ==========================================
    // 4. منطق المرحلة الثالثة (العنوان)
    // ==========================================
    const countryCode = document.getElementById('countryCode');
    countryCode.addEventListener('change', function() {
        const natAddress = document.getElementById('nationalAddressWrapper');
        const intAddress = document.getElementById('internationalAddressWrapper');
        
        // إذا كان المفتاح للسعودية أظهر العنوان الوطني، غير ذلك أظهر الدولي
        if(this.value === '+966') {
            natAddress.classList.remove('d-none');
            intAddress.classList.add('d-none');
        } else {
            natAddress.classList.add('d-none');
            intAddress.classList.remove('d-none');
        }
    });
    // تفعيل الحدث برمجياً عند التحميل لضبط الحالة الافتراضية
    countryCode.dispatchEvent(new Event('change'));

});
