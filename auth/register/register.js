/**
 * بوابة الشركاء - منصة تيرا
 * محرك التحقق اللحظي الصارم وحظر الملاحة وتصفية اللغات (مرحلتين فقط)
 * + تم الدمج مع نظام Supabase Auth و OTP
 */

// محاكاة البيانات المستخدمة مسبقاً في نظام تيرا لمنع التكرار حياً
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
    bindPasswordVisibilityToggle();
    
    // تشغيل فحص أولي لتثبيت الأيقونات كلها على الحمراء (❌) في البداية
    executeGlobalStageValidator();
});

function initStageNavigation() {
    const nextBtn = document.getElementById("action-next-btn");
    const prevBtn = document.getElementById("action-prev-btn");
    const modalCloseBtn = document.getElementById("modalCloseBtn");

    if (nextBtn) {
        nextBtn.addEventListener("click", function() {
            if (currentStage === 1) {
                const isS1Valid = validateStage1Logic();
                if (isS1Valid) {
                    currentStage = 2;
                    renderStageView(currentStage);
                } else {
                    triggerStageVisualErrors(1);
                }
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", function() {
            if (currentStage > 1) {
                currentStage = 1;
                renderStageView(currentStage);
            }
        });
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener("click", function() {
            document.getElementById("centralErrorModal").style.display = "none";
        });
    }
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
    if(prevBtn) prevBtn.style.visibility = stage === 1 ? "hidden" : "visible";

    const nextBtn = document.getElementById("action-next-btn");
    const submitBtn = document.getElementById("action-submit-btn");

    if(nextBtn && submitBtn) {
        if (stage === totalStages) {
            nextBtn.style.display = "none";
            submitBtn.style.display = "inline-block";
        } else {
            nextBtn.style.display = "inline-block";
            submitBtn.style.display = "none";
        }
    }
    executeGlobalStageValidator();
}

function bindPasswordVisibilityToggle() {
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
    if (submitBtn) {
        if (isS1Valid && isS2Valid) {
            submitBtn.removeAttribute("disabled");
        } else {
            submitBtn.setAttribute("disabled", "true");
        }
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

    if (nameArInput) {
        nameArInput.addEventListener("input", function() {
            this.value = this.value.replace(/[a-zA-Z0-9~`!@#$%\^&*()_\-+={[}\]|\\:;"'<,>.?\/]/g, '');
            validateArabicName();
            executeGlobalStageValidator();
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener("input", function() {
            this.value = this.value.replace(/[\u0600-\u06FF]/g, '');
            validateUsernameField();
            executeGlobalStageValidator();
        });
    }

    if (emailInput) {
        emailInput.addEventListener("input", function() {
            this.value = this.value.replace(/[\u0600-\u06FF]/g, '');
            validateEmailFields();
            executeGlobalStageValidator();
        });
    }

    if (cemailInput) {
        cemailInput.addEventListener("input", function() {
            this.value = this.value.replace(/[\u0600-\u06FF]/g, '');
            validateEmailFields();
            executeGlobalStageValidator();
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener("input", function() {
            this.value = this.value.replace(/[\u0600-\u06FF]/g, '');
            validatePasswordFields();
            executeGlobalStageValidator();
        });
    }

    if (cpasswordInput) {
        cpasswordInput.addEventListener("input", function() {
            this.value = this.value.replace(/[\u0600-\u06FF]/g, '');
            validatePasswordFields();
            executeGlobalStageValidator();
        });
    }

    if (mobileInput) {
        mobileInput.addEventListener("input", function() {
            let val = this.value.replace(/\D/g, '');
            while (val.startsWith('0')) { val = val.substring(1); }
            this.value = val;
            
            const isMobValid = val.length >= 8 && val.length <= 11;
            updateRuleMarker('mob-rule-format', isMobValid);
            document.getElementById("mobile-status").textContent = isMobValid ? "✅" : "❌";
            
            if(isMobValid) {
                this.classList.remove("is-field-invalid"); this.classList.add("is-field-valid");
            } else {
                this.classList.remove("is-field-valid"); this.classList.add("is-field-invalid");
            }
            executeGlobalStageValidator();
        });
    }
}

function validateArabicName() {
    const inputControl = document.getElementById("fullname_ar");
    if (!inputControl) return false;
    const val = inputControl.value;
    const rule = document.getElementById("nar-rule-char");
    const status = document.getElementById("name_ar-status");
    const err = document.getElementById("name_ar-error");

    const isArabicOnly = /^[\u0600-\u06FF\s]+$/.test(val);
    
    if (isArabicOnly && val.trim().length >= 4) {
        if (rule) { rule.className = "valid"; const mk = rule.querySelector('.icon-marker'); if(mk) mk.innerHTML = "✅"; }
        if (status) status.textContent = "✅"; if (err) err.textContent = "";
        inputControl.classList.remove("is-field-invalid"); inputControl.classList.add("is-field-valid");
        return true;
    } else {
        if (rule) { rule.className = "invalid"; const mk = rule.querySelector('.icon-marker'); if(mk) mk.innerHTML = "❌"; }
        if (status) status.textContent = "❌";
        inputControl.classList.remove("is-field-valid"); inputControl.classList.add("is-field-invalid");
        if(val.length > 0 && err) err.textContent = "الاسم يجب أن يكون باللغة العربية ومطابقًا للوثائق الرسمية (4 خانات فأكثر).";
        return false;
    }
}

function validateUsernameField() {
    const inputControl = document.getElementById("username");
    if (!inputControl) return false;
    const val = inputControl.value;
    const err = document.getElementById("username-error");
    const status = document.getElementById("username-status");

    const isEmpty = val.length === 0;

    const rLen = !isEmpty && val.length >= 4 && val.length <= 20;
    const rStart = !isEmpty && /^[a-zA-Z]/.test(val);
    const rChar = !isEmpty && /[a-zA-Z]/.test(val);
    const rNum = !isEmpty && /[0-9]/.test(val);
    const rUpper = !isEmpty && /[A-Z]/.test(val);
    const rLower = !isEmpty && /[a-z]/.test(val);
    const rSpace = !isEmpty && !/\s/.test(val);
    const rSpecial = !isEmpty && !/[~`!@#$%\^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(val);
    const rUnique = !isEmpty && !mockedUsedData.usernames.includes(val.toLowerCase());

    updateRuleMarker('u-rule-len', rLen);
    updateRuleMarker('u-rule-start', rStart);
    updateRuleMarker('u-rule-char', rChar);
    updateRuleMarker('u-rule-num', rNum || !isEmpty);
    updateRuleMarker('u-rule-upper', rUpper || !isEmpty);
    updateRuleMarker('u-rule-lower', rLower || !isEmpty);
    updateRuleMarker('u-rule-space', rSpace);
    updateRuleMarker('u-rule-special', rSpecial);
    updateRuleMarker('u-rule-unique', rUnique && val.length > 0);

    if (rLen && rStart && rChar && rSpace && rSpecial && rUnique) {
        if(err) err.textContent = ""; if(status) status.textContent = "✅";
        inputControl.classList.remove("is-field-invalid"); inputControl.classList.add("is-field-valid");
        return true;
    } else {
        if(status) status.textContent = "❌";
        inputControl.classList.remove("is-field-valid"); inputControl.classList.add("is-field-invalid");
        if (!rUnique && val.length > 0 && err) err.textContent = "اسم المستخدم مستخدم مسبقاً.";
        return false;
    }
}

function validateEmailFields() {
    const emailControl = document.getElementById("email");
    const cemailControl = document.getElementById("confirm_email");
    if (!emailControl || !cemailControl) return false;
    
    const email = emailControl.value;
    const cemail = cemailControl.value;
    const emailStatus = document.getElementById("email-status");
    const cemailStatus = document.getElementById("cemail-status");
    const cemailError = document.getElementById("cemail-error");

    const isEmpty = email.length === 0;
    const isCEmpty = cemail.length === 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rValid = !isEmpty && emailRegex.test(email);
    const rUnique = !isEmpty && !mockedUsedData.emails.includes(email.toLowerCase());
    const rMatch = !isEmpty && !isCEmpty && (email === cemail);

    updateRuleMarker('e-rule-valid', rValid);
    updateRuleMarker('e-rule-unique', rUnique);
    updateRuleMarker('e-rule-match', rMatch);

    if(emailStatus) emailStatus.textContent = (rValid && rUnique) ? "✅" : "❌";
    if(rValid && rUnique) { emailControl.classList.add("is-field-valid"); emailControl.classList.remove("is-field-invalid"); }
    else { emailControl.classList.add("is-field-invalid"); emailControl.classList.remove("is-field-valid"); }
    
    if (rValid && rUnique && rMatch) {
        if(cemailStatus) cemailStatus.textContent = "✅"; if(cemailError) cemailError.textContent = "";
        cemailControl.classList.remove("is-field-invalid"); cemailControl.classList.add("is-field-valid");
        return true;
    } else {
        if(cemailStatus) cemailStatus.textContent = "❌";
        cemailControl.classList.remove("is-field-valid"); cemailControl.classList.add("is-field-invalid");
        if (cemail.length > 0 && !rMatch && cemailError) cemailError.textContent = "البريد الإلكتروني وتأكيد البريد الإلكتروني غير متطابقين.";
        return false;
    }
}

function validatePasswordFields() {
    const passControl = document.getElementById("password");
    const cpassControl = document.getElementById("confirm_password");
    if(!passControl || !cpassControl) return false;

    const p = passControl.value;
    const cp = cpassControl.value;
    const u = document.getElementById("username") ? document.getElementById("username").value : "";
    const e = document.getElementById("email") ? document.getElementById("email").value : "";

    const pStatus = document.getElementById("password-status");
    const cpStatus = document.getElementById("cpassword-status");
    const cpError = document.getElementById("cpassword-error");

    const isEmpty = p.length === 0;

    const rLen = !isEmpty && p.length >= 8;
    const rUpper = !isEmpty && /[A-Z]/.test(p);
    const rLower = !isEmpty && /[a-z]/.test(p);
    const rNum = !isEmpty && /[0-9]/.test(p);
    const rSpecial = !isEmpty && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p);
    const rSpace = !isEmpty && !/\s/.test(p);
    const rUser = !isEmpty && (u.length > 0 ? !p.includes(u) : true);
    const rEmail = !isEmpty && (e.length > 0 ? !p.includes(e.split('@')[0]) : true);
    
    let rRepeat = !isEmpty;
    if (!isEmpty) {
        for (let i = 0; i < p.length - 3; i++) {
            if (p[i] === p[i+1] && p[i] === p[i+2] && p[i] === p[i+3]) { rRepeat = false; break; }
        }
    }
    const rWeak = !isEmpty && !['12345678', 'password', 'qwerty'].includes(p.toLowerCase());

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

    if (strengthText && strengthFill) {
        if (isEmpty || score <= 1) {
            strengthText.className = "strength-red"; strengthText.textContent = "🔴 ضعيفة"; strengthFill.style.width = "25%"; strengthFill.style.background = "#E25950";
        } else if (score === 2) {
            strengthText.className = "strength-orange"; strengthText.textContent = "🟠 متوسطة"; strengthFill.style.width = "50%"; strengthFill.style.background = "#FFC000";
        } else if (score === 3) {
            strengthText.className = "strength-green"; strengthText.textContent = "🟢 قوية"; strengthFill.style.width = "75%"; strengthFill.style.background = "#00AA50";
        } else if (score === 4) {
            strengthText.className = "strength-double-green"; strengthText.textContent = "🟢🟢 قوية جداً"; strengthFill.style.width = "100%"; strengthFill.style.background = "#00D46A";
        }
    }

    const rMatch = !isEmpty && cp.length > 0 && (p === cp);
    
    const matchLi = document.getElementById("p-rule-match");
    if(matchLi) {
        if (isEmpty && cp.length === 0) {
            matchLi.className = "invalid"; matchLi.innerHTML = `<span class="icon-marker">❌</span> كلمة المرور وتأكيد كلمة المرور غير متطابقين`;
        } else if(rMatch) {
            matchLi.className = "valid"; matchLi.innerHTML = `<span class="icon-marker">✅</span> كلمة المرور وتأكيد كلمة المرور متطابقان`;
        } else {
            matchLi.className = "invalid"; matchLi.innerHTML = `<span class="icon-marker">❌</span> كلمة المرور وتأكيد كلمة المرور غير متطابقين`;
        }
    }

    if(pStatus) pStatus.textContent = (score >= 3) ? "✅" : "❌";
    if(score >= 3 && !isEmpty) { passControl.classList.add("is-field-valid"); passControl.classList.remove("is-field-invalid"); }
    else { passControl.classList.add("is-field-invalid"); passControl.classList.remove("is-field-valid"); }

    if (rMatch && score >= 3) {
        if(cpStatus) cpStatus.textContent = "✅"; if(cpError) cpError.textContent = "";
        cpassControl.classList.remove("is-field-invalid"); cpassControl.classList.add("is-field-valid");
        return true;
    } else {
        if(cpStatus) cpStatus.textContent = "❌";
        cpassControl.classList.remove("is-field-valid"); cpassControl.classList.add("is-field-invalid");
        return false;
    }
}

function validateStage1Logic() {
    const n = validateArabicName();
    const u = validateUsernameField();
    const e = validateEmailFields();
    const p = validatePasswordFields();
    const m = document.getElementById("mobile_number") ? document.getElementById("mobile_number").value.length >= 8 : false;
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

function triggerStageVisualErrors(stage) {
    if (stage === 1) {
        const errorList = document.getElementById("centralModalErrorList");
        if(!errorList) return;
        errorList.innerHTML = "";
        
        if (!validateArabicName()) errorList.innerHTML += "<li>الاسم الكامل (يجب أن يكون باللغة العربية فقط ومكتملًا)</li>";
        if (document.getElementById("mobile_number") && document.getElementById("mobile_number").value.length < 8) errorList.innerHTML += "<li>رقم الجوال (تأكد من إدخال رقم صحيح دون الصفر الأول)</li>";
        if (!validateEmailFields()) errorList.innerHTML += "<li>البريد الإلكتروني وتأكيد المطابقة والامتثال</li>";
        if (!validateUsernameField()) errorList.innerHTML += "<li>اسم المستخدم (تأكد من استيفاء جميع الشروط بالإنجليزية)</li>";
        if (!validatePasswordFields()) errorList.innerHTML += "<li>كلمة المرور وتأكيد المطابقة وقوتها</li>";
        
        const modal = document.getElementById("centralErrorModal");
        if(modal) modal.style.display = "flex";
    }
}

// التحديث الجديد: دالة الإرسال لترتبط بـ Supabase 
async function submitForm() {
    if (validateStage1Logic() && validateStage2Logic()) {
        const submitBtn = document.getElementById("action-submit-btn");
        const originalText = submitBtn.innerHTML;
        
        // 1. تغيير حالة الزر لمنع التكرار وإظهار حالة التحميل
        submitBtn.innerHTML = "جاري إنشاء الحساب... ⏳";
        submitBtn.setAttribute("disabled", "true");

        // 2. سحب البيانات النظيفة من الحقول
        const fullName = document.getElementById("fullname_ar").value.trim();
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const mobileNumber = document.getElementById("mobile_number").value.trim();
        const password = document.getElementById("password").value;

        try {
            // 3. إرسال طلب التسجيل إلى Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,       // سيتم نقله لجدول المستثمرين/الشركاء تلقائياً
                        username: username,
                        mobile_number: mobileNumber
                    }
                }
            });

            if (error) {
                // معالجة أخطاء التسجيل (مثل: الإيميل مسجل مسبقاً في الخادم)
                console.error("Supabase Error:", error.message);
                alert("❌ حدث خطأ أثناء التسجيل: " + error.message);
                
                // إعادة الزر لحالته الطبيعية
                submitBtn.innerHTML = originalText;
                submitBtn.removeAttribute("disabled");
            } else {
                // 4. نجاح العملية وحفظ البريد للتفعيل
                alert("🎉 تم إنشاء حساب الشريك بنجاح! جاري إرسال رمز التحقق (OTP) إلى بريدك الإلكتروني.");
                
                // حفظ الإيميل في ذاكرة المتصفح المؤقتة لاستخدامه في صفحة التحقق
                localStorage.setItem('pendingVerificationEmail', email);
                
                // توجيه الشريك لصفحة إدخال الرمز (تأكد أن المسار صحيح لملفك)
                window.location.href = "../verify-otp.html"; 
            }
        } catch (err) {
            console.error("Connection Error:", err);
            alert("❌ تعذر الاتصال بقاعدة البيانات. تأكد من اتصالك بالإنترنت.");
            submitBtn.innerHTML = originalText;
            submitBtn.removeAttribute("disabled");
        }
    } else {
        triggerStageVisualErrors(1);
    }
}
