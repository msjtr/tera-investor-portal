/* ==========================================
   TERA Investor Portal
   Auth JS
========================================== */

/* ==========================================
   Login
========================================== */

function login(token){

    localStorage.setItem(
        'investorToken',
        token
    );

    localStorage.setItem(
        'isLoggedIn',
        'true'
    );

    window.location.href =
    '/pages/dashboard/index.html';

}

/* ==========================================
   Logout
========================================== */

function logout(){

    localStorage.removeItem(
        'investorToken'
    );

    localStorage.removeItem(
        'isLoggedIn'
    );

    sessionStorage.clear();

    window.location.href =
    '/auth/login.html';

}

/* ==========================================
   Check Authentication
========================================== */

function isAuthenticated(){

    return !!localStorage.getItem(
        'investorToken'
    );

}

/* ==========================================
   Protect Pages
========================================== */

function protectPage(){

    const token =
    localStorage.getItem(
        'investorToken'
    );

    if(!token){

        window.location.href =
        '/auth/login.html';

    }

}

/* ==========================================
   Redirect Auth Pages
========================================== */

function redirectIfLoggedIn(){

    const token =
    localStorage.getItem(
        'investorToken'
    );

    if(token){

        window.location.href =
        '/pages/dashboard/index.html';

    }

}

/* ==========================================
   Get Current Token
========================================== */

function getToken(){

    return localStorage.getItem(
        'investorToken'
    );

}
