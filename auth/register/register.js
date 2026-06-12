document.addEventListener('DOMContentLoaded', function() {
    
    // --- 0. تهيئة عامة ---
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.register-steps .step');
    let currentStep = 0;

    // دالة لتحديث حالة الشروط (UI)
    function setRule(id, isValid) {
        const el = document.getElementById(id);
        if(!el) return false;
        el.className = isValid ? 'valid' : 'invalid';
        let text = el.innerText.replace(/✅ |❌ |☐ /g, '').trim();
        el.innerText = (isValid ? '✅ ' : '❌ ') + text;
        return isValid;
    }

    // دالة إظهار/إخفاء رسائل الخطأ
    function toggleErr(id, show) {
        document.getElementById(id)?.classList.toggle('d-none', !show);
    }

    // --- 1. التحقق من المرحلة الأولى ---
    document.getElementById('username')?.addEventListener('input', function() {
        const v = this.value;
        const r1 = setRule('v_user_len', v.length >= 4 && v.length <= 20);
        const r2 = setRule('v_user_start', /^[A-Za-z]/.test(v));
        const r3 = setRule('v_user_num', /[0-9]/.test(v));
        const r4 = setRule('v_user_space', !/\s/.test(v));
        const r5 = setRule('v_user_spec', /^[A-Za-z0-9]+$/.test(v));
        setRule('v_user_avail', v.length > 3); 
        toggleErr('err_username', v.length > 0 && !(r1&&r2&&r3&&r4&&r5));
    });

    // كلمة المرور ومؤشر القوة
    document.getElementById('password')?.addEventListener('input', function() {
        const p = this.value;
        const c = document.getElementById('confirmPassword').value;
        setRule('v_pass_len', p.length >= 8);
        setRule('v_pass_up', /[A-Z]/.test(p));
        setRule('v_pass_low', /[a-z]/.test(p));
        setRule('v_pass_num', /[0-9]/.test(p));
        setRule('v_pass_spec', /[!@#$%^&*]/.test(p));
        setRule('v_pass_space', !/\s/.test(p));
        setRule('v_pass_match', p.length >= 8 && p === c);
        
        // القوة
        let str = (p.length>=8) + /[A-Z]/.test(p) + /[0-9]/.test(p) + /[!@#$%^&*]/.test(p);
        const st = document.getElementById('passwordStrength');
        if(st) st.innerHTML = str <= 1 ? '🔴 ضعيفة' : (str <= 3 ? '🟠 متوسطة' : '🟢 قوية');
    });

    // --- 2. المرحلة الثانية (الهوية والوثائق) ---
    const cat = document.getElementById('accountCategory');
    cat?.addEventListener('change', function() {
        document.querySelectorAll('.identity-wrapper').forEach(w => w.classList.add('d-none'));
        document.querySelectorAll('.address-wrapper').forEach(w => w.classList.add('d-none'));
        const v = this.value;
        if(v === 'saudi') { document.getElementById('saudiFields').classList.remove('d-none'); document.getElementById('nationalAddressWrapper').classList.remove('d-none'); }
        else if(v === 'resident') { document.getElementById('residentFields').classList.remove('d-none'); document.getElementById('nationalAddressWrapper').classList.remove('d-none'); }
        else if(v === 'gcc' || v === 'foreign') { document.getElementById(v === 'gcc' ? 'gccFields' : 'foreignFields').classList.remove('d-none'); document.getElementById('internationalAddressWrapper').classList.remove('d-none'); }
    });

    // --- 3. التنقل الصارم ---
    document.getElementById('nextBtn')?.addEventListener('click', () => {
        // التحقق من الحقول الإجبارية (التي تحمل كلاسات doc-field أو addr-field)
        const currentSection = steps[currentStep];
        const required = currentSection.querySelectorAll('.doc-field, .addr-field, input[required], select[required]');
        let fieldsOk = true;
        
        required.forEach(f => {
            if(f.offsetParent !== null && f.value.trim() === '') {
                f.style.borderColor = 'var(--error)';
                fieldsOk = false;
            } else {
                f.style.borderColor = 'var(--border-color)';
            }
        });

        const invalids = currentSection.querySelectorAll('.invalid');
        if(invalids.length > 0 || !fieldsOk) {
            alert('⚠️ يرجى تصحيح الأخطاء (باللون الأحمر) وتعبئة الحقول المطلوبة أولاً.');
            return;
        }

        if(currentStep < steps.length - 1) {
            steps[currentStep].classList.remove('active');
            currentStep++;
            steps[currentStep].classList.add('active');
            window.scrollTo(0, 0);
        }
    });

    document.getElementById('prevBtn')?.addEventListener('click', () => {
        if(currentStep > 0) {
            steps[currentStep].classList.remove('active');
            currentStep--;
            steps[currentStep].classList.add('active');
        }
    });

    // --- 4. الإقرار النهائي ---
    document.getElementById('finalAgreement')?.addEventListener('change', function() {
        document.querySelectorAll('.agreement-chk').forEach(c => c.checked = this.checked);
    });

    document.getElementById('submitBtn')?.addEventListener('click', (e) => {
        if(!document.getElementById('finalAgreement').checked) {
            alert('❌ يجب الموافقة على الإقرار النهائي.');
            return;
        }
        alert('✅ تم إنشاء الحساب بنجاح!');
    });
});
