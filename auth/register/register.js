document.addEventListener('DOMContentLoaded', function() {
    
    // --- البيانات الأساسية ---
    const gcc = [{ code: 'sa', name: 'السعودية', dial: '+966' }, { code: 'ae', name: 'الإمارات', dial: '+971' }, { code: 'kw', name: 'الكويت', dial: '+965' }, { code: 'bh', name: 'البحرين', dial: '+973' }, { code: 'om', name: 'عمان', dial: '+968' }, { code: 'qa', name: 'قطر', dial: '+974' }];
    const arab = [{ code: 'eg', name: 'مصر', dial: '+20' }, { code: 'jo', name: 'الأردن', dial: '+962' }, { code: 'iq', name: 'العراق', dial: '+964' }, { code: 'lb', name: 'لبنان', dial: '+961' }];

    // --- دوال إظهار كلمة المرور ---
    document.getElementById('showPassword')?.addEventListener('change', e => document.getElementById('password').type = e.target.checked ? 'text' : 'password');
    document.getElementById('showConfirmPassword')?.addEventListener('change', e => document.getElementById('confirmPassword').type = e.target.checked ? 'text' : 'password');

    // --- دوال التحقق اللحظي للواجهة (UI Validation Engine) ---
    function setRule(id, isValid) {
        const li = document.getElementById(id);
        if (!li) return;
        li.className = isValid ? 'valid' : 'invalid';
        li.innerText = (isValid ? '☑ ' : '☒ ') + li.innerText.replace(/☑|☒|☐/g, '').trim();
        return isValid;
    }

    function toggleError(id, show) {
        const el = document.getElementById(id);
        if(el) el.classList.toggle('d-none', !show);
    }

    // 1. التحقق من اسم المستخدم
    document.getElementById('username')?.addEventListener('input', function() {
        const v = this.value.replace(/[^A-Za-z0-9]/g, ''); // منع الرموز
        this.value = v; 
        
        const r1 = setRule('u_len', v.length >= 4 && v.length <= 20);
        const r2 = setRule('u_start', /^[A-Za-z]/.test(v));
        const r3 = setRule('u_nospace', !/\s/.test(v));
        const r4 = setRule('u_nospec', /^[A-Za-z0-9]+$/.test(v));
        
        toggleError('usernameError', v.length > 0 && (!r1 || !r2 || !r3 || !r4));
    });

    // 2. التحقق من البريد الإلكتروني
    function validateEmail() {
        const e = document.getElementById('email').value;
        const c = document.getElementById('confirmEmail').value;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
        
        setRule('e_valid', isEmail);
        setRule('e_match', isEmail && e === c);
        
        toggleError('emailError', c.length > 0 && e !== c);
    }
    document.getElementById('email')?.addEventListener('input', validateEmail);
    document.getElementById('confirmEmail')?.addEventListener('input', validateEmail);

    // 3. التحقق من كلمة المرور ومؤشر القوة
    function validatePassword() {
        const p = document.getElementById('password').value;
        const c = document.getElementById('confirmPassword').value;
        
        setRule('p_len', p.length >= 8);
        setRule('p_upper', /[A-Z]/.test(p));
        setRule('p_lower', /[a-z]/.test(p));
        setRule('p_num', /[0-9]/.test(p));
        setRule('p_spec', /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p));
        setRule('p_match', p.length >= 8 && p === c);

        // مؤشر القوة
        let strength = (p.length >= 8) + /[A-Z]/.test(p) + /[0-9]/.test(p) + /[!@#$%^&*]/.test(p);
        const stText = document.getElementById('passwordStrength');
        if(stText) {
            if(strength <= 1) { stText.innerText = '🔴 ضعيفة'; stText.style.color = '#ef4444'; }
            else if(strength <= 3) { stText.innerText = '🟠 متوسطة'; stText.style.color = '#f59e0b'; }
            else { stText.innerText = '🟢 قوية جداً'; stText.style.color = '#10b981'; }
        }
        toggleError('passError', c.length > 0 && p !== c);
    }
    document.getElementById('password')?.addEventListener('input', validatePassword);
    document.getElementById('confirmPassword')?.addEventListener('input', validatePassword);

    // 4. قيود الأسماء ورقم الجوال
    document.getElementById('fullNameAr')?.addEventListener('input', function() { this.value = this.value.replace(/[^\u0600-\u06FF\s]/g, ''); });
    document.getElementById('fullNameEn')?.addEventListener('input', function() { this.value = this.value.replace(/[^A-Za-z\s]/g, ''); });
    document.getElementById('mobileNumber')?.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, '').replace(/^0+/, ''); });

    // --- ديناميكية القوائم (الدول والفئات) ---
    const cat = document.getElementById('accountCategory');
    const cc = document.getElementById('countryCode');
    
    cat?.addEventListener('change', function() {
        document.querySelectorAll('.identity-wrapper').forEach(w => w.classList.add('d-none'));
        const val = this.value;
        if(val === 'saudi' || val === 'resident') {
            if(val === 'saudi') document.getElementById('saudiFields').classList.remove('d-none');
            else {
                document.getElementById('residentFields').classList.remove('d-none');
                document.getElementById('residentNationality').innerHTML = [...gcc, ...arab].map(c => `<option value="${c.code}">${c.name}</option>`).join('');
            }
            cc.innerHTML = '<option value="+966">السعودية +966</option>';
        } else if (val === 'gcc') {
            document.getElementById('gccFields').classList.remove('d-none');
            cc.innerHTML = gcc.map(c => `<option value="${c.dial}">${c.name} ${c.dial}</option>`).join('');
        } else if (val === 'foreign') {
            document.getElementById('foreignFields').classList.remove('d-none');
            document.getElementById('foreignNationality').innerHTML = arab.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
            cc.innerHTML = arab.map(c => `<option value="${c.dial}">${c.name} ${c.dial}</option>`).join('');
        }
    });

    // --- الإقرار النهائي ---
    document.getElementById('finalAgreement')?.addEventListener('change', function() {
        document.querySelectorAll('.agreement-chk').forEach(c => c.checked = this.checked);
    });

    // --- التنقل الصارم بين المراحل ---
    let currentStep = 0;
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.register-steps .step');
    
    function updateStepsUI() {
        steps.forEach((s, i) => {
            s.classList.toggle('d-none', i !== currentStep);
            s.classList.toggle('active', i === currentStep);
            if(stepIndicators[i]) {
                stepIndicators[i].classList.toggle('active', i === currentStep);
                if(i < currentStep) stepIndicators[i].classList.add('completed');
            }
        });
        document.getElementById('prevBtn').classList.toggle('d-none', currentStep === 0);
        document.getElementById('nextBtn').classList.toggle('d-none', currentStep === steps.length - 1);
        document.getElementById('submitBtn').classList.toggle('d-none', currentStep !== steps.length - 1);
    }

    document.getElementById('nextBtn')?.addEventListener('click', () => {
        let isValid = true;
        
        // التحقق من المرحلة الأولى
        if(currentStep === 0) {
            const invalids = document.querySelectorAll('#step1 .invalid');
            if(invalids.length > 0 || document.getElementById('username').value === '') {
                alert('⚠️ يرجى التأكد من أن جميع الشروط مضاءة باللون الأخضر (☑).');
                isValid = false;
            }
        }
        // التحقق من المرحلة الثانية
        else if(currentStep === 1) {
            if(!document.getElementById('fullNameAr').value || !document.getElementById('accountCategory').value) {
                alert('⚠️ يرجى تعبئة الأسماء واختيار فئة الحساب.');
                isValid = false;
            }
        }
        // التحقق من المرحلة الثالثة
        else if(currentStep === 2) {
            if(document.getElementById('mobileNumber').value.length < 8) {
                alert('⚠️ يرجى إدخال رقم جوال صحيح.');
                isValid = false;
            }
        }

        if(isValid) {
            currentStep++;
            updateStepsUI();
            window.scrollTo(0,0);
        }
    });

    document.getElementById('prevBtn')?.addEventListener('click', () => {
        currentStep--;
        updateStepsUI();
        window.scrollTo(0,0);
    });

    document.getElementById('submitBtn')?.addEventListener('click', () => {
        if(!document.getElementById('finalAgreement').checked) {
            alert('❌ يجب الموافقة على الإقرار النهائي لإنشاء الحساب.');
            return;
        }
        alert('✅ تم إنشاء الحساب بنجاح! جاري تحويلك...');
    });

    // تهيئة مبدئية
    updateStepsUI();
});
