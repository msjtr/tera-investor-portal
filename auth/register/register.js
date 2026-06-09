document.addEventListener('DOMContentLoaded', () => {
    // === 1. عناصر التنقل بين المراحل ===
    const formSteps = document.querySelectorAll('.form-step');
    const stepNodes = document.querySelectorAll('.reg-step-node');
    const nextButtons = document.querySelectorAll('.btn-next');
    const prevButtons = document.querySelectorAll('.btn-prev');
    let currentStep = 0;

    // دالة التحكم في الحجب والإظهار للمراحل
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

        // سحب الصفحة للأعلى بسلاسة عند كل نقلة مرحلة
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

    // === 2. ميزة إظهار وإخفاء كلمات المرور ===
    const togglePasswordView = document.getElementById('togglePasswordView');
    const regPassword = document.getElementById('reg_password');

    if (togglePasswordView && regPassword) {
        togglePasswordView.addEventListener('click', () => {
            const isPassword = regPassword.type === 'password';
            regPassword.type = isPassword ? 'text' : 'password';
            togglePasswordView.classList.toggle('active', isPassword);
        });
    }

    // === 3. فحص ومطابقة كلمة المرور والبريد حياً ===
    const email = document.getElementById('reg_email');
    const confirmEmail = document.getElementById('reg_confirm_email');
    const emailStatus = document.getElementById('email_match_status');
    const password = document.getElementById('reg_password');
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
            checkMatch(password, confirmPassword, passStatus, '✓ كلمة المرور متطابقة', '✕ كلمة المرور غير متطابق');
        });
    }

    // === 4. إدارة شروط اتفاقيات المرحلة الرابعة وزر الإرسال ===
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

    // تشغيل الإعدادات المبدئية عند التحميل لحظر أي مشاكل تداخل للمراحل
    updateStepDisplay();
});
