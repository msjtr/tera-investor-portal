document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. محرك التحقق الصارم من الخانات قبل الانتقال (Validation & Navigation Engine)
    // ==========================================================================
    const formSteps = document.querySelectorAll('.form-step');
    const stepNodes = document.querySelectorAll('.reg-step-node');
    const nextButtons = document.querySelectorAll('.btn-next');
    const prevButtons = document.querySelectorAll('.btn-prev');
    let currentStep = 0;

    function isStepValid(stepIndex) {
        let valid = true;
        const currentStepEl = formSteps[stepIndex];
        
        // جلب جميع الحقول المطلوبة والموجودة حالياً داخل الهيكل النشط فقط
        const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
        
        inputs.forEach(input => {
            // التحقق من الحقول النصية وحقول الاختيار
            if (!input.value.trim()) {
                valid = false;
                input.classList.add('input-error');
            } else {
                input.classList.remove('input-error');
            }

            // التحقق من صناديق الاختيار Checkboxes
            if (input.type === 'checkbox' && !input.checked) {
                valid = false;
                input.parentElement.style.color = 'var(--error-red)';
            } else if (input.type === 'checkbox' && input.checked) {
                input.parentElement.style.color = 'var(--text-main)';
            }
        });

        // شروط فنية خاصة بالمرحلة الأولى
        if (stepIndex === 0) {
            const hasInvalids = currentStepEl.querySelectorAll('.req-item.invalid').length > 0;
            const hasEmptyReqs = currentStepEl.querySelectorAll('.req-item:not(.valid)').length > 0;
            const emailMatch = document.getElementById('reg_email').value === document.getElementById('reg_confirm_email').value;
            const passMatch = document.getElementById('reg_password').value === document.getElementById('reg_confirm_password').value;
            
            if (hasInvalids || hasEmptyReqs || !emailMatch || !passMatch) {
                valid = false;
            }
        }
        return valid;
    }

    function updateStepDisplay() {
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });
        stepNodes.forEach((node, index) => {
            node.classList.toggle('active', index === currentStep);
            node.classList.toggle('completed', index < currentStep);
        });
        const card = document.querySelector('.register-card-wide');
        if (card) card.scrollIntoView({ behavior: 'smooth' });
    }

    nextButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const stepIndex = parseInt(btn.getAttribute('data-step-index'));
            if (isStepValid(stepIndex)) {
                if (currentStep < formSteps.length - 1) {
                    currentStep++;
                    updateStepDisplay();
                }
            } else {
                // هز البطاقة تنبيهياً لوجود حقول فارغة أو خاطئة
                const card = document.querySelector('.register-card-wide');
                card.style.animation = 'none';
                setTimeout(() => card.style.animation = 'shake 0.4s ease-in-out', 10);
            }
        });
    });

    prevButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateStepDisplay();
            }
        });
    });


    // ==========================================================================
    // 2. فحص اسم المستخدم وشروطه الخمسة حياً
    // ==========================================================================
    const usernameInput = document.getElementById('reg_username');
    const userReqs = {
        len: document.getElementById('user_len'),
        alpha: document.getElementById('user_alpha'),
        space: document.getElementById('user_space'),
        spec: document.getElementById('user_spec'),
        ajax: document.getElementById('user_ajax')
    };

    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            const val = usernameInput.value;
            if (val === '') {
                Object.values(userReqs).forEach(el => { if(el) el.className = 'req-item'; });
                return;
            }

            updateReqUI(userReqs.len, val.length >= 4 && val.length <= 20);
            updateReqUI(userReqs.alpha, /^[a-zA-Z0-9]*$/.test(val));
            updateReqUI(userReqs.space, !/\s/.test(val));
            updateReqUI(userReqs.spec, !/[~`!@#$%^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(val));
            
            // محاكاة الفحص الخلفي التلقائي لشرط (غير مستخدم مسبقاً)
            if (val.length >= 4 && !/\s/.test(val)) {
                updateReqUI(userReqs.ajax, true); // افتراضياً متاح لتسهيل العرض التجريبي
            } else {
                updateReqUI(userReqs.ajax, false);
            }
        });
    }


    // ==========================================================================
    // 3. فحص وقوة كلمة المرور وعرضها حياً
    // ==========================================================================
    const passwordInput = document.getElementById('reg_password');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strength_text');
    const passReqs = {
        len: document.getElementById('pass_len'),
        upper: document.getElementById('pass_upper'),
        lower: document.getElementById('pass_lower'),
        num: document.getElementById('pass_num'),
        spec: document.getElementById('pass_spec')
    };

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            let score = 0;

            if (val === '') {
                Object.values(passReqs).forEach(el => { if(el) el.className = 'req-item'; });
                if(strengthFill) { strengthFill.className = 'strength-fill'; strengthFill.style.width = '0'; }
                if(strengthText) { strengthText.textContent = 'ضعيفة'; strengthText.style.color = 'var(--error-red)'; }
                return;
            }

            const hasLen = val.length >= 8;
            const hasUpper = /[A-Z]/.test(val);
            const hasLower = /[a-z]/.test(val);
            const hasNum = /[0-9]/.test(val);
            const hasSpec = /[~`!@#$%^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(val);

            updateReqUI(passReqs.len, hasLen);
            updateReqUI(passReqs.upper, hasUpper);
            updateReqUI(passReqs.lower, hasLower);
            updateReqUI(passReqs.num, hasNum);
            updateReqUI(passReqs.spec, hasSpec);

            if (hasLen) score++;
            if (hasUpper) score++;
            if (hasLower) score++;
            if (hasNum) score++;
            if (hasSpec) score++;

            if (score <= 2) {
                strengthFill.className = 'strength-fill weak'; strengthText.textContent = 'ضعيفة'; strengthText.style.color = 'var(--error-red)';
            } else if (score === 3) {
                strengthFill.className = 'strength-fill medium'; strengthText.textContent = 'متوسطة'; strengthText.style.color = '#F59E0B';
            } else if (score === 4) {
                strengthFill.className = 'strength-fill strong'; strengthText.textContent = 'قوية'; strengthText.style.color = '#10B981';
            } else if (score === 5) {
                strengthFill.className = 'strength-fill very-strong'; strengthText.textContent = 'قوية جداً'; strengthText.style.color = 'var(--success-green)';
            }
        });
    }

    function updateReqUI(element, isValid) {
        if (!element) return;
        element.className = isValid ? 'req-item valid' : 'req-item invalid';
    }


    // ==========================================================================
    // 4. ميزة إظهار وإخفاء كلمات المرور (الأصلي والتأكيد)
    // ==========================================================================
    function setupVisibilityToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.addEventListener('click', () => {
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                btn.classList.toggle('active', isPass);
            });
        }
    }
    setupVisibilityToggle('togglePasswordView', 'reg_password');
    setupVisibilityToggle('toggleConfirmPasswordView', 'reg_confirm_password');


    // ==========================================================================
    // 5. المطابقة الحية للبريد وتأكيد كلمة المرور
    // ==========================================================================
    const email = document.getElementById('reg_email');
    const confirmEmail = document.getElementById('reg_confirm_email');
    const emailStatus = document.getElementById('email_match_status');
    const confirmPassword = document.getElementById('reg_confirm_password');
    const passStatus = document.getElementById('pass_match_status');

    function checkLiveMatch(in1, in2, statusEl, okMsg, errMsg) {
        if (!in1 || !in2 || !statusEl) return;
        in2.addEventListener('input', () => {
            if (in2.value === '') { statusEl.textContent = ''; return; }
            if (in1.value === in2.value) {
                statusEl.textContent = okMsg; statusEl.style.color = 'var(--success-green)';
            } else {
                statusEl.textContent = errMsg; statusEl.style.color = 'var(--error-red)';
            }
        });
    }
    checkLiveMatch(email, confirmEmail, emailStatus, '🟢 البريد الإلكتروني متطابق', '🔴 البريد الإلكتروني غير متطابق');
    checkLiveMatch(passwordInput, confirmPassword, passStatus, '🟢 كلمة المرور متطابقة', '🔴 كلمة المرور غير متطابقة');


    // ==========================================================================
    // 6. الهيكلة الديناميكية الذكية للمرحلة الثانية والمرحلة الثالثة
    // ==========================================================================
    const nationalitySelect = document.getElementById('nationality_select');
    const dynamicIdentity = document.getElementById('dynamic_identity_section');
    const dynamicAddress = document.getElementById('dynamic_address_section');

    if (nationalitySelect) {
        nationalitySelect.addEventListener('change', (e) => {
            const nation = e.target.value;
            
            // أ) تحديث واجهة الهوية (المرحلة الثانية)
            if (nation === 'saudi') {
                dynamicIdentity.innerHTML = `
                    <div class="section-divider-title">بيانات الهوية</div>
                    <div class="form-group">
                        <label class="tera-label">رقم الهوية الوطنية</label>
                        <input type="text" name="id_number" class="tera-input-field" maxlength="10" placeholder="1xxxxxxxxxx" required>
                    </div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">تاريخ إصدار الهوية</label><input type="date" name="id_issue" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">تاريخ انتهاء الهوية</label><input type="date" name="id_expiry" class="tera-input-field" required></div>
                    </div>`;
            } else if (nation === 'resident') {
                dynamicIdentity.innerHTML = `
                    <div class="section-divider-title">بيانات الإقامة</div>
                    <div class="form-group">
                        <label class="tera-label">رقم الإقامة</label>
                        <input type="text" name="iqama_number" class="tera-input-field" maxlength="10" placeholder="2xxxxxxxxxx" required>
                    </div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">تاريخ إصدار الإقامة</label><input type="date" name="iqama_issue" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">تاريخ انتهاء الإقامة</label><input type="date" name="iqama_expiry" class="tera-input-field" required></div>
                    </div>`;
            } else if (nation === 'gcc') {
                dynamicIdentity.innerHTML = `
                    <div class="section-divider-title">بيانات مواطن خليجي</div>
                    <div class="form-group">
                        <label class="tera-label">الدولة الخليجية</label>
                        <input type="text" name="gcc_country" class="tera-input-field" placeholder="أدخل اسم الدولة" required>
                    </div>
                    <div class="form-group">
                        <label class="tera-label">رقم الهوية الخليجية</label>
                        <input type="text" name="gcc_id" class="tera-input-field" required>
                    </div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">تاريخ إصدار الهوية</label><input type="date" name="gcc_issue" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">تاريخ انتهاء الهوية</label><input type="date" name="gcc_expiry" class="tera-input-field" required></div>
                    </div>`;
            } else if (nation === 'foreign') {
                dynamicIdentity.innerHTML = `
                    <div class="section-divider-title">بيانات مستثمر أجنبي</div>
                    <div class="form-group">
                        <label class="tera-label">نوع الوثيقة الرسمية</label>
                        <div class="radio-group" style="margin-bottom:15px;">
                            <label class="radio-label"><input type="radio" name="foreign_doc_type" value="national_id" checked> الهوية الوطنية لبلده</label>
                            <label class="radio-label"><input type="radio" name="foreign_doc_type" value="passport"> جواز السفر</label>
                        </div>
                    </div>
                    <div id="foreign_sub_doc_fields"></div>`;
                
                // تشغيل الهيكلة الفرعية للأجنبي تلقائياً عند تغيير نوع وثيقته
                setupForeignSubFields();
            } else {
                dynamicIdentity.innerHTML = '';
            }

            // ب) تحديث واجهة العنوان التلقائي (المرحلة الثالثة)
            if (nation === 'saudi') {
                dynamicAddress.innerHTML = `
                    <div class="section-divider-title">بيانات العنوان الوطني السعودي</div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">رقم المبنى</label><input type="text" name="build_num" class="tera-input-field" placeholder="4 أرقام" required></div>
                        <div class="form-group"><label class="tera-label">الرقم الفرعي</label><input type="text" name="sub_num" class="tera-input-field" placeholder="4 أرقام" required></div>
                    </div>
                    <div class="form-group"><label class="tera-label">اسم الشارع</label><input type="text" name="street" class="tera-input-field" required></div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">الحي</label><input type="text" name="district" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">المدينة</label><input type="text" name="city" class="tera-input-field" required></div>
                    </div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">الرمز البريدي</label><input type="text" name="zip" class="tera-input-field" placeholder="5 أرقام" required></div>
                        <div class="form-group"><label class="tera-label">الرقم الإضافي</label><input type="text" name="additional_num" class="tera-input-field" required></div>
                    </div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">رقم الوحدة (اختياري)</label><input type="text" name="unit" class="tera-input-field"></div>
                        <div class="form-group"><label class="tera-label">الاسم المختصر للعنوان الوطني</label><input type="text" name="short_addr" class="tera-input-field" required></div>
                    </div>`;
            } else {
                dynamicAddress.innerHTML = `
                    <div class="section-divider-title">بيانات العنوان الدولي والإقليمي</div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">الدولة</label><input type="text" name="global_country" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">المدينة</label><input type="text" name="global_city" class="tera-input-field" required></div>
                    </div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">المحافظة / الولاية</label><input type="text" name="global_state" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">الحي</label><input type="text" name="global_district" class="tera-input-field" required></div>
                    </div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">الشارع</label><input type="text" name="global_street" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">الرمز البريدي</label><input type="text" name="global_zip" class="tera-input-field" required></div>
                    </div>
                    <div class="form-group"><label class="tera-label">وصف إضافي للعنوان</label><input type="text" name="global_desc" class="tera-input-field" placeholder="مثال: بالقرب من معالم معينة" required></div>`;
            }
        });
    }

    function setupForeignSubFields() {
        const subContainer = document.getElementById('foreign_sub_doc_fields');
        const radios = document.querySelectorAll('input[name="foreign_doc_type"]');
        
        function renderSub(type) {
            if (type === 'national_id') {
                subContainer.innerHTML = `
                    <div class="form-group"><label class="tera-label">الدولة</label><input type="text" name="f_id_country" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">رقم الهوية</label><input type="text" name="f_id_num" class="tera-input-field" required></div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">تاريخ الإصدار</label><input type="date" name="f_id_issue" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">تاريخ الانتهاء</label><input type="date" name="f_id_expiry" class="tera-input-field" required></div>
                    </div>`;
            } else {
                subContainer.innerHTML = `
                    <div class="form-group"><label class="tera-label">دولة إصدار الجواز</label><input type="text" name="f_pass_country" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">رقم جواز السفر</label><input type="text" name="f_pass_num" class="tera-input-field" required></div>
                    <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">تاريخ إصدار الجواز</label><input type="date" name="f_pass_issue" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">تاريخ انتهاء الجواز</label><input type="date" name="f_pass_expiry" class="tera-input-field" required></div>
                    </div>`;
            }
        }
        
        radios.forEach(r => r.addEventListener('change', (e) => renderSub(e.target.value)));
        renderSub('national_id'); // الافتراضي الأول
    }


    // ==========================================================================
    // 7. التحقق من إقرارات المرحلة الرابعة وتفعيل زر الإنشاء
    // ==========================================================================
    const agreementChecks = document.querySelectorAll('.agreement-check');
    const masterCheck = document.getElementById('master_agreement_check');
    const submitBtn = document.getElementById('submit_register_btn');

    function evaluateSubmitState() {
        if (!submitBtn) return;
        let allChecked = true;
        agreementChecks.forEach(check => { if (!check.checked) allChecked = false; });
        if (masterCheck && !masterCheck.checked) allChecked = false;
        submitBtn.disabled = !allChecked;
    }

    if (masterCheck) {
        masterCheck.addEventListener('change', (e) => {
            agreementChecks.forEach(check => check.checked = e.target.checked);
            evaluateSubmitState();
        });
    }

    agreementChecks.forEach(check => {
        check.addEventListener('change', () => {
            if (masterCheck && !check.checked) masterCheck.checked = false;
            evaluateSubmitState();
        });
    });

    // تشغيل التهيئة والظهور الأولي
    updateStepDisplay();
});
