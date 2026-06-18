/**
 * ==========================================================================
 * TERA Investor Portal - Shared Auth Utilities (auth.js)
 * محرك المصادقة والحماية - مصحح ومحكم
 * ==========================================================================
 */
'use strict';

// ========================================================================
// 1. دوال مساعدة للمسارات (متوافقة مع جميع مستويات الصفحات)
// ========================================================================

const getBasePath = () => {
    const path = window.location.pathname;
    const match = path.match(/(.*?)(\/pages\/|\/auth\/|\/assets\/|\/index\.html|$)/);
    let base = match && match[1] ? match[1] : '';
    
    // إزالة الشرطة المائلة الزائدة
    if (base.endsWith('/')) base = base.slice(0, -1);
    
    return base;
};

const resolvePath = (relativePath) => {
    // التأكد من أن المسار ينتهي بـ .html إذا كان ملف HTML
    if (!relativePath.endsWith('.html') && !relativePath.includes('.') && !relativePath.includes('?')) {
        relativePath = relativePath + '.html';
    }
    
    const base = getBasePath();
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return base ? `/${base}/${cleanPath}` : `/${cleanPath}`;
};

// ========================================================================
// 2. كائن المصادقة الرئيسي
// ========================================================================

const TeraAuth = {
    basePath: getBasePath(),

    checkSession: function() {
        const token = localStorage.getItem('tera_token');
        const currentPage = window.location.pathname;
        
        // تحديد نوع الصفحة الحالية
        const isAuthPage = /\/auth\//.test(currentPage);
        const isLandingPage = currentPage === '/' || 
                              currentPage.endsWith('index.html') && !currentPage.includes('/pages/');
        const isPublicPage = isAuthPage || isLandingPage;
        const isProtectedPage = !isPublicPage;
        
        // الحالة 1: مستخدم غير مسجل الدخول في صفحة محمية
        if (!token && isProtectedPage) {
            const loginUrl = resolvePath('/auth/auth/login/login.html');
            console.log('🔐 توجيه غير مسجل الدخول إلى:', loginUrl);
            window.location.replace(loginUrl);
            return;
        }
        
        // الحالة 2: مستخدم مسجل الدخول في صفحة عامة
        if (token && isPublicPage) {
            const dashboardUrl = resolvePath('/pages/dashboard/index.html');
            console.log('🚀 توجيه مستخدم مسجل إلى:', dashboardUrl);
            window.location.replace(dashboardUrl);
            return;
        }
    },

    logout: function(isSessionExpired = false) {
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        sessionStorage.clear();
        
        if (isSessionExpired) {
            alert('⏳ انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.');
        }
        
        const loginUrl = resolvePath('/auth/auth/login/login.html');
        console.log('🚪 تسجيل الخروج والتوجيه إلى:', loginUrl);
        window.location.replace(loginUrl);
    },

    initPasswordToggles: function() {
        document.addEventListener('click', function(e) {
            const toggleBtn = e.target.closest('.password-toggle, .toggle-password, .show-password-btn');
            if (!toggleBtn) return;
            
            const wrapper = toggleBtn.closest('.password-wrapper, .input-group, .form-group');
            if (!wrapper) return;
            
            const input = wrapper.querySelector('input[type="password"], input[type="text"]');
            if (!input) return;
            
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
            }
        });
    },

    login: function(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email && password && password.length >= 6) {
                    const user = {
                        id: 1,
                        name: 'أحمد محمد',
                        email: email,
                        role: 'investor'
                    };
                    localStorage.setItem('tera_token', 'mock-jwt-token-xyz');
                    localStorage.setItem('tera_user', JSON.stringify(user));
                    resolve(user);
                } else {
                    reject(new Error('بيانات الدخول غير صحيحة'));
                }
            }, 500);
        });
    }
};

// ========================================================================
// 3. التنفيذ عند تحميل الصفحة
// ========================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 TeraAuth initialized. Base path:', TeraAuth.basePath);
    TeraAuth.checkSession();
    TeraAuth.initPasswordToggles();
});

// ========================================================================
// 4. ربط أزرار تسجيل الخروج
// ========================================================================

document.addEventListener('click', function(e) {
    const logoutBtn = e.target.closest('.logout-btn, .btn-logout, #btn-logout');
    if (!logoutBtn) return;
    
    e.preventDefault();
    const confirmLogout = confirm('🔒 هل أنت متأكد من رغبتك في تسجيل الخروج؟');
    if (confirmLogout) {
        TeraAuth.logout();
    }
});

// تصدير الكائن للنطاق العام
window.TeraAuth = TeraAuth;
window.isUserLoggedIn = function() { return !!localStorage.getItem('tera_token'); };
window.getCurrentUser = function() {
    try { return JSON.parse(localStorage.getItem('tera_user')); } 
    catch { return null; }
};

console.log('✅ auth.js loaded successfully');
