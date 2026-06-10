// register.js - الصفحة الخاصة بإنشاء حساب مستثمر جديد
// يعتمد على core.js و auth.js المحملين قبل هذا الملف

(function() {
    'use strict';

    // انتظار تحميل DOM بالكامل
    document.addEventListener('DOMContentLoaded', function() {
        // ------------------- عناصر DOM الرئيسية -------------------
        const form = document.getElementById('registrationForm');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.getElementById('submitBtn');
        const steps = document.querySelectorAll('.step');
        const stepSections = document.querySelectorAll('.form-step-section');
        
        let currentStep = 1;
        const totalSteps = stepSections.length;

        // ------------------- دوال مساعدة خاصة بالصفحة -------------------
        function showStep(step) {
            // إخفاء جميع الأقسام وإظهار القسم المطلوب
            stepSections.forEach((section, idx) => {
                section.classList.toggle('active', (idx + 1) === step);
            });
            // تحديث مؤشر الخطوات
            steps.forEach((stepEl, idx) => {
                stepEl.classList.toggle('active', (idx + 1) === step);
            });
            // إدارة أزرار التنقل
            if (prevBtn) prevBtn.classList.toggle('hidden', step === 1);
            if (nextBtn) nextBtn.classList.toggle('hidden', step === totalSteps);
            if (submitBtn) submitBtn.classList.toggle('hidden', step !== totalSteps);
            currentStep = step;
        }

        // التحقق من صحة الخطوة الحالية (تعتمد على الدوال العامة من core.js إن وجدت)
        function validateCurrentStep() {
            const activeSection = document.querySelector('.form-step-section.active');
            if (!activeSection) return false;

            // 1. التحقق من الحقول المطلوبة (required)
            const requiredFields = activeSection.querySelectorAll('[required]');
            let isValid = true;
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                    // استخدام showNotification من core.js إذا كانت موجودة
                    if (typeof window.showNotification === 'function') {
                        window.showNotification(`الرجاء تعبئة الحقل: ${field.labels?.[0]?.innerText || field.placeholder || 'حقل مطلوب'}`, 'error');
                    } else {
                        alert('يرجى تعبئة جميع الحقول المطلوبة');
                    }
                } else {
                    field.classList.remove('error');
                }
            });

            // 2. تحقق خاص بالمرحلة الأولى (إنشاء الحساب)
            if (activeSection.id === 'step1') {
                // اسم المستخدم
                const username = document.getElementById('username').value;
                if (typeof window.validateUsername === 'function') {
                    const uCheck = window.validateUsername(username);
                    if (!uCheck.valid) {
                        isValid = false;
                        if (typeof window.showNotification === 'function')
                            window.showNotification('اسم المستخدم غير صالح (4-20 حرف، أحرف إنجليزية وأرقام فقط)', 'error');
                    }
                    // تحديث واجهة التحقق
                    document.getElementById('u-length')?.classList.toggle('valid', uCheck.lengthOk);
                    document.getElementById('u-chars')?.classList.toggle('valid', uCheck.charsOk);
                    document.getElementById('u-spaces')?.classList.toggle('valid', uCheck.noSpaces);
                    document.getElementById('u-specials')?.classList.toggle('valid', uCheck.noSpecials);
                }

                // تطابق البريد الإلكتروني
                const email = document.getElementById('email').value;
                const confirmEmail = document.getElementById('confirmEmail').value;
                if (email !== confirmEmail) {
                    isValid = false;
                    const statusDiv = document.getElementById('email-match-status');
                    if (statusDiv) statusDiv.textContent = '✗ البريدان غير متطابقين';
                    if (typeof window.showNotification === 'function')
                        window.showNotification('البريد الإلكتروني غير متطابق', 'error');
                }

                // قوة كلمة المرور
                const password = document.getElementById('password').value;
                if (typeof window.checkPasswordStrength === 'function') {
                    const strength = window.checkPasswordStrength(password);
                    if (strength.strength < 3) {
                        isValid = false;
                        if (typeof window.showNotification === 'function')
                            window.showNotification('كلمة المرور ضعيفة جداً، يرجى استخدام 8 أحرف على الأقل + حروف كبيرة وصغيرة + أرقام + رموز', 'error');
                    }
                }

                // تطابق كلمتي المرور
                const confirmPass = document.getElementById('confirmPassword').value;
                if (password !== confirmPass) {
                    isValid = false;
                    const statusDiv = document.getElementById('password-match-status');
                    if (statusDiv) statusDiv.textContent = '✗ كلمتا المرور غير متطابقتين';
                    if (typeof window.showNotification === 'function')
                        window.showNotification('كلمة المرور غير متطابقة', 'error');
                }
            }

            // 3. تحقق خاص بالمرحلة الثانية (الإقرارات العمر والمستفيد)
            if (activeSection.id === 'step2') {
                const ageCheck = document.getElementById('declarationAge');
                const beneficiaryCheck = document.getElementById('declarationBeneficiary');
                if (!ageCheck.checked) {
                    isValid = false;
                    if (typeof window.showNotification === 'function')
                        window.showNotification('يجب الإقرار بأن عمرك 18 عاماً فأكثر', 'error');
                }
                if (!beneficiaryCheck.checked) {
                    isValid = false;
                    if (typeof window.showNotification === 'function')
                        window.showNotification('يجب الإقرار بأنك المستفيد الحقيقي', 'error');
                }
            }

            // 4. تحقق خاص بالمرحلة الرابعة (الإقرارات والاتفاقيات)
            if (activeSection.id === 'step4') {
                const agreementChecks = document.querySelectorAll('.agreement-check');
                let allChecked = true;
                agreementChecks.forEach(cb => {
                    if (!cb.checked) allChecked = false;
                });
                const masterCheck = document.getElementById('masterAgreementCheck');
                if (masterCheck && masterCheck.checked) {
                    // تفعيل جميع الإقرارات تلقائياً
                    agreementChecks.forEach(cb => cb.checked = true);
                    allChecked = true;
                }
                if (!allChecked) {
                    isValid = false;
                    if (typeof window.showNotification === 'function')
                        window.showNotification('يجب الموافقة على جميع الإقرارات والاتفاقيات', 'error');
                }
            }

            return isValid;
        }

        // دالة تجميع بيانات النموذج (استكمال لوظيفة core.js)
        function collectAllFormData() {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            // إضافة الحقول الديناميكية (الهوية، العنوان)
            // الهوية حسب الجنسية
            const nationality = document.getElementById('nationalityType')?.value;
            if (nationality === 'saudi') {
                const idNum = document.querySelector('#fields-saudi input[type="text"]')?.value;
                const issueDate = document.querySelector('#fields-saudi input[type="date"]:first-of-type')?.value;
                const expiryDate = document.querySelector('#fields-saudi input[type="date"]:last-of-type')?.value;
                if (idNum) data.nationalId = idNum;
                if (issueDate) data.nationalIdIssueDate = issueDate;
                if (expiryDate) data.nationalIdExpiry = expiryDate;
            } else if (nationality === 'resident') {
                const iqamaNum = document.querySelector('#fields-resident input[type="text"]')?.value;
                const issueDate = document.querySelector('#fields-resident input[type="date"]:first-of-type')?.value;
                const expiryDate = document.querySelector('#fields-resident input[type="date"]:last-of-type')?.value;
                if (iqamaNum) data.iqamaNumber = iqamaNum;
                if (issueDate) data.iqamaIssue = issueDate;
                if (expiryDate) data.iqamaExpiry = expiryDate;
            } else if (nationality === 'gcc') {
                const gccCountry = document.querySelector('#fields-gcc .gcc-country-select')?.value;
                const gccId = document.querySelector('#fields-gcc input[type="text"]')?.value;
                const issueDate = document.querySelector('#fields-gcc input[type="date"]:first-of-type')?.value;
                const expiryDate = document.querySelector('#fields-gcc input[type="date"]:last-of-type')?.value;
                if (gccCountry) data.gccCountry = gccCountry;
                if (gccId) data.gccNationalId = gccId;
                if (issueDate) data.gccIdIssue = issueDate;
                if (expiryDate) data.gccIdExpiry = expiryDate;
            } else if (nationality === 'foreigner') {
                const docType = document.querySelector('input[name="foreignerDocType"]:checked')?.value;
                data.foreignerDocType = docType;
                if (docType === 'national_id') {
                    const country = document.querySelector('#sub-fields-foreigner-id .arab-country-select')?.value;
                    const idNum = document.querySelector('#sub-fields-foreigner-id input[type="text"]')?.value;
                    const issue = document.querySelector('#sub-fields-foreigner-id input[type="date"]:first-of-type')?.value;
                    const expiry = document.querySelector('#sub-fields-foreigner-id input[type="date"]:last-of-type')?.value;
                    if (country) data.foreignerCountry = country;
                    if (idNum) data.foreignerNationalId = idNum;
                    if (issue) data.foreignerIdIssue = issue;
                    if (expiry) data.foreignerIdExpiry = expiry;
                } else if (docType === 'passport') {
                    const country = document.querySelector('#sub-fields-passport .arab-country-select')?.value;
                    const passportNum = document.querySelector('#sub-fields-passport input[type="text"]')?.value;
                    const issue = document.querySelector('#sub-fields-passport input[type="date"]:first-of-type')?.value;
                    const expiry = document.querySelector('#sub-fields-passport input[type="date"]:last-of-type')?.value;
                    if (country) data.passportCountry = country;
                    if (passportNum) data.passportNumber = passportNum;
                    if (issue) data.passportIssue = issue;
                    if (expiry) data.passportExpiry = expiry;
                }
            }
            // جمع بيانات العنوان
            const isSaudiOrResident = (nationality === 'saudi' || nationality === 'resident');
            if (isSaudiOrResident) {
                const buildingNo = document.querySelector('#address-saudi-resident .addr-input:first-of-type')?.value;
                const subNumber = document.querySelectorAll('#address-saudi-resident .addr-input')[1]?.value;
                const street = document.querySelectorAll('#address-saudi-resident .addr-input')[2]?.value;
                const district = document.querySelectorAll('#address-saudi-resident .addr-input')[3]?.value;
                const city = document.querySelectorAll('#address-saudi-resident .addr-input')[4]?.value;
                const postalCode = document.querySelectorAll('#address-saudi-resident .addr-input')[5]?.value;
                const extraNumber = document.querySelectorAll('#address-saudi-resident .addr-input')[6]?.value;
                const unitNumber = document.querySelector('#address-saudi-resident input[type="text"]:nth-of-type(2)')?.value;
                const shortName = document.querySelector('#address-saudi-resident .addr-input:last-of-type')?.value;
                data.buildingNumber = buildingNo;
                data.streetSubNumber = subNumber;
                data.streetName = street;
                data.district = district;
                data.city = city;
                data.postalCode = postalCode;
                data.extraNumber = extraNumber;
                data.unitNumber = unitNumber;
                data.addressShortName = shortName;
            } else {
                const country = document.getElementById('intlAddressCountry')?.value;
                const city = document.querySelector('#address-international .addr-input:nth-of-type(2)')?.value;
                const state = document.querySelector('#address-international .addr-input:nth-of-type(3)')?.value;
                const district = document.querySelector('#address-international .addr-input:nth-of-type(4)')?.value;
                const street = document.querySelector('#address-international .addr-input:nth-of-type(5)')?.value;
                const zip = document.querySelector('#address-international .addr-input:nth-of-type(6)')?.value;
                const extraDesc = document.querySelector('#address-international textarea')?.value;
                data.internationalCountry = country;
                data.internationalCity = city;
                data.internationalState = state;
                data.internationalDistrict = district;
                data.internationalStreet = street;
                data.internationalZip = zip;
                data.addressExtra = extraDesc;
            }
            return data;
        }

        // إرسال البيانات إلى الخادم (محاكاة)
        async function submitRegistration(data) {
            // هنا يمكن استبدال المحاكاة باستدعاء API حقيقي
            console.log('بيانات التسجيل المرسلة:', data);
            // محاكاة زمن الشبكة
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ success: true, message: 'تم إنشاء الحساب بنجاح، يرجى تفعيله عبر البريد الإلكتروني' });
                }, 1500);
            });
        }

        // ------------------- الأحداث -------------------
        // زر "التالي"
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (validateCurrentStep()) {
                    if (currentStep < totalSteps) {
                        showStep(currentStep + 1);
                    }
                }
            });
        }

        // زر "السابق"
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentStep > 1) {
                    showStep(currentStep - 1);
                }
            });
        }

        // إرسال النموذج (المرحلة الرابعة)
        if (form && submitBtn) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                if (!validateCurrentStep()) return;

                // تعطيل الزر لمنع الإرسال المتكرر
                submitBtn.disabled = true;
                submitBtn.textContent = 'جاري إنشاء الحساب...';

                const formData = collectAllFormData();
                const result = await submitRegistration(formData);

                if (result.success) {
                    if (typeof window.showNotification === 'function') {
                        window.showNotification(result.message, 'success');
                    } else {
                        alert(result.message);
                    }
                    // إظهار مودال OTP
                    const otpModal = document.getElementById('otpModal');
                    if (otpModal) otpModal.classList.remove('hidden');
                } else {
                    if (typeof window.showNotification === 'function') {
                        window.showNotification(result.message || 'حدث خطأ، حاول مرة أخرى', 'error');
                    } else {
                        alert('حدث خطأ أثناء إنشاء الحساب');
                    }
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'إنشاء الحساب';
                }
            });
        }

        // ------------------- منطق ديناميكي للحقول -------------------
        // إظهار/إخفاء حقول الهوية بناءً على الجنسية
        const nationalitySelect = document.getElementById('nationalityType');
        const identitySection = document.getElementById('dynamic-identity-section');
        if (nationalitySelect && identitySection) {
            nationalitySelect.addEventListener('change', function() {
                identitySection.classList.remove('hidden');
                // إخفاء جميع مجموعات الهوية أولاً
                document.querySelectorAll('.nationality-fields').forEach(el => el.classList.add('hidden'));
                const val = this.value;
                if (val === 'saudi') document.getElementById('fields-saudi')?.classList.remove('hidden');
                else if (val === 'resident') document.getElementById('fields-resident')?.classList.remove('hidden');
                else if (val === 'gcc') document.getElementById('fields-gcc')?.classList.remove('hidden');
                else if (val === 'foreigner') document.getElementById('fields-foreigner')?.classList.remove('hidden');
            });
            // تشغيل التغيير الافتراضي لضبط الحالة
            nationalitySelect.dispatchEvent(new Event('change'));
        }

        // إظهار حقول الأجنبي الفرعية حسب نوع الوثيقة
        const foreignerRadios = document.querySelectorAll('input[name="foreignerDocType"]');
        if (foreignerRadios.length) {
            function toggleForeignerSubFields() {
                const selected = document.querySelector('input[name="foreignerDocType"]:checked')?.value;
                const idDiv = document.getElementById('sub-fields-foreigner-id');
                const passportDiv = document.getElementById('sub-fields-passport');
                if (selected === 'national_id') {
                    if (idDiv) idDiv.classList.remove('hidden');
                    if (passportDiv) passportDiv.classList.add('hidden');
                } else if (selected === 'passport') {
                    if (idDiv) idDiv.classList.add('hidden');
                    if (passportDiv) passportDiv.classList.remove('hidden');
                } else {
                    if (idDiv) idDiv.classList.add('hidden');
                    if (passportDiv) passportDiv.classList.add('hidden');
                }
            }
            foreignerRadios.forEach(radio => radio.addEventListener('change', toggleForeignerSubFields));
            toggleForeignerSubFields(); // التهيئة
        }

        // إظهار حقول العنوان حسب الجنسية
        const addressSaudi = document.getElementById('address-saudi-resident');
        const addressInternational = document.getElementById('address-international');
        function updateAddressFields() {
            const nationality = document.getElementById('nationalityType')?.value;
            const isSaudiOrResident = (nationality === 'saudi' || nationality === 'resident');
            if (addressSaudi) addressSaudi.classList.toggle('hidden', !isSaudiOrResident);
            if (addressInternational) addressInternational.classList.toggle('hidden', isSaudiOrResident);
        }
        if (nationalitySelect) {
            nationalitySelect.addEventListener('change', updateAddressFields);
            updateAddressFields();
        }

        // تحقق فوري من تطابق البريد الإلكتروني
        const emailField = document.getElementById('email');
        const confirmEmailField = document.getElementById('confirmEmail');
        if (emailField && confirmEmailField) {
            function checkEmailMatch() {
                const statusDiv = document.getElementById('email-match-status');
                if (emailField.value && confirmEmailField.value && emailField.value === confirmEmailField.value) {
                    statusDiv.textContent = '✓ البريدان متطابقان';
                    statusDiv.style.color = 'green';
                } else if (confirmEmailField.value) {
                    statusDiv.textContent = '✗ البريدان غير متطابقين';
                    statusDiv.style.color = 'red';
                } else {
                    statusDiv.textContent = '';
                }
            }
            emailField.addEventListener('input', checkEmailMatch);
            confirmEmailField.addEventListener('input', checkEmailMatch);
        }

        // تحقق فوري من كلمة المرور وقوتها
        const passwordField = document.getElementById('password');
        const confirmPassField = document.getElementById('confirmPassword');
        if (passwordField && confirmPassField) {
            function checkPasswordMatch() {
                const statusDiv = document.getElementById('password-match-status');
                if (passwordField.value && confirmPassField.value && passwordField.value === confirmPassField.value) {
                    statusDiv.textContent = '✓ كلمتا المرور متطابقتان';
                    statusDiv.style.color = 'green';
                } else if (confirmPassField.value) {
                    statusDiv.textContent = '✗ كلمتا المرور غير متطابقتين';
                    statusDiv.style.color = 'red';
                } else {
                    statusDiv.textContent = '';
                }
            }
            passwordField.addEventListener('input', function() {
                if (typeof window.checkPasswordStrength === 'function') {
                    const strength = window.checkPasswordStrength(this.value);
                    const fillBar = document.getElementById('strength-bar-fill');
                    const strengthText = document.getElementById('strength-text');
                    if (fillBar) {
                        const percent = (strength.strength / 5) * 100;
                        fillBar.style.width = percent + '%';
                        let color = '#f44336';
                        if (strength.level === 'متوسطة') color = '#ff9800';
                        if (strength.level === 'قوية') color = '#4caf50';
                        fillBar.style.backgroundColor = color;
                    }
                    if (strengthText) strengthText.textContent = strength.level;
                }
                checkPasswordMatch();
            });
            confirmPassField.addEventListener('input', checkPasswordMatch);
        }

        // تفعيل مربع "الموافقة الشاملة"
        const masterCheck = document.getElementById('masterAgreementCheck');
        if (masterCheck) {
            masterCheck.addEventListener('change', function(e) {
                const allAgreements = document.querySelectorAll('.agreement-check');
                allAgreements.forEach(cb => cb.checked = e.target.checked);
            });
        }

        // ------------------- منطق مودال OTP -------------------
        const otpModal = document.getElementById('otpModal');
        const verifyOtpBtn = document.getElementById('verifyOtpBtn');
        const otpInput = document.getElementById('otpInput');
        const completeLaterSection = document.getElementById('completeLaterSection');
        const completeLaterBtn = document.getElementById('completeLaterBtn');

        if (verifyOtpBtn && otpModal) {
            verifyOtpBtn.addEventListener('click', function() {
                const enteredOtp = otpInput.value.trim();
                // في الواقع يتم التحقق من الخادم، هنا نستخدم رمز تجريبي "1234"
                if (enteredOtp === '1234') {
                    if (completeLaterSection) completeLaterSection.classList.remove('hidden');
                    verifyOtpBtn.disabled = true;
                    if (typeof window.showNotification === 'function') {
                        window.showNotification('تم تفعيل الحساب بنجاح!', 'success');
                    }
                    // يمكن إعادة توجيه المستخدم أو إبقاءه
                } else {
                    if (typeof window.showNotification === 'function') {
                        window.showNotification('رمز التحقق غير صحيح، حاول مرة أخرى', 'error');
                    } else {
                        alert('رمز التحقق غير صحيح');
                    }
                }
            });
        }

        if (completeLaterBtn) {
            completeLaterBtn.addEventListener('click', function() {
                // توجيه المستخدم إلى لوحة التحكم أو الصفحة الرئيسية
                window.location.href = '../../pages/dashboard/index.html';
            });
        }

        // إغلاق المودال عند النقر خارج المحتوى (اختياري)
        if (otpModal) {
            otpModal.addEventListener('click', function(e) {
                if (e.target === otpModal) {
                    otpModal.classList.add('hidden');
                }
            });
        }

        // تهيئة أولية: إظهار الخطوة الأولى
        showStep(1);
    });
})();
