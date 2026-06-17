/**
 * بوابة المستثمر - منصة تيرا
 * محرك لوحة التحكم الرئيسية (Dashboard) - نسخة الاستقرار المطلق
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
    // نستخدم setTimeout بسيطة جداً (0ms) لضمان تنفيذ التحقق بعد انتهاء المتصفح من معالجة أي أكواد أخرى
    setTimeout(() => {
        const sessionToken = localStorage.getItem('tera_token');
        
        // التحقق من المسار الحالي لمنع التوجيه اللانهائي (Infinite Loop)
        const currentPath = window.location.pathname;
        const loginPath = "/auth/auth/login/login.html";

        if (!sessionToken && currentPath !== loginPath) {
            console.log("Session invalid: Redirecting to login.");
            window.location.replace(loginPath);
        }
    }, 0);
}

function executeLogout() {
    const confirmExit = confirm("هل أنت متأكد من رغبتك في تسجيل الخروج من البوابة؟");
    
    if (confirmExit) {
        // مسح الجلسة
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        sessionStorage.clear();
        
        // التوجيه المباشر
        window.location.replace("/auth/auth/login/login.html");
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
