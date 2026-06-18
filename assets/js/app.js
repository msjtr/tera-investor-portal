/**
 * TERA APPLICATION (app.js) - المحرك المركزي للتطبيق
 */
'use strict';

const App = {
    user: null,

    init() {
        console.log('TERA App Initialized...');
        this.loadUser();
        this.checkAuth();
        this.initializeProfile();
    },

    loadUser() {
        const userData = localStorage.getItem('tera_user');
        this.user = userData ? JSON.parse(userData) : { fullName: 'المستثمر', email: 'investor@tera.sa' };
    },

    checkAuth() {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('/auth/');
        const hasToken = localStorage.getItem('tera_token');

        // حماية المسارات: إذا لم يوجد توكن وليس في صفحة تسجيل الدخول، اطرده
        if (!hasToken && !isAuthPage) {
            window.location.replace('/auth/auth/login/login.html');
        }
    },

    initializeProfile() {
        const profileName = document.querySelector('.investor-name');
        if (this.user && profileName) {
            profileName.textContent = this.user.fullName;
        }
    },

    logout() {
        localStorage.removeItem('tera_token');
        localStorage.removeItem('tera_user');
        window.location.replace('/auth/auth/login/login.html');
    }
};

// تشغيل التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    App.init();

    // ربط عالمي لزر تسجيل الخروج
    document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-logout, .btn-logout')) {
            e.preventDefault();
            App.logout();
        }
    });
});
