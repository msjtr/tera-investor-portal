/* ================================================= */
/* TERA APPLICATION */
/* ================================================= */

'use strict';

/* ================================================= */
/* APP */
/* ================================================= */

const App = {

    initialized:false,

    user:null,

    notifications:[],

    init(){

        console.log(
        'TERA App Started'
        );

        this.loadUser();

        this.checkAuth();

        this.initializeSidebar();

        this.initializeNotifications();

        this.initializeProfile();

        this.initialized = true;

    },

    loadUser(){

        this.user =
        Session.getUser();

    }

};

/* ================================================= */
/* START */
/


/* ================================================= */
/* AUTH CHECK */
/* ================================================= */

App.checkAuth = function(){

    const protectedPages = [

        '/pages/dashboard/',

        '/pages/investments/',

        '/pages/portfolio/',

        '/pages/profile/',

        '/pages/reports/',

        '/pages/security/'

    ];

    const currentPath =
    window.location.pathname;

    const requiresAuth =
    protectedPages.some(path =>
    currentPath.includes(path));

    if(
    requiresAuth &&
    !Session.isLoggedIn()
    ){

        window.location.href =
        '/auth/login.html';

    }

};

/* ================================================= */
/* SIDEBAR */
/* ================================================= */

App.initializeSidebar = function(){

    const toggleBtn =
    document.getElementById(
    'sidebarToggle'
    );

    const sidebar =
    document.getElementById(
    'sidebar'
    );

    if(
    !toggleBtn ||
    !sidebar
    ){
        return;
    }

    toggleBtn.addEventListener(
    'click',
    () => {

        sidebar.classList.toggle(
        'collapsed'
        );

    });

};

/* ================================================= */
/* USER PROFILE */
/* ================================================= */

App.initializeProfile = function(){

    const profileName =
    document.getElementById(
    'profileName'
    );

    const profileEmail =
    document.getElementById(
    'profileEmail'
    );

    if(
    !App.user
    ){
        return;
    }

    if(profileName){

        profileName.textContent =
        App.user.fullName ||
        'شريك تيرا';

    }

    if(profileEmail){

        profileEmail.textContent =
        App.user.email ||
        '';

    }

};
