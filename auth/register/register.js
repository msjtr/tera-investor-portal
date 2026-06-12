document.addEventListener('DOMContentLoaded', function() {

    // --- 0. القوائم والبيانات ---
    const gcc = [{ code: 'sa', name: 'السعودية', dial: '+966' }, { code: 'ae', name: 'الإمارات', dial: '+971' }, { code: 'kw', name: 'الكويت', dial: '+965' }, { code: 'bh', name: 'البحرين', dial: '+973' }, { code: 'om', name: 'عمان', dial: '+968' }, { code: 'qa', name: 'قطر', dial: '+974' }];
    const arab = [{ code: 'eg', name: 'مصر', dial: '+20' }, { code: 'jo', name: 'الأردن', dial: '+962' }, { code: 'iq', name: 'العراق', dial: '+964' }, { code: 'lb', name: 'لبنان', dial: '+961' }, { code: 'ma', name: 'المغرب', dial: '+212' }];

    // --- 1. دوال مساعدة للتحقق والواجهة ---
    function setValid(id, isValid) {
        const el = document.getElementById(id);
        if(!el) return false;
        el.className = isValid ? 'valid' : 'invalid';
        el.innerText = (isValid ? '✅ ' : '❌ ') + el.innerText.replace(/✅ |❌ |☐ /g, '').trim();
        return isValid;
    }
    
    function showError(id, isError) {
        document.getElementById(id)?.classList.toggle('d-none', !isError);
    }

    // --- 2. إظهار كلمة المرور ومنع الحروف الخاطئة ---
    document.getElementById('showPassword')?.addEventListener('change', e => document.getElementById('password').type = e.target.checked ? 'text' : 'password');
    document.getElementById('showConfirmPassword')?.addEventListener('change', e => document.getElementById('confirmPassword').type = e.target.checked ? 'text' : 'password');

    function restrict(id, regex) { document.getElementById(id)?.addEventListener('input', function() { this.value = this.value.replace(regex, ''); }); }
    restrict('username', /[^A-Za-z0-9]/g);
    restrict('password', /[\u0600-\u06FF]/g);
    restrict('fullNameEn', /[^A-Za-z\s]/g);
    restrict('fullNameAr', /[^\u0600-\u06FF\s]/g);

    // --- 3. التحقق اللحظي للمرحلة الأولى ---
    document.getElementById('username')?.addEventListener('input', function() {
        const v = this.value;
        const r1 = setValid('v_user_len', v.length >= 4 && v.length <= 20);
        const r2 = setValid('v_user_start', /^[A-Za-z]/.test(v));
        const r3 = setValid('v_user_en', /[A-Za-z]/.test(v));
        const r4 = setValid('v_user_num', true); // الأرقام مسموحة دائماً لأننا نفلتر الباقي
        const r5 = setValid('v_user_space', !/\s/.test(v));
        const r6 = setValid('v_user_spec', /^[A-Za-z0-9]+$/.test(v));
        showError('err_username', v.length > 0 && !(r1 && r2 && r3 && r5 && r6));
    });

    function valEmail() {
        const e = document.getElementById('email').value;
        const c = document.getElementById('confirmEmail').value;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
        setValid('v_email_valid', isEmail);
        setValid('v_email_match', isEmail && e === c && e !== '');
        showError('err_email', e.length > 0 && !isEmail);
        showError('err_email_match', c.length > 0 && e !== c);
    }
    document.getElementById('email')?.addEventListener('input', valEmail);
    document.getElementById('confirmEmail')?.addEventListener('input', valEmail);

    function valPass() {
        const p = document.getElementById('password').value;
        const c = document.getElementById('confirmPassword').value;
        
        setValid('v_pass_len', p.length >= 8);
        setValid('v_pass_up', /[A-Z]/.test(p));
        setValid('v_pass_low', /[a-z]/.test(p));
        setValid('v_pass_num', /[0-9]/.test(p));
        setValid('v_pass_spec', /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p));
        setValid('v_pass_space', !/\s/.test(p));
        setValid('v_pass_match', p.length >= 8 && p === c);

        let strength = (p.length >= 8) + /[A-Z]/.test(p) + /[0-9]/.test(p) + /[!@#$%^&*]/.test(p);
        const stText = document.getElementById('passwordStrength');
        if(stText) {
            if(strength <= 1) { stText.innerHTML = '🔴 ضعيفة'; stText.style.color = '#ef4444'; }
            else if(strength <= 3) { stText.innerHTML = '🟠 متوسطة'; stText.style.color = '#f59e0b'; }
            else if(strength === 4) { stText.innerHTML = '🟢 قوية'; stText.style.color = '#10b981'; }
        }
        showError('err_password', p.length > 0 && strength < 4);
        showError('err_pass_match', c.length > 0 && p !== c);
    }
    document.getElementById('password')?.addEventListener('input', valPass);
    document.getElementById('confirmPassword')?.addEventListener('input', valPass);

    // --- 4. التحقق اللحظي للمرحلة الثانية ---
    function valPersonalInfo() {
        const ar = document.getElementById('fullNameAr').value;
        const en = document.getElementById('fullNameEn').value;
        const gen = document.getElementById('gender').value;
        const cat = document.getElementById('accountCategory').value;
        
        setValid('v_name_ar', ar.length > 3);
        setValid('v_name_en', en.length > 3);
        setValid('v_gender', gen !== '');
        setValid('v_cat', cat !== '');
        
        showError('err_name_ar', ar.length > 0 && ar.length < 3);
        showError('err_name_en', en.length > 0 && en.length < 3);
        showError('err_gender', false); 
        showError('err_cat', false);
    }
    document.getElementById('fullNameAr')?.addEventListener('input', valPersonalInfo);
    document.getElementById('fullNameEn')?.addEventListener('input', valPersonalInfo);
    document.getElementById('gender')?.addEventListener('change', valPersonalInfo);
    document.getElementById('accountCategory')?.addEventListener('change', valPersonalInfo);

    // التعامل مع الفئات وتواريخ الهوية
    const catSelect = document.getElementById('accountCategory');
    const ccSelect = document.getElementById('countryCode');
    
    catSelect?.addEventListener('change', function() {
        document.querySelectorAll('.identity-wrapper').forEach(w => w.classList.add('d-none'));
        const val = this.value;
        if(val === 'saudi') { document.getElementById('saudiFields').classList.remove('d-none'); ccSelect.innerHTML = '<option value="+966">السعودية +966</option>'; }
        else if(val === 'resident') { document.getElementById('residentFields').classList.remove('d-none'); document.getElementById('residentNationality').innerHTML = [...gcc, ...arab].map(c => `<option value="${c.code}">${c.name}</option>`).join(''); ccSelect.innerHTML = '<option value="+966">السعودية +966</option>'; }
        else if(val === 'gcc') { document.getElementById('gccFields').classList.remove('d-none'); ccSelect.innerHTML = gcc.map(c => `<option value="${c.dial}">${c.name} ${c.dial}</option>`).join(''); }
        else if(val === 'foreign') { document.getElementById('foreignFields').classList.remove('d-none'); document.getElementById('foreignNationality').innerHTML = arab.map(c => `<option value="${c.code}">${c.name}</option>`).join(''); ccSelect.innerHTML = arab.map(c => `<option value="${c.dial}">${c.name} ${c.dial}</option>`).join(''); }
        valDoc();
    });

    function valDoc() {
        // نأخذ القيم من الحقول الظاهرة فقط
        const visibleWrapper = document.querySelector('.identity-wrapper:not(.d-none)');
        if(!visibleWrapper) return;
        
        const num = visibleWrapper.querySelector('.doc-number')?.value || '';
        const issue = visibleWrapper.querySelector('.doc-issue')?.value || '';
        const expiry = visibleWrapper.querySelector('.doc-expiry')?.value || '';

        const isNumValid = num.length >= 6;
        const isDatesValid = issue !== '' && expiry !== '' && new Date(issue) < new Date(expiry);
        const isValidDate = expiry !== '' && new Date(expiry) > new Date(); // الوثيقة غير منتهية
        
        setValid('v_doc_num', isNumValid);
        setValid('v_doc_dates', isDatesValid);
        setValid('v_doc_valid', isValidDate);

        showError('err_doc', (expiry !== '' && !isValidDate) || (num !== '' && !isNumValid));
    }
    document.querySelectorAll('.doc-number, .doc-issue, .doc-expiry').forEach(el => el.addEventListener('input', valDoc));

    // --- 5. التحقق اللحظي للمرحلة الثالثة ---
    document.getElementById('mobileNumber')?.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').replace(/^0+/, ''); // حذف الحروف والصفر الأول
        valContact();
    });

    function valContact() {
        const mob = document.getElementById('mobileNumber').value;
        const contact = document.querySelector('input[name="preferredContact"]:checked');
        
        const isMobValid = mob.length >= 8;
        setValid('v_contact', isMobValid && contact !== null);
        
        showError('err_mobile', mob.length > 0 && !isMobValid);
        showError('err_contact_method', !contact && mob.length > 0);

        // تحقق من العنوان (يجب ألا تكون الحقول المطلوبة فارغة)
        const visibleAddress = document.querySelector('.address-wrapper:not(.d-none)');
        let isAddrValid = false;
        if(visibleAddress) {
            const inputs = visibleAddress.querySelectorAll('.addr-field');
            isAddrValid = Array.from(inputs).every(inp => inp.value.trim() !== '');
        }
        setValid('v_address', isAddrValid);
    }
    
    document.querySelectorAll('input[name="preferredContact"]').forEach(el => el.addEventListener('change', valContact));
    document.querySelectorAll('.addr-field').forEach(el => el.addEventListener('input', valContact));
    
    // ربط العنوان بالفئة (الوطني للسعودي/مقيم، والدولي للخليجي/أجنبي)
    catSelect?.addEventListener('change', function() {
        const v = this.value;
        document.getElementById('nationalAddressWrapper').classList.toggle('d-none', v !== 'saudi' && v !== 'resident');
        document.getElementById('internationalAddressWrapper').classList.toggle('d-none', v === 'saudi' || v === 'resident');
    });

    // --- 6. التحقق اللحظي للمرحلة الرابعة ---
    function valAgreements() {
        const allChecked = Array.from(document.querySelectorAll('.agreement-chk')).every(c => c.checked);
        setValid('v_agreements', allChecked);
        showError('err_agreements', !allChecked);
    }
    document.querySelectorAll('.agreement-chk').forEach(c => c.addEventListener('change', valAgreements));
    
    document.getElementById('finalAgreement')?.addEventListener('change', function() {
        document.querySelectorAll('.agreement-chk').forEach(c => c.checked = this.checked);
        valAgreements();
        showError('err_final', !this.checked);
    });

    // --- 7. منطق التنقل بين المراحل ---
    let currentStep = 0;
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.register-steps .step');
    
    function updateStepsUI() {
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
        let valid = true;
        const currentSection = steps[currentStep];
        
        // منع الانتقال إذا كان هناك أي عنصر بـ class invalid أو لم يتم إدخال الحقول
        const invalids = currentSection.querySelectorAll('.invalid');
        if(invalids.length > 0) valid = false;

        if(!valid) {
            alert('⚠️ لا يمكنك الانتقال للمرحلة التالية حتى تتحول جميع المتطلبات إلى اللون الأخضر (✅).');
            return;
        }
        
        currentStep++;
        updateStepsUI();
        window.scrollTo(0,0);
    });

    document.getElementById('prevBtn')?.addEventListener('click', () => {
        currentStep--;
        updateStepsUI();
        window.scrollTo(0,0);
    });

    document.getElementById('submitBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if(!document.getElementById('finalAgreement').checked) {
            showError('err_final', true);
            alert('❌ يجب الموافقة على الإقرار النهائي لإنشاء الحساب.');
            return;
        }
        alert('✅ تم التحقق من كافة البيانات وإنشاء الحساب بنجاح!\nتم إرسال رمز التحقق إلى البريد الإلكتروني.');
    });

    updateStepsUI();
});
