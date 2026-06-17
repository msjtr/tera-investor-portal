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

function executeInvestorLoginAuth() {
    const identInput = document.getElementById("login_identifier");
    const passInput = document.getElementById("login_password");
    const globalErr = document.getElementById("loginErrorBox");

    const userVal = identInput.value.trim();
    const passVal = passInput.value;

    if (userVal === "" || passVal === "") {
        identInput.classList.add("is-invalid-active");
        passInput.classList.add("is-invalid-active");
        if (globalErr) globalErr.style.display = "flex";
        document.getElementById("errorBoxText").textContent = "يرجى تعبئة جميع الحقول المطلوبة.";
        return;
    }

    const matchIdentifier = (userVal === targetAccount.username || userVal.toLowerCase() === targetAccount.email || userVal === targetAccount.mobile);
    const matchPassword = (passVal === targetAccount.password);

    if (matchIdentifier && matchPassword) {
        identInput.classList.add("is-valid-active");
        passInput.classList.add("is-valid-active");
        if (globalErr) globalErr.style.display = "none";

        document.getElementById("loginCardBlock").style.opacity = "0";
        setTimeout(() => {
            document.getElementById("loginCardBlock").style.display = "none";
            const loaderOverlay = document.getElementById("creativeLoaderScreen");
            if(loaderOverlay) loaderOverlay.style.display = "flex";
            startCreativeQuotesCycle();
        }, 200);

        localStorage.setItem('tera_token', 'secure_investor_session_106');

        // 🎯 التوجيه النهائي المحكم:
        // نستخدم المسار المطلق بالكامل وبدون إمكانية العودة (replace) لضمان عدم تكرار المشاكل
        setTimeout(() => {
            window.location.replace("/pages/dashboard/index.html");
        }, 3000);

    } else {
        identInput.classList.add("is-invalid-active");
        passInput.classList.add("is-invalid-active");
        if (globalErr) globalErr.style.display = "flex";
        document.getElementById("errorBoxText").textContent = "البيانات المدخلة غير متطابقة مع سجلات المستثمرين.";
    }
}

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
            }, 150);
        }
    }, 900);
}
