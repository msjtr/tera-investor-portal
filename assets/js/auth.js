// auth.js - إدارة المصادقة والتسجيل

(function() {
    // استدعاء core أولاً (يتم تحميله قبل هذا الملف)

    let currentStep = 1;
    const totalSteps = 4;

    // تبديل الخطوات
    function showStep(step) {
        document.querySelectorAll('.form-step-section').forEach((section, idx) => {
            section.classList.toggle('active', idx + 1 === step);
        });
        document.querySelectorAll('.step').forEach((stepEl, idx) => {
            stepEl.classList.toggle('active', idx + 1 === step);
        });
        document.getElementById('prevBtn').classList.toggle('hidden', step === 1);
        document.getElementById('nextBtn').classList.toggle('hidden', step === totalSteps);
        document.getElementById('submitBtn').classList.toggle('hidden', step !== totalSteps);
        currentStep = step;
    }

    // التحقق من صحة الخطوة الحالية
    function validateCurrentStep() {
        const currentSection = document.querySelector(`.form-step-section.active`);
        const requiredFields = currentSection.querySelectorAll('[required]');
        let valid = true;
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                valid = false;
                field.classList.add('error');
                showNotification(`الرجاء تعبئة الحقل: ${field.labels?.[0]?.innerText || field.placeholder || 'حقل مطلوب'}`, 'error');
            } else {
                field.classList.remove('error');
            }
        });
        // تحقق خاص بالمرحلة الأولى
        if (currentSection.id === 'step1') {
            const username = document.getElementById('username').value;
            const uCheck = window.validateUsername(username);
            if (!uCheck.valid) valid = false;
            const email = document.getElementById('email').value;
            const confirmEmail = document.getElementById('confirmEmail').value;
            if (email !== confirmEmail) { valid = false; showNotification('البريد الإلكتروني غير متطابق', 'error'); }
            const password = document.getElementById('password').value;
            const confirmPass = document.getElementById('confirmPassword').value;
            if (password !== confirmPass) { valid = false; showNotification('كلمة المرور غير متطابقة', 'error'); }
            const strength = window.checkPasswordStrength(password);
            if (strength.strength < 3) { valid = false; showNotification('كلمة المرور ضعيفة جداً', 'error'); }
        }
        if (currentSection.id === 'step4') {
            const allAgreements = document.querySelectorAll('.agreement-check');
            const master = document.getElementById('masterAgreementCheck');
            let allChecked = true;
            allAgreements.forEach(cb => { if (!cb.checked) allChecked = false; });
            if (!allChecked && !master.checked) { valid = false; showNotification('يجب الموافقة على جميع الإقرارات', 'error'); }
            if (master.checked) {
                allAgreements.forEach(cb => cb.checked = true);
            }
        }
        return valid;
    }

    // إرسال بيانات التسجيل (محاكاة API)
    async function submitRegistration(data) {
        // محاكاة طلب API
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, message: 'تم إنشاء الحساب، يرجى تفعيله عبر البريد الإلكتروني' });
            }, 1000);
        });
    }

    // تهيئة أحداث الصفحة
    document.addEventListener('DOMContentLoaded', () => {
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.getElementById('submitBtn');
        const form = document.getElementById('registrationForm');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (validateCurrentStep()) {
                    if (currentStep < totalSteps) showStep(currentStep + 1);
                }
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentStep > 1) showStep(currentStep - 1);
            });
        }
        if (submitBtn && form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!validateCurrentStep()) return;
                const formData = window.collectFormData('registrationForm');
                showNotification('جاري إنشاء الحساب...', 'info');
                const result = await submitRegistration(formData);
                if (result.success) {
                    showNotification(result.message, 'success');
                    // إظهار مودال OTP
                    document.getElementById('otpModal').classList.remove('hidden');
                    // محاكاة إرسال OTP (يمكن استدعاء API حقيقي)
                } else {
                    showNotification('حدث خطأ، حاول مرة أخرى', 'error');
                }
            });
        }

        // إدارة الجنسية وإظهار حقول الهوية
        const nationalitySelect = document.getElementById('nationalityType');
        if (nationalitySelect) {
            nationalitySelect.addEventListener('change', function() {
                const identitySection = document.getElementById('dynamic-identity-section');
                identitySection.classList.remove('hidden');
                document.querySelectorAll('.nationality-fields').forEach(el => el.classList.add('hidden'));
                const selected = this.value;
                if (selected === 'saudi') document.getElementById('fields-saudi')?.classList.remove('hidden');
                else if (selected === 'resident') document.getElementById('fields-resident')?.classList.remove('hidden');
                else if (selected === 'gcc') document.getElementById('fields-gcc')?.classList.remove('hidden');
                else if (selected === 'foreigner') document.getElementById('fields-foreigner')?.classList.remove('hidden');
            });
        }

        // التحقق من تطابق البريد الإلكتروني
        const email = document.getElementById('email');
        const confirmEmail = document.getElementById('confirmEmail');
        if (email && confirmEmail) {
            function checkEmailMatch() {
                const statusDiv = document.getElementById('email-match-status');
                if (email.value === confirmEmail.value && email.value !== '') {
                    statusDiv.textContent = '✓ البريدان متطابقان';
                    statusDiv.style.color = 'green';
                } else if (confirmEmail.value !== '') {
                    statusDiv.textContent = '✗ البريدان غير متطابقين';
                    statusDiv.style.color = 'red';
                } else {
                    statusDiv.textContent = '';
                }
            }
            email.addEventListener('input', checkEmailMatch);
            confirmEmail.addEventListener('input', checkEmailMatch);
        }

        // تحقق كلمة المرور
        const password = document.getElementById('password');
        const confirmPass = document.getElementById('confirmPassword');
        if (password && confirmPass) {
            function checkPassMatch() {
                const statusDiv = document.getElementById('password-match-status');
                if (password.value === confirmPass.value && password.value !== '') {
                    statusDiv.textContent = '✓ كلمتا المرور متطابقتان';
                    statusDiv.style.color = 'green';
                } else if (confirmPass.value !== '') {
                    statusDiv.textContent = '✗ كلمتا المرور غير متطابقتين';
                    statusDiv.style.color = 'red';
                } else {
                    statusDiv.textContent = '';
                }
            }
            password.addEventListener('input', function() {
                const strength = window.checkPasswordStrength(this.value);
                const fillBar = document.getElementById('strength-bar-fill');
                const strengthText = document.getElementById('strength-text');
                if (fillBar) {
                    let percent = (strength.strength / 5) * 100;
                    fillBar.style.width = percent + '%';
                    fillBar.style.backgroundColor = strength.level === 'قوية' ? '#4caf50' : (strength.level === 'متوسطة' ? '#ff9800' : '#f44336');
                }
                if (strengthText) strengthText.textContent = strength.level;
                checkPassMatch();
            });
            confirmPass.addEventListener('input', checkPassMatch);
        }

        // تفعيل الموافقة الشاملة
        const masterCheck = document.getElementById('masterAgreementCheck');
        if (masterCheck) {
            masterCheck.addEventListener('change', function(e) {
                const allChecks = document.querySelectorAll('.agreement-check');
                allChecks.forEach(cb => cb.checked = e.target.checked);
            });
        }

        // OTP
        const verifyBtn = document.getElementById('verifyOtpBtn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
                const otp = document.getElementById('otpInput').value;
                if (otp === '1234') { // رمز تجريبي
                    document.getElementById('completeLaterSection').classList.remove('hidden');
                    verifyBtn.disabled = true;
                    showNotification('تم تفعيل الحساب بنجاح', 'success');
                } else {
                    showNotification('رمز خاطئ، حاول مرة أخرى', 'error');
                }
            });
        }
        const laterBtn = document.getElementById('completeLaterBtn');
        if (laterBtn) {
            laterBtn.addEventListener('click', () => {
                window.location.href = '../dashboard/index.html';
            });
        }
    });
})();
