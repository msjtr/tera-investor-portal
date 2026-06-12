document.addEventListener('DOMContentLoaded', function() {

    // --- 1. البيانات الثابتة ---
    const gcc = [{ code: 'sa', name: 'السعودية', dial: '+966' }, { code: 'ae', name: 'الإمارات', dial: '+971' }, { code: 'kw', name: 'الكويت', dial: '+965' }, { code: 'bh', name: 'البحرين', dial: '+973' }, { code: 'om', name: 'عمان', dial: '+968' }, { code: 'qa', name: 'قطر', dial: '+974' }];
    const arab = [{ code: 'eg', name: 'مصر', dial: '+20' }, { code: 'jo', name: 'الأردن', dial: '+962' }, { code: 'iq', name: 'العراق', dial: '+964' }, { code: 'lb', name: 'لبنان', dial: '+961' }, { code: 'ma', name: 'المغرب', dial: '+212' }];

    // --- 2. دوال مساعدة ---
    function setRule(id, isValid) {
        const el = document.getElementById(id);
        if(!el) return false;
        el.className = isValid ? 'valid' : 'invalid';
        el.innerText = (isValid ? '✅ ' : '❌ ') + el.innerText.replace(/✅ |❌ |☐ /g, '').trim();
        return isValid;
    }
    function toggleErr(id, show) { document.getElementById(id)?.classList.toggle('d-none', !show); }

    // فلاتر الكتابة (حسب الكلاسات)
    document.body.addEventListener('input', function(e) {
        if(e.target.classList.contains('num-only')) e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if(e.target.classList.contains('text-only')) e.target.value = e.target.value.replace(/[0-9!@#$%^&*()]/g, '');
    });
    document.getElementById('fullNameAr')?.addEventListener('input', function() { this.value = this.value.replace(/[^\u0600-\u06FF\s]/g, ''); });
    document.getElementById('fullNameEn')?.addEventListener('input', function() { this.value = this.value.replace(/[^A-Za-z\s]/g, ''); });

    // --- 3. المرحلة الأولى: الحساب ---
    document.getElementById('username')?.addEventListener('input', function() {
        this.value = this.value.replace(/[^A-Za-z0-9]/g, ''); // منع الرموز اللحظي
        const v = this.value;
        const r1 = setRule('rule_u_len', v.length >= 4 && v.length <= 20);
        const r2 = setRule('rule_u_start', /^[A-Za-z]/.test(v));
        const r3 = setRule('rule_u_num', true); // مسموح
        const r4 = setRule('rule_u_space', !/\s/.test(v));
        const r5 = setRule('rule_u_spec', /^[A-Za-z0-9]+$/.test(v));
        toggleErr('err_username', v.length > 0 && !(r1&&r2&&r4&&r5));
        valPass();
    });

    function valEmail() {
        const e = document.getElementById('email').value;
        const c = document.getElementById('confirmEmail').value;
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
        setRule('rule_e_valid', valid);
        setRule('rule_e_match', valid && e === c && e !== '');
        toggleErr('err_email', e.length > 0 && !valid);
        toggleErr('err_email_match', c.length > 0 && e !== c);
    }
    document.getElementById('email')?.addEventListener('input', valEmail);
    document.getElementById('confirmEmail')?.addEventListener('input', valEmail);

    function valPass() {
        const p = document.getElementById('password').value;
        const c = document.getElementById('confirmPassword').value;
        setRule('rule_p_len', p.length >= 8);
        setRule('rule_p_up', /[A-Z]/.test(p));
        setRule('rule_p_low', /[a-z]/.test(p));
        setRule('rule_p_num', /[0-9]/.test(p));
        setRule('rule_p_spec', /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p));
        setRule('rule_p_space', p.length > 0 && !/\s/.test(p));
        setRule('rule_p_repeat', p.length > 0 && !/(.)\1{2}/.test(p)); // يمنع 3 متكرر
        setRule('rule_p_match', p.length >= 8 && p === c);

        let str = (p.length>=8) + /[A-Z]/.test(p) + /[0-9]/.test(p) + /[!@#$%^&*]/.test(p);
        const stText = document.getElementById('passwordStrength');
        if(stText) stText.innerHTML = str <= 1 ? '🔴 ضعيفة' : (str <= 3 ? '🟠 متوسطة' : '🟢 قوية');
    }
    document.getElementById('password')?.addEventListener('input', valPass);
    document.getElementById('confirmPassword')?.addEventListener('input', valPass);

    // --- 4. المرحلة الثانية: الهوية ---
    const catSelect = document.getElementById('accountCategory');
    catSelect?.addEventListener('change', function() {
        document.querySelectorAll('.identity-wrapper').forEach(w => w.classList.add('d-none'));
        document.querySelectorAll('.addr-wrapper').forEach(w => w.classList.add('d-none'));
        
        const v = this.value;
        if(v === 'saudi') { document.getElementById('saudiFields').classList.remove('d-none'); document.getElementById('nationalAddress').classList.remove('d-none'); }
        else if(v === 'resident') { document.getElementById('residentFields').classList.remove('d-none'); document.getElementById('nationalAddress').classList.remove('d-none'); document.getElementById('resNat').innerHTML = [...gcc, ...arab].map(c=>`<option value="${c.code}">${c.name}</option>`).join(''); }
        else if(v === 'gcc') { document.getElementById('gccFields').classList.remove('d-none'); document.getElementById('internationalAddress').classList.remove('d-none'); }
        else if(v === 'foreign') { document.getElementById('foreignFields').classList.remove('d-none'); document.getElementById('internationalAddress').classList.remove('d-none'); document.getElementById('forNat').innerHTML = arab.map(c=>`<option value="${c.code}">${c.name}</option>`).join(''); }
        
        // تحديث مفتاح الدولة للتواصل
        document.getElementById('countryCode').innerHTML = (v==='saudi'||v==='resident') ? '<option value="+966">السعودية +966</option>' : [...gcc, ...arab].map(c=>`<option value="${c.dial}">${c.name} ${c.dial}</option>`).join('');
        valDoc();
    });

    function valDoc() {
        const wrap = document.querySelector('.identity-wrapper:not(.d-none)');
        if(!wrap) return;
        const reqFields = Array.from(wrap.querySelectorAll('.req-field'));
        const allFilled = reqFields.length > 0 && reqFields.every(f => f.value.trim() !== '');
        const expDate = wrap.querySelector('.doc-date')?.value;
        const validDate = expDate ? new Date(expDate) > new Date() : false;
        
        setRule('rule_id_fill', allFilled);
        setRule('rule_id_date', validDate);
    }
    document.querySelector('#step1')?.addEventListener('input', valDoc);

    // --- 5. المرحلة الثالثة: التواصل ---
    document.getElementById('mobile')?.addEventListener('input', function() {
        this.value = this.value.replace(/^0+/, ''); // حذف الصفر الأول
        const validMob = this.value.length >= 8;
        setRule('rule_contact_mob', validMob);
        toggleErr('err_mobile', this.value.length > 0 && !validMob);
    });

    document.querySelector('#step2')?.addEventListener('input', function() {
        const addrWrap = document.querySelector('.addr-wrapper:not(.d-none)');
        if(!addrWrap) return;
        const reqAddr = Array.from(addrWrap.querySelectorAll('.req-addr'));
        const addrOk = reqAddr.length > 0 && reqAddr.every(f => f.value.trim() !== '');
        setRule('rule_contact_addr', addrOk);
    });

    // --- 6. المرحلة الرابعة: الإقرارات ---
    function valAgreements() {
        const all = Array.from(document.querySelectorAll('.agreement-chk')).every(c => c.checked);
        setRule('rule_agreements', all);
    }
    document.querySelectorAll('.agreement-chk').forEach(c => c.addEventListener('change', valAgreements));

    // --- 7. التنقل الصارم ---
    let step = 0;
    const steps = document.querySelectorAll('.form-step');
    const stepInd = document.querySelectorAll('.step');

    function updateUI() {
        steps.forEach((s, i) => s.classList.toggle('d-none', i !== step));
        stepInd.forEach((ind, i) => {
            ind.classList.toggle('active', i === step);
            ind.classList.toggle('completed', i < step);
        });
        document.getElementById('prevBtn').classList.toggle('d-none', step === 0);
        document.getElementById('nextBtn').classList.toggle('d-none', step === steps.length - 1);
        document.getElementById('submitBtn').classList.toggle('d-none', step !== steps.length - 1);
    }

    document.getElementById('nextBtn')?.addEventListener('click', () => {
        const currentSec = steps[step];
        
        // 1. تلوين الحقول الإجبارية الفارغة
        let fieldsOk = true;
        currentSec.querySelectorAll('input[required], select[required], .req-field, .req-addr').forEach(f => {
            if(f.offsetParent !== null && f.value.trim() === '') {
                f.classList.add('invalid-field');
                fieldsOk = false;
            } else { f.classList.remove('invalid-field'); }
        });

        // 2. فحص الشروط التي لم تصبح خضراء (علامة الصح ✅)
        const unchecks = currentSec.querySelectorAll('li:not(.valid)');
        
        if(!fieldsOk || unchecks.length > 0) {
            alert('⚠️ يرجى تعبئة الحقول الإلزامية باللون الأحمر والتأكد من تحول كافة الشروط للون الأخضر (✅).');
            return;
        }

        step++;
        updateUI();
    });

    document.getElementById('prevBtn')?.addEventListener('click', () => { step--; updateUI(); });

    document.getElementById('submitBtn')?.addEventListener('click', (e) => {
        if(!document.getElementById('finalAgreement').checked) {
            alert('❌ يجب الموافقة على الإقرار النهائي لإنشاء الحساب.');
            return;
        }
        alert('✅ تم إنشاء حساب الشريك بنجاح! جاري تحويلك...');
    });
});
