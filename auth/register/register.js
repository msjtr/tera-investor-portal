document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    const totalSteps = 4;

    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnSubmit = document.getElementById('btn-submit');
    const steps = document.querySelectorAll('.form-step');
    const stepIndicators = document.querySelectorAll('.step');
    const nationalitySelect = document.getElementById('nationalityType');
    const idContainer = document.getElementById('id-details-container');
    const addressContainer = document.getElementById('address-container');

    // التحكم بالخطوات
    function updateSteps() {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === currentStep);
        });

        stepIndicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index + 1 === currentStep);
            if(index + 1 < currentStep) indicator.classList.add('completed');
            else indicator.classList.remove('completed');
        });

        btnPrev.classList.toggle('hidden', currentStep === 1);
        
        if (currentStep === totalSteps) {
            btnNext.classList.add('hidden');
            btnSubmit.classList.remove('hidden');
        } else {
            btnNext.classList.remove('hidden');
            btnSubmit.classList.add('hidden');
        }
    }

    btnNext.addEventListener('click', () => {
        if (currentStep < totalSteps) {
            currentStep++;
            updateSteps();
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateSteps();
        }
    });

    // تفاعل حقول الهوية والعنوان بناءً على الجنسية
    nationalitySelect.addEventListener('change', (e) => {
        const type = e.target.value;
        renderIdFields(type);
        renderAddressFields(type);
    });

    function renderIdFields(type) {
        let html = '';
        if (type === 'saudi') {
            html = `
                <h4>بيانات الهوية (سعودي)</h4>
                <input type="text" placeholder="رقم الهوية الوطنية *" required>
                <input type="date" placeholder="تاريخ إصدار الهوية *" required>
                <input type="date" placeholder="تاريخ انتهاء الهوية *" required>`;
        } else if (type === 'resident') {
            html = `
                <h4>بيانات الإقامة (مقيم)</h4>
                <input type="text" placeholder="رقم الإقامة *" required>
                <input type="date" placeholder="تاريخ إصدار الإقامة *" required>
                <input type="date" placeholder="تاريخ انتهاء الإقامة *" required>`;
        } else if (type === 'gcc') {
            html = `
                <h4>بيانات الهوية (مواطن خليجي)</h4>
                <input type="text" placeholder="الدولة *" required>
                <input type="text" placeholder="رقم الهوية الخليجية *" required>
                <input type="date" placeholder="تاريخ إصدار الهوية *" required>
                <input type="date" placeholder="تاريخ انتهاء الهوية *" required>`;
        } else if (type === 'foreigner') {
            html = `
                <h4>بيانات الوثيقة (أجنبي)</h4>
                <select id="foreignDocType" required>
                    <option value="">نوع الوثيقة...</option>
                    <option value="national">الهوية الوطنية لبلده</option>
                    <option value="passport">جواز السفر</option>
                </select>
                <div id="foreignDocDetails" style="margin-top:10px;"></div>`;
        }
        idContainer.innerHTML = html;

        // مستمع أحداث فرعي لخيارات الأجنبي
        if(type === 'foreigner'){
            document.getElementById('foreignDocType').addEventListener('change', (e) => {
                const subType = e.target.value;
                const container = document.getElementById('foreignDocDetails');
                if(subType === 'national'){
                    container.innerHTML = `<input type="text" placeholder="الدولة"><input type="text" placeholder="رقم الهوية"><input type="date" placeholder="تاريخ الإصدار"><input type="date" placeholder="تاريخ الانتهاء">`;
                } else if(subType === 'passport'){
                    container.innerHTML = `<input type="text" placeholder="دولة الإصدار"><input type="text" placeholder="رقم جواز السفر"><input type="date" placeholder="تاريخ إصدار الجواز"><input type="date" placeholder="تاريخ انتهاء الجواز">`;
                } else { container.innerHTML = ''; }
            });
        }
    }

    function renderAddressFields(type) {
        let html = '';
        if (type === 'saudi' || type === 'resident') {
            html = `
                <h4>العنوان الوطني</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" placeholder="رقم المبنى *" required>
                    <input type="text" placeholder="الرقم الفرعي *" required>
                    <input type="text" placeholder="اسم الشارع *" required>
                    <input type="text" placeholder="الحي *" required>
                    <input type="text" placeholder="المدينة *" required>
                    <input type="text" placeholder="الرمز البريدي *" required>
                    <input type="text" placeholder="الرقم الإضافي *" required>
                    <input type="text" placeholder="رقم الوحدة (اختياري)">
                </div>
                <input type="text" placeholder="الاسم المختصر للعنوان الوطني *" style="margin-top:10px;" required>`;
        } else {
            html = `
                <h4>العنوان الدولي (خارج المملكة)</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" placeholder="الدولة *" required>
                    <input type="text" placeholder="المدينة *" required>
                    <input type="text" placeholder="المحافظة / الولاية *" required>
                    <input type="text" placeholder="الحي *" required>
                    <input type="text" placeholder="الشارع *" required>
                    <input type="text" placeholder="الرمز البريدي *" required>
                </div>
                <input type="text" placeholder="وصف إضافي للعنوان" style="margin-top:10px;">`;
        }
        addressContainer.innerHTML = html;
    }

    // إرسال النموذج (تفعيل الحساب والتوجيه لصفحة الـ OTP ومن ثم استكمال الملف)
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        // محاكاة الإرسال
        alert('تم إنشاء الحساب بنجاح. سيتم تحويلك لصفحة التحقق من البريد الإلكتروني (OTP).');
        window.location.href = '../verify-otp.html';
    });
});
