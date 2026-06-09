/* ==========================================
   TERA Investor Portal - Global App JS
   المسار: /assets/js/app.js
========================================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log('TERA Investor Portal Loaded');

    // 1. حماية الصفحات الحساسة فور تحميل الدوم
    checkProtectedPages();

    // 2. تهيئة النظام مع حماية ضد توقف السكربت (Fail-safe)
    try {
        initializeApp();
    } catch (err) {
        console.error('Initialization Error:', err);
    }
});

/**
 * تهيئة مكونات التطبيق الأساسية
 */
function initializeApp() {
    highlightActiveMenu();
    
    // التحقق من وجود الدالة قبل استدعائها لتجنب ReferenceError
    if (typeof initializeTooltips === 'function') {
        initializeTooltips();
    }
    
    initializeCurrencyFields();
}

/* ==========================================
   Authentication & Security
========================================== */
const AUTH_TOKEN = 'tera_token';

function isAuthenticated() {
    return !!localStorage.getItem(AUTH_TOKEN);
}

function logout() {
    localStorage.removeItem(AUTH_TOKEN);
    sessionStorage.clear();
    window.location.href = '/auth/login.html';
}

function checkProtectedPages() {
    const protectedPaths = ['/pages/dashboard', '/pages/investments', '/pages/portfolio'];
    const currentPath = window.location.pathname;
    
    // التحقق إذا كان المسار محمي وغير مصرح بالدخول
    const isProtected = protectedPaths.some(path => currentPath.startsWith(path));
    if (isProtected && !isAuthenticated()) {
        window.location.href = '/auth/login.html';
    }
}

/* ==========================================
   Helpers & UI Logic
========================================== */
function goTo(url) {
    window.location.href = url;
}

function showAlert(message, type = 'success') {
    // يمكنك لاحقاً ربطها بمكتبة Toastr أو SweetAlert
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function highlightActiveMenu() {
    const currentPage = window.location.pathname;
    const links = document.querySelectorAll('.sidebar a');
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && (currentPage === href || currentPage.includes(href))) {
            link.classList.add('active');
        }
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 2
    }).format(amount);
}

function initializeCurrencyFields() {
    document.querySelectorAll('.currency').forEach(field => {
        const value = parseFloat(field.dataset.amount);
        if (!isNaN(value)) {
            field.innerText = formatCurrency(value);
        }
    });
}

/* ==========================================
   Global Export (للوصول للدوال من أي مكان)
========================================== */
Object.assign(window, {
    logout,
    goTo,
    showAlert,
    formatCurrency
});
