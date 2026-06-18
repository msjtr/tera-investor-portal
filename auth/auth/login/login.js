/**
 * ============================================================
 * auth.js - محرك المصادقة والحماية - نسخة متوافقة مع المسارات النسبية
 * ============================================================
 * الموقع: /assets/js/auth.js
 * 
 * تم التحديث لاستخدام المسارات النسبية بدلاً من المطلقة
 * لضمان العمل على خوادم لا تدعم المسارات المطلقة (مثل Render)
 * ============================================================
 */
'use strict';

// ========================================================================
// 1. دوال مساعدة للمسارات النسبية
// ========================================================================

/**
 * حساب عدد المستويات للوصول إلى الجذر من المسار الحالي
 * @returns {number} عدد المستويات (مثل: 0 للجذر، 1 لـ /assets/، 2 لـ /pages/، 3 لـ /auth/auth/)
 */
const getBaseDepth = () => {
    const path = window.location.pathname;
    
    // تحديد العمق بناءً على المسار
    if (path.includes('/pages/')) return 2;           // /pages/dashboard/...
    if (path.includes('/auth/auth/')) return 3;       // /auth/auth/login/...
    if (path.includes('/auth/')) return 2;            // /auth/login/...
    if (path.includes('/assets/')) return 1;          // /assets/js/...
    if (path.includes('/components/')) return 1;
    if (path.includes('/layouts/')) return 1;
    if (path === '/' || path === '/index.html') return 0;
    
    // افتراضياً: حساب عدد الشرطات المائلة
    const parts = path.split('/').filter(p => p.length > 0);
    return parts.length;
};

/**
 * إنشاء مسار نسبي من الجذر إلى المسار المطلوب
 * @param {string} relativePath - المسار المطلوب (بدون斜杠 البداية)
 * @returns {string} المسار النسبي مع ../ بالعدد المناسب
 */
const resolvePath = (relativePath) => {
    // التأكد من عدم وجود / في البداية
    let cleanPath = relativePath;
    if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
    }
    
    // إضافة .html إذا لزم الأمر
    if (!cleanPath.endsWith('.html') && !cleanPath.includes('.') && !cleanPath.includes('?')) {
        cleanPath = cleanPath + '.html';
    }
    
    const depth = getBaseDepth();
    let prefix = '';
    for (let i = 0; i < depth; i++) {
        prefix += '../';
    }
    
    return prefix + cleanPath;
};

// ========================================================================
// 2. كائن المصادقة الرئيسي
// ========================================================================

