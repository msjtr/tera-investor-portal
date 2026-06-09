/* ==========================================
   TERA Investor Portal - Global App JS (Fixed)
========================================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log('TERA Investor Portal Loaded');
    
    // حماية الصفحات أولاً قبل تهيئة الواجهة
    checkProtectedPages();
    
    // تغليف الدوال في try-catch لمنع توقف السكربت في حال فشل عنصر واحد
    try {
        initializeApp();
    } catch (err) {
        console.error('Initialization Error:', err);
    }
});

function initializeApp() {
    highlightActiveMenu();
    initializeTooltips();
    initializeCurrencyFields();
}

/* ==========================================
   Authentication & Security
========================================== */
const AUTH_TOKEN = 'tera_token';

function isAuthenticated() {
    return !!localStorage.getItem(AUTH_TOKEN);
}

function checkProtectedPages() {
    const protectedPaths = ['/pages/dashboard', '/pages/investments', '/pages/portfolio'];
    const currentPath = window.location.pathname;

    // استخدام some مع مطابقة دقيقة أو أكثر ذكاءً
    const isProtected = protectedPaths.some(path => currentPath.startsWith(path));

    if (isProtected && !isAuthenticated()) {
        window.location.href = '/auth/login.html';
    }
}

/* ==========================================
   Active Menu (Fixed Logic)
========================================== */
function highlightActiveMenu() {
    const currentPage = window.location.pathname;
    const links = document.querySelectorAll('.sidebar a');

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;

        // مطابقة دقيقة للمسار لمنع تضارب الروابط
        if (currentPage === href || (href !== '/' && currentPage.includes(href))) {
            link.classList.add('active');
        }
    });
}

/* ==========================================
   Global Utilities
========================================== */
function showAlert(message, type = 'success') {
    // استبدل alert بنظام تنبيهات (يمكنك لاحقاً ربطه بـ toast library)
    console.log(`[${type.toUpperCase()}] ${message}`);
    // إزالة alert() لتجنب إزعاج المستخدم
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
   Formatting Helpers
========================================== */
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 2
    }).format(amount);
}

// تصدير الدوال للعالمية بشكل آمن
Object.assign(window, {
    logout,
    goTo,
    showAlert,
    formatCurrency
});
