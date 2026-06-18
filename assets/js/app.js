/* ================================================= */
/* TERA APPLICATION (app.js) - نسخة متكاملة ومحدثة للمسارات */
/* ================================================= */
'use strict';

/* ================================================= */
/* APP CORE OBJECT */
/* ================================================= */
const App = {
    initialized: false,
    user: null,
    notifications: [],

    init() {
        console.log('TERA App Initializing...');
        this.loadUser();
        this.checkAuth();
        this.initializeSidebar();
        this.initializeNotifications();
        this.initializeProfile();
        this.initialized = true;
    },

    loadUser() {
        const userData = localStorage.getItem('tera_user');
        this.user = userData ? JSON.parse(userData) : { fullName: 'المستثمر', email: 'investor@tera.sa' };
    },

    checkAuth() {
        // التحقق من المسارات المحمية
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('/auth/');
        const hasToken = localStorage.getItem('tera_token');

        if (!hasToken && !isAuthPage) {
            // توجيه لصفحة تسجيل الدخول باستخدام المسار الصحيح بناءً على الهيكلية
            window.location.replace('/auth/auth/login/login.html');
        }
    },

    initializeSidebar() {
        // استخدام event delegation لضمان عمل الأزرار حتى بعد حقن الـ HTML
        document.addEventListener('click', (e) => {
            
            // 1. منطق تصغير/تكبير القائمة الجانبية
            const toggleBtn = e.target.closest('.menu-toggle, #sidebarToggle');
            if (toggleBtn) {
                const sidebar = document.querySelector('.tera-sidebar, #sidebar');
                if (sidebar) sidebar.classList.toggle('collapsed');
            }

            // 2. منطق القوائم المنسدلة (Submenus)
            const submenuToggle = e.target.closest('.submenu-toggle');
            if (submenuToggle) {
                e.preventDefault(); // منع الرابط من تحديث الصفحة
                const parentLi = submenuToggle.parentElement;
                const isActive = parentLi.classList.contains('active');

                // إغلاق جميع القوائم الأخرى أولاً (اختياري، لتجربة مستخدم أنظف)
                document.querySelectorAll('.has-submenu').forEach(item => {
                    item.classList.remove('active');
                });

                // فتح القائمة الحالية إذا لم تكن مفتوحة
                if (!isActive) {
                    parentLi.classList.add('active');
                }
            }
        });
    },

    initializeProfile() {
        const profileName = document.querySelector('.investor-name');
        if (this.user && profileName) {
            profileName.textContent = this.user.fullName;
        }
    },

    initializeNotifications() {
        const badge = document.getElementById('notificationCount');
        this.notifications = JSON.parse(localStorage.getItem('tera_notifications') || '[]');
        if (badge && this.notifications.length > 0) {
            badge.textContent = this.notifications.length;
            badge.style.display = 'flex';
        }
    },

    logout() {
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        // المسار المحدث لصفحة تسجيل الدخول
        window.location.replace('/auth/auth/login/login.html');
    },

    updateProfile(newName, newEmail) {
        this.user.fullName = newName;
        this.user.email = newEmail;
        localStorage.setItem('tera_user', JSON.stringify(this.user));
        alert('تم تحديث البيانات الشخصية بنجاح');
    }
};

/* ================================================= */
/* ROUTER (توجيه المسارات المحدث للمجلدات) */
/* ================================================= */
const Router = {
    go(url) { window.location.href = url; },
    dashboard() { this.go('/pages/dashboard/index.html'); },
    investments() { this.go('/pages/investments/opportunities.html'); },
    portfolio() { this.go('/pages/portfolio/portfolio-overview.html'); },
    reports() { this.go('/pages/reports/reports-dashboard.html'); },
    profile() { this.go('/pages/profile/personal-information.html'); },
    security() { this.go('/pages/security/change-password.html'); }
};

/* ================================================= */
/* SESSION TIMEOUT (حماية الجلسة) */
/* ================================================= */
let sessionTimer;

function startSessionTimer() {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
        alert('⚠️ انتهت الجلسة بسبب الخمول. يرجى تسجيل الدخول مجدداً.');
        App.logout();
    }, 3600000); // ساعة واحدة
}

// تحديث المؤقت عند أي نشاط للمستخدم لضمان عدم خروجه أثناء الاستخدام
['click', 'keypress', 'scroll', 'mousemove'].forEach(evt => 
    document.addEventListener(evt, startSessionTimer, { passive: true })
);

/* ================================================= */
/* INITIALIZATION */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    startSessionTimer();
    
    // ربط زر تسجيل الخروج عالمياً (يعمل عبر تفويض الأحداث لضمان استجابته المكونات المحقونة)
    document.addEventListener('click', (e) => {
        const logoutBtn = e.target.closest('#btn-logout, .btn-logout');
        if (logoutBtn) {
            e.preventDefault();
            App.logout();
        }
    });
});
