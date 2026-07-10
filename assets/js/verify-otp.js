/**
 * verify-otp.js – v2
 * التحقق من رمز OTP (كلمة المرور لمرة واحدة)
 */
(function() {
    let supabase;

    // عناصر الصفحة
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');

    let countdownInterval;
    const RESEND_TIMEOUT = 60; // ثانية

    // دالة تهيئة
    async function init() {
        // الحصول على عميل Supabase
        supabase = window.teraSupabase || await window.waitForSupabase();

        // التأكد من وجود جلسة مؤقتة (لإعادة إرسال الرمز) أو التعامل مع البريد الإلكتروني
        const email = sessionStorage.getItem('otpEmail');
        if (!email) {
            // إذا لم يتوفر بريد إلكتروني، قد يكون المستخدم دخل بطريقة خاطئة
            // يمكن التوجيه إلى صفحة تسجيل الدخول
            if (!window.location.pathname.includes('reset-password')) {
                // في حالة صفحة verify-otp العادية، يجب أن يكون هناك بريد
                // نعرض رسالة تحذير
                console.warn('البريد الإلكتروني غير متوفر في sessionStorage');
            }
        }

        bindEvents();
        startCountdown();
    }

    function bindEvents() {
        // التنقل التلقائي بين حقول الإدخال
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                // التحقق من اكتمال الرمز
                checkComplete();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });

        if (verifyBtn) {
            verifyBtn.addEventListener('click', handleVerify);
        }

        if (resendBtn) {
            resendBtn.addEventListener('click', handleResend);
        }
    }

    // الحصول على الرمز المدخل
    function getOtpCode() {
        let code = '';
        otpInputs.forEach(input => {
            code += input.value;
        });
        return code;
    }

    // التحقق من اكتمال الرمز (6 أرقام)
    function checkComplete() {
        const code = getOtpCode();
        if (verifyBtn) {
            verifyBtn.disabled = code.length !== otpInputs.length;
        }
    }

    // إظهار الخطأ
    function showError(message) {
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }
        if (successMsg) successMsg.style.display = 'none';
    }

    // إخفاء الخطأ
    function clearMessages() {
        if (errorMsg) errorMsg.style.display = 'none';
        if (successMsg) successMsg.style.display = 'none';
    }

    // معالجة التحقق من الرمز
    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== otpInputs.length) {
            showError('يرجى إدخال رمز التحقق كاملاً');
            return;
        }

        clearMessages();
        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        }

        const email = sessionStorage.getItem('otpEmail');

        try {
            // محاولة التحقق من الرمز باستخدام Supabase
            const { data, error } = await supabase.auth.verifyOtp({
                email: email,
                token: code,
                type: 'email' // يمكن أن يكون 'email' أو 'sms' حسب طريقة الإرسال
            });

            if (error) {
                throw error;
            }

            // التحقق الناجح
            if (data?.session) {
                // مسح البيانات المؤقتة
                sessionStorage.removeItem('otpEmail');

                if (successMsg) {
                    successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...';
                    successMsg.style.display = 'block';
                }

                // التوجيه إلى الصفحة الرئيسية بعد تأخير قصير
                setTimeout(() => {
                    window.location.href = '/pages/dashboard/index.html';
                }, 1500);
            } else {
                // قد يكون هناك حالة بدون جلسة (مثل إعادة تعيين كلمة المرور)
                // نتركها للصفحة التي تستدعي OTP لتحديد السلوك
                if (successMsg) {
                    successMsg.textContent = 'تم التحقق بنجاح';
                    successMsg.style.display = 'block';
                }
                // تشغيل callback مخصص إذا وجدت (لصفحات مثل تغيير البريد أو الجوال)
                if (window.onOtpVerified) {
                    window.onOtpVerified(code);
                }
            }
        } catch (error) {
            console.error('خطأ في التحقق:', error);
            showError(getArabicErrorMessage(error.message));
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'تحقق';
            }
        }
    }

    // إعادة إرسال الرمز
    async function handleResend() {
        const email = sessionStorage.getItem('otpEmail');
        if (!email) {
            showError('لا يمكن إعادة الإرسال، البريد الإلكتروني غير متوفر');
            return;
        }

        clearMessages();
        if (resendBtn) {
            resendBtn.disabled = true;
            resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
        }

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup', // أو يمكن تحديد النوع حسب السياق
                email: email,
            });

            if (error) {
                throw error;
            }

            // نجاح الإرسال
            if (successMsg) {
                successMsg.textContent = 'تم إرسال رمز جديد إلى بريدك الإلكتروني';
                successMsg.style.display = 'block';
            }

            // إعادة بدء العد التنازلي
            resetCountdown();
        } catch (error) {
            console.error('خطأ في إعادة الإرسال:', error);
            showError('فشل إرسال الرمز، حاول مرة أخرى لاحقاً');
        } finally {
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.textContent = 'إعادة إرسال الرمز';
            }
        }
    }

    // مؤقت إعادة الإرسال
    function startCountdown() {
        let seconds = RESEND_TIMEOUT;
        updateTimerDisplay(seconds);
        resendBtn.disabled = true;

        countdownInterval = setInterval(() => {
            seconds--;
            updateTimerDisplay(seconds);

            if (seconds <= 0) {
                clearInterval(countdownInterval);
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'إعادة إرسال الرمز';
                }
                if (timerSpan) timerSpan.textContent = '';
            }
        }, 1000);
    }

    function resetCountdown() {
        clearInterval(countdownInterval);
        startCountdown();
    }

    function updateTimerDisplay(seconds) {
        if (timerSpan) {
            timerSpan.textContent = ` (يمكنك الإعادة بعد ${seconds} ثانية)`;
        }
    }

    // ترجمة رسائل الخطأ الشائعة
    function getArabicErrorMessage(message) {
        const translations = {
            'Token has expired or is invalid': 'انتهت صلاحية الرمز أو أنه غير صحيح',
            'Invalid OTP': 'رمز التحقق غير صحيح',
            'Email not confirmed': 'البريد الإلكتروني غير مفعل',
            'User not found': 'المستخدم غير موجود',
            'For security purposes, you can only request this once every 60 seconds':
                'لأسباب أمنية، يمكنك طلب الرمز مرة واحدة كل 60 ثانية'
        };
        return translations[message] || message || 'حدث خطأ غير معروف';
    }

    // بدء التنفيذ
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
