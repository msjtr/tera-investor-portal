document.addEventListener("DOMContentLoaded", function() {
    
    // --- إعدادات معالجة المراحل المتعددة (Multi-step Controller) ---
    let currentStep = 1;
    const totalSteps = 4;

    const btnNext = document.getElementById("btnNext");
    const btnPrev = document.getElementById("btnPrev");
    const btnSubmit = document.getElementById("btnSubmit");

    function updateStepUI() {
        // تحديث ظهور كتل المراحل
        document.querySelectorAll(".form-step-content").forEach(step => step.classList.remove("active"));
        document.getElementById(`step${currentStep}`).classList.add("active");

        // تحديث شريط الخطوات العلوي
        document.querySelectorAll(".step-item").forEach(item => {
            const stepNum = parseInt(item.getAttribute("data-step"));
            if (stepNum <= currentStep) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // تعديل ظهور الأزرار
        if (currentStep === 1) {
            btnPrev.classList.add("hidden");
        } else {
            btnPrev.classList.remove("hidden");
        }

        if (currentStep === totalSteps) {
            btnNext.classList.add("hidden");
            btnSubmit.classList.remove("hidden");
        } else {
            btnNext.classList.remove("hidden");
            btnSubmit.classList.add("hidden");
        }
    }

    btnNext.addEventListener("click", () => {
        if (validateStep(currentStep)) {
            currentStep++;
            updateStepUI();
        }
    });

    btnPrev.addEventListener("click", () => {
        currentStep--;
        updateStepUI();
    });


    // --- تحققات المرحلة الأولى (اسم المستخدم والبريد وكلمة المرور) ---
    
    const usernameInput = document.getElementById("username");
    usernameInput.addEventListener("input", function() {
        const val = this.value;
        
        // التحقق من الطول
        toggleReqItem("usernameRequirements", "length", val.length >= 4 && val.length <= 20);
        // أحرف إنجليزية وأرقام فقط
        toggleReqItem("usernameRequirements", "chars", /^[a-zA-Z0-9]*$/.test(val) && val !== "");
        // لا يحتوي على مسافات
        toggleReqItem("usernameRequirements", "spaces", !/\s/.test(val));
        // لا رموز خاصة
        toggleReqItem("usernameRequirements", "special", !/[~`@#$%^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(val));
        
        // محاكاة الفحص المسبق للاسم الفريد (يمكن ربطه بـ API لاحقاً)
        toggleReqItem("usernameRequirements", "unique", val !== "admin" && val !== "tera_user");
    });

    const email = document.getElementById("email");
    const confirmEmail = document.getElementById("confirmEmail");
    const emailFeedback = document.getElementById("emailMatchFeedback");

    function checkEmails() {
        if(!confirmEmail.value) { emailFeedback.textContent = ""; return; }
        if(email.value === confirmEmail.value) {
            emailFeedback.textContent = "🟢 البريد الإلكتروني متطابق";
            emailFeedback.className = "match-feedback valid";
        } else {
            emailFeedback.textContent = "🔴 البريد الإلكتروني غير متطابق";
            emailFeedback.className = "match-feedback invalid";
        }
    }
    email.addEventListener("input", checkEmails);
    confirmEmail.addEventListener("input", checkEmails);

    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const passFeedback = document.getElementById("passwordMatchFeedback");
    const strengthBar = document.querySelector(".meter-bar");
    const strengthText = document.getElementById("strengthText");

    password.addEventListener("input", function() {
        const val = this.value;
        let score = 0;

        const hasLen = val.length >= 8;
        const hasUpper = /[A-Z]/.test(val);
        const hasLower = /[a-z]/.test(val);
        const hasNum = /[0-9]/.test(val);
        const hasSpec = /[~`@#$%^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(val);

        toggleReqItem("passwordRequirements", "len", hasLen);
        toggleReqItem("passwordRequirements", "upper", hasUpper);
        toggleReqItem("passwordRequirements", "lower", hasLower);
        toggleReqItem("passwordRequirements", "number", hasNum);
        toggleReqItem("passwordRequirements", "spec", hasSpec);

        if(hasLen) score++;
        if(hasUpper && hasLower) score++;
        if(hasNum) score++;
        if(hasSpec) score++;

        // مؤشر القوة
        if(val.length === 0) {
            strengthBar.style.width = "0%";
            strengthText.textContent = "ضعيفة";
            strengthBar.style.backgroundColor = "#dc3545";
        } else if(score <= 1) {
            strengthBar.style.width = "25%";
            strengthText.textContent = "ضعيفة";
            strengthBar.style.backgroundColor = "#dc3545";
        } else if(score === 2) {
            strengthBar.style.width = "50%";
            strengthText.textContent = "متوسطة";
            strengthBar.style.backgroundColor = "#ffc107";
        } else if(score === 3) {
            strengthBar.style.width = "75%";
            strengthText.textContent = "قوية";
            strengthBar.style.backgroundColor = "#0d6efd";
        } else if(score === 4) {
            strengthBar.style.width = "100%";
            strengthText.textContent = "قوية جداً";
            strengthBar.style.backgroundColor = "#198754";
        }
    });

    function checkPasswords() {
        if(!confirmPassword.value) { passFeedback.textContent = ""; return; }
        if(password.value === confirmPassword.value) {
            passFeedback.textContent = "🟢 كلمة المرور متطابقة";
            passFeedback.className = "match-feedback valid";
        } else {
            passFeedback.textContent = "🔴 كلمة المرور غير متطابقة";
            passFeedback.className = "match-feedback invalid";
        }
    }
    password.addEventListener("input", checkPasswords);
    confirmPassword.addEventListener("input", checkPasswords);


    // --- تحويل الحقول ديناميكياً بالمرحلة الثانية والثالثة ---
    
    const nationalitySelect = document.getElementById("nationality");
    const placeholderText = document.querySelector(".placeholder-text");
    const natAddressBlock = document.getElementById("nationalAddressBlock");
    const intAddressBlock = document.getElementById("internationalAddressBlock");

    nationalitySelect.addEventListener("change", function() {
        // إخفاء كافة الكتل أولاً
        document.querySelectorAll(".identity-block").forEach(b => b.classList.add("hidden"));
        if(placeholderText) placeholderText.classList.remove("hidden");

        const val = this.value;
        if(val) {
            if(placeholderText) placeholderText.classList.add("hidden");
        }

        // عرض كتلة الهوية المناسبة وتوزيع العناوين
        if(val === "SA") {
            document.getElementById("idBlockSaudi").classList.remove("hidden");
            natAddressBlock.classList.remove("hidden");
            intAddressBlock.classList.add("hidden");
        } else if(val === "RESIDENT") {
            document.getElementById("idBlockResident").classList.remove("hidden");
            natAddressBlock.classList.remove("hidden");
            intAddressBlock.classList.add("hidden");
        } else if(val === "GCC") {
            document.getElementById("idBlockGcc").classList.remove("hidden");
            intAddressBlock.classList.remove("hidden");
            natAddressBlock.classList.add("hidden");
        } else if(val === "FOREIGN") {
            document.getElementById("idBlockForeign").classList.remove("hidden");
            intAddressBlock.classList.remove("hidden");
            natAddressBlock.classList.add("hidden");
        }
    });

    // مراقبة اختيار نوع وثيقة الأجنبي
    document.querySelectorAll('input[name="foreignDocType"]').forEach(radio => {
        radio.addEventListener("change", function() {
            document.querySelectorAll(".foreign-sub-block").forEach(sb => sb.classList.add("hidden"));
            if(this.value === "national_id") {
                document.getElementById("foreignIdSubBlock").classList.remove("hidden");
            } else if(this.value === "passport") {
                document.getElementById("foreignPassportSubBlock").classList.remove("hidden");
            }
        });
    });


    // --- التحكم بالإقرارات والموافقة الكلية في المرحلة الرابعة ---
    
    const masterAcceptAll = document.getElementById("masterAcceptAll");
    const termsCheckboxes = document.querySelectorAll(".terms-checkbox");

    masterAcceptAll.addEventListener("change", function() {
        termsCheckboxes.forEach(cb => {
            cb.checked = this.checked;
        });
    });

    termsCheckboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            const allChecked = Array.from(termsCheckboxes).every(c => c.checked);
            masterAcceptAll.checked = allChecked;
        });
    });


    // --- دالات مساعدة (Helper Functions) ---
    
    function toggleReqItem(parentID, dataReqAttr, isValid) {
        const item = document.querySelector(`#${parentID} .req-item[data-req="${dataReqAttr}"]`);
        if(item) {
            if(isValid) {
                item.classList.add("valid");
                item.querySelector("i").className = "fas fa-check-circle";
            } else {
                item.classList.remove("valid");
                item.querySelector("i").className = "fas fa-circle-notch";
            }
        }
    }

    function validateStep(step) {
        // هنا يمكنك بناء تحققات مخصصة إضافية لكل مرحلة قبل الانتقال للمرحلة التالية
        // كمثال أساسي للمرحلة الأولى: التأكد من ملء المدخلات ومطابقتها للشروط.
        if (step === 1) {
            if(!usernameInput.value || !email.value || !password.value || password.value !== confirmPassword.value || email.value !== confirmEmail.value) {
                alert("يرجى التأكد من تعبئة الحقول الأساسية بشكل صحيح ومطابقة البيانات.");
                return false;
            }
        }
        if (step === 2) {
            const dec1 = document.getElementById("declarationAge").checked;
            const dec2 = document.getElementById("declarationBeneficiary").checked;
            if(!nationalitySelect.value || !dec1 || !dec2) {
                alert("يرجى استكمال البيانات الشخصية والموافقة على إقرارات السن والمستفيد.");
                return false;
            }
        }
        return true;
    }

    // معالجة الإرسال النهائي لإنشاء الحساب
    document.getElementById("registerMultiStepForm").addEventListener("submit", function(e) {
        e.preventDefault();
        
        // التحقق من موافقة كافة الشروط في المرحلة الرابعة والأخيرة
        const allTermsAccepted = Array.from(termsCheckboxes).every(c => c.checked);
        if(!allTermsAccepted) {
            alert("يجب قراءة والموافقة على جميع الإقرارات والاتفاقيات لإكمال عملية التسجيل.");
            return;
        }

        // تنفيذ خطة سير العمل بعد إنشاء الحساب بنجاح:
        alert("تم إنشاء الحساب الأولي بنجاح! سيتم إرسال رمز التحقق OTP إلى بريدك الإلكتروني.");
        
        // التوجيه إلى صفحة الـ OTP لتفعيل الحساب ثم الانتقال لملف استكمال البيانات اللاحقة
        window.location.href = "../verify-otp.html";
    });
});
