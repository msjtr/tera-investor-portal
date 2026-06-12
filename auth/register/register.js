// إدارة التنقل بين المراحل
let currentStep = 1;
const totalSteps = 4;

function showStep(step) {
    // إخفاء كل الأقسام
    document.querySelectorAll('.form-section').forEach(el => el.classList.remove('active'));
    // إزالة تفعيل الخطوات
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    
    // إظهار القسم الحالي
    document.getElementById(`section-${step}`).classList.add('active');
    document.getElementById(`step-indicator-${step}`).classList.add('active');
    
    // إدارة الأزرار
    document.getElementById('btn-prev').style.display = step === 1 ? 'none' : 'inline-block';
    if (step === totalSteps) {
        document.getElementById('btn-next').style.display = 'none';
        document.getElementById('btn-submit').style.display = 'inline-block';
    } else {
        document.getElementById('btn-next').style.display = 'inline-block';
        document.getElementById('btn-submit').style.display = 'none';
    }
}

function nextStep() {
    // هنا يجب إضافة كود للتحقق من صحة المدخلات في الخطوة الحالية قبل الانتقال
    // تم التجاوز مؤقتاً لتوضيح الهيكل
    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

// عرض وإخفاء كلمة المرور
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === "password" ? "text" : "password";
}

// حذف الصفر الأول من رقم الجوال
function formatMobileNumber() {
    const mobileInput = document.getElementById('mobile');
    let val = mobileInput.value.replace(/\D/g, ''); // أرقام فقط
    if (val.startsWith('0')) {
        val = val.substring(1);
    }
    mobileInput.value = val;
}

// تحديث حقول الهوية والعنوان بناءً على الفئة المختارة
function updateIdentityFields() {
    const category = document.querySelector('input[name="category"]:checked').value;
    const identityBox = document.getElementById('dynamic-identity-fields');
    const addressBox = document.getElementById('dynamic-address-fields');
    const countryCode = document.getElementById('country_code');
    
    let identityHtml = '';
    let addressHtml = '';
    let codesHtml = '';

    if (category === 'saudi') {
        codesHtml = '<option value="+966">🇸🇦 السعودية +966</option>';
        identityHtml = `
            <div class="form-group"><label>رقم الهوية الوطنية</label><input type="text" class="form-control"></div>
            <div class="row"><div class="col-6"><div class="form-group"><label>تاريخ الإصدار</label><input type="date" class="form-control"></div></div>
            <div class="col-6"><div class="form-group"><label>تاريخ الانتهاء</label><input type="date" class="form-control"></div></div></div>
        `;
        addressHtml = generateNationalAddress();
    } else if (category === 'resident') {
        codesHtml = '<option value="+966">🇸🇦 السعودية +966</option>';
        identityHtml = `
            <div class="form-group"><label>الجنسية</label><input type="text" class="form-control"></div>
            <div class="form-group"><label>المهنة</label><input type="text" class="form-control"></div>
            <div class="form-group"><label>رقم الإقامة</label><input type="text" class="form-control"></div>
            <div class="row"><div class="col-6"><div class="form-group"><label>تاريخ الإصدار</label><input type="date" class="form-control"></div></div>
            <div class="col-6"><div class="form-group"><label>تاريخ الانتهاء</label><input type="date" class="form-control"></div></div></div>
        `;
        addressHtml = generateNationalAddress();
    } else if (category === 'gcc') {
        codesHtml = `
            <option value="+966">السعودية +966</option>
            <option value="+971">الإمارات +971</option>
            <option value="+965">الكويت +965</option>
            <option value="+973">البحرين +973</option>
            <option value="+968">عمان +968</option>
            <option value="+974">قطر +974</option>
        `;
        identityHtml = `
            <div class="form-group"><label>الدولة</label><input type="text" class="form-control"></div>
            <div class="form-group"><label>رقم الهوية الخليجية</label><input type="text" class="form-control"></div>
            <div class="row"><div class="col-6"><div class="form-group"><label>تاريخ الإصدار</label><input type="date" class="form-control"></div></div>
            <div class="col-6"><div class="form-group"><label>تاريخ الانتهاء</label><input type="date" class="form-control"></div></div></div>
        `;
        addressHtml = generateStandardAddress();
    } else if (category === 'foreigner') {
        codesHtml = `
            <option value="+20">مصر +20</option>
            <option value="+962">الأردن +962</option>
            <option value="+964">العراق +964</option>
            <option value="+961">لبنان +961</option>
            <option value="+212">المغرب +212</option>
            <option value="+213">الجزائر +213</option>
            <option value="+216">تونس +216</option>
        `;
        identityHtml = `
            <div class="form-group"><label>نوع الوثيقة</label>
                <select class="form-control"><option>جواز السفر</option><option>الهوية الوطنية</option></select>
            </div>
            <div class="form-group"><label>الدولة</label><input type="text" class="form-control"></div>
            <div class="form-group"><label>رقم الوثيقة</label><input type="text" class="form-control"></div>
            <div class="row"><div class="col-6"><div class="form-group"><label>تاريخ الإصدار</label><input type="date" class="form-control"></div></div>
            <div class="col-6"><div class="form-group"><label>تاريخ الانتهاء</label><input type="date" class="form-control"></div></div></div>
            <div class="form-group"><label>الجنسية</label><input type="text" class="form-control"></div>
            <div class="form-group"><label>المهنة</label><input type="text" class="form-control"></div>
        `;
        addressHtml = generateStandardAddress();
    }

    countryCode.innerHTML = codesHtml;
    identityBox.innerHTML = identityHtml;
    addressBox.innerHTML = addressHtml;
}

