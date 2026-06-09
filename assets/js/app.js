/* ==========================================
   TERA Investor Portal - Global App JS (Fixed & Stable)
========================================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log('TERA Investor Portal Loaded');
    
    // 1. حماية الصفحات
    checkProtectedPages();
    
    // 2. تهيئة الواجهة مع حماية ضد الأخطاء
    try {
        initializeApp();
    } catch (err) {
        console.error('Initialization Error:', err);
    }
});

function initializeApp() {
    highlightActiveMenu();
    // التحقق من وجود الدالة قبل استدعائها لتجنب الانهيار
    if (typeof initializeTooltips === 'function') initializeTooltips();
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
    const isProtected = protectedPaths.some(path => currentPath.startsWith(path));

    if (isProtected && !isAuthenticated()) {
        window.location.href = '/auth/login.html';
    }
}

/* ==========================================
   Helpers & Utilities
========================================== */
function highlightActiveMenu() {
    const currentPage = window.location.pathname;
    document.querySelectorAll('.sidebar a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && (currentPage === href || currentPage.includes(href))) {
            link.classList.add('active');
        }
    });
}

function goTo(url) {
    window.location.href = url;
}

function showAlert(message, type = 'success') {
    console.log(`[${type.toUpperCase()}] ${message}`);
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

// تصدير الدوال للعالمية بشكل آمن (فقط الدوال المعرفة)
Object.assign(window, {
    logout,
    goTo,
    showAlert,
    formatCurrency
});
