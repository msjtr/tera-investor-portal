/* ================================================= */
/* TERA CORE - النسخة المستقرة والمحمية (Final Fix) */
/* ================================================= */
'use strict';

const TERA = {
    version: '1.0.0',
    debug: true
};

/* ================================================= */
/* CORE STORAGE */
/* ================================================= */
const Storage = {
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    get: (key) => {
        const item = localStorage.getItem(key);
        try { return item ? JSON.parse(item) : null; } catch { return item; }
    },
    remove: (key) => localStorage.removeItem(key),
    clear: () => localStorage.clear()
};

/* ================================================= */
/* UI FEEDBACK */
/* ================================================= */
function showLoader() {
    const loader = document.getElementById('tera-loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('tera-loader');
    if (loader) loader.style.display = 'none';
}

/* ================================================= */
/* DYNAMIC COMPONENT LOADER (المسارات الذكية) */
/* ================================================= */
async function loadComponents() {
    // تحديد المسار الصحيح بناءً على موقع الصفحة الحالي
    const isRoot = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    const prefix = isRoot ? '.' : '../..';
    
    const components = [
        { selector: '#header-container', path: `${prefix}/components/header.html` },
        { selector: '#footer-container', path: `${prefix}/components/footer.html` },
        { selector: '#sidebar-container', path: `${prefix}/components/sidebar.html` },
        { selector: '#loader-container', path: `${prefix}/components/loader.html` },
        { selector: '#alerts-container', path: `${prefix}/components/alerts.html` }
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
    
    // ضمان إخفاء اللودر دائماً بعد محاولة تحميل المكونات
    hideLoader();
}

/* ================================================= */
/* SESSION & AUTH */
/* ================================================= */
const Session = {
    isLoggedIn: () => !!localStorage.getItem('tera_token'),
    logout: () => {
        Storage.clear();
        window.location.replace('/auth/auth/login/login.html');
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
    if (protectedPaths.some(path => window.location.pathname.includes(path)) && !Session.isLoggedIn()) {
        window.location.replace('/auth/auth/login/login.html');
    }

    console.log('TERA Core System Active');
});
