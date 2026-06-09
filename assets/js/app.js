/* ==========================================
   TERA Investor Portal
   Global App JS
========================================== */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        console.log(
            'TERA Investor Portal Loaded'
        );

        initializeApp();

    }
);

/* ==========================================
   Initialize Application
========================================== */

function initializeApp(){

    highlightActiveMenu();

    initializeTooltips();

    initializeCurrencyFields();

    checkProtectedPages();

}

/* ==========================================
   Authentication
========================================== */

const AUTH_TOKEN = 'tera_token';

function isAuthenticated(){

    return !!localStorage.getItem(
        AUTH_TOKEN
    );

}

function logout(){

    localStorage.removeItem(
        AUTH_TOKEN
    );

    sessionStorage.clear();

    window.location.href =
    '/auth/login.html';

}

function checkProtectedPages(){

    const protectedPaths = [

        '/pages/dashboard/',
        '/pages/investments/',
        '/pages/portfolio/',
        '/pages/profile/',
        '/pages/reports/',
        '/pages/security/',
        '/pages/support/'

    ];

    const currentPath =
    window.location.pathname;

    const isProtected =
    protectedPaths.some(path =>
        currentPath.includes(path)
    );

    if(
        isProtected &&
        !isAuthenticated()
    ){

        window.location.href =
        '/auth/login.html';

    }

}

/* ==========================================
   Currency Formatter
========================================== */

function formatCurrency(amount){

    return new Intl.NumberFormat(
        'ar-SA',
        {
            style:'currency',
            currency:'SAR',
            minimumFractionDigits:2
        }
    ).format(amount);

}

/* ==========================================
   Number Formatter
========================================== */

function formatNumber(number){

    return new Intl.NumberFormat(
        'ar-SA'
    ).format(number);

}

/* ==========================================
   Date Formatter
========================================== */

function formatDate(date){

    return new Date(date)
    .toLocaleDateString(
        'ar-SA'
    );

}

/* ==========================================
   Notifications
========================================== */

function showAlert(
    message,
    type = 'success'
){

    console.log(
        `[${type}] ${message}`
    );

    alert(message);

}

/* ==========================================
   Active Menu
========================================== */

function highlightActiveMenu(){

    const currentPage =
    window.location.pathname;

    const links =
    document.querySelectorAll(
        '.sidebar a'
    );

    links.forEach(link => {

        const href =
        link.getAttribute('href');

        if(
            href &&
            currentPage.includes(href)
        ){

            link.classList.add(
                'active'
            );

        }

    });

}

/* ==========================================
   Tooltips
========================================== */

function initializeTooltips(){

    console.log(
        'Tooltips Ready'
    );

}

/* ==========================================
   Currency Fields
========================================== */

function initializeCurrencyFields(){

    document
    .querySelectorAll('.currency')
    .forEach(field => {

        const value =
        parseFloat(
            field.dataset.amount
        );

        if(!isNaN(value)){

            field.innerText =
            formatCurrency(value);

        }

    });

}

/* ==========================================
   Local Storage Helpers
========================================== */

function setStorage(
    key,
    value
){

    localStorage.setItem(
        key,
        JSON.stringify(value)
    );

}

function getStorage(
    key
){

    const value =
    localStorage.getItem(key);

    return value
        ? JSON.parse(value)
        : null;

}

function removeStorage(
    key
){

    localStorage.removeItem(key);

}

/* ==========================================
   User Helpers
========================================== */

function getCurrentUser(){

    return getStorage(
        'tera_user'
    );

}

function saveCurrentUser(user){

    setStorage(
        'tera_user',
        user
    );

}

/* ==========================================
   Navigation Helpers
========================================== */

function goTo(url){

    window.location.href =
    url;

}

function goBack(){

    history.back();

}

/* ==========================================
   Loading Helpers
========================================== */

function showLoader(){

    const loader =
    document.querySelector(
        '.loader'
    );

    if(loader){

        loader.style.display =
        'flex';

    }

}

function hideLoader(){

    const loader =
    document.querySelector(
        '.loader'
    );

    if(loader){

        loader.style.display =
        'none';

    }

}

/* ==========================================
   Dashboard Helpers
========================================== */

function updateStatistic(
    selector,
    value
){

    const element =
    document.querySelector(
        selector
    );

    if(element){

        element.innerText =
        value;

    }

}

/* ==========================================
   Notification Counter
========================================== */

function updateNotificationCount(
    count
){

    const badge =
    document.querySelector(
        '.notification-count'
    );

    if(badge){

        badge.innerText = count;

        badge.style.display =
        count > 0
        ? 'inline-flex'
        : 'none';

    }

}

/* ==========================================
   Global Export
========================================== */

window.logout = logout;
window.goTo = goTo;
window.goBack = goBack;
window.showAlert = showAlert;
window.showLoader = showLoader;
window.hideLoader = hideLoader;
window.formatCurrency = formatCurrency;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
