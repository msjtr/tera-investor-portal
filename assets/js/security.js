/**
 * ============================================================
 * security.js - الملف الرئيسي لإدارة صفحات الأمان والحماية
 * ============================================================
 * الموقع: /assets/js/security.js
 * تاريخ التحديث: 2026-06-26
 * ============================================================
 * الصفحات المدعومة:
 *   1. change-password.html        - تغيير كلمة المرور
 *   2. change-email.html           - تغيير البريد الإلكتروني
 *   3. change-mobile.html          - تغيير رقم الجوال
 *   4. two-factor-authentication.html - المصادقة الثنائية (2FA)
 *   5. registered-devices.html     - الأجهزة المصرحة
 *   6. login-history.html          - سجل عمليات الدخول
 * ============================================================
 * الهيكل:
 *   - هذا الملف هو النواة الرئيسية (Core) لصفحات الأمان
 *   - يقوم بتهيئة المكونات المشتركة (القائمة الجانبية، تسجيل الخروج، إلخ)
 *   - كل صفحة لها ملف أوامر مستقل:
 *     security-change-password.js
 *     security-change-email.js
 *     security-change-mobile.js
 *     security-two-factor-authentication.js
 *     security-registered-devices.js
 *     security-login-history.js
 * ============================================================
 */

const Security = {
    /**
     * تهيئة صفحات الأمان بالكامل
     */
    init: function() {
        console.log('🔒 Initializing Security Pages...');

        // تهيئة المكونات المشتركة بين جميع الصفحات
        this.initSidebar();
        this.initSubmenus();
        this.initLogout();
        this.initActiveNav();

        // تحميل وتهيئة الملف الفرعي المناسب للصفحة الحالية
        this.loadPageScript();

        console.log('✅ Security pages initialized successfully.');
    },

    /**
     * تحميل الملف الفرعي المناسب للصفحة الحالية
     */
    loadPageScript: function() {
        const currentPage = this.getCurrentPage();
        console.log(`📄 Current security page: ${currentPage}`);

        // التحقق من وجود الكائن العام والتهيئة الخاصة بالصفحة
        if (window.SecurityPages && typeof window.SecurityPages === 'object') {
            const pageModule = window.SecurityPages[currentPage];
            if (pageModule && typeof pageModule.init === 'function') {
                try {
                    pageModule.init();
                    console.log(`✅ ${currentPage} initialized from external file.`);
                    return;
                } catch (e) {
                    console.warn(`⚠️ Error initializing ${currentPage}:`, e);
                }
            }
        }

        // إذا لم يتم تحميل الملف الفرعي، نقدم تهيئة أساسية
        console.warn(`⚠️ External script for ${currentPage} not loaded or no init method. Using fallback.`);
        this.initFallback(currentPage);
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
        return 'unknown';
    },

    /**
     * تهيئة احتياطية (في حال عدم تحميل الملف الفرعي)
     */
    initFallback: function(page) {
        console.log(`🔄 Using fallback initialization for ${page}`);
        // تفعيل الوظائف الأساسية كحد أدنى
        this.initPasswordToggle();
        this.initPasswordStrength();
        this.initFormValidation();
    },

    /**
     * تفعيل زر إظهار/إخفاء كلمة المرور
     */
    initPasswordToggle: function() {
        document.querySelectorAll('.password-toggle').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const input = document.getElementById(targetId);
                if (!input) return;

                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    if (icon) icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    if (icon) icon.className = 'fas fa-eye';
                }
            });
        });
    },

    /**
     * تفعيل مؤشر قوة كلمة المرور
     */
    initPasswordStrength: function() {
        const passwordInput = document.getElementById('newPassword');
        if (!passwordInput) return;

        const strengthFill = document.getElementById('strengthFill');
        const strengthLabel = document.getElementById('strengthLabel');

        if (!strengthFill || !strengthLabel) return;

        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = this.calculatePasswordStrength(password);

            // تحديث شريط القوة
            strengthFill.style.width = strength.percentage + '%';

            // تحديث لون الشريط
            if (strength.percentage < 30) {
                strengthFill.style.background = '#dc2626';
                strengthLabel.className = 'strength-label weak';
                strengthLabel.textContent = 'ضعيفة';
            } else if (strength.percentage < 50) {
                strengthFill.style.background = '#f59e0b';
                strengthLabel.className = 'strength-label medium';
                strengthLabel.textContent = 'متوسطة';
            } else if (strength.percentage < 75) {
                strengthFill.style.background = '#16a34a';
                strengthLabel.className = 'strength-label strong';
                strengthLabel.textContent = 'قوية';
            } else {
                strengthFill.style.background = '#028090';
                strengthLabel.className = 'strength-label very-strong';
                strengthLabel.textContent = 'قوية جداً';
            }

            // تحديث متطلبات كلمة المرور
            this.updatePasswordRequirements(password);
        });
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

        // حساب النقاط
        if (checks.length) score += 20;
        if (checks.uppercase) score += 20;
        if (checks.lowercase) score += 20;
        if (checks.number) score += 20;
        if (checks.special) score += 20;

        // تخفيض النقاط لكلمات المرور القصيرة جداً
        if (password.length < 4) score = Math.min(score, 10);

        return {
            percentage: score,
            checks: checks
        };
    },

    /**
     * تحديث متطلبات كلمة المرور
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

        Object.keys(reqMap).forEach(function(id) {
            const el = document.getElementById(id);
            if (!el) return;

            const isValid = requirements[reqMap[id]];
            const icon = el.querySelector('i');

            if (password.length === 0) {
                el.className = '';
                if (icon) icon.className = 'fas fa-circle';
                el.style.color = '#64748b';
            } else if (isValid) {
                el.className = 'valid';
                if (icon) icon.className = 'fas fa-check-circle';
                el.style.color = '#16a34a';
            } else {
                el.className = 'invalid';
                if (icon) icon.className = 'fas fa-times-circle';
                el.style.color = '#dc2626';
            }
        });
    },

    /**
     * تفعيل التحقق من صحة النموذج
     */
    initFormValidation: function() {
        const form = document.getElementById('changePasswordForm');
        if (!form) return;

        const currentPassword = document.getElementById('currentPassword');
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const submitBtn = document.getElementById('submitBtn');

        // التحقق من تطابق كلمة المرور
        if (confirmPassword && newPassword) {
            const checkMatch = function() {
                const hint = document.getElementById('confirmPasswordHint');
                if (!hint) return;

                if (confirmPassword.value.length === 0) {
                    hint.textContent = '';
                    confirmPassword.style.borderColor = '';
                    return;
                }

                if (newPassword.value === confirmPassword.value) {
                    hint.textContent = '✅ كلمة المرور متطابقة';
                    hint.style.color = '#16a34a';
                    confirmPassword.style.borderColor = '#16a34a';
                } else {
                    hint.textContent = '❌ كلمة المرور غير متطابقة';
                    hint.style.color = '#dc2626';
                    confirmPassword.style.borderColor = '#dc2626';
                }
            };

            newPassword.addEventListener('input', checkMatch);
            confirmPassword.addEventListener('input', checkMatch);
        }

        // معالج إرسال النموذج
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // التحقق من الحقول المطلوبة
            if (!currentPassword || !currentPassword.value) {
                Security.showAlert('يرجى إدخال كلمة المرور الحالية.', 'error');
                currentPassword.focus();
                return;
            }

            if (!newPassword || !newPassword.value) {
                Security.showAlert('يرجى إدخال كلمة المرور الجديدة.', 'error');
                newPassword.focus();
                return;
            }

            // التحقق من قوة كلمة المرور
            const strength = Security.calculatePasswordStrength(newPassword.value);
            if (strength.percentage < 50) {
                Security.showAlert('كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى.', 'error');
                newPassword.focus();
                return;
            }

            // التحقق من تطابق كلمة المرور
            if (confirmPassword && newPassword.value !== confirmPassword.value) {
                Security.showAlert('كلمة المرور الجديدة وتأكيدها غير متطابقين.', 'error');
                confirmPassword.focus();
                return;
            }

            // محاكاة حفظ البيانات
            Security.showAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';

            setTimeout(function() {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> تغيير كلمة المرور';
                form.reset();
                // إعادة تعيين متطلبات كلمة المرور
                Security.updatePasswordRequirements('');
                const strengthFill = document.getElementById('strengthFill');
                if (strengthFill) strengthFill.style.width = '0%';
                const strengthLabel = document.getElementById('strengthLabel');
                if (strengthLabel) {
                    strengthLabel.className = 'strength-label';
                    strengthLabel.textContent = 'ضعيفة';
                }
                const confirmHint = document.getElementById('confirmPasswordHint');
                if (confirmHint) confirmHint.textContent = '';
            }, 2500);
        });
    },

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

        // إخفاء التنبيه بعد 5 ثوانٍ
        clearTimeout(this._alertTimer);
        this._alertTimer = setTimeout(function() {
            alertBox.classList.remove('show');
        }, 5000);
    },

    // ============================================================
    // 1. تهيئة القائمة الجانبية (مشتركة)
    // ============================================================
    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 991;

        if (!sidebar) {
            console.warn('⚠️ Sidebar element not found on this page. Skipping sidebar initialization.');
            return;
        }

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

        const logo = document.querySelector('.focused-header .logo a');
        if (logo) {
            logo.addEventListener('dblclick', function(e) {
                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }

        window.addEventListener('resize', function() {
            if (!isMobile() && sidebar) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });
    },

    // ============================================================
    // 2. إدارة القوائم الفرعية (مشتركة)
    // ============================================================
    initSubmenus: function() {
        const submenuToggles = document.querySelectorAll('.has-submenu > a');
        if (!submenuToggles.length) return;

        const handleSubmenuClick = function(e) {
            const href = this.getAttribute('href');
            const parentLi = this.closest('.has-submenu');

            if (href && href !== '#' && href !== 'javascript:void(0)' && href !== 'javascript:;') {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (!parentLi) return;

            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('collapsed') && window.innerWidth > 991) {
                sidebar.classList.remove('collapsed');
            }

            document.querySelectorAll('.has-submenu').forEach(function(el) {
                if (el !== parentLi) el.classList.remove('submenu-open');
            });

            parentLi.classList.toggle('submenu-open');
        };

        submenuToggles.forEach(function(link) {
            link.removeEventListener('click', handleSubmenuClick);
            link.addEventListener('click', handleSubmenuClick);
        });
    },

    // ============================================================
    // 3. تفعيل الحالة النشطة للقائمة (مشتركة)
    // ============================================================
    initActiveNav: function() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-item > a[href]');
        if (!navLinks.length) return;

        navLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            if (href === currentPath || (href !== '#' && href !== 'javascript:void(0)' && currentPath.includes(href))) {
                const parent = link.closest('.nav-item');
                if (parent) {
                    parent.classList.add('active');
                    if (parent.classList.contains('has-submenu')) {
                        parent.classList.add('submenu-open');
                    }
                }
            }
        });
    },

    // ============================================================
    // 4. تسجيل الخروج (مشترك)
    // ============================================================
    initLogout: function() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) {
            console.warn('⚠️ Logout button not found on this page.');
            return;
        }

        logoutBtn.addEventListener('click', function() {
            if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(';').forEach(function(c) {
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                });
                window.location.replace('https://tera-investor-portal.onrender.com');
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
