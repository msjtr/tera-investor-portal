/**
 * ==========================================================
 * verify-otp.js
 * التحقق من رمز OTP
 * Enterprise Version 2026
 * ==========================================================
 */

'use strict';

(function () {

    const VerifyOTP = {

        supabase: null,

        email: null,

        verifyButton: null,

        resendButton: null,

        otpInput: null,

        countdownElement: null,

        countdown: 60,

        timer: null,

        async init() {

            try {

                this.supabase = await waitForSupabase();

                this.cacheDom();

                this.bindEvents();

                this.loadEmail();

                this.startTimer();

            }

            catch (error) {

                console.error(error);

                this.showError(
                    "تعذر تحميل صفحة التحقق."
                );

            }

        },

        cacheDom() {

            this.verifyButton =
                document.getElementById("verifyOtpBtn");

            this.resendButton =
                document.getElementById("resendOtpBtn");

            this.otpInput =
                document.getElementById("otpCode");

            this.countdownElement =
                document.getElementById("countdown");

        },

        bindEvents() {

            if (this.verifyButton) {

                this.verifyButton.addEventListener(

                    "click",

                    () => this.verify()

                );

            }

            if (this.resendButton) {

                this.resendButton.addEventListener(

                    "click",

                    () => this.resend()

                );

            }

        },

        loadEmail() {

            this.email =
                sessionStorage.getItem("otp_email") ||

                localStorage.getItem("otp_email");

            if (!this.email) {

                window.location.replace(
                    "/auth/auth/login/login.html"
                );

            }

        },

                async verify() {

            const otp =
                this.otpInput.value.trim();

            if (!otp) {

                this.showError(
                    "يرجى إدخال رمز التحقق."
                );

                return;

            }

            this.setLoading(
                this.verifyButton,
                "جاري التحقق..."
            );

            try {

                const { error } =
                    await this.supabase.auth.verifyOtp({

                        email: this.email,

                        token: otp,

                        type: "email"

                    });

                if (error)
                    throw error;

                this.showSuccess(
                    "تم التحقق من الرمز بنجاح."
                );

                sessionStorage.removeItem(
                    "otp_email"
                );

                localStorage.removeItem(
                    "otp_email"
                );

                setTimeout(() => {

                    window.location.replace(
                        "/pages/dashboard/index.html"
                    );

                }, 1200);

            }

            catch (err) {

                console.error(
                    "[Verify OTP]",
                    err
                );

                this.showError(

                    err.message ||

                    "رمز التحقق غير صحيح."

                );

            }

            finally {

                this.stopLoading(
                    this.verifyButton
                );

            }

        },

        async resend() {

            this.setLoading(

                this.resendButton,

                "جاري الإرسال..."

            );

            try {

                const { error } =
                    await this.supabase.auth.resend({

                        type: "signup",

                        email: this.email

                    });

                if (error)
                    throw error;

                this.showSuccess(

                    "تم إرسال رمز جديد."

                );

                this.countdown = 60;

                this.startTimer();

            }

            catch (err) {

                console.error(
                    "[Resend OTP]",
                    err
                );

                this.showError(

                    err.message ||

                    "تعذر إعادة إرسال الرمز."

                );

            }

            finally {

                this.stopLoading(
                    this.resendButton
                );

            }

        },

                startTimer() {

            if (this.timer) {

                clearInterval(this.timer);

            }

            if (this.resendButton) {

                this.resendButton.disabled = true;

            }

            const updateCountdown = () => {

                if (this.countdownElement) {

                    this.countdownElement.textContent =
                        this.countdown;

                }

                if (this.countdown <= 0) {

                    clearInterval(this.timer);

                    if (this.resendButton) {

                        this.resendButton.disabled = false;

                    }

                    if (this.countdownElement) {

                        this.countdownElement.textContent = "";

                    }

                    return;

                }

                this.countdown--;

            };

            updateCountdown();

            this.timer = setInterval(

                updateCountdown,

                1000

            );

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

            if (typeof showSecurityAlert === "function") {

                showSecurityAlert(
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

            if (typeof showSecurityAlert === "function") {

                showSecurityAlert(
                    message,
                    "error"
                );

                return;

            }

            alert(message);

        },

        /*
        ==========================================================
        إعادة ضبط النموذج
        ==========================================================
        */

        resetForm() {

            if (this.otpInput) {

                this.otpInput.value = "";

                this.otpInput.focus();

            }

        },

        /*
        ==========================================================
        تنظيف الموارد
        ==========================================================
        */

        destroy() {

            if (this.timer) {

                clearInterval(this.timer);

                this.timer = null;

            }

            this.resetForm();

            this.supabase = null;

            this.email = null;

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

            VerifyOTP.init();

        }

    );

})();
