/**
 * ==========================================================================
 * TERA Investor Portal - Shared Auth Utilities (auth.js)
 * محرك المصادقة والحماية - مصحح ومحكم لمسارات منصة تيرا
 * ==========================================================================
 */

const TeraAuth = {
    // 1. التحقق الاستراتيجي من وجود جلسة نشطة ومنع التحويلات العشوائية
    checkSession: function() {
        const token = localStorage.getItem('tera_token');
        const currentPage = window.location.pathname;
        
        // هل المستخدم في صفحة مصادقة (دخول/تسجيل)؟
        const isAuthPage = currentPage.includes('/auth/');
        
        // هل المستخدم في الصفحة الرئيسية الترحيبية (يجب أن تظل مفتوحة للزوار)؟
        const isLandingPage = currentPage === '/' || (currentPage.endsWith('index.html') && !currentPage.includes('/pages/'));

        if (!token && !isAuthPage && !isLandingPage) {
            // المستخدم زائر غير مسجل، ويحاول التسلل لصفحة داخلية (مثل لوحة التحكم)
            // 🎯 التوجيه الصارم للمسار المتعمق لمنع 404
            window.location.replace('/auth/auth/login/login.html');
            
        } else if (token && (isAuthPage || isLandingPage)) {
            // المستثمر مسجل دخوله بالفعل، ويحاول فتح صفحة الدخول أو الصفحة الرئيسية
            // 🎯 توجيه فوري للوحة التحكم بالامتداد الكامل
            window.location.replace('/pages/dashboard/index.html');
        }
    },

    // 2. تسجيل الخروج الآمن
    logout: function(isSessionExpired = false) {
        // مسح بيانات الجلسة من الجذور
        localStorage.removeItem('tera_token');
        sessionStorage.clear();

        if (isSessionExpired) {
            alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً لحماية أصولك.');
        }

        // 🎯 التوجيه الجذري لصفحة تسجيل الدخول المتعمقة
        window.location.replace('/auth/auth/login/login.html');
    },

    // 3. تفعيل أزرار إظهار/إخفاء كلمات المرور بمرونة
    initPasswordToggles: function() {
        const toggleBtns = document.querySelectorAll('.toggle-password');
        
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // افتراض أن الزر موجود بجانب حقل الإدخال
                const input = this.previousElementSibling; 
                
                if (input && input.tagName === 'INPUT') {
                    if (input.type === 'password') {
                        input.type = 'text';
                        this.innerHTML = '👁️‍🗨️'; 
                    } else {
                        input.type = 'password';
                        this.innerHTML = '👁️';
                    }
                }
            });
        });
    }
};

// تنفيذ الوظائف فور تحميل هيكل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تفعيل جدار التحقق من الجلسة أولاً
    TeraAuth.checkSession();
    
    // تفعيل إظهار كلمات المرور للنماذج
    TeraAuth.initPasswordToggles();

    // ربط زر تسجيل الخروج العام (متوافق مع كلاسات لوحة التحكم الجديدة)
    const logoutBtns = document.querySelectorAll('#btn-logout, .btn-logout');
    
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // لمسة أمان إضافية قبل تسجيل الخروج
            const confirmExit = confirm("هل أنت متأكد من رغبتك في تسجيل الخروج من البوابة؟");
            if (confirmExit) {
                TeraAuth.logout();
            }
        });
    });
});
