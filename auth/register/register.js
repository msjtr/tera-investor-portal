/**
 * بوابة الشركاء - منصة تيرا
 * محرك التشغيل الصارم والتحقق الفوري ومنع التخطي (مرحلتين فقط)
 */

// محاكاة البيانات المستخدمة مسبقاً في نظام تيرا لمنع التكرار حياً
const mockedUsedData = {
    usernames: ['mohammed', 'tera_partner', 'admin_saleh'],
    emails: ['test@tera.sa', 'info@itqan.plus']
};

let currentStage = 1;
const totalStages = 2;

// تبدأ العمليات فور تحميل الصفحة بالكامل وارتباط عناصر الواجهة
document.addEventListener("DOMContentLoaded", function() {
    initStageNavigation();
    bindRealtimeStage1();
    bindStage2Agreements();
    bindPasswordVisibility(); // تشغيل ميزة إظهار وإخفاء كلمة المرور
    
    // فحص أولي لتثبيت قفل النظام ومنع التخطي التلقائي
    executeGlobalStageValidator();
});

// إدارة التنقل وحظر الانتقال للمرحلة التالية إلا بعد اكتمال الشروط
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

// تحديث المظهر البصري للمراحل والأزرار
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

// تفعيل ميزة إظهار وإخفاء كلمة المرور
function bindPasswordVisibility() {
    const showPasswordCheck = document.getElementById("show-password");
    const showCPasswordCheck = document.getElementById("show-cpassword");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm_password");

    if (showPasswordCheck && passwordInput) {
        showPasswordCheck.addEventListener("change", function() {
            passwordInput.type = this.checked ? "text" : "password";
        });
    }

    if (showCPasswordCheck && confirmPasswordInput) {
        showCPasswordCheck.addEventListener("change", function() {
            confirmPasswordInput.type = this.checked ? "text" : "password";
        });
    }
}

// الفحص المركزي العام لقفل أو تفعيل أزرار المتابعة وإنشاء الحساب
function executeGlobalStageValidator() {
    const isS1Valid = isCurrentStageValid(1);
    const isS2Valid = isCurrentStageValid(2);

    // تحديث مؤشرات لوحة التحقق النهائي الشاملة في المرحلة الثانية حرفياً حياً
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
// محرك وتدقيق المرحلة الأولى بالبيانات المحدثة والترتيب الجغرافي الحرفي
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

    // تنظيف وحذف الصفر الأول تلقائياً وقبول أرقام فقط حياً داخل الصندوق الإنشائي
    mobileInput.addEventListener("input", function() {
        let val = mobileInput.value.replace(/\D/g, ''); // أرقام فقط
        if (val.startsWith('0')) {
            val = val.substring(1); 
        }
        mobileInput.value = val;
        
        const isMobValid = val.length >= 8 && val.length <= 11;
        updateRuleMarker('mob-rule-format', isMobValid);
        document.getElementById("mobile-status").textContent = isMobValid ? "✅" : "❌";
        
        executeGlobalStageValidator();
    });
}

function validateArabicName() {
    const val = document.getElementById("fullname_ar").value;
    const rule = document.getElementById("nar-rule-char");
    const status = document.getElementById("name_ar-status");
    const err = document.getElementById("name_ar-error");

    const isArabicOnly = /^[\u0600-\u06FF\s]+$/.test(val) && !/[0-9]/.test(val);
    
    if (isArabicOnly && val.trim().length > 3) {
        if (rule) { rule.className = "valid"; const mk = rule.querySelector('.icon-marker'); if(mk) mk.innerHTML = "✅"; }
        status.textContent = "✅"; err.textContent = "";
        return true;
    } else {
        if (rule) { rule.className = "invalid"; const mk = rule.querySelector('.icon-marker'); if(mk) mk.innerHTML = "❌"; }
        status.textContent = "❌";
        if(val.length > 0) err.textContent = "يجب إدخال الاسم باللغة العربية الصحيحة فقط بدون أرقام أو رموز.";
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
        if (cemail.length > 0 && !rMatch) cemailError.textContent = "البريد الإلكتر
