document.addEventListener("DOMContentLoaded", function() {
    'use strict';
    
    // --- إعدادات معالجة المراحل المتعددة (Multi-step Controller) ---
    let currentStep = 1;
    const totalSteps = 4;

    const btnNext = document.getElementById("btnNext");
    const btnPrev = document.getElementById("btnPrev");
    const btnSubmit = document.getElementById("btnSubmit");

    function updateStepUI() {
        // تحديث ظهور كتل المراحل
        document.querySelectorAll(".form-step-content").forEach(step => step.classList.remove("active"));
        const currentStepEl = document.getElementById(`step${currentStep}`);
        if (currentStepEl) currentStepEl.classList.add("active");

        // تحديث شريط الخطوات العلوي
        document.querySelectorAll(".step-item").forEach(item => {
            const stepNum = parseInt(item.getAttribute("data-step"), 10);
            if (stepNum <= currentStep) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // تعديل ظهور الأزرار - حماية ضد الـ null
        if (btnPrev) {
            if (currentStep === 1) {
                btnPrev.classList.add("hidden");
            } else {
                btnPrev.classList.remove("hidden");
            }
        }

        if (btnNext && btnSubmit) {
            if (currentStep === totalSteps) {
                btnNext.classList.add("hidden");
                btnSubmit.classList.remove("hidden");
            } else {
                btnNext.classList.remove("hidden");
                btnSubmit.classList.add("hidden");
            }
        }
        
        // تمرير شريط الخطوات تلقائياً في الجوال ليبقى العميل مطلعاً على مرحلته الحالية
        const stepsContainer = document.querySelector(".registration-steps");
        const activeStepItem = document.querySelector(".step-item.active");
        if (stepsContainer && activeStepItem && window.innerWidth <= 768) {
            stepsContainer.scrollTo({
                left: activeStepItem.offsetLeft - (stepsContainer.offsetWidth / 2),
                behavior: 'smooth'
            });
        }
    }

    if (btnNext) {
        btnNext.addEventListener("click", () => {
            if (validateStep(currentStep)) {
                currentStep++;
                updateStepUI();
            }
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener("click", () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepUI();
            }
        });
    }


    // --- تحققات المرحلة الأولى (اسم المستخدم والبريد وكلمة المرور) ---
    
    const usernameInput = document.getElementById("username");
    if (usernameInput) {
        usernameInput.addEventListener("input", function() {
            const val = this.value;
            
            // يقبل حروف عربية، إنجليزية، أرقام، وشرطة سفلية
            const allowedChars = /^[a-zA-Z0-9_\u0600-\u06FF]*$/.test(val) && val !== "";
            
            toggleReqItem("usernameRequirements", "length", val.length >= 4 && val.length <= 20);
            toggleReqItem("usernameRequirements", "chars", allowedChars);
            toggleReqItem("usernameRequirements", "spaces", !/\s/.test(val));
            toggleReqItem("usernameRequirements", "special", !/[~`@#$%^&*()\-+={[}\]|\\:;"'<,>.?\/]/.test(val));
            toggleReqItem("usernameRequirements", "unique", val !== "admin" && val !== "tera_user");
        });
    }

    const email = document.getElementById("email");
    const confirmEmail = document.getElementById("confirmEmail");
    const emailFeedback = document.getElementById("emailMatchFeedback");

    function checkEmails() {
        if (!email || !confirmEmail || !emailFeedback) return;
        if (!confirmEmail.value) { emailFeedback.textContent = ""; return; }
        if (email.value.trim().toLowerCase() === confirmEmail.value.trim().toLowerCase()) {
            emailFeedback.textContent = "🟢 البريد الإلكتروني متطابق";
            emailFeedback.className = "match-feedback valid";
        } else {
            emailFeedback.textContent = "🔴 البريد الإلكتروني غير متطابق";
            emailFeedback.className = "match-feedback invalid";
        }
    }
    if (email) email.addEventListener("input", checkEmails);
    if (confirmEmail) confirmEmail.addEventListener("input", checkEmails);

    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const passFeedback = document.getElementById("passwordMatchFeedback");
    const strengthBar = document.querySelector(".meter-bar");
    const strengthText = document.getElementById("strengthText");

    if (password) {
        password.addEventListener("input", function() {
            const val = this.value;
            let score = 0;

            const hasLen = val.length >= 8;
            // التحقق من وجود حروف (سواء عربية أو إنجليزية) دون إجبار على حالة الأحرف الكبيرة والصغيرة الإنجليزية
            const hasLetters = /[a-zA-Z\u0600-\u06FF]/.test(val); 
            const hasNum = /[0-9]/.test(val);
            const hasSpec = /[~`@#$%^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(val);

            // نحدث الواجهة الرسومية بناءً على القواعد الجديدة المرنة لتيرا
            toggleReqItem("passwordRequirements", "len", hasLen);
            toggleReqItem("passwordRequirements", "upper", hasLetters); // يعامل كحروف أساسية شاملة
            toggleReqItem("passwordRequirements", "lower", true);       // تجاوز تلقائي مدعوم بالكامل للتوافق العربي
            toggleReqItem("passwordRequirements", "number", hasNum);
            toggleReqItem("passwordRequirements", "spec", hasSpec);

            if (hasLen) score++;
            if (hasLetters) score += 2; // إعطاء وزن أعلى لتواجد الحروف بشتى أنواعها
            if (hasNum) score++;
            if (hasSpec) score++;

            if (!strengthBar || !strengthText) return;

            // حساب مؤشر القوة المتكامل مع الألوان الفاخرة للواجهة
            if (val.length === 0) {
                strengthBar.style.width = "0%";
                strengthText.textContent = "ضعيفة";
                strengthBar.style.backgroundColor = "#dc3545";
            } else if (score <= 2) {
                strengthBar.style.width = "30%";
                strengthText.textContent = "ضعيفة";
                strengthBar.style.backgroundColor = "#dc3545";
            } else if (score === 3) {
                strengthBar.style.width = "60%";
                strengthText.textContent = "متوسطة";
                strengthBar.style.backgroundColor = "#ffc107";
            } else if (score === 4) {
                strengthBar.style.width = "85%";
                strengthText.textContent = "قوية";
                strengthBar.style.backgroundColor = "#4169e1"; // أزرق ملكي
            } else if (score >= 5) {
                strengthBar.style.width = "100%";
                strengthText.textContent = "قوية جداً";
                strengthBar.style.backgroundColor = "#008080"; // تيال تيرا الأساسي
            }
        });
    }

    function checkPasswords() {
        if (!password || !confirmPassword || !passFeedback) return;
        if (!confirmPassword.value) { passFeedback.textContent = ""; return; }
        if (password.value === confirmPassword.value) {
            passFeedback.textContent = "🟢 كلمة المرور متطابقة";
            passFeedback.className = "match-feedback valid";
        } else {
            passFeedback.textContent = "🔴 كلمة المرور غير متطابقة";
            passFeedback.className = "match-feedback invalid";
        }
    }
    if (password) password.addEventListener("input", checkPasswords);
    if (confirmPassword) confirmPassword.addEventListener("input", checkPasswords);


    // --- تحويل الحقول ديناميكياً بالمرحلة الثانية والثالثة ---
    
    const nationalitySelect = document.getElementById("nationality");
    const placeholderText = document.querySelector(".placeholder-text");
    const natAddressBlock = document.getElementById("nationalAddressBlock");
    const intAddressBlock = document.getElementById("internationalAddressBlock");

    if (nationalitySelect) {
        nationalitySelect.addEventListener("change", function() {
            document.querySelectorAll(".identity-block").forEach(b => b.classList.add("hidden"));
            if (placeholderText) placeholderText.classList.remove("hidden");

            const val = this.value;
            if (val) {
                if (placeholderText) placeholderText.classList.add("hidden");
            }

            if (val === "SA") {
                const el = document.getElementById("idBlockSaudi");
                if (el) el.classList.remove("hidden");
                if (natAddressBlock) natAddressBlock.classList.remove("hidden");
                if (intAddressBlock) intAddressBlock.classList.add("hidden");
            } else if (val === "RESIDENT") {
                const el = document.getElementById("idBlockResident");
                if (el) el.classList.remove("hidden");
                if (natAddressBlock) natAddressBlock.classList.remove("hidden");
                if (intAddressBlock) intAddressBlock.classList.add("hidden");
            } else if (val === "GCC") {
                const el = document.getElementById("idBlockGcc");
                if (el) el.classList.remove("hidden");
                if (intAddressBlock) intAddressBlock.classList.remove("hidden");
                if (natAddressBlock) natAddressBlock.classList.add("hidden");
            } else if (val === "FOREIGN") {
                const el = document.getElementById("idBlockForeign");
                if (el) el.classList.remove("hidden");
                if (intAddressBlock) intAddressBlock.classList.remove("hidden");
                if (natAddressBlock) natAddressBlock.classList.add("hidden");
            }
        });
    }

    document.querySelectorAll('input[name="foreignDocType"]').forEach(radio => {
        radio.addEventListener("change", function() {
            document.querySelectorAll(".foreign-sub-block").forEach(sb => sb.classList.add("hidden"));
            if (this.value === "national_id") {
                const el = document.getElementById("foreignIdSubBlock");
                if (el) el.classList.remove("hidden");
            } else if (this.value === "passport") {
                const el = document.getElementById("foreignPassportSubBlock");
                if (el) el.classList.remove("hidden");
            }
        });
    });


    // --- التحكم بالإقرارات والموافقة الكلية في المرحلة الرابعة ---
    
    const masterAcceptAll = document.getElementById("masterAcceptAll");
    const termsCheckboxes = document.querySelectorAll(".terms-checkbox");

    if (masterAcceptAll) {
        masterAcceptAll.addEventListener("change", function() {
            termsCheckboxes.forEach(cb => {
                cb.checked = this.checked;
            });
        });
    }

    termsCheckboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            const allChecked = Array.from(termsCheckboxes).every(c => c.checked);
            if (masterAcceptAll) masterAcceptAll.checked = allChecked;
        });
    });


    // --- دالات مساعدة (Helper Functions) ---
    
    function toggleReqItem(parentID, dataReqAttr, isValid) {
        const item = document.querySelector(`#${parentID} .req-item[data-req="${dataReqAttr}"]`);
        if (item) {
            const icon = item.querySelector("i");
            if (isValid) {
                item.classList.add("valid");
                if (icon) icon.className = "fas fa-check-circle";
            } else {
                item.substring ? item.classList.remove("valid") : item.classList.remove("valid");
                if (icon) icon.className = "fas fa-circle-notch";
            }
        }
    }

    // استبدال تفجير النوافذ التقليدي بنظام التنبيه الديناميكي لتيرا
    function triggerUINotification(msg, type = 'warning') {
        if (typeof TeraUI !== 'undefined' && TeraUI.showAlert) {
            TeraUI.showAlert(msg, type);
        } else {
            alert(msg); // حماية تراجعية متدنية فقط إن لم يكن السكربت الأول قد تم تضمينه
        }
    }

    function validateStep(step) {
        if (step === 1) {
            if (!usernameInput?.value || !email?.value || !password?.value || password.value !== confirmPassword?.value || email.value.trim().toLowerCase() !== confirmEmail?.value.trim().toLowerCase()) {
                triggerUINotification("يرجى التأكد من تعبئة الحقول الأساسية بشكل صحيح ومطابقة البيانات.", "danger");
                return false;
            }
            // فحص إضافي للتأكد من استيفاء المتطلبات الأساسية لاسم المستخدم وكلمة المرور
            if (password.value.length < 8 || usernameInput.value.length < 4) {
                triggerUINotification("لم يتم استيفاء شروط القوة المحددة لبيانات الاعتماد الذاتية.", "warning");
                return false;
            }
        }
        if (step === 2) {
            const dec1 = document.getElementById("declarationAge")?.checked;
            const dec2 = document.getElementById("declarationBeneficiary")?.checked;
            if (!nationalitySelect?.value || !dec1 || !dec2) {
                triggerUINotification("يرجى استكمال البيانات الشخصية والموافقة على إقرارات السن والمستفيد المالي.", "warning");
                return false;
            }
        }
        return true;
    }

    // معالجة الإرسال النهائي لإنشاء الحساب تزامناً مع البنية التحتية
    const form = document.getElementById("registerMultiStepForm");
    if (form) {
        form.addEventListener("submit", function(e) {
            e.preventDefault();
            
            const allTermsAccepted = Array.from(termsCheckboxes).every(c => c.checked);
            if (!allTermsAccepted) {
                triggerUINotification("يجب قراءة والموافقة على جميع الإقرارات والاتفاقيات الاستثمارية لإكمال عملية التسجيل.", "warning");
                return;
            }

            triggerUINotification("تم إنشاء الحساب الأولي بنجاح! جاري تحويلك لصفحة الـ OTP لتأكيد الهوية...", "success");
            
            setTimeout(() => {
                window.location.href = "../verify-otp.html";
            }, 2000);
        });
    }
});
