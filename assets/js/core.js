const page = window.location.pathname;

if(page.includes('dashboard')){
    console.log('Dashboard Loaded');
}

if(page.includes('investments')){
    console.log('Investments Loaded');
}

if(page.includes('portfolio')){
    console.log('Portfolio Loaded');
}

if(page.includes('security')){
    console.log('Security Loaded');
}
