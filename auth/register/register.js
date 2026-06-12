/**
 * بوابة الشركاء - منصة تيرا
 * نظام التحقق الفوري الصارم وقفل الأقسام البرمجي
 */

// بيانات محاكاة لإستخدام الـ Unique API الخاص بتيرا للتأكد من عدم استخدام الحساب مسبقاً حياً
const mockedUsedData = {
    usernames: ['mohammed', 'tera_partner', 'admin_saleh'],
    emails: ['test@tera.sa', 'info@itqan.plus'],
    identities: ['1023456789', '2023456789']
};

let currentStage = 1;
const totalStages = 4;

// عند تحميل الصفحة بالكامل يبدأ النظام بربط الأحداث حياً الحقل تلو الآخر
document.addEventListener("DOMContentLoaded", function() {
    initStageNavigation();
    bindRealtimeStage1();
    bindRealtimeStage2Base();
    bindRealtimeStage3Base();
    bindStage4Agreements();
    
    // فحص أولي لقفل الأزرار والتحقق
    executeGlobalStageValidator();
});

// إعداد وتنظيم التنقل ومراقبة قفل الأقسام المباشر
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
            // إظهار تنبيه أو سبب الخطأ أسفل الحقل فوراً عند المحاولة الخاطئة
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
    // تحديث الأقسام المرئية
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
        
        // تلوين المراحل المكتملة سابقاً بالأخضر لتأكيد النجاح
        if (i < stage) {
            stepIndicator.classList.add("completed-green");
        } else if (i >= stage) {
            stepIndicator.classList.remove("completed-green");
        }
    }

    // إدارة ظهور زر السابق
    const prevBtn = document.getElementById("action-prev-btn");
    prevBtn.style.visibility = stage === 1 ? "hidden" : "visible";

    // إدارة ظهور زر التالي وزر الإرسال النهائي
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

// الدالة المركزية والمسؤولة عن قفل أو تفعيل زر "التالي" بناء على اكتمال شروط المرحلة تماماً
function executeGlobalStageValidator() {
    const isS1Valid = isCurrentStageValid(1);
    const isS2Valid = isCurrentStageValid(2);
    const isS3Valid = isCurrentStageValid(3);
    const isS4Valid = isCurrentStageValid(4);

    // تحديث مؤشرات التحقق النهائي بالمرحلة الرابعة حرفياً حياً
    updateRuleMarker('f-rule-stages', isS1Valid && isS2Valid && isS3Valid);
    updateRuleMarker('f-rule-reqs', isS1Valid && isS2Valid && isS3Valid);
    updateRuleMarker('f-rule-email', isS1Valid); 
    updateRuleMarker('f-rule-user', isS1Valid);
    updateRuleMarker('f-rule-id', isS2Valid);
    updateRuleMarker('f-rule-errors', !document.querySelector('.error-feedback-msg:not(:empty)'));
    updateRuleMarker('f-rule-ready', isS1Valid && isS2Valid && isS3Valid && isS4Valid);
    updateRuleMarker('f-rule-otp', isS1Valid && isS2Valid && isS3Valid && isS4Valid);

    const submitBtn = document.getElementById("action-submit-btn");
    if (isS1Valid && isS2Valid && isS3Valid && isS4Valid) {
        submitBtn.removeAttribute("disabled");
    } else {
        submitBtn.setAttribute("disabled", "true");
    }
}

function isCurrentStageValid(stage) {
    if (stage === 1) return validateStage1Logic();
    if (stage === 2) return validateStage2Logic();
    if (stage === 3) return validateStage3Logic();
    if (stage === 4) return validateStage4Logic();
    return false;
}

