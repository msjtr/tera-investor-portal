/**
 * ==========================================================
 * verify-otp.js
 * OTP Center Enterprise
 * يدعم:
 * signup
 * recovery
 * personal_info
 * contact_info
 * national_address
 * bank_info
 * attachments
 * change_mobile
 * ==========================================================
 */

(function () {

    'use strict';

    document.addEventListener('DOMContentLoaded', async function () {

        const form = document.getElementById('otpForm');

        const otpInput = document.getElementById('otp');

        const submitBtn = document.getElementById('submitBtn');

        const resendBtn = document.getElementById('resendCode');

        const timerDisplay = document.getElementById('timerDisplay');

        const timerContainer = document.getElementById('timerContainer');

        const otpError = document.getElementById('otp-error');

        const alertBox = document.getElementById('formAlert');

        const alertIcon = document.getElementById('alertIcon');

        const alertMessage = document.getElementById('alertMessage');

        const instructionMainText =
            document.getElementById('instructionMainText');

        const instructionEmailText =
            document.getElementById('instructionEmailText');

        const loaderOverlay =
            document.getElementById('creativeLoaderScreen');

        const backLink =
            document.getElementById('backLink');

        const backLinkText =
            document.getElementById('backLinkText');

        if (!form)
            return;

        /*
        =====================================================
        انتظار جاهزية Supabase
        =====================================================
        */

        let supabase;

        try {

            supabase = await waitForSupabase();

        }

        catch (error) {

            showAlert(

                'تعذر الاتصال بخدمة المصادقة.',

                'error'

            );

            submitBtn.disabled = true;

            return;

        }

        /*
        =====================================================
        قراءة بيانات OTP
        =====================================================
        */

        const verifyType =

            sessionStorage.getItem('otp_type') ||

            localStorage.getItem('tera_verify_type') ||

            'signup';

        const email =

            sessionStorage.getItem('otp_email') ||

            localStorage.getItem('pendingVerificationEmail');

        const redirect =

            sessionStorage.getItem('otp_redirect') ||

            '/pages/dashboard/index.html';

        console.log({

            verifyType,

            email,

            redirect

        });

        if (!email) {

            showAlert(

                'تعذر العثور على البريد الإلكتروني.',

                'error'

            );

            submitBtn.disabled = true;

            return;

        }

        if (instructionEmailText) {

            instructionEmailText.textContent = email;

        }

                                      /*
        =====================================================
        تعريف نوع العملية الحالية
        =====================================================
        */

        const verifyConfig = {

            signup: {

                title: "تأكيد إنشاء الحساب",

                resendType: "signup",

                verifyType: "signup"

            },

            recovery: {

                title: "إعادة تعيين كلمة المرور",

                resendType: "recovery",

                verifyType: "recovery"

            },

            email: {

                title: "تأكيد البريد الإلكتروني",

                resendType: "email",

                verifyType: "email"

            },

            email_change: {

                title: "تغيير البريد الإلكتروني",

                resendType: "email_change",

                verifyType: "email_change"

            },

            change_mobile: {

                title: "تأكيد رقم الجوال",

                resendType: "sms",

                verifyType: "sms"

            },

            personal_info: {

                title: "التحقق من المعلومات الشخصية",

                resendType: "signup",

                verifyType: "signup"

            },

            contact_info: {

                title: "التحقق من معلومات التواصل",

                resendType: "signup",

                verifyType: "signup"

            },

            national_address: {

                title: "التحقق من العنوان الوطني",

                resendType: "signup",

                verifyType: "signup"

            },

            bank_info: {

                title: "التحقق من الحساب البنكي",

                resendType: "signup",

                verifyType: "signup"

            },

            attachments: {

                title: "التحقق من المرفقات",

                resendType: "signup",

                verifyType: "signup"

            }

        };

        const currentConfig =

            verifyConfig[verifyType] ||

            verifyConfig.signup;

        if (instructionMainText) {

            instructionMainText.textContent =

                currentConfig.title;

        }

        /*
        =====================================================
        مؤقت إعادة الإرسال
        =====================================================
        */

        let timerSeconds = 300;

        let timerInterval = null;

        function updateTimerDisplay() {

            const minutes =

                Math.floor(timerSeconds / 60);

            const seconds =

                timerSeconds % 60;

            timerDisplay.textContent =

                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        }

        function startTimer() {

            if (timerInterval) {

                clearInterval(timerInterval);

            }

            resendBtn.disabled = true;

            timerContainer.style.display = "block";

            timerSeconds = 300;

            updateTimerDisplay();

            timerInterval = setInterval(() => {

                timerSeconds--;

                updateTimerDisplay();

                if (timerSeconds <= 0) {

                    clearInterval(timerInterval);

                    timerInterval = null;

                    resendBtn.disabled = false;

                    timerContainer.style.display = "none";

                }

            }, 1000);

        }

                                      /*
        =====================================================
        رسائل التنبيه
        =====================================================
        */

        function showAlert(message, type = "error") {

            if (!alertBox) {

                alert(message);

                return;

            }

            alertBox.style.display = "flex";

            alertBox.className =
                `alert-box alert-${type}`;

            if (alertIcon) {

                switch (type) {

                    case "success":

                        alertIcon.innerHTML =
                            '<i class="fas fa-circle-check"></i>';

                        break;

                    case "warning":

                        alertIcon.innerHTML =
                            '<i class="fas fa-triangle-exclamation"></i>';

                        break;

                    default:

                        alertIcon.innerHTML =
                            '<i class="fas fa-circle-exclamation"></i>';

                        break;

                }

            }

            if (alertMessage) {

                alertMessage.textContent =
                    message;

            }

        }

        function hideAlert() {

            if (!alertBox)
                return;

            alertBox.style.display = "none";

        }

        /*
        =====================================================
        اللودر
        =====================================================
        */

        function showLoader(text = "جاري التحقق...") {

            if (!loaderOverlay)
                return;

            loaderOverlay.style.display = "flex";

            const quote =

                loaderOverlay.querySelector(

                    "#creativeQuoteText"

                );

            if (quote) {

                quote.textContent = text;

            }

        }

        function hideLoader() {

            if (!loaderOverlay)
                return;

            loaderOverlay.style.display = "none";

        }

        /*
        =====================================================
        التحقق من رمز OTP
        =====================================================
        */

        function validateOtp() {

            otpError.textContent = "";

            const otp =

                otpInput.value.trim();

            if (!otp) {

                otpError.textContent =
                    "يرجى إدخال رمز التحقق.";

                otpInput.focus();

                return false;

            }

            /*
            الملف الحالي يعتمد على 8 أرقام
            */

            if (!/^[0-9]{8}$/.test(otp)) {

                otpError.textContent =
                    "يجب أن يتكون الرمز من 8 أرقام.";

                otpInput.focus();

                return false;

            }

            return true;

        }

        /*
        =====================================================
        تنظيف الأخطاء أثناء الكتابة
        =====================================================
        */

        otpInput.addEventListener(

            "input",

            function () {

                otpError.textContent = "";

                hideAlert();

            }

        );


                                      /*
        =====================================================
        التحقق من رمز OTP
        =====================================================
        */

        async function verifyOtp() {

            hideAlert();

            if (!validateOtp())
                return;

            const otp =
                otpInput.value.trim();

            submitBtn.disabled = true;

            showLoader(
                "جاري التحقق من رمز التأكيد..."
            );

            try {

                let result;

                /*
                =============================================
                تغيير رقم الجوال
                =============================================
                */

                if (verifyType === "change_mobile") {

                    const mobile =

                        localStorage.getItem(
                            "pendingNewMobile"
                        );

                    if (!mobile) {

                        throw new Error(
                            "رقم الجوال غير موجود."
                        );

                    }

                    result =
                        await supabase.auth.verifyOtp({

                            phone: mobile,

                            token: otp,

                            type: currentConfig.verifyType

                        });

                }

                /*
                =============================================
                جميع عمليات البريد الإلكتروني
                =============================================
                */

                else {

                    result =
                        await supabase.auth.verifyOtp({

                            email: email,

                            token: otp,

                            type: currentConfig.verifyType

                        });

                }

                if (result.error)
                    throw result.error;

                console.log(
                    "✅ OTP Verified",
                    result.data
                );

                showAlert(

                    "تم التحقق بنجاح.",

                    "success"

                );

                /*
                =============================================
                تنظيف البيانات المؤقتة
                =============================================
                */

                sessionStorage.removeItem(
                    "otp_type"
                );

                sessionStorage.removeItem(
                    "otp_email"
                );

                sessionStorage.removeItem(
                    "otp_redirect"
                );

                sessionStorage.removeItem(
                    "otp_title"
                );

                sessionStorage.removeItem(
                    "otp_message"
                );

                localStorage.removeItem(
                    "tera_verify_type"
                );

                localStorage.removeItem(
                    "pendingVerificationEmail"
                );

                /*
                =============================================
                تحديث verification_requests
                =============================================
                */

                try {

                    const {

                        data: { user }

                    } = await supabase.auth.getUser();

                    if (user) {

                        const payload = {

                            user_id: user.id,

                            updated_at:
                                new Date().toISOString()

                        };

                        switch (verifyType) {

                            case "signup":

                                payload.email_verified = true;
                                break;

                            case "personal_info":

                                payload.personal_info_completed = true;
                                break;

                            case "contact_info":

                                payload.contact_info_completed = true;
                                break;

                            case "national_address":

                                payload.national_address_completed = true;
                                break;

                            case "bank_info":

                                payload.bank_info_completed = true;
                                break;

                            case "attachments":

                                payload.attachments_completed = true;
                                break;

                        }

                        await supabase

                            .from(
                                "verification_requests"
                            )

                            .upsert(
                                payload,
                                {
                                    onConflict:
                                        "user_id"
                                }
                            );

                    }

                }

                catch (dbError) {

                    console.warn(
                        "Verification Update:",
                        dbError
                    );

                }

                /*
                =============================================
                التحويل
                =============================================
                */

                setTimeout(() => {

                    window.location.replace(
                        redirect
                    );

                }, 1200);

            }

            catch (error) {

                console.error(error);

                let message =
                    error.message ||
                    "تعذر التحقق.";

                switch (true) {

                    case message.includes(
                        "expired"
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
                        "Token has expired"
                    ):

                        message =
                            "انتهت صلاحية الرمز.";

                        break;

                }

                showAlert(
                    message,
                    "error"
                );

            }

            finally {

                hideLoader();

                submitBtn.disabled = false;

            }

        }

                                      /*
        =====================================================
        إعادة إرسال رمز التحقق
        =====================================================
        */

        async function resendOtp() {

            hideAlert();

            if (timerInterval) {

                showAlert(

                    "يرجى الانتظار حتى انتهاء المؤقت.",

                    "warning"

                );

                return;

            }

            resendBtn.disabled = true;

            resendBtn.innerHTML =

                '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

            try {

                let response;

                /*
                ===========================================
                تغيير رقم الجوال
                ===========================================
                */

                if (verifyType === "change_mobile") {

                    const mobile =

                        localStorage.getItem(

                            "pendingNewMobile"

                        );

                    if (!mobile) {

                        throw new Error(

                            "رقم الجوال غير موجود."

                        );

                    }

                    response =

                        await supabase.auth.signInWithOtp({

                            phone: mobile,

                            options: {

                                shouldCreateUser: false

                            }

                        });

                }

                /*
                ===========================================
                جميع عمليات البريد
                ===========================================
                */

                else {

                    response =

                        await supabase.auth.resend({

                            type:

                                currentConfig.resendType,

                            email: email

                        });

                }

                if (response.error)

                    throw response.error;

                showAlert(

                    "تم إرسال رمز تحقق جديد.",

                    "success"

                );

                startTimer();

            }

            catch (error) {

                console.error(error);

                let message =

                    error.message ||

                    "تعذر إعادة إرسال الرمز.";

                switch (true) {

                    case message.includes(

                        "For security purposes"

                    ):

                        message =

                            "يرجى الانتظار قبل إعادة الإرسال.";

                        break;

                    case message.includes(

                        "rate limit"

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

                    case message.includes(

                        "Phone"

                    ):

                        message =

                            "تعذر إرسال الرمز إلى رقم الجوال.";

                        break;

                }

                showAlert(

                    message,

                    "error"

                );

            }

            finally {

                resendBtn.disabled = false;

                resendBtn.innerHTML =

                    '<i class="fas fa-redo-alt"></i> إعادة إرسال الرمز';

            }

        };

        /*
        =====================================================
        ربط الأحداث
        =====================================================
        */

        form.addEventListener(

            "submit",

            async function (e) {

                e.preventDefault();

                await verifyOtp();

            }

        );

        submitBtn.addEventListener(

            "click",

            async function () {

                await verifyOtp();

            }

        );

        resendBtn.addEventListener(

            "click",

            async function () {

                await resendOtp();

            }

        );

        otpInput.addEventListener(

            "keydown",

            async function (e) {

                if (e.key === "Enter") {

                    e.preventDefault();

                    await verifyOtp();

                }

            }

        );

        /*
        =====================================================
        بدء المؤقت
        =====================================================
        */

        startTimer();

                                      /*
        =====================================================
        تحديث تقدم طلب التحقق
        =====================================================
        */

        async function updateVerificationProgress() {

            try {

                const {

                    data: { user }

                } = await supabase.auth.getUser();

                if (!user)
                    return;

                const {

                    data: request,

                    error

                } = await supabase

                    .from("verification_requests")

                    .select("*")

                    .eq("user_id", user.id)

                    .maybeSingle();

                if (error)
                    throw error;

                if (!request)
                    return;

                /*
                ==========================================
                حساب نسبة الإنجاز
                ==========================================
                */

                let progress = 0;

                if (request.email_verified)
                    progress += 15;

                if (request.personal_info_completed)
                    progress += 15;

                if (request.contact_info_completed)
                    progress += 15;

                if (request.national_address_completed)
                    progress += 15;

                if (request.bank_info_completed)
                    progress += 15;

                if (request.attachments_completed)
                    progress += 15;

                if (request.agreed)
                    progress += 10;

                progress = Math.min(progress, 100);

                /*
                ==========================================
                تحديث قاعدة البيانات
                ==========================================
                */

                await supabase

                    .from("verification_requests")

                    .update({

                        progress,

                        updated_at:

                            new Date().toISOString()

                    })

                    .eq("user_id", user.id);

                /*
                ==========================================
                اكتمال جميع المراحل
                ==========================================
                */

                const completed =

                    request.email_verified &&

                    request.personal_info_completed &&

                    request.contact_info_completed &&

                    request.national_address_completed &&

                    request.bank_info_completed &&

                    request.attachments_completed &&

                    request.agreed;

                if (completed) {

                    await supabase

                        .from("verification_requests")

                        .update({

                            submitted: true,

                            submitted_at:

                                new Date().toISOString(),

                            progress: 100

                        })

                        .eq("user_id", user.id);

                    console.log(

                        "✅ تم إكمال جميع مراحل الطلب"

                    );

                }

            }

            catch (error) {

                console.warn(

                    "Progress:",

                    error

                );

            }

        }

        /*
        =====================================================
        تحديث اسم العميل
        =====================================================
        */

        async function refreshUserName() {

            try {

                const {

                    data: { user }

                } = await supabase.auth.getUser();

                if (!user)
                    return;

                const customerName =

                    user.user_metadata?.full_name ||

                    user.user_metadata?.name ||

                    user.email ||

                    "المستثمر";

                const elements =

                    document.querySelectorAll(

                        ".customer-name"

                    );

                elements.forEach(el => {

                    el.textContent =
                        customerName;

                });

            }

            catch (error) {

                console.warn(error);

            }

        }

        /*
        =====================================================
        تهيئة الصفحة
        =====================================================
        */

        refreshUserName();

        updateVerificationProgress();

                                      /*
        =====================================================
        العودة للصفحة السابقة
        =====================================================
        */

        if (backLink) {

            backLink.addEventListener(

                "click",

                function (e) {

                    e.preventDefault();

                    window.history.back();

                }

            );

        }

        /*
        =====================================================
        تحديد نص رابط العودة
        =====================================================
        */

        if (backLinkText) {

            switch (verifyType) {

                case "signup":

                    backLinkText.textContent =
                        "العودة إلى التسجيل";

                    break;

                case "recovery":

                    backLinkText.textContent =
                        "العودة إلى استعادة كلمة المرور";

                    break;

                case "change_mobile":

                    backLinkText.textContent =
                        "العودة إلى تغيير رقم الجوال";

                    break;

                case "email_change":

                    backLinkText.textContent =
                        "العودة إلى تغيير البريد الإلكتروني";

                    break;

                default:

                    backLinkText.textContent =
                        "العودة";

            }

        }

        /*
        =====================================================
        اختصارات لوحة المفاتيح
        =====================================================
        */

        document.addEventListener(

            "keydown",

            async function (e) {

                if (

                    e.key === "Enter" &&

                    document.activeElement === otpInput

                ) {

                    e.preventDefault();

                    await verifyOtp();

                }

            }

        );

        /*
        =====================================================
        تنظيف البيانات المؤقتة
        =====================================================
        */

        function clearTempData() {

            const keys = [

                "otp_type",

                "otp_email",

                "otp_redirect",

                "otp_title",

                "otp_message"

            ];

            keys.forEach(key =>

                sessionStorage.removeItem(key)

            );

        }

        /*
        =====================================================
        تنظيف الموارد
        =====================================================
        */

        window.addEventListener(

            "beforeunload",

            function () {

                if (timerInterval) {

                    clearInterval(

                        timerInterval

                    );

                }

            }

        );

        /*
        =====================================================
        التحقق من وجود OTP سابق
        =====================================================
        */

        otpInput.focus();

        hideAlert();

        console.log(

            "✅ OTP Center Ready"

        );

                                      /*
        =====================================================
        إخفاء رسالة الخطأ عند الكتابة
        =====================================================
        */

        otpInput.addEventListener(

            "input",

            function () {

                if (otpError) {

                    otpError.textContent = "";

                }

                hideAlert();

            }

        );

        /*
        =====================================================
        تحديث التعليمات حسب نوع العملية
        =====================================================
        */

        switch (verifyType) {

            case "signup":

                document.title =
                    "تأكيد إنشاء الحساب";

                break;

            case "recovery":

                document.title =
                    "إعادة تعيين كلمة المرور";

                break;

            case "email_change":

                document.title =
                    "تأكيد البريد الإلكتروني";

                break;

            case "change_mobile":

                document.title =
                    "تأكيد رقم الجوال";

                break;

            default:

                document.title =
                    "التحقق من الرمز";

        }

        /*
        =====================================================
        Debug
        =====================================================
        */

        console.group(

            "OTP Center"

        );

        console.log(

            "Type:",

            verifyType

        );

        console.log(

            "Email:",

            email

        );

        console.log(

            "Redirect:",

            redirect

        );

        console.groupEnd();

    });

})();
