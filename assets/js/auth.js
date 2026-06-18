/**
 * ============================================================
 * auth.js - محرك المصادقة والحماية - النسخة المستقرة النهائية
 * ============================================================
 * - يعالج مشكلة الحلقات اللانهائية لإعادة التوجيه (Infinite Loop Fixed)
 * - يكتشف مسار الاستضافة تلقائياً سواء محلياً أو على Render
 * - يدعم التحكم الكامل بجلسات شريك مستثمر تيرا
 */
'use strict';

// ========================================================================
// 1. المسارات النسبية الأساسية
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

    // جلب الـ Path الحالي للمتصفح
    getCurrentPath: function() {
        return window.location.pathname;
    },

    // استخراج البادئة تلقائياً إذا كان المشروع يعمل داخل مجلد فرعي على السيرفر
    getBasePrefix: function() {
        const path = this.getCurrentPath();
        if (path.includes('/tera-investor-portal-main')) {
            return '/tera-investor-portal-main';
        }
        return '';
    },

    // التحقق المرن والمحمي من صفحات المصادقة لمنع التكرار اللانهائي
    isAuthPage: function(path = this.getCurrentPath()) {
        return path.includes('/auth/');
    },

    isLandingPage: function(path = this.getCurrentPath()) {
        const base = this.getBasePrefix();
        return path === base + '/' || path === base + '/index.html';
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
            return;
        }

        this._isChecking = true;
        this._lastCheckTime = now;

        try {
            const currentPage = this.getCurrentPath();
            const base = this.getBasePrefix();
            const token = localStorage.getItem('tera_token');
            
            const isAuth = this.isAuthPage(currentPage);
            const isLanding = this.isLandingPage(currentPage);
            const isProtected = !isAuth && !isLanding;

            if (!token && isProtected) {
                console.log('🔐 [Auth] غير مسجل الدخول -> توجيه لصفحة الدخول');
                this.redirectTo(base + PATHS.login);
                return;
            }

            if (token && (isAuth || isLanding)) {
                console.log('🚀 [Auth] مسجل الدخول بالفعل -> توجيه للوحة التحكم');
                this.redirectTo(base + PATHS.dashboard);
                return;
            }

            console.log('✅ [Auth] الجلسة مستقرة، الصفحة الحالية:', currentPage);
        } finally {
            this._isChecking = false;
        }
    },

    blockCheck: function() {
        this._blockCheck = true;
        console.log('⛔ [Auth] تم حظر فحص الجلسة مؤقتاً لحماية الصفحة');
    },

    unblockCheck: function() {
        this._blockCheck = false;
    },

    disableAutoRedirect: function() {
        this._isChecking = true;
    },

    enableAutoRedirect: function() {
        this._isChecking = false;
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

        const base = this.getBasePrefix();
        this.redirectTo(base + PATHS.login);
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
            return null;
        }
    },

    isLoggedIn: function() {
        return !!localStorage.getItem('tera_token');
    }
};

// ========================================================================
// 3. التنفيذ التلقائي الآمن عند تحميل المستند
// ========================================================================
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    
    if (TeraAuth.isAuthPage(currentPage)) {
        TeraAuth.disableAutoRedirect();
        TeraAuth.blockCheck();
    } else {
        TeraAuth.checkSession();
    }

    TeraAuth.initPasswordToggles();
});

// ========================================================================
// 4. معالج الأحداث العام لعمليات تسجيل الخروج
// ========================================================================
document.addEventListener('click', function(e) {
    const logoutBtn = e.target.closest('.logout-btn, .btn-logout, #btn-logout');
    if (!logoutBtn) return;

    e.preventDefault();
    if (confirm('🔒 هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
        TeraAuth.logout();
    }
});

// تصدير النطاق العام
window.TeraAuth = TeraAuth;
window.isUserLoggedIn = TeraAuth.isLoggedIn.bind(TeraAuth);
window.getCurrentUser = TeraAuth.getCurrentUser.bind(TeraAuth);

// ========================================================================
// 5. ترقية مفاتيح التخزين المحلية القديمة إن وُجدت
// ========================================================================
(function cleanupOldKeys() {
    const oldToken = localStorage.getItem('tera_auth_token');
    const oldUser = localStorage.getItem('tera_user_data');

    if (oldToken && !localStorage.getItem('tera_token')) {
        localStorage.setItem('tera_token', oldToken);
        localStorage.removeItem('tera_auth_token');
    }
    if (oldUser && !localStorage.getItem('tera_user')) {
        localStorage.setItem('tera_user', oldUser);
        localStorage.removeItem('tera_user_data');
    }
})();
