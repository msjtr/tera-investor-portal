/* ==========================================
   TERA Investor Portal - app.js (Fixed & Protected)
========================================== */

/**
 * 1. تعريف الدوال أولاً (قبل أي استدعاء أو تصدير)
 */

function logout() {
    localStorage.removeItem('tera_token');
    sessionStorage.clear();
    window.location.href = '/auth/login.html';
}

function initializeTooltips() {
    // ضع منطق التلميحات هنا إذا كنت تستخدم مكتبة، أو اتركها فارغة
    console.log('Tooltips initialized');
}

function initializeApp() {
    // التحقق من وجود الدوال قبل استدعائها
    if (typeof highlightActiveMenu === 'function') highlightActiveMenu();
    
    // الحل الجذري للخطأ: التحقق من وجود الدالة
    if (typeof initializeTooltips === 'function') {
        initializeTooltips();
    } else {
        console.warn('initializeTooltips not found, skipping...');
    }
    
    if (typeof initializeCurrencyFields === 'function') initializeCurrencyFields();
}

/* ==========================================
   2. تنفيذ الكود عند تحميل الصفحة
========================================== */
document.addEventListener('DOMContentLoaded', () => {
    console.log('TERA Investor Portal Loaded');
    
    // حماية الصفحات
    if (typeof checkProtectedPages === 'function') {
        checkProtectedPages();
    }
    
    try {
        initializeApp();
    } catch (err) {
        console.error('Initialization Error:', err);
    }
});

/* ==========================================
   3. تصدير الدوال (يتم هذا في النهاية فقط)
========================================== */
window.logout = logout;
window.initializeApp = initializeApp;

// تعريف الدوال المساعدة الأساسية إذا لم تكن موجودة في ملفات أخرى
if (!window.goTo) window.goTo = (url) => window.location.href = url;
