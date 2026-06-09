/* ==========================================
   TERA Investor Portal - App.js (Clean Version)
========================================== */

// تعريف الدوال كخصائص على window بشكل مباشر
window.logout = function() {
    localStorage.removeItem('tera_token');
    window.location.href = '/auth/login.html';
};

window.initializeTooltips = function() {
    console.log('Tooltips initialized');
};

function initializeApp() {
    console.log('App initialized...');
    
    // استخدام التحقق من النوع قبل الاستدعاء
    if (typeof window.highlightActiveMenu === 'function') {
        window.highlightActiveMenu();
    }
    
    if (typeof window.initializeCurrencyFields === 'function') {
        window.initializeCurrencyFields();
    }
    
    window.initializeTooltips();
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('TERA Investor Portal Loaded');
    
    if (typeof window.checkProtectedPages === 'function') {
        window.checkProtectedPages();
    }
    
    try {
        initializeApp();
    } catch (err) {
        console.error('Initialization Error:', err);
    }
});
