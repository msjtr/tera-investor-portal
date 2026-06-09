/* ==========================================
   TERA Investor Portal
   Auth JS
========================================== */

window.TERA_AUTH_TOKEN = window.TERA_AUTH_TOKEN || 'tera_token';

/* ==========================================
   Login
========================================== */
function login(token){
    localStorage.setItem(window.TERA_AUTH_TOKEN, token);
    localStorage.setItem('tera_login_time', new Date().toISOString());
    window.location.href = '/pages/dashboard/index.html';
}

/* ==========================================
   Logout
========================================== */
function logout(){
    localStorage.removeItem(window.TERA_AUTH_TOKEN);
    localStorage.removeItem('tera_user');
    sessionStorage.clear();
    window.location.href = '/auth/login.html';
}

/* ==========================================
   Check Authentication
========================================== */
function isAuthenticated(){
    return !!localStorage.getItem(window.TERA_AUTH_TOKEN);
}

/* ==========================================
   Protect Pages
========================================== */
function protectPage(){
    if(!isAuthenticated()){
        window.location.href = '/auth/login.html';
    }
}

/* ==========================================
   Redirect Auth Pages
========================================== */
function redirectIfLoggedIn(){
    if(isAuthenticated()){
        window.location.href = '/pages/dashboard/index.html';
    }
}

/* ==========================================
   Get Current Token
========================================== */
function getToken(){
    return localStorage.getItem(window.TERA_AUTH_TOKEN);
}

/* ==========================================
   User Helpers
========================================== */
function setCurrentUser(user){
    localStorage.setItem('tera_user', JSON.stringify(user));
}

function getCurrentUser(){
    const user = localStorage.getItem('tera_user');
    return user ? JSON.parse(user) : null;
}

/* ==========================================
   Registration Helpers
========================================== */
function saveRegistrationData(data){
    localStorage.setItem('tera_registration', JSON.stringify(data));
}

function getRegistrationData(){
    const data = localStorage.getItem('tera_registration');
    return data ? JSON.parse(data) : null;
}

function clearRegistrationData(){
    localStorage.removeItem('tera_registration');
}

/* ==========================================
   OTP Verification
========================================== */
function verifyOTP(code){
    return !!code;
}

/* ==========================================
   Session Helpers
========================================== */
function getLoginTime(){
    return localStorage.getItem('tera_login_time');
}

/* ==========================================
   Auto Initialize (الأتمتة الذكية للمسارات)
========================================== */
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // 1. حماية الصفحات الداخلية
    if (path.includes('/pages/')) {
        protectPage();
    }

    // 2. منع المستخدم المسجل من العودة لصفحات تسجيل الدخول أو استعادة كلمة المرور
    // تم استثناء مسار التسجيل (/auth/register) لكي يتمكن المستخدم من الوصول له إذا لزم الأمر
    if (path.includes('/auth/login.html') || path.includes('/auth/forgot-password.html')) {
        redirectIfLoggedIn();
    }
});

/* ==========================================
   Global Export
========================================== */
window.login = login;
window.logout = logout;
window.getToken = getToken;
window.protectPage = protectPage;
window.isAuthenticated = isAuthenticated;
window.redirectIfLoggedIn = redirectIfLoggedIn;
window.setCurrentUser = setCurrentUser;
window.getCurrentUser = getCurrentUser;
window.saveRegistrationData = saveRegistrationData;
window.getRegistrationData = getRegistrationData;
window.clearRegistrationData = clearRegistrationData;
window.verifyOTP = verifyOTP;
