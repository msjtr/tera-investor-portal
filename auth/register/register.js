/**
 * ==========================================================================
 * TERA - Register Page Logic
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. إعدادات التنقل بين الخطوات
    let currentStep = 1;
    const totalSteps = 4;

    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnSubmit = document.getElementById('btn-submit');
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.step');

    function updateSteps() {
        // تحديث النماذج
        steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === currentStep);
        });

        // تحديث المؤشر العلوي
        stepIndicators.forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');
            if (index + 1 === currentStep) {
                indicator.classList.add('active');
            } else if (index + 1 < currentStep) {
                indicator.classList.add('completed');
            }
        });

        // تحديث الأزرار
        btnPrev.classList.toggle('hidden', currentStep === 1);
        
        if (currentStep === totalSteps) {
            btnNext.classList.add('hidden');
            btnSubmit.classList.remove('hidden');
        } else {
            btnNext.classList.remove('hidden');
            btnSubmit.classList.add('hidden');
        }
    }

    btnNext.addEventListener('click', () => {
        // هنا يمكن إضافة التحقق من صحة الحقول (Validation) قبل الانتقال للخطوة التالية
        if (currentStep < totalSteps) {
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
    // 2. التحقق الحي من المدخلات (Live Validation)
    // ==========================================
    
    // التحقق من اسم المستخدم
    const usernameInput = document.getElementById('username');
    const userRules = document.querySelectorAll('#user-validation li');
    
    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            const val = e.target.value;
            // قاعدة 1: الطول
            toggleValid(userRules[0], val.length >= 4 && val.length <= 20);
            // قاعدة 2: إنجليزي وأرقام فقط
            toggleValid(userRules[1], /^[a-zA-Z0-9]+$/.test(val) && val.length > 0);
            // قاعدة 3: لا مسافات
            toggleValid(userRules[2], !/\s/.test(val) && val.length > 0);
            // قاعدة 4: لا رموز خاصة
            toggleValid(userRules[3], !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(val) && val.length > 0);
            // قاعدة 5: افتراضية (يتم فحصها عبر API لاحقاً)
            toggleValid(userRules[4], val.length > 3);
        });
    }

    // التحقق من البريد الإلكتروني
    const emailInput = document.getElementById('email');
    const confirmEmailInput = document.getElementById('confirm-email');
    const emailStatus = document.getElementById('email-status');

    function checkEmailMatch() {
        if (confirmEmailInput.value.length === 0) {
            emailStatus.textContent = '';
            return;
        }
        if (emailInput.value === confirmEmailInput.value) {
            emailStatus.innerHTML = '<span class="text-success">🟢 البريد الإلكتروني متطابق</span>';
        } else {
            emailStatus.innerHTML = '<span class="text-danger">🔴 البريد الإلكتروني غير متطابق</span>';
        }
    }
    
    if (emailInput && confirmEmailInput) {
        emailInput.addEventListener('input', checkEmailMatch);
        confirmEmailInput.addEventListener('input', checkEmailMatch);
    }

    // التحقق من كلمة المرور
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

            // تحديث شريط القوة
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
        if (confirmPassInput.value.length === 0) {
            passStatus.textContent = '';
            return;
        }
        if (passInput.value === confirmPassInput.value) {
            passStatus.innerHTML = '<span class="text-success">🟢 كلمة المرور متطابقة</span>';
        } else {
            passStatus.innerHTML = '<span class="text-danger">🔴 كلمة المرور غير متطابقة</span>';
        }
    }

    if (confirmPassInput) {
        confirmPassInput.addEventListener('input', checkPassMatch);
    }

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
    // 3. توليد حقول الهوية والعنوان ديناميكياً
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

        // تبديل حقول الأجنبي
        if (type === 'foreigner') {
            const radios = idContainer.querySelectorAll('input[name="doc_type"]');
            radios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const docDetails = document.getElementById('foreignDocDetails');
                    if (e.target.value === 'national') {
                        docDetails.innerHTML = `
                            <div class="form-group">
                                <label>الدولة *</label><input
