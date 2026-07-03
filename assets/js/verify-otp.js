/**
 * ==========================================================
 * verify-otp.js
 * مركز التحقق الموحد (OTP Center)
 * Enterprise Version 2026
 * ==========================================================
 * يدعم:
 * - Confirm Sign Up
 * - Magic Link / Email OTP
 * - Reset Password
 * - Change Email
 * - Change Mobile (مستقبلاً)
 * - Two Factor (مستقبلاً)
 * ==========================================================
 */

"use strict";

(function () {

    const VerifyOTP = {

        supabase: null,

        otpType: null,

        email: null,

        redirect: null,

        title: null,

        message: null,

        countdown: 60,

        timer: null,

        form: null,

        otpInput: null,

        verifyButton: null,

        resendButton: null,

        countdownLabel: null,

        titleElement: null,

        messageElement: null,

        alertBox: null,

        alertMessage: null,

        alertIcon: null,

        async init() {

            console.log("🔐 OTP Center Initializing...");

            try {

                this.supabase =
                    await waitForSupabase();

                this.cacheDom();

                this.loadSessionData();

                this.updatePage();

                this.bindEvents();

                this.startCountdown();

            }

            catch (error) {

                console.error(error);

                this.showError(

                    "تعذر تهيئة صفحة التحقق."

                );

            }

        },

        cacheDom() {

            this.form =
                document.getElementById("otpForm");

            this.otpInput =
                document.getElementById("otpCode");

            this.verifyButton =
                document.getElementById("verifyOtpBtn");

            this.resendButton =
                document.getElementById("resendOtpBtn");

            this.countdownLabel =
                document.getElementById("countdown");

            this.titleElement =
                document.getElementById("otpTitle");

            this.messageElement =
                document.getElementById("otpMessage");

            this.alertBox =
                document.getElementById("formAlert");

            this.alertMessage =
                document.getElementById("alertMessage");

            this.alertIcon =
                document.getElementById("alertIcon");

        },

        loadSessionData() {

            this.otpType =
                sessionStorage.getItem("otp_type") ||
                "signup";

            this.email =
                sessionStorage.getItem("otp_email");

            this.redirect =
                sessionStorage.getItem("otp_redirect") ||
                "/pages/dashboard/index.html";

            this.title =
                sessionStorage.getItem("otp_title") ||
                "التحقق من الرمز";

            this.message =
                sessionStorage.getItem("otp_message") ||
                "أدخل رمز التحقق المرسل إلى بريدك الإلكتروني.";

            console.log({

                otpType: this.otpType,

                email: this.email,

                redirect: this.redirect

            });

        },
                /*
        ==========================================================
        تحديث واجهة الصفحة حسب نوع العملية
        ==========================================================
        */

        updatePage() {

            if (this.titleElement) {

                this.titleElement.textContent =
                    this.title;

            }

            if (this.messageElement) {

                this.messageElement.textContent =
                    this.message;

            }

        },

        /*
        ==========================================================
        ربط الأحداث
        ==========================================================
        */

        bindEvents() {

            if (this.form) {

                this.form.addEventListener(

                    "submit",

                    async (e) => {

                        e.preventDefault();

                        await this.verify();

                    }

                );

            }

            if (this.verifyButton) {

                this.verifyButton.addEventListener(

                    "click",

                    async () => {

                        await this.verify();

                    }

                );

            }

            if (this.resendButton) {

                this.resendButton.addEventListener(

                    "click",

                    async () => {

                        await this.resend();

                    }

                );

            }

            if (this.otpInput) {

                this.otpInput.addEventListener(

                    "input",

                    () => {

                        this.hideAlert();

                        this.validateOtp();

                    }

                );

                this.otpInput.addEventListener(

                    "keydown",

                    async (e) => {

                        if (e.key === "Enter") {

                            e.preventDefault();

                            await this.verify();

                        }

                    }

                );

            }

        },

        /*
        ==========================================================
        التحقق من الرمز
        ==========================================================
        */

        validateOtp() {

            if (!this.otpInput)
                return false;

            const otp =
                this.otpInput.value.trim();

            if (!otp.length)
                return false;

            if (!/^[0-9]{6}$/.test(otp))
                return false;

            return true;

        },
                /*
        ==========================================================
        التحقق من الرمز
        ==========================================================
        */

        async verify() {

            this.hideAlert();

            if (!this.email) {

                this.showError(
                    "لم يتم العثور على البريد الإلكتروني."
                );

                return;

            }

            if (!this.validateOtp()) {

                this.showError(
                    "يرجى إدخال رمز تحقق صحيح مكون من 6 أرقام."
                );

                this.otpInput.focus();

                return;

            }

            const otp =
                this.otpInput.value.trim();

            this.setLoading(

                this.verifyButton,

                true,

                "جاري التحقق..."

            );

            try {

                console.log("OTP Type:", this.otpType);

                console.log("Email:", this.email);

                const {

                    data,

                    error

                } = await this.supabase.auth.verifyOtp({

                    email: this.email,

                    token: otp,

                    type: this.otpType

                });

                if (error)
                    throw error;

                console.log(
                    "✅ OTP Verified",
                    data
                );

                this.showSuccess(

                    "تم التحقق بنجاح."

                );

                /*
                =============================================
                تنظيف بيانات الجلسة
                =============================================
                */

                sessionStorage.removeItem("otp_type");

                sessionStorage.removeItem("otp_email");

                sessionStorage.removeItem("otp_title");

                sessionStorage.removeItem("otp_message");

                sessionStorage.removeItem("otp_redirect");

                /*
                =============================================
                التحويل
                =============================================
                */

                setTimeout(() => {

                    window.location.replace(

                        this.redirect

                    );

                }, 800);

            }

            catch (error) {

                console.error(

                    "[OTP Verify]",

                    error

                );

                let message =
                    error.message ||
                    "فشل التحقق.";

                switch (true) {

                    case message.includes(
                        "Token has expired"
                    ):

                        message =
                            "انتهت صلاحية رمز التحقق.";

                        break;

                    case message.includes(
                        "Invalid token"
                    ):

                        message =
                            "رمز التحقق غير صحيح.";

                        break;

                    case message.includes(
                        "Email link is invalid"
                    ):

                        message =
                            "رابط التحقق غير صالح.";

                        break;

                    case message.includes(
                        "Email not confirmed"
                    ):

                        message =
                            "لم يتم تأكيد البريد الإلكتروني.";

                        break;

                }

                this.showError(message);

            }

            finally {

                this.setLoading(

                    this.verifyButton,

                    false

                );

            }

        },

                /*
        ==========================================================
        إعادة إرسال رمز التحقق
        ==========================================================
        */

        async resend() {

            this.hideAlert();

            if (!this.email) {

                this.showError(

                    "لم يتم العثور على البريد الإلكتروني."

                );

                return;

            }

            this.setLoading(

                this.resendButton,

                true,

                "جاري إعادة الإرسال..."

            );

            try {

                console.log(

                    "📨 Resend OTP:",

                    this.otpType,

                    this.email

                );

                const {

                    error

                } = await this.supabase.auth.resend({

                    type: this.otpType,

                    email: this.email

                });

                if (error)
                    throw error;

                this.showSuccess(

                    "تم إرسال رمز تحقق جديد."

                );

                /*
                =============================================
                إعادة تشغيل العد التنازلي
                =============================================
                */

                this.countdown = 60;

                this.startCountdown();

            }

            catch (error) {

                console.error(

                    "[OTP Resend]",

                    error

                );

                let message =
                    error.message ||
                    "تعذر إعادة إرسال الرمز.";

                switch (true) {

                    case message.includes(
                        "For security purposes"
                    ):

                        message =
                            "يرجى الانتظار قبل إعادة إرسال الرمز.";

                        break;

                    case message.includes(
                        "Email rate limit exceeded"
                    ):

                        message =
                            "تم تجاوز الحد المسموح لإرسال الرسائل.";

                        break;

                    case message.includes(
                        "Email not found"
                    ):

                        message =
                            "البريد الإلكتروني غير موجود.";

                        break;

                }

                this.showError(message);

            }

            finally {

                this.setLoading(

                    this.resendButton,

                    false

                );

            }

        },

        /*
        ==========================================================
        بدء العد التنازلي
        ==========================================================
        */

        startCountdown() {

            if (this.timer) {

                clearInterval(this.timer);

            }

            if (this.resendButton) {

                this.resendButton.disabled = true;

            }

            const update = () => {

                if (this.countdownLabel) {

                    this.countdownLabel.textContent =
                        this.countdown;

                }

                if (this.countdown <= 0) {

                    clearInterval(this.timer);

                    if (this.resendButton) {

                        this.resendButton.disabled = false;

                    }

                    if (this.countdownLabel) {

                        this.countdownLabel.textContent = "";

                    }

                    return;

                }

                this.countdown--;

            };

            update();

            this.timer = setInterval(

                update,

                1000

            );

        },
                /*
        ==========================================================
        إظهار / إخفاء التحميل
        ==========================================================
        */

        setLoading(button, loading, text = "جاري المعالجة...") {

            if (!button)
                return;

            if (loading) {

                button.disabled = true;

                button.dataset.originalText =
                    button.innerHTML;

                button.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    ${text}
                `;

            }

            else {

                button.disabled = false;

                if (button.dataset.originalText) {

                    button.innerHTML =
                        button.dataset.originalText;

                }

            }

        },

        /*
        ==========================================================
        إخفاء التنبيه
        ==========================================================
        */

        hideAlert() {

            if (!this.alertBox)
                return;

            this.alertBox.style.display = "none";

            this.alertBox.className =
                "alert-box";

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
        إعادة تعيين النموذج
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

            this.otpType = null;

            this.redirect = null;

            this.title = null;

            this.message = null;

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

    /*
    ==========================================================
    تنظيف الموارد عند مغادرة الصفحة
    ==========================================================
    */

    window.addEventListener(

        "beforeunload",

        () => {

            if (

                typeof VerifyOTP.destroy === "function"

            ) {

                VerifyOTP.destroy();

            }

        }

    );

})();
