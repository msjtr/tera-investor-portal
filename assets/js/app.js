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
        // استخدام event delegation لضمان عمل الزر حتى بعد حقن الـ HTML
        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.menu-toggle, #sidebarToggle');
            const sidebar = document.querySelector('.tera-sidebar, #sidebar');
            if (toggleBtn && sidebar) {
                sidebar.classList.toggle('collapsed');
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
        alert('⚠️ انتهت الجلسة بسبب الخمول.');
        App.logout();
    }, 3600000); // ساعة واحدة
}

document.addEventListener('click', startSessionTimer);
document.addEventListener('keypress', startSessionTimer);

/* ================================================= */
/* INITIALIZATION */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    startSessionTimer();
    
    // ربط زر تسجيل الخروج عالمياً
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            App.logout();
        });
    }
});
