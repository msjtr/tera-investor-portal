/**
 * بوابة المستثمر - منصة تيرا
 * محرك لوحة التحكم الرئيسية (Dashboard)
 */

document.addEventListener("DOMContentLoaded", function() {
    // 1. نظام الحماية الجداري: التحقق من وجود جلسة نشطة (Token)
    verifyInvestorSession();
    
    // 2. ترحيب ديناميكي (اختياري يمكن ربطه لاحقاً ببيانات العميل الحقيقية)
    setupDynamicGreeting();
});

function verifyInvestorSession() {
    // جلب التوكن الذي تم إنشاؤه في صفحة تسجيل الدخول الذكية
    const sessionToken = localStorage.getItem('tera_token');
    
    // إذا لم يكن التوكن موجوداً، يتم طرد المستخدم فوراً لصفحة الدخول
    if (!sessionToken) {
        window.location.replace("/auth/auth/login/login.html");
    }
}

function executeLogout() {
    // تأكيد تسجيل الخروج لإضافة لمسة احترافية
    const confirmExit = confirm("هل أنت متأكد من رغبتك في تسجيل الخروج من البوابة؟");
    
    if (confirmExit) {
        // مسح الجلسة تماماً من المتصفح
        localStorage.removeItem('tera_token');
        
        // إعادة التوجيه الفوري لصفحة الدخول
        window.location.replace("/auth/auth/login/login.html");
    }
}

function setupDynamicGreeting() {
    // دالة لتغيير رسالة الترحيب بناءً على وقت اليوم (صباحاً/مساءً)
    const hour = new Date().getHours();
    const subtitleEl = document.querySelector('.greeting-subtitle');
    
    if (subtitleEl) {
        if (hour < 12) {
            subtitleEl.textContent = "صباح الخير، إليك ملخص أداء محفظتك الاستثمارية اليوم.";
        } else {
            subtitleEl.textContent = "مساء الخير، إليك ملخص أداء محفظتك الاستثمارية اليوم.";
        }
    }
}
