/**
 * ==========================================================
 * login.js
 * صفحة تسجيل الدخول
 * Enterprise Version 2026
 * ==========================================================
 */

'use strict';

(function () {

    const LoginPage = {

        form: null,

        emailInput: null,

        passwordInput: null,

        rememberInput: null,

        loginButton: null,

        alertBox: null,

        alertMessage: null,

        alertIcon: null,

        init() {

            console.log("🔐 Login Page Initializing...");

            this.cacheDom();

            this.bindEvents();

            this.restoreRememberedAccount();

        },

        cacheDom() {

            this.form =
                document.getElementById("teraLoginForm");

            this.emailInput =
                document.getElementById("login_identifier");

            this.passwordInput =
                document.getElementById("login_password");

            this.rememberInput =
                document.getElementById("remember_me");

            this.loginButton =
                document.getElementById("loginSubmitBtn");

            this.alertBox =
                document.getElementById("formAlert");

            this.alertMessage =
                document.getElementById("alertMessage");

            this.alertIcon =
                document.getElementById("alertIcon");

            console.log("Form :", this.form);
            console.log("Email :", this.emailInput);
            console.log("Password :", this.passwordInput);
            console.log("Button :", this.loginButton);

        },

        bindEvents() {

            if (!this.form) {

                console.error("❌ لم يتم العثور على النموذج.");

                return;

            }

            this.form.addEventListener(

                "submit",

                async (e) => {

                    e.preventDefault();

                    await this.login();

                }

            );

        },

        restoreRememberedAccount() {

            const remember =
                localStorage.getItem("tera_remember");

            const identifier =
                localStorage.getItem("tera_identifier");

            if (

                remember === "true" &&

                identifier

            ) {

                this.emailInput.value =
                    identifier;

                this.rememberInput.checked = true;

            }

        },

                /*
        ==========================================================
        تسجيل الدخول
        ==========================================================
        */

        async login() {

            console.log("🚀 بدء عملية تسجيل الدخول...");

            const identifier =
                this.emailInput.value.trim();

            const password =
                this.passwordInput.value;

            this.hideAlert();

            if (!identifier) {

                this.showError(
                    "يرجى إدخال البريد الإلكتروني."
                );

                this.emailInput.focus();

                return;

            }

            if (!password) {

                this.showError(
                    "يرجى إدخال كلمة المرور."
                );

                this.passwordInput.focus();

                return;

            }

            this.setLoading(
                true,
                "جاري تسجيل الدخول..."
            );

            try {

                console.log("📨 إرسال البيانات إلى TeraAuth...");

                const user = await TeraAuth.login(

                    identifier,

                    password

                );

                console.log("✅ تم تسجيل الدخول", user);

                /*
                ==============================================
                Remember Me
                ==============================================
                */

                if (this.rememberInput.checked) {

                    localStorage.setItem(

                        "tera_remember",

                        "true"

                    );

                    localStorage.setItem(

                        "tera_identifier",

                        identifier

                    );

                }

                else {

                    localStorage.removeItem(

                        "tera_remember"

                    );

                    localStorage.removeItem(

                        "tera_identifier"

                    );

                }

                this.showSuccess(

                    "تم تسجيل الدخول بنجاح..."

                );

                setTimeout(() => {

                    window.location.href =

                        "/pages/dashboard/index.html";

                }, 800);

            }

            catch (error) {

                console.error(

                    "❌ Login Error",

                    error

                );

                let message =

                    error.message ||

                    "تعذر تسجيل الدخول.";

                if (

                    message.includes(

                        "Invalid login credentials"

                    )

                ) {

                    message =

                        "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

                }

                if (

                    message.includes(

                        "Email not confirmed"

                    )

                ) {

                    message =

                        "يرجى تفعيل البريد الإلكتروني أولاً.";

                }

                this.showError(

                    message

                );

            }

            finally {

                this.setLoading(false);

            }

        },

                /*
        ==========================================================
        حالة التحميل
        ==========================================================
        */

        setLoading(isLoading, text = "جاري المعالجة...") {

            if (!this.loginButton) return;

            if (isLoading) {

                this.loginButton.disabled = true;

                this.loginButton.dataset.originalText =
                    this.loginButton.innerHTML;

                this.loginButton.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    ${text}
                `;

            } else {

                this.loginButton.disabled = false;

                if (this.loginButton.dataset.originalText) {

                    this.loginButton.innerHTML =
                        this.loginButton.dataset.originalText;

                }

            }

        },

        /*
        ==========================================================
        إخفاء الرسالة
        ==========================================================
        */

        hideAlert() {

            if (!this.alertBox) return;

            this.alertBox.style.display = "none";

            this.alertBox.classList.remove(
                "alert-success",
                "alert-error",
                "alert-warning"
            );

        },

        /*
        ==========================================================
        رسالة نجاح
        ==========================================================
        */

        showSuccess(message) {

            if (!this.alertBox) {

                alert(message);

                return;

            }

            this.alertBox.style.display = "flex";

            this.alertBox.className =
                "alert-box alert-success";

            this.alertIcon.innerHTML =
                '<i class="fas fa-circle-check"></i>';

            this.alertMessage.textContent =
                message;

        },

        /*
        ==========================================================
        رسالة خطأ
        ==========================================================
        */

        showError(message) {

            if (!this.alertBox) {

                alert(message);

                return;

            }

            this.alertBox.style.display = "flex";

            this.alertBox.className =
                "alert-box alert-error";

            this.alertIcon.innerHTML =
                '<i class="fas fa-circle-exclamation"></i>';

            this.alertMessage.textContent =
                message;

        },
                /*
        ==========================================================
        إظهار / إخفاء كلمة المرور
        ==========================================================
        */

        togglePasswordVisibility() {

            const checkbox =
                document.getElementById(
                    "show_login_password"
                );

            if (!checkbox || !this.passwordInput)
                return;

            checkbox.addEventListener(

                "change",

                () => {

                    this.passwordInput.type =

                        checkbox.checked

                            ? "text"

                            : "password";

                }

            );

        },

        /*
        ==========================================================
        إعادة تعيين النموذج
        ==========================================================
        */

        resetForm() {

            if (this.passwordInput) {

                this.passwordInput.value = "";

            }

            this.hideAlert();

        },

        /*
        ==========================================================
        تنظيف الموارد
        ==========================================================
        */

        destroy() {

            this.resetForm();

            this.form = null;

            this.emailInput = null;

            this.passwordInput = null;

            this.rememberInput = null;

            this.loginButton = null;

            this.alertBox = null;

            this.alertMessage = null;

            this.alertIcon = null;

        },

            };

    /*
    ==========================================================
    تشغيل الصفحة
    ==========================================================
    */

    document.addEventListener(

        "DOMContentLoaded",

        () => {

            LoginPage.init();

        }

    );

})();
        
