/* ==========================================
   TERA Investor Portal
   Main JS
========================================== */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        const page =
        window.location.pathname;

        console.log(
            'Current Page:',
            page
        );

        /* Dashboard */

        if(
            page.includes(
                '/pages/dashboard/'
            )
        ){

            console.log(
                'Dashboard Loaded'
            );

        }

        /* Investments */

        if(
            page.includes(
                '/pages/investments/'
            )
        ){

            console.log(
                'Investments Loaded'
            );

        }

        /* Portfolio */

        if(
            page.includes(
                '/pages/portfolio/'
            )
        ){

            console.log(
                'Portfolio Loaded'
            );

        }

        /* Reports */

        if(
            page.includes(
                '/pages/reports/'
            )
        ){

            console.log(
                'Reports Loaded'
            );

        }

        /* Profile */

        if(
            page.includes(
                '/pages/profile/'
            )
        ){

            console.log(
                'Profile Loaded'
            );

        }

        /* Security */

        if(
            page.includes(
                '/pages/security/'
            )
        ){

            console.log(
                'Security Loaded'
            );

        }

        /* Support */

        if(
            page.includes(
                '/pages/support/'
            )
        ){

            console.log(
                'Support Loaded'
            );

        }

        /* Authentication */

        if(
            page.includes('/auth/')
        ){

            console.log(
                'Authentication Page Loaded'
            );

        }

    }
);

/* ==========================================
   Helpers
========================================== */

function getCurrentPage(){

    return window.location.pathname;

}

function pageContains(path){

    return window.location.pathname
    .includes(path);

}

window.getCurrentPage =
getCurrentPage;

window.pageContains =
pageContains;
