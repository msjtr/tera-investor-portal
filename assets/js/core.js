/* ================================================= */
/* TERA CORE - النسخة المستقرة والمحمية (Final Fix) */
/* ================================================= */
'use strict';

/**
 * TERA Configuration
 * basePath: نستخدم '/' كمسار جذري ثابت لضمان عمل المكونات 
 * من أي صفحة (سواء في الجذر أو داخل المجلدات الفرعية).
 */
const TERA = {
    version: '1.0.1',
    debug: true,
    basePath: '' // تم تركها فارغة ليتم التعامل مع المسارات كجذرية
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
/* DYNAMIC COMPONENT LOADER */
/* ================================================= */
async function loadComponents() {
    // تم تعديل المسارات لتبدأ بـ / لضمان أنها تشير دائماً للجذر (Root)
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
    setTimeout(hideLoader, 500);
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
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('/auth/');
        
        // إذا كان المسار يتطلب حماية وليس صفحة مصادقة
        const isProtected = !isAuthPage && !currentPath.endsWith('index.html') && currentPath !== '/';
        
        if (isProtected && !Session.isLoggedIn()) {
            window.location.replace('/auth/auth/login/login.html');
        }
    }
};

/* ================================================= */
/* INITIALIZATION */
/* ================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. فحص الجلسة
    Session.checkAuth();

    // 2. إظهار اللودر
    showLoader();

    // 3. تحميل المكونات
    await loadComponents();
    
    console.log('TERA Core System Initialized.');
});
