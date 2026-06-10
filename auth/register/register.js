document.addEventListener('DOMContentLoaded', function() {

    // 1️⃣ منطق إظهار/إخفاء كلمة المرور
    function setupPasswordToggle(buttonId, inputId) {
        const toggleBtn = document.getElementById(buttonId);
        const passwordInput = document.getElementById(inputId);

        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault(); // منع إرسال النموذج إذا كان الزر داخل form
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // تغيير لون الأيقونة لتدل على التفعيل
                if(type === 'text') {
                    toggleBtn.style.color = '#00796B';
                } else {
                    toggleBtn.style.color = '#666';
                }
            });
        }
    }

    setupPasswordToggle('togglePasswordView', 'reg_password');
    setupPasswordToggle('toggleConfirmPasswordView', 'reg_confirm_password');


    // 2️⃣ منطق التنقل بين المراحل مع التحقق الصارم (Validation)
    const steps = document.querySelectorAll('.form-step');
    const stepNodes = document.querySelectorAll('.reg-step-node');
    const nextBtns = document.querySelectorAll('.btn-next');
    const prevBtns = document.querySelectorAll('.btn-prev');

    // دالة التحقق من الحقول المطلوبة في المرحلة الحالية
    function validateCurrentStep(stepElement) {
        // جلب جميع الحقول التي تحتوي على سمة required داخل المرحلة الحالية فقط
        const requiredInputs = stepElement.querySelectorAll('input[required], select[required]');
        let isValid = true;

        for (let i = 0; i < requiredInputs.length; i++) {
            const input = requiredInputs[i];
            if (!input.checkValidity()) {
                input.reportValidity(); // يظهر رسالة الخطأ الأصلية للمتصفح (مثل: يرجى ملء هذا الحقل)
                isValid = false;
                break; // التوقف عند أول حقل فارغ والتركيز عليه
            }
        }
        return isValid;
    }

    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentStepIndex = parseInt(btn.getAttribute('data-step-index'));
            const currentStepElement = steps[currentStepIndex];

            // لا تنتقل إلا إذا كانت جميع الحقول المطلوبة ممتلئة
            if (validateCurrentStep(currentStepElement)) {
                // إخفاء المرحلة الحالية
                currentStepElement.classList.remove('active');
                stepNodes[currentStepIndex].classList.remove('active');
                
                // إظهار المرحلة التالية
                steps[currentStepIndex + 1].classList.add('active');
                stepNodes[currentStepIndex + 1].classList.add('active');
            }
        });
    });

    prevBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            // زر السابق لا يحتاج لتحقق
            steps[index + 1].classList.remove('active');
            stepNodes[index + 1].classList.remove('active');
            
            steps[index].classList.add('active');
            stepNodes[index].classList.add('active');
        });
    });


    // 3️⃣ منطق الجنسية (الحقول الديناميكية)
    const nationalitySelect = document.getElementById('nationality_select');
    const dynamicIdentityContainer = document.getElementById('dynamic_identity_section');
    const dynamicAddressContainer = document.getElementById('dynamic_address_section');
    const identityTitle = document.getElementById('identity_title');

    nationalitySelect.addEventListener('change', function(e) {
        const selected = e.target.value;
        
        if(identityTitle) {
            identityTitle.style.display = selected ? 'block' : 'none';
        }

        // --- سعودي ---
        if (selected === 'saudi') {
            dynamicIdentityContainer.innerHTML = `
                <div class="form-group">
                    <label class="tera-label">رقم الهوية الوطنية</label>
                    <input type="text" class="tera-input-field" placeholder="أدخل رقم الهوية (10 أرقام)" required>
                </div>
                <div class="form-row-split">
                    <div class="form-group"><label class="tera-label">تاريخ إصدار الهوية</label><input type="date" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">تاريخ انتهاء الهوية</label><input type="date" class="tera-input-field" required></div>
                </div>
            `;
            
            dynamicAddressContainer.innerHTML = `
                <div class="section-divider-title">العنوان الوطني</div>
                <div class="form-row-split">
                    <div class="form-group"><label class="tera-label">رقم المبنى</label><input type="text" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">الرقم الفرعي</label><input type="text" class="tera-input-field"></div>
                </div>
                <div class="form-group"><label class="tera-label">اسم الشارع</label><input type="text" class="tera-input-field" required></div>
                <div class="form-row-split">
                    <div class="form-group"><label class="tera-label">الحي</label><input type="text" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">المدينة</label><input type="text" class="tera-input-field" required></div>
                </div>
            `;
        } 
        // --- مقيم ---
        else if (selected === 'resident') {
            dynamicIdentityContainer.innerHTML = `
                <div class="form-group">
                    <label class="tera-label">رقم الإقامة</label>
                    <input type="text" class="tera-input-field" placeholder="أدخل رقم الإقامة" required>
                </div>
                <div class="form-row-split">
                    <div class="form-group"><label class="tera-label">تاريخ إصدار الإقامة</label><input type="date" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">تاريخ انتهاء الإقامة</label><input type="date" class="tera-input-field" required></div>
                </div>
            `;
            renderNonSaudiAddress();
        } 
        // --- خليجي ---
        else if (selected === 'gcc') {
            dynamicIdentityContainer.innerHTML = `
                <div class="form-row-split">
                    <div class="form-group"><label class="tera-label">الدولة</label><input type="text" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">رقم الهوية الخليجية</label><input type="text" class="tera-input-field" required></div>
                </div>
                <div class="form-row-split">
                    <div class="form-group"><label class="tera-label">تاريخ الإصدار</label><input type="date" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">تاريخ الانتهاء</label><input type="date" class="tera-input-field" required></div>
                </div>
            `;
            renderNonSaudiAddress();
        } 
        // --- أجنبي ---
        else if (selected === 'foreign') {
            dynamicIdentityContainer.innerHTML = `
                <div class="form-row-split">
                    <div class="form-group"><label class="tera-label">دولة الإصدار</label><input type="text" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">رقم جواز السفر</label><input type="text" class="tera-input-field" required></div>
                </div>
                <div class="form-row-split">
                    <div class="form-group"><label class="tera-label">تاريخ الإصدار</label><input type="date" class="tera-input-field" required></div>
                    <div class="form-group"><label class="tera-label">تاريخ الانتهاء</label><input type="date" class="tera-input-field" required></div>
                </div>
            `;
            renderNonSaudiAddress();
        } 
        // --- لم يتم اختيار شيء ---
        else {
            dynamicIdentityContainer.innerHTML = '';
            dynamicAddressContainer.innerHTML = '<div class="alert-box" style="padding:15px; background:#f9f9f9; border-radius:8px; border:1px dashed #ccc; text-align:center; color:#666;">الرجاء اختيار الجنسية من المرحلة السابقة لعرض حقول العنوان المناسبة.</div>';
        }
    });

    function renderNonSaudiAddress() {
        dynamicAddressContainer.innerHTML = `
            <div class="section-divider-title">العنوان السكني</div>
            <div class="form-row-split">
                <div class="form-group"><label class="tera-label">الدولة</label><input type="text" class="tera-input-field" required></div>
                <div class="form-group"><label class="tera-label">المدينة</label><input type="text" class="tera-input-field" required></div>
            </div>
            <div class="form-group"><label class="tera-label">الشارع / تفاصيل العنوان</label><input type="text" class="tera-input-field" required></div>
        `;
    }
});
