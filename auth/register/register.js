document.addEventListener("DOMContentLoaded", function () {
    
    // المجموعات الجغرافية المحددة للتحقق والدول
    const gccCountries = [
        { name: "الإمارات العربية المتحدة", code: "+971" },
        { name: "مملكة البحرين", code: "+973" },
        { name: "سلطنة عمان", code: "+968" },
        { name: "دولة قطر", code: "+974" },
        { name: "دولة الكويت", code: "+965" }
    ];

    const arabCountries = [
        { name: "مصر", code: "+20" },
        { name: "الأردن", code: "+962" },
        { name: "المغرب", code: "+212" },
        { name: "الجزائر", code: "+213" },
        { name: "تونس", code: "+216" },
        { name: "العراق", code: "+964" },
        { name: "اليمن", code: "+967" },
        { name: "السودان", code: "+249" },
        { name: "لبنان", code: "+961" },
        { name: "سوريا", code: "+963" },
        { name: "ليبيا", code: "+218" },
        { name: "فلسطين", code: "+970" }
    ];

    // تغذية القوائم المنسدلة الأولية للهويات
    document.querySelectorAll(".gcc-country-select").forEach(select => {
        select.innerHTML = '<option value="">اختر الدولة الخليجية</option>';
        gccCountries.forEach(c => select.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    });

    document.querySelectorAll(".arab-country-select").forEach(select => {
        select.innerHTML = '<option value="">اختر الدولة العربية</option>';
        arabCountries.forEach(c => select.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    });

    // --- حظر وتصفية لغة الإدخال في الأسماء بشكل صارم وحي ---
    const fullNameAr = document.getElementById("fullNameAr");
    const fullNameEn = document.getElementById("fullNameEn");

    // الاسم العربي: يقبل فقط الحروف العربية والمسافات
    fullNameAr.addEventListener("input", function() {
        this.value = this.value.replace(/[^\u0600-\u06FF\s]/g, "");
    });

    // الاسم الإنجليزي: يقبل فقط الحروف الإنجليزية والمسافات
    fullNameEn.addEventListener("input", function() {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
    });


    // --- محرك إظهار / إخفاء كلمات المرور ---
    document.querySelectorAll(".toggle-password").forEach(button => {
        button.addEventListener("click", function() {
            const targetId = this.getAttribute("data-target");
            const inputField = document.getElementById(targetId);
            
            if (inputField.type === "password") {
                inputField.type = "text";
                this.innerText = "إخفاء";
            } else {
                inputField.type = "password";
                this.innerText = "إظهار";
            }
        });
    });


    // --- إدارة ديناميكية مفاتيح الاتصال والدول بالمرحلة الثالثة ---
    const nationalityType = document.getElementById("nationalityType");
    const countryCodeContainer = document.getElementById("countryCodeContainer");
    const intlAddressCountry = document.getElementById("intlAddressCountry");
    const mobileInput = document.getElementById("mobileNumber");

    // فحص منع الصفر في بداية رقم الجوال عند الإدخال
    mobileInput.addEventListener("input", function() {
        if(this.value.startsWith("0")) {
            this.value = this.value.substring(1);
        }
    });

    function updateCommunicationAndAddressLogic(type) {
        // تفريغ وتجهيز الحاوية الخاصة بمفتاح الاتصال
        countryCodeContainer.innerHTML = '<label>مفتاح الدولة</label>';

        if (type === "saudi" || type === "resident") {
            // مواطن أو مقيم: تثبيت مفتاح السعودية +966
            countryCodeContainer.innerHTML += `<input type="text" id="countryCode" value="+966" readonly style="background: #e9ecef; cursor: not-allowed;">`;
            
            if (type === "resident") {
                // المقيم تظهر له الدول العربية في عنوانه الدولي إن لزم
                fillSelectWithOptions(intlAddressCountry, arabCountries, "اختر الدولة العربية");
            }
        } 
        else if (type === "gcc") {
            // مواطن خليجي: قائمة مفاتيح دول الخليج فقط
            let selectHtml = `<select id="countryCode" required><option value="">اختر</option>`;
            gccCountries.forEach(c => { selectHtml += `<option value="${c.code}">${c.code} (${c.name})</option>`; });
            selectHtml += `</select>`;
            countryCodeContainer.innerHTML += selectHtml;

            // تغذية سيكشن العناوين بدول الخليج فقط
            fillSelectWithOptions(intlAddressCountry, gccCountries, "اختر الدولة الخليجية");
        } 
        else if (type === "foreigner") {
            // أجنبي: قائمة مفاتيح الدول العربية فقط
            let selectHtml = `<select id="countryCode" required><option value="">اختر</option>`;
            arabCountries.forEach(c => { selectHtml += `<option value="${c.code}">${c.code} (${c.name})</option>`; });
            selectHtml += `</select>`;
            countryCodeContainer.innerHTML += selectHtml;

            // تغذية سيكشن العناوين بالدول العربية فقط
            fillSelectWithOptions(intlAddressCountry, arabCountries, "اختر الدولة العربية");
        }
    }

    function fillSelectWithOptions(selectElement, list, placeholder) {
        if(!selectElement) return;
        selectElement.innerHTML = `<option value="">${placeholder}</option>`;
        list.forEach(c => { selectElement.innerHTML += `<option value="${c.name}">${c.name}</option>`; });
    }


    // --- بقية منطق المراحل والمزامنة كما هي مسبقاً مع دمج التحديثات العلوية ---
    const dynamicIdSection = document.getElementById("dynamic-identity-section");
    const addrSaudiResident = document.getElementById("address-saudi-resident");
    const addrInternational = document.getElementById("address-international");

    nationalityType.addEventListener("change", function() {
        const type = this.value;
        
        // تشغيل نظام المفاتيح المحدث فوراً
        updateCommunicationAndAddressLogic(type);

        dynamicIdSection.classList.add("hidden");
        document.querySelectorAll(".nationality-fields").forEach(el => el.classList.add("hidden"));
        document.querySelectorAll(".nationality-fields input, .nationality-fields select").forEach(el => el.removeAttribute("required"));

        if(type) {
            dynamicIdSection.classList.remove("hidden");
            const targetFields = document.getElementById(`fields-${type}`);
            targetFields.classList.remove("hidden");
            targetFields.querySelectorAll("input, select").forEach(el => el.setAttribute("required", "true"));
        }

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

    // سيلكتور التحكم الخطي بالمراحل الـ 4
    let currentStep = 1;
    const totalSteps = 4;
    const form = document.getElementById("registrationForm");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");

    function updateStepUI() {
        document.querySelectorAll(".form-step-section").forEach(sec => sec.classList.remove("active"));
        document.getElementById(`step${currentStep}`).classList.add("active");

        document.querySelectorAll(".steps-indicator .step").forEach(step => {
            const stepNum = parseInt(step.getAttribute("data-step"));
            step.classList.toggle("active", stepNum <= currentStep);
        });

        prevBtn.classList.toggle("hidden", currentStep === 1);
        if (currentStep === totalSteps) {
            nextBtn.classList.add("hidden");
            submitBtn.classList.remove("hidden");
        } else {
            nextBtn.classList.remove("hidden");
            submitBtn.classList.add("hidden");
        }
    }

    nextBtn.addEventListener("click", () => {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) { currentStep++; updateStepUI(); }
        }
    });

    prevBtn.addEventListener("click", () => {
        if (currentStep > 1) { currentStep--; updateStepUI(); }
    });

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

        if (step === 1) {
            const userValid = !section.querySelectorAll(".validation-box li.invalid").length;
            const emailMatch = document.getElementById("email").value === document.getElementById("confirmEmail").value;
            const passMatch = document.getElementById("password").value === document.getElementById("confirmPassword").value;
            if(!userValid || !emailMatch || !passMatch) isValid = false;
        }
        return isValid;
    }

    // شروط وتحقق المرحلة الأولى الحية
    const usernameInput = document.getElementById("username");
    usernameInput.addEventListener("input", function() {
        const val = this.value;
        document.getElementById("u-length").className = (val.length >= 4 && val.length <= 20) ? "valid" : "invalid";
        document.getElementById("u-chars").className = /^[a-zA-Z0-9]+$/.test(val) ? "valid" : "invalid";
        document.getElementById("u-spaces").className = (!val.includes(" ") && val.length > 0) ? "valid" : "invalid";
        document.getElementById("u-specials").className = /^[a-zA-Z0-9\s]*$/.test(val) ? "valid" : "invalid";
    });

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

    const masterCheck = document.getElementById("masterAgreementCheck");
    const individualChecks = document.querySelectorAll(".agreement-check");

    masterCheck.addEventListener("change", function() { individualChecks.forEach(ch => ch.checked = this.checked); });
    individualChecks.forEach(ch => {
        ch.addEventListener("change", function() {
            masterCheck.checked = Array.from(individualChecks).every(c => c.checked);
        });
    });

    form.addEventListener("submit", function(e) {
        e.preventDefault();
        if(!validateStep(4)) { alert("يرجى الموافقة على الإقرارات للمتابعة."); return; }
        document.getElementById("otpModal").classList.remove("hidden");
    });

    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    const otpInput = document.getElementById("otpInput");
    const completeLaterSection = document.getElementById("completeLaterSection");

    verifyOtpBtn.addEventListener("click", () => {
        if(otpInput.value.length === 4) {
            completeLaterSection.classList.remove("hidden");
            verifyOtpBtn.classList.add("hidden");
            otpInput.setAttribute("disabled", "true");
        } else {
            alert("أدخل رمز التحقق المكون من 4 أرقام.");
        }
    });

    document.getElementById("completeLaterBtn").addEventListener("click", () => {
        window.location.href = "../complete-profile.html";
    });
});
