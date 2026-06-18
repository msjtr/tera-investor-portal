/**
 * ==========================================================================
 * TERA Investor Portal - Shared Auth Utilities (auth.js)
 * محرك المصادقة والحماية - مصحح ومحكم لمسارات منصة تيرا
 * = ==========================================================================
 */
'use strict';

// ========================================================================
// 1. دوال مساعدة للمسارات (متوافقة مع جميع مستويات الصفحات)
// ========================================================================

/**
 * استخراج المسار الجذري للمشروع بناءً على موقع الصفحة الحالية
 * يعمل مع:
 * - الصفحات في الجذر (index.html)
 * - الصفحات في /pages/
 * - الصفحات في /auth/
 * - الصفحات في /auth/login/ و /auth/register/
 */
const getBasePath = () => {
    const path = window.location.pathname;
    
    // محاولة إيجاد المجلد الرئيسي (عادةً tera-investor-portal-main أو فارغ)
    // نبحث عن أول حدوث لـ /pages/ أو /auth/ أو /assets/ أو /index.html
    const match = path.match(/(.*?)(\/pages\/|\/auth\/|\/assets\/|\/index\.html|$)/);
    let base = match && match[1] ? match[1] : '';
    
    // إذا كان المسار يبدأ بـ /tera-investor-portal-main/ نحتفظ به
    if (base && base.startsWith('/tera-investor-portal-main')) {
        // نتركه كما هو
    } else if (base === '') {
        // إذا لم نجد مجلد رئيسي، قد يكون المشروع في الجذر
        // لا نضيف أي شيء
    }
    
    // إزالة الشرطة المائلة الزائدة إن وجدت
    if (base.endsWith('/')) base = base.slice(0, -1);
    
    return base;
};

/**
 * إنشاء مسار مطلق للمشروع
 * @param {string} relativePath - مسار نسبي (يبدأ بـ / أو لا)
 * @returns {string} المسار الكامل
 */
const resolvePath = (relativePath) => {
    const base = getBasePath();
    // إذا كان المسار يبدأ بـ / نزيلها لتجنب التكرار
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return base ? `/${base}/${cleanPath}` : `/${cleanPath}`;
};

// ========================================================================
// 2. كائن المصادقة الرئيسي
// ========================================================================

const TeraAuth = {
    // المسار الجذري (يتم حسابه ديناميكياً)
    basePath: getBasePath(),

    /**
     * التحقق من الجلسة وتوجيه المستخدم تلقائياً
     * - إذا كان المستخدم مسجل الدخول (يوجد توكن) وفي صفحة عامة -> يوجه للوحة التحكم
     * - إذا لم يكن مسجل الدخول وفي صفحة محمية -> يوجه لتسجيل الدخول
     */
    checkSession: function() {
        const token = localStorage.getItem('tera_token');
        const currentPage = window.location.pathname;
        
        // تحديد نوع الصفحة الحالية
        const isAuthPage = /\/auth\//.test(currentPage);
        const isLandingPage = currentPage === '/' || 
                              currentPage.endsWith('index.html') && !currentPage.includes('/pages/');
        const isPublicPage = isAuthPage || isLandingPage;
        const isProtectedPage = !isPublicPage; // كل الصفحات الأخرى محمية
        
        // الحالة 1: مستخدم غير مسجل الدخول يحاول الوصول لصفحة محمية -> طرد لتسجيل الدخول
        if (!token && isProtectedPage) {
            const loginUrl = resolvePath('/auth/auth/login/login.html');
            window.location.replace(loginUrl);
            return;
        }
        
        // الحالة 2: مستخدم مسجل الدخول في صفحة عامة -> توجيه للوحة التحكم
        if (token && isPublicPage) {
            const dashboardUrl = resolvePath('/pages/dashboard/index.html');
            window.location.replace(dashboardUrl);
            return;
        }
        
        // الحالة 3: مستخدم مسجل الدخول في صفحة محمية -> نسمح بالاستمرار
        // الحالة 4: مستخدم غير مسجل الدخول في صفحة عامة -> نسمح بالاستمرار
    },

    /**
     * تسجيل الخروج الآمن
     * @param {boolean} isSessionExpired - هل الجلسة منتهية (عرض رسالة مختلفة)
     */
    logout: function(isSessionExpired = false) {
        // مسح بيانات الجلسة
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        sessionStorage.clear();
        
        if (isSessionExpired) {
            alert('⏳ انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً لحماية أصولك.');
        }
        
        // التوجيه لصفحة تسجيل الدخول
        const loginUrl = resolvePath('/auth/auth/login/login.html');
        window.location.replace(loginUrl);
    },

    /**
     * تفعيل أزرار إظهار/إخفاء كلمة المرور
     */
    initPasswordToggles: function() {
        document.addEventListener('click', function(e) {
            // استهداف الأزرار التي تحمل الكلاسات: password-toggle, toggle-password, show-password-btn
            const toggleBtn = e.target.closest('.password-toggle, .toggle-password, .show-password-btn');
            if (!toggleBtn) return;
            
            // البحث عن حقل الإدخال داخل نفس الحاوية (.password-wrapper أو .input-group أو .form-group)
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
            // تغيير النص إن وجد
            if (toggleBtn.textContent.trim()) {
                toggleBtn.textContent = isPassword ? 'إخفاء' : 'إظهار';
                // إعادة إضافة الأيقونة بعد تغيير النص
                if (icon) toggleBtn.prepend(icon);
            }
        });
    },

    /**
     * تسجيل الدخول (وهمي - سيتم استبداله بـ API)
     * @param {string} email
     * @param {string} password
     * @returns {Promise}
     */
    login: function(email, password) {
        return new Promise((resolve, reject) => {
            // محاكاة طلب API
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
    // أولاً: التحقق من الجلسة وتوجيه المستخدم
    TeraAuth.checkSession();
    
    // ثانياً: تفعيل أزرار إظهار كلمة المرور
    TeraAuth.initPasswordToggles();
    
    // تسجيل المسار الجذري في وحدة التحكم للتأكد
    console.log('🔐 TeraAuth initialized. Base path:', TeraAuth.basePath);
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

// تصدير الكائن للنطاق العام
window.TeraAuth = TeraAuth;

// ========================================================================
// 5. دالة مساعدة للتحقق من حالة المستخدم (يمكن استخدامها في أي صفحة)
// ========================================================================

window.isUserLoggedIn = function() {
    return !!localStorage.getItem('tera_token');
};

window.getCurrentUser = function() {
    try {
        return JSON.parse(localStorage.getItem('tera_user'));
    } catch {
        return null;
    }
};

console.log('✅ auth.js loaded successfully');
