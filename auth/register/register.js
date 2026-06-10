document.addEventListener("DOMContentLoaded", function () {
    
    // قائمة الدول الافتراضية لتغذية حقول الاختيار بذكاء
    const countries = ["الإمارات", "البحرين", "الكويت", "عمان", "قطر", "مصر", "الأردن", "تونس", "المغرب", "أمريكا", "بريطانيا"];
    document.querySelectorAll(".country-select").forEach(select => {
        select.innerHTML = '<option value="">اختر الدولة</option>';
        countries.forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
    });

    // سيلكتور المراحل وعناصر التحكم الخطية
    let currentStep = 1;
    const totalSteps = 4;
    const form = document.getElementById("registrationForm");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");

    // تحديث شكل وإظهار المراحل الخطية
    function updateStepUI() {
        document.querySelectorAll(".form-step-section").forEach(sec => sec.classList.remove("active"));
        document.getElementById(`step${currentStep}`).classList.add("active");

        document.querySelectorAll(".steps-indicator .step").forEach(step => {
            const stepNum = parseInt(step.getAttribute("data-step"));
            if(stepNum <= currentStep) {
                step.classList.add("active");
            } else {
                step.classList.remove("active");
            }
        });

        // إدارة ظهور الأزرار
        if (currentStep === 1) {
            prevBtn.classList.add("hidden");
        } else {
            prevBtn.classList.remove("hidden");
        }

        if (currentStep === totalSteps) {
            nextBtn.classList.add("hidden");
            submitBtn.classList.remove("hidden");
        } else {
            nextBtn.classList.remove("hidden");
            submitBtn.classList.add("hidden");
        }
    }

    // التنقل لـ التالي والسابق مع ميزة التحقق من صحة المدخلات للمرحلة الحالية أولاً
    nextBtn.addEventListener("click", () => {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                currentStep++;
                updateStepUI();
            }
        }
    });

    prevBtn.addEventListener("click", () => {
        if (currentStep > 1) {
            currentStep--;
            updateStepUI();
        }
    });

    // نظام التحقق من شروط المرحلة الحالية قبل فتح التالية
    function validateStep(step) {
        let isValid = true;
        const section = document.getElementById(`step${step}`);
        const inputs = section.querySelectorAll("input[required], select[required]");
        
        inputs.forEach(input => {
            if (!input.value.trim() && !input.closest('.hidden')) {
                isValid = false;
                input.style.borderColor = "var(--danger-color)";
            } else {
                input.style.borderColor = "var(--border-color)";
            }
        });

        // التحقق الخاص بالمرحلة الأولى (تطابقات الأمان)
        if (step === 1) {
            const userValid = !section.querySelectorAll(".validation-box li.invalid").length;
            const emailMatch = document.getElementById("email").value === document.getElementById("confirmEmail").value;
            const passMatch = document.getElementById("password").value === document.getElementById("confirmPassword").value;
            if(!userValid || !emailMatch || !passMatch) isValid = false;
        }

        return isValid;
    }

    // --- المحرك البرمجي للمرحلة الأولى: التحقق الحي من المدخلات ---
    
    // 1. اسم المستخدم
    const usernameInput = document.getElementById("username");
    usernameInput.addEventListener("input", function() {
        const val = this.value;
        document.getElementById("u-length").className = (val.length >= 4 && val.length <= 20) ? "valid" : "invalid";
        document.getElementById("u-chars").className = /^[a-zA-Z0-9]+$/.test(val) ? "valid" : "invalid";
        document.getElementById("u-spaces").className = (!val.includes(" ") && val.length > 0) ? "valid" : "invalid";
        document.getElementById("u-specials").className = /^[a-zA-Z0-9\s]*$/.test(val) ? "valid" : "invalid";
    });

    // 2. تطابق البريد الإلكتروني
    const email = document.getElementById("email");
    const confirmEmail = document.getElementById("confirmEmail");
    const emailStatus = document.getElementById("email-match-status");

    function checkEmailMatch() {
        if(confirmEmail.value.length === 0) { emailStatus.innerHTML = ""; return; }
        if(email.value === confirmEmail.value) {
            emailStatus.innerHTML = "🟢 البريد الإلكتروني متطابق";
            emailStatus.className = "status-msg valid";
        } else {
            emailStatus.innerHTML = "🔴 البريد الإلكتروني غير متطابق";
            emailStatus.className = "status-msg invalid";
        }
    }
    email.addEventListener("input", checkEmailMatch);
    confirmEmail.addEventListener("input", checkEmailMatch);

    // 3. شروط وقوة كلمة المرور
    const password = document.getElementById("password");
    password.addEventListener("input", function() {
        const val = this.value;
        const hasUpper = /[A-Z]/.test(val);
        const hasLower = /[a-z]/.test(val);
        const hasNumber = /[0-9]/.test(val);
        const hasSpecial = /[^A-Za-z0-9]/.test(val);
        const isLongEnough = val.length >= 8;

        document.getElementById("p-length").className = isLongEnough ? "valid" : "invalid";
        document.getElementById("p-upper").className = hasUpper ? "valid" : "invalid";
        document.getElementById("p-lower").className = hasLower ? "valid" : "invalid";
        document.getElementById("p-number").className = hasNumber ? "valid" : "invalid";
        document.getElementById("p-special").className = hasSpecial ? "valid" : "invalid";

        // فحص مؤشر القوة
        let score = 0;
        if (isLongEnough) score++;
        if (hasUpper && hasLower) score++;
        if (hasNumber) score++;
        if (hasSpecial) score++;

        const strengthText = document.getElementById("strength-text");
        const strengthFill = document.getElementById("strength-bar-fill");

        if (val.length === 0) {
            strengthText.innerText = "ضعيفة"; strengthText.className = "strength-weak"; strengthFill.style.width = "0%";
        } else if (score <= 2) {
            strengthText.innerText = "ضعيفة"; strengthText.className = "strength-weak"; strengthFill.style.width = "25%"; strengthFill.style.backgroundColor = "var(--danger-color)";
        } else if (score === 3) {
            strengthText.innerText = "متوسطة"; strengthText.className = "strength-medium"; strengthFill.style.width = "60%"; strengthFill.style.backgroundColor = "var(--warning-color)";
        } else if (score === 4 && val.length < 12) {
            strengthText.innerText = "قوية"; strengthText.className = "strength-strong"; strengthFill.style.width = "85%"; strengthFill.style.backgroundColor = "var(--success-color)";
        } else if (score === 4 && val.length >= 12) {
            strengthText.innerText = "قوية جداً"; strengthText.className = "strength-very-strong"; strengthFill.style.width = "100%"; strengthFill.style.backgroundColor = "#0f5132";
        }
    });

    // 4. تطابق كلمة المرور
    const confirmPassword = document.getElementById("confirmPassword");
    const passwordStatus = document.getElementById("password-match-status");

    function checkPasswordMatch() {
        if(confirmPassword.value.length === 0) { passwordStatus.innerHTML = ""; return; }
        if(password.value === confirmPassword.value) {
            passwordStatus.innerHTML = "🟢 كلمة المرور متطابقة";
            passwordStatus.className = "status-msg valid";
        } else {
            passwordStatus.innerHTML = "🔴 كلمة المرور غير متطابقة";
            passwordStatus.className = "status-msg invalid";
        }
    }
    password.addEventListener("input", checkPasswordMatch);
    confirmPassword.addEventListener("input", checkPasswordMatch);


    // --- المحرك البرمجي للمرحلة الثانية والثالثة: الديناميكية وبناء الحقول على الهوية والعناوين ---
    const nationalityType = document.getElementById("nationalityType");
    const dynamicIdSection = document.getElementById("dynamic-identity-section");
    
    // عناوين السيكشنات
    const addrSaudiResident = document.getElementById("address-saudi-resident");
    const addrInternational = document.getElementById("address-international");

    nationalityType.addEventListener("change", function() {
        const type = this.value;
        
        // إخفاء كل الحقول أولا
        dynamicIdSection.classList.add("hidden");
        document.querySelectorAll(".nationality-fields").forEach(el => el.classList.add("hidden"));
        document.querySelectorAll(".nationality-fields input, .nationality-fields select").forEach(el => el.removeAttribute("required"));

        if(type) {
            dynamicIdSection.classList.remove("hidden");
            const targetFields = document.getElementById(`fields-${type}`);
            targetFields.classList.remove("hidden");
            targetFields.querySelectorAll("input, select").forEach(el => el.setAttribute("required", "true"));
        }

        // تحويل منطق العناوين بالخطوة 3 بناء على اختيار الجنسية بالخطوة 2 لتسهيل المدخلات
        if(type === "saudi" || type === "resident") {
            addrSaudiResident.classList.remove("hidden");
            addrInternational.classList.add("hidden");
            document.querySelectorAll(".addr-input").forEach(el => el.removeAttribute("required"));
            addrSaudiResident.querySelectorAll(".addr-input").forEach(el => el.setAttribute("required", "true"));
        } else if (type === "gcc" || type === "foreigner") {
            addrInternational.classList.remove("hidden");
            addrSaudiResident.classList.add("hidden");
            document.querySelectorAll(".addr-input").forEach(el => el.removeAttribute("required"));
            addrInternational.querySelectorAll(".addr-input").forEach(el => el.setAttribute("required", "true"));
        } else {
            addrSaudiResident.classList.add("hidden");
            addrInternational.classList.add("hidden");
        }
    });

    // مستمع التغير في وثيقة الأجنبي (جواز سفر أم هوية وطنية)
    document.querySelectorAll('input[name="foreignerDocType"]').forEach(radio => {
        radio.addEventListener("change", function() {
            document.querySelectorAll(".sub-fields").forEach(el => el.classList.add("hidden"));
            document.querySelectorAll(".sub-fields input, .sub-fields select").forEach(el => el.removeAttribute("required"));
            
            if(this.value === "national_id") {
                const sub = document.getElementById("sub-fields-foreigner-id");
                sub.classList.remove("hidden");
                sub.querySelectorAll("input, select").forEach(el => el.setAttribute("required", "true"));
            } else if (this.value === "passport") {
                const sub = document.getElementById("sub-fields-passport");
                sub.classList.remove("hidden");
                sub.querySelectorAll("input, select").forEach(el => el.setAttribute("required", "true"));
            }
        });
    });


    // --- المحرك البرمجي للمرحلة الرابعة: ربط شيك بوكس "الإقرار الشامل" ---
    const masterCheck = document.getElementById("masterAgreementCheck");
    const individualChecks = document.querySelectorAll(".agreement-check");

    masterCheck.addEventListener("change", function() {
        individualChecks.forEach(ch => ch.checked = this.checked);
    });

    individualChecks.forEach(ch => {
        ch.addEventListener("change", function() {
            const allChecked = Array.from(individualChecks).every(c => c.checked);
            masterCheck.checked = allChecked;
        });
    });


    // --- إرسال النموذج ومعالجة ما بعد إنشاء الحساب (OTP والاستكمال اللاحق) ---
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        
        if(!validateStep(4)) {
            alert("يرجى الموافقة على جميع الإقرارات والاتفاقيات الإلزامية للمتابعة.");
            return;
        }

        // إظهار نافذة التحقق OTP
        const modal = document.getElementById("otpModal");
        modal.classList.remove("hidden");
    });

    // تفعيل حساب المستثمر عبر رمز OTP وهمي كـ Front-End Logic يحاكي النظام
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    const otpInput = document.getElementById("otpInput");
    const completeLaterSection = document.getElementById("completeLaterSection");

    verifyOtpBtn.addEventListener("click", () => {
        if(otpInput.value.length === 4) {
            completeLaterSection.classList.remove("hidden");
            verifyOtpBtn.classList.add("hidden");
            otpInput.setAttribute("disabled", "true");
        } else {
            alert("يرجى إدخال رمز التحقق المكون من 4 أرقام بشكل صحيح.");
        }
    });

    // زر التوجيه للاستكمال لاحقاً أو الانتقال لصفحة البروفايل الرسمية للمشروع
    document.getElementById("completeLaterBtn").addEventListener("click", () => {
        // يتم التوجيه للمسار المقابل لصفحة استكمال الملف بالهيكل التنظيمي لديك
        window.location.href = "../complete-profile.html";
    });
});
