document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================
    // 1. فلاتر الإدخال (منع الكتابة باللغة الخاطئة)
    // ==========================================
    
    function restrictInput(elementId, regex) {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('input', function() {
                // استبدال أي حرف لا يطابق الشرط بفراغ
                this.value = this.value.replace(regex, '');
            });
        }
    }

    // اسم المستخدم: أحرف إنجليزية وأرقام فقط (يمنع المسافات والعربي والرموز)
    restrictInput('username', /[^A-Za-z0-9]/g);
    
    // البريد الإلكتروني: أحرف إنجليزية، أرقام، والرموز الخاصة بالبريد
    restrictInput('email', /[^A-Za-z0-9@.\-_]/g);
    restrictInput('confirmEmail', /[^A-Za-z0-9@.\-_]/g);
    
    // كلمات المرور: منع الأحرف العربية تماماً
    restrictInput('password', /[\u0600-\u06FF\u0750-\u077F]/g);
    restrictInput('confirmPassword', /[\u0600-\u06FF\u0750-\u077F]/g);
    
    // الاسم بالإنجليزية: أحرف إنجليزية ومسافات فقط
    restrictInput('fullNameEn', /[^A-Za-z\s]/g);
    
    // الاسم بالعربية: أحرف عربية ومسافات فقط
    restrictInput('fullNameAr', /[^\u0600-\u06FF\s]/g);

    // ==========================================
    // 2. التنقل والتحقق قبل الانتقال (Multi-Step Logic)
    // ==========================================
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.register-steps .step');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    let currentStep = 0;

    function updateFormSteps() {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
            
            if(index === currentStep) {
                stepIndicators[index].classList.add('active');
            } else if (index < currentStep) {
                stepIndicators[index].classList.add('completed');
                stepIndicators[index].classList.remove('active');
            } else {
                stepIndicators[index].classList.remove('active', 'completed');
            }
        });

        prevBtn.classList.toggle('d-none', currentStep === 0);
        
        if (currentStep === steps.length - 1) {
            nextBtn.classList.add('d-none');
            submitBtn.classList.remove('d-none');
        } else {
            nextBtn.classList.remove('d-none');
            submitBtn.classList.add('d-none');
        }
    }

    // التحقق من صحة المرحلة الحالية قبل الانتقال
    function validateCurrentStep() {
        if (currentStep === 0) {
            // التحقق من اسم المستخدم
            const userVal = document.getElementById('username').value;
            const isUserValid = userVal.length >= 4 && /^[A-Za-z0-9]+$/.test(userVal) && /^[a-zA-Z]/.test(userVal);
            
            // التحقق من البريد الإلكتروني
            const email = document.getElementById('email').value;
            const confirmEmail = document.getElementById('confirmEmail').value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmailValid = emailRegex.test(email) && email === confirmEmail;

            // التحقق من كلمة المرور
            const pass = document.getElementById('password').value;
            const confirmPass = document.getElementById('confirmPassword').value;
            const isPassValid = pass.length >= 8 && /[A-Z]/.test(pass) && /[a-z]/.test(pass) && /[0-9]/.test(pass) && /[!@#$%^&*(),.?":{}|<>]/.test(pass);
            const isPassMatch = pass === confirmPass && pass !== '';

            if (!isUserValid || !isEmailValid || !isPassValid || !isPassMatch) {
                alert('⚠️ يرجى التأكد من مطابقة جميع شروط اسم المستخدم، البريد الإلكتروني، وكلمة المرور.');
                return false;
            }
        } 
        else if (currentStep === 1) {
            const nameAr = document.getElementById('fullNameAr').value.trim();
            const nameEn = document.getElementById('fullNameEn').value.trim();
            const category = document.getElementById('accountCategory').value;
            
            if (!nameAr || !nameEn || !category) {
                alert('⚠️ يرجى إدخال الأسماء واختيار فئة الحساب.');
                return false;
            }
        }
        else if (currentStep === 2) {
            const mobile = document.getElementById('mobileNumber').value.trim();
            if (mobile.length < 8) {
                alert('⚠️ يرجى إدخال رقم جوال صحيح.');
                return false;
            }
        }
        return true;
    }

    nextBtn.addEventListener('click', () => {
        // منع الانتقال إذا لم تكتمل الشروط
        if (!validateCurrentStep()) return;

        if (currentStep < steps.length - 1) {
            currentStep++;
            updateFormSteps();
            window.scrollTo({ top: 0, behavior: 'smooth' }); // الصعود لأعلى الصفحة عند تبديل المرحلة
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateFormSteps();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    updateFormSteps();

    // ==========================================
    // 3. التحقق اللحظي للمرحلة الأولى (UI Updates)
    // ==========================================
    
    document.getElementById('showPassword').addEventListener('change', function() {
        document.getElementById('password').type = this.checked ? 'text' : 'password';
    });
    
    document.getElementById('showConfirmPassword').addEventListener('change', function() {
        document.getElementById('confirmPassword').type = this.checked ? 'text' : 'password';
    });

    // تحديث علامات التحقق لاسم المستخدم
    const usernameInput = document.getElementById('username');
    if(usernameInput) {
        usernameInput.addEventListener('input', function() {
            const val = this.value;
            toggleValidation('userRule1', val.length >= 4 && val.length <= 20);
            toggleValidation('userRule2', /^[a-zA-Z]/.test(val));
            toggleValidation('userRule4', !/\s/.test(val));
            toggleValidation('userRule5', /^[A-Za-z0-9]+$/.test(val));
        });
    }

    // تحديث علامات التحقق لكلمة المرور
    const passwordInput = document.getElementById('password');
    const strengthText = document.getElementById('passwordStrength');
    
    if(passwordInput) {
        passwordInput.addEventListener('input', function() {
            const val = this.value;
            const isLength = val.length >= 8;
            const hasUpper = /[A-Z]/.test(val);
            const hasLower = /[a-z]/.test(val);
            const hasNum = /[0-9]/.test(val);
            const hasSpec = /[!@#$%^&*(),.?":{}|<>]/.test(val);

            toggleValidation('passRule1', isLength);
            toggleValidation('passRule2', hasUpper);
            toggleValidation('passRule3', hasLower);
            toggleValidation('passRule4', hasNum);
            toggleValidation('passRule5', hasSpec);

            let strength = (isLength ? 1 : 0) + (hasUpper && hasLower ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpec ? 1 : 0);

            if (strength <= 1) {
                strengthText.innerHTML = '🔴 ضعيفة'; strengthText.style.color = 'red';
            } else if (strength === 2 || strength === 3) {
                strengthText.innerHTML = '🟡 متوسطة'; strengthText.style.color = 'orange';
            } else if (strength === 4) {
                strengthText.innerHTML = '🟢 قوية'; strengthText.style.color = 'green';
            } else {
                strengthText.innerHTML = '';
            }
        });
    }

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
    // 4. منطق المرحلة الثانية (الهوية والفئة)
    // ==========================================
    const accountCategory = document.getElementById('accountCategory');
    const identityWrappers = document.querySelectorAll('.identity-wrapper');

    if(accountCategory) {
        accountCategory.addEventListener('change', function() {
            identityWrappers.forEach(wrap => wrap.classList.add('d-none'));
            if(this.value === 'saudi') document.getElementById('saudiFields').classList.remove('d-none');
            else if(this.value === 'resident') document.getElementById('residentFields').classList.remove('d-none');
            else if(this.value === 'gcc') document.getElementById('gccFields').classList.remove('d-none');
            else if(this.value === 'foreign') document.getElementById('foreignFields').classList.remove('d-none');
        });
    }

    const documentType = document.getElementById('documentType');
    if(documentType) {
        documentType.addEventListener('change', function() {
            document.getElementById('foreignNationalIdFields').classList.add('d-none');
            document.getElementById('passportFields').classList.add('d-none');
            if(this.value === 'nid') document.getElementById('foreignNationalIdFields').classList.remove('d-none');
            else if(this.value === 'passport') document.getElementById('passportFields').classList.remove('d-none');
        });
    }

    // ==========================================
    // 5. منطق المرحلة الثالثة (العنوان)
    // ==========================================
    const countryCode = document.getElementById('countryCode');
    if(countryCode) {
        countryCode.addEventListener('change', function() {
            const natAddress = document.getElementById('nationalAddressWrapper');
            const intAddress = document.getElementById('internationalAddressWrapper');
            if(this.value === '+966') {
                if(natAddress) natAddress.classList.remove('d-none');
                if(intAddress) intAddress.classList.add('d-none');
            } else {
                if(natAddress) natAddress.classList.add('d-none');
                if(intAddress) intAddress.classList.remove('d-none');
            }
        });
        countryCode.dispatchEvent(new Event('change'));
    }

});