// -------------------------------------------------------------
// محرك المرحلة الأولى: التحقق الحي الفوري لإنشاء الحساب
// -------------------------------------------------------------
function bindRealtimeStage1() {
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const cemailInput = document.getElementById("confirm_email");
    const passwordInput = document.getElementById("password");
    const cpasswordInput = document.getElementById("confirm_password");

    usernameInput.addEventListener("input", () => { validateUsernameField(); executeGlobalStageValidator(); });
    emailInput.addEventListener("input", () => { validateEmailFields(); executeGlobalStageValidator(); });
    cemailInput.addEventListener("input", () => { validateEmailFields(); executeGlobalStageValidator(); });
    passwordInput.addEventListener("input", () => { validatePasswordFields(); executeGlobalStageValidator(); });
    cpasswordInput.addEventListener("input", () => { validatePasswordFields(); executeGlobalStageValidator(); });

    // تفعيل مربعات الإظهار والإخفاء
    document.getElementById("show-password").addEventListener("change", function(e) {
        passwordInput.type = e.target.checked ? "text" : "password";
    });
    document.getElementById("show-cpassword").addEventListener("change", function(e) {
        cpasswordInput.type = e.target.checked ? "text" : "password";
    });
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
        err.textContent = "";
        status.textContent = "✅";
        return true;
    } else {
        status.textContent = "❌";
        if (!rUnique && val.length > 0) err.textContent = "اسم المستخدم مستخدم مسبقاً.";
        else err.textContent = "يوجد متطلبات غير مستوفاة في اسم المستخدم.";
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
        cemailStatus.textContent = "✅";
        cemailError.textContent = "";
        return true;
    } else {
        cemailStatus.textContent = "❌";
        if (cemail.length > 0 && !rMatch) cemailError.textContent = "البريد الإلكتروني وتأكيد البريد الإلكتروني غير متطابقين.";
        else cemailError.textContent = "يرجى التحقق من صياغة البريد الإلكتروني وعدم تكراره.";
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
    
    // التحقق من تكرار أكثر من 3 أحرف أو أرقام متتالية
    let rRepeat = true;
    for (let i = 0; i < p.length - 3; i++) {
        if (p[i] === p[i+1] && p[i] === p[i+2] && p[i] === p[i+3]) { rRepeat = false; break; }
        if (p.charCodeAt(i)+1 === p.charCodeAt(i+1) && p.charCodeAt(i)+2 === p.charCodeAt(i+2) && p.charCodeAt(i)+3 === p.charCodeAt(i+3)) { rRepeat = false; break; }
    }
    
    const weakWords = ['12345678', 'password', 'password123', 'qwerty', 'marhaba'];
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

    // حساب ومؤشر القوة المكتوب حرفياً بالنموذج
    let score = 0;
    if (rLen) score++;
    if (rUpper && rLower) score++;
    if (rNum && rSpecial) score++;
    if (rRepeat && rWeak && rSpace) score++;

    const strengthText = document.getElementById("strength-indicator-text");
    const strengthFill = document.getElementById("strength-bar-fill");

    if (p.length === 0) {
        strengthText.className = "strength-red"; strengthText.textContent = "🔴 ضعيفة"; strengthFill.style.width = "25%"; strengthFill.style.background = "#E25950";
    } else if (score <= 1) {
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
        cpStatus.textContent = "✅";
        cpError.textContent = "";
        return true;
    } else {
        cpStatus.textContent = "❌";
        if (cp.length > 0 && !rMatch) cpError.textContent = "❌ كلمة المرور وتأكيد كلمة المرور غير متطابقين";
        else cpError.textContent = "متطلبات كلمة المرور ناقصة أو غير متطابقة.";
        return false;
    }
}

function validateStage1Logic() {
    return validateUsernameField() && validateEmailFields() && validatePasswordFields();
}

// -------------------------------------------------------------
// محرك المرحلة الثانية: المعلومات الشخصية والهوية الديناميكية حياً
// -------------------------------------------------------------
function bindRealtimeStage2Base() {
    const nameAr = document.getElementById("fullname_ar");
    const nameEn = document.getElementById("fullname_en");
    
    nameAr.addEventListener("input", () => { validateArabicName(); executeGlobalStageValidator(); });
    nameEn.addEventListener("input", () => { validateEnglishName(); executeGlobalStageValidator(); });

    document.querySelectorAll('input[name="gender"]').forEach(radio => {
        radio.addEventListener("change", () => {
            document.getElementById("gender-status").textContent = "✅";
            executeGlobalStageValidator();
        });
    });

    document.querySelectorAll('input[name="category"]').forEach(radio => {
        radio.addEventListener("change", function(e) {
            document.getElementById("category-status").textContent = "✅";
            buildDynamicIdentityAndAddressFields(e.target.value);
            executeGlobalStageValidator();
        });
    });
}

