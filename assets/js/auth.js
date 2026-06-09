/* ==========================================
   TERA Investor Portal - Auth JS (Optimized)
========================================== */

// استخدام Object ثابت لمنع تعديل الثوابت
const AUTH_CONFIG = {
    TOKEN_KEY: 'tera_token',
    USER_KEY: 'tera_user',
    REG_KEY: 'tera_registration',
    LOGIN_TIME: 'tera_login_time'
};

/* ==========================================
   Auth Core Functions
========================================== */
function login(token) {
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
    localStorage.setItem(AUTH_CONFIG.LOGIN_TIME, new Date().toISOString());
    window.location.href = '/pages/dashboard/index.html';
}

function logout() {
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    localStorage.removeItem(AUTH_CONFIG.REG_KEY);
    sessionStorage.clear();
    window.location.href = '/auth/login.html';
}

function isAuthenticated() {
    return !!localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
}

/* ==========================================
   Security & Protection
========================================== */
function protectPage() {
    if (!isAuthenticated()) {
        window.location.href = '/auth/login.html';
    }
}

function redirectIfLoggedIn() {
    if (isAuthenticated()) {
        window.location.href = '/pages/dashboard/index.html';
    }
}

/* ==========================================
   Data Persistence
========================================== */
function setCurrentUser(user) {
    localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
}

function getCurrentUser() {
    const user = localStorage.getItem(AUTH_CONFIG.USER_KEY);
    try { return user ? JSON.parse(user) : null; } catch { return null; }
}

// ... (باقي دوال الـ Registration والـ OTP كما هي) ...

/* ==========================================
   Smart Auto-Router
========================================== */
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // 1. حماية أي صفحة داخل مجلد pages/
    if (path.startsWith('/pages/')) {
        protectPage();
    }

    // 2. منع الوصول لصفحات الـ Auth للمسجلين (مع استثناء صفحة التسجيل)
    const authPages = ['/auth/login.html', '/auth/forgot-password.html'];
    if (authPages.includes(path)) {
        redirectIfLoggedIn();
    }
});

/* ==========================================
   Global Export
========================================== */
Object.assign(window, {
    login,
    logout,
    isAuthenticated,
    protectPage,
    redirectIfLoggedIn,
    getCurrentUser,
    setCurrentUser,
    // ... باقي الدوال
});
