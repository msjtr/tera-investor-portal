document.addEventListener('DOMContentLoaded', () => {
    // --- متغيرات التنقل ---
    let currentStep = 0;
    const steps = document.querySelectorAll('.step');
    const nodes = document.querySelectorAll('.step-node');
    const btnNext = document.querySelector('.btn-next');
    const btnPrev = document.querySelector('.btn-prev');
    const btnSubmit = document.querySelector('.btn-submit');

    // --- منطق التنقل بين المراحل ---
    window.changeStep = (n) => {
        steps[currentStep].classList.remove('active');
        nodes[currentStep].classList.remove('active');
        
        currentStep += n;
        
        steps[currentStep].classList.add('active');
        nodes[currentStep].classList.add('active');

        // إدارة الأزرار
        btnPrev.style.display = (currentStep === 0) ? 'none' : 'inline-block';
        if (currentStep === steps.length - 1) {
            btnNext.style.display = 'none';
            btnSubmit.style.display = 'inline-block';
        } else {
            btnNext.style.display = 'inline-block';
            btnSubmit.style.display = 'none';
        }
    };

    // --- منطق تبديل حقول الهوية (الجنسية) ---
    window.updateIdentityFields = () => {
        const nationality = document.getElementById('nationalitySelect').value;
        const container = document.getElementById('identityFields');
        
        let html = '';
        if (nationality === 'saudi') {
            html = `<div class="input-group"><label>رقم الهوية الوطنية</label><input type="text" required></div>
                    <div class="row"><div class="input-group"><label>تاريخ الإصدار</label><input type="date"></div>
                    <div class="input-group"><label>تاريخ الانتهاء</label><input type="date"></div></div>`;
        } else if (nationality === 'resident') {
            html = `<div class="input-group"><label>رقم الإقامة</label><input type="text" required></div>
                    <div class="row"><div class="input-group"><label>تاريخ الإصدار</label><input type="date"></div>
                    <div class="input-group"><label>تاريخ الانتهاء</label><input type="date"></div></div>`;
        } else if (nationality === 'gcc') {
            html = `<div class="input-group"><label>رقم الهوية الخليجية</label><input type="text" required></div>
                    <div class="row"><div class="input-group"><label>تاريخ الإصدار</label><input type="date"></div>
                    <div class="input-group"><label>تاريخ الانتهاء</label><input type="date"></div></div>`;
        } else if (nationality === 'foreign') {
            html = `<div class="input-group"><label>نوع الوثيقة</label>
                    <select><option>الهوية الوطنية</option><option>جواز السفر</option></select></div>
                    <div class="input-group"><label>رقم الوثيقة</label><input type="text" required></div>`;
        }
        container.innerHTML = html;
    };

    // --- منطق قوة كلمة المرور ---
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            // يمكنك ربط هذا بمؤشر بصري (ضعيف/متوسط/قوي)
            console.log("Password strength logic can be added here");
        });
    }

    // --- دالة إظهار/إخفاء كلمة المرور ---
    window.togglePassword = (id) => {
        const input = document.getElementById(id);
        const btn = input.nextElementSibling;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.innerHTML = isPassword 
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"></path></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    };
});
