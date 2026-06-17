/**
 * بوابة المستثمر - منصة تيرا
 * محرك فحص الدخول الثلاثي الذكي وجدولة التحويل السينمائي بالعبارات الإبداعية
 */

// حساب المستثمر المطلق المطلوب والافتراضي
const targetAccount = {
    username: "106",
    email: "investor106@tera.sa",
    mobile: "506060606",
    password: "123"
};

// قائمة العبارات المالية الاستثمارية الملهمة والإبداعية التي تدور تلقائياً كل ثانية أثناء الـ 3 ثوانٍ
const creativeQuotes = [
    "جاري تهيئة بيئتك المالية الفاخرة... أهلاً بك في تيرا 🌌",
    "نصنع مستقبلك الاستثماري المالي الواعد بثقة وأمان وثبات 📈",
    "جاري استدعاء وتحليل أصول محفظتك الاستثمارية الذكية الآن 💼",
    "تجهيز تقاريرك الدورية وعوائدك التنافسية الفورية بامتياز... ✨"
];

document.addEventListener("DOMContentLoaded", function() {
    bindInputFilters();
    bindPasswordToggle();
});

function bindInputFilters() {
    const identInput = document.getElementById("login_identifier");
    const passInput = document.getElementById("login_password");

    if (identInput) {
        identInput.addEventListener("input", function() {
            // منع الحروف العربية تماماً لحماية دقة المدخلات حياً
            this.value = this.value.replace(/[\u0600-\u06FF]/g, '');
            resetFieldMarkers(this, "identifier-error");
        });
    }
    if (passInput) {
        passInput.addEventListener("input", function() {
            this.value = this.value.replace(/[\u0600-\u06FF]/g, '');
            resetFieldMarkers(this, "password-error");
        });
    }
}

function bindPasswordToggle() {
    const checkToggle = document.getElementById("show_login_password");
    const passInput = document.getElementById("login_password");
    if (checkToggle && passInput) {
        checkToggle.addEventListener("change", function() {
            passInput.type = this.checked ? "text" : "password";
        });
    }
}

function resetFieldMarkers(inputEl, errId) {
    inputEl.classList.remove("is-invalid-active");
    const errText = document.getElementById(errId);
    if (errText) errText.textContent = "";
    const globalErr = document.getElementById("loginErrorBox");
    if (globalErr) globalErr.style.display = "none";
}

// دالة التحقق الثلاثية الاستراتيجية وقفل التحويل الإبداعي لمدة 3 ثوانٍ
function executeInvestorLoginAuth() {
    const identInput = document.getElementById("login_identifier");
    const passInput = document.getElementById("login_password");
    const globalErr = document.getElementById("loginErrorBox");

    const userVal = identInput.value.trim();
    const passVal = passInput.value;

    let localError = false;

    if (userVal === "") {
        identInput.classList.add("is-invalid-active");
        document.getElementById("identifier-error").textContent = "يرجى إدخال اسم المستخدم، البريد، أو رقم الجوال بشكل صحيح.";
        localError = true;
    }
    if (passVal === "") {
        passInput.classList.add("is-invalid-active");
        document.getElementById("password-error").textContent = "يرجى إدخال كلمة المرور الخاصة بحسابك.";
        localError = true;
    }

    if (localError) return;

    // فحص مطابقة المدخلات الذكية: إذا طابق اسم المستخدم أو البريد أو الجوال مع الباسورد الثابت
    const matchIdentifier = (userVal === targetAccount.username || userVal.toLowerCase() === targetAccount.email || userVal === targetAccount.mobile);
    const matchPassword = (passVal === targetAccount.password);

    if (matchIdentifier && matchPassword) {
        // نجاح الفحص: تلوين الأطر بالأخضر الفاخر
        identInput.classList.add("is-valid-active");
        passInput.classList.add("is-valid-active");
        if (globalErr) globalErr.style.display = "none";

        // إخفاء الكارد الأساسي برفق وتدشين شاشة التحويل الإبداعية الدوارة فوراً
        document.getElementById("loginCardBlock").style.opacity = "0";
        setTimeout(() => {
            document.getElementById("loginCardBlock").style.display = "none";
            const loaderOverlay = document.getElementById("creativeLoaderScreen");
            loaderOverlay.style.display = "flex";
            
            // بدء دوران وتبديل العبارات الاستثمارية الملهمة حياً كل ثانية
            startCreativeQuotesCycle();
        }, 200);

        // حفظ رمز التوكن محلياً لخدمة بقية كود لوحة التحكم للمستثمر
        localStorage.setItem('tera_token', 'secure_investor_session_106');

        // قفل توقيت التحويل الإبداعي لمدة 3 ثوانٍ (3000ms) ثم النقل الفعلي للـ Dashboard
        setTimeout(() => {
            window.location.href = "/pages/dashboard/index.html";
        }, 3000);

    } else {
        // فشل الفحص: تلوين الأطر بالأحمر التنبيهي وتفعيل كادر الخطأ
        identInput.classList.add("is-invalid-active");
        passInput.classList.add("is-invalid-active");
        if (globalErr) globalErr.style.display = "flex";
    }
}

// دالة تدوير العبارات المالية الإبداعية حياً كل ثانية لإضفاء مظهر سينمائي مبهر للمستثمر
function startCreativeQuotesCycle() {
    const quoteEl = document.getElementById("creativeQuoteText");
    let quoteIndex = 0;
    
    setInterval(() => {
        quoteIndex = (quoteIndex + 1) % creativeQuotes.length;
        if(quoteEl) {
            quoteEl.style.opacity = "0";
            setTimeout(() => {
                quoteEl.textContent = creativeQuotes[quoteIndex];
                quoteEl.style.opacity = "1";
                quoteEl.style.transition = "opacity 0.25s ease";
            }, 150);
        }
    }, 900); // تغيير مبهج كل 900 ملي ثانية ليتناسق مع شريط التقدم كاملاً
}
