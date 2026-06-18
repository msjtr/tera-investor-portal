/**
 * ============================================================
 * auth.js - محرك المصادقة والحماية - نسخة مصححة
 * ============================================================
 * - يمنع التوجيه في صفحات المصادقة
 * - يمنع حلقة إعادة التوجيه إلى صفحة الدخول
 * - يستخدم مسارات absolute لتفادي تضاعف المسار
 */
'use strict';

// ========================================================================
// 1. المسارات الثابتة
// ========================================================================
const PATHS = {
    login: '/auth/auth/login/login.html',
    dashboard: '/pages/dashboard/index.html',
    register: '/auth/register/register.html',
    forgotPassword: '/auth/forgot-password.html',
    resetPassword: '/auth/reset-password.html',
    verifyOtp: '/auth/verify-otp.html',
    completeProfile: '/auth/complete-profile.html'
};

// ========================================================================
// 2. كائن المصادقة الرئيسي
// ========================================================================
const TeraAuth = {
    _isChecking: false,
    _lastCheckTime: 0,
    _blockCheck: false,

    getCurrentPath: function() {
        return window.location.pathname;
    },

    isAuthPage: function(path = this.getCurrentPath()) {
        return (
            path === PATHS.login ||
            path === PATHS.register ||
            path === PATHS.forgotPassword ||
            path === PATHS.resetPassword ||
            path === PATHS.verifyOtp ||
            path === PATHS.completeProfile ||
            path.startsWith('/auth/')
        );
    },

    isLandingPage: function(path = this.getCurrentPath()) {
        return path === '/' || path === '/index.html';
    },

    isProtectedPage: function(path = this.getCurrentPath()) {
        return !this.isAuthPage(path) && !this.isLandingPage(path);
    },

    redirectTo: function(url) {
        const current = this.getCurrentPath();
        if (current === url) return;
        window.location.replace(url);
    },

    checkSession: function() {
        if (this._blockCheck) {
            console.log('⛔ [Auth] checkSession محظور في هذه الصفحة');
            return;
        }

        const now = Date.now();
        if (this._isChecking || now - this._lastCheckTime < 500) {
            console.log('⏳ [Auth] منع تنفيذ checkSession المتكرر');
            return;
        }

        this._isChecking = true;
        this._lastCheckTime = now;

        try {
            const currentPage = this.getCurrentPath();
            const token = localStorage.getItem('tera_token');
            const isAuthPage = this.isAuthPage(currentPage);
            const isLandingPage = this.isLandingPage(currentPage);
            const isPublicPage = isAuthPage || isLandingPage;
            const isProtectedPage = !isPublicPage;

            if (!token && isProtectedPage) {
                console.log('🔐 [Auth] غير مسجل الدخول -> صفحة الدخول');
                this.redirectTo(PATHS.login);
                return;
            }

            if (token && isPublicPage) {
                console.log('🚀 [Auth] مسجل الدخول -> لوحة التحكم');
                this.redirectTo(PATHS.dashboard);
                return;
            }

            console.log('✅ [Auth] لا حاجة لتوجيه، الصفحة الحالية:', currentPage);
        } finally {
            this._isChecking = false;
        }
    },

    blockCheck: function() {
        this._blockCheck = true;
        console.log('⛔ [Auth] تم حظر checkSession نهائياً');
    },

    unblockCheck: function() {
        this._blockCheck = false;
        console.log('🔓 [Auth] تم إلغاء حظر checkSession');
    },

    disableAutoRedirect: function() {
        this._isChecking = true;
        console.log('🔒 [Auth] تم تعطيل التوجيه التلقائي مؤقتاً');
    },

    enableAutoRedirect: function() {
        this._isChecking = false;
        console.log('🔓 [Auth] تم إعادة تفعيل التوجيه التلقائي');
    },

    logout: function(isSessionExpired = false) {
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        localStorage.removeItem('tera_remember');
        localStorage.removeItem('tera_identifier');
        sessionStorage.clear();

        if (isSessionExpired) {
            alert('⏳ انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.');
        }

        console.log('🚪 [Auth] تسجيل الخروج إلى:', PATHS.login);
        this.redirectTo(PATHS.login);
    },

    login: function(identifier, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (!identifier || !password) {
                    reject(new Error('يرجى إدخال جميع البيانات المطلوبة.'));
                    return;
                }

                if (password.length < 3) {
                    reject(new Error('كلمة المرور يجب أن تكون 3 أحرف على الأقل.'));
                    return;
                }

                const mockUsers = [
                    { username: '106', email: 'investor106@tera.sa', mobile: '506060606', password: '123' },
                    { username: 'admin', email: 'admin@tera.sa', mobile: '500000000', password: 'admin123' }
                ];

                const normalizedIdentifier = String(identifier).trim().toLowerCase();
                const matchedUser = mockUsers.find(u =>
                    u.username.toLowerCase() === normalizedIdentifier ||
                    u.email.toLowerCase() === normalizedIdentifier ||
                    u.mobile === String(identifier).trim()
                );

                if (matchedUser && matchedUser.password === password) {
                    const user = {
                        id: 1,
                        name: matchedUser.username === 'admin' ? 'مدير النظام' : 'أحمد محمد',
                        email: matchedUser.email,
                        role: matchedUser.username === 'admin' ? 'admin' : 'investor',
                        verified: true,
                        loginTime: new Date().toISOString()
                    };

                    localStorage.setItem('tera_token', 'jwt-token-' + Date.now());
                    localStorage.setItem('tera_user', JSON.stringify(user));
                    this.enableAutoRedirect();
                    this.unblockCheck();

                    console.log('✅ [Auth] تم تسجيل الدخول بنجاح:', user);
                    resolve(user);
                } else {
                    reject(new Error('البيانات المدخلة غير متطابقة مع سجلات المستثمرين.'));
                }
            }, 800);
        });
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

    getCurrentUser: function() {
        try {
            const userData = localStorage.getItem('tera_user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.warn('⚠️ [Auth] خطأ في قراءة بيانات المستخدم:', error);
            return null;
        }
    },

    isLoggedIn: function() {
        return !!localStorage.getItem('tera_token');
    }
};

