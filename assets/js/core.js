/**
 * TERA CORE SYSTEM - المحرك الأساسي للمشروع
 * يقوم بإدارة تحميل المكونات المشتركة، حماية الجلسة، والتحكم باللودر.
 */
'use strict';

const TERA = {
    version: '1.0.0',
    // المسارات تبدأ بـ / لضمان أنها دائماً من المجلد الرئيسي للمشروع
    components: {
        header: '/components/header.html',
        sidebar: '/components/sidebar.html',
        footer: '/components/footer.html',
        loader: '/components/loader.html',
        alerts: '/components/alerts.html'
    }
};

/* 1. تحميل المكونات الديناميكي */
async function loadComponent(id, path) {
    const element = document.getElementById(id);
    if (!element) return;
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        element.innerHTML = await response.text();
    } catch (error) {
        console.error(`خطأ في تحميل المكون: ${path}`, error);
    }
}

async function initSystem() {
    // تحميل كافة المكونات بالتوازي
    await Promise.all([
        loadComponent('header-container', TERA.components.header),
        loadComponent('sidebar-container', TERA.components.sidebar),
        loadComponent('footer-container', TERA.components.footer),
        loadComponent('loader-container', TERA.components.loader),
        loadComponent('alerts-container', TERA.components.alerts)
    ]);
    
    // إخفاء اللودر عند اكتمال التحميل
    const loader = document.getElementById('tera-loader');
    if (loader) loader.style.display = 'none';
}

/* 2. حماية الجلسة (Auth Check) */
function checkAuth() {
    const isLoginPage = window.location.pathname.includes('/login/');
    const token = localStorage.getItem('tera_token');

    if (!isLoginPage && !token) {
        // إذا لم يكن هناك توكن وليس في صفحة تسجيل الدخول، حوّله لل login
        window.location.replace('/auth/auth/login/login.html');
    }
}

/* 3. تهيئة النظام عند بدء الصفحة */
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initSystem();
});
