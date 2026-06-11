/**
 * ==========================================================================
 * TERA - Register Page Logic
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

    // دالة التحقق من الحقول الفارغة في الخطوة الحالية
    function validateCurrentStep() {
        const currentSection = document.getElementById(`step${currentStep}`);
        const requiredInputs = currentSection.querySelectorAll('input[required], select[required]');
        let isValid = true;

        requiredInputs.forEach(input => {
            if ((input.type !== 'checkbox' && input.value.trim() === '') || 
                (input.type === 'checkbox' && !input.checked)) {
                isValid = false;
                input.style.borderColor = '#dc3545'; // تلوين الحقل بالأحمر
                input.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
            } else {
                input.style.borderColor = '#d1d5db'; // إعادة اللون الطبيعي
                input.style.boxShadow = 'none';
            }
        });

        if (!isValid) {
            alert('يرجى تعبئة جميع الحقول المطلوبة (المظللة باللون الأحمر).');
            return false;
        }

        // تحققات إضافية خاصة بالمرحلة الأولى
        if (currentStep === 1) {
            const invalidRules = currentSection.querySelectorAll('.invalid');
            if (invalidRules.length > 0) {
                alert('يرجى التأكد من استيفاء جميع شروط اسم المستخدم وكلمة المرور.');
                return false;
            }

            const email = document.getElementById('email').value;
            const confirmEmail = document.getElementById('confirm-email').value;
            if (email !== confirmEmail) {
                alert('البريد الإلكتروني غير متطابق.');
                return false;
            }

            const pass = document.getElementById('password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            if (pass !== confirmPass) {
                alert('كلمة المرور غير متطابقة.');
                return false;
            }
        }

        return true;
    }

    btnNext.addEventListener('click', () => {
        // فحص الحقول قبل الانتقال
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

    // ==========================================
    // منع اللغة العربية
    // ==========================================
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
        if (field) { field.addEventListener('input', preventArabicInput); }
    });

    // ==========================================
    // زر الإظهار والإخفاء لكلمة المرور
    // ==========================================
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling; // حقل input
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = 'إخفاء';
            } else {
                input.type = 'password';
                this.textContent = 'إظهار';
            }
        });
    });

    // ==========================================
    // التحقق الحي من المدخلات (Live Validation)
    // ==========================================
    const usernameInput = document.getElementById('username');
    const userRules = document.querySelectorAll('#user-validation li');
    
    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            const val = e.target.value;
            toggleValid(userRules[0], val.length >= 4 && val.length <= 20);
            toggleValid(userRules[1], /^[a-zA-Z0-9]+$/.test(val) && val.length > 0);
            toggleValid(userRules[2], !/\s/.test(val) && val.length > 0);
            toggleValid(userRules[3], !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(val) && val.length > 0);
            toggleValid(userRules[4], val.length > 3);
        });
    }

    const emailInput = document.getElementById('email');
    const confirmEmailInput = document.getElementById('confirm-email');
    const emailStatus = document.getElementById('email-status');

    function checkEmailMatch() {
        if (confirmEmailInput.value.length === 0) { emailStatus.textContent = ''; return; }
        if (emailInput.value === confirmEmailInput.value) {
            emailStatus.innerHTML = '<span class="text-success" style="color:#10b981;">🟢 البريد الإلكتروني متطابق</span>';
        } else {
            emailStatus.innerHTML = '<span class="text-danger" style="color:#ef4444;">🔴 البريد الإلكتروني غير متطابق</span>';
        }
    }
    
    if (emailInput && confirmEmailInput) {
        emailInput.addEventListener('input', checkEmailMatch);
        confirmEmailInput.addEventListener('input', checkEmailMatch);
    }

    const passInput = document.getElementById('password');
    const confirmPassInput = document.getElementById('confirm-password');
    const passRules = document.querySelectorAll('#pass-validation li');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    const passStatus = document.getElementById('password-status');

    if (passInput) {
        passInput.addEventListener('input', (e) => {
            const val = e.target.value;
            let score = 0;

            const r1 = val.length >= 8; toggleValid(passRules[0], r1); if(r1) score++;
            const r2 = /[A-Z]/.test(val); toggleValid(passRules[1], r2); if(r2) score++;
            const r3 = /[a-z]/.test(val); toggleValid(passRules[2], r3); if(r3) score++;
            const r4 = /[0-9]/.test(val); toggleValid(passRules[3], r4); if(r4) score++;
            const r5 = /[!@#$%^&*(),.?":{}|<>]/.test(val); toggleValid(passRules[4], r5); if(r5) score++;

            strengthBar.className = 'strength-bar';
            if (val.length === 0) {
                strengthText.textContent = 'مؤشر القوة: ضعيفة';
            } else if (score <= 2) {
                strengthBar.classList.add('weak');
                strengthText.textContent = 'مؤشر القوة: ضعيفة';
            } else if (score <= 4) {
                strengthBar.classList.add('medium');
                strengthText.textContent = 'مؤشر القوة: متوسطة';
            } else {
                strengthBar.classList.add('strong');
                strengthText.textContent = 'مؤشر القوة: قوية';
            }
            checkPassMatch();
        });
    }

    function checkPassMatch() {
        if (confirmPassInput.value.length === 0) { passStatus.textContent = ''; return; }
        if (passInput.value === confirmPassInput.value) {
            passStatus.innerHTML = '<span class="text-success" style="color:#10b981;">🟢 كلمة المرور متطابقة</span>';
        } else {
            passStatus.innerHTML = '<span class="text-danger" style="color:#ef4444;">🔴 كلمة المرور غير متطابقة</span>';
        }
    }

    if (confirmPassInput) { confirmPassInput.addEventListener('input', checkPassMatch); }

    function toggleValid(element, isValid) {
        if (isValid) {
            element.classList.remove('invalid');
            element.classList.add('valid');
        } else {
            element.classList.remove('valid');
            element.classList.add('invalid');
        }
    }

    // ==========================================
    // توليد حقول الهوية والعنوان
    // ==========================================
    const nationalitySelect = document.getElementById('nationalityType');
    const idContainer = document.getElementById('id-details-container');
    const addressContainer = document.getElementById('address-container');

    if (nationalitySelect) {
        nationalitySelect.addEventListener('change', (e) => {
            const type = e.target.value;
            renderIdFields(type);
            renderAddressFields(type);
        });
    }

    function renderIdFields(type) {
        let html = '';
        if (type === 'saudi') {
            html = `
                <div class="form-group">
                    <label>رقم الهوية الوطنية *</label><input type="text" required>
                </div>
                <div class="form-group flex-group">
                    <div class="half-width"><label>تاريخ الإصدار *</label><input type="date" required></div>
                    <div class="half-width"><label>تاريخ الانتهاء *</label><input type="date" required></div>
                </div>`;
        } else if (type === 'resident') {
            html = `
                <div class="form-group">
                    <label>رقم الإقامة *</label><input type="text" required>
                </div>
                <div class="form-group flex-group">
                    <div class="half-width"><label>تاريخ الإصدار *</label><input type="date" required></div>
                    <div class="half-width"><label>تاريخ الانتهاء *</label><input type="date" required></div>
                </div>`;
        } else if (type === 'gcc') {
            html = `
                <div class="form-group">
                    <label>الدولة *</label><input type="text" required>
                    <label>رقم الهوية الخليجية *</label><input type="text" required>
                </div>
                <div class="form-group flex-group">
                    <div class="half-width"><label>تاريخ الإصدار *</label><input type="date" required></div>
                    <div class="half-width"><label>تاريخ الانتهاء *</label><input type="date" required></div>
                </div>`;
        } else if (type === 'foreigner') {
            html = `
                <div class="form-group">
                    <label>نوع الوثيقة *</label>
                    <div class="radio-group">
                        <label><input type="radio" name="doc_type" value="national"> الهوية الوطنية لبلده</label>
                        <label><input type="radio" name="doc_type" value="passport" checked> جواز السفر</label>
                    </div>
                </div>
                <div id="foreignDocDetails">
                    <div class="form-group">
                        <label>دولة الإصدار *</label><input type="text" required>
                        <label>رقم جواز السفر *</label><input type="text" required>
                    </div>
                    <div class="form-group flex-group">
                        <div class="half-width"><label>تاريخ الإصدار *</label><input type="date" required></div>
                        <div class="half-width"><label>تاريخ الانتهاء *</label><input type="date" required></div>
                    </div>
                </div>`;
        }
        idContainer.innerHTML = html;

        if (type === 'foreigner') {
            const radios = idContainer.querySelectorAll('input[name="doc_type"]');
            radios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const docDetails = document.getElementById('foreignDocDetails');
                    if (e.target.value === 'national') {
                        docDetails.innerHTML = `
                            <div class="form-group">
                                <label>الدولة *</label><input type="text" required>
                                <label>رقم الهوية *</label><input type="text" required>
                            </div>
                            <div class="form-group flex-group">
                                <div class="half-width"><label>تاريخ الإصدار *</label><input type="date" required></div>
                                <div class="half-width"><label>تاريخ الانتهاء *</label><input type="date" required></div>
                            </div>`;
                    } else {
                        docDetails.innerHTML = `
                            <div class="form-group">
                                <label>دولة الإصدار *</label><input type="text" required>
                                <label>رقم جواز السفر *</label><input type="text" required>
                            </div>
                            <div class="form-group flex-group">
                                <div class="half-width"><label>تاريخ الإصدار *</label><input type="date" required></div>
                                <div class="half-width"><label>تاريخ الانتهاء *</label><input type="date" required></div>
                            </div>`;
                    }
                });
            });
        }
    }

    function renderAddressFields(type) {
        let html = '';
        if (type === 'saudi' || type === 'resident') {
            html = `
                <h4 style="margin-top: 20px; margin-bottom: 15px; color: #0A1940;">بيانات العنوان الوطني</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><label>رقم المبنى *</label><input type="text" required></div>
                    <div><label>الرقم الفرعي *</label><input type="text" required></div>
                    <div><label>اسم الشارع *</label><input type="text" required></div>
                    <div><label>الحي *</label><input type="text" required></div>
                    <div><label>المدينة *</label><input type="text" required></div>
                    <div><label>الرمز البريدي *</label><input type="text" required></div>
                    <div><label>الرقم الإضافي *</label><input type="text" required></div>
                    <div><label>رقم الوحدة (اختياري)</label><input type="text"></div>
                </div>
                <div class="form-group" style="margin-top:15px;">
                    <label>الاسم المختصر للعنوان الوطني *</label><input type="text" required>
                </div>`;
        } else if (type === 'gcc' || type === 'foreigner') {
            html = `
                <h4 style="margin-top: 20px; margin-bottom: 15px; color: #0A1940;">العنوان الدولي (خارج المملكة)</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><label>الدولة *</label><input type="text" required></div>
                    <div><label>المدينة *</label><input type="text" required></div>
                    <div><label>المحافظة / الولاية *</label><input type="text" required></div>
                    <div><label>الحي *</label><input type="text" required></div>
                    <div><label>الشارع *</label><input type="text" required></div>
                    <div><label>الرمز البريدي *</label><input type="text" required></div>
                </div>
                <div class="form-group" style="margin-top:15px;">
                    <label>وصف إضافي للعنوان</label><input type="text">
                </div>`;
        }
        addressContainer.innerHTML = html;
    }

    // ==========================================
    // الإرسال النهائي
    // ==========================================
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if(validateCurrentStep()) {
                alert('تم إنشاء الحساب بنجاح. سيتم تحويلك لصفحة التحقق.');
                setTimeout(() => {
                    window.location.href = '../verify-otp.html';
                }, 1000);
            }
        });
    }
});
