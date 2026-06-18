/**
 * ==========================================================================
 * TERA Investor Portal - Shared Auth Utilities (auth.js)
 * محرك المصادقة والحماية - نسخة مصححة ومحكمة
 * ==========================================================================
 * الموقع: /assets/js/auth.js
 * 
 * هذا الملف مسؤول عن:
 * 1. التحقق من حالة تسجيل الدخول مع منع الحلقات اللانهائية
 * 2. توجيه المستخدم تلقائياً (الصفحات المحمية/العامة)
 * 3. إدارة جلسة المستخدم (تسجيل الدخول/الخروج)
 * 4. تفعيل أزرار إظهار/إخفاء كلمة المرور
 * 5. توفير دوال مساعدة للتحقق من الجلسة
 * ==========================================================================
 * تم توحيد أسماء المفاتيح في التخزين المحلي:
 * - tera_token : لتخزين رمز المصادقة
 * - tera_user  : لتخزين بيانات المستخدم
 * ==========================================================================
 */
'use strict';

// ========================================================================
// 1. دوال مساعدة للمسارات (متوافقة مع جميع مستويات الصفحات)
// ========================================================================

/**
 * استخراج المسار الجذري للمشروع بناءً على موقع الصفحة الحالية
 * @returns {string} المسار الجذري (مثل /tera-investor-portal-main أو فارغ)
 */
const getBasePath = () => {
    const path = window.location.pathname;
    
    // محاولة إيجاد المجلد الرئيسي
    const match = path.match(/(.*?)(\/pages\/|\/auth\/|\/assets\/|\/index\.html|$)/);
    let base = match && match[1] ? match[1] : '';
    
    // إزالة الشرطة المائلة الزائدة إن وجدت
    if (base.endsWith('/')) base = base.slice(0, -1);
    
    return base;
};

/**
 * إنشاء مسار مطلق للمشروع مع ضمان وجود امتداد .html
 * @param {string} relativePath - مسار نسبي (يبدأ بـ / أو لا)
 * @returns {string} المسار الكامل مع .html
 */
const resolvePath = (relativePath) => {
    // إضافة .html إذا كان المسار لا يحتوي على امتداد
    // ولا يحتوي على علامة استفهام (parameters)
    if (!relativePath.endsWith('.html') && !relativePath.includes('.') && !relativePath.includes('?')) {
        relativePath = relativePath + '.html';
    }
    
    const base = getBasePath();
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    
    // بناء المسار النهائي
    let finalPath = base ? `/${base}/${cleanPath}` : `/${cleanPath}`;
    
    // تصحيح المسار المزدوج (مثلاً //auth//login)
    finalPath = finalPath.replace(/\/+/g, '/');
    
    return finalPath;
};

// ========================================================================
// 2. كائن المصادقة الرئيسي
// ========================================================================