function validateArabicName() {
    const val = document.getElementById("fullname_ar").value;
    const rule = document.getElementById("nar-rule-char");
    const status = document.getElementById("name_ar-status");
    const err = document.getElementById("name_ar-error");

    const isArabicOnly = /^[\u0600-\u06FF\s]+$/.test(val) && !/[0-9]/.test(val);
    
    if (isArabicOnly && val.trim().length > 3) {
        rule.className = "valid"; rule.innerHTML = "✅ أحرف عربية فقط"; status.textContent = "✅"; err.textContent = "";
        return true;
    } else {
        rule.className = "invalid"; rule.innerHTML = "❌ أحرف عربية فقط (لا يقبل الأرقام والرموز الخاصة)"; status.textContent = "❌";
        err.textContent = "يجب إدخال الاسم باللغة العربية الصحيحة فقط بدون أرقام.";
        return false;
    }
}

function validateEnglishName() {
    const val = document.getElementById("fullname_en").value;
    const rule = document.getElementById("nen-rule-char");
    const status = document.getElementById("name_en-status");
    const err = document.getElementById("name_en-error");

    const isEnglishOnly = /^[a-zA-Z\s]+$/.test(val) && !/[0-9]/.test(val);
    
    if (isEnglishOnly && val.trim().length > 3) {
        rule.className = "valid"; rule.innerHTML = "✅ أحرف إنجليزية فقط"; status.textContent = "✅"; err.textContent = "";
        return true;
    } else {
        rule.className = "invalid"; rule.innerHTML = "❌ أحرف إنجليزية فقط (لا يقبل الأرقام والرموز الخاصة)"; status.textContent = "❌";
        err.textContent = "يجب إدخال الاسم باللغة الإنجليزية الصحيحة فقط بدون أرقام.";
        return false;
    }
}

