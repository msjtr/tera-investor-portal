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

        emailInput: null,
        passwordInput: null,
        rememberInput: null,
        loginButton: null,
        form: null,

        init() {

            console.log("🔐 Login Page Initializing...");

            this.cacheDom();

            this.bindEvents();

            this.restoreRememberedAccount();

        },

        cacheDom() {

            this.form =
                document.getElementById("loginForm");

            this.emailInput =
                document.getElementById("email");

            this.passwordInput =
                document.getElementById("password");

            this.rememberInput =
                document.getElementById("rememberMe");

            this.loginButton =
                document.getElementById("loginBtn");

        },

        bindEvents() {

            if (this.form) {

                this.form.addEventListener(

                    "submit",

                    (e) => {

                        e.preventDefault();

                        this.login();

                    }

                );

            }

        },

        restoreRememberedAccount() {

            const remember =
                localStorage.getItem("tera_remember");

            const email =
                localStorage.getItem("tera_identifier");

            if (

                remember === "true" &&

                email &&

                this.emailInput

            ) {

                this.emailInput.value = email;

                if (this.rememberInput) {

                    this.rememberInput.checked = true;

                }

            }

        },

                async login() {

            const email =
                this.emailInput.value.trim();

            const password =
                this.passwordInput.value;

            if (!email || !password) {

                this.showError(
                    "يرجى إدخال البريد الإلكتروني وكلمة المرور."
                );

                return;

            }

            this.setLoading(
                this.loginButton,
                "جاري تسجيل الدخول..."
            );

            try {

                const user =
                    await TeraAuth.login(
                        email,
                        password
                    );

                /*
                 * Remember Me
                 */

                if (
                    this.rememberInput &&
                    this.rememberInput.checked
                ) {

                    localStorage.setItem(
                        "tera_remember",
                        "true"
                    );

                    localStorage.setItem(
                        "tera_identifier",
                        email
                    );

                } else {

                    localStorage.removeItem(
                        "tera_remember"
                    );

                    localStorage.removeItem(
                        "tera_identifier"
                    );

                }

                this.showSuccess(
                    `مرحباً ${user.name || "بك"}`
                );

                setTimeout(() => {

                    window.location.replace(
                        "/pages/dashboard/index.html"
                    );

                }, 700);

            }

            catch (err) {

                console.error(
                    "[Login]",
                    err
                );

                let message =
                    err.message;

                if (
                    err.message &&
                    err.message.includes(
                        "Invalid login credentials"
                    )
                ) {

                    message =
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

                }

                this.showError(
                    message ||
                    "تعذر تسجيل الدخول."
                );

            }

            finally {

                this.stopLoading(
                    this.loginButton
                );

            }

        },
                /*
        ==========================================================
        بدء التحميل
        ==========================================================
        */

        setLoading(button, text) {

            if (!button)
                return;

            button.disabled = true;

            button.dataset.originalText =
                button.innerHTML;

            button.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                ${text}
            `;

        },

        /*
        ==========================================================
        إنهاء التحميل
        ==========================================================
        */

        stopLoading(button) {

            if (!button)
                return;

            button.disabled = false;

            if (button.dataset.originalText) {

                button.innerHTML =
                    button.dataset.originalText;

            }

        },

        /*
        ==========================================================
        رسالة نجاح
        ==========================================================
        */

        showSuccess(message) {

            if (
                typeof showAlert === "function"
            ) {

                showAlert(
                    message,
                    "success"
                );

                return;

            }

            alert(message);

        },

        /*
        ==========================================================
        رسالة خطأ
        ==========================================================
        */

        showError(message) {

            if (
                typeof showAlert === "function"
            ) {

                showAlert(
                    message,
                    "error"
                );

                return;

            }

            alert(message);

        },
                /*
        ==========================================================
        تنظيف النموذج
        ==========================================================
        */

        clearForm() {

            if (this.passwordInput) {

                this.passwordInput.value = "";

            }

        },

        /*
        ==========================================================
        إعادة تعيين الصفحة
        ==========================================================
        */

        reset() {

            this.clearForm();

            if (this.loginButton) {

                this.stopLoading(
                    this.loginButton
                );

            }

        },

        /*
        ==========================================================
        تنظيف الموارد
        ==========================================================
        */

        destroy() {

            this.reset();

            this.emailInput = null;

            this.passwordInput = null;

            this.rememberInput = null;

            this.loginButton = null;

            this.form = null;

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