// ========================================================================
// 3. التنفيذ عند تحميل الصفحة
// ========================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 [Auth] TeraAuth initialized.');

    const currentPage = window.location.pathname;
    const isAuthPage = TeraAuth.isAuthPage(currentPage);

    if (isAuthPage) {
        console.log('🔒 [Auth] صفحة مصادقة: تعطيل التوجيه وحظر checkSession');
        TeraAuth.disableAutoRedirect();
        TeraAuth.blockCheck();
    } else {
        TeraAuth.checkSession();
    }

    TeraAuth.initPasswordToggles();

    if (TeraAuth.isLoggedIn()) {
        const user = TeraAuth.getCurrentUser();
        console.log('👤 [Auth] مستخدم مسجل:', user ? user.name : 'غير معروف');
    } else {
        console.log('👤 [Auth] مستخدم غير مسجل');
    }
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

// ========================================================================
// 5. تصدير الكائنات العامة
// ========================================================================
window.TeraAuth = TeraAuth;
window.isUserLoggedIn = TeraAuth.isLoggedIn.bind(TeraAuth);
window.getCurrentUser = TeraAuth.getCurrentUser.bind(TeraAuth);

console.log('✅ [Auth] auth.js loaded successfully');

// ========================================================================
// 6. تنظيف المفاتيح القديمة
// ========================================================================
(function cleanupOldKeys() {
    const oldToken = localStorage.getItem('tera_auth_token');
    const oldUser = localStorage.getItem('tera_user_data');

    if (oldToken && !localStorage.getItem('tera_token')) {
        console.log('🔄 [Auth] ترقية المفتاح القديم tera_auth_token إلى tera_token');
        localStorage.setItem('tera_token', oldToken);
        localStorage.removeItem('tera_auth_token');
    }

    if (oldUser && !localStorage.getItem('tera_user')) {
        console.log('🔄 [Auth] ترقية المفتاح القديم tera_user_data إلى tera_user');
        localStorage.setItem('tera_user', oldUser);
        localStorage.removeItem('tera_user_data');
    }
})();
