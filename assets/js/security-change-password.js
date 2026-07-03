/**
 * ==========================================================
 * security-change-password.js
 * تغيير كلمة المرور
 * Enterprise Version 2026
 * ==========================================================
 */

'use strict';

(function () {

    window.SecurityPages = window.SecurityPages || {};

    window.SecurityPages["change-password"] = {

        supabase: null,
        currentUser: null,
        currentSession: null,

        async init() {

            console.log("🔐 [Change Password] Initializing...");

            try {

                this.supabase = await waitForSupabase();

                const {
                    data: { session }
                } = await this.supabase.auth.getSession();

                if (!session) {

                    window.location.replace(
                        "/auth/auth/login/login.html"
                    );

                    return;

                }

                this.currentSession = session;
                this.currentUser = session.user;

                updateHeader(this.currentUser);

                this.cacheDom();

                this.bindEvents();

            }

            catch (error) {

                console.error(error);

                showSecurityAlert(
                    "تعذر تحميل الصفحة.",
                    "error"
                );

            }

        },

        cacheDom() {

            this.currentPassword =
                document.getElementById("currentPassword");

            this.newPassword =
                document.getElementById("newPassword");

            this.confirmPassword =
                document.getElementById("confirmPassword");

            this.changePasswordBtn =
                document.getElementById("changePasswordBtn");

            this.passwordStrength =
                document.getElementById("passwordStrength");

            this.confirmHint =
                document.getElementById("confirmPasswordHint");

        },

        bindEvents() {

            this.newPassword.addEventListener(
                "input",
                () => this.validatePassword()
            );

            this.confirmPassword.addEventListener(
                "input",
                () => this.validateConfirm()
            );

            this.changePasswordBtn.addEventListener(
                "click",
                () => this.changePassword()
            );

        },

        validatePassword() {

            const password =
                this.newPassword.value;

            let score = 0;

            if (password.length >= 8)
                score++;

            if (/[A-Z]/.test(password))
                score++;

            if (/[a-z]/.test(password))
                score++;

            if (/\d/.test(password))
                score++;

            if (/[^A-Za-z0-9]/.test(password))
                score++;

            if (!this.passwordStrength)
                return;

            switch (score) {

                case 0:
                case 1:

                    this.passwordStrength.innerHTML =
                        "ضعيفة";

                    this.passwordStrength.className =
                        "password-strength weak";

                    break;

                case 2:
                case 3:

                    this.passwordStrength.innerHTML =
                        "متوسطة";

                    this.passwordStrength.className =
                        "password-strength medium";

                    break;

                default:

                    this.passwordStrength.innerHTML =
                        "قوية";

                    this.passwordStrength.className =
                        "password-strength strong";

            }

        },

        validateConfirm() {

            if (!this.confirmHint)
                return;

            if (
                this.confirmPassword.value ===
                this.newPassword.value
            ) {

                this.confirmHint.className =
                    "email-hint success";

                this.confirmHint.innerHTML =
                    '<i class="fas fa-check-circle"></i> كلمة المرور متطابقة';

            }

            else {

                this.confirmHint.className =
                    "email-hint error";

                this.confirmHint.innerHTML =
                    '<i class="fas fa-times-circle"></i> كلمة المرور غير متطابقة';

            }

        },

                async changePassword() {

            const currentPassword =
                this.currentPassword.value.trim();

            const newPassword =
                this.newPassword.value.trim();

            const confirmPassword =
                this.confirmPassword.value.trim();

            if (
                !currentPassword ||
                !newPassword ||
                !confirmPassword
            ) {

                showSecurityAlert(
                    "يرجى تعبئة جميع الحقول.",
                    "error"
                );

                return;

            }

            if (newPassword.length < 8) {

                showSecurityAlert(
                    "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
                    "error"
                );

                return;

            }

            if (newPassword !== confirmPassword) {

                showSecurityAlert(
                    "كلمة المرور الجديدة غير متطابقة.",
                    "error"
                );

                return;

            }

            if (currentPassword === newPassword) {

                showSecurityAlert(
                    "يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية.",
                    "warning"
                );

                return;

            }

            this.setLoading(
                this.changePasswordBtn,
                "جاري تغيير كلمة المرور..."
            );

            try {

                /*
                 * التحقق من كلمة المرور الحالية
                 */

                const { error: verifyError } =
                    await this.supabase.auth.signInWithPassword({

                        email: this.currentUser.email,

                        password: currentPassword

                    });

                if (verifyError)
                    throw new Error(
                        "كلمة المرور الحالية غير صحيحة."
                    );

                /*
                 * تحديث كلمة المرور
                 */

                const { error } =
                    await this.supabase.auth.updateUser({

                        password: newPassword

                    });

                if (error)
                    throw error;

                showSecurityAlert(

                    "تم تغيير كلمة المرور بنجاح.",

                    "success"

                );

                /*
                 * تنظيف النموذج
                 */

                this.currentPassword.value = "";

                this.newPassword.value = "";

                this.confirmPassword.value = "";

                if (this.passwordStrength) {

                    this.passwordStrength.innerHTML = "";

                    this.passwordStrength.className =
                        "password-strength";

                }

                if (this.confirmHint) {

                    this.confirmHint.className =
                        "email-hint";

                    this.confirmHint.innerHTML =
                        '<i class="fas fa-info-circle"></i> أعد كتابة كلمة المرور الجديدة';

                }

            }

            catch (err) {

                console.error(
                    "[Change Password]",
                    err
                );

                showSecurityAlert(

                    err.message ||

                    "تعذر تغيير كلمة المرور.",

                    "error"

                );

            }

            finally {

                this.stopLoading(
                    this.changePasswordBtn
                );

            }

        },

                /*
        ==========================================================
        إظهار حالة التحميل
        ==========================================================
        */

        setLoading(button, text) {

            if (!button) return;

            button.disabled = true;

            button.dataset.originalText =
                button.innerHTML;

            button.innerHTML =
                `<i class="fas fa-spinner fa-spin"></i> ${text}`;

        },

        /*
        ==========================================================
        إيقاف حالة التحميل
        ==========================================================
        */

        stopLoading(button) {

            if (!button) return;

            button.disabled = false;

            if (button.dataset.originalText) {

                button.innerHTML =
                    button.dataset.originalText;

            }

        },

        /*
        ==========================================================
        تنظيف النموذج بالكامل
        ==========================================================
        */

        resetForm() {

            this.currentPassword.value = "";

            this.newPassword.value = "";

            this.confirmPassword.value = "";

            if (this.passwordStrength) {

                this.passwordStrength.innerHTML = "";

                this.passwordStrength.className =
                    "password-strength";

            }

            if (this.confirmHint) {

                this.confirmHint.className =
                    "email-hint";

                this.confirmHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أعد كتابة كلمة المرور الجديدة';

            }

        },

        /*
        ==========================================================
        فحص قوة كلمة المرور
        ==========================================================
        */

        isStrongPassword(password) {

            return (
                password.length >= 8 &&
                /[A-Z]/.test(password) &&
                /[a-z]/.test(password) &&
                /\d/.test(password) &&
                /[^A-Za-z0-9]/.test(password)
            );

        },

                /*
        ==========================================================
        تحديث واجهة المستخدم بعد نجاح العملية
        ==========================================================
        */

        async refreshUser() {

            try {

                const {
                    data: { user }
                } = await this.supabase.auth.getUser();

                if (user) {

                    this.currentUser = user;

                    updateHeader(user);

                }

            }

            catch (error) {

                console.warn(
                    "[Change Password] Unable to refresh user.",
                    error
                );

            }

        },

        /*
        ==========================================================
        إعادة تهيئة الصفحة
        ==========================================================
        */

             reloadPage() {

            this.resetForm();

            this.refreshUser();

        }

    };

})();
