/**
 * بوابة الشركاء - منصة تيرا
 * نظام التحقق الفوري الحصري والمعزز بقنوات تنبيه مركزية لمنع التخطي التلقائي
 */

const mockedUsedData = {
    usernames: ['mohammed', 'tera_partner', 'admin_saleh'],
    emails: ['test@tera.sa', 'info@itqan.plus']
};

let currentStage = 1;
const totalStages = 2;

document.addEventListener("DOMContentLoaded", function() {
    initStageNavigation();
    bindRealtimeStage1();
    bindStage2Agreements();
    bindPasswordVisibilityToggle(); // إظهار الكلمات بشكل مضمون وموثوق
    
    // تشغيل أولي لمنع التخطي العشوائي للأزرار
    executeGlobalStageValidator();
});

function initStageNavigation() {
    const nextBtn = document.getElementById("action-next-btn");
    const prevBtn = document.getElementById("action-prev-btn");

    nextBtn.addEventListener("click", function() {
        if (currentStage === 1) {
            // فحص إجباري وصارم وصريح للمرحلة الأولى
            const isS1Valid = validateStage1Logic();
            if (isS1Valid) {
                currentStage = 2;
                renderStageView(currentStage);
            } else {
                // إطلاق التنبيه المركزي وقنوات التظليل للأطر فورا
                triggerStageVisualErrors(1);
            }
        }
    });

    prevBtn.addEventListener("click", function() {
        if (currentStage > 1) {
            currentStage = 1;
            renderStageView(currentStage);
        }
    });
}

function renderStageView(stage) {
    for (let i = 1; i <= totalStages; i++) {
        const contentBlock = document.getElementById(`stage-${i}-content`);
        const stepIndicator = document.getElementById(`step-${i}`);
        
        if (i === stage) {
            contentBlock.classList.add("active");
            stepIndicator.classList.add("active");
        } else {
            contentBlock.classList.remove("active");
            stepIndicator.classList.remove("active");
        }
        
        if (i < stage) {
            stepIndicator.classList.add("completed-green");
        } else if (i >= stage) {
            stepIndicator.classList.remove("completed-green");
        }
    }

    const prevBtn = document.getElementById("action-prev-btn");
    prevBtn.style.visibility = stage === 1 ? "hidden" : "visible";

    const nextBtn = document.getElementById("action-next-btn");
    const submitBtn = document.getElementById("action-submit-btn");

    if (stage === totalStages) {
        nextBtn.style.display = "none";
        submitBtn.style.display = "inline-block";
    } else {
        nextBtn.style.display = "inline-block";
        submitBtn.style.display = "none";
    }

    executeGlobalStageValidator();
}

// معالجة وإظهار كلمات المرور بشكل منفصل ومحمي من الانهيار
function bindPasswordVisibilityToggle() {
    const showPasswordCheck = document.getElementById("show-password");
    const showCPasswordCheck = document.getElementById("show-cpassword");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm_password");

    if (showPasswordCheck && passwordInput) {
        showPasswordCheck.addEventListener("click", function() {
            passwordInput.type = this.checked ? "text" : "password";
        });
    }

    if (showCPasswordCheck && confirmPasswordInput) {
        showCPasswordCheck.addEventListener("click", function() {
            confirmPasswordInput.type = this.checked ? "text" : "password";
        });
    }
}

function executeGlobalStageValidator() {
    const isS1Valid = validateStage1Logic();
    const isS2Valid = validateStage2Logic();

    updateRuleMarker('f-rule-stages', isS1Valid);
    updateRuleMarker('f-rule-reqs', isS1Valid);
    updateRuleMarker('f-rule-email', isS1Valid); 
    updateRuleMarker('f-rule-user', isS1Valid);
    updateRuleMarker('f-rule-errors', !document.querySelector('.error-feedback-msg:not(:empty)'));
    updateRuleMarker('f-rule-ready', isS1Valid && isS2Valid);
    updateRuleMarker('f-rule-otp', isS1Valid && isS2Valid);

    const submitBtn = document.getElementById("action-submit-btn");
    if (isS1Valid && isS2Valid) {
        submitBtn.removeAttribute("disabled");
    } else {
        submitBtn.setAttribute("disabled", "true");
    }
}

