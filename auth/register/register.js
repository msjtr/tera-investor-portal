// إدارة التنقل
let currentStep = 1;

function nextStep() {
    // منطق التحقق قبل الانتقال (Validate current step)
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep++;
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateButtons();
}

// تبديل حقول الهوية بناءً على الجنسية
function handleNationalityChange() {
    const nationality = document.getElementById('nationality').value;
    const container = document.getElementById('dynamic-identity-fields');
    
    let html = '';
    if (nationality === 'saudi') {
        html = `
            <div class="identity-section">
                <label>رقم الهوية الوطنية</label>
                <input type="text">
                </div>`;
    } else if (nationality === 'foreign') {
        html = `
            <div class="identity-section">
                <label>نوع الوثيقة</label>
                <select>
                    <option>الهوية الوطنية</option>
                    <option>جواز السفر</option>
                </select>
                </div>`;
    }
    container.innerHTML = html;
}

// التحقق من قوة كلمة المرور
document.getElementById('password').addEventListener('input', function() {
    const val = this.value;
    const isLengthValid = val.length >= 8;
    // تحديث الأيقونات 🟢/🔴 بناءً على تحقق الشروط
});
