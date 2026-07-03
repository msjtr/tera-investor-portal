/**
 * ==========================================================
 * security-change-password.js
 * تغيير كلمة المرور - النسخة المتكاملة مع TeraAuth
 * Enterprise Version 2026
 * ==========================================================
 * يعتمد على: auth.js (TeraAuth), supabase-client.js
 * يستخدم TeraAuth للحصول على المستخدم والجلسة والتوجيه
 */

'use strict';

(function () {

    // ========== ثوابت المسارات ==========
    const ROUTES = {
        LOGIN: '/auth/auth/login/login.html',
        DASHBOARD: '/pages/dashboard/index.html',
        CHANGE_PASSWORD: '/pages/security/change-password.html'
    };

    // ========== دالة مساعدة للتنبيهات ==========
    function showSecurityAlert(message, type = 'error') {
        const alertBox = document.getElementById('securityAlert');
        const alertMessage = document.getElementById('alertMessage');
        const alertIcon = document.getElementById('alertIcon');

        if (!alertBox || !alertMessage) {
            alert(message);
            return;
        }

        alertBox.style.display = 'flex';
        alertBox.className = 'alert-box show ' + type;
        if (alertIcon) {
            alertIcon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' :
                type === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>' :
                '<i class="fas fa-exclamation-circle"></i>';
        }
        alertMessage.textContent = message;

        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            alertBox.style.display = 'none';
            alertBox.className = 'alert-box';
        }, 6000);
    }

    // ========== دالة مساعدة لتحديث الهيدر ==========
    function updateHeader(user) {
        const headerName = document.getElementById('headerUserName');
        const headerAvatar = document.getElementById('headerAvatar');

        if (!user) {
            if (headerName) headerName.textContent = 'زائر';
            if (headerAvatar) headerAvatar.textContent = 'ز';
            return;
        }

        const fullName = user.user_metadata?.full_name || user.email || 'مستخدم';
        if (headerName) headerName.textContent = fullName;
        if (headerAvatar) headerAvatar.textContent = fullName.charAt(0).toUpperCase();
    }

    // ========== كائن الصفحة الرئيسي ==========
    window.SecurityPages = window.SecurityPages || {};

    window.SecurityPages["change-password"] = {

        supabase: null,
        auth: null,
        currentUser: null,
        currentSession: null,

        /**
         * تهيئة الصفحة
         */
        async init() {
            console.log("🔐 [Change Password] جاري التهيئة...");

            try {
                // الانتظار لـ TeraAuth
                if (!window.TeraAuth) {
                    throw new Error('نظام المصادقة غير متوفر');
                }

                if (!window.TeraAuth._initialized) {
                    await window.TeraAuth.init();
                }

                this.auth = window.TeraAuth;
                this.supabase = this.auth._client;

                if (!this.supabase) {
                    throw new Error('عميل Supabase غير متوفر');
                }

                // جلب الجلسة الحالية
                const session = await this.auth.getSession();
                if (!session) {
                    this.auth.redirectTo(ROUTES.LOGIN);
                    return;
                }

                this.currentSession = session;
                this.currentUser = session.user;

                // تحديث الهيدر
                updateHeader(this.currentUser);

                // تخزين عناصر DOM وربط الأحداث
                this.cacheDom();
                this.bindEvents();

                console.log("✅ [Change Password] التهيئة اكتملت بنجاح.");

            } catch (error) {
                console.error("❌ [Change Password] خطأ في التهيئة:", error);
                showSecurityAlert(
                    error.message || "تعذر تحميل الصفحة. يرجى إعادة المحاولة.",
                    "error"
                );
                // توجيه إلى تسجيل الدخول في حال فشل التحقق
                if (window.TeraAuth) {
                    setTimeout(() => window.TeraAuth.redirectTo(ROUTES.LOGIN), 2000);
                }
            }
        },

        /**
         * تخزين مراجع عناصر DOM
         */
        cacheDom() {
            this.currentPassword = document.getElementById("currentPassword");
            this.newPassword = document.getElementById("newPassword");
            this.confirmPassword = document.getElementById("confirmPassword");
            this.changePasswordBtn = document.getElementById("changePasswordBtn");
            this.passwordStrength = document.getElementById("passwordStrength");
            this.confirmHint = document.getElementById("confirmPasswordHint");
        },

        /**
         * ربط الأحداث
         */
        bindEvents() {
            if (this.newPassword) {
                this.newPassword.addEventListener("input", () => this.validatePassword());
            }

            if (this.confirmPassword) {
                this.confirmPassword.addEventListener("input", () => this.validateConfirm());
            }

            if (this.changePasswordBtn) {
                this.changePasswordBtn.addEventListener("click", () => this.changePassword());
            }

            // دعم الضغط على Enter
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !this.changePasswordBtn?.disabled) {
                    this.changePassword();
                }
            });
        },

        /**
         * التحقق من قوة كلمة المرور
         */
        validatePassword() {
            const password = this.newPassword?.value || '';
            let score = 0;

            if (password.length >= 8) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[a-z]/.test(password)) score++;
            if (/\d/.test(password)) score++;
            if (/[^A-Za-z0-9]/.test(password)) score++;

            if (!this.passwordStrength) return;

            const strengthMap = {
                0: { text: 'ضعيفة', class: 'weak' },
                1: { text: 'ضعيفة', class: 'weak' },
                2: { text: 'متوسطة', class: 'medium' },
                3: { text: 'متوسطة', class: 'medium' },
                4: { text: 'قوية', class: 'strong' },
                5: { text: 'قوية جداً', class: 'strong' }
            };

            const level = strengthMap[Math.min(score, 5)] || strengthMap[0];
            this.passwordStrength.textContent = level.text;
            this.passwordStrength.className = `password-strength ${level.class}`;
        },

        /**
         * التحقق من تطابق كلمة المرور
         */
        validateConfirm() {
            if (!this.confirmHint) return;

            const isMatch = this.confirmPassword?.value === this.newPassword?.value;

            if (isMatch && this.confirmPassword?.value.length > 0) {
                this.confirmHint.className = "email-hint success";
                this.confirmHint.innerHTML = '<i class="fas fa-check-circle"></i> كلمة المرور متطابقة';
            } else if (this.confirmPassword?.value.length > 0) {
                this.confirmHint.className = "email-hint error";
                this.confirmHint.innerHTML = '<i class="fas fa-times-circle"></i> كلمة المرور غير متطابقة';
            } else {
                this.confirmHint.className = "email-hint";
                this.confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> أعد كتابة كلمة المرور الجديدة';
            }
        },

        /**
         * تغيير كلمة المرور
         */
        async changePassword() {
            const currentPassword = this.currentPassword?.value?.trim() || '';
            const newPassword = this.newPassword?.value?.trim() || '';
            const confirmPassword = this.confirmPassword?.value?.trim() || '';

            // التحقق من صحة الإدخال
            if (!currentPassword || !newPassword || !confirmPassword) {
                showSecurityAlert("يرجى تعبئة جميع الحقول.", "error");
                return;
            }

            if (newPassword.length < 8) {
                showSecurityAlert("يجب أن تكون كلمة المرور 8 أحرف على الأقل.", "error");
                return;
            }

            if (newPassword !== confirmPassword) {
                showSecurityAlert("كلمة المرور الجديدة غير متطابقة.", "error");
                return;
            }

            if (currentPassword === newPassword) {
                showSecurityAlert("يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية.", "warning");
                return;
            }

            // تعطيل الزر وعرض حالة التحميل
            this.setLoading(this.changePasswordBtn, "جاري تغيير كلمة المرور...");

            try {
                // التحقق من كلمة المرور الحالية عن طريق محاولة تسجيل الدخول
                const { error: verifyError } = await this.supabase.auth.signInWithPassword({
                    email: this.currentUser.email,
                    password: currentPassword
                });

                if (verifyError) {
                    throw new Error("كلمة المرور الحالية غير صحيحة.");
                }

                // تحديث كلمة المرور
                const { error } = await this.supabase.auth.updateUser({
                    password: newPassword
                });

                if (error) throw error;

                // نجاح العملية
                showSecurityAlert("✅ تم تغيير كلمة المرور بنجاح.", "success");

                // تنظيف النموذج
                this.resetForm();

                // تحديث بيانات المستخدم في الخلفية
                await this.refreshUser();

            } catch (err) {
                console.error("❌ [Change Password] خطأ:", err);
                showSecurityAlert(
                    err.message || "تعذر تغيير كلمة المرور. يرجى المحاولة مرة أخرى.",
                    "error"
                );
            } finally {
                this.stopLoading(this.changePasswordBtn);
            }
        },

        /**
         * إظهار حالة التحميل
         */
        setLoading(button, text) {
            if (!button) return;
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        },

        /**
         * إيقاف حالة التحميل
         */
        stopLoading(button) {
            if (!button) return;
            button.disabled = false;
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        },

        /**
         * تنظيف النموذج بالكامل
         */
        resetForm() {
            if (this.currentPassword) this.currentPassword.value = "";
            if (this.newPassword) this.newPassword.value = "";
            if (this.confirmPassword) this.confirmPassword.value = "";

            if (this.passwordStrength) {
                this.passwordStrength.textContent = "";
                this.passwordStrength.className = "password-strength";
            }

            if (this.confirmHint) {
                this.confirmHint.className = "email-hint";
                this.confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> أعد كتابة كلمة المرور الجديدة';
            }
        },

        /**
         * تحديث بيانات المستخدم
         */
        async refreshUser() {
            try {
                const user = await this.auth.getUser();
                if (user) {
                    this.currentUser = user;
                    updateHeader(user);
                }
            } catch (error) {
                console.warn("⚠️ [Change Password] تعذر تحديث بيانات المستخدم:", error);
            }
        }
    };

    // ========== تشغيل التهيئة عند تحميل الصفحة ==========
    document.addEventListener('DOMContentLoaded', function () {
        // التأكد من وجود TeraAuth
        if (!window.TeraAuth) {
            console.warn("⚠️ [Change Password] TeraAuth غير متوفر، سيتم إعادة المحاولة...");
            document.addEventListener('auth:ready', function handler() {
                document.removeEventListener('auth:ready', handler);
                window.SecurityPages["change-password"].init();
            }, { once: true });
            return;
        }

        window.SecurityPages["change-password"].init();
    });

})();
