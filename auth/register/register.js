/**
 * بوابة الشركاء - منصة تيرا
 * نظام التحقق الفوري الصارم وقفل الأقسام البرمجي (مرحلتين فقط)
 */

// محاكاة البيانات المستخدمة مسبقاً لمنع التكرار الفوري حيّاً
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
    
    // فحص أولي لتثبيت قفل النظام
    executeGlobalStageValidator();
});

function initStageNavigation() {
    const nextBtn = document.getElementById("action-next-btn");
    const prevBtn = document.getElementById("action-prev-btn");

    nextBtn.addEventListener("click", function() {
        if (isCurrentStageValid(currentStage)) {
            if (currentStage < totalStages) {
                currentStage++;
                renderStageView(currentStage);
            }
        } else {
            triggerStageVisualErrors(currentStage);
        }
    });

    prevBtn.addEventListener("click", function() {
        if (currentStage > 1) {
            currentStage--;
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

function executeGlobalStageValidator() {
    const isS1Valid = isCurrentStageValid(1);
    const isS2Valid = isCurrentStageValid(2);

    // تحديث مؤشرات صندوق التحقق النهائي في المرحلة الثانية حرفياً
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

function isCurrentStageValid(stage) {
    if (stage === 1) return validateStage1Logic();
    if (stage === 2) return validateStage2Logic();
    return false;
}

// -------------------------------------------------------------
// محرك وتدقيق المرحلة الأولى بالبيانات المضافة (الاسم والجوال العربي والخليجي)
// -------------------------------------------------------------
function bindRealtimeStage1() {
    const nameArInput = document.getElementById("fullname_ar");
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const cemailInput = document.getElementById("confirm_email");
    const mobileInput = document.getElementById("mobile_number");
    const passwordInput = document.getElementById("password");
    const cpasswordInput = document.getElementById("confirm_password");

    nameArInput.addEventListener("input", () => { validateArabicName(); executeGlobalStageValidator(); });
    usernameInput.addEventListener("input", () => { validateUsernameField(); executeGlobalStageValidator(); });
    emailInput.addEventListener("input", () => { validateEmailFields(); executeGlobalStageValidator(); });
    cemailInput.addEventListener("input", () => { validateEmailFields(); executeGlobalStageValidator(); });
    passwordInput.addEventListener("input", () => { validatePasswordFields(); executeGlobalStageValidator(); });
    cpasswordInput.addEventListener("input", () => { validatePasswordFields(); executeGlobalStageValidator(); });

    // تصفية وتنسيق رقم الجوال فورياً ومنع الصفر الأول وحذفه تلقائياً
    mobileInput.addEventListener("input", function() {
        let val = mobileInput.value.replace(/\D/g, ''); // أرقام فقط
        if (val.startsWith('0')) {
            val = val.substring(1); // حذف الصفر الأول تلقائياً
        }
        mobileInput.value = val;
        
        const isMobValid = val.length >= 8 && val.length <= 11;
        updateRuleMarker('mob-rule-format', isMobValid);
        document.getElementById("mobile-status").textContent = isMobValid ? "✅" : "❌";
        
        executeGlobalStageValidator();
    });

    document.getElementById("show-password").addEventListener("change", function(e) {
        passwordInput.type = e.target.checked ? "text" : "password";
    });
    document.getElementById("show-cpassword").addEventListener("change", function(e) {
        cpasswordInput.type = e.target.checked ? "text" : "password";
    });
}

function validateArabicName() {
    const val = document.getElementById("fullname_ar").value;
    const rule = document.getElementById("nar-rule-char");
    const status = document.getElementById("name_ar-status");
    const err = document.getElementById("name_ar-error");

    // قبول الأحرف العربية والمسافات فقط ومنع الرموز والأرقام تماماً
    const isArabicOnly = /^[\u0600-\u06FF\s]+$/.test(val) && !/[0-9]/.test(val);
    
    if (isArabicOnly && val.trim().length > 3) {
        rule.className = "valid"; rule.innerHTML = "✅ أحرف عربية فقط"; status.textContent = "✅"; err.textContent = "";
        return true;
    } else {
        rule.className = "invalid"; rule.innerHTML = "❌ أحرف عربية فقط (لا يقبل الأرقام والرموز الخاصة)"; status.textContent = "❌";
        if(val.length > 0) err.textContent = "يجب إدخال الاسم باللغة العربية فقط بدون أرقام أو رموز.";
        return false;
    }
}

function validateUsernameField() {
    const val = document.getElementById("username").value;
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
        err.textContent = ""; status.textContent = "✅"; return true;
    } else {
        status.textContent = "❌";
        if (!rUnique && val.length > 0) err.textContent = "اسم المستخدم مستخدم مسبقاً.";
        return false;
    }
}

function validateEmailFields() {
    const email = document.getElementById("email").value;
    const cemail = document.getElementById("confirm_email").value;
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
    
    if (rValid && rUnique && rMatch) {
        cemailStatus.textContent = "✅"; cemailError.textContent = ""; return true;
    } else {
        cemailStatus.textContent = "❌";
        if (cemail.length > 0 && !rMatch) cemailError.textContent = "البريد الإلكتروني وتأكيد البريد الإلكتروني غير متطابقين.";
        return false;
    }
}

function validatePasswordFields() {
    const p = document.getElementById("password").value;
    const cp = document.getElementById("confirm_password").value;
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
    
    const weakWords = ['12345678', 'password', 'qwerty'];
    const rWeak = !weakWords.includes(p.toLowerCase());

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

    if (rMatch && score >= 3) {
        cpStatus.textContent = "✅"; cpError.textContent = ""; return true;
    } else {
        cpStatus.textContent = "❌";
        if (cp.length > 0 && !rMatch) cpError.textContent = "❌ كلمة المرور وتأكيد كلمة المرور غير متطابقين";
        return false;
    }
}

function validateStage1Logic() {
    const isNameValid = validateArabicName();
    const isUserValid = validateUsernameField();
    const isEmailValid = validateEmailFields();
    const isPassValid = validatePasswordFields();
    
    const mobVal = document.getElementById("mobile_number").value;
    const isMobValid = mobVal.length >= 8 && mobVal.length <= 11;

    return isNameValid && isUserValid && isEmailValid && isPassValid && isMobValid;
}

// -------------------------------------------------------------
// محرك المرحلة الثانية: الإقرارات والاتفاقيات فقط
// -------------------------------------------------------------
function bindStage2Agreements() {
    const masterBox = document.getElementById("master-global-agree");
    const subCheckboxes = document.querySelectorAll(".agreement-checkbox-item");

    masterBox.addEventListener("change", function(e) {
        subCheckboxes.forEach(cb => cb.checked = e.target.checked);
        executeGlobalStageValidator();
    });

    subCheckboxes.forEach(cb => {
        cb.addEventListener("change", function() {
            const allChecked = Array.from(subCheckboxes).every(c => c.checked);
            masterBox.checked = allChecked;
            executeGlobalStageValidator();
        });
    });
}

function validateStage2Logic() {
    const subCheckboxes = document.querySelectorAll(".agreement-checkbox-item");
    if(subCheckboxes.length === 0) return false;
    const allChecked = Array.from(subCheckboxes).every(c => c.checked);
    const masterChecked = document.getElementById("master-global-agree").checked;
    return allChecked && masterChecked;
}

function updateRuleMarker(elementId, isValid) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let text = el.innerHTML.replace(/^[❌✅⚠️]\s*/, '');
    if (isValid) {
        el.className = "valid"; el.innerHTML = `✅ ${text}`;
    } else {
        el.className = "invalid"; el.innerHTML = `❌ ${text}`;
    }
}

function triggerStageVisualErrors(stage) {
    if (stage === 1) {
        validateArabicName();
        validateUsernameField();
        validateEmailFields();
        validatePasswordFields();
        alert("📋 لا يمكن الانتقال إلى مرحلة الإقرارات حتى تتحول جميع متطلبات البيانات الأساسية ورقم الجوال والاسم باللون الأخضر.");
    }
}

function submitForm() {
    if (validateStage1Logic() && validateStage2Logic()) {
        alert("🎉 تم إنشاء حساب الشريك بنجاح! جاري إرسال رمز التحقق (OTP) إلى بريدك الإلكتروني.");
    }
}