const TeraAuth = {
    _isChecking: false,
    _lastCheckTime: 0,
    _isLoginPage: false,

    /**
     * التحقق من الجلسة مع منع الحلقات اللانهائية
     */
    checkSession: function() {
        // منع التنفيذ المتكرر
        const now = Date.now();
        if (this._isChecking || (now - this._lastCheckTime < 500)) {
            console.log('⏳ [Auth] منع تنفيذ checkSession المتكرر');
            return;
        }
        this._isChecking = true;
        this._lastCheckTime = now;

        try {
            const currentPage = window.location.pathname;
            
            // التحقق من صفحة تسجيل الدخول
            this._isLoginPage = /\/auth\/.*login/.test(currentPage) || 
                                currentPage.includes('login.html') ||
                                currentPage.endsWith('/login') ||
                                currentPage.includes('/auth/auth/login');

            // إذا كنا في صفحة تسجيل الدخول، لا نقوم بأي توجيه (منع الحلقات)
            if (this._isLoginPage) {
                console.log('🔒 [Auth] صفحة تسجيل الدخول: تخطي التوجيه');
                return;
            }

            const token = localStorage.getItem('tera_token');
            
            // تحديد نوع الصفحة
            const isAuthPage = /\/auth\//.test(currentPage);
            const isLandingPage = currentPage === '/' || 
                                  (currentPage.endsWith('index.html') && !currentPage.includes('/pages/'));
            const isPublicPage = isAuthPage || isLandingPage;
            const isProtectedPage = !isPublicPage;
            
            // مستخدم غير مسجل في صفحة محمية -> توجيه لتسجيل الدخول
            if (!token && isProtectedPage) {
                const loginUrl = resolvePath('auth/auth/login/login.html');
                console.log('🔐 [Auth] توجيه غير مسجل الدخول إلى:', loginUrl);
                window.location.replace(loginUrl);
                return;
            }
            
            // مستخدم مسجل في صفحة عامة -> توجيه للوحة التحكم
            if (token && isPublicPage) {
                const dashboardUrl = resolvePath('pages/dashboard/index.html');
                console.log('🚀 [Auth] توجيه مستخدم مسجل إلى:', dashboardUrl);
                window.location.replace(dashboardUrl);
                return;
            }
            
            console.log('✅ [Auth] لا حاجة لتوجيه، الصفحة الحالية:', currentPage);
            
        } finally {
            this._isChecking = false;
        }
    },

    /**
     * تعطيل التوجيه التلقائي (لصفحات المصادقة)
     */
    disableAutoRedirect: function() {
        this._isChecking = true;
        console.log('🔒 [Auth] تم تعطيل التوجيه التلقائي مؤقتاً');
    },

    /**
     * إعادة تفعيل التوجيه التلقائي
     */
    enableAutoRedirect: function() {
        this._isChecking = false;
        console.log('🔓 [Auth] تم إعادة تفعيل التوجيه التلقائي');
    },

    /**
     * تسجيل الخروج
     */
    logout: function(isSessionExpired = false) {
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        localStorage.removeItem('tera_remember');
        localStorage.removeItem('tera_identifier');
        sessionStorage.clear();
        
        if (isSessionExpired) {
            alert('⏳ انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.');
        }
        
        const loginUrl = resolvePath('auth/auth/login/login.html');
        console.log('🚪 [Auth] تسجيل الخروج إلى:', loginUrl);
        window.location.replace(loginUrl);
    },

    /**
     * تسجيل الدخول - مع إعادة تفعيل التوجيه بعد النجاح
     */
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
                
                // بيانات اختبارية
                const mockUsers = [
                    { username: '106', email: 'investor106@tera.sa', mobile: '506060606', password: '123' },
                    { username: 'admin', email: 'admin@tera.sa', mobile: '500000000', password: 'admin123' }
                ];
                
                const matchedUser = mockUsers.find(u =>
                    u.username === identifier ||
                    u.email.toLowerCase() === identifier.toLowerCase() ||
                    u.mobile === identifier
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
                    
                    // إعادة تفعيل التوجيه التلقائي بعد نجاح تسجيل الدخول
                    this.enableAutoRedirect();
                    
                    console.log('✅ [Auth] تم تسجيل الدخول بنجاح:', user);
                    resolve(user);
                } else {
                    reject(new Error('البيانات المدخلة غير متطابقة مع سجلات المستثمرين.'));
                }
            }, 800);
        });
    },

    /**
     * تفعيل أزرار إظهار/إخفاء كلمة المرور
     */
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

    /**
     * الحصول على بيانات المستخدم الحالي
     */
    getCurrentUser: function() {
        try {
            const userData = localStorage.getItem('tera_user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.warn('⚠️ [Auth] خطأ في قراءة بيانات المستخدم:', error);
            return null;
        }
    },

    /**
     * التحقق مما إذا كان المستخدم مسجلاً
     */
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
    const isLoginPage = /\/auth\/.*login/.test(currentPage) || 
                        currentPage.includes('login.html') ||
                        currentPage.endsWith('/login');
    
    if (isLoginPage) {
        console.log('🔒 [Auth] صفحة تسجيل الدخول: تعطيل التوجيه التلقائي');
        TeraAuth.disableAutoRedirect();
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

console.log('✅ [Auth] auth.js loaded successfully (relative paths)');
console.log('📌 [Auth] المفاتيح المستخدمة: tera_token, tera_user');

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