const TeraAuth = {
    basePath: getBasePath(),
    _isChecking: false,        // منع التوجيه المتكرر
    _lastCheckTime: 0,         // منع التوجيه المتكرر
    _isLoginPage: false,       // تحديد إذا كنا في صفحة تسجيل الدخول

    /**
     * التحقق من الجلسة وتوجيه المستخدم تلقائياً
     * - إذا كان المستخدم مسجل الدخول (يوجد توكن) وفي صفحة عامة -> يوجه للوحة التحكم
     * - إذا لم يكن مسجل الدخول وفي صفحة محمية -> يوجه لتسجيل الدخول
     * - إذا كان في صفحة تسجيل الدخول -> لا يقوم بأي توجيه (منع الحلقات)
     */
    checkSession: function() {
        // منع التنفيذ المتكرر (للحماية من الحلقات اللانهائية)
        const now = Date.now();
        if (this._isChecking || (now - this._lastCheckTime < 500)) {
            console.log('⏳ [Auth] منع تنفيذ checkSession المتكرر');
            return;
        }
        this._isChecking = true;
        this._lastCheckTime = now;

        try {
            // تحديد إذا كنا في صفحة تسجيل الدخول
            const currentPage = window.location.pathname;
            this._isLoginPage = /\/auth\/.*login/.test(currentPage) || 
                                currentPage.includes('login.html') ||
                                currentPage.endsWith('/login');

            // إذا كنا في صفحة تسجيل الدخول، لا نقوم بأي توجيه (منع الحلقات)
            if (this._isLoginPage) {
                console.log('🔒 [Auth] صفحة تسجيل الدخول: تخطي التوجيه');
                return;
            }

            // استخدام المفتاح الموحد tera_token
            const token = localStorage.getItem('tera_token');
            
            // تحديد نوع الصفحة الحالية
            const isAuthPage = /\/auth\//.test(currentPage);
            const isLandingPage = currentPage === '/' || 
                                  currentPage.endsWith('index.html') && !currentPage.includes('/pages/');
            const isPublicPage = isAuthPage || isLandingPage;
            const isProtectedPage = !isPublicPage;
            
            // الحالة 1: مستخدم غير مسجل الدخول يحاول الوصول لصفحة محمية -> طرد لتسجيل الدخول
            if (!token && isProtectedPage) {
                const loginUrl = resolvePath('/auth/auth/login/login.html');
                console.log('🔐 [Auth] توجيه غير مسجل الدخول إلى:', loginUrl);
                window.location.replace(loginUrl);
                return;
            }
            
            // الحالة 2: مستخدم مسجل الدخول في صفحة عامة -> توجيه للوحة التحكم
            if (token && isPublicPage) {
                const dashboardUrl = resolvePath('/pages/dashboard/index.html');
                console.log('🚀 [Auth] توجيه مستخدم مسجل إلى:', dashboardUrl);
                window.location.replace(dashboardUrl);
                return;
            }
            
            // الحالة 3: مستخدم مسجل الدخول في صفحة محمية -> نسمح بالاستمرار
            // الحالة 4: مستخدم غير مسجل الدخول في صفحة عامة -> نسمح بالاستمرار
            console.log('✅ [Auth] لا حاجة لتوجيه، الصفحة الحالية:', currentPage);
            
        } finally {
            this._isChecking = false;
        }
    },

    /**
     * تعطيل التوجيه التلقائي مؤقتاً (لصفحات المصادقة)
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
     * تسجيل الخروج الآمن
     * @param {boolean} isSessionExpired - هل الجلسة منتهية (عرض رسالة مختلفة)
     */
    logout: function(isSessionExpired = false) {
        // مسح بيانات الجلسة (باستخدام المفاتيح الموحدة)
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        localStorage.removeItem('tera_remember');
        localStorage.removeItem('tera_identifier');
        sessionStorage.clear();
        
        if (isSessionExpired) {
            alert('⏳ انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً لحماية أصولك.');
        }
        
        // التوجيه لصفحة تسجيل الدخول
        const loginUrl = resolvePath('/auth/auth/login/login.html');
        console.log('🚪 [Auth] تسجيل الخروج والتوجيه إلى:', loginUrl);
        window.location.replace(loginUrl);
    },

    /**
     * تسجيل الدخول
     * @param {string} identifier - اسم المستخدم أو البريد أو الجوال
     * @param {string} password - كلمة المرور
     * @returns {Promise} وعد بنتيجة تسجيل الدخول
     */
    login: function(identifier, password) {
        return new Promise((resolve, reject) => {
            // محاكاة طلب API مع تأخير
            setTimeout(() => {
                // التحقق من المدخلات
                if (!identifier || !password) {
                    reject(new Error('يرجى إدخال جميع البيانات المطلوبة.'));
                    return;
                }
                
                if (password.length < 3) {
                    reject(new Error('كلمة المرور يجب أن تكون 3 أحرف على الأقل.'));
                    return;
                }
                
                // بيانات اختبارية للتحقق (للتجربة فقط)
                const mockUsers = [
                    { username: '106', email: 'investor106@tera.sa', mobile: '506060606', password: '123' },
                    { username: 'admin', email: 'admin@tera.sa', mobile: '500000000', password: 'admin123' }
                ];
                
                // البحث عن مستخدم مطابق
                const matchedUser = mockUsers.find(u =>
                    u.username === identifier ||
                    u.email.toLowerCase() === identifier.toLowerCase() ||
                    u.mobile === identifier
                );
                
                if (matchedUser && matchedUser.password === password) {
                    // نجاح تسجيل الدخول
                    const user = {
                        id: 1,
                        name: matchedUser.username === 'admin' ? 'مدير النظام' : 'أحمد محمد',
                        email: matchedUser.email,
                        role: matchedUser.username === 'admin' ? 'admin' : 'investor',
                        verified: true,
                        loginTime: new Date().toISOString()
                    };
                    
                    // تخزين بيانات الجلسة بالمفاتيح الموحدة
                    localStorage.setItem('tera_token', 'jwt-token-' + Date.now());
                    localStorage.setItem('tera_user', JSON.stringify(user));
                    
                    console.log('✅ [Auth] تم تسجيل الدخول بنجاح:', user);
                    resolve(user);
                } else {
                    // فشل تسجيل الدخول
                    reject(new Error('البيانات المدخلة غير متطابقة مع سجلات المستثمرين.'));
                }
            }, 800);
        });
    },

    /**
     * تفعيل أزرار إظهار/إخفاء كلمة المرور
     * باستخدام Event Delegation للتعامل مع الأزرار المضافة ديناميكياً
     */
    initPasswordToggles: function() {
        document.addEventListener('click', function(e) {
            // استهداف الأزرار التي تحمل الكلاسات: password-toggle, toggle-password, show-password-btn
            const toggleBtn = e.target.closest('.password-toggle, .toggle-password, .show-password-btn');
            if (!toggleBtn) return;
            
            // البحث عن حقل الإدخال داخل نفس الحاوية
            const wrapper = toggleBtn.closest('.password-wrapper, .input-group, .form-group');
            if (!wrapper) return;
            
            const input = wrapper.querySelector('input[type="password"], input[type="text"]');
            if (!input) return;
            
            // تبديل النوع
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            
            // تغيير الأيقونة
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
            }
            
            // تغيير النص إن وجد (مثل زر "إظهار"/"إخفاء")
            if (toggleBtn.textContent.trim()) {
                toggleBtn.textContent = isPassword ? 'إخفاء' : 'إظهار';
                // إعادة إضافة الأيقونة بعد تغيير النص
                if (icon) toggleBtn.prepend(icon);
            }
        });
    },

    /**
     * الحصول على بيانات المستخدم الحالي
     * @returns {object|null} بيانات المستخدم أو null
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
     * تحديث بيانات المستخدم (بعد تعديل الملف الشخصي)
     * @param {object} userData - بيانات المستخدم الجديدة
     * @returns {boolean} نجاح العملية
     */
    updateUserData: function(userData) {
        try {
            localStorage.setItem('tera_user', JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('❌ [Auth] فشل تحديث بيانات المستخدم:', error);
            return false;
        }
    },

    /**
     * التحقق مما إذا كان المستخدم مسجلاً للدخول
     * @returns {boolean}
     */
    isLoggedIn: function() {
        return !!localStorage.getItem('tera_token');
    },

    /**
     * إعادة توجيه المستخدم إلى لوحة التحكم (إذا كان مسجلاً)
     * @returns {boolean} تم التوجيه أم لا
     */
    redirectToDashboardIfLoggedIn: function() {
        if (this.isLoggedIn()) {
            const dashboardUrl = resolvePath('/pages/dashboard/index.html');
            console.log('🚀 [Auth] توجيه مستخدم مسجل إلى:', dashboardUrl);
            window.location.replace(dashboardUrl);
            return true;
        }
        return false;
    }
};

