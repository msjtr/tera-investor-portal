/* ================================================= */
/* TERA CORE - النسخة المستقرة والمحمية (Final Fix) */
/* ================================================= */
'use strict';

const TERA = {
    version: '1.0.0',
    debug: true,
    // تحديد المسار الأساسي للمشروع لضمان عمل المكونات من أي مكان
    baseURL: window.location.origin + '/tera-investor-portal-main'
};

/* ================================================= */
/* UI FEEDBACK */
/* ================================================= */
function showLoader() {
    let loader = document.getElementById('tera-loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    let loader = document.getElementById('tera-loader');
    if (loader) loader.style.display = 'none';
}

/* ================================================= */
/* DYNAMIC COMPONENT LOADER */
/* ================================================= */
async function loadComponents() {
    // نستخدم المسارات المطلوبة من جذر المشروع لضمان الاستقرار
    const components = [
        { selector: '#header-container', path: '/components/header.html' },
        { selector: '#footer-container', path: '/components/footer.html' },
        { selector: '#sidebar-container', path: '/components/sidebar.html' },
        { selector: '#loader-container', path: '/components/loader.html' },
        { selector: '#alerts-container', path: '/components/alerts.html' }
    ];

    for (const comp of components) {
        const element = document.querySelector(comp.selector);
        if (element) {
            try {
                // محاولة جلب المكون
                const res = await fetch(comp.path);
                if (res.ok) {
                    element.innerHTML = await res.text();
                } else {
                    console.warn(`فشل تحميل المكون: ${comp.path} - حالة: ${res.status}`);
                }
            } catch (err) {
                console.error(`خطأ في الاتصال بالمكون: ${comp.path}`, err);
            }
        }
    }
    
    // إخفاء اللودر بعد اكتمال التحميل
    setTimeout(hideLoader, 300);
}

/* ================================================= */
/* SESSION & AUTH */
/* ================================================= */
const Session = {
    isLoggedIn: () => !!localStorage.getItem('tera_token'),
    
    logout: () => {
        localStorage.clear();
        window.location.href = '/auth/auth/login/login.html';
    },

    checkAuth: () => {
        const protectedPaths = ['/dashboard', '/portfolio', '/investments', '/profile', '/security', '/reports'];
        const currentPath = window.location.pathname;
        
        const isProtected = protectedPaths.some(path => currentPath.includes(path));
        
        if (isProtected && !Session.isLoggedIn()) {
            window.location.replace('/auth/auth/login/login.html');
        }
    }
};

/* ================================================= */
/* INITIALIZATION */
/* ================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. فحص الجلسة أولاً
    Session.checkAuth();

    // 2. إظهار اللودر
    showLoader();

    // 3. تحميل المكونات
    await loadComponents();
    
    console.log('TERA Core System Initialized Successfully.');
});
