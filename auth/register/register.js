document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. البيانات ---
    const gcc = [{ code: 'sa', name: 'السعودية', dial: '+966' }, { code: 'ae', name: 'الإمارات', dial: '+971' }, { code: 'kw', name: 'الكويت', dial: '+965' }, { code: 'bh', name: 'البحرين', dial: '+973' }, { code: 'om', name: 'عمان', dial: '+968' }, { code: 'qa', name: 'قطر', dial: '+974' }];
    const arab = [{ code: 'eg', name: 'مصر', dial: '+20' }, { code: 'jo', name: 'الأردن', dial: '+962' }, { code: 'iq', name: 'العراق', dial: '+964' }, { code: 'lb', name: 'لبنان', dial: '+961' }, { code: 'ma', name: 'المغرب', dial: '+212' }, { code: 'dz', name: 'الجزائر', dial: '+213' }, { code: 'tn', name: 'تونس', dial: '+216' }];

    // --- 2. فلاتر الإدخال (منع لغات غير مسموحة) ---
    function restrictInput(id, regex) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', function() { this.value = this.value.replace(regex, ''); });
    }
    restrictInput('username', /[^A-Za-z0-9]/g);
    restrictInput('password', /[\u0600-\u06FF]/g);
    restrictInput('fullNameEn', /[^A-Za-z\s]/g);
    restrictInput('fullNameAr', /[^\u0600-\u06FF\s]/g);

    // --- 3. التحقق اللحظي (Condition Boxes) ---
    function updateList(selector, conditions) {
        const items = document.querySelectorAll(selector + ' li');
        conditions.forEach((ok, i) => {
            if (items[i]) {
                items[i].className = ok ? 'valid' : 'invalid';
                items[i].innerHTML = items[i].innerHTML.replace(/☐|☑/g, ok ? '☑' : '☐');
            }
        });
    }

    document.getElementById('username')?.addEventListener('input', (e) => {
        const v = e.target.value;
        updateList('#step1 .validation-box:nth-of-type(1) ul', [v.length >= 4, /^[A-Za-z]/.test(v), /\d/.test(v), !/\s/.test(v), /^[A-Za-z0-9]+$/.test(v), true]);
    });

    // --- 4. منطق القوائم والجنسيات ---
    const cat = document.getElementById('accountCategory');
    const cc = document.getElementById('countryCode');
    const natRes = document.getElementById('residentNationality');
    const natFor = document.getElementById('foreignNationality');

    cat?.addEventListener('change', function() {
        document.querySelectorAll('.identity-wrapper').forEach(w => w.classList.add('d-none'));
        const v = this.value;
        if(v === 'saudi') { document.getElementById('saudiFields').classList.remove('d-none'); cc.innerHTML = '<option value="+966">السعودية +966</option>'; }
        else if(v === 'resident') { 
            document.getElementById('residentFields').classList.remove('d-none'); cc.innerHTML = '<option value="+966">السعودية +966</option>';
            natRes.innerHTML = [...gcc, ...arab].map(c => `<option value="${c.code}">${c.name}</option>`).join('');
        }
        else if(v === 'gcc') { document.getElementById('gccFields').classList.remove('d-none'); cc.innerHTML = gcc.map(c => `<option value="${c.dial}">${c.name} ${c.dial}</option>`).join(''); }
        else if(v === 'foreign') { document.getElementById('foreignFields').classList.remove('d-none'); cc.innerHTML = arab.map(c => `<option value="${c.dial}">${c.name} ${c.dial}</option>`).join(''); natFor.innerHTML = arab.map(c => `<option value="${c.code}">${c.name}</option>`).join(''); }
    });

    // --- 5. التنقل الصارم والتحقق الإجباري ---
    let step = 0;
    const steps = document.querySelectorAll('.form-step');

    document.getElementById('nextBtn')?.addEventListener('click', () => {
        let valid = true;
        if(step === 0 && (document.getElementById('username').value.length < 4 || document.getElementById('password').value.length < 8)) valid = false;
        if(step === 1 && (document.getElementById('fullNameAr').value.trim() === '' || (cat.value === 'resident' && !document.getElementById('residentEmployer').value.trim()))) valid = false;
        if(step === 2 && document.getElementById('mobileNumber').value.replace(/^0+/, '').length < 8) valid = false;
        
        if(valid) { steps[step].classList.remove('active'); step++; steps[step].classList.add('active'); window.scrollTo(0,0); }
        else { alert('يرجى التأكد من استكمال كافة الحقول الإلزامية والشروط!'); }
    });

    // --- 6. وظائف متفرقة (الإقرار النهائي + الجوال) ---
    document.getElementById('finalAgreement')?.addEventListener('change', function() {
        document.querySelectorAll('#step4 input[type="checkbox"]').forEach(c => c.checked = this.checked);
    });

    document.getElementById('mobileNumber')?.addEventListener('input', function() { this.value = this.value.replace(/^0+/, ''); });
    document.getElementById('showPassword')?.addEventListener('change', function() { document.getElementById('password').type = this.checked ? 'text' : 'password'; });
});
