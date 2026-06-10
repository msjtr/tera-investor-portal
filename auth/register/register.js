document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. إدارة التنقل بين المراحل مع التحقق (UX)
    // ==========================================
    let currentStep = 0;
    const steps = document.querySelectorAll('.step');
    const trackers = document.querySelectorAll('.step-node');

    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', () => {
            // التحقق من صحة حقول المرحلة الحالية قبل الانتقال لمنع التجاوز
            const currentInputs = steps[currentStep].querySelectorAll('input, select, textarea');
            let isStepValid = true;

            currentInputs.forEach(input => {
                if (!input.checkValidity()) {
                    input.reportValidity(); // إظهار تلميح المتصفح الافتراضي للخطأ
                    isStepValid = false;
                }
            });

            if (!isStepValid) return; // إيقاف الانتقال إذا لم تكتمل البيانات

            if (currentStep < steps.length - 1) {
                steps[currentStep].classList.remove('active');
                trackers[currentStep].classList.remove('active');
                currentStep++;
                steps[currentStep].classList.add('active');
                trackers[currentStep].classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
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
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    // ==========================================
    // 2. دوال فحص شروط المدخلات وقوتها
    // ==========================================
    const toggleCondition = (id, isValid) => {
        const el = document.getElementById(id);
        if (!el) return;
        
        if (isValid) {
            el.innerHTML = el.innerHTML.replace('☐', '☑');
            el.style.color = '#008080'; // النيلي الخاص بالهوية البصرية للمؤشرات الصحيحة
            el.style.fontWeight = '600';
        } else {
            el.innerHTML = el.innerHTML.replace('☑', '☐');
            el.style.color = '#64748b';
            el.style.fontWeight = 'normal';
        }
    };

    // التحقق من اسم المستخدم
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('input', function() {
            const val = this.value;
            const vLen = val.length >= 4 && val.length <= 20;
            const vAlphaNum = /^[a-zA-Z0-9]+$/.test(val);
            const vNoSpace = !/\s/.test(val) && val.length > 0;
            const vNoSpec = !/[^a-zA-Z0-9]/.test(val) && val.length > 0;
            const vUnique = val.length > 0; 

            toggleCondition('u-len', vLen);
            toggleCondition('u-alphanum', vAlphaNum);
            toggleCondition('u-nospace', vNoSpace);
            toggleCondition('u-nospec', vNoSpec);
            toggleCondition('u-unique', vUnique);

            const statusEl = document.getElementById('user-status');
            if (statusEl) {
                if (vLen && vAlphaNum && vNoSpace && vNoSpec && vUnique) {
                    statusEl.innerText = '🟢 اسم المستخدم متاح ومطابق للشروط';
                    statusEl.style.color = 'green';
                } else {
                    statusEl.innerText = '🔴 لم يتم تحقيق بعض الشروط أعلاه';
                    statusEl.style.color = 'red';
                }
            }
        });
    }

    // التحقق من تطابق البريد الإلكتروني
    const emailInput = document.getElementById('email');
    const emailConfirmInput = document.getElementById('emailConfirm');
    
    const checkEmailMatch = () => {
        if (!emailInput || !emailConfirmInput) return;
        const e1 = emailInput.value;
        const e2 = emailConfirmInput.value;
        const statusEl = document.getElementById('email-match');
        
        if (!statusEl) return;
        if (e1 && e2) {
            if (e1 === e2) {
                statusEl.innerText = '🟢 البريد الإلكتروني متطابق';
                statusEl.style.color = 'green';
            } else {
                statusEl.innerText = '🔴 البريد الإلكتروني غير متطابق';
                statusEl.style.color = 'red';
            }
        } else {
            statusEl.innerText = '';
        }
    };
    if (emailInput) emailInput.addEventListener('input', checkEmailMatch);
    if (emailConfirmInput) emailConfirmInput.addEventListener('input', checkEmailMatch);

    // التحقق من كلمة المرور وقوتها
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('passwordConfirm');

    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
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
            
            if (strengthEl) {
                if (val.length === 0) { strengthEl.innerText = ''; }
                else if (score <= 2) { strengthEl.innerText = 'ضعيفة'; strengthEl.style.color = 'red'; }
                else if (score === 3) { strengthEl.innerText = 'متوسطة'; strengthEl.style.color = 'orange'; }
                else if (score === 4) { strengthEl.innerText = 'قوية'; strengthEl.style.color = '#2A52BE'; }
                else if (score === 5) { strengthEl.innerText = 'قوية جداً'; strengthEl.style.color = 'green'; }
            }
            
            checkPassMatch();
        });
    }

    const checkPassMatch = () => {
        if (!passwordInput || !passwordConfirmInput) return;
        const p1 = passwordInput.value;
        const p2 = passwordConfirmInput.value;
        const statusEl = document.getElementById('pass-match');
        
        if (!statusEl) return;
        if (p1 && p2) {
            if (p1 === p2) {
                statusEl.innerText = '🟢 كلمة المرور متطابقة';
                statusEl.style.color = 'green';
            } else {
                statusEl.innerText = '🔴 كلمة المرور غير متطابقة';
                statusEl.style.color = 'red';
            }
        } else {
            statusEl.innerText = '';
        }
    };
    if (passwordConfirmInput) passwordConfirmInput.addEventListener('input', checkPassMatch);

    // ==========================================
    // 3. إدارة الحقول الديناميكية (الهوية والعنوان)
    // ==========================================
    const nationalitySelect = document.getElementById('nationality');
    
    if (nationalitySelect) {
        nationalitySelect.addEventListener('change', function() {
            const idContainer = document.getElementById('identity-dynamic-container');
            const addrContainer = document.getElementById('address-dynamic-container');
            const val = this.value;

            if (!idContainer || !addrContainer) return;

            if (val === 'saudi') {
                idContainer.innerHTML = `
                    <div class="input-group"><label>رقم الهوية الوطنية</label><input type="text" pattern="[0-9]{10}" title="الهوية الوطنية يجب أن تتكون من 10 أرقام" required></div>
                    <div class="row-group">
                        <div class="input-group" style="flex:1;"><label>تاريخ إصدار الهوية</label><input type="date" required></div>
                        <div class="input-group" style="flex:1;"><label>تاريخ انتهاء الهوية</label><input type="date" required></div>
                    </div>`;
                addrContainer.innerHTML = `
                    <div class="section-title">بيانات العنوان الوطني (السعودية)</div>
                    <div class="row-group">
                        <div class="input-group" style="flex:1;"><label>رقم المبنى</label><input type="text" pattern="[0-9]+" required></div>
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
                    <div class="input-group"><label>رقم الإقامة</label><input type="text" pattern="[0-9]{10}" title="رقم الإقامة يجب أن يتكون من 10 أرقام" required></div>
                    <div class="row-group">
                        <div class="input-group" style="flex:1;"><label>تاريخ إصدار الإقامة</label><input type="date" required></div>
                        <div class="input-group" style="flex:1;"><label>تاريخ انتهاء الإقامة</label><input type="date" required></div>
                    </div>`;
                generateForeignAddress(addrContainer, "عنوان الإقامة داخل المملكة");
            }
            else if (val === 'gcc') {
                idContainer.innerHTML = `
                    <div class="input-group"><label>دولة مجلس التعاون</label><input type="text" required></div>
                    <div class="input-group"><label>رقم الهوية الخليجية</label><input type="text" required></div>
                    <div class="row-group">
                        <div class="input-group" style="flex:1;"><label>تاريخ إصدار الهوية</label><input type="date" required></div>
                        <div class="input-group" style="flex:1;"><label>تاريخ انتهاء الهوية</label><input type="date" required></div>
                    </div>`;
                generateForeignAddress(addrContainer, "العنوان الوطني أو الدولي للمستثمر");
            }
            else if (val === 'foreign') {
                idContainer.innerHTML = `
                    <div class="input-group">
                        <label>نوع الوثيقة الرسمية</label>
                        <div class="radio-group" id="foreign-radio-group">
                            <label><input type="radio" name="docType" value="id" required> الهوية الوطنية لبلده</label>
                            <label><input type="radio" name="docType" value="passport"> جواز السفر الدولي</label>
                        </div>
                    </div>
                    <div id="foreign-doc-details"></div>`;
                
                generateForeignAddress(addrContainer, "العنوان الدولي الدائم للمستثمر");

                // تفويض الأحداث (Event Delegation) لربط حقول الراديو الديناميكية بأمان
                const radioGroup = document.getElementById('foreign-radio-group');
                if (radioGroup) {
                    radioGroup.addEventListener('change', function(e) {
                        const docDetails = document.getElementById('foreign-doc-details');
                        if (!docDetails) return;

                        if (e.target.value === 'id') {
                            docDetails.innerHTML = `
                                <div class="input-group"><label>الدولة المصدرة</label><input type="text" required></div>
                                <div class="input-group"><label>رقم الهوية</label><input type="text" required></div>
                                <div class="row-group">
                                    <div class="input-group" style="flex:1;"><label>تاريخ الإصدار</label><input type="date" required></div>
                                    <div class="input-group" style="flex:1;"><label>تاريخ الانتهاء</label><input type="date" required></div>
                                </div>`;
                        } else {
                            docDetails.innerHTML = `
                                <div class="input-group"><label>دولة إصدار الجواز</label><input type="text" required></div>
                                <div class="input-group"><label>رقم جواز السفر</label><input type="text" required></div>
                                <div class="row-group">
                                    <div class="input-group" style="flex:1;"><label>تاريخ إصدار الجواز</label><input type="date" required></div>
                                    <div class="input-group" style="flex:1;"><label>تاريخ انتهاء الجواز</label><input type="date" required></div>
                                </div>`;
                        }
                    });
                }
            } else {
                idContainer.innerHTML = '';
                addrContainer.innerHTML = '';
            }
        });
    }

    function generateForeignAddress(container, titleText) {
        container.innerHTML = `
            <div class="section-title">${titleText}</div>
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
            <div class="input-group"><label>وصف إضافي للعنوان (اختياري)</label><input type="text"></div>`;
    }

    // ==========================================
    // 4. إدارة الإقرارات والتسليم النهائي
    // ==========================================
    const chkAll = document.getElementById('chkAll');
    if (chkAll) {
        const agreementCheckboxes = document.querySelectorAll('.agreements input[type="checkbox"]:not(#chkAll)');
        
        chkAll.addEventListener('change', function() {
            agreementCheckboxes.forEach(chk => chk.checked = this.checked);
        });

        agreementCheckboxes.forEach(chk => {
            chk.addEventListener('change', function() {
                if (!this.checked) {
                    chkAll.checked = false;
                } else {
                    const allChecked = Array.from(agreementCheckboxes).every(c => c.checked);
                    chkAll.checked = allChecked;
                }
            });
        });
    }

    const regForm = document.getElementById('regForm');
    if (regForm) {
        regForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            alert("يتم معالجة البيانات وبناء حساب المستثمر...\nسيتم إرسال رمز التحقق الآمن (OTP) إلى بريدك الإلكتروني الآن.");
            
            const otp = prompt("يرجى إدخال رمز التحقق المستلم (OTP):");
            
            if (otp && otp.trim() !== "") {
                alert("تم تفعيل حسابك كـ مستثمر بنجاح!\n\nسيتم توجيهك الآن إلى صفحة استكمال بيانات الهوية والآيبان ورفع المستندات الرسمية لتوثيق المحفظة.");
                
                // تحسين المسار ليتوافق مع المسار المطلق للموقع على سيرفر المعاينة (Render Static Site)
                window.location.href = "/complete-profile.html";
            } else {
                alert("تم إلغاء عملية التحقق، يرجى إعادة المحاولة لضمان إنشاء الحساب المستثمر بنجاح.");
            }
        });
    }
});
