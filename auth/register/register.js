/**
 * TERA Investor Portal - Registration Engine V2.2 (Strict Fully Closed Version)
 * المسار: /auth/register/register.js
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const steps = Array.from(form.querySelectorAll('.form-step'));
    const stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    let currentStep = 0;

    // ==========================================
    // 🛠️ أولاً: ميزة إظهار وإخفاء كلمة المرور التفاعلية
    // ==========================================
    function setupPasswordToggle(inputFieldId, toggleBtnId) {
        const inputField = document.getElementById(inputFieldId);
        const toggleBtn = document.getElementById(toggleBtnId);
        
        if (!inputField || !toggleBtn) return;
        
        toggleBtn.addEventListener('click', () => {
            if (inputField.type === 'password') {
                inputField.type = 'text';
                toggleBtn.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                `;
            } else {
                inputField.type = 'password';
                toggleBtn.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                `;
            }
        });
    }

    setupPasswordToggle('reg_password', 'togglePasswordView');

    const passwordInput = document.getElementById('reg_password');
    const confirmPasswordInput = document.getElementById('reg_confirm_password');

    // ==========================================
    // 🔍 ثانياً: التحقق الحي من شروط اسم المستخدم
    // ==========================================
    const usernameInput = document.getElementById('reg_username');
    if (usernameInput) {
        updateReq('user_len', false);
        updateReq('user_alpha', false);
        updateReq('user_space', true);
        updateReq('user_spec', true);

        usernameInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length === 0) {
                updateReq('user_len', false);
                updateReq('user_alpha', false);
                updateReq('user_space', true);
                updateReq('user_spec', true);
                return;
            }
            updateReq('user_len', val.length >= 4 && val.length <= 20);
            updateReq('user_alpha', /^[A-Za-z0-9]+$/.test(val));
            updateReq('user_space', !/\s/.test(val));
            updateReq('user_spec', !/[~`@#$%^&*()_\-+={[}\]|\\:;"'<,>.?/]/.test(val));
        });
    }

    // ==========================================
    // 🛡️ ثالثاً: التحقق الحي من قوة كلمة المرور وتطابقها
    // ==========================================
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strength_text');

    if (passwordInput) {
        updateReq('pass_len', false);
        updateReq('pass_upper', false);
        updateReq('pass_lower', false);
        updateReq('pass_num', false);
        updateReq('pass_spec', false);

        passwordInput.addEventListener('input', (e) => {
            const val = e.target.value;
            let score = 0;

            if (val.length >= 8) { updateReq('pass_len', true); score++; } else updateReq('pass_len', false);
            if (/[A-Z]/.test(val)) { updateReq('pass_upper', true); score++; } else updateReq('pass_upper', false);
            if (/[a-z]/.test(val)) { updateReq('pass_lower', true); score++; } else updateReq('pass_lower', false);
            if (/[0-9]/.test(val)) { updateReq('pass_num', true); score++; } else updateReq('pass_num', false);
            if (/[~`@#$%^&*()_\-+={[}\]|\\:;"'<,>.?/]/.test(val)) { updateReq('pass_spec', true); score++; } else updateReq('pass_spec', false);

            if (strengthFill) {
                strengthFill.className = 'strength-fill';
                if (val.length === 0) {
                    strengthFill.style.width = '0%';
                    if (strengthText) strengthText.textContent = 'ضعيفة';
                } else if (score <= 2) {
                    strengthFill.classList.add('weak');
                    if (strengthText) strengthText.textContent = 'ضعيفة';
                } else if (score === 3) {
                    strengthFill.classList.add('medium');
                    if (strengthText) strengthText.textContent = 'متوسطة';
                } else if (score === 4) {
                    strengthFill.classList.add('strong');
                    if (strengthText) strengthText.textContent = 'قوية';
                } else {
                    strengthFill.classList.add('very-strong');
                    if (strengthText) strengthText.textContent = 'قوية جداً';
                }
            }
            checkPasswordsMatch();
        });
    }

    if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', checkPasswordsMatch);

    function checkPasswordsMatch() {
        const pStatus = document.getElementById('pass_match_status');
        if (!pStatus) return;
        if (!confirmPasswordInput.value) { pStatus.textContent = ''; return; }
        if (passwordInput.value === confirmPasswordInput.value) {
            pStatus.innerHTML = '<span style="color: #22C55E;">🟢 كلمة المرور متطابقة</span>';
        } else {
            pStatus.innerHTML = '<span style="color: #EF4444;">🔴 كلمة المرور غير متطابقة</span>';
        }
    }

    const emailInput = document.getElementById('reg_email');
    const confirmEmailInput = document.getElementById('reg_confirm_email');
    if (confirmEmailInput) {
        confirmEmailInput.addEventListener('input', () => {
            const eStatus = document.getElementById('email_match_status');
            if (!eStatus) return;
            if (!confirmEmailInput.value) { eStatus.textContent = ''; return; }
            if (emailInput.value === confirmEmailInput.value) {
                eStatus.innerHTML = '<span style="color: #22C55E;">🟢 البريد الإلكتروني متطابق</span>';
            } else {
                eStatus.innerHTML = '<span style="color: #EF4444;">🔴 البريد الإلكتروني غير متطابق</span>';
            }
        });
    }

    function updateReq(id, isValid) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('valid', isValid);
            const ind = el.querySelector('.indicator');
            if (ind) ind.textContent = isValid ? '🟢' : '🔴';
        }
    }

    // ==========================================
    // 🧱 رابعاً: بناء الحقول الديناميكية (الجنسية والعناوين)
    // ==========================================
    const natSelect = document.getElementById('nationality_select');
    const dynamicIdentity = document.getElementById('dynamic_identity_section');
    const dynamicAddress = document.getElementById('dynamic_address_section');

    if (natSelect) {
        natSelect.addEventListener('change', (e) => {
            const nat = e.target.value;
            renderIdentityFields(nat);
            renderAddressFields(nat);
        });
    }

    function renderIdentityFields(nat) {
        if (!nat) { dynamicIdentity.innerHTML = ''; return; }
        let html = `<div class="identity-sub-card" style="background: rgba(11,25,44,0.02); padding: 20px; border-radius: 12px; margin-top: 15px;">`;
        
        if (nat === 'saudi') {
            html += `<h4>بيانات الهوية الوطنية</h4>
                     <div class="form-group"><label class="tera-label">رقم الهوية الوطنية</label><input type="text" name="id_number" class="tera-input-field" required></div>
                     <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">تاريخ إصدار الهوية</label><input type="date" name="id_issue_date" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">تاريخ انتهاء الهوية</label><input type="date" name="id_expiry_date" class="tera-input-field" required></div>
                     </div>`;
        } else if (nat === 'resident') {
            html += `<h4>بيانات الإقامة</h4>
                     <div class="form-group"><label class="tera-label">رقم الإقامة</label><input type="text" name="resident_number" class="tera-input-field" required></div>
                     <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">تاريخ إصدار الإقامة</label><input type="date" name="resident_issue_date" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">تاريخ انتهاء الإقامة</label><input type="date" name="resident_expiry_date" class="tera-input-field" required></div>
                     </div>`;
        } else if (nat === 'gcc') {
            html += `<h4>بيانات مواطن خليجي</h4>
                     <div class="form-group"><label class="tera-label">الدولة</label><input type="text" name="gcc_country" class="tera-input-field" placeholder="مثال: الإمارات" required></div>
                     <div class="form-group"><label class="tera-label">رقم الهوية الخليجية</label><input type="text" name="gcc_id" class="tera-input-field" required></div>
                     <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">تاريخ الإصدار</label><input type="date" name="gcc_issue_date" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">تاريخ الانتهاء</label><input type="date" name="gcc_expiry_date" class="tera-input-field" required></div>
                     </div>`;
        } else if (nat === 'foreign') {
            html += `<h4>بيانات وثيقة الأجنبي</h4>
                     <div class="form-group">
                        <label class="tera-label">نوع الوثيقة</label>
                        <div class="radio-group">
                            <label class="radio-label"><input type="radio" name="foreign_doc_type" value="national_id" checked> الهوية الوطنية لبلده</label>
                            <label class="radio-label"><input type="radio" name="foreign_doc_type" value="passport"> جواز السفر</label>
                        </div>
                     </div>
                     <div id="foreign_dynamic_wrapper">
                        <div class="form-group"><label class="tera-label">الدولة</label><input type="text" name="foreign_country" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">رقم الهوية</label><input type="text" name="foreign_id" class="tera-input-field" required></div>
                        <div class="form-row-split">
                           <div class="form-group"><label class="tera-label">تاريخ الإصدار</label><input type="date" name="foreign_issue_date" class="tera-input-field" required></div>
                           <div class="form-group"><label class="tera-label">تاريخ الانتهاء</label><input type="date" name="foreign_expiry_date" class="tera-input-field" required></div>
                        </div>
                     </div>`;
        }
        html += `</div>`;
        dynamicIdentity.innerHTML = html;

        if (nat === 'foreign') {
            document.querySelectorAll('input[name="foreign_doc_type"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const wrapper = document.getElementById('foreign_dynamic_wrapper');
                    if (!wrapper) return;
                    if (e.target.value === 'passport') {
                        wrapper.innerHTML = `
                            <div class="form-group"><label class="tera-label">دولة إصدار الجواز</label><input type="text" name="passport_country" class="tera-input-field" required></div>
                            <div class="form-group"><label class="tera-label">رقم جواز السفر</label><input type="text" name="passport_number" class="tera-input-field" required></div>
                            <div class="form-row-split">
                               <div class="form-group"><label class="tera-label">تاريخ إصدار الجواز</label><input type="date" name="passport_issue_date" class="tera-input-field" required></div>
                               <div class="form-group"><label class="tera-label">تاريخ انتهاء الجواز</label><input type="date" name="passport_expiry_date" class="tera-input-field" required></div>
                            </div>`;
                    } else {
                        wrapper.innerHTML = `
                            <div class="form-group"><label class="tera-label">الدولة</label><input type="text" name="foreign_country" class="tera-input-field" required></div>
                            <div class="form-group"><label class="tera-label">رقم الهوية</label><input type="text" name="foreign_id" class="tera-input-field" required></div>
                            <div class="form-row-split">
                               <div class="form-group"><label class="tera-label">تاريخ الإصدار</label><input type="date" name="foreign_issue_date" class="tera-input-field" required></div>
                               <div class="form-group"><label class="tera-label">تاريخ الانتهاء</label><input type="date" name="foreign_expiry_date" class="tera-input-field" required></div>
                            </div>`;
                    }
                });
            });
        }
    }

    function renderAddressFields(nat) {
        if (!nat) { dynamicAddress.innerHTML = ''; return; }
        let html = `<h3 class="step-heading" style="margin-top:25px;">العنوان</h3>`;
        
        if (nat === 'saudi') {
            html += `<h4>بيانات العنوان الوطني</h4>
                     <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">رقم المبنى</label><input type="text" name="address_building" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">الرقم الفرعي</label><input type="text" name="address_sub" class="tera-input-field" required></div>
                     </div>
                     <div class="form-group"><label class="tera-label">اسم الشارع</label><input type="text" name="address_street" class="tera-input-field" required></div>
                     <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">الحي</label><input type="text" name="address_district" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">المدينة</label><input type="text" name="address_city" class="tera-input-field" required></div>
                     </div>
                     <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">الرمز البريدي</label><input type="text" name="address_zip" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">الرقم الإضافي</label><input type="text" name="address_additional" class="tera-input-field" required></div>
                     </div>
                     <div class="form-group"><label class="tera-label">رقم الوحدة (اختياري)</label><input type="text" name="address_unit" class="tera-input-field"></div>
                     <div class="form-group"><label class="tera-label">الاسم المختصر للعنوان الوطني</label><input type="text" name="address_short_name" class="tera-input-field" required></div>`;
        } else {
            html += `<h4>بيانات العنوان الدولي</h4>
                     <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">الدولة</label><input type="text" name="address_global_country" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">المدينة</label><input type="text" name="address_global_city" class="tera-input-field" required></div>
                     </div>
                     <div class="form-group"><label class="tera-label">المحافظة / الولاية</label><input type="text" name="address_global_state" class="tera-input-field" required></div>
                     <div class="form-row-split">
                        <div class="form-group"><label class="tera-label">الحي</label><input type="text" name="address_global_district" class="tera-input-field" required></div>
                        <div class="form-group"><label class="tera-label">الشارع</label><input type="text" name="address_global_street" class="tera-input-field" required></div>
                     </div>
                     <div class="form-group"><label class="tera-label">الرمز البريدي</label><input type="text" name="address_global_zip" class="tera-input-field" required></div>
                     <div class="form-group"><label class="tera-label">وصف إضافي للعنوان</label><textarea name="address_global_desc" class="tera-input-field" style="height: 80px;"></textarea></div>`;
        }
        dynamicAddress.innerHTML = html;
    }

    // ==========================================
    // 🚀 خامساً: منظومة التحقق الذكي والانتقال للخطأ
    // ==========================================
    form.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-next')) {
            if (validateCurrentStep()) {
                currentStep++;
                updateUI();
            }
        } else if (e.target.classList.contains('btn-prev')) {
            currentStep--;
            updateUI();
        }
    });

    function validateCurrentStep() {
        const currentEl = steps[currentStep];
        const requiredFields = currentEl.querySelectorAll('input[required], select[required], textarea[required]');
        let firstInvalidField = null;

        currentEl.querySelectorAll('.tera-input-field').forEach(f => f.classList.remove('error'));

        for (let field of requiredFields) {
            const isCheckbox = field.type === 'checkbox';
            const isInvalid = isCheckbox ? !field.checked : !field.value.trim();

            if (isInvalid) {
                field.classList.add('error');
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            }
        }

        if (currentStep === 0) {
            const user = usernameInput.value;
            const pass = passwordInput.value;

            if (user.length < 4 || /[^A-Za-z0-9]/.test(user)) {
                if (!firstInvalidField) firstInvalidField = usernameInput;
                usernameInput.classList.add('error');
            }
            if (emailInput.value !== confirmEmailInput.value || !confirmEmailInput.value) {
                if (!firstInvalidField) firstInvalidField = confirmEmailInput;
                confirmEmailInput.classList.add('error');
            }
            if (pass !== confirmPasswordInput.value || pass.length < 8) {
                if (!firstInvalidField) firstInvalidField = confirmPasswordInput;
                confirmPasswordInput.classList.add('error');
            }
        }

        if (firstInvalidField) {
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { firstInvalidField.focus(); }, 400);
            
            if (typeof firstInvalidField.reportValidity === 'function') {
                firstInvalidField.reportValidity();
            }
            return false;
        }

        return true;
    }

    function updateUI() {
        steps.forEach((step, idx) => step.classList.toggle('active', idx === currentStep));
        stepNodes.forEach((node, idx) => {
            node.classList.toggle('active', idx === currentStep);
            node.classList.toggle('completed', idx < currentStep);
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // === 6. التحكم بالإقرارات والاتفاقيات ===
    const masterCheck = document.getElementById('master_agreement_check');
    const individualChecks = Array.from(document.querySelectorAll('.agreement-check'));
    const submitBtn = document.getElementById('submit_register_btn');

    if (masterCheck) {
        masterCheck.addEventListener('change', (e) => {
            individualChecks.forEach(ch => ch.checked = e.target.checked);
            if (submitBtn) submitBtn.disabled = !e.target.checked;
        });

        individualChecks.forEach(ch => {
            ch.addEventListener('change', () => {
                const allChecked = individualChecks.every(c => c.checked);
                masterCheck.checked = allChecked;
                if (submitBtn) submitBtn.disabled = !allChecked;
            });
        });
    }

    // === 7. الإرسال النهائي ومعالجة السيرفر ===
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateCurrentStep()) return;
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'جاري معالجة طلبك وحمايته...';
        }

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('فشل تسجيل الطلب، يرجى مراجعة الحقول والتحقق.');
            window.location.href = '/auth/verify-otp.html';
        } catch (err) {
            alert(err.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'إنشاء الحساب';
            }
        }
    });
});
