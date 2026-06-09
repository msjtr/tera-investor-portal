/**
 * TERA Investor Portal - Registration Engine V2.1 (Enhanced Verification & Password Toggle)
 * المسار: /auth/register/register.js
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const steps = Array.from(form.querySelectorAll('.form-step'));
    const stepNodes = Array.from(document.querySelectorAll('.reg-steps-tracker .reg-step-node'));
    let currentStep = 0;

    // ==========================================
    // 🛠️ أولاً: ميزة إظهار وإخفاء كلمة المرور (عين الرؤية)
    // ==========================================
    function injectPasswordToggle(inputField) {
        if (!inputField) return;
        
        // إنشاء حاوية مرنة للحقل إذا لم تكن موجودة
        const wrapper = document.createElement('div');
        wrapper.className = 'password-toggle-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        
        inputField.parentNode.insertBefore(wrapper, inputField);
        wrapper.appendChild(inputField);
        
        // إنشاء زر العين
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'password-toggle-btn';
        toggleBtn.innerHTML = '👁️'; // أيقونة العين الافتراضية
        toggleBtn.style.cssText = `
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            z-index: 10;
            padding: 4px;
        `;
        
        // ضبط حشو الحقل من اليسار لئلا يغطي النص العين
        inputField.style.paddingLeft = '45px';
        wrapper.appendChild(toggleBtn);
        
        toggleBtn.addEventListener('click', () => {
            if (inputField.type === 'password') {
                inputField.type = 'text';
                toggleBtn.innerHTML = '🔒'; // أيقونة الإخفاء عند الرؤية
            } else {
                inputField.type = 'password';
                toggleBtn.innerHTML = '👁️';
            }
        });
    }

    // تطبيق العين على حقل كلمة المرور وحقل التأكيد
    const passwordInput = document.getElementById('reg_password');
    const confirmPasswordInput = document.getElementById('reg_confirm_password');
    injectPasswordToggle(passwordInput);
    injectPasswordToggle(confirmPasswordInput);


    // ==========================================
    // 🔍 ثانياً: التحقق الحي من شروط اسم المستخدم
    // ==========================================
    const usernameInput = document.getElementById('reg_username');
    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            const val = e.target.value;
            updateReq('user_len', val.length >= 4 && val.length <= 20);
            updateReq('user_alpha', /^[A-Za-z0-9]+$/.test(val) || val.length === 0);
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
                    strengthText.textContent = 'ضعيفة';
                } else if (score <= 2) {
                    strengthFill.classList.add('weak');
                    strengthText.textContent = 'ضعيفة';
                } else if (score === 3) {
                    strengthFill.classList.add('medium');
                    strengthText.textContent = 'متوسطة';
                } else if (score === 4) {
                    strengthFill.classList.add('strong');
                    strengthText.textContent = 'قوية';
                } else {
                    strengthFill.classList.add('very-strong');
                    strengthText.textContent = 'قوية جداً';
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
                    if (e.target.value === 'passport') {
                        wrapper.innerHTML = `
                            <div class="form-group"><label class="tera-label">دولة إصدار الجواز</label><input type="text" name="passport_country" class="tera-input-field" required></div>
                            <div class="form-group"><label class="tera-label">رقم جواز السفر</label><input type="text" name="passport_number" class="tera-input-field" required></div>
                            <div class="form-row-split">
                               <div class="form-group"><label class="tera-label">تاريخ إصدار الجواز</label><input type="date" name="passport_issue_date" class="tera-input-field" required></div>
                               <div class="form-group"><label class="tera-label">تاريخ انتهاء الجواز</label><input type="date" name="passport_expiry_date" class="tera-input-field" required></div>
                            </div>`;
                    } else {
                        renderIdentityFields('foreign');
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
        // جلب جميع الحقول الإلزامية داخل المرحلة الحالية فقط
        const requiredFields = currentEl.querySelectorAll('input[required], select[required], checkbox[required]');
        let firstInvalidField = null;

        // تنظيف الحقول من كلاسات الأخطاء السابقة قبل الفحص الجديد
        currentEl.querySelectorAll('.tera-input-field').forEach(f => f.classList.remove('error'));

        for (let field of requiredFields) {
            // التحقق من الحقول النصية والقوائم المنسدلة والتشيك بوكس
            const isCheckbox = field.type === 'checkbox';
            const isInvalid = isCheckbox ? !field.checked : !field.value.trim();

            if (isInvalid) {
                field.classList.add('error');
                if (!firstInvalidField) {
                    firstInvalidField = field; // تحديد أول حقل ناقص للانتقال إليه
                }
            }
        }

        // قفل أمان إضافي صارم للمرحلة الأولى (
