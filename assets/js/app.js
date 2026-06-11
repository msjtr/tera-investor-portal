/* ================================================= */
/* TERA APPLICATION */
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
        // نتحقق من وجود Session (الموجودة في core.js) لتفادي الأخطاء
        if (typeof Session !== 'undefined') {
            this.user = Session.getUser();
        }
    },

    checkAuth() {
        const protectedPages = [
            '/pages/dashboard/',
            '/pages/investments/',
            '/pages/portfolio/',
            '/pages/profile/',
            '/pages/reports/',
            '/pages/security/'
        ];

        const currentPath = window.location.pathname;
        const requiresAuth = protectedPages.some(path => currentPath.includes(path));

        if (requiresAuth && typeof Session !== 'undefined' && !Session.isLoggedIn()) {
            window.location.href = '/auth/login.html';
        }
    },

    initializeSidebar() {
        const toggleBtn = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');

        if (!toggleBtn || !sidebar) return;

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    },

    initializeProfile() {
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');

        if (!this.user) return;

        if (profileName) {
            profileName.textContent = this.user.fullName || 'شريك تيرا';
        }

        if (profileEmail) {
            profileEmail.textContent = this.user.email || '';
        }
    },

    initializeNotifications() {
        const badge = document.getElementById('notificationCount');
        if (!badge) return;
        
        badge.textContent = this.notifications.length;
    },

    addNotification(notification) {
        this.notifications.push(notification);
        this.initializeNotifications();
    },

    clearNotifications() {
        this.notifications = [];
        this.initializeNotifications();
    }
};

/* ================================================= */
/* ROUTES */
/* ================================================= */
const Router = {
    go(url) {
        window.location.href = url;
    },
    dashboard() {
        this.go('/pages/dashboard/index.html');
    },
    investments() {
        this.go('/pages/investments/opportunities.html');
    },
    portfolio() {
        this.go('/pages/portfolio/portfolio-overview.html');
    },
    reports() {
        this.go('/pages/reports/reports-dashboard.html');
    },
    profile() {
        this.go('/pages/profile/personal-information.html');
    }
};

/* ================================================= */
/* SESSION TIMEOUT (1 Hour = 3600000 ms) */
/* ================================================= */
let sessionTimer;

function startSessionTimer() {
    clearTimeout(sessionTimer);
    
    sessionTimer = setTimeout(() => {
        // نتحقق من وجود دالة التنبيه قبل استدعائها
        if (typeof warningAlert !== 'undefined') {
            warningAlert('انتهت الجلسة بسبب الخمول');
        } else {
            alert('⚠️ انتهت الجلسة بسبب الخمول');
        }

        if (typeof logout !== 'undefined') {
            logout();
        } else {
            window.location.href = '/auth/login.html';
        }
    }, 3600000); 
}

// إعادة ضبط العداد عند تفاعل المستخدم مع الصفحة
document.addEventListener('click', startSessionTimer);
document.addEventListener('keypress', startSessionTimer);

/* ================================================= */
/* START APP */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    startSessionTimer(); // تشغيل العداد فور تحميل الصفحة
});
