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
