/**
 * بوابة المستثمر - منصة تيرا
 * محرك لوحة التحكم الرئيسية (Dashboard) - نسخة الاستقرار المطلق (Relative Paths)
 */

document.addEventListener("DOMContentLoaded", function() {
    // التحقق من الجلسة فور تحميل الصفحة
    verifyInvestorSession();
    
    // ترحيب ديناميكي
    setupDynamicGreeting();

    // تأمين زر تسجيل الخروج
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            executeLogout();
        });
    }
});

function verifyInvestorSession() {
    // تأخير بسيط لضمان تحميل المتصفح للذاكرة المحلية
    setTimeout(() => {
        const sessionToken = localStorage.getItem('tera_token');
        
        // المسار النسبي: الخروج من مجلد dashboard ثم pages للوصول لـ auth
        // وهذا يضمن عمله حتى لو لم يكن السيرفر يقرأ الجذر بشكل صحيح
        const loginPath = "../../auth/auth/login/login.html";
        const currentPath = window.location.pathname;

        // إذا لم يوجد توكن ونحن لسنا في صفحة الدخول، يتم الطرد للمسار الصحيح
        if (!sessionToken && !currentPath.includes("login.html")) {
            console.log("Session invalid: Redirecting to login.");
            window.location.replace(loginPath);
        }
    }, 0);
}

function executeLogout() {
    const confirmExit = confirm("هل أنت متأكد من رغبتك في تسجيل الخروج من البوابة؟");
    
    if (confirmExit) {
        // مسح الجلسة تماماً
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        sessionStorage.clear();
        
        // التوجيه للمسار النسبي المحدث
        window.location.replace("../../auth/auth/login/login.html");
    }
}

function setupDynamicGreeting() {
    const hour = new Date().getHours();
    const subtitleEl = document.querySelector('.greeting-subtitle');
    
    if (subtitleEl) {
        let greeting = "أهلاً بك،";
        if (hour >= 5 && hour < 12) {
            greeting = "صباح الخير،";
        } else if (hour >= 12 && hour < 18) {
            greeting = "مساء الخير،";
        } else {
            greeting = "طابت ليلتك،";
        }
        subtitleEl.textContent = `${greeting} إليك ملخص أداء محفظتك الاستثمارية اليوم.`;
    }
}
