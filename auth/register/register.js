/**
 * TERA Investor Portal - Registration Wizard Engine
 * --------------------------------------------------
 * نظام إدارة استمارة التسجيل متعددة الخطوات - منصة تيرا الاستثمارية
 */

document.addEventListener('DOMContentLoaded', function () {
    // === 1. تعريف عناصر واجهة المستخدم (DOM Elements) ===
    var registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    var formSteps = Array.from(registerForm.querySelectorAll('.form-step'));
    var stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    var nextButtons = registerForm.querySelectorAll('.btn-next');
    var prevButtons = registerForm.querySelectorAll('.btn-prev');
    
    // عناصر التحقق من كلمة المرور
    var passwordInput = document.getElementById('password');
    var confirmPasswordInput = document.getElementById('confirmPassword');
    var strengthFill = document.getElementById('strengthFill');
    var strengthText = document.getElementById('strengthText');
    var passwordMatchSpan = document.getElementById('passwordMatch');
    
    // عناصر ديناميكية (الجنسية ونوع الحساب)
    var nationalitySelect = document.getElementById('nationality');
    var identityLabel = document.getElementById('identityLabel');
    var identityInput = document.getElementById('identityNumber');
    var typeCards = document.querySelectorAll('.type-selector-card');
    var investorTypeHidden = document.getElementById('investorType');

    var currentStep = 0;

    // === 2. نظام التنقل بين الخطوات (Wizard Navigation) ===
    function updateFormSteps() {
        formSteps.forEach(function (step, index) {
            step.classList.toggle('active', index === currentStep);
        });

        stepNodes.forEach(function (node, index) {
            if (index <= currentStep) {
                node.classList.add('active');
            } else {
                node.classList.remove('active');
            }
        });

        var container = document.querySelector('.register-card-wide');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    nextButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            if (validateCurrentStep()) {
                if (currentStep < formSteps.length - 1) {
                    currentStep++;
                    updateFormSteps();
                }
            }
        });
    });

    prevButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            if (currentStep > 0) {
                currentStep--;
                updateFormSteps();
            }
        });
    });

    // === 3. التحقق الذكي من حقول الخطوة الحالية (Validation) ===
    function validateCurrentStep() {
        var activeStepFields = formSteps[currentStep].querySelectorAll('input[required], select[required]');
        var isStepValid = true;

        activeStepFields.forEach(function (field) {
            if (!field.checkValidity()) {
                field.reportValidity();
                isStepValid = false;
            }
        });

        if (!isStepValid) return false;

        if (currentStep === 0) {
            var email = document.getElementById('email').value;
            var confirmEmail = document.getElementById('confirmEmail').value;
            if (email !== confirmEmail) {
                alert('البريد الإلكتروني وتأكيده غير متطابقين.');
                return false;
            }

            if (passwordInput.value !== confirmPasswordInput.value) {
                alert('كلمات المرور غير متطابقة.');
                return false;
            }
            
            if (checkPasswordStrength(passwordInput.value) < 3) {
                alert('الرجاء اختيار كلمة مرور أقوى تحتوي على مزيج من الأحرف والأرقام قبل الانتقال.');
                return false;
            }
        }

        if (currentStep === 2) {
            var nationality = nationalitySelect.value;
            if ((nationality === 'saudi' || nationality === 'resident') && identityInput.value.length !== 10) {
                alert('يجب أن يتكون رقم الهوية الوطنية أو الإقامة من 10 أرقام صحيحة.');
                return false;
            }
        }

        return true;
    }

    // === 4. فحص قوة كلمة المرور ومطابقتها (Password Security) ===
    function checkPasswordStrength(password) {
        var score = 0;
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
        passwordInput.addEventListener('input', function () {
            var pass = passwordInput.value;
            var score = checkPasswordStrength(pass);
            
            strengthFill.className = 'strength-fill';
            
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
    typeCards.forEach(function (card) {
        card.addEventListener('click', function () {
            typeCards.forEach(function (c) { c.classList.remove('selected'); });
            card.classList.add('selected');
            
            var selectedType = card.getAttribute('data-type');
            if (investorTypeHidden) investorTypeHidden.value = selectedType;
            
            var nameArLabel = document.querySelector('label[for="fullNameAr"]');
            var nameEnLabel = document.querySelector('label[for="fullNameEn"]');
            
            if (selectedType === 'corporate') {
                if (nameArLabel) nameArLabel.textContent = 'اسم الشركة / المؤسسة الرسمي (بالعربية)';
                if (nameEnLabel) nameEnLabel.textContent = 'اسم الشركة الرسمي (بالإنجليزية)';
                if (identityLabel) identityLabel.textContent = 'رقم السجل التجاري للمنشأة';
                if (identityInput) identityInput.placeholder = 'أدخل رقم السجل التجاري المكون من 10 أرقام';
            } else {
                if (nameArLabel) nameArLabel.textContent = 'الاسم الكامل (بالعربية)';
                if (nameEnLabel) nameEnLabel.textContent = 'الاسم الكامل (بالإنجليزية)';
                if (nationalitySelect) updateIdentityLabelByNationality(nationalitySelect.value);
            }
        });
    });

    if (nationalitySelect) {
        nationalitySelect.addEventListener('change', function (e) {
            if (investorTypeHidden && investorTypeHidden.value === 'individual') {
                updateIdentityLabelByNationality(e.target.value);
            }
        });
    }

    function updateIdentityLabelByNationality(nationality) {
        if (!identityLabel || !identityInput) return;
        
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

    if (identityInput) {
        identityInput.addEventListener('input', function (e) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
    
    var mobileInput = document.getElementById('mobile');
    if (mobileInput) {
        mobileInput.addEventListener('input', function (e) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    // === 6. معالجة الإرسال النهائي للاستمارة (Form Submission) ===
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!validateCurrentStep()) return;

        var formData = new FormData(registerForm);
        var registrationPayload = Object.fromEntries(formData.entries());

        var submitBtn = registerForm.querySelector('.btn-submit');
        var originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري معالجة البيانات وتجهيز المحفظة...';

        try {
            var response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(registrationPayload)
            });

            var result = await response.json();

            if (response.ok) {
                alert('تم إنشاء حسابك المستثمري بنجاح! سيتم توجيهك الآن إلى لوحة التحكم الخاصة بك.');
                window.location.href = result.redirectUrl || '/pages/dashboard/index.html';
            } else {
                throw new Error(result.message || 'حدث خطأ غير متوقع أثناء المعالجة، يرجى إعادة التحقق.');
            }

        } catch (error) {
            alert('فشلت عملية التسجيل: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
});
