/**
 * ============================================================
 * auth.js - محرك المصادقة والحماية الذكي - النسخة الهيكلية المستقرة
 * ============================================================
 * - يعتمد على فحص المجلدات الهيكلية بدلاً من المسارات المطلقة الثابتة
 * - يحسب عمق المجلدات ديناميكياً لتفادي مشاكل الـ 404 والـ Redirect Loops
 * - متوافق تماماً مع البيئة المحلية وبيئة سيرفرات الويب (Render)
 */
'use strict';

const TeraAuth = {
    _isChecking: false,
    _lastCheckTime: 0,
    _blockCheck: false,

    // 1. جلب المسار الحالي للمتصفح
    getCurrentPath: function() {
        return window.location.pathname;
    },

    // 2. فحص نوع الصفحة بناءً على المجلد الفرعي المحتوي عليها
    isAuthPage: function(path = this.getCurrentPath()) {
        return path.includes('/auth/');
    },

    isProtectedPage: function(path = this.getCurrentPath()) {
        return path.includes('/pages/');
    },

    isLandingPage: function(path = this.getCurrentPath()) {
        return !this.isAuthPage(path) && !this.isProtectedPage(path);
    },

    // 3. توليد مسار نسبي ذكي وديناميكي للانتقال بين الصفحات بدون أخطاء
    getRelativePath: function(targetPath) {
        const path = this.getCurrentPath();
        let depth = 0;

        if (path.includes('/pages/')) {
            depth = 2; // مجلد فرعي داخل pages مثل dashboard
        } else if (path.includes('/auth/auth/')) {
            depth = 3; // مجلد فرعي مزدوج مثل auth/login
        } else if (path.includes('/auth/')) {
            depth = 2; // مجلد auth الرئيسي
        }

        return '../'.repeat(depth) + targetPath;
    },

    redirectTo: function(url) {
        if (this.getCurrentPath() === url) return;
        window.location.replace(url);
    },

    // 4. فحص الجلسة والتحقق من الصلاحيات
    checkSession: function() {
        if (this._blockCheck) {
            console.log('⛔ [Auth] تم تعليق الفحص لحماية الصفحة الحالية');
            return;
        }

        const now = Date.now();
        if (this._isChecking || now - this._lastCheckTime < 500) return;

        this._isChecking = true;
        this._lastCheckTime = now;

        try {
            const token = localStorage.getItem('tera_token');
            const currentPage = this.getCurrentPath();

            const isAuth = this.isAuthPage(currentPage);
            const isProtected = this.isProtectedPage(currentPage);
            const isLanding = this.isLandingPage(currentPage);

            // حالة 1: مستخدم غير مسجل يحاول دخول صفحات لوحة التحكم المحمية
            if (!token && isProtected) {
                console.log('🔐 [Auth] غير مسجل -> تحويل لصفحة الدخول');
                this.redirectTo(this.getRelativePath('auth/auth/login/login.html'));
                return;
            }

            // حالة 2: مستخدم مسجل دخول بالفعل ويحاول فتح صفحة الهبوط أو الدخول
            if (token && (isAuth || isLanding)) {
                console.log('🚀 [Auth] مسجل دخول بالفعل -> تحويل للوحة التحكم');
                this.redirectTo(this.getRelativePath('pages/dashboard/index.html'));
                return;
            }

            console.log('✅ [Auth] الجلسة آمنة ومستقرة في المسار:', currentPage);
        } finally {
            this._isChecking = false;
        }
    },

    blockCheck: function() {
        this._blockCheck = true;
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

    logout: function() {
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        localStorage.removeItem('tera_remember');
        localStorage.removeItem('tera_identifier');
        sessionStorage.clear();
        this.redirectTo(this.getRelativePath('auth/auth/login/login.html'));
    },

    login: function(identifier, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (!identifier || !password) {
                    reject(new Error('يرجى إدخال جميع البيانات المطلوبة.'));
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
// 5. التنفيذ التلقائي الآمن عند تحميل الصفحة
// ========================================================================
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    
    if (TeraAuth.isAuthPage(currentPage)) {
        TeraAuth.disableAutoRedirect();
        TeraAuth.blockCheck();
        console.log('🔒 [Auth] صفحة مصادقة: تم تأمين الواجهة لمنع التكرار');
    } else {
        TeraAuth.checkSession();
    }

    TeraAuth.initPasswordToggles();
});

// ربط النطاق العام لسهولة الاستدعاء
window.TeraAuth = TeraAuth;
window.isUserLoggedIn = TeraAuth.isLoggedIn.bind(TeraAuth);
window.getCurrentUser = TeraAuth.getCurrentUser.bind(TeraAuth);
