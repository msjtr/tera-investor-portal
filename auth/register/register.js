document.addEventListener('DOMContentLoaded', function() {
    
    // ==================================================
    // 1. البيانات والإعدادات
    // ==================================================
    const gcc = [{ code: 'sa', name: 'السعودية', dial: '+966' }, { code: 'ae', name: 'الإمارات', dial: '+971' }, { code: 'kw', name: 'الكويت', dial: '+965' }, { code: 'bh', name: 'البحرين', dial: '+973' }, { code: 'om', name: 'عمان', dial: '+968' }, { code: 'qa', name: 'قطر', dial: '+974' }];
    const arab = [{ code: 'eg', name: 'مصر', dial: '+20' }, { code: 'jo', name: 'الأردن', dial: '+962' }, { code: 'iq', name: 'العراق', dial: '+964' }, { code: 'lb', name: 'لبنان', dial: '+961' }, { code: 'ma', name: 'المغرب', dial: '+212' }];

    // ==================================================
    // 2. دوال مساعدة (فلاتر الإدخال وإظهار كلمة المرور)
    // ==================================================
    function restrictInput(id, regex) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', function() { this.value = this.value.replace(regex, ''); });
    }

    // منع الكتابة بالعربي في الإنجليزي والعكس
    restrictInput('username', /[^A-Za-z0-9]/g);
    restrictInput('password', /[\u0600-\u06FF]/g);
    restrictInput('confirmPassword', /[\u0600-\u06FF]/g);
    restrictInput('fullNameEn', /[^A-Za-z\s]/g);
    restrictInput('fullNameAr', /[^\u0600-\u06FF\s]/g);

    // إظهار كلمة المرور
    document.getElementById('showPassword')?.addEventListener('change', function() { document.getElementById('password').type = this.checked ? 'text' : 'password'; });
    document.getElementById('showConfirmPassword')?.addEventListener('change', function() { document.getElementById('confirmPassword').type = this.checked ? 'text' : 'password'; });

    // ==================================================
    // 3. التحقق اللحظي من الشروط (Validation Checklist)
    // ==================================================
    function updateConditions(listId, conditions) {
        const items = document.querySelectorAll(listId + ' li');
        conditions.forEach((isValid, i) => {
            if (items[i]) {
                items[i].classList.toggle('valid', isValid);
                items[i].classList.toggle('invalid', !isValid);
                let txt = items[i].innerText.replace('☐', '').replace('☑', '').trim();
                items[i].innerText = (isValid ? '☑ ' : '☐ ') + txt;
            }
        });
    }

    // شرط اسم المستخدم
    document.getElementById('username')?.addEventListener('input', function() {
        const v = this.value;
        updateConditions('#step1 .validation-box:nth-of-type(1) ul', [v.length >= 4, /^[A-Za-z]/.test(v), /\d/.test(v), !/\s/.test(v), true, true]);
    });

    // شرط كلمة المرور
    document.getElementById('password')?.addEventListener('input', function() {
        const v = this.value;
        updateConditions('#step1 .validation-box:nth-of-type(3) ul', [v.length >= 8, /[A-Z]/.test(v), /[a-z]/.test(v), /[0-9]/.test(v), /[!@#$%^&*]/.test(v)]);
    });

    // ==================================================
    // 4. منطق القوائم الديناميكية
    // ==================================================
    const cat = document.getElementById('accountCategory');
    const cc = document.getElementById('countryCode');

    cat?.addEventListener('change', function() {
        document.querySelectorAll('.identity-wrapper').forEach(w => w.classList.add('d-none'));
        const v = this.value;
        if(v === 'saudi') { document.getElementById('saudiFields').classList.remove('d-none'); cc.innerHTML = '<option value="+966">السعودية +966</option>'; }
        else if(v === 'resident') { document.getElementById('residentFields').classList.remove('d-none'); cc.innerHTML = '<option value="+966">السعودية +966</option>'; }
        else if(v === 'gcc') { document.getElementById('gccFields').classList.remove('d-none'); cc.innerHTML = gcc.map(c => `<option value="${c.dial}">${c.name} ${c.dial}</option>`).join(''); }
        else if(v === 'foreign') { document.getElementById('foreignFields').classList.remove('d-none'); cc.innerHTML = arab.map(c => `<option value="${c.dial}">${c.name} ${c.dial}</option>`).join(''); }
    });

    // ==================================================
    // 5. التنقل والتحقق النهائي
    // ==================================================
    let currentStep = 0;
    const steps = document.querySelectorAll('.form-step');

    function validateStep(s) {
        if(s === 0) return document.getElementById('username').value.length >= 4 && document.getElementById('password').value.length >= 8 && document.getElementById('email').value.includes('@');
        if(s === 1) return document.getElementById('fullNameAr').value.trim() !== '' && (cat.value !== 'resident' || document.getElementById('residentEmployer').value.trim() !== '');
        if(s === 2) return document.getElementById('mobileNumber').value.replace(/^0+/, '').length >= 8;
        if(s === 3) return document.getElementById('finalAgreement').checked;
        return true;
    }

    document.getElementById('nextBtn')?.addEventListener('click', () => {
        if(validateStep(currentStep)) {
            steps[currentStep].classList.remove('active');
            currentStep++;
            steps[currentStep].classList.add('active');
            window.scrollTo(0, 0);
        } else { alert('يرجى التأكد من تعبئة جميع الحقول المطلوبة وشروط التحقق!'); }
    });

    // الإقرار النهائي
    document.getElementById('finalAgreement')?.addEventListener('change', function() {
        document.querySelectorAll('#step4 input[type="checkbox"]').forEach(cb => cb.checked = this.checked);
    });

    // حذف الصفر من الجوال لحظياً
    document.getElementById('mobileNumber')?.addEventListener('input', function() {
        this.value = this.value.replace(/^0+/, '');
    });
});
