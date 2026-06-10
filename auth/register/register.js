document.addEventListener('DOMContentLoaded', () => {
    // 1. التنقل بين المراحل
    let currentStep = 0;
    const steps = document.querySelectorAll('.step');
    const trackers = document.querySelectorAll('.step-node');

    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                steps[currentStep].classList.remove('active');
                trackers[currentStep].classList.remove('active');
                currentStep++;
                steps[currentStep].classList.add('active');
                trackers[currentStep].classList.add('active');
                window.scrollTo(0, 0);
            }
        });
    });

    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) {
                steps[currentStep].classList.remove('active');
                trackers[currentStep].classList.remove('active');
                currentStep--;
                steps[currentStep].classList.add('active');
                trackers[currentStep].classList.add('active');
                window.scrollTo(0, 0);
            }
        });
    });

    // 2. دوال التحديث للشروط
    const toggleCondition = (id, isValid) => {
        const el = document.getElementById(id);
        if(isValid) {
            el.innerHTML = el.innerHTML.replace('☐', '☑');
            el.style.color = 'green';
        } else {
            el.innerHTML = el.innerHTML.replace('☑', '☐');
            el.style.color = '#555';
        }
    };

    // التحقق من اسم المستخدم
    document.getElementById('username').addEventListener('input', function() {
        const val = this.value;
        const vLen = val.length >= 4 && val.length <= 20;
        const vAlphaNum = /^[a-zA-Z0-9]+$/.test(val) && val.length > 0;
        const vNoSpace = !/\s/.test(val) && val.length > 0;
        const vNoSpec = !/[^a-zA-Z0-9\s]/.test(val) && val.length > 0;
        // محاكاة (غير مستخدم مسبقاً) ستكون صحيحة دائماً في هذه الواجهة
        const vUnique = val.length > 0;

        toggleCondition('u-len', vLen);
        toggleCondition('u-alphanum', vAlphaNum);
        toggleCondition('u-nospace', vNoSpace);
        toggleCondition('u-nospec', vNoSpec);
        toggleCondition('u-unique', vUnique);

        const statusEl = document.getElementById('user-status');
        if(vLen && vAlphaNum && vNoSpace && vNoSpec && vUnique) {
            statusEl.innerText = '🟢 تم تحقيق الشرط';
            statusEl.style.color = 'green';
        } else {
            statusEl.innerText = '🔴 لم يتم تحقيق الشرط';
            statusEl.style.color = 'red';
        }
    });

    // التحقق من البريد الإلكتروني
    const checkEmailMatch = () => {
        const e1 = document.getElementById('email').value;
        const e2 = document.getElementById('emailConfirm').value;
        const statusEl = document.getElementById('email-match');
        if (e1 && e2 && e1 === e2) {
            statusEl.innerText = '🟢 البريد الإلكتروني متطابق';
            statusEl.style.color = 'green';
        } else {
            statusEl.innerText = '🔴 البريد الإلكتروني غير متطابق';
            statusEl.style.color = 'red';
        }
    };
    document.getElementById('email').addEventListener('input', checkEmailMatch);
    document.getElementById('emailConfirm').addEventListener('input', checkEmailMatch);

    // التحقق من كلمة المرور
    document.getElementById('password').addEventListener('input', function() {
        const val = this.value;
        const vLen = val.length >= 8;
        const vUpper = /[A-Z]/.test(val);
        const vLower = /[a-z]/.test(val);
        const vNum = /[0-9]/.test(val);
        const vSpec = /[!@#$%^&*(),.?":{}|<>]/.test(val);

        toggleCondition('p-len', vLen);
        toggleCondition('p-upper', vUpper);
        toggleCondition('p-lower', vLower);
        toggleCondition('p-num', vNum);
        toggleCondition('p-spec', vSpec);

        let score = vLen + vUpper + vLower + vNum + vSpec;
        const strengthEl = document.getElementById('strength-text');
        if (score <= 2) { strengthEl.innerText = 'ضعيفة'; strengthEl.style.color = 'red'; }
        else if (score === 3) { strengthEl.innerText = 'متوسطة'; strengthEl.style.color = 'orange'; }
        else if (score === 4) { strengthEl.innerText = 'قوية'; strengthEl.style.color = 'blue'; }
        else if (score === 5) { strengthEl.innerText = 'قوية جداً'; strengthEl.style.color = 'green'; }
        
        checkPassMatch();
    });

    const checkPassMatch = () => {
        const p1 = document.getElementById('password').value;
        const p2 = document.getElementById('passwordConfirm').value;
        const statusEl = document.getElementById('pass-match');
        if (p1 && p2 && p1 === p2) {
            statusEl.innerText = '🟢 كلمة المرور متطابقة';
            statusEl.style.color = 'green';
        } else {
            statusEl.innerText = '🔴 كلمة المرور غير متطابقة';
            statusEl.style.color = 'red';
        }
    };
    document.getElementById('passwordConfirm').addEventListener('input', checkPassMatch);

    // 3. الحقول الديناميكية (الهوية والعنوان)
    document.getElementById('nationality').addEventListener('change', function() {
        const idContainer = document.getElementById('identity-dynamic-container');
        const addrContainer = document.getElementById('address-dynamic-container');
        const val = this.value;

        if (val === 'saudi') {
            idContainer.innerHTML = `
                <div class="input-group"><label>رقم الهوية الوطنية</label><input type="text" required></div>
                <div class="row-group">
                    <div class="input-group" style="flex:1;"><label>تاريخ إصدار الهوية</label><input type="date" required></div>
                    <div class="input-group" style="flex:1;"><label>تاريخ انتهاء الهوية</label><input type="date" required></div>
                </div>`;
            addrContainer.innerHTML = `
                <div class="section-title">بيانات العنوان الوطني</div>
                <div class="row-group">
                    <div class="input-group" style="flex:1;"><label>الرقم المبنى</label><input type="text" required></div>
                    <div class="input-group" style="flex:1;"><label>الرقم الفرعي</label><input type="text"></div>
                </div>
                <div class="row-group">
                    <div class="input-group" style="flex:1;"><label>اسم الشارع</label><input type="text" required></div>
                    <div class="input-group" style="flex:1;"><label>الحي</label><input type="text" required></div>
                </div>
                <div class="row-group">
                    <div class="input-group" style="flex:1;"><label>المدينة</label><input type="text" required></div>
                    <div class="input-group" style="flex:1;"><label>الرمز البريدي</label><input type="text" required></div>
                </div>
                <div class="row-group">
                    <div class="input-group" style="flex:1;"><label>الرقم الإضافي</label><input type="text"></div>
                    <div class="input-group" style="flex:1;"><label>رقم الوحدة (اختياري)</label><input type="text"></div>
                </div>
                <div class="input-group"><label>الاسم المختصر للعنوان الوطني</label><input type="text"></div>`;
        } 
        else if (val === 'resident') {
            idContainer.innerHTML = `
                <div class="input-group"><label>رقم الإقامة</label><input type="text" required></div>
                <div class="row-group">
                    <div class="input-group" style="flex:1;"><label>تاريخ إصدار الإقامة</label><input type="date" required></div>
                    <div class="input-group" style="flex:1;"><label>تاريخ انتهاء الإقامة</label><input type="date" required></div>
                </div>`;
            generateForeignAddress(addrContainer);
        }
        else if (val === 'gcc') {
            idContainer.innerHTML = `
                <div class="input-group"><label>الدولة</label><input type="text" required></div>
                <div class="input-group"><label>رقم الهوية الخليجية</label><input type="text" required></div>
                <div class="row-group">
                    <div class="input-group" style="flex:1;"><label>تاريخ إصدار الهوية</label><input type="date" required></div>
                    <div class="input-group" style="flex:1;"><label>تاريخ انتهاء الهوية</label><input type="date" required></div>
                </div>`;
            generateForeignAddress(addrContainer);
        }
        else if (val === 'foreign') {
            idContainer.innerHTML = `
                <div class="input-group">
                    <label>نوع الوثيقة</label>
                    <div class="radio-group">
                        <label><input type="radio" name="docType" value="id" required> الهوية الوطنية لبلده</label>
                        <label><input type="radio" name="docType" value="passport"> جواز السفر</label>
                    </div>
                </div>
                <div id="foreign-doc-details"></div>`;
            
            generateForeignAddress(addrContainer);

            document.querySelectorAll('input[name="docType"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    const docDetails = document.getElementById('foreign-doc-details');
                    if (this.value === 'id') {
                        docDetails.innerHTML = `
                            <div class="input-group"><label>الدولة</label><input type="text" required></div>
                            <div class="input-group"><label>رقم الهوية</label><input type="text" required></div>
                            <div class="row-group">
                                <div class="input-group" style="flex:1;"><label>تاريخ الإصدار</label><input type="date" required></div>
                                <div class="input-group" style="flex:1;"><label>تاريخ الانتهاء</label><input type="date" required></div>
                            </div>`;
                    } else {
                        docDetails.innerHTML = `
                            <div class="input-group"><label>دولة الإصدار</label><input type="text" required></div>
                            <div class="input-group"><label>رقم جواز السفر</label><input type="text" required></div>
                            <div class="row-group">
                                <div class="input-group" style="flex:1;"><label>تاريخ إصدار الجواز</label><input type="date" required></div>
                                <div class="input-group" style="flex:1;"><label>تاريخ انتهاء الجواز</label><input type="date" required></div>
                            </div>`;
                    }
                });
            });
        } else {
            idContainer.innerHTML = '';
            addrContainer.innerHTML = '';
        }
    });

    function generateForeignAddress(container) {
        container.innerHTML = `
            <div class="row-group">
                <div class="input-group" style="flex:1;"><label>الدولة</label><input type="text" required></div>
                <div class="input-group" style="flex:1;"><label>المدينة</label><input type="text" required></div>
            </div>
            <div class="row-group">
                <div class="input-group" style="flex:1;"><label>المحافظة / الولاية</label><input type="text" required></div>
                <div class="input-group" style="flex:1;"><label>الحي</label><input type="text" required></div>
            </div>
            <div class="row-group">
                <div class="input-group" style="flex:1;"><label>الشارع</label><input type="text" required></div>
                <div class="input-group" style="flex:1;"><label>الرمز البريدي</label><input type="text" required></div>
            </div>
            <div class="input-group"><label>وصف إضافي للعنوان</label><input type="text"></div>`;
    }

    // 4. الإقرارات النهائية والتسليم
    document.getElementById('chkAll').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.agreements input[type="checkbox"]:not(#chkAll)');
        checkboxes.forEach(chk => chk.checked = this.checked);
    });

    document.getElementById('regForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // التسلسل المطلوب أسفل الصفحة
        alert("يتم إنشاء الحساب...\nسيتم إرسال رمز تحقق إلى البريد الإلكتروني المسجل.");
        
        const otp = prompt("يرجى إدخال رمز التحقق (OTP):");
        
        if (otp) {
            alert("تم تفعيل الحساب بنجاح!\n\nسيتم تحويلك إلى صفحة استكمال الملف الشخصي لاستكمال:\n- الحساب البنكي.\n- رقم الآيبان.\n- رفع مستندات الهوية/الإقامة/الجواز.\n- المستندات الإضافية المطلوبة.");
            // التوجيه إلى صفحة استكمال الملف الشخصي
            window.location.href = "../complete-profile.html";
        }
    });
});
