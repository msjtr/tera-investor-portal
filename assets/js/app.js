/* ================================================= */
/* TERA APPLICATION (app.js) */
/* محرك التطبيق الأساسي - مصحح ومحمي لمسارات البوابة */
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
        } else if (localStorage.getItem('tera_token')) {
            // مستخدم افتراضي في حال غياب ملف core.js ولكن الجلسة نشطة (نظامنا الذكي)
            this.user = { fullName: 'المستثمر 106', email: 'investor106@tera.sa' };
        }
    },

    checkAuth() {
        const protectedPages = [
            '/pages/dashboard',
            '/pages/investments',
            '/pages/portfolio',
            '/pages/profile',
            '/pages/reports',
            '/pages/security'
        ];

        const currentPath = window.location.pathname;
        const requiresAuth = protectedPages.some(path => currentPath.includes(path));

        // 🎯 التعديل الجوهري: الاعتماد على التوكن الفعلي الذي تم توليده في صفحة الدخول
        const hasToken = localStorage.getItem('tera_token');

        if (requiresAuth && !hasToken) {
            // توجيه صارم للمسار المتعمق المحدث لمنع خطأ 404
            window.location.replace('/auth/auth/login/login.html');
        }
    },

    initializeSidebar() {
        // توافق مع الأسماء الجديدة في لوحة التحكم لمنع تعارض الأكواد
        const toggleBtn = document.getElementById('sidebarToggle') || document.querySelector('.menu-toggle');
        const sidebar = document.getElementById('sidebar') || document.querySelector('.tera-sidebar');

        if (!toggleBtn || !sidebar) return;

        toggleBtn.addEventListener('click', () => {
            if (sidebar.id === 'sidebar') {
                sidebar.classList.toggle('collapsed');
            }
        });
    },

    initializeProfile() {
        // تحديث اسم المستثمر في الـ Header للوحة التحكم
        const profileName = document.getElementById('profileName') || document.querySelector('.investor-name');
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
        const badge = document.getElementById('notificationCount') || document.querySelector('.badge');
        if (!badge) return;
        
        if (this.notifications.length > 0) {
            badge.textContent = this.notifications.length;
            badge.style.display = 'flex';
        }
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
/* ROUTES (التوجيه الآمن بالامتدادات الكاملة) */
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
        if (typeof warningAlert !== 'undefined') {
            warningAlert('انتهت الجلسة بسبب الخمول، يرجى تسجيل الدخول لحماية أصولك.');
        } else {
            alert('⚠️ انتهت الجلسة بسبب الخمول. جاري تسجيل الخروج لحماية حسابك الاستثماري.');
        }

        // 🎯 مسح التوكن أمنياً لضمان عدم وجود جلسات شبحية
        localStorage.removeItem('tera_token');

        if (typeof logout !== 'undefined') {
            logout();
        } else {
            // 🎯 توجيه جذري للمسار المتعمق الصحيح
            window.location.replace('/auth/auth/login/login.html');
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
