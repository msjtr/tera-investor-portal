/**
 * ==========================================================================
 * TERA Investor Portal - Shared Auth Utilities (auth.js)
 * ==========================================================================
 */

const TeraAuth = {
    // 1. التحقق من وجود جلسة نشطة
    checkSession: function() {
        const token = localStorage.getItem('tera_token');
        const currentPage = window.location.pathname;
        const isAuthPage = currentPage.includes('/auth/');

        if (!token && !isAuthPage) {
            // المستخدم غير مسجل دخول ويحاول الوصول لصفحة داخلية
            window.location.href = '/auth/login.html';
        } else if (token && isAuthPage) {
            // المستخدم مسجل دخول ويحاول الوصول لصفحة الدخول/التسجيل
            window.location.href = '/pages/dashboard/index.html';
        }
    },

    // 2. تسجيل الخروج
    logout: function(isSessionExpired = false) {
        // مسح بيانات الجلسة
        localStorage.removeItem('tera_token');
        sessionStorage.clear();

        if (isSessionExpired) {
            alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.');
        }

        // التوجيه لصفحة تسجيل الدخول
        window.location.href = '/auth/login.html';
    },

    // 3. تفعيل أزرار إظهار/إخفاء كلمات المرور في النماذج
    initPasswordToggles: function() {
        const toggleBtns = document.querySelectorAll('.toggle-password');
        
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // افتراض أن الزر موجود بجانب حقل الإدخال
                const input = this.previousElementSibling; 
                
                if (input && input.tagName === 'INPUT') {
                    if (input.type === 'password') {
                        input.type = 'text';
                        this.innerHTML = '👁️‍🗨️'; // يمكن استبدالها بأيقونة SVG/FontAwesome
                    } else {
                        input.type = 'password';
                        this.innerHTML = '👁️';
                    }
                }
            });
        });
    }
};

// تنفيذ الوظائف عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تفعيل التحقق من الجلسة
    TeraAuth.checkSession();
    
    // تفعيل إظهار كلمات المرور
    TeraAuth.initPasswordToggles();

    // ربط زر تسجيل الخروج العام (في القائمة الجانبية أو الرأس)
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            TeraAuth.logout();
        });
    }
});
