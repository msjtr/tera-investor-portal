/**
 * بوابة المستثمر - منصة تيرا
 * محرك فحص الدخول الثلاثي الذكي وجدولة التحويل السينمائي بالعبارات الإبداعية
 * 
 * تم التحديث لاستخدام TeraAuth الموحد
 */

// قائمة العبارات الإبداعية (يمكن توسيعها)
const creativeQuotes = [
    "جاري تهيئة بيئتك المالية الفاخرة... أهلاً بك في تيرا 🌌",
    "نصنع مستقبلك الاستثماري المالي الواعد بثقة وأمان وثبات 📈",
    "جاري استدعاء وتحليل أصول محفظتك الاستثمارية الذكية الآن 💼",
    "تجهيز تقاريرك الدورية وعوائدك التنافسية الفورية بامتياز... ✨"
];

document.addEventListener("DOMContentLoaded", function() {
    bindInputFilters();
    bindPasswordToggle();
    // إضافة مستمع لزر إظهار كلمة المرور إذا لم يتم التعامل معه بالفعل
});

/**
 * ربط الفلاتر على حقول الإدخال (منع الأحرف العربية)
 */
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

/**
 * ربط تبديل إظهار كلمة المرور
 */
function bindPasswordToggle() {
    const checkToggle = document.getElementById("show_login_password");
    const passInput = document.getElementById("login_password");
    if (checkToggle && passInput) {
        checkToggle.addEventListener("change", function() {
            passInput.type = this.checked ? "text" : "password";
        });
    }
}

/**
 * إعادة تعيين علامات الخطأ
 */
function resetFieldMarkers(inputEl, errId) {
    inputEl.classList.remove("is-invalid-active");
    const errText = document.getElementById(errId);
    if (errText) errText.textContent = "";
    const globalErr = document.getElementById("loginErrorBox");
    if (globalErr) globalErr.style.display = "none";
}

/**
 * دالة تسجيل الدخول الرئيسية (التي تستدعى من النموذج)
 * تم تعديلها لاستخدام TeraAuth.login الموحد
 */
