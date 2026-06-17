/* ================================================= */
/* TERA CORE - النسخة المستقرة والمحمية (Final Fix) */
/* ================================================= */
'use strict';

const TERA = {
    version: '1.0.0',
    debug: true
};

/* ================================================= */
/* UI FEEDBACK - (إصلاح اللودر) */
/* ================================================= */
function showLoader() {
    let loader = document.getElementById('tera-loader');
    if (loader) {
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    let loader = document.getElementById('tera-loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

/* ================================================= */
/* DYNAMIC COMPONENT LOADER */
/* ================================================= */
async function loadComponents() {
    // تحديد المسار النسبي الصحيح بناءً على عمق المجلدات
    const pathParts = window.location.pathname.split('/').filter(p => p.length > 0);
    const depth = pathParts.length > 1 ? '../..' : '.';
    
    const components = [
        { selector: '#header-container', path: `${depth}/components/header.html` },
        { selector: '#footer-container', path: `${depth}/components/footer.html` },
        { selector: '#sidebar-container', path: `${depth}/components/sidebar.html` },
        { selector: '#loader-container', path: `${depth}/components/loader.html` },
        { selector: '#alerts-container', path: `${depth}/components/alerts.html` }
    ];

    for (const comp of components) {
        const element = document.querySelector(comp.selector);
        if (element) {
            try {
                const res = await fetch(comp.path);
                if (res.ok) {
                    element.innerHTML = await res.text();
                }
            } catch (err) {
                console.warn(`خطأ في تحميل المكون: ${comp.path}`);
            }
        }
    }
    
    // تأخير بسيط لضمان ظهور المحتوى بسلاسة بعد إخفاء اللودر
    setTimeout(hideLoader, 500);
}

/* ================================================= */
/* SESSION & AUTH */
/* ================================================= */
const Session = {
    isLoggedIn: () => !!localStorage.getItem('tera_token'),
    logout: () => {
        localStorage.clear();
        // التأكد من توجيه المستخدم لمسار تسجيل الدخول الصحيح
        window.location.href = '/auth/auth/login/login.html';
    }
};

/* ================================================= */
/* INITIALIZATION */
/* ================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. إظهار اللودر فوراً
    showLoader();

    // 2. تحميل المكونات
    await loadComponents();
    
    // 3. حماية الصفحات
    const protectedPaths = ['/pages/dashboard', '/pages/portfolio', '/pages/investments', '/pages/profile', '/pages/security', '/pages/reports'];
    const currentPath = window.location.pathname;
    
    if (protectedPaths.some(path => currentPath.includes(path)) && !Session.isLoggedIn()) {
        window.location.replace('/auth/auth/login/login.html');
    }

    console.log('TERA Core System Active');
});
