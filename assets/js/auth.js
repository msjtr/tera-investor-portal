/**
 * ==========================================================================
 * TERA Investor Portal - Shared Auth Utilities (auth.js)
 * محرك المصادقة والحماية - مصحح ومحكم لمسارات منصة تيرا
 * ==========================================================================
 * هذا الملف مسؤول عن:
 * 1. التحقق من حالة تسجيل الدخول
 * 2. توجيه المستخدم تلقائياً (الصفحات المحمية/العامة)
 * 3. إدارة جلسة المستخدم (تسجيل الدخول/الخروج)
 * 4. تفعيل أزرار إظهار/إخفاء كلمة المرور
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

    /**
     * التحقق من الجلسة وتوجيه المستخدم تلقائياً
     * - إذا كان المستخدم مسجل الدخول (يوجد توكن) وفي صفحة عامة -> يوجه للوحة التحكم
     * - إذا لم يكن مسجل الدخول وفي صفحة محمية -> يوجه لتسجيل الدخول
     */
    checkSession: function() {
        // استخدام المفتاح الموحد tera_token
        const token = localStorage.getItem('tera_token');
        const currentPage = window.location.pathname;
        
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
    },

    /**
     * تسجيل الخروج الآمن
     * @param {boolean} isSessionExpired - هل الجلسة منتهية (عرض رسالة مختلفة)
     */
    logout: function(isSessionExpired = false) {
        // مسح بيانات الجلسة (باستخدام المفاتيح الموحدة)
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
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
     * تسجيل الدخول (وهمي - سيتم استبداله بـ API حقيقي)
     * @param {string} identifier - اسم المستخدم أو البريد أو الجوال
     * @param {string} password - كلمة المرور
     * @returns {Promise} وعد بنتيجة تسجيل الدخول
     */
    login: function(identifier, password) {
        return new Promise((resolve, reject) => {
            // محاكاة طلب API
            setTimeout(() => {
                // التحقق بسيط: أي بريد وكلمة مرور بطول 6 أحرف على الأقل
                if (identifier && password && password.length >= 6) {
                    const user = {
                        id: 1,
                        name: 'أحمد محمد',
                        email: identifier.includes('@') ? identifier : 'investor@tera.sa',
                        role: 'investor',
                        verified: true,
                        loginTime: new Date().toISOString()
                    };
                    // تخزين بيانات الجلسة بالمفاتيح الموحدة
                    localStorage.setItem('tera_token', 'jwt-token-' + Date.now());
                    localStorage.setItem('tera_user', JSON.stringify(user));
                    resolve(user);
                } else {
                    reject(new Error('بيانات الدخول غير صحيحة. تأكد من اسم المستخدم وكلمة المرور.'));
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
    }
};

// ========================================================================
// 3. التنفيذ والتهيئة العامة
// ========================================================================

// تهيئة عند تحميل DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 [Auth] TeraAuth initialized. Base path:', TeraAuth.basePath);
    
    // أولاً: التحقق من الجلسة وتوجيه المستخدم
    TeraAuth.checkSession();
    
    // ثانياً: تفعيل أزرار إظهار كلمة المرور
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
window.isUserLoggedIn = TeraAuth.isLoggedIn;
window.getCurrentUser = TeraAuth.getCurrentUser;

console.log('✅ [Auth] auth.js loaded successfully');
console.log('📌 [Auth] استخدم TeraAuth للوصول إلى دوال المصادقة');
console.log('📌 [Auth] المفاتيح المستخدمة: tera_token, tera_user');

// ========================================================================
// 6. مثال للاستخدام (يمكنك تفعيله في حالة الاختبار)
// ========================================================================

/*
// مثال: تسجيل الدخول السريع (للاختبار فقط)
// window.TeraAuth.login('test@tera.sa', '123456')
//     .then(user => console.log('✅ تسجيل الدخول ناجح:', user))
//     .catch(err => console.error('❌ فشل تسجيل الدخول:', err));
*/
