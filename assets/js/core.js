/* ================================================= */
/* TERA CORE - النسخة المستقرة والمحمية */
/* ================================================= */
'use strict';

const TERA = {
    version: '1.0.0',
    debug: true
};

/* ================================================= */
/* CORE STORAGE (إدارة البيانات المحلية) */
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
/* UI FEEDBACK (التنبيهات واللودر) */
/* ================================================= */
function successAlert(msg) { console.log('Success:', msg); alert('✅ ' + msg); }
function errorAlert(msg) { console.error('Error:', msg); alert('❌ ' + msg); }

function showLoader() {
    const loader = document.getElementById('tera-loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('tera-loader');
    if (loader) loader.style.display = 'none';
}

/* ================================================= */
/* DYNAMIC COMPONENT LOADER (ربط المكونات) */
/* ================================================= */
/**
 * يقوم بجلب المكونات من مجلد /components باستخدام المسارات المطلقة
 */
async function loadComponents() {
    const components = [
        { selector: '#header-container', path: '/components/header.html' },
        { selector: '#footer-container', path: '/components/footer.html' },
        { selector: '#sidebar-container', path: '/components/sidebar.html' },
        { selector: '#loader-container', path: '/components/loader.html' }
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
                console.warn(`Could not load ${comp.path}`, err);
            }
        }
    }
}

/* ================================================= */
/* SESSION MANAGEMENT (إدارة الجلسة) */
/* ================================================= */
const Session = {
    setUser: (user) => Storage.set('tera_user', user),
    getUser: () => Storage.get('tera_user'),
    isLoggedIn: () => !!localStorage.getItem('tera_token'),
    logout: () => {
        Storage.clear();
        localStorage.removeItem('tera_token');
        window.location.replace('/auth/auth/login/login.html');
    }
};

/* ================================================= */
/* FORMATTERS (تنسيق العملات والأرقام) */
/* ================================================= */
const Format = {
    currency: (val) => new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(val),
    date: (date) => new Intl.DateTimeFormat('ar-SA').format(new Date(date))
};

/* ================================================= */
/* INITIALIZATION */
/* ================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. تحميل المكونات أولاً
    await loadComponents();
    
    // 2. حماية الصفحات
    const protectedPaths = ['/pages/dashboard', '/pages/portfolio', '/pages/investments', '/pages/profile', '/pages/security', '/pages/reports'];
    if (protectedPaths.some(path => window.location.pathname.includes(path)) && !Session.isLoggedIn()) {
        window.location.replace('/auth/auth/login/login.html');
    }

    // 3. تفعيل الأدوات
    console.log('TERA Core System Active');
});