function executeInvestorLoginAuth() {
    const identInput = document.getElementById("login_identifier");
    const passInput = document.getElementById("login_password");
    const globalErr = document.getElementById("loginErrorBox");
    const errorText = document.getElementById("errorBoxText");
    const submitBtn = document.getElementById("loginSubmitBtn");

    // 1. التحقق من الحقول الفارغة
    const userVal = identInput.value.trim();
    const passVal = passInput.value.trim();

    if (userVal === "" || passVal === "") {
        identInput.classList.add("is-invalid-active");
        passInput.classList.add("is-invalid-active");
        if (globalErr) {
            globalErr.style.display = "flex";
            errorText.textContent = "يرجى تعبئة جميع الحقول المطلوبة.";
        }
        return;
    }

    // 2. محاولة استخدام TeraAuth إن وجد
    if (window.TeraAuth && typeof TeraAuth.login === 'function') {
        // تعطيل الزر أثناء المعالجة
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';
        }

        // إخفاء الأخطاء السابقة
        if (globalErr) globalErr.style.display = "none";
        identInput.classList.remove("is-invalid-active");
        passInput.classList.remove("is-invalid-active");

        // استدعاء TeraAuth.login
        TeraAuth.login(userVal, passVal)
            .then(function(user) {
                // نجاح تسجيل الدخول
                // يمكن تخزين بيانات إضافية
                console.log('✅ [login.js] تم تسجيل الدخول بنجاح عبر TeraAuth', user);
                
                // إظهار شاشة التحميل الإبداعية
                showLoadingScreen();

                // بدء عرض العبارات الإبداعية
                startCreativeQuotesCycle();

                // التوجيه عبر TeraAuth (الذي سيتحقق من الجلسة ويوجه)
                // استخدام setTimeout لتجربة المستخدم
                setTimeout(() => {
                    if (typeof TeraAuth.checkSession === 'function') {
                        TeraAuth.checkSession(); // سيقوم بالتوجيه تلقائياً
                    } else {
                        // احتياطي: توجيه مباشر للوحة التحكم
                        window.location.replace('/pages/dashboard/index.html');
                    }
                }, 2500);
            })
            .catch(function(err) {
                // فشل تسجيل الدخول
                console.error('❌ [login.js] فشل تسجيل الدخول:', err);
                if (globalErr) {
                    globalErr.style.display = "flex";
                    errorText.textContent = err.message || 'فشل تسجيل الدخول. تأكد من بياناتك وحاول مرة أخرى.';
                }
                identInput.classList.add("is-invalid-active");
                passInput.classList.add("is-invalid-active");
                
                // إعادة تمكين الزر
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'تسجيل الدخول الآمن';
                }
            });
    } else {
        // 3. حل احتياطي (إذا لم يتم تحميل TeraAuth)
        console.warn('⚠️ [login.js] TeraAuth غير متاح، استخدام المحاكاة المحلية');
        // محاكاة بسيطة (نفس المنطق القديم)
        const mockUser = { username: "106", email: "investor106@tera.sa", mobile: "506060606", password: "123" };
        const matchIdentifier = (userVal === mockUser.username || userVal.toLowerCase() === mockUser.email || userVal === mockUser.mobile);
        const matchPassword = (passVal === mockUser.password);

        if (matchIdentifier && matchPassword) {
            if (globalErr) globalErr.style.display = "none";
            identInput.classList.add("is-valid-active");
            passInput.classList.add("is-valid-active");
            
            // تخزين توكن وهمي
            localStorage.setItem('tera_token', 'mock_token_123');
            localStorage.setItem('tera_user', JSON.stringify({ name: 'مستثمر تجريبي', email: userVal }));
            
            showLoadingScreen();
            startCreativeQuotesCycle();
            
            setTimeout(() => {
                window.location.replace('/pages/dashboard/index.html');
            }, 2500);
        } else {
            if (globalErr) {
                globalErr.style.display = "flex";
                errorText.textContent = "البيانات المدخلة غير متطابقة مع سجلات المستثمرين.";
            }
            identInput.classList.add("is-invalid-active");
            passInput.classList.add("is-invalid-active");
        }
    }
}

/**
 * إظهار شاشة التحميل مع تأثيرات
 */
function showLoadingScreen() {
    const card = document.getElementById("loginCardBlock");
    const loader = document.getElementById("creativeLoaderScreen");
    if (card) {
        card.style.opacity = "0";
        card.style.transition = "opacity 0.3s ease";
        setTimeout(() => {
            card.style.display = "none";
        }, 300);
    }
    if (loader) {
        loader.style.display = "flex";
        // بدء تقدم وهمي
        const progressBar = document.getElementById("progressFillBar");
        if (progressBar) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15 + 5;
                if (progress > 95) progress = 95;
                progressBar.style.width = progress + '%';
                if (progress >= 95) clearInterval(interval);
            }, 400);
        }
    }
}

/**
 * تدوير العبارات الإبداعية
 */
function startCreativeQuotesCycle() {
    const quoteEl = document.getElementById("creativeQuoteText");
    if (!quoteEl) return;
    
    let quoteIndex = 0;
    // عرض أول عبارة فوراً
    quoteEl.textContent = creativeQuotes[0];
    quoteEl.style.opacity = "1";

    setInterval(() => {
        quoteIndex = (quoteIndex + 1) % creativeQuotes.length;
        quoteEl.style.opacity = "0";
        setTimeout(() => {
            quoteEl.textContent = creativeQuotes[quoteIndex];
            quoteEl.style.opacity = "1";
        }, 200);
    }, 1200);
}

// تصدير الدالة للنطاق العام (إذا لزم الأمر)
window.executeInvestorLoginAuth = executeInvestorLoginAuth;
