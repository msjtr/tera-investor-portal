/* ================================================= */
/* TERA APPLICATION (app.js) - نسخة متكاملة وشاملة */
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
        // جلب بيانات المستخدم من التخزين المحلي
        const userData = localStorage.getItem('tera_user');
        this.user = userData ? JSON.parse(userData) : { fullName: 'المستثمر', email: 'investor@tera.sa' };
    },

    checkAuth() {
        const protectedPages = ['/pages/dashboard', '/pages/investments', '/pages/portfolio', '/pages/profile', '/pages/reports', '/pages/security'];
        const currentPath = window.location.pathname;
        const requiresAuth = protectedPages.some(path => currentPath.includes(path));
        const hasToken = localStorage.getItem('tera_token');

        if (requiresAuth && !hasToken) {
            window.location.replace('/auth/auth/login/login.html');
        }
    },

    initializeSidebar() {
        const toggleBtn = document.querySelector('.menu-toggle') || document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.tera-sidebar') || document.getElementById('sidebar');
        if (!toggleBtn || !sidebar) return;
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    },

    initializeProfile() {
        const profileName = document.querySelector('.investor-name');
        if (this.user && profileName) {
            profileName.textContent = this.user.fullName;
        }
    },

    initializeNotifications() {
        const badge = document.getElementById('notificationCount');
        // محاكاة جلب الإشعارات
        this.notifications = JSON.parse(localStorage.getItem('tera_notifications') || '[]');
        if (badge && this.notifications.length > 0) {
            badge.textContent = this.notifications.length;
            badge.style.display = 'flex';
        }
    },

    /* دوال التحكم في الحساب */
    logout() {
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
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
/* ROUTER (توجيه المسارات المحدث) */
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
    
    // ربط زر تسجيل الخروج عالمياً إذا وجد
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => App.logout());
});
