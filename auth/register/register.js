// أضف هذا الجزء في بداية ملف register.js لضمان ترتيب الحاويات
document.querySelectorAll('.validation-box').forEach(box => {
    box.style.display = 'block'; // تأكد أن الحاوية لا تنكمش
});

// تأكد من أن كل form-step لديه مساحة كافية
document.querySelectorAll('.form-step').forEach(step => {
    step.style.width = '100%';
});


document.addEventListener('DOMContentLoaded', function() {

    const gcc = [{ code: 'sa', name: 'السعودية', dial: '+966' }, { code: 'ae', name: 'الإمارات', dial: '+971' }, { code: 'kw', name: 'الكويت', dial: '+965' }, { code: 'bh', name: 'البحرين', dial: '+973' }, { code: 'om', name: 'عمان', dial: '+968' }, { code: 'qa', name: 'قطر', dial: '+974' }];
    const arab = [{ code: 'eg', name: 'مصر', dial: '+20' }, { code: 'jo', name: 'الأردن', dial: '+962' }, { code: 'iq', name: 'العراق', dial: '+964' }, { code: 'lb', name: 'لبنان', dial: '+961' }, { code: 'ma', name: 'المغرب', dial: '+212' }];

    // --- 1. دوال الواجهة والتحقق ---
    function setRule(id, isValid) {
        const el = document.getElementById(id);
        if(!el) return false;
        el.className = isValid ? 'valid' : 'invalid';
        el.innerText = (isValid ? '✅ ' : '❌ ') + el.innerText.replace(/✅ |❌ |☐ /g, '').trim();
        return isValid;
    }

    function toggleErr(id, show) { document.getElementById(id)?.classList.toggle('d-none', !show); }

    // إظهار كلمة المرور
    document.getElementById('showPassword')?.addEventListener('change', e => document.getElementById('password').type = e.target.checked ? 'text' : 'password');
    document.getElementById('showConfirmPassword')?.addEventListener('change', e => document.getElementById('confirmPassword').type = e.target.checked ? 'text' : 'password');

    // منع اللغات والرموز
    function restrict(id, regex) { document.getElementById(id)?.addEventListener('input', function() { this.value = this.value.replace(regex, ''); }); }
    restrict('username', /[^A-Za-z0-9]/g);
    restrict('password', /[\u0600-\u06FF\s]/g); // يمنع المسافات والعربي
    restrict('fullNameEn', /[^A-Za-z\s]/g);
    restrict('fullNameAr', /[^\u0600-\u06FF\s]/g);

    // قيود العنوان
    document.querySelectorAll('.addr-num').forEach(el => el.addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, ''); valContact(); }));
    document.querySelectorAll('.addr-txt').forEach(el => el.addEventListener('input', function() { this.value = this.value.replace(/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, ''); valContact(); }));
    document.querySelectorAll('.addr-mix').forEach(el => el.addEventListener('input', valContact));

    // --- 2. المرحلة الأولى (الحساب) ---
    document.getElementById('username')?.addEventListener('input', function() {
        const v = this.value;
        const r1 = setRule('v_user_len', v.length >= 4 && v.length <= 20);
        const r2 = setRule('v_user_start', /^[A-Za-z]/.test(v));
        const r3 = setRule('v_user_num', /^[A-Za-z0-9]+$/.test(v)); // يسمح بالأرقام فقط مع الحروف
        const r4 = setRule('v_user_space', v.length > 0 && !/\s/.test(v));
        const r5 = setRule('v_user_spec', v.length > 0 && /^[A-Za-z0-9]+$/.test(v));
        const r6 = setRule('v_user_avail', v.length > 3); // محاكاة: متوفر إذا تجاوز 3 حروف
        
        toggleErr('err_username', v.length > 0 && !(r1&&r2&&r3&&r4&&r5&&r6));
        valPass(); // لإعادة تقييم تشابه الباسورد مع اليوزر
    });

    function valEmail() {
        const e = document.getElementById('email').value;
        const c = document.getElementById('confirmEmail').value;
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
        
        setRule('v_email_valid', isValid);
        setRule('v_email_avail', isValid); // محاكاة: متوفر إذا كان الصيغة صحيحة
        setRule('v_email_match', isValid && e === c && e !== '');
        
        toggleErr('err_email', e.length > 0 && !isValid);
        toggleErr('err_email_match', c.length > 0 && e !== c);
        valPass();
    }
    document.getElementById('email')?.addEventListener('input', valEmail);
    document.getElementById('confirmEmail')?.addEventListener('input', valEmail);

    function valPass() {
        const p = document.getElementById('password').value;
        const c = document.getElementById('confirmPassword').value;
        const u = document.getElementById('username').value.toLowerCase();
        const eName = document.getElementById('email').value.split('@')[0].toLowerCase();
        
        setRule('v_pass_len', p.length >= 8);
        setRule('v_pass_up', /[A-Z]/.test(p));
        setRule('v_pass_low', /[a-z]/.test(p));
        setRule('v_pass_num', /[0-9]/.test(p));
        setRule('v_pass_spec', /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p));
        setRule('v_pass_space', p.length > 0 && !/\s/.test(p));
        setRule('v_pass_user', p.length > 0 && (!u || !p.toLowerCase().includes(u)));
        setRule('v_pass_email', p.length > 0 && (!eName || !p.toLowerCase().includes(eName)));
        setRule('v_pass_repeat', p.length > 0 && !/(.)\1{2}/.test(p)); // يمنع 3 أحرف متتالية
        setRule('v_pass_match', p.length >= 8 && p === c);

        let strength = (p.length>=8) + /[A-Z]/.test(p) + /[0-9]/.test(p) + /[!@#$%^&*]/.test(p);
        const stText = document.getElementById('passwordStrength');
        if(stText) {
            if(strength <= 1) { stText.innerHTML = '🔴 ضعيفة'; stText.style.color = '#ef4444'; }
            else if(strength <= 3) { stText.innerHTML = '🟠 متوسطة'; stText.style.color = '#f59e0b'; }
            else { stText.innerHTML = '🟢 قوية جداً'; stText.style.color = '#10b981'; }
        }
    }
    document.getElementById('password')?.addEventListener('input', valPass);
    document.getElementById('confirmPassword')?.addEventListener('input', valPass);

    // --- 3. المرحلة الثانية (الهوية) ---
    function valPersonal() {
        const ar = document.getElementById('fullNameAr').value;
        const en = document.getElementById('fullNameEn').value;
        setRule('v_name_ar', ar.trim().length > 3 && /^[\u0600-\u06FF\s]+$/.test(ar));
        setRule('v_name_en', en.trim().length > 3 && /^[A-Za-z\s]+$/.test(en));
        setRule('v_gender', document.getElementById('gender').value !== '');
        setRule('v_cat', document.getElementById('accountCategory').value !== '');
    }
    document.querySelectorAll('#fullNameAr, #fullNameEn, #gender, #accountCategory').forEach(el => el?.addEventListener('input', valPersonal));

    const catSel = document.getElementById('accountCategory');
    const ccSel = document.getElementById('countryCode');
    
    catSel?.addEventListener('change', function() {
        document.querySelectorAll('.identity-wrapper').forEach(w => w.classList.add('d-none'));
        document.querySelectorAll('.address-wrapper').forEach(w => w.classList.add('d-none'));
        
        const v = this.value;
        // إظهار حقول الهوية
        if(v === 'saudi') document.getElementById('saudiFields').classList.remove('d-none');
        else if(v === 'resident') { document.getElementById('residentFields').classList.remove('d-none'); document.getElementById('residentNationality').innerHTML = [...gcc, ...arab].map(c => `<option value="${c.code}">${c.name}</option>`).join(''); }
        else if(v === 'gcc') document.getElementById('gccFields').classList.remove('d-none');
        else if(v === 'foreign') { document.getElementById('foreignFields').classList.remove('d-none'); document.getElementById('foreignNationality').innerHTML = arab.map(c => `<option value="${c.code}">${c.name}</option>`).join(''); }

        // إظهار حقول العنوان وتحديث مفتاح الدولة
        if(v === 'saudi' || v === 'resident') {
            document.getElementById('nationalAddressWrapper').classList.remove('d-none');
            ccSel.innerHTML = '<option value="+966">السعودية +966</option>';
        } else {
            document.getElementById('internationalAddressWrapper').classList.remove('d-none');
            ccSel.innerHTML = (v==='gcc'?gcc:arab).map(c => `<option value="${c.dial}">${c.name} ${c.dial}</option>`).join('');
        }
        valDoc(); valContact();
    });

    function valDoc() {
        const wrap = document.querySelector('.identity-wrapper:not(.d-none)');
        if(!wrap) return;
        
        // التحقق أن جميع الحقول الظاهرة ممتلئة
        const fields = Array.from(wrap.querySelectorAll('.doc-field'));
        const allFilled = fields.every(f => f.value.trim() !== '');
        
        const issue = wrap.querySelector('input[id*="Issue"]')?.value || '';
        const expiry = wrap.querySelector('input[id*="Expiry"]')?.value || '';
        
        const datesOk = issue !== '' && expiry !== '' && new Date(issue) < new Date(expiry);
        const validDoc = expiry !== '' && new Date(expiry) > new Date(); // أكبر من تاريخ اليوم
        const isAvail = allFilled; // محاكاة: إذا اكتملت فهي غير مستخدمة

        setRule('v_doc_all', allFilled);
        setRule('v_doc_dates', datesOk);
        setRule('v_doc_valid', validDoc);
        setRule('v_doc_avail', isAvail);
    }
    document.querySelectorAll('.doc-field').forEach(el => el.addEventListener('input', valDoc));

    // --- 4. المرحلة الثالثة (التواصل) ---
    document.getElementById('mobileNumber')?.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').replace(/^0+/, ''); // حذف الحروف والصفر الأول
        valContact();
    });

    function valContact() {
        const mob = document.getElementById('mobileNumber').value;
        const contactsChecked = document.querySelectorAll('.contact-method:checked').length > 0;
        
        setRule('v_contact', mob.length >= 8 && contactsChecked);

        const addrWrap = document.querySelector('.address-wrapper:not(.d-none)');
        let addrOk = false;
        if(addrWrap) {
            const inputs = Array.from(addrWrap.querySelectorAll('.addr-field'));
            addrOk = inputs.every(inp => inp.value.trim() !== ''); // جميع حقول العنوان إجبارية
        }
        setRule('v_address', addrOk);
    }
    document.querySelectorAll('.contact-method').forEach(el => el.addEventListener('change', valContact));

    // --- 5. المرحلة الرابعة (الإقرارات) ---
    function valAgreements() {
        const allChk = Array.from(document.querySelectorAll('.agreement-chk')).every(c => c.checked);
        setRule('v_agreements', allChk);
    }
    document.querySelectorAll('.agreement-chk').forEach(c => c.addEventListener('change', valAgreements));
    
    document.getElementById('finalAgreement')?.addEventListener('change', function() {
        document.querySelectorAll('.agreement-chk').forEach(c => c.checked = this.checked);
        valAgreements();
    });

    // --- 6. التنقل الصارم ---
    let currentStep = 0;
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.register-steps .step');

    function updateUI() {
        steps.forEach((s, i) => s.classList.toggle('d-none', i !== currentStep));
        steps.forEach((s, i) => s.classList.toggle('active', i === currentStep));
        stepIndicators.forEach((ind, i) => {
            ind.classList.toggle('active', i === currentStep);
            if(i < currentStep) ind.classList.add('completed');
            else ind.classList.remove('completed');
        });
        document.getElementById('prevBtn').classList.toggle('d-none', currentStep === 0);
        document.getElementById('nextBtn').classList.toggle('d-none', currentStep === steps.length - 1);
        document.getElementById('submitBtn').classList.toggle('d-none', currentStep !== steps.length - 1);
    }

    document.getElementById('nextBtn')?.addEventListener('click', () => {
        const currentSection = steps[currentStep];
        // التأكد من عدم وجود أي شرط (invalid) في المرحلة الحالية
        const invalids = currentSection.querySelectorAll('.invalid');
        const unchecks = currentSection.querySelectorAll('li:not(.valid)'); // العناصر التي لم تتغير أصلاً
        
        if(invalids.length > 0 || unchecks.length > 0) {
            alert('⚠️ لا يمكنك الانتقال للمرحلة التالية حتى تتحول جميع الشروط والمتطلبات إلى اللون الأخضر (✅).');
            return;
        }
        
        currentStep++;
        updateUI();
        window.scrollTo(0,0);
    });

    document.getElementById('prevBtn')?.addEventListener('click', () => { currentStep--; updateUI(); window.scrollTo(0,0); });

    document.getElementById('submitBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if(!document.getElementById('finalAgreement').checked) {
            alert('❌ يجب الموافقة على الإقرار النهائي لإنشاء الحساب.');
            return;
        }
        alert('✅ تم إنشاء الحساب بنجاح! تم إرسال رمز التحقق إلى البريد الإلكتروني.');
    });

    updateUI();
});
