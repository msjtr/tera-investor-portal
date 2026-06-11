/**
 * ==========================================================================
 * TERA - Register Page Complete Logic & Flow Control
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. إعدادات التنقل بين المراحل (Stepper)
    // ==========================================
    let currentStep = 1;
    const totalSteps = 4;

    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnSubmit = document.getElementById('btn-submit');
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.step');
    const form = document.getElementById('registerForm');

    function updateSteps() {
        // تحديث الأقسام المعروضة
        steps.forEach((step, idx) => {
            step.classList.toggle('active', idx + 1 === currentStep);
        });

        // تحديث المؤشرات العلوية
        stepIndicators.forEach((ind, idx) => {
            ind.classList.toggle('active', idx + 1 === currentStep);
            ind.classList.toggle('completed', idx + 1 < currentStep);
        });

        // تحديث حالة الأزرار
        btnPrev.classList.toggle('hidden', currentStep === 1);
        
        if (currentStep === totalSteps) {
            btnNext.classList.add('hidden');
            btnSubmit.classList.remove('hidden');
        } else {
            btnNext.classList.remove('hidden');
            btnSubmit.classList.add('hidden');
        }
    }

    // ==========================================
    // 2. التحقق من صحة البيانات (Validation)
    // ==========================================
    function validateCurrentStep() {
        const activeSection = document.getElementById(`step${currentStep}`);
        const requiredInputs = activeSection.querySelectorAll('input[required], select[required]');
        let isValid = true;

        // فحص الحقول الفارغة أو الصناديق غير المحددة
        requiredInputs.forEach(input => {
            if ((input.type === 'checkbox' && !input.checked) || (input.type !== 'checkbox' && !input.value.trim())) {
                isValid = false;
                input.style.borderColor = '#ef4444';
            } else {
                input.style.borderColor = '#cbd5e1';
            }
        });

        if (!isValid) {
            alert('يرجى تعبئة كافة الحقول الإلزامية لاستكمال هذه المرحلة.');
            return false;
        }

        // تحققات إضافية مخصصة للمرحلة الأولى (إنشاء الحساب)
        if (currentStep === 1) {
            const hasInvalidRules = activeSection.querySelectorAll('.validation-list .invalid').length > 0;
            if (hasInvalidRules) {
                alert('يرجى التأكد من استيفاء جميع شروط اسم المستخدم وكلمة المرور.');
                return false;
            }

            const email = document.getElementById('email').value;
            const confirmEmail = document.getElementById('confirm-email').value;
            if (email !== confirmEmail) {
                alert('البريد الإلكتروني المدخل وتأكيده غير متطابقين.');
                return false;
            }

            const pass = document.getElementById('password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            if (pass !== confirmPass) {
                alert('كلمة المرور وتأكيدها غير متطابقين.');
                return false;
            }
        }

        return true;
    }

    // أزرار التنقل
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

    // ==========================================
    // 3. التحقق الحي المباشر (Live Validation)
    // ==========================================
    
    // منع إدخال اللغة العربية في الحقول المخصصة للإنجليزية فقط
    function enforceEnglishOnly(e) {
        const arabicPattern = /[\u0600-\u06FF\s]/g; // يمنع العربية والمسافات
        if (arabicPattern.test(e.target.value) && e.target.id !== 'nameEn') {
            e.target.value = e.target.value.replace(arabicPattern, '');
        } else if (e.target.id === 'nameEn') {
            // للسماح بالمسافات في الاسم الإنجليزي
            e.target.value = e.target.value.replace(/[\u0600-\u06FF]/g, '');
        }
    }

    ['username', 'email', 'confirm-email', 'password', 'confirm-password', 'nameEn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', enforceEnglishOnly);
    });

    // التحقق من اسم المستخدم
    const userInput = document.getElementById('username');
    if (userInput) {
        userInput.addEventListener('input', function() {
            const v = this.value;
            const rules = document.querySelectorAll('#user-validation li');
            
            rules[0].className = (v.length >= 4 && v.length <= 20) ? 'valid' : 'invalid';
            rules[1].className = (/^[a-zA-Z0-9]+$/.test(v) && v.length > 0) ? 'valid' : 'invalid';
            rules[2].className = (!/\s/.test(v) && v.length > 0) ? 'valid' : 'invalid';
            rules[3].className = (!/[~`!@#$%\^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g.test(v) && v.length > 0) ? 'valid' : 'invalid';
            rules[4].className = (v.length >= 4) ? 'valid' : 'invalid'; // افتراضياً صحيح حتى يتم ربطه بقاعدة البيانات
        });
    }

    // التحقق من تطابق البريد الإلكتروني
    const emailInput = document.getElementById('email');
    const confirmEmailInput = document.getElementById('confirm-email');
    const emailStatus = document.getElementById('email-status');

    function verifyEmails() {
        if (!confirmEmailInput.value) { emailStatus.textContent = ''; return; }
        if (emailInput.value === confirmEmailInput.value) {
            emailStatus.style.color = '#10b981'; emailStatus.textContent = '🟢 البريد الإلكتروني متطابق';
        } else {
            emailStatus.style.color = '#ef4444'; emailStatus.textContent = '🔴 البريد الإلكتروني غير متطابق';
        }
    }
    if (emailInput && confirmEmailInput) {
        emailInput.addEventListener('input', verifyEmails);
        confirmEmailInput.addEventListener('input', verifyEmails);
    }

    // إظهار/إخفاء كلمة المرور
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = 'إخفاء';
            } else {
                input.type = 'password';
                this.textContent = 'إظهار';
            }
        });
    });

    // مؤشر قوة كلمة المرور والتحقق من الشروط
    const passInput = document.getElementById('password');
    const confirmPassInput = document.getElementById('confirm-password');
    const passStatus = document.getElementById('password-status');

    if (passInput) {
        passInput.addEventListener('input', function() {
            const v = this.value;
            const rules = document.querySelectorAll('#pass-validation li');
            const bar = document.querySelector('.strength-bar');
            const txt = document.querySelector('.strength-text');

            const c1 = v.length >= 8; rules[0].className = c1 ? 'valid' : 'invalid';
            const c2 = /[A-Z]/.test(v); rules[1].className = c2 ? 'valid' : 'invalid';
            const c3 = /[a-z]/.test(v); rules[2].className = c3 ? 'valid' : 'invalid';
            const c4 = /[0-9]/.test(v); rules[3].className = c4 ? 'valid' : 'invalid';
            const c5 = /[!@#$%^&*(),.?":{}|<>]/.test(v); rules[4].className = c5 ? 'valid' : 'invalid';

            let score = c1 + c2 + c3 + c4 + c5;
            bar.className = 'strength-bar';
            
            if (v.length === 0) { txt.textContent = 'ضعيفة'; }
            else if (score <= 2) { bar.classList.add('weak'); txt.textContent = 'ضعيفة'; }
            else if (score === 3) { bar.classList.add('medium'); txt.textContent = 'متوسطة'; }
            else if (score === 4) { bar.classList.add('strong'); txt.textContent = 'قوية'; }
            else if (score === 5) { bar.classList.add('very-strong'); txt.textContent = 'قوية جداً'; }
            
            verifyPasswords();
        });
    }

    function verifyPasswords() {
        if (!confirmPassInput.value) { passStatus.textContent = ''; return; }
        if (passInput.value === confirmPassInput.value) {
            passStatus.style.color = '#10b981'; passStatus.textContent = '🟢 كلمة المرور متطابقة';
        } else {
            passStatus.style.color = '#ef4444'; passStatus.textContent = '🔴 كلمة المرور غير متطابقة';
        }
    }
    if (confirmPassInput) confirmPassInput.addEventListener('input', verifyPasswords);

    // ==========================================
    // 4. توليد الحقول الديناميكية (الهوية والعنوان)
    // ==========================================
    const nationalitySelect = document.getElementById('nationalityType');
    const idFieldset = document.getElementById('id-details-fieldset');
    const idContainer = document.getElementById('id-details-container');
    const addressContainer = document.getElementById('address-container');

    if (nationalitySelect) {
        nationalitySelect.addEventListener('change', function() {
            const type = this.value;
            
            if (!type) {
                idFieldset.classList.add('hidden');
                idContainer.innerHTML = '';
                addressContainer.innerHTML = '<p class="text-muted text-center">يرجى تحديد الجنسية أولاً في المرحلة السابقة لتعبئة بيانات العنوان.</p>';
                return;
            }

            idFieldset.classList.remove('hidden');
            renderDynamicFields(type);
        });
    }

    function renderDynamicFields(type) {
        let idHtml = '';
        let addressHtml = '';

        // توليد حقول الهوية
        if (type === 'saudi') {
            idHtml = `
                <div class="form-group"><label>رقم الهوية الوطنية *</label><input type="text" required></div>
                <div class="form-group"><label>تاريخ إصدار الهوية *</label><input type="date" required></div>
                <div class="form-group"><label>تاريخ انتهاء الهوية *</label><input type="date" required></div>`;
            addressHtml = getNationalAddressTemplate();
        } else if (type === 'resident') {
            idHtml = `
                <div class="form-group"><label>رقم الإقامة *</label><input type="text" required></div>
                <div class="form-group"><label>تاريخ إصدار الإقامة *</label><input type="date" required></div>
                <div class="form-group"><label>تاريخ انتهاء الإقامة *</label><input type="date" required></div>`;
            addressHtml = getNationalAddressTemplate();
        } else if (type === 'gcc') {
            idHtml = `
                <div class="form-group"><label>الدولة *</label><input type="text" required></div>
                <div class="form-group"><label>رقم الهوية الخليجية *</label><input type="text" required></div>
                <div class="form-group"><label>تاريخ إصدار الهوية *</label><input type="date" required></div>
                <div class="form-group"><label>تاريخ انتهاء الهوية *</label><input type="date" required></div>`;
            addressHtml = getInternationalAddressTemplate();
        } else if (type === 'foreigner') {
            idHtml = `
                <div class="form-group">
                    <label>نوع الوثيقة *</label>
                    <div class="radio-group" id="foreign-doc-choice">
                        <label class="radio-container"><input type="radio" name="foreign_doc" value="national" checked><span class="radio-mark"></span> الهوية الوطنية لبلده</label>
                        <label class="radio-container"><input type="radio" name="foreign_doc" value="passport"><span class="radio-mark"></span> جواز السفر</label>
                    </div>
                </div>
                <div id="dynamic-foreign-doc-fields"></div>`;
            addressHtml = getInternationalAddressTemplate();
        }

        idContainer.innerHTML = idHtml;
        addressContainer.innerHTML = addressHtml;

        // تشغيل مراقب التغيير للوثيقة الأجنبية إذا تم اختيارها
        if (type === 'foreigner') {
            setupForeignerDocToggle();
        }
    }

    function setupForeignerDocToggle() {
        const container = document.getElementById('dynamic-foreign-doc-fields');
        const radios = document.getElementsByName('foreign_doc');
        
        const renderSubFields = () => {
            const selected = document.querySelector('input[name="foreign_doc"]:checked').value;
            if (selected === 'national') {
                container.innerHTML = `
                    <div class="form-group"><label>الدولة *</label><input type="text" required></div>
                    <div class="form-group"><label>رقم الهوية *</label><input type="text" required></div>
                    <div class="form-group"><label>تاريخ الإصدار *</label><input type="date" required></div>
                    <div class="form-group"><label>تاريخ الانتهاء *</label><input type="date" required></div>`;
            } else {
                container.innerHTML = `
                    <div class="form-group"><label>دولة الإصدار *</label><input type="text" required></div>
                    <div class="form-group"><label>رقم جواز السفر *</label><input type="text" required></div>
                    <div class="form-group"><label>تاريخ إصدار الجواز *</label><input type="date" required></div>
                    <div class="form-group"><label>تاريخ انتهاء الجواز *</label><input type="date" required></div>`;
            }
        };

        radios.forEach(r => r.addEventListener('change', renderSubFields));
        renderSubFields(); // تشغيل أولي
    }

    function getNationalAddressTemplate() {
        return `
            <div class="text-center mb-3"><strong style="color: #0A1940;">بيانات العنوان الوطني</strong></div>
            <div class="grid-address">
                <div class="form-group"><label>رقم المبنى *</label><input type="text" required></div>
                <div class="form-group"><label>الرقم الفرعي *</label><input type="text" required></div>
                <div class="form-group"><label>اسم الشارع *</label><input type="text" required></div>
                <div class="form-group"><label>الحي *</label><input type="text" required></div>
                <div class="form-group"><label>المدينة *</label><input type="text" required></div>
                <div class="form-group"><label>الرمز البريدي *</label><input type="text" required></div>
                <div class="form-group"><label>الرقم الإضافي *</label><input type="text" required></div>
                <div class="form-group"><label>رقم الوحدة (اختياري)</label><input type="text"></div>
            </div>
            <div class="form-group mt-2"><label>الاسم المختصر للعنوان الوطني *</label><input type="text" required></div>`;
    }

    function getInternationalAddressTemplate() {
        return `
            <div class="grid-address">
                <div class="form-group"><label>الدولة *</label><input type="text" required></div>
                <div class="form-group"><label>المدينة *</label><input type="text" required></div>
                <div class="form-group"><label>المحافظة / الولاية *</label><input type="text" required></div>
                <div class="form-group"><label>الحي *</label><input type="text" required></div>
                <div class="form-group"><label>الشارع *</label><input type="text" required></div>
                <div class="form-group"><label>الرمز البريدي *</label><input type="text" required></div>
            </div>
            <div class="form-group"><label>وصف إضافي للعنوان</label><input type="text"></div>`;
    }

    // ==========================================
    // 5. إرسال النموذج (Submit)
    // ==========================================
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateCurrentStep()) {
                // إظهار رسالة النجاح والتحويل لصفحة التحقق من البريد
                alert('تم تقديم طلب تسجيل الحساب بنجاح! سيتم إرسال رمز التحقق OTP إلى بريدك الإلكتروني.');
                window.location.href = '../verify-otp.html';
            }
        });
    }
});
