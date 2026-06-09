```javascript
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

}

/* ==========================================
   Authentication
========================================== */

function logout(){

    localStorage.removeItem(
        'investorToken'
    );

    sessionStorage.clear();

    window.location.href =
    '/auth/login.html';

}

/* ==========================================
   Currency Formatter
========================================== */

function formatCurrency(amount){

    return new Intl.NumberFormat(
        'ar-SA',
        {
            style:'currency',
            currency:'SAR'
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

        if(
            currentPage.includes(
                link.getAttribute('href')
            )
        ){

            link.classList.add(
                'active'
            );

        }

    });

}

/* ==========================================
   Tooltips Placeholder
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
    .querySelectorAll(
        '.currency'
    )
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

    localStorage.removeItem(
        key
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
```
