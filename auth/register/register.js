document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 1. إدارة التنقل بين المراحل وعرضها (Multi-step Form Navigation)
    // ==========================================================================
    const formSteps = document.querySelectorAll('.form-step');
    const stepNodes = document.querySelectorAll('.reg-step-node');
    const nextButtons = document.querySelectorAll('.btn-next');
    const prevButtons = document.querySelectorAll('.btn-prev');
    let currentStep = 0;

    function updateStepDisplay() {
        formSteps.forEach((step, index) => {
            if (index === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        stepNodes.forEach((node, index) => {
            if (index === currentStep) {
                node.classList.add('active');
                node.classList.remove('completed');
            } else if (index < currentStep) {
                node.classList.remove('active');
                node.classList.add('completed');
            } else {
                node.classList.remove('active');
                node.classList.remove('completed');
            }
        });

        const card = document.querySelector('.register-card-wide');
        if (card) card.scrollIntoView({ behavior: 'smooth' });
    }

    nextButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep < formSteps.length - 1) {
                currentStep++;
                updateStepDisplay();
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
    // 2. التحقق الحي من شروط اسم المستخدم (Username Validation)
    // ==========================================================================
    const usernameInput = document.getElementById('reg_username');
    const userReqs = {
        len: document.getElementById('user_len'),
        alpha: document.getElementById('user_alpha'),
        space: document.getElementById('user_space'),
        spec: document.getElementById('user_spec')
    };

    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            const val = usernameInput.value;

            if (val === '') {
                // إعادة تصفير الحالات عند خلو الحقل
                Object.values(userReqs).forEach(el => { if(el) el.className = 'req-item'; });
                return;
            }

            // أ) الطول من 4 إلى 20 حرفاً
            const isLenValid = val.length >= 4 && val.length <= 20;
            updateReqUI(userReqs.len, isLenValid);

            // ب) أحرف إنجليزية وأرقام فقط
            const isAlphaValid = /^[a-zA-Z0-9]*$/.test(val);
            updateReqUI(userReqs.alpha, isAlphaValid);

            // ج) لا يحتوي على مسافات
            const isSpaceValid = !/\s/.test(val);
            updateReqUI(userReqs.space, isSpaceValid);

            // د) لا يحتوي على رموز خاصة
            const isSpecValid = !/[~`!@#$%^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(val);
            updateReqUI(userReqs.spec, isSpecValid);
        });
    }


    // ==========================================================================
    // 3. التحقق الحي ومؤشر قوة كلمة المرور (Password Strength & Requirements)
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
                if (strengthFill) strengthFill.className = 'strength-fill';
                if (strengthFill) strengthFill.style.width = '0';
                if (strengthText) strengthText.textContent = 'ضعيفة';
                return;
            }

            // الفحوصات الفردية لكل شرط شاشة التسجيل
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

            // احتساب الـ Score لتحديد القوة التفاعلية للمؤشر
            if (hasLen) score++;
            if (hasUpper) score++;
            if (hasLower) score++;
            if (hasNum) score++;
            if (hasSpec) score++;

            // تحديث شريط القوة بصرياً بناءً على الألوان المعتمدة بالـ CSS
            if (score <= 2) {
                strengthFill.className = 'strength-fill weak';
                strengthText.textContent = 'ضعيفة';
                strengthText.style.color = 'var(--error-red)';
            } else if (score <= 4) {
                strengthFill.className = 'strength-fill medium';
                strengthText.textContent = 'متوسطة';
                strengthText.style.color = '#F59E0B'; // لون برتقالي للمتوسط
            } else {
                strengthFill.className = 'strength-fill strong';
                strengthText.textContent = 'قوية جداً ومؤمنة';
                strengthText.style.color = 'var(--success-green)';
            }
        });
    }

    // دالة مساعدة لتحديث شكل الدائرة ولون الخط الخاص بالاشتراطات حياً
    function updateReqUI(element, isValid) {
        if (!element) return;
        if (isValid) {
            element.classList.remove('invalid');
            element.classList.add('valid');
        } else {
            element.classList.remove('valid');
            element.classList.add('invalid');
        }
    }


    // ==========================================================================
    // 4. ميزة إظهار وإخفاء كلمة المرور (Show / Hide Password)
    // ==========================================================================
    const togglePasswordView = document.getElementById('togglePasswordView');
    
    if (togglePasswordView && passwordInput) {
        togglePasswordView.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // تغيير حالة الأيقونة بصرياً عبر إضافة كلاس active
            togglePasswordView.classList.toggle('active');
            
            // تحديث الشكل الداخلي للأيقونة (تبديل الرسمة) إذا رغبت
            if (isPassword) {
                // عيون مفتوحة (إخفاء)
                togglePasswordView.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-11C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4z"/>
                    </svg>`;
            } else {
                // عيون عليها خط (إظهار)
                togglePasswordView.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>`;
            }
        });
    }


    // ==========================================================================
    // 5. فحص ومطابقة البريد الإلكتروني وتأكيد كلمة المرور حياً
    // ==========================================================================
    const email = document.getElementById('reg_email');
    const confirmEmail = document.getElementById('reg_confirm_email');
    const emailStatus = document.getElementById('email_match_status');
    const confirmPassword = document.getElementById('reg_confirm_password');
    const passStatus = document.getElementById('pass_match_status');

    function checkMatch(input1, input2, statusElement, matchMessage, mismatchMessage) {
        if (!input1 || !input2 || !statusElement) return;
        if (input2.value === '') {
            statusElement.textContent = '';
            return;
        }
        if (input1.value === input2.value) {
            statusElement.textContent = matchMessage;
            statusElement.style.color = 'var(--success-green)';
        } else {
            statusElement.textContent = mismatchMessage;
            statusElement.style.color = 'var(--error-red)';
        }
    }

    if (confirmEmail) {
        confirmEmail.addEventListener('input', () => {
            checkMatch(email, confirmEmail, emailStatus, '✓ البريد الإلكتروني متطابق', '✕ البريد الإلكتروني غير متطابق');
        });
    }

    if (confirmPassword) {
        confirmPassword.addEventListener('input', () => {
            checkMatch(passwordInput, confirmPassword, passStatus, '✓ كلمة المرور متطابقة', '✕ كلمة المرور غير متطابقة');
        });
    }


    // ==========================================================================
    // 6. إدارة اتفاقيات المرحلة الرابعة وزر الإرسال النهائي
    // ==========================================================================
    const agreementChecks = document.querySelectorAll('.agreement-check');
    const masterCheck = document.getElementById('master_agreement_check');
    const submitBtn = document.getElementById('submit_register_btn');

    function evaluateSubmitState() {
        if (!submitBtn) return;
        let allChecked = true;
        agreementChecks.forEach(check => {
            if (!check.checked) allChecked = false;
        });
        
        if (masterCheck && !masterCheck.checked) allChecked = false;
        submitBtn.disabled = !allChecked;
    }

    if (masterCheck) {
        masterCheck.addEventListener('change', (e) => {
            agreementChecks.forEach(check => {
                check.checked = e.target.checked;
            });
            evaluateSubmitState();
        });
    }

    agreementChecks.forEach(check => {
        check.addEventListener('change', () => {
            if (masterCheck && !check.checked) {
                masterCheck.checked = false;
            }
            evaluateSubmitState();
        });
    });

    // تشغيل الإعداد المبدئي لإخفاء المراحل فور تحميل الملف
    updateStepDisplay();
});