// بناء حقول الهوية وحقول العناوين كاملة وحرفياً بالنموذج
function buildDynamicIdentityAndAddressFields(cat) {
    const identityContainer = document.getElementById("dynamic-identity-container");
    const summaryBox = document.getElementById("identity-validation-summary-box");
    summaryBox.style.display = "block";

    let idHtml = "";
    if (cat === "saudi") {
        idHtml = `
            <div class="form-field-group">
                <label class="field-label">رقم الهوية الوطنية <span class="required">*</span></label>
                <input type="text" id="id_number" class="form-input-control" placeholder="1XXXXXXXXX" maxlength="10">
            </div>
            <div class="row-flex">
                <div class="col-6"><div class="form-field-group"><label class="field-label">تاريخ إصدار الهوية <span class="required">*</span></label><input type="date" id="id_issue_date" class="form-input-control"></div></div>
                <div class="col-6"><div class="form-field-group"><label class="field-label">تاريخ انتهاء الهوية <span class="required">*</span></label><input type="date" id="id_expiry_date" class="form-input-control"></div></div>
            </div>`;
        configureCountryCodeField("fixed", "+966", "🇸🇦 السعودية +966");
        buildNationalAddressForm();
    } else if (cat === "resident") {
        idHtml = `
            <div class="form-field-group"><label class="field-label">الجنسية <span class="required">*</span></label><input type="text" id="id_nationality" class="form-input-control"></div>
            <div class="form-field-group"><label class="field-label">المهنة <span class="required">*</span></label><input type="text" id="id_job" class="form-input-control"></div>
            <div class="form-field-group"><label class="field-label">رقم الإقامة <span class="required">*</span></label><input type="text" id="id_number" class="form-input-control" placeholder="2XXXXXXXXX" maxlength="10"></div>
            <div class="row-flex">
                <div class="col-6"><div class="form-field-group"><label class="field-label">تاريخ إصدار الإقامة <span class="required">*</span></label><input type="date" id="id_issue_date" class="form-input-control"></div></div>
                <div class="col-6"><div class="form-field-group"><label class="field-label">تاريخ انتهاء الإقامة <span class="required">*</span></label><input type="date" id="id_expiry_date" class="form-input-control"></div></div>
            </div>`;
        configureCountryCodeField("fixed", "+966", "🇸🇦 السعودية +966");
        buildNationalAddressForm();
    } else if (cat === "gcc") {
        idHtml = `
            <div class="form-field-group"><label class="field-label">الدولة <span class="required">*</span></label><input type="text" id="id_country" class="form-input-control"></div>
            <div class="form-field-group"><label class="field-label">رقم الهوية الخليجية <span class="required">*</span></label><input type="text" id="id_number" class="form-input-control"></div>
            <div class="row-flex">
                <div class="col-6"><div class="form-field-group"><label class="field-label">تاريخ الإصدار <span class="required">*</span></label><input type="date" id="id_issue_date" class="form-input-control"></div></div>
                <div class="col-6"><div class="form-field-group"><label class="field-label">تاريخ الانتهاء <span class="required">*</span></label><input type="date" id="id_expiry_date" class="form-input-control"></div></div>
            </div>`;
        configureCountryCodeField("select", [
            {code: "+966", label: "السعودية +966"}, {code: "+971", label: "الإمارات +971"},
            {code: "+965", label: "الكويت +965"}, {code: "+973", label: "البحرين +973"},
            {code: "+968", label: "عمان +968"}, {code: "+974", label: "قطر +974"}
        ]);
        buildGlobalAddressForm();
    } else if (cat === "foreigner") {
        idHtml = `
            <div class="form-field-group">
                <label class="field-label">نوع الوثيقة <span class="required">*</span></label>
                <div class="radio-options-flex">
                    <label class="radio-inline"><input type="radio" name="doc_type" value="الهوية الوطنية" checked> الهوية الوطنية</label>
                    <label class="radio-inline"><input type="radio" name="doc_type" value="جواز السفر"> جواز السفر</label>
                </div>
            </div>
            <div class="form-field-group"><label class="field-label">الدولة <span class="required">*</span></label><input type="text" id="id_country" class="form-input-control"></div>
            <div class="form-field-group"><label class="field-label">رقم الوثيقة <span class="required">*</span></label><input type="text" id="id_number" class="form-input-control"></div>
            <div class="row-flex">
                <div class="col-6"><div class="form-field-group"><label class="field-label">تاريخ الإصدار <span class="required">*</span></label><input type="date" id="id_issue_date" class="form-input-control"></div></div>
                <div class="col-6"><div class="form-field-group"><label class="field-label">تاريخ الانتهاء <span class="required">*</span></label><input type="date" id="id_expiry_date" class="form-input-control"></div></div>
            </div>
            <div class="form-field-group"><label class="field-label">الجنسية <span class="required">*</span></label><input type="text" id="id_nationality" class="form-input-control"></div>
            <div class="form-field-group"><label class="field-label">المهنة <span class="required">*</span></label><input type="text" id="id_job" class="form-input-control"></div>`;
        configureCountryCodeField("select", [
            {code: "+20", label: "مصر +20"}, {code: "+962", label: "الأردن +962"},
            {code: "+964", label: "العراق +964"}, {code: "+961", label: "لبنان +961"},
            {code: "+212", label: "المغرب +212"}, {code: "+213", label: "الجزائر +213"},
            {code: "+216", label: "تونس +216"}
        ]);
        buildGlobalAddressForm();
    }

    identityContainer.innerHTML = idHtml;

    // ربط الأحداث للحقول الجديدة فوراً للتحقق الحي
    document.getElementById("id_number").addEventListener("input", validateIdentityDataGroup);
    document.getElementById("id_issue_date").addEventListener("change", validateIdentityDataGroup);
    document.getElementById("id_expiry_date").addEventListener("change", validateIdentityDataGroup);
    
    if(document.getElementById("id_nationality")) document.getElementById("id_nationality").addEventListener("input", validateIdentityDataGroup);
    if(document.getElementById("id_job")) document.getElementById("id_job").addEventListener("input", validateIdentityDataGroup);
    if(document.getElementById("id_country")) document.getElementById("id_country").addEventListener("input", validateIdentityDataGroup);
}

function validateIdentityDataGroup() {
    const idNum = document.getElementById("id_number").value;
    const issueVal = document.getElementById("id_issue_date").value;
    const expiryVal = document.getElementById("id_expiry_date").value;

    const rDigits = /^[0-9]+$/.test(idNum) && idNum.length >= 6;
    const rDates = issueVal !== "" && expiryVal !== "";
    
    let rExpiry = false;
    if (rDates) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const expiryDate = new Date(expiryVal);
        rExpiry = expiryDate > today;
    }

    const rUnique = !mockedUsedData.identities.includes(idNum);

    updateRuleMarker('id-rule-valid', rDigits);
    updateRuleMarker('id-rule-dates', rDates);
    updateRuleMarker('id-rule-expiry', rExpiry);
    updateRuleMarker('id-rule-unique', rUnique && idNum.length > 0);

    executeGlobalStageValidator();
}

