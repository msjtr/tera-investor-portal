/**
 * بوابة المستثمر - منصة تيرا
 * محرك لوحة التحكم الرئيسية (Dashboard) - نسخة مصححة
 */

document.addEventListener("DOMContentLoaded", function() {
    // 1. نظام الحماية الجداري: التحقق من وجود جلسة نشطة
    verifyInvestorSession();
    
    // 2. ترحيب ديناميكي
    setupDynamicGreeting();

    // 3. تأمين زر تسجيل الخروج برمجياً (لضمان عمله في كل الحالات)
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            executeLogout();
        });
    }
});

function verifyInvestorSession() {
    const sessionToken = localStorage.getItem('tera_token');
    
    // إذا لم يكن التوكن موجوداً، يتم التوجيه لصفحة الدخول المتعمقة
    if (!sessionToken) {
        window.location.replace("/auth/auth/login/login.html");
    }
}

function executeLogout() {
    const confirmExit = confirm("هل أنت متأكد من رغبتك في تسجيل الخروج من البوابة؟");
    
    if (confirmExit) {
        // مسح الجلسة تماماً من المتصفح
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        sessionStorage.clear();
        
        // إعادة التوجيه الفوري لصفحة الدخول المتعمقة
        window.location.replace("/auth/auth/login/login.html");
    }
}

function setupDynamicGreeting() {
    const hour = new Date().getHours();
    const subtitleEl = document.querySelector('.greeting-subtitle');
    
    if (subtitleEl) {
        if (hour >= 5 && hour < 12) {
            subtitleEl.textContent = "صباح الخير، إليك ملخص أداء محفظتك الاستثمارية اليوم.";
        } else if (hour >= 12 && hour < 18) {
            subtitleEl.textContent = "مساء الخير، إليك ملخص أداء محفظتك الاستثمارية اليوم.";
        } else {
            subtitleEl.textContent = "طابت ليلتك، إليك ملخص أداء محفظتك الاستثمارية اليوم.";
        }
    }
}
