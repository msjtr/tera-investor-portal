document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================
    // 0. القوائم والبيانات الديناميكية
    // ==========================================
    const gccCountries = [
        { code: 'sa', name: 'السعودية', dial: '+966' },
        { code: 'ae', name: 'الإمارات', dial: '+971' },
        { code: 'kw', name: 'الكويت', dial: '+965' },
        { code: 'bh', name: 'البحرين', dial: '+973' },
        { code: 'om', name: 'عمان', dial: '+968' },
        { code: 'qa', name: 'قطر', dial: '+974' }
    ];

    const arabCountries = [
        { code: 'eg', name: 'مصر', dial: '+20' },
        { code: 'jo', name: 'الأردن', dial: '+962' },
        { code: 'iq', name: 'العراق', dial: '+964' },
        { code: 'lb', name: 'لبنان', dial: '+961' },
        { code: 'ma', name: 'المغرب', dial: '+212' },
        { code: 'dz', name: 'الجزائر', dial: '+213' },
        { code: 'tn', name: 'تونس', dial: '+216' },
        { code: 'sd', name: 'السودان', dial: '+249' },
        { code: 'ye', name: 'اليمن', dial: '+967' },
        { code: 'sy', name: 'سوريا', dial: '+963' }
    ];

    // ==========================================
    // 1. فلاتر الإدخال (منع الكتابة باللغة الخاطئة)
    // ==========================================
    function restrictInput(elementId, regex) {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('input', function() {
                this.value = this.value.replace(regex, '');
            });
        }
    }

    restrictInput('username', /[^A-Za-z0-9]/g);
    restrictInput('email', /[^A-Za-z0-9@.\-_]/g);
    restrictInput('confirmEmail', /[^A-Za-z0-9@.\-_]/g);
    restrictInput('password', /[\u0600-\u06FF\u0750-\u077F]/g);
    restrictInput('confirmPassword', /[\u0600-\u06FF\u0750-\u077F]/g);
    restrictInput('fullNameEn', /[^A-Za-z\s]/g);
    restrictInput('fullNameAr', /[^\u0600-\u06FF\s]/g);

    // رقم الجوال: أرقام فقط بدون صفر في البداية
    const mobileInput = document.getElementById('mobileNumber');
    if (mobileInput) {
        mobileInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            this.value = this.value.replace(/^0+/, ''); 
        });
    }

    // ==========================================
    // 2. تحديث واجهة الشروط (UI Validations)
    // ==========================================
    function toggleConditionList(listSelector, conditionsArray) {
        const listItems = document.querySelectorAll(listSelector);
        conditionsArray.forEach((isValid, index) => {
            if(listItems[index]) {
                if(isValid) {
                    listItems[index].classList.add('valid');
                    listItems[index].classList.remove('invalid');
                    listItems[index].innerHTML = listItems[index].innerHTML.replace('☐', '☑');
                } else {
                    listItems[index].classList.add('invalid');
                    listItems[index].classList.remove('valid');
                    listItems[index].innerHTML = listItems[index].innerHTML.replace('☑', '☐');
                }
            }
        });
    }

    // إظهار وإخفاء كلمة المرور
    document.getElementById('showPassword').addEventListener('change', function() {
        document.getElementById('password').type = this.checked ? 'text' : 'password';
    });
    document.getElementById('showConfirmPassword').addEventListener('change', function() {
        document.getElementById('confirmPassword').type = this.checked ? 'text' : 'password';
    });

    // شروط اسم المستخدم
    const usernameInput = document.getElementById('username');
    if(usernameInput) {
        usernameInput.addEventListener('input', function() {
            const val = this.value;
            toggleConditionList('#step1 .validation-box:nth-of-type(1) li', [
                val.length >= 4 && val.length <= 20,
                /^[a-zA-Z]/.test(val),
                true, // الأرقام مسموحة دائماً
                !/\s/.test(val),
                /^[A-Za-z0-9]+$/.test(val),
                val.length >= 4 // افتراضي للغير مستخدم
            ]);
        });
    }

    // شروط البريد الإلكتروني
    const emailInput = document.getElementById('email');
    const confirmEmailInput = document.getElementById('confirmEmail');
    function validateEmails() {
        const email = emailInput.value;
        const confirm = confirmEmailInput.value;
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        toggleConditionList('#step1 .validation-box:nth-of-type(2) li', [
            regex.test(email),
            regex.test(email),
            email !== '' && email === confirm,
            true
        ]);
    }
    if(emailInput) emailInput.addEventListener('input', validateEmails);
    if(confirmEmailInput) confirmEmailInput.addEventListener('input', validateEmails);

    // شروط كلمة المرور
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

            toggleConditionList('#step1 .validation-box:nth-of-type(3) li', [
                isLength, hasUpper, hasLower, hasNum, hasSpec
            ]);

            let strength = (isLength?1:0) + (hasUpper&&hasLower?1:0) + (hasNum?1:0) + (hasSpec?1:0);
            if (strength <= 1) { strengthText.innerHTML = '🔴 ضعيفة'; strengthText.style.color = 'red'; }
            else if (strength <= 3) { strengthText.innerHTML = '🟡 متوسطة'; strengthText.style.color = 'orange'; }
            else { strengthText.innerHTML = '🟢 قوية'; strengthText.style.color = 'green'; }
        });
    }

    // شروط الأسماء
    document.getElementById('fullNameAr').addEventListener('input', function() {
        const val = this.value;
        toggleConditionList('#step2 .validation-box:nth-of-type(1) li', [
            /^[\u0600-\u06FF\s]+$/.test(val) && val.length > 0,
            !/\d/.test(val),
            !/[!@#$%^&*(),.?":{}|<>]/.test(val)
        ]);
    });

    document.getElementById('fullNameEn').addEventListener('input', function() {
        const val = this.value;
        toggleConditionList('#step2 .validation-box:nth-of-type(2) li', [
            /^[A-Za-z\s]+$/.test(val) && val.length > 0,
            !/\d/.test(val),
            !/[!@#$%^&*(),.?":{}|<>]/.test(val)
        ]);
    });

    // ==========================================
    // 3. منطق المرحلة الثانية (الفئات والعناوين)
    // ==========================================
    const accountCategory = document.getElementById('accountCategory');
    const identityWrappers = document.querySelectorAll('.identity-wrapper');
    const residentNationality = document.getElementById('residentNationality');
    const foreignNationality = document.getElementById('foreignNationality');
    const countryCodeSelect = document.getElementById('countryCode');

    function populateSelect(el, items) {
        if(!el) return;
        el.innerHTML = '<option value="">اختر...</option>';
        items.forEach(item => el.innerHTML += `<option value="${item.code}">${item.name}</option>`);
    }

    function populateDialCodes(items) {
        if(!countryCodeSelect) return;
        countryCodeSelect.innerHTML = '';
        items.forEach(item => countryCodeSelect.innerHTML += `<option value="${item.dial}">${item.name} ${item.dial}</option>`);
        countryCodeSelect.dispatchEvent(new Event('change')); // لتحديث العنوان تلقائياً
    }

    if(accountCategory) {
        accountCategory.addEventListener('change', function() {
            identityWrappers.forEach(w => w.classList.add('d-none'));
            
            if(this.value === 'saudi') {
                document.getElementById('saudiFields').classList.remove('d-none');
                populateDialCodes([{ name: '🇸🇦 السعودية', dial: '+966' }]);
            } 
            else if(this.value === 'resident') {
                document.getElementById('residentFields').classList.remove('d-none');
                populateSelect(residentNationality, [...gccCountries, ...arabCountries]);
                populateDialCodes([{ name: '🇸🇦 السعودية', dial: '+966' }]);
            } 
            else if(this.value === 'gcc') {
                document.getElementById('gccFields').classList.remove('d-none');
                populateDialCodes(gccCountries);
            } 
            else if(this.value === 'foreign') {
                document.getElementById('foreignFields').classList.remove('d-none');
                populateSelect(foreignNationality, arabCountries);
                populateDialCodes(arabCountries);
            }
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

    if(countryCodeSelect) {
        countryCodeSelect.addEventListener('change', function() {
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
    }

    // ==========================================
    // 4. الإقرار النهائي
    // ==========================================
    const finalAgreement = document.getElementById('finalAgreement');
    if(finalAgreement) {
        finalAgreement.addEventListener('change', function() {
            const isChecked = this.checked;
            document.querySelectorAll('#step4 input[type="checkbox"]').forEach(cb => cb.checked = isChecked);
        });
    }

    // ==========================================
    // 5. التنقل والتحقق قبل الانتقال
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
            if(index === currentStep) stepIndicators[index].classList.add('active');
            else if (index < currentStep) {
                stepIndicators[index].classList.add('completed');
                stepIndicators[index].classList.remove('active');
            } else stepIndicators[index].classList.remove('active', 'completed');
        });

        prevBtn.classList.toggle('d-none', currentStep === 0);
        if (currentStep === steps.length - 1) {
            nextBtn.classList.add('d-none'); submitBtn.classList.remove('d-none');
        } else {
            nextBtn.classList.remove('d-none'); submitBtn.classList.add('d-none');
        }
    }

    function validateCurrentStep() {
        let isValid = true;
        let errorMessage = '';

        if (currentStep === 0) {
            const user = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const confirmEmail = document.getElementById('confirmEmail').value;
            const pass = document.getElementById('password').value;
            const confirmPass = document.getElementById('confirmPassword').value;
            
            if (user.length < 4 || !/^[A-Za-z0-9]+$/.test(user)) { isValid = false; errorMessage += '- بيانات اسم المستخدم غير مكتملة.\n'; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email !== confirmEmail) { isValid = false; errorMessage += '- البريد الإلكتروني غير متطابق.\n'; }
            if (pass.length < 8 || pass !== confirmPass) { isValid = false; errorMessage += '- كلمة المرور غير مطابقة.\n'; }
        } 
        else if (currentStep === 1) {
            const nameAr = document.getElementById('fullNameAr').value.trim();
            const nameEn = document.getElementById('fullNameEn').value.trim();
            const category = accountCategory ? accountCategory.value : '';
            
            if (!nameAr || !nameEn || !category) { isValid = false; errorMessage += '- يرجى تعبئة الأسماء واختيار الفئة.\n'; }
            if (category === 'resident') {
                const employer = document.getElementById('residentEmployer').value.trim();
                if (!employer) { isValid = false; errorMessage += '- جهة العمل حقل إلزامي للمقيم.\n'; }
            }
        }
        else if (currentStep === 2) {
            const mobile = document.getElementById('mobileNumber').value.trim();
            const contactMethod = document.querySelector('input[name="preferredContact"]:checked');
            
            if (!mobile || mobile.length < 8) { isValid = false; errorMessage += '- يرجى إدخال رقم جوال صحيح.\n'; }
            if (!contactMethod) { isValid = false; errorMessage += '- يرجى اختيار وسيلة التواصل.\n'; }
        }
        else if (currentStep === 3) {
            if(!finalAgreement || !finalAgreement.checked) { isValid = false; errorMessage += '- يرجى الموافقة على الإقرار النهائي.\n'; }
        }

        if (!isValid) alert('⚠️ خطأ في الإدخال:\n' + errorMessage);
        return isValid;
    }

    if(nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (!validateCurrentStep()) return;
            if (currentStep < steps.length - 1) {
                currentStep++;
                updateFormSteps();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    if(prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateFormSteps();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // --- هذا هو الجزء الذي كان مفقوداً في الكود الذي أرسلته ---
    if(submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(validateCurrentStep()) {
                alert('✅ تم اكتمال البيانات الجاهزة للتسجيل!');
            }
        });
    }

    updateFormSteps();
});