function validateStage2Logic() {
    const baseNames = validateArabicName() && validateEnglishName();
    const genderChecked = document.querySelector('input[name="gender"]:checked') !== null;
    const catRadio = document.querySelector('input[name="category"]:checked');
    
    if (!baseNames || !genderChecked || !catRadio) return false;

    // التأكد من استيفاء شروط صندوق الهوية الفرعي بالكامل
    const idNum = document.getElementById("id_number") ? document.getElementById("id_number").value : "";
    const issueVal = document.getElementById("id_issue_date") ? document.getElementById("id_issue_date").value : "";
    const expiryVal = document.getElementById("id_expiry_date") ? document.getElementById("id_expiry_date").value : "";

    const rDigits = /^[0-9]+$/.test(idNum) && idNum.length >= 6;
    const rDates = issueVal !== "" && expiryVal !== "";
    let rExpiry = false;
    if (rDates) { rExpiry = new Date(expiryVal) > new Date(); }
    const rUnique = !mockedUsedData.identities.includes(idNum);

    return rDigits && rDates && rExpiry && rUnique;
}

// -------------------------------------------------------------
// محرك المرحلة الثالثة: بيانات التواصل والعناوين الوطنية الشاملة حياً
// -------------------------------------------------------------
function configureCountryCodeField(type, data, displayLabel) {
    const displayInput = document.getElementById("country_code_display");
    const selectEl = document.getElementById("country_code_select");

    if (type === "fixed") {
        displayInput.style.display = "block";
        displayInput.value = displayLabel;
        selectEl.style.display = "none";
    } else {
        displayInput.style.display = "none";
        selectEl.style.display = "block";
        selectEl.innerHTML = data.map(item => `<option value="${item.code}">${item.label}</option>`).join('');
    }
}

function bindRealtimeStage3Base() {
    const mobile = document.getElementById("mobile_number");
    mobile.addEventListener("input", function() {
        let val = mobile.value.replace(/\D/g, ''); // أرقام فقط حياً
        if (val.startsWith('0')) {
            val = val.substring(1); // حذف الصفر الأول تلقائياً نظامياً
        }
        mobile.value = val;
        
        const isMobValid = val.length >= 8 && val.length <= 11;
        updateRuleMarker('mob-rule-format', isMobValid);
        document.getElementById("mobile-status").textContent = isMobValid ? "✅" : "❌";
        
        executeGlobalStageValidator();
    });

    document.querySelectorAll('input[name="contact_method"]').forEach(radio => {
        radio.addEventListener("change", function() {
            document.getElementById("contact-pref-status").textContent = "✅";
            updateRuleMarker('addr-rule-pref', true);
            executeGlobalStageValidator();
        });
    });
}

// بناء نموذج العنوان الوطني الشامل والكامل حرفياً (تم إدراج الاسم المختصر)
function buildNationalAddressForm() {
    document.getElementById("address-section-title").textContent = "بيانات العنوان الوطني:";
    const container = document.getElementById("dynamic-address-container");
    container.innerHTML = `
        <div class="row-flex">
            <div class="col-4"><div class="form-field-group"><label class="field-label">رقم المبنى <span class="required">*</span></label><input type="text" id="addr_bld" class="form-input-control addr-field"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">الرقم الفرعي <span class="required">*</span></label><input type="text" id="addr_sub" class="form-input-control addr-field"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">اسم الشارع <span class="required">*</span></label><input type="text" id="addr_street" class="form-input-control addr-field"></div></div>
        </div>
        <div class="row-flex">
            <div class="col-4"><div class="form-field-group"><label class="field-label">الحي <span class="required">*</span></label><input type="text" id="addr_district" class="form-input-control addr-field"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">المدينة <span class="required">*</span></label><input type="text" id="addr_city" class="form-input-control addr-field"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">الرمز البريدي <span class="required">*</span></label><input type="text" id="addr_zip" class="form-input-control addr-field"></div></div>
        </div>
        <div class="row-flex">
            <div class="col-4"><div class="form-field-group"><label class="field-label">الرقم الإضافي <span class="required">*</span></label><input type="text" id="addr_additional" class="form-input-control addr-field"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">رقم الوحدة (اختياري)</label><input type="text" id="addr_unit" class="form-input-control"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">الاسم المختصر <span class="required">*</span></label><input type="text" id="addr_short" class="form-input-control addr-field"></div></div>
        </div>`;
    
    bindAddressFieldsRealtimeEvent();
}

