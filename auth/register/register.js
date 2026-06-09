/* ==========================================
   TERA Register Page Logic
========================================== */

document.addEventListener('DOMContentLoaded', () => {
    initializeSteps();
    initializePasswordStrength();
    initializePasswordMatch();
    initializeEmailMatch();
    initializePasswordToggle();
    initializeNationality();
    initializeMobile();
    initializeRegisterForm();
});

/* ==========================================
   Multi Step Form (التحكم في خطوات التسجيل)
========================================== */
function initializeSteps() {
    const steps = document.querySelectorAll('.form-step');
    const indicators = document.querySelectorAll('.step');
    let currentStep = 0;

    if (steps.length === 0 || indicators.length === 0) return;

    // زر الخطوة التالية
    document.querySelectorAll('.btn-next').forEach(button => {
        button.addEventListener('click', () => {
            if (currentStep >= steps.length - 1) return;

            const currentForm = steps[currentStep];
            const fields = currentForm.querySelectorAll('input[required], select[required]');
            let valid = true;

            // التحقق من صحة حقول الخطوة الحالية قبل الانتقال
            fields.forEach(field => {
                if (!field.checkValidity()) {
                    field.reportValidity();
                    valid = false;
                }
            });

            if (!valid) return;

            // تحديث واجهة الخطوات والمؤشرات
            steps[currentStep].classList.remove('active');
            indicators[currentStep].classList.add('completed');
            indicators[currentStep].classList.remove('active');

            currentStep++;

            steps[currentStep].classList.add('active');
            indicators[currentStep].classList.add('active');
            
            // التمرير لأعلى الصفحة تلقائياً لراحة المستخدم على الموبايل
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // زر الخطوة السابقة
    document.querySelectorAll('.btn-prev').forEach(button => {
        button.addEventListener('click', () => {
            if (currentStep <= 0) return;

            steps[currentStep].classList.remove('active');
            indicators[currentStep].classList.remove('active');

            // إصلاح برميجي: إزالة حالة الاكتمال من الخطوة المستهدفة عند العودة إليها
            currentStep--;
            
            steps[currentStep].classList.add('active');
            indicators[currentStep].classList.add('active');
            indicators[currentStep].classList.remove('completed');

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

/* ==========================================
   Password Strength Meter (قياس قوة كلمة المرور)
========================================== */
function initializePasswordStrength() {
    const password = document.getElementById('password');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    if (!password || !strengthFill || !strengthText) return;

    password.addEventListener('input', () => {
        const value = password.value;
        let score = 0;

        if (value.length >= 8) score++;
        if (/[A-Z]/.test(value)) score++;
        if (/[a-z]/.test(value)) score++;
        if (/[0-9]/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;

        strengthFill.className = 'strength-fill';

        if (value.length === 0) {
            strengthFill.style.width = '0%';
            strengthText.textContent = '';
            return;
        }

        if (score <= 2) {
            strengthFill.classList.add('strength-weak');
            strengthFill.style.width = '33%';
            strengthText.textContent = 'ضعيفة (يفضل إضافة رموز وأرقام)';
            strengthText.className = 'strength-text text-danger';
        } else if (score <= 4) {
            strengthFill.classList.add('strength-medium');
            strengthFill.style.width = '66%';
            strengthText.textContent = 'متوسطة (أضف حروفاً كبيرة)';
            strengthText.className = 'strength-text text-warning';
        } else {
            strengthFill.classList.add('strength-strong');
            strengthFill.style.width = '100%';
            strengthText.textContent = 'كلمة مرور قوية وآمنة بمواصفات عالية';
            strengthText.className = 'strength-text text-success';
        }
    });
}

/* ==========================================
   Password Match Validation (تطابق كلمة المرور)
========================================== */
function initializePasswordMatch() {
    const password = document.getElementById('password');
    const confirm = document.getElementById('confirmPassword');
    const message = document.getElementById('passwordMatch');

    if (!password || !confirm || !message) return;

    const checkMatch = () => {
        if (confirm.value.length === 0) {
            message.textContent = '';
            confirm.classList.remove('valid', 'invalid');
            return;
        }

        const match = password.value === confirm.value;
        confirm.classList.toggle('valid', match);
        confirm.classList.toggle('invalid', !match);

        if (match) {
            message.textContent = '✓ تطابق مثالي لكلمة المرور';
            message.className = 'strength-text text-success';
            confirm.setCustomValidity('');
        } else {
            message.textContent = '✕ كلمات المرور غير متطابقة';
            message.className = 'strength-text text-danger';
            confirm.setCustomValidity('كلمة المرور غير متطابقة');
        }
    };

    confirm.addEventListener('input', checkMatch);
    password.addEventListener('input', checkMatch);
}

/* ==========================================
   Email Match Validation (تطابق البريد الإلكتروني)
========================================== */
function initializeEmailMatch() {
    const email = document.getElementById('email');
    const confirm = document.getElementById('confirmEmail');

    if (!email || !confirm) return;

    const checkEmail = () => {
        if (confirm.value.length === 0) {
            confirm.classList.remove('valid', 'invalid');
            return;
        }

        const match = email.value.trim().toLowerCase() === confirm.value.trim().toLowerCase();
        confirm.classList.toggle('valid', match);
        confirm.classList.toggle('invalid', !match);

        if (match) {
            confirm.setCustomValidity('');
        } else {
            confirm.setCustomValidity('البريد الإلكتروني غير متطابق');
        }
    };

    confirm.addEventListener('input', checkEmail);
    email.addEventListener('input', checkEmail);
}

/* ==========================================
   Password Visibility Toggle (إظهار/إخفاء كلمة المرور)
========================================== */
function initializePasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); // منع أي سلوك افتراضي داخل الفورم
            const input = button.previousElementSibling;

            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                button.classList.add('is-visible'); // يمكنك استخدامها لتغيير أيقونة العين في الـ CSS
            } else {
                input.type = 'password';
                button.classList.remove('is-visible');
            }
        });
    });
}

/* ==========================================
   Nationality Dynamic Labels (تغيير مسميات الهوية ديناميكياً)
========================================== */
function initializeNationality() {
    const nationality = document.getElementById('nationality');
    const label = document.getElementById('identityLabel');
    const identityInput = document.getElementById('identityNumber');

    if (!nationality || !label) return;

    nationality.addEventListener('change', () => {
        // تفضيلات البوابة تبعاً لمتطلبات مركز الإيداع والـ CMA
        switch (nationality.value) {
            case 'saudi':
                label.textContent = 'رقم الهوية الوطنية';
                if (identityInput) identityInput.placeholder = '1XXXXXXXXX';
                break;
            case 'resident':
                label.textContent = 'رقم الإقامة';
                if (identityInput) identityInput.placeholder = '2XXXXXXXXX';
                break;
            case 'gcc':
                label.textContent = 'رقم الهوية الخليجية';
                if (identityInput) identityInput.placeholder = 'أدخل رقم الهوية الخليجية';
                break;
            default:
                label.textContent = 'رقم جواز السفر';
                if (identityInput) identityInput.placeholder = 'أدخل رقم جواز السفر';
        }
    });
}

/* ==========================================
   Mobile Preprocessing (تهيئة ومعالجة مدخلات الجوال)
========================================== */
function initializeMobile() {
    const mobile = document.getElementById('mobile');

    if (!mobile) return;

    const cleanInput = () => {
        let value = mobile.value.replace(/\D/g, ''); // حذف أي رمز غير رقمي فوراً

        // إزالة الصفر الأول إذا قام المستخدم بكتابته تلقائياً (مثال: 055 -> 55)
        if (value.startsWith('0')) {
            value = value.substring(1);
        }
        
        mobile.value = value;
    };

    mobile.addEventListener('input', cleanInput);
    mobile.addEventListener('paste', () => setTimeout(cleanInput, 10)); // معالجة اللصق السريع
}

/* ==========================================
   Form Submission (حفظ البيانات والتوجه لتأكيد الـ OTP)
========================================== */
function initializeRegisterForm() {
    const form = document.getElementById('registerForm');

    if (!form) return;

    form.addEventListener('submit', e => {
        e.preventDefault();

        const email = document.getElementById('email');
        const confirmEmail = document.getElementById('confirmEmail');
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        const mobile = document.getElementById('mobile');

        // مراجعة أمنية نهائية متطابقة قبل الحفظ والتوجيه
        if (email.value.trim().toLowerCase() !== confirmEmail.value.trim().toLowerCase()) {
            confirmEmail.reportValidity();
            return;
        }

        if (password.value !== confirmPassword.value) {
            confirmPassword.reportValidity();
            return;
        }

        // تخزين البيانات المؤقتة تمهيداً لخطوة الرسالة النصية التفعيلية OTP
        localStorage.setItem('tera_registration_email', email.value.trim());
        localStorage.setItem('tera_registration_mobile', mobile.value.trim());

        // التوجيه السلس لصفحة التحقق
        window.location.href = '/auth/verify-otp.html';
    });
}