function bindRealtimeStage1() {
    const nameArInput = document.getElementById("fullname_ar");
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const cemailInput = document.getElementById("confirm_email");
    const mobileInput = document.getElementById("mobile_number");
    const passwordInput = document.getElementById("password");
    const cpasswordInput = document.getElementById("confirm_password");

    // فحص وتطهير حقل الاسم العربي حياً ومنع الأحرف الإنجليزية والرموز فوراً
    nameArInput.addEventListener("input", function() {
        let cleanVal = this.value.replace(/[a-zA-Z0-90-9~`!@#$%\^&*()_\-+={[}\]|\\:;"'<,>.?\/]/g, '');
        if (this.value !== cleanVal) {
            this.value = cleanVal; // مسح وإزالة الحرف الإنجليزي أو الرقم في نفس اللحظة
        }
        validateArabicName();
        executeGlobalStageValidator();
    });

    usernameInput.addEventListener("input", () => { validateUsernameField(); executeGlobalStageValidator(); });
    emailInput.addEventListener("input", () => { validateEmailFields(); executeGlobalStageValidator(); });
    cemailInput.addEventListener("input", () => { validateEmailFields(); executeGlobalStageValidator(); });
    passwordInput.addEventListener("input", () => { validatePasswordFields(); executeGlobalStageValidator(); });
    cpasswordInput.addEventListener("input", () => { validatePasswordFields(); executeGlobalStageValidator(); });

    // الفحص الصارم لرقم الجوال وحظر وحذف الصفر الأول تلقائياً حياً
    mobileInput.addEventListener("input", function() {
        let val = this.value.replace(/\D/g, ''); // أرقام فقط
        while (val.startsWith('0')) {
            val = val.substring(1); // طرد وحذف الصفر الأول تماماً ومباشرة
        }
        this.value = val;
        
        const isMobValid = val.length >= 8 && val.length <= 11;
        updateRuleMarker('mob-rule-format', isMobValid);
        document.getElementById("mobile-status").textContent = isMobValid ? "✅" : "❌";
        
        const inputControl = document.getElementById("mobile_number");
        if(isMobValid) {
            inputControl.classList.remove("is-field-invalid"); inputControl.classList.add("is-field-valid");
        } else {
            inputControl.classList.remove("is-field-valid"); inputControl.classList.add("is-field-invalid");
        }
        
        executeGlobalStageValidator();
    });
}

function validateArabicName() {
    const inputControl = document.getElementById("fullname_ar");
    const val = inputControl.value;
    const rule = document.getElementById("nar-rule-char");
    const status = document.getElementById("name_ar-status");
    const err = document.getElementById("name_ar-error");

    const isArabicOnly = /^[\u0600-\u06FF\s]+$/.test(val);
    
    if (isArabicOnly && val.trim().length > 3) {
        if (rule) { rule.className = "valid"; const mk = rule.querySelector('.icon-marker'); if(mk) mk.innerHTML = "✅"; }
        status.textContent = "✅"; err.textContent = "";
        inputControl.classList.remove("is-field-invalid"); inputControl.classList.add("is-field-valid");
        return true;
    } else {
        if (rule) { rule.className = "invalid"; const mk = rule.querySelector('.icon-marker'); if(mk) mk.innerHTML = "❌"; }
        status.textContent = "❌";
        inputControl.classList.remove("is-field-valid"); inputControl.classList.add("is-field-invalid");
        if(val.length > 0) err.textContent = "يجب إدخال الاسم باللغة العربية فقط (4 خانات فأكثر) بدون أرقام أو رموز.";
        return false;
    }
}

function validateUsernameField() {
    const inputControl = document.getElementById("username");
    const val = inputControl.value;
    const err = document.getElementById("username-error");
    const status = document.getElementById("username-status");

    const rLen = val.length >= 4 && val.length <= 20;
    const rStart = /^[a-zA-Z]/.test(val);
    const rChar = /[a-zA-Z]/.test(val);
    const rNum = /^[a-zA-Z0-9]*$/.test(val); 
    const rSpace = !/\s/.test(val);
    const rSpecial = !/[~`!@#$%\^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(val);
    const rUnique = !mockedUsedData.usernames.includes(val.toLowerCase());

    updateRuleMarker('u-rule-len', rLen);
    updateRuleMarker('u-rule-start', rStart);
    updateRuleMarker('u-rule-char', rChar);
    updateRuleMarker('u-rule-num', rNum);
    updateRuleMarker('u-rule-space', rSpace);
    updateRuleMarker('u-rule-special', rSpecial);
    updateRuleMarker('u-rule-unique', rUnique && val.length > 0);

    if (rLen && rStart && rChar && rNum && rSpace && rSpecial && rUnique) {
        err.textContent = ""; status.textContent = "✅";
        inputControl.classList.remove("is-field-invalid"); inputControl.classList.add("is-field-valid");
        return true;
    } else {
        status.textContent = "❌";
        inputControl.classList.remove("is-field-valid"); inputControl.classList.add("is-field-invalid");
        if (!rUnique && val.length > 0) err.textContent = "اسم المستخدم مستخدم مسبقاً.";
        return false;
    }
}

function validateEmailFields() {
    const emailControl = document.getElementById("email");
    const cemailControl = document.getElementById("confirm_email");
    const email = emailControl.value;
    const cemail = cemailControl.value;
    const emailStatus = document.getElementById("email-status");
    const cemailStatus = document.getElementById("cemail-status");
    const cemailError = document.getElementById("cemail-error");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rValid = emailRegex.test(email);
    const rUnique = !mockedUsedData.emails.includes(email.toLowerCase());
    const rMatch = (email === cemail) && cemail.length > 0;

    updateRuleMarker('e-rule-valid', rValid);
    updateRuleMarker('e-rule-unique', rUnique && email.length > 0);
    updateRuleMarker('e-rule-match', rMatch);

    emailStatus.textContent = (rValid && rUnique) ? "✅" : "❌";
    if(rValid && rUnique) { emailControl.classList.add("is-field-valid"); emailControl.classList.remove("is-field-invalid"); }
    else { emailControl.classList.add("is-field-invalid"); emailControl.classList.remove("is-field-valid"); }
    
    if (rValid && rUnique && rMatch) {
        cemailStatus.textContent = "✅"; cemailError.textContent = "";
        cemailControl.classList.remove("is-field-invalid"); cemailControl.classList.add("is-field-valid");
        return true;
    } else {
        cemailStatus.textContent = "❌";
        cemailControl.classList.remove("is-field-valid"); cemailControl.classList.add("is-field-invalid");
        if (cemail.length > 0 && !rMatch) cemailError.textContent = "البريد الإلكتروني وتأكيد البريد الإلكتروني غير متطابقين.";
        return false;
    }
}

function validatePasswordFields() {
    const passControl = document.getElementById("password");
    const cpassControl = document.getElementById("confirm_password");
    const p = passControl.value;
    const cp = cpassControl.value;
    const u = document.getElementById("username").value;
    const e = document.getElementById("email").value;

    const pStatus = document.getElementById("password-status");
    const cpStatus = document.getElementById("cpassword-status");
    const cpError = document.getElementById("cpassword-error");

    const rLen = p.length >= 8;
    const rUpper = /[A-Z]/.test(p);
    const rLower = /[a-z]/.test(p);
    const rNum = /[0-9]/.test(p);
    const rSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p);
    const rSpace = !/\s/.test(p);
    const rUser = u.length > 0 ? !p.includes(u) : true;
    const rEmail = e.length > 0 ? !p.includes(e.split('@')[0]) : true;
    
    let rRepeat = true;
    for (let i = 0; i < p.length - 3; i++) {
        if (p[i] === p[i+1] && p[i] === p[i+2] && p[i] === p[i+3]) { rRepeat = false; break; }
    }
    const rWeak = !['12345678', 'password', 'qwerty'].includes(p.toLowerCase());

    updateRuleMarker('p-rule-len', rLen);
    updateRuleMarker('p-rule-upper', rUpper);
    updateRuleMarker('p-rule-lower', rLower);
    updateRuleMarker('p-rule-num', rNum);
    updateRuleMarker('p-rule-special', rSpecial);
    updateRuleMarker('p-rule-space', rSpace);
    updateRuleMarker('p-rule-user', rUser);
    updateRuleMarker('p-rule-email', rEmail);
    updateRuleMarker('p-rule-repeat', rRepeat);
    updateRuleMarker('p-rule-weak', rWeak);

    let score = 0;
    if (rLen) score++;
    if (rUpper && rLower) score++;
    if (rNum && rSpecial) score++;
    if (rRepeat && rWeak && rSpace) score++;

    const strengthText = document.getElementById("strength-indicator-text");
    const strengthFill = document.getElementById("strength-bar-fill");

    if (p.length === 0 || score <= 1) {
        strengthText.className = "strength-red"; strengthText.textContent = "🔴 ضعيفة"; strengthFill.style.width = "25%"; strengthFill.style.background = "#E25950";
    } else if (score === 2) {
        strengthText.className = "strength-orange"; strengthText.textContent = "🟠 متوسطة"; strengthFill.style.width = "50%"; strengthFill.style.background = "#FFC000";
    } else if (score === 3) {
        strengthText.className = "strength-green"; strengthText.textContent = "🟢 قوية"; strengthFill.style.width = "75%"; strengthFill.style.background = "#00AA50";
    } else if (score === 4) {
        strengthText.className = "strength-double-green"; strengthText.textContent = "🟢🟢 قوية جداً"; strengthFill.style.width = "100%"; strengthFill.style.background = "#00D46A";
    }

    const rMatch = (p === cp) && cp.length > 0;
    updateRuleMarker('p-rule-match', rMatch);

    pStatus.textContent = (score >= 3) ? "✅" : "❌";
    if(score >= 3) { passControl.classList.add("is-field-valid"); passControl.classList.remove("is-field-invalid"); }
    else { passControl.classList.add("is-field-invalid"); passControl.classList.remove("is-field-valid"); }

    if (rMatch && score >= 3) {
        cpStatus.textContent = "✅"; cpError.textContent = "";
        cpassControl.classList.remove("is-field-invalid"); cpassControl.classList.add("is-field-valid");
        return true;
    } else {
        cpStatus.textContent = "❌";
        cpassControl.classList.remove("is-field-valid"); cpassControl.classList.add("is-field-invalid");
        return false;
    }
}

function validateStage1Logic() {
    const n = validateArabicName();
    const u = validateUsernameField();
    const e = validateEmailFields();
    const p = validatePasswordFields();
    const m = document.getElementById("mobile_number").value.length >= 8;
    return n && u && e && p && m;
}

function bindStage2Agreements() {
    const masterBox = document.getElementById("master-global-agree");
    const subCheckboxes = document.querySelectorAll(".agreement-checkbox-item");

    if(masterBox) {
        masterBox.addEventListener("change", function() {
            subCheckboxes.forEach(cb => cb.checked = this.checked);
            executeGlobalStageValidator();
        });
    }
    subCheckboxes.forEach(cb => {
        cb.addEventListener("change", function() {
            if(masterBox) masterBox.checked = Array.from(subCheckboxes).every(c => c.checked);
            executeGlobalStageValidator();
        });
    });
}

function validateStage2Logic() {
    const subCheckboxes = document.querySelectorAll(".agreement-checkbox-item");
    if(subCheckboxes.length === 0) return false;
    const allChecked = Array.from(subCheckboxes).every(c => c.checked);
    const masterBox = document.getElementById("master-global-agree");
    return allChecked && (masterBox ? masterBox.checked : false);
}

function updateRuleMarker(elementId, isValid) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const marker = el.querySelector('.icon-marker');
    if (isValid) {
        el.className = "valid"; if (marker) marker.innerHTML = "✅";
    } else {
        el.className = "invalid"; if (marker) marker.innerHTML = "❌";
    }
}

// بناء وتفعيل لوحة الإشعار التنبيهية في منتصف الشاشة وتظليل النواقص بالأحمر
function triggerStageVisualErrors(stage) {
    if (stage === 1) {
        const errorList = document.getElementById("centralModalErrorList");
        errorList.innerHTML = ""; // تصفية السجل القديم
        
        if (!validateArabicName()) errorList.innerHTML += "<li>الاسم الكامل (يجب أن يكون باللغة العربية وصحيحًا)</li>";
        if (document.getElementById("mobile_number").value.length < 8) errorList.innerHTML += "<li>رقم الجوال (تأكد من إدخال رقم صحيح بدون الصفر الأول)</li>";
        if (!validateEmailFields()) errorList.innerHTML += "<li>البريد الإلكتروني وتأكيد المطابقة</li>";
        if (!validateUsernameField()) errorList.innerHTML += "<li>اسم المستخدم (أحرف إنجليزية، من 4 إلى 20 خانة)</li>";
        if (!validatePasswordFields()) errorList.innerHTML += "<li>كلمة المرور (تأكد من قوتها ومطابقتها التامة)</li>";
        
        // إظهار المودال بالمنتصف تماماً
        document.getElementById("centralErrorModal").style.display = "flex";
    }
}

function closeCentralModal() {
    document.getElementById("centralErrorModal").style.display = "none";
}

function submitForm() {
    if (validateStage1Logic() && validateStage2Logic()) {
        alert("🎉 تم إنشاء حساب الشريك بنجاح! جاري إرسال رمز التحقق (OTP) إلى بريدك الإلكتروني.");
    }
}
