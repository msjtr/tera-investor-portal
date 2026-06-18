/**
 * ==========================================================================
 * TERA Investor Portal - Shared Auth Utilities (auth.js)
 * محرك المصادقة والحماية - مصحح ومحكم لمسارات منصة تيرا
 * ==========================================================================
 */
'use strict';

// 🎯 استخراج المسار الجذري ديناميكياً لتفادي أخطاء 404 في أي بيئة استضافة
const getAuthBasePath = () => {
    const path = window.location.pathname;
    const match = path.match(/(.*)(\/pages\/|\/auth\/|\/index\.html|$)/);
    return match && match[1] ? match[1] : '';
};

const TeraAuth = {
    basePath: getAuthBasePath(),

    // 1. التحقق الاستراتيجي من وجود جلسة نشطة ومنع التحويلات العشوائية
    checkSession: function() {
        const token = localStorage.getItem('tera_token');
        const currentPage = window.location.pathname;
        
        // التحقق من نوع الصفحة الحالية
        const isAuthPage = currentPage.includes('/auth/');
        const isLandingPage = currentPage === '/' || (currentPage.endsWith('index.html') && !currentPage.includes('/pages/'));

        if (!token && !isAuthPage && !isLandingPage) {
            // زائر يحاول التسلل لصفحة داخلية -> طرد لصفحة تسجيل الدخول
            window.location.replace(`${this.basePath}/auth/auth/login/login.html`);
            
        } else if (token && (isAuthPage || isLandingPage)) {
            // مستثمر مسجل يحاول فتح صفحة الدخول أو الرئيسية -> توجيه للوحة التحكم
            window.location.replace(`${this.basePath}/pages/dashboard/index.html`);
        }
    },

    // 2. تسجيل الخروج الآمن
    logout: function(isSessionExpired = false) {
        // مسح بيانات الجلسة من الجذور
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        sessionStorage.clear();

        if (isSessionExpired) {
            alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً لحماية أصولك.');
        }

        // التوجيه الجذري الآمن لصفحة تسجيل الدخول
        window.location.replace(`${this.basePath}/auth/auth/login/login.html`);
    },

    // 3. تفعيل أزرار إظهار/إخفاء كلمات المرور (باستخدام Event Delegation)
    initPasswordToggles: function() {
        document.addEventListener('click', function(e) {
            // استهداف زر التبديل (سواء كان الكلاس password-toggle أو toggle-password)
            const toggleBtn = e.target.closest('.password-toggle, .toggle-password');
            
            if (toggleBtn) {
                // البحث عن حقل الإدخال داخل الحاوية الأب (.password-wrapper)
                const wrapper = toggleBtn.closest('.password-wrapper') || toggleBtn.parentElement;
                const input = wrapper.querySelector('input');
                
                if (input) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
                        toggleBtn.style.color = 'var(--tera-secondary, #00C2C7)';
                    } else {
                        input.type = 'password';
                        toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
                        toggleBtn.style.color = '#94A3B8';
                    }
                }
            }
        });
    }
};

/* ================================================= */
/* التنفيذ والتهيئة العامة */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    // تفعيل جدار التحقق من الجلسة أولاً
    TeraAuth.checkSession();
    
    // تفعيل إظهار كلمات المرور
    TeraAuth.initPasswordToggles();
});

// ربط زر تسجيل الخروج العام (تفويض الأحداث ليعمل مع السايدبار المحقون ديناميكياً)
document.addEventListener('click', (e) => {
    const logoutBtn = e.target.closest('#btn-logout, .btn-logout');
    
    if (logoutBtn) {
        e.preventDefault();
        const confirmExit = confirm("هل أنت متأكد من رغبتك في تسجيل الخروج من البوابة؟");
        if (confirmExit) {
            TeraAuth.logout();
        }
    }
});