function buildGlobalAddressForm() {
    document.getElementById("address-section-title").textContent = "بيانات العنوان:";
    const container = document.getElementById("dynamic-address-container");
    container.innerHTML = `
        <div class="row-flex">
            <div class="col-4"><div class="form-field-group"><label class="field-label">الدولة <span class="required">*</span></label><input type="text" id="addr_country" class="form-input-control addr-field"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">المحافظة <span class="required">*</span></label><input type="text" id="addr_gov" class="form-input-control addr-field"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">المدينة <span class="required">*</span></label><input type="text" id="addr_city" class="form-input-control addr-field"></div></div>
        </div>
        <div class="row-flex">
            <div class="col-4"><div class="form-field-group"><label class="field-label">الحي <span class="required">*</span></label><input type="text" id="addr_district" class="form-input-control addr-field"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">الشارع <span class="required">*</span></label><input type="text" id="addr_street" class="form-input-control addr-field"></div></div>
            <div class="col-4"><div class="form-field-group"><label class="field-label">الرمز البريدي <span class="required">*</span></label><input type="text" id="addr_zip" class="form-input-control addr-field"></div></div>
        </div>
        <div class="form-field-group"><label class="field-label">وصف إضافي <span class="required">*</span></label><textarea id="addr_desc" class="form-input-control addr-field" rows="2"></textarea></div>`;
        
    bindAddressFieldsRealtimeEvent();
}

function bindAddressFieldsRealtimeEvent() {
    document.querySelectorAll(".addr-field").forEach(field => {
        field.addEventListener("input", function() {
            let allFilled = true;
            document.querySelectorAll(".addr-field").forEach(f => {
                if(f.value.trim() === "") allFilled = false;
            });
            updateRuleMarker('addr-rule-fields', allFilled);
            executeGlobalStageValidator();
        });
    });
}

function validateStage3Logic() {
    const mobVal = document.getElementById("mobile_number").value;
    const isMobValid = mobVal.length >= 8 && mobVal.length <= 11;
    const prefChecked = document.querySelector('input[name="contact_method"]:checked') !== null;
    
    let addressFilled = true;
    const requiredAddrFields = document.querySelectorAll(".addr-field");
    if(requiredAddrFields.length === 0) addressFilled = false;
    requiredAddrFields.forEach(f => {
        if (f.value.trim() === "") addressFilled = false;
    });

    return isMobValid && prefChecked && addressFilled;
}

// -------------------------------------------------------------
// محرك المرحلة الرابعة: الإقرارات والاتفاقيات والمطابقة الكلية للنموذج
// -------------------------------------------------------------
function bindStage4Agreements() {
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

function validateStage4Logic() {
    const subCheckboxes = document.querySelectorAll(".agreement-checkbox-item");
    if(subCheckboxes.length === 0) return false;
    const allChecked = Array.from(subCheckboxes).every(c => c.checked);
    const masterChecked = document.getElementById("master-global-agree").checked;
    return allChecked && masterChecked;
}

// دالة مساعدة لتحديث حالة العلامات فوراً بلون أخضر أو أحمر حياً
function updateRuleMarker(elementId, isValid) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    // استخراج النص النظيف بدون العلامة القديمة لإعادة صياغته نظامياً
    let text = el.innerHTML;
    text = text.replace(/^[❌✅⚠️]\s*/, '');

    if (isValid) {
        el.className = "valid";
        el.innerHTML = `✅ ${text}`;
    } else {
        el.className = "invalid";
        el.innerHTML = `❌ ${text}`;
    }
}

// معالجة الأخطاء البصرية للمستخدم لمنعه من الانتقال وإبراز الحقول الناقصة فوراً
function triggerStageVisualErrors(stage) {
    if (stage === 1) {
        validateUsernameField();
        validateEmailFields();
        validatePasswordFields();
        alert("📋 لا يمكن الانتقال إلى المرحلة التالية حتى تتحول جميع المتطلبات الإلزامية باللون الأخضر.");
    } else if (stage === 2) {
        validateArabicName();
        validateEnglishName();
        alert("📋 يرجى استكمال البيانات الشخصية والتحقق من سريان الوثائق والتواريخ للانتقال.");
    } else if (stage === 3) {
        alert("📋 يرجى تعبئة كافة حقول العنوان المطلوبة وتحديد وسيلة التواصل للانتقال.");
    }
}

// إتمام عملية التسجيل النهائية لتيرا بنجاح
function submitForm() {
    if (isCurrentStageValid(1) && isCurrentStageValid(2) && isCurrentStageValid(3) && isCurrentStageValid(4)) {
        alert("🎉 تم إنشاء حساب شريك بنجاح! جاري إرسال رمز التحقق إلى بريدك الإلكتروني المسجل.");
        // window.location.href = "../verify-otp.html"; // مسار صفحة الأو تي بي المشتركة
    }
}
