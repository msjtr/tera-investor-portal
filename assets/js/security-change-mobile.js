/**
 * ==========================================================
 * security-change-mobile.js
 * تغيير رقم الجوال
 * Enterprise Version 2026
 * ==========================================================
 */

'use strict';

(function () {

    window.SecurityPages = window.SecurityPages || {};

    window.SecurityPages["change-mobile"] = {

        supabase: null,
        currentUser: null,
        currentSession: null,

        async init() {

            console.log("📱 [Change Mobile] Initializing...");

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

                this.loadCurrentMobile();

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

            this.currentMobileDisplay =
                document.getElementById("currentMobileDisplay");

            this.currentPassword =
                document.getElementById("currentPassword");

            this.newMobile =
                document.getElementById("newMobile");

            this.confirmMobile =
                document.getElementById("confirmMobile");

            this.changeMobileBtn =
                document.getElementById("changeMobileBtn");

            this.mobileHint =
                document.getElementById("mobileHint");

            this.confirmHint =
                document.getElementById("confirmMobileHint");

        },

        loadCurrentMobile() {

            const mobile =
                this.currentUser.user_metadata?.mobile_number ||
                "غير مسجل";

            if (this.currentMobileDisplay) {

                this.currentMobileDisplay.textContent =
                    mobile;

            }

        },

        bindEvents() {

            this.newMobile.addEventListener(

                "input",

                () => this.validateMobile()

            );

            this.confirmMobile.addEventListener(

                "input",

                () => this.validateConfirm()

            );

            this.changeMobileBtn.addEventListener(

                "click",

                () => this.changeMobile()

            );

        },

                validateMobile() {

            const mobile =
                this.newMobile.value.trim();

            if (!this.mobileHint)
                return;

            if (!mobile.length) {

                this.mobileHint.className =
                    "email-hint";

                this.mobileHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أدخل رقم الجوال الجديد';

                return;

            }

            const regex =
                /^(\+9665|05)[0-9]{8}$/;

            if (!regex.test(mobile)) {

                this.mobileHint.className =
                    "email-hint error";

                this.mobileHint.innerHTML =
                    '<i class="fas fa-times-circle"></i> رقم الجوال غير صحيح';

                return;

            }

            this.mobileHint.className =
                "email-hint success";

            this.mobileHint.innerHTML =
                '<i class="fas fa-check-circle"></i> رقم الجوال صالح';

        },

        validateConfirm() {

            if (!this.confirmHint)
                return;

            const mobile =
                this.newMobile.value.trim();

            const confirm =
                this.confirmMobile.value.trim();

            if (!confirm.length) {

                this.confirmHint.className =
                    "email-hint";

                this.confirmHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أعد إدخال رقم الجوال';

                return;

            }

            if (mobile !== confirm) {

                this.confirmHint.className =
                    "email-hint error";

                this.confirmHint.innerHTML =
                    '<i class="fas fa-times-circle"></i> رقم الجوال غير متطابق';

                return;

            }

            this.confirmHint.className =
                "email-hint success";

            this.confirmHint.innerHTML =
                '<i class="fas fa-check-circle"></i> رقم الجوال متطابق';

        },

        normalizeMobile(number) {

            number = number.trim();

            if (number.startsWith("05")) {

                return "+966" + number.substring(1);

            }

            return number;

        },

        isValidSaudiMobile(number) {

            const regex =
                /^(\+9665|05)[0-9]{8}$/;

            return regex.test(number);

        },

        async changeMobile() {

            const password =
                this.currentPassword.value.trim();

            let mobile =
                this.newMobile.value.trim();

            let confirm =
                this.confirmMobile.value.trim();

            if (
                !password ||
                !mobile ||
                !confirm
            ) {

                showSecurityAlert(

                    "يرجى تعبئة جميع الحقول.",

                    "error"

                );

                return;

            }

            if (
                !this.isValidSaudiMobile(mobile)
            ) {

                showSecurityAlert(

                    "رقم الجوال غير صحيح.",

                    "error"

                );

                return;

            }

            if (mobile !== confirm) {

                showSecurityAlert(

                    "رقم الجوال غير متطابق.",

                    "error"

                );

                return;

            }

            mobile =
                this.normalizeMobile(mobile);

            confirm =
                this.normalizeMobile(confirm);

            if (
                mobile ===
                this.currentUser.user_metadata?.mobile_number
            ) {

                showSecurityAlert(

                    "رقم الجوال الجديد مطابق للحالي.",

                    "warning"

                );

                return;

            }

            this.setLoading(

                this.changeMobileBtn,

                "جاري تحديث رقم الجوال..."

            );


                        try {

                /*
                 * التحقق من كلمة المرور الحالية
                 */

                const { error: verifyError } =
                    await this.supabase.auth.signInWithPassword({

                        email: this.currentUser.email,

                        password

                    });

                if (verifyError) {

                    throw new Error(
                        "كلمة المرور الحالية غير صحيحة."
                    );

                }

                /*
                 * تحديث رقم الجوال داخل بيانات المستخدم
                 */

                const { error: updateError } =
                    await this.supabase.auth.updateUser({

                        data: {

                            mobile_number: mobile

                        }

                    });

                if (updateError)
                    throw updateError;

                /*
                 * تحديث جدول profiles (إن وجد)
                 */

                try {

                    await this.supabase

                        .from("profiles")

                        .update({

                            mobile_number: mobile,

                            updated_at:
                                new Date().toISOString()

                        })

                        .eq(
                            "id",
                            this.currentUser.id
                        );

                }

                catch (profileError) {

                    console.warn(
                        "[Change Mobile] Profile update skipped.",
                        profileError
                    );

                }

                /*
                 * تحديث المستخدم الحالي
                 */

                const {

                    data: {

                        user

                    }

                } = await this.supabase.auth.getUser();

                if (user) {

                    this.currentUser = user;

                }

                /*
                 * تحديث العرض الحالي
                 */

                if (this.currentMobileDisplay) {

                    this.currentMobileDisplay.textContent =
                        mobile;

                }

                showSecurityAlert(

                    "تم تحديث رقم الجوال بنجاح.",

                    "success"

                );

                /*
                 * تنظيف الحقول
                 */

                this.currentPassword.value = "";

                this.newMobile.value = "";

                this.confirmMobile.value = "";

                this.mobileHint.className =
                    "email-hint";

                this.mobileHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أدخل رقم الجوال الجديد';

                this.confirmHint.className =
                    "email-hint";

                this.confirmHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أعد إدخال رقم الجوال';

            }

            catch (err) {

                console.error(
                    "[Change Mobile]",
                    err
                );

                showSecurityAlert(

                    err.message ||

                    "تعذر تحديث رقم الجوال.",

                    "error"

                );

            }

            finally {

                this.stopLoading(

                    this.changeMobileBtn

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
        إنهاء حالة التحميل
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
        إعادة ضبط النموذج
        ==========================================================
        */

        resetForm() {

            this.currentPassword.value = "";

            this.newMobile.value = "";

            this.confirmMobile.value = "";

            if (this.mobileHint) {

                this.mobileHint.className =
                    "email-hint";

                this.mobileHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أدخل رقم الجوال الجديد';

            }

            if (this.confirmHint) {

                this.confirmHint.className =
                    "email-hint";

                this.confirmHint.innerHTML =
                    '<i class="fas fa-info-circle"></i> أعد إدخال رقم الجوال';

            }

        },

        /*
        ==========================================================
        تحديث بيانات المستخدم
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

                    this.loadCurrentMobile();

                }

            }

            catch (error) {

                console.warn(
                    "[Change Mobile] Unable to refresh user.",
                    error
                );

            }

        },

        /*
        ==========================================================
        إعادة تحميل الصفحة
        ==========================================================
        */

        reloadPage() {

            this.resetForm();

            this.refreshUser();

        }

    };

})();



        
