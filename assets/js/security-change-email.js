/**
 * ==========================================================
 * security-change-email.js
 * تغيير البريد الإلكتروني
 * Enterprise Version 2026
 * ==========================================================
 */

'use strict';

(function () {

    window.SecurityPages = window.SecurityPages || {};

    window.SecurityPages["change-email"] = {

        supabase: null,
        currentUser: null,
        currentSession: null,

        init: async function () {

            console.log("📧 [Change Email] Initializing...");

            try {

                this.supabase = await waitForSupabase();

                const {
                    data: { session }
                } = await this.supabase.auth.getSession();

                if (!session) {
                    window.location.replace("/auth/auth/login/login.html");
                    return;
                }

                this.currentSession = session;
                this.currentUser = session.user;

                updateHeader(this.currentUser);

                this.initializeElements();

                this.initializeEvents();

                this.fillCurrentEmail();

            } catch (error) {

                console.error(error);

                showSecurityAlert(
                    "تعذر تحميل صفحة تغيير البريد الإلكتروني.",
                    "error"
                );

            }

        },

        initializeElements: function () {

            this.step1 =
                document.getElementById("step1");

            this.step2 =
                document.getElementById("step2");

            this.currentEmailDisplay =
                document.getElementById("currentEmailDisplay");

            this.currentPassword =
                document.getElementById("currentPassword");

            this.verifyPasswordBtn =
                document.getElementById("verifyPasswordBtn");

            this.step1Error =
                document.getElementById("step1Error");

            this.newEmail =
                document.getElementById("newEmail");

            this.confirmEmail =
                document.getElementById("confirmEmail");

            this.changeEmailBtn =
                document.getElementById("changeEmailBtn");

            this.newEmailHint =
                document.getElementById("newEmailHint");

            this.confirmEmailHint =
                document.getElementById("confirmEmailHint");

        },

        initializeEvents: function () {

            this.verifyPasswordBtn.addEventListener(
                "click",
                () => this.verifyPassword()
            );

            this.changeEmailBtn.addEventListener(
                "click",
                () => this.changeEmail()
            );

            this.newEmail.addEventListener(
                "input",
                () => this.validateEmails()
            );

            this.confirmEmail.addEventListener(
                "input",
                () => this.validateEmails()
            );

        },

        fillCurrentEmail: function () {

            this.currentEmailDisplay.textContent =
                this.currentUser.email || "-";

        },

        validateEmail: function (email) {

            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        },

        validateEmails: function () {

            const email =
                this.newEmail.value.trim().toLowerCase();

            const confirm =
                this.confirmEmail.value.trim().toLowerCase();

            if (!email.length) {

                this.newEmailHint.className =
                    "email-hint";

                this.newEmailHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أدخل البريد الإلكتروني الجديد';

            } else if (!this.validateEmail(email)) {

                this.newEmailHint.className =
                    "email-hint error";

                this.newEmailHint.innerHTML =
                    '<i class="fas fa-times-circle"></i> صيغة البريد غير صحيحة';

            } else {

                this.newEmailHint.className =
                    "email-hint success";

                this.newEmailHint.innerHTML =
                    '<i class="fas fa-check-circle"></i> البريد الإلكتروني صالح';

            }

            if (!confirm.length) {

                this.confirmEmailHint.className =
                    "email-hint";

                this.confirmEmailHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أعد كتابة البريد الإلكتروني';

            }


                    else if (email !== confirm) {

                this.confirmEmailHint.className =
                    "email-hint error";

                this.confirmEmailHint.innerHTML =
                    '<i class="fas fa-times-circle"></i> البريدان غير متطابقين';

            } else {

                this.confirmEmailHint.className =
                    "email-hint success";

                this.confirmEmailHint.innerHTML =
                    '<i class="fas fa-check-circle"></i> البريدان متطابقان';

            }

        },

        async verifyPassword() {

            const password =
                this.currentPassword.value.trim();

            this.step1Error.style.display = "none";

            if (!password) {

                this.step1Error.textContent =
                    "يرجى إدخال كلمة المرور الحالية.";

                this.step1Error.style.display =
                    "block";

                return;

            }

            this.verifyPasswordBtn.disabled = true;

            this.verifyPasswordBtn.innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

            try {

                const { error } =
                    await this.supabase.auth.signInWithPassword({

                        email:
                            this.currentUser.email,

                        password

                    });

                if (error)
                    throw error;

                showSecurityAlert(

                    "تم التحقق من الهوية بنجاح.",

                    "success"

                );

                this.step1.style.display =
                    "none";

                this.step2.style.display =
                    "block";

            }

            catch (err) {

                console.error(err);

                this.step1Error.textContent =
                    "كلمة المرور غير صحيحة.";

                this.step1Error.style.display =
                    "block";

            }

            finally {

                this.verifyPasswordBtn.disabled =
                    false;

                this.verifyPasswordBtn.innerHTML =
                    '<i class="fas fa-check-circle"></i> تحقق من هويتك';

            }

        },

        async changeEmail() {

            const email =
                this.newEmail.value.trim().toLowerCase();

            const confirm =
                this.confirmEmail.value.trim().toLowerCase();

            if (!email || !confirm) {

                showSecurityAlert(

                    "يرجى تعبئة جميع الحقول.",

                    "error"

                );

                return;

            }

            if (!this.validateEmail(email)) {

                showSecurityAlert(

                    "صيغة البريد الإلكتروني غير صحيحة.",

                    "error"

                );

                return;

            }

            if (email !== confirm) {

                showSecurityAlert(

                    "البريد الإلكتروني غير متطابق.",

                    "error"

                );

                return;

            }

            if (
                email ===
                this.currentUser.email.toLowerCase()
            ) {

                showSecurityAlert(

                    "البريد الجديد مطابق للبريد الحالي.",

                    "warning"

                );

                return;

            }

            this.changeEmailBtn.disabled = true;

            this.changeEmailBtn.innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> جاري تغيير البريد...';


                    try {

                const { data, error } =
                    await this.supabase.functions.invoke(
                        "change-email",
                        {
                            body: {
                                newEmail: email
                            }
                        }
                    );

                if (error)
                    throw error;

                if (data?.error)
                    throw new Error(data.error);

                showSecurityAlert(

                    "تم تغيير البريد الإلكتروني بنجاح.",

                    "success"

                );

                /*
                 * تحديث بيانات المستخدم بعد تغيير البريد
                 */

                const {
                    data: { user }
                } = await this.supabase.auth.getUser();

                if (user) {

                    this.currentUser = user;

                    this.currentEmailDisplay.textContent =
                        user.email;

                }

                /*
                 * تنظيف الحقول
                 */

                this.currentPassword.value = "";

                this.newEmail.value = "";

                this.confirmEmail.value = "";

                this.newEmailHint.className =
                    "email-hint";

                this.newEmailHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أدخل بريداً إلكترونياً صحيحاً وفعالاً.';

                this.confirmEmailHint.className =
                    "email-hint";

                this.confirmEmailHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع البريد الإلكتروني الجديد.';

                /*
                 * الرجوع للخطوة الأولى
                 */

                this.step2.style.display =
                    "none";

                this.step1.style.display =
                    "block";

            }

            catch (err) {

                console.error(
                    "[Change Email]",
                    err
                );

                let message =
                    "تعذر تغيير البريد الإلكتروني.";

                if (err.message) {

                    if (
                        err.message.includes("already")
                    ) {

                        message =
                            "البريد الإلكتروني مستخدم مسبقاً.";

                    }

                    else if (
                        err.message.includes("invalid")
                    ) {

                        message =
                            "البريد الإلكتروني غير صالح.";

                    }

                    else if (
                        err.message.includes("rate")
                    ) {

                        message =
                            "تم تجاوز عدد المحاولات، يرجى الانتظار قليلاً.";

                    }

                    else {

                        message =
                            err.message;

                    }

                }

                showSecurityAlert(

                    message,

                    "error"

                );

            }

            finally {

                this.changeEmailBtn.disabled =
                    false;

                this.changeEmailBtn.innerHTML =
                    '<i class="fas fa-check-circle"></i> تغيير البريد الإلكتروني';

            }

        },

                /*
        ============================================================
        إعادة تعيين النموذج
        ============================================================
        */

        resetForm() {

            this.currentPassword.value = "";

            this.newEmail.value = "";

            this.confirmEmail.value = "";

            this.step1Error.textContent = "";

            this.step1Error.style.display = "none";

            this.newEmailHint.className =
                "email-hint";

            this.newEmailHint.innerHTML =
                '<i class="fas fa-info-circle"></i> أدخل بريداً إلكترونياً صحيحاً وفعالاً.';

            this.confirmEmailHint.className =
                "email-hint";

            this.confirmEmailHint.innerHTML =
                '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع البريد الإلكتروني الجديد.';

        },

        /*
        ============================================================
        الرجوع إلى المرحلة الأولى
        ============================================================
        */

        backToStepOne() {

            this.resetForm();

            this.step2.style.display = "none";

            this.step1.style.display = "block";

        },

        /*
        ============================================================
        إظهار المرحلة الثانية
        ============================================================
        */

        showStepTwo() {

            this.step1.style.display = "none";

            this.step2.style.display = "block";

        },

        /*
        ============================================================
        تحديث البريد الحالي بعد نجاح العملية
        ============================================================
        */

        updateCurrentEmail(email) {

            this.currentEmailDisplay.textContent = email;

        },

        /*
        ============================================================
        تعطيل الزر أثناء التنفيذ
        ============================================================
        */

        setLoading(button, text) {

            button.disabled = true;

            button.dataset.original =
                button.innerHTML;

            button.innerHTML =
                `<i class="fas fa-spinner fa-spin"></i> ${text}`;

        },

        /*
        ============================================================
        إعادة الزر لوضعه الطبيعي
        ============================================================
        */

        stopLoading(button) {

            button.disabled = false;

            if (button.dataset.original) {

                button.innerHTML =
                    button.dataset.original;

            }

        }

    };

})();

