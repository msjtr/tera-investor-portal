/**
 * ============================================================
 * security.js - الملف الرئيسي لإدارة صفحات الأمان والحماية (Enterprise)
 * ============================================================
 * الموقع: /assets/js/security.js
 * - هذا الملف هو النواة المركزية (Core) لصفحات الأمان.
 * - يقوم بتهيئة المكونات المشتركة (القائمة الجانبية، القوائم الفرعية، تسجيل الخروج).
 * - يعرض الأدوات المساعدة (حساب قوة كلمة المرور، التنبيهات).
 * - كل صفحة لها ملف أوامر مستقل (security-change-password.js...).
 * ============================================================
 * الصفحات المدعومة:
 *   change-password, change-email, change-mobile,
 *   two-factor-authentication, registered-devices, login-history,
 *   verify-otp, forgot-password, reset-password
 * ============================================================
 */

const Security = {
    /**
     * تهيئة صفحات الأمان بالكامل
     */
    init: function() {
        console.log('🔒 تهيئة صفحات الأمان (Enterprise)...');

        // تهيئة المكونات المشتركة بين جميع الصفحات
        this.initSidebar();
        this.initSubmenus();
        this.initLogout();
        this.initActiveNav();
        this.initPasswordToggle();

        // تحميل وتهيئة الملف الفرعي المناسب للصفحة الحالية
        this.loadPageScript();

        console.log('✅ صفحات الأمان مهيأة.');
    },

    /**
     * تحميل الملف الفرعي المناسب للصفحة الحالية
     */
    loadPageScript: function() {
        const currentPage = this.getCurrentPage();
        console.log(`📄 صفحة الأمان الحالية: ${currentPage}`);

        if (window.SecurityPages && typeof window.SecurityPages === 'object') {
            const pageModule = window.SecurityPages[currentPage];
            if (pageModule && typeof pageModule.init === 'function') {
                try {
                    pageModule.init();
                    console.log(`✅ تم تهيئة ${currentPage} من ملفها المستقل.`);
                    return;
                } catch (e) {
                    console.warn(`⚠️ خطأ في تهيئة ${currentPage}:`, e);
                }
            }
        }

        if (currentPage === 'unknown') {
            console.warn('⚠️ لم يتم التعرف على صفحة الأمان الحالية.');
        } else {
            console.warn(`⚠️ الملف المستقل لـ ${currentPage} غير محمل أو لا يحتوي على دالة init.`);
        }
    },

    /**
     * تحديد الصفحة الحالية بناءً على مسار URL
     */
    getCurrentPage: function() {
        const path = window.location.pathname;
        if (path.includes('change-password')) return 'change-password';
        if (path.includes('change-email')) return 'change-email';
        if (path.includes('change-mobile')) return 'change-mobile';
        if (path.includes('two-factor-authentication')) return 'two-factor-authentication';
        if (path.includes('registered-devices')) return 'registered-devices';
        if (path.includes('login-history')) return 'login-history';
        if (path.includes('verify-otp')) return 'verify-otp';
        if (path.includes('forgot-password')) return 'forgot-password';
        if (path.includes('reset-password')) return 'reset-password';
        return 'unknown';
    },

    // ============================================================
    // أدوات مساعدة مشتركة
    // ============================================================

    /**
     * عرض تنبيه
     */
    showAlert: function(message, type) {
        const alertBox = document.getElementById('formAlert');
        if (!alertBox) {
            alert(message);
            return;
        }

        const icon = document.getElementById('alertIcon');
        const msgEl = document.getElementById('alertMessage');

        alertBox.className = 'alert-box show ' + type;
        if (icon) icon.className = 'fas ' + (type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle');
        if (msgEl) msgEl.textContent = message;

        clearTimeout(this._alertTimer);
        this._alertTimer = setTimeout(() => alertBox.classList.remove('show'), 5000);
    },

    /**
     * حساب قوة كلمة المرور
     */
    calculatePasswordStrength: function(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };

        if (checks.length) score += 20;
        if (checks.uppercase) score += 20;
        if (checks.lowercase) score += 20;
        if (checks.number) score += 20;
        if (checks.special) score += 20;

        if (password.length < 4) score = Math.min(score, 10);

        return { percentage: score, checks: checks };
    },

    /**
     * تحديث متطلبات كلمة المرور في الواجهة
     */
    updatePasswordRequirements: function(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };

        const reqMap = {
            'req-length': 'length',
            'req-uppercase': 'uppercase',
            'req-lowercase': 'lowercase',
            'req-number': 'number',
            'req-special': 'special'
        };

        Object.keys(reqMap).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const isValid = requirements[reqMap[id]];
            const icon = el.querySelector('i');

            if (!password) {
                el.className = '';
                if (icon) icon.className = 'fas fa-circle';
                el.style.color = '#64748b';
            } else {
                el.className = isValid ? 'valid' : 'invalid';
                if (icon) icon.className = isValid ? 'fas fa-check-circle' : 'fas fa-times-circle';
                el.style.color = isValid ? '#16a34a' : '#dc2626';
            }
        });
    },

    /**
     * تفعيل زر إظهار/إخفاء كلمة المرور (مشترك)
     */
    initPasswordToggle: function() {
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const input = document.getElementById(targetId);
                if (!input) return;
                const icon = this.querySelector('i');
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                if (icon) icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        });
    },

    // ============================================================
    // 1. القائمة الجانبية
    // ============================================================
    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 991;

        if (!sidebar) return;

        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                } else {
                    const isOpen = sidebar.classList.contains('sidebar-open');
                    if (isOpen) {
                        sidebar.classList.remove('sidebar-open');
                        if (overlay) overlay.classList.remove('active');
                    } else {
                        sidebar.classList.add('sidebar-open');
                        if (overlay) overlay.classList.add('active');
                    }
                }
            });
        }

        const closeBtn = document.getElementById('closeSidebarBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });

        window.addEventListener('resize', function() {
            if (!isMobile() && sidebar) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });
    },

    // ============================================================
    // 2. القوائم الفرعية
    // ============================================================
    initSubmenus: function() {
        const submenuToggles = document.querySelectorAll('.has-submenu > a');
        if (!submenuToggles.length) return;

        const handleSubmenuClick = function(e) {
            const href = this.getAttribute('href');
            const parentLi = this.closest('.has-submenu');
            if (href && href !== '#' && href !== 'javascript:void(0)' && href !== 'javascript:;') return;

            e.preventDefault();
            e.stopPropagation();
            if (!parentLi) return;

            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('collapsed') && window.innerWidth > 991) {
                sidebar.classList.remove('collapsed');
            }

            document.querySelectorAll('.has-submenu').forEach(el => {
                if (el !== parentLi) el.classList.remove('submenu-open');
            });

            parentLi.classList.toggle('submenu-open');
        };

        submenuToggles.forEach(link => {
            link.removeEventListener('click', handleSubmenuClick);
            link.addEventListener('click', handleSubmenuClick);
        });
    },

    // ============================================================
    // 3. الحالة النشطة للقائمة
    // ============================================================
    initActiveNav: function() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-item > a[href]');
        if (!navLinks.length) return;

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && currentPath.includes(href)) {
                const parent = link.closest('.nav-item');
                if (parent) {
                    parent.classList.add('active');
                    if (parent.classList.contains('has-submenu')) parent.classList.add('submenu-open');
                }
            }
        });
    },

    // ============================================================
    // 4. تسجيل الخروج - باستخدام TeraAuth الحقيقي
    // ============================================================
    initLogout: function() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (!confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) return;

            console.log('🔴 [Security] جاري تسجيل الخروج...');

            try {
                if (window.TeraAuth && typeof window.TeraAuth.logout === 'function') {
                    await window.TeraAuth.logout();
                } else {
                    // إجراء احتياطي
                    console.warn('⚠️ [Security] TeraAuth غير متوفر. توجيه احتياطي.');
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.replace('/auth/login.html');
                }
            } catch (error) {
                console.error('❌ [Security] خطأ في تسجيل الخروج:', error);
                window.location.replace('/auth/login.html');
            }
        });
    }
};

// ============================================================
// تشغيل عند تحميل الصفحة
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    Security.init();
});

// تصدير للاستخدام في بيئات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Security;
}