// ========================================================================
// 3. التنفيذ والتهيئة العامة
// ========================================================================

// تهيئة عند تحميل DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 [Auth] TeraAuth initialized. Base path:', TeraAuth.basePath);
    
    // التحقق مما إذا كنا في صفحة تسجيل الدخول
    const currentPage = window.location.pathname;
    const isLoginPage = /\/auth\/.*login/.test(currentPage) || 
                        currentPage.includes('login.html') ||
                        currentPage.endsWith('/login');
    
    if (isLoginPage) {
        // في صفحة تسجيل الدخول: نعطل التوجيه التلقائي
        console.log('🔒 [Auth] صفحة تسجيل الدخول: تعطيل التوجيه التلقائي');
        TeraAuth.disableAutoRedirect();
    } else {
        // في الصفحات الأخرى: نتحقق من الجلسة
        TeraAuth.checkSession();
    }
    
    // تفعيل أزرار إظهار كلمة المرور
    TeraAuth.initPasswordToggles();
    
    // تسجيل معلومات إضافية في وحدة التحكم للمساعدة في التصحيح
    if (TeraAuth.isLoggedIn()) {
        const user = TeraAuth.getCurrentUser();
        console.log('👤 [Auth] مستخدم مسجل:', user ? user.name : 'غير معروف');
    } else {
        console.log('👤 [Auth] مستخدم غير مسجل');
    }
});

// ========================================================================
// 4. ربط أزرار تسجيل الخروج (حتى لو تم إضافة الزر ديناميكياً)
// ========================================================================

document.addEventListener('click', function(e) {
    // استهداف أي زر يحتوي على الكلاسات: logout-btn, btn-logout, #btn-logout
    const logoutBtn = e.target.closest('.logout-btn, .btn-logout, #btn-logout');
    if (!logoutBtn) return;
    
    e.preventDefault();
    const confirmLogout = confirm('🔒 هل أنت متأكد من رغبتك في تسجيل الخروج؟');
    if (confirmLogout) {
        TeraAuth.logout();
    }
});

// ========================================================================
// 5. تصدير الكائنات والدوال العامة (للوصول إليها من أي مكان)
// ========================================================================

// جعل TeraAuth متاحاً في النطاق العام
window.TeraAuth = TeraAuth;

// دوال مساعدة للتحقق من حالة المستخدم (اختصارات)
window.isUserLoggedIn = TeraAuth.isLoggedIn.bind(TeraAuth);
window.getCurrentUser = TeraAuth.getCurrentUser.bind(TeraAuth);

console.log('✅ [Auth] auth.js loaded successfully');
console.log('📌 [Auth] استخدم TeraAuth للوصول إلى دوال المصادقة');
console.log('📌 [Auth] المفاتيح المستخدمة: tera_token, tera_user');

// ========================================================================
// 6. استيراد الدوال للاستخدام في وحدات أخرى (ES6 Modules)
// ========================================================================

// إذا كان النظام يدعم ES6 Modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeraAuth;
}

// ========================================================================
// 7. تنظيف المفاتيح القديمة (ترقية من إصدار سابق)
// ========================================================================

// إذا كان هناك مفتاح tera_auth_token قديم، نقوم بنقل بياناته إلى المفتاح الجديد
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

// ========================================================================
// 8. مثال للاستخدام (يمكنك تفعيله في حالة الاختبار)
// ========================================================================

/*
// مثال: تسجيل الدخول السريع (للاختبار فقط)
// window.TeraAuth.login('106', '123')
//     .then(user => console.log('✅ تسجيل الدخول ناجح:', user))
//     .catch(err => console.error('❌ فشل تسجيل الدخول:', err));
*/
