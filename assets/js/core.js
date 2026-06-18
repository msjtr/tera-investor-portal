/* ================================================= */
/* TERA CORE - النسخة المستقرة والمحمية (Final Fix) */
/* ================================================= */
'use strict';

// دالة لاكتشاف المسار الجذري للمشروع ديناميكياً لتجنب أخطاء 404
const getBasePath = () => {
    const path = window.location.pathname;
    // تبحث عن بداية مجلدات المشروع وتقص ما قبلها
    const match = path.match(/(.*)(\/pages\/|\/auth\/|\/index\.html|$)/);
    return match && match[1] ? match[1] : '';
};

const TERA = {
    version: '1.0.1',
    debug: true,
    basePath: getBasePath()
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
    // دمج المسار الجذري مع مسار المكونات لضمان الوصول الصحيح دائماً
    const components = [
        { selector: '#header-container', path: `${TERA.basePath}/components/header.html` },
        { selector: '#footer-container', path: `${TERA.basePath}/components/footer.html` },
        { selector: '#sidebar-container', path: `${TERA.basePath}/components/sidebar.html` },
        { selector: '#loader-container', path: `${TERA.basePath}/components/loader.html` },
        { selector: '#alerts-container', path: `${TERA.basePath}/components/alerts.html` }
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
        // استخدام المسار الديناميكي لتوجيه آمن
        window.location.href = `${TERA.basePath}/auth/auth/login/login.html`;
    },

    checkAuth: () => {
        const protectedPaths = ['/dashboard', '/portfolio', '/investments', '/profile', '/security', '/reports'];
        const currentPath = window.location.pathname;
        
        const isProtected = protectedPaths.some(path => currentPath.includes(path));
        
        if (isProtected && !Session.isLoggedIn()) {
            window.location.replace(`${TERA.basePath}/auth/auth/login/login.html`);
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