// هيكل العنوان الوطني (للسعودي والمقيم)
function generateNationalAddress() {
    return `
        <div class="row">
            <div class="col-md-4"><div class="form-group"><label>رقم المبنى</label><input type="text" class="form-control"></div></div>
            <div class="col-md-4"><div class="form-group"><label>الرقم الفرعي</label><input type="text" class="form-control"></div></div>
            <div class="col-md-4"><div class="form-group"><label>الرمز البريدي</label><input type="text" class="form-control"></div></div>
        </div>
        <div class="row">
            <div class="col-md-6"><div class="form-group"><label>اسم الشارع</label><input type="text" class="form-control"></div></div>
            <div class="col-md-6"><div class="form-group"><label>الحي</label><input type="text" class="form-control"></div></div>
        </div>
        <div class="row">
            <div class="col-md-4"><div class="form-group"><label>المدينة</label><input type="text" class="form-control"></div></div>
            <div class="col-md-4"><div class="form-group"><label>الرقم الإضافي</label><input type="text" class="form-control"></div></div>
            <div class="col-md-4"><div class="form-group"><label>رقم الوحدة (اختياري)</label><input type="text" class="form-control"></div></div>
        </div>
    `;
}

// هيكل العنوان العادي (للخليجي والأجنبي)
function generateStandardAddress() {
    return `
        <div class="row">
            <div class="col-md-6"><div class="form-group"><label>الدولة</label><input type="text" class="form-control"></div></div>
            <div class="col-md-6"><div class="form-group"><label>المحافظة</label><input type="text" class="form-control"></div></div>
        </div>
        <div class="row">
            <div class="col-md-4"><div class="form-group"><label>المدينة</label><input type="text" class="form-control"></div></div>
            <div class="col-md-4"><div class="form-group"><label>الحي</label><input type="text" class="form-control"></div></div>
            <div class="col-md-4"><div class="form-group"><label>الشارع</label><input type="text" class="form-control"></div></div>
        </div>
        <div class="form-group"><label>الرمز البريدي</label><input type="text" class="form-control"></div>
        <div class="form-group"><label>وصف إضافي</label><textarea class="form-control"></textarea></div>
    `;
}

// تحديد "الموافقة على الكل" في الاتفاقيات
document.getElementById('checkAllAgree')?.addEventListener('change', function(e) {
    const checkboxes = document.querySelectorAll('.agreement-cb');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
    updateFinalValidationStatus();
});

document.querySelectorAll('.agreement-cb').forEach(cb => {
    cb.addEventListener('change', updateFinalValidationStatus);
});

function updateFinalValidationStatus() {
    const allChecked = Array.from(document.querySelectorAll('.agreement-cb')).every(cb => cb.checked);
    const statusBox = document.getElementById('final-validation-status');
    if (allChecked) {
        statusBox.innerHTML = '✅ جميع الإقرارات مقبولة وجاهز لإنشاء الحساب وإرسال رمز التحقق.';
        statusBox.style.color = 'green';
        document.getElementById('checkAllAgree').checked = true;
    } else {
        statusBox.innerHTML = '❌ يجب الموافقة على جميع الإقرارات والاتفاقيات لإتمام التسجيل.';
        statusBox.style.color = 'red';
        document.getElementById('checkAllAgree').checked = false;
    }
}

// الدالة النهائية للإرسال
function submitForm() {
    alert("تم إنشاء حساب الشريك بنجاح! سيتم إرسال رمز التحقق إلى بريدك الإلكتروني.");
    // window.location.href = '../verify-otp.html'; // الانتقال لصفحة التحقق بناءً على شجرة الملفات
}

// التهيئة الأولية
showStep(currentStep);
