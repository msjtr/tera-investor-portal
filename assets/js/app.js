/* ================================================= */
/* TERA APPLICATION (app.js) - نسخة الاستقرار المطلق */
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
        console.log('TERA App Started');
        this.loadUser();
        this.checkAuth();
        this.initializeSidebar();
        this.initializeNotifications();
        this.initializeProfile();
        this.initialized = true;
    },

    loadUser() {
        // التحقق من وجود بيانات المستخدم في التخزين المحلي
        if (typeof Session !== 'undefined' && Session.getUser()) {
            this.user = Session.getUser();
        } else if (localStorage.getItem('tera_token')) {
            this.user = { fullName: 'المستثمر 106', email: 'investor106@tera.sa' };
        }
    },

    checkAuth() {
        const protectedPages = ['/pages/dashboard', '/pages/investments', '/pages/portfolio', '/pages/profile', '/pages/reports', '/pages/security'];
        const currentPath = window.location.pathname;
        const requiresAuth = protectedPages.some(path => currentPath.includes(path));
        const hasToken = localStorage.getItem('tera_token');

        if (requiresAuth && !hasToken) {
            // التوجيه للمسار الكامل لضمان عدم حدوث خطأ 404
            window.location.replace('/auth/auth/login/login.html');
        }
    },

    initializeSidebar() {
        const toggleBtn = document.querySelector('.menu-toggle') || document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.tera-sidebar') || document.getElementById('sidebar');

        if (!toggleBtn || !sidebar) return;

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    },

    initializeProfile() {
        const profileName = document.querySelector('.investor-name');
        if (this.user && profileName) {
            profileName.textContent = this.user.fullName || 'المستثمر 106';
        }
    },

    initializeNotifications() {
        const badge = document.getElementById('notificationCount');
        if (badge && this.notifications.length > 0) {
            badge.textContent = this.notifications.length;
            badge.style.display = 'flex';
        }
    }
};

/* ================================================= */
/* ROUTER (توجيه المسارات الثابت) */
/* ================================================= */
const Router = {
    go(url) {
        window.location.href = url;
    },
    dashboard() { this.go('/pages/dashboard/index.html'); },
    investments() { this.go('/pages/investments/opportunities.html'); },
    portfolio() { this.go('/pages/portfolio/portfolio-overview.html'); },
    reports() { this.go('/pages/reports/reports-dashboard.html'); },
    profile() { this.go('/pages/profile/personal-information.html'); }
};

/* ================================================= */
/* SESSION TIMEOUT (حماية الجلسة) */
/* ================================================= */
let sessionTimer;
function startSessionTimer() {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
        alert('⚠️ انتهت الجلسة بسبب الخمول. جاري تسجيل الخروج.');
        localStorage.removeItem('tera_token');
        window.location.replace('/auth/auth/login/login.html');
    }, 3600000); 
}

document.addEventListener('click', startSessionTimer);
document.addEventListener('keypress', startSessionTimer);

/* ================================================= */
/* START APP */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    startSessionTimer();
});
