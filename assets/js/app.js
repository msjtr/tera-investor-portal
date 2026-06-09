/* ==========================================
   TERA Investor Portal - App.js (Hardened Version)
========================================== */

// 1. "تعريف مبكر" (Early Definition) - هذا يمنع خطأ "is not defined"
window.logout = window.logout || function() { 
    localStorage.removeItem('tera_token');
    window.location.href = '/auth/login.html'; 
};

window.initializeTooltips = window.initializeTooltips || function() {
    console.log('Tooltips placeholder active');
};

// 2. الدوال الرئيسية
function initializeApp() {
    console.log('App initialized...');
    if (typeof highlightActiveMenu === 'function') highlightActiveMenu();
    if (typeof initializeCurrencyFields === 'function') initializeCurrencyFields();
    initializeTooltips(); // الآن هي معرفة في السطر 8
}

// 3. التحميل
document.addEventListener('DOMContentLoaded', () => {
    console.log('TERA Investor Portal Loaded');
    
    // حماية الصفحات
    if (typeof checkProtectedPages === 'function') checkProtectedPages();
    
    try {
        initializeApp();
    } catch (err) {
        console.error('Initialization Error:', err);
    }
});
