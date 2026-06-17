/**
 * بوابة الشركاء - منصة تيرا
 * محرك فحص ومصادقة صفحة الدخول - الحساب المشروط الثابت حياً
 */

// بيانات الحساب المحددة والمطلوبة نظامياً من العميل
const secureCredentials = {
    username: "106",
    password: "123"
};

document.addEventListener("DOMContentLoaded", function() {
    bindLoginInputRestrictions();
    bindPasswordVisibility();
});

// منع اللغة العربية تماماً حياً من حقول المصادقة لضمان دقة الإدخال بالإنجليزية/الأرقام
function bindLoginInputRestrictions() {
    const usernameInput = document.getElementById("login_username");
    const passwordInput = document.getElementById("login_password");

    if (usernameInput) {
        usernameInput.addEventListener("input", function() {
            this.value = this.value.replace(/[\u0600-\u06FF]/g, ''); // طرد الحروف العربية حياً فوراً
            clearFieldStatus(this, "username-field-error");
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener("input", function() {
            this.value = this.value.replace(/[\u0600-\u06FF]/g, ''); // طرد الحروف العربية حياً فوراً
            clearFieldStatus(this, "password-field-error");
        });
    }
}

// تشغيل ميزة إظهار وإخفاء كلمات المرور عند النقر على المربع المشروط
function bindPasswordVisibility() {
    const showPasswordCheck = document.getElementById("show_login_password");
    const passwordInput = document.getElementById("login_password");

    if (showPasswordCheck && passwordInput) {
        showPasswordCheck.addEventListener("change", function() {
            passwordInput.type = this.checked ? "text" : "password";
        });
    }
}

// تنظيف أطر الحقول الملونة عند بدء تعديل الكتابة تلقائياً
function clearFieldStatus(inputEl, errorId) {
    inputEl.classList.remove("is-invalid-active");
    const errDiv = document.getElementById(errorId);
    if (errDiv) errDiv.textContent = "";
    
    const globalErrorBox = document.getElementById("loginErrorBox");
    if (globalErrorBox) globalErrorBox.style.display = "none";
}

// دالة التحقق والمصادقة الكلية عند إرسال النموذج (Submit)
function handleLoginValidation() {
    const usernameInput = document.getElementById("login_username");
    const passwordInput = document.getElementById("login_password");
    const globalErrorBox = document.getElementById("loginErrorBox");
    const errorBoxText = document.getElementById("errorBoxText");

    const enteredUser = usernameInput.value.trim();
    const enteredPass = passwordInput.value;

    let hasError = false;

    // 1. الفحص الأولي للحقول الفارغة وتلوين الإطار بالأحمر
    if (enteredUser === "") {
        usernameInput.classList.add("is-invalid-active");
        document.getElementById("username-field-error").textContent = "يرجى إدخال اسم المستخدم أو البريد الإلكتروني بشكل صحيح.";
        hasError = true;
    }

    if (enteredPass === "") {
        passwordInput.classList.add("is-invalid-active");
        document.getElementById("password-field-error").textContent = "يرجى إدخال كلمة المرور الخاصة بحسابك.";
        hasError = true;
    }

    if (hasError) return;

    // 2. مطابقة البيانات مع شروط العميل الفورية والمحددة (106 / 123)
    if (enteredUser === secureCredentials.username && enteredPass === secureCredentials.password) {
        // في حال النجاح الكلي: تلوين الأطر بالأخضر وتأكيد الدخول
        usernameInput.classList.remove("is-invalid-active");
        passwordInput.classList.remove("is-invalid-active");
        usernameInput.classList.add("is-valid-active");
        passwordInput.classList.add("is-valid-active");

        if (globalErrorBox) globalErrorBox.style.display = "none";
        
        alert("🎉 تم تسجيل الدخول بنجاح! جاري توجيهك إلى لوحة تحكم بوابة الشركاء لتيرا...");
        
        // التوجيه الفعلي إلى لوحة تحكم الشركاء
        // window.location.href = "../dashboard/index.html";
    } else {
        // في حال فشل المطابقة: تلوين الأطر بالأحمر وإظهار صندوق التنبيه التكتيكي الفوري
        usernameInput.classList.add("is-invalid-active");
        passwordInput.classList.add("is-invalid-active");
        
        if (globalErrorBox && errorBoxText) {
            errorBoxText.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.";
            globalErrorBox.style.display = "flex";
        }
    }
}
