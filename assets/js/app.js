/* ==========================================
   TERA Investor Portal - Global App JS (Fixed)
========================================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log('TERA Investor Portal Loaded');
    
    checkProtectedPages();
    
    try {
        initializeApp();
    } catch (err) {
        console.error('Initialization Error:', err);
    }
});

function initializeApp() {
    highlightActiveMenu();
    // حماية الاستدعاء: فقط إذا كانت الدالة موجودة
    if (typeof initializeTooltips === 'function') {
        initializeTooltips();
    } else {
        console.warn('initializeTooltips is not defined, skipping...');
    }
    initializeCurrencyFields();
}

/* ==========================================
   Authentication Functions
========================================== */
function logout() {
    localStorage.removeItem('tera_token');
    sessionStorage.clear();
    window.location.href = '/auth/login.html';
}

function checkProtectedPages() {
    const protectedPaths = ['/pages/dashboard', '/pages/investments', '/pages/portfolio'];
    const currentPath = window.location.pathname;
    const isProtected = protectedPaths.some(path => currentPath.startsWith(path));

    if (isProtected && !localStorage.getItem('tera_token')) {
        window.location.href = '/auth/login.html';
    }
}

/* ==========================================
   Helpers
========================================== */
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

function highlightActiveMenu() {
    const currentPage = window.location.pathname;
    document.querySelectorAll('.sidebar a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && (currentPage === href || currentPage.includes(href))) {
            link.classList.add('active');
        }
    });
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
   Global Export (يجب أن تكون في نهاية الملف)
========================================== */
Object.assign(window, {
    logout,
    goTo,
    showAlert,
    formatCurrency
});
