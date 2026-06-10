// register.js - إنشاء حساب مستثمر جديد (نسخة محسنة)
// يعتمد على core.js و auth.js المحملين قبل هذا الملف

(function() {
    'use strict';

    // ====================== عناصر DOM ======================
    let form, nextBtn, prevBtn, submitBtn, steps, stepSections;
    let currentStep = 1;
    let totalSteps = 0;

    // ====================== دوال مساعدة ======================
    function getElements() {
        form = document.getElementById('registrationForm');
        nextBtn = document.getElementById('nextBtn');
        prevBtn = document.getElementById('prevBtn');
        submitBtn = document.getElementById('submitBtn');
        steps = document.querySelectorAll('.step');
        stepSections = document.querySelectorAll('.form-step-section');
        totalSteps = stepSections.length;
    }

    function showStep(step) {
        if (!stepSections.length) return;
        stepSections.forEach((section, idx) => {
            section.classList.toggle('active', (idx + 1) === step);
        });
        steps.forEach((stepEl, idx) => {
            stepEl.classList.toggle('active', (idx + 1) === step);
        });
        if (prevBtn) prevBtn.classList.toggle('hidden', step === 1);
        if (nextBtn) nextBtn.classList.toggle('hidden', step === totalSteps);
        if (submitBtn) submitBtn.classList.toggle('hidden', step !== totalSteps);
        currentStep = step;
    }

    // عرض إشعار (باستخدام core.js أو fallback)
    function showMessage(msg, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(msg, type);
        } else {
            alert(msg);
        }
    }

    // ====================== التحقق من صحة الخطوات ======================
    function validateStep1() {
        let isValid = true;
        const username = document.getElementById('username')?.value || '';
        if (typeof window.validateUsername === 'function') {
            const uCheck = window.validateUsername(username);
            if (!uCheck.valid) {
                isValid = false;
                showMessage('اسم المستخدم غير صالح (4-20 حرف، أحرف إنجليزية وأرقام فقط)', 'error');
            }
            document.getElementById('u-length')?.classList.toggle('valid', uCheck.lengthOk);
            document.getElementById('u-chars')?.classList.toggle('valid', uCheck.charsOk);
            document.getElementById('u-spaces')?.classList.toggle('valid', uCheck.noSpaces);
            document.getElementById('u-specials')?.classList.toggle('valid', uCheck.noSpecials);
        }

        const email = document.getElementById('email')?.value || '';
        const confirmEmail = document.getElementById('confirmEmail')?.value || '';
        if (email !== confirmEmail) {
            isValid = false;
            const statusDiv = document.getElementById('email-match-status');
            if (statusDiv) statusDiv.textContent = '✗ البريدان غير متطابقين';
            showMessage('البريد الإلكتروني غير متطابق', 'error');
        }

        const password = document.getElementById('password')?.value || '';
        if (typeof window.checkPasswordStrength === 'function') {
            const strength = window.checkPasswordStrength(password);
            if (strength.strength < 3) {
                isValid = false;
                showMessage('كلمة المرور ضعيفة جداً', 'error');
            }
        }

        const confirmPass = document.getElementById('confirmPassword')?.value || '';
        if (password !== confirmPass) {
            isValid = false;
            const statusDiv = document.getElementById('password-match-status');
            if (statusDiv) statusDiv.textContent = '✗ كلمتا المرور غير متطابقتين';
            showMessage('كلمة المرور غير متطابقة', 'error');
        }
        return isValid;
    }

    function validateStep2() {
        let isValid = true;
        const ageCheck = document.getElementById('declarationAge');
        const beneficiaryCheck = document.getElementById('declarationBeneficiary');
        if (!ageCheck?.checked) {
            isValid = false;
            showMessage('يجب الإقرار بأن عمرك 18 عاماً فأكثر', 'error');
        }
        if (!beneficiaryCheck?.checked) {
            isValid = false;
            showMessage('يجب الإقرار بأنك المستفيد الحقيقي', 'error');
        }
        return isValid;
    }

    function validateStep4() {
        const agreementChecks = document.querySelectorAll('.agreement-check');
        let allChecked = true;
        agreementChecks.forEach(cb => { if (!cb.checked) allChecked = false; });
        const masterCheck = document.getElementById('masterAgreementCheck');
        if (masterCheck?.checked) {
            agreementChecks.forEach(cb => cb.checked = true);
            allChecked = true;
        }
        if (!allChecked) {
            showMessage('يجب الموافقة على جميع الإقرارات والاتفاقيات', 'error');
            return false;
        }
        return true;
    }

    function validateCurrentStep() {
        const activeSection = document.querySelector('.form-step-section.active');
        if (!activeSection) return false;

        // التحقق من الحقول المطلوبة
        const requiredFields = activeSection.querySelectorAll('[required]');
        let isValid = true;
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
                showMessage(`الرجاء تعبئة الحقل: ${field.labels?.[0]?.innerText || field.placeholder || 'حقل مطلوب'}`, 'error');
            } else {
                field.classList.remove('error');
            }
        });

        if (!isValid) return false;

        // تحقق خاص بكل خطوة
        if (activeSection.id === 'step1') return validateStep1();
        if (activeSection.id === 'step2') return validateStep2();
        if (activeSection.id === 'step4') return validateStep4();
        return true;
    }

    // ====================== جمع البيانات بطريقة آمنة ======================
    function getValue(selector, attribute = 'value') {
        const el = document.querySelector(selector);
        return el ? (attribute === 'value' ? el.value : el.getAttribute(attribute)) : '';
    }

    function collectAllFormData() {
        // البيانات الأساسية من FormData
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        const nationality = document.getElementById('nationalityType')?.value || '';

        // جمع بيانات الهوية حسب الجنسية
        if (nationality === 'saudi') {
            data.nationalId = getValue('#fields-saudi input[type="text"]');
            data.nationalIdIssueDate = getValue('#fields-saudi input[type="date"]:first-of-type');
            data.nationalIdExpiry = getValue('#fields-saudi input[type="date"]:last-of-type');
        } else if (nationality === 'resident') {
            data.iqamaNumber = getValue('#fields-resident input[type="text"]');
            data.iqamaIssue = getValue('#fields-resident input[type="date"]:first-of-type');
            data.iqamaExpiry = getValue('#fields-resident input[type="date"]:last-of-type');
        } else if (nationality === 'gcc') {
            data.gccCountry = getValue('#fields-gcc .gcc-country-select');
            data.gccNationalId = getValue('#fields-gcc input[type="text"]');
            data.gccIdIssue = getValue('#fields-gcc input[type="date"]:first-of-type');
            data.gccIdExpiry = getValue('#fields-gcc input[type="date"]:last-of-type');
        } else if (nationality === 'foreigner') {
            const docType = document.querySelector('input[name="foreignerDocType"]:checked')?.value;
            data.foreignerDocType = docType;
            if (docType === 'national_id') {
                data.foreignerCountry = getValue('#sub-fields-foreigner-id .arab-country-select');
                data.foreignerNationalId = getValue('#sub-fields-foreigner-id input[type="text"]');
                data.foreignerIdIssue = getValue('#sub-fields-foreigner-id input[type="date"]:first-of-type');
                data.foreignerIdExpiry = getValue('#sub-fields-foreigner-id input[type="date"]:last-of-type');
            } else if (docType === 'passport') {
                data.passportCountry = getValue('#sub-fields-passport .arab-country-select');
                data.passportNumber = getValue('#sub-fields-passport input[type="text"]');
                data.passportIssue = getValue('#sub-fields-passport input[type="date"]:first-of-type');
                data.passportExpiry = getValue('#sub-fields-passport input[type="date"]:last-of-type');
            }
        }

        // جمع بيانات العنوان (باستخدام معرفات فريدة أضفناها في HTML)
        const isSaudiOrResident = (nationality === 'saudi' || nationality === 'resident');
        if (isSaudiOrResident) {
            data.buildingNumber = getValue('#addr-building');
            data.streetSubNumber = getValue('#addr-sub-number');
            data.streetName = getValue('#addr-street');
            data.district = getValue('#addr-district');
            data.city = getValue('#addr-city');
            data.postalCode = getValue('#addr-postal');
            data.extraNumber = getValue('#addr-extra');
            data.unitNumber = getValue('#addr-unit');
            data.addressShortName = getValue('#addr-short-name');
        } else {
            data.internationalCountry = getValue('#intl-country');
            data.internationalCity = getValue('#intl-city');
            data.internationalState = getValue('#intl-state');
            data.internationalDistrict = getValue('#intl-district');
            data.internationalStreet = getValue('#intl-street');
            data.internationalZip = getValue('#intl-zip');
            data.addressExtra = getValue('#intl-extra');
        }

        return data;
    }

    // محاكاة إرسال البيانات (يمكن استبدالها بـ API حقيقي)
    async function submitRegistration(data) {
        console.log('بيانات التسجيل:', data);
        return new Promise((resolve) => {
            setTimeout(() => resolve({ success: true, message: 'تم إنشاء الحساب بنجاح' }), 1000);
        });
    }

    // ====================== تهيئة الحقول الديناميكية ======================
    function initDynamicFields() {
        const nationalitySelect = document.getElementById('nationalityType');
        const identitySection = document.getElementById('dynamic-identity-section');
        if (nationalitySelect && identitySection) {
            nationalitySelect.addEventListener('change', function() {
                identitySection.classList.remove('hidden');
                document.querySelectorAll('.nationality-fields').forEach(el => el.classList.add('hidden'));
                const val = this.value;
                if (val === 'saudi') document.getElementById('fields-saudi')?.classList.remove('hidden');
                else if (val === 'resident') document.getElementById('fields-resident')?.classList.remove('hidden');
                else if (val === 'gcc') document.getElementById('fields-gcc')?.classList.remove('hidden');
                else if (val === 'foreigner') document.getElementById('fields-foreigner')?.classList.remove('hidden');
            });
            nationalitySelect.dispatchEvent(new Event('change'));
        }

        // حقول الأجنبي الفرعية
        const foreignerRadios = document.querySelectorAll('input[name="foreignerDocType"]');
        if (foreignerRadios.length) {
            const toggle = () => {
                const selected = document.querySelector('input[name="foreignerDocType"]:checked')?.value;
                const idDiv = document.getElementById('sub-fields-foreigner-id');
                const passportDiv = document.getElementById('sub-fields-passport');
                if (selected === 'national_id') {
                    idDiv?.classList.remove('hidden');
                    passportDiv?.classList.add('hidden');
                } else if (selected === 'passport') {
                    idDiv?.classList.add('hidden');
                    passportDiv?.classList.remove('hidden');
                } else {
                    idDiv?.classList.add('hidden');
                    passportDiv?.classList.add('hidden');
                }
            };
            foreignerRadios.forEach(radio => radio.addEventListener('change', toggle));
            toggle();
        }

        // العنوان حسب الجنسية
        const addressSaudi = document.getElementById('address-saudi-resident');
        const addressInternational = document.getElementById('address-international');
        const updateAddress = () => {
            const nationality = document.getElementById('nationalityType')?.value;
            const isSaudiOrResident = (nationality === 'saudi' || nationality === 'resident');
            if (addressSaudi) addressSaudi.classList.toggle('hidden', !isSaudiOrResident);
            if (addressInternational) addressInternational.classList.toggle('hidden', isSaudiOrResident);
        };
        if (nationalitySelect) {
            nationalitySelect.addEventListener('change', updateAddress);
            updateAddress();
        }
    }

    // ====================== التحقق الفوري من الحقول ======================
    function initLiveValidation() {
        const email = document.getElementById('email');
        const confirmEmail = document.getElementById('confirmEmail');
        if (email && confirmEmail) {
            const checkMatch = () => {
                const status = document.getElementById('email-match-status');
                if (email.value && confirmEmail.value && email.value === confirmEmail.value) {
                    status.textContent = '✓ البريدان متطابقان';
                    status.style.color = 'green';
                } else if (confirmEmail.value) {
                    status.textContent = '✗ البريدان غير متطابقين';
                    status.style.color = 'red';
                } else {
                    status.textContent = '';
                }
            };
            email.addEventListener('input', checkMatch);
            confirmEmail.addEventListener('input', checkMatch);
        }

        const password = document.getElementById('password');
        const confirmPass = document.getElementById('confirmPassword');
        if (password && confirmPass) {
            const checkPassMatch = () => {
                const status = document.getElementById('password-match-status');
                if (password.value && confirmPass.value && password.value === confirmPass.value) {
                    status.textContent = '✓ كلمتا المرور متطابقتان';
                    status.style.color = 'green';
                } else if (confirmPass.value) {
                    status.textContent = '✗ كلمتا المرور غير متطابقتين';
                    status.style.color = 'red';
                } else {
                    status.textContent = '';
                }
            };
            password.addEventListener('input', function() {
                if (typeof window.checkPasswordStrength === 'function') {
                    const strength = window.checkPasswordStrength(this.value);
                    const fillBar = document.getElementById('strength-bar-fill');
                    const strengthText = document.getElementById('strength-text');
                    if (fillBar) {
                        const percent = (strength.strength / 5) * 100;
                        fillBar.style.width = percent + '%';
                        fillBar.style.backgroundColor = 
                            strength.level === 'قوية' ? '#4caf50' : (strength.level === 'متوسطة' ? '#ff9800' : '#f44336');
                    }
                    if (strengthText) strengthText.textContent = strength.level;
                }
                checkPassMatch();
            });
            confirmPass.addEventListener('input', checkPassMatch);
        }

        const masterCheck = document.getElementById('masterAgreementCheck');
        if (masterCheck) {
            masterCheck.addEventListener('change', e => {
                document.querySelectorAll('.agreement-check').forEach(cb => cb.checked = e.target.checked);
            });
        }
    }

    // ====================== مودال OTP ======================
    function initOtpModal() {
        const otpModal = document.getElementById('otpModal');
        const verifyBtn = document.getElementById('verifyOtpBtn');
        const otpInput = document.getElementById('otpInput');
        const completeLaterSection = document.getElementById('completeLaterSection');
        const completeLaterBtn = document.getElementById('completeLaterBtn');

        if (verifyBtn && otpModal) {
            verifyBtn.addEventListener('click', () => {
                const otp = otpInput.value.trim();
                if (otp === '1234') { // رمز تجريبي
                    if (completeLaterSection) completeLaterSection.classList.remove('hidden');
                    verifyBtn.disabled = true;
                    showMessage('تم تفعيل الحساب بنجاح!', 'success');
                    // توجيه المستخدم بعد 1.5 ثانية
                    setTimeout(() => {
                        window.location.href = '/pages/dashboard/index.html';
                    }, 1500);
                } else {
                    showMessage('رمز التحقق غير صحيح، حاول مرة أخرى', 'error');
                }
            });
        }

        if (completeLaterBtn) {
            completeLaterBtn.addEventListener('click', () => {
                window.location.href = '/pages/dashboard/index.html';
            });
        }

        if (otpModal) {
            otpModal.addEventListener('click', e => {
                if (e.target === otpModal) otpModal.classList.add('hidden');
            });
        }
    }

    // ====================== ربط الأحداث الرئيسية ======================
    function bindEvents() {
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (validateCurrentStep() && currentStep < totalSteps) {
                    showStep(currentStep + 1);
                }
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentStep > 1) showStep(currentStep - 1);
            });
        }
        if (form && submitBtn) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!validateCurrentStep()) return;
                submitBtn.disabled = true;
                submitBtn.textContent = 'جاري إنشاء الحساب...';
                const formData = collectAllFormData();
                const result = await submitRegistration(formData);
                if (result.success) {
                    showMessage(result.message, 'success');
                    const otpModal = document.getElementById('otpModal');
                    if (otpModal) otpModal.classList.remove('hidden');
                } else {
                    showMessage(result.message || 'حدث خطأ، حاول مرة أخرى', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'إنشاء الحساب';
                }
            });
        }
    }

    // ====================== بدء التشغيل ======================
    document.addEventListener('DOMContentLoaded', () => {
        getElements();
        if (!form) {
            console.error('Form not found!');
            return;
        }
        initDynamicFields();
        initLiveValidation();
        bindEvents();
        initOtpModal();
        showStep(1);
    });
})();
