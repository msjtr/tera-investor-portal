/* ================================================= */
/* TERA CORE */
/* ================================================= */

'use strict';

/* ================================================= */
/* APP CONFIG */
/* ================================================= */

const TERA = {

    version: '1.0.0',

    apiUrl: '/api',

    debug: true

};

/* ================================================= */
/* SELECTORS */
/* ================================================= */

const $ = (selector) => {

    return document.querySelector(selector);

};

const $$ = (selector) => {

    return document.querySelectorAll(selector);

};

/* ================================================= */
/* DOM READY */
/* ================================================= */

document.addEventListener(
'DOMContentLoaded',
() => {

    initializeCore();

}
);

/* ================================================= */
/* INITIALIZE */
/* ================================================= */

function initializeCore(){

    loadComponents();

    initializeTooltips();

    initializeAlerts();

    initializeModals();

}

/* ================================================= */
/* COMPONENTS */
/* ================================================= */

function loadComponents(){

    loadComponent(
        '#header-container',
        '../../components/header.html'
    );

    loadComponent(
        '#footer-container',
        '../../components/footer.html'
    );

    loadComponent(
        '#sidebar-container',
        '../../components/sidebar.html'
    );

    loadComponent(
        '#alerts-container',
        '../../components/alerts.html'
    );

}

function loadComponent(
selector,
path
){

    const element =
    document.querySelector(selector);

    if(!element){
        return;
    }

    fetch(path)

    .then(response => {

        if(!response.ok){

            throw new Error(
            'Failed to load component'
            );

        }

        return response.text();

    })

    .then(html => {

        element.innerHTML = html;

    })

    .catch(error => {

        console.error(error);

    });

}

/* ================================================= */
/* LOADER */
/* ================================================= */

function showLoader(){

    const loader =
    document.getElementById('loader');

    if(loader){

        loader.style.display = 'flex';

    }

}

function hideLoader(){

    const loader =
    document.getElementById('loader');

    if(loader){

        loader.style.display = 'none';

    }

}
