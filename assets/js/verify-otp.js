/**
 * verify-otp.js – v3 (يدعم OTP بطول 8 أرقام)
 * التحقق من رمز OTP – متوافق مع Magic link أو OTP عبر البريد
 */
(function() {
    const OTP_LENGTH = 8; // عدد الأرقام (8 كما هو مطلوب)

    let supabase;

    // العناصر
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');

    let countdownInterval;
    const RESEND_TIMEOUT = 60; // ثانية

    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase?.();

        const email = sessionStorage.getItem('otpEmail');
        if (!email) {
            console.warn('البريد الإلكتروني غير متوفر في sessionStorage');
        }

        bindEvents();
        startCountdown();
    }

    function bindEvents() {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value.replace(/[^0-9]/g, ''); // السماح بالأرقام فقط
                e.target.value = value;

                if (value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                checkComplete();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });

            // لصق الكود كاملاً
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                const digits = paste.replace(/[^0-9]/g, '');
                if (digits.length === OTP_LENGTH) {
                    for (let i = 0; i < OTP_LENGTH; i++) {
                        if (otpInputs[i]) {
                            otpInputs[i].value = digits[i] || '';
                        }
                    }
                    checkComplete();
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

    function getOtpCode() {
        let code = '';
        otpInputs.forEach(input => {
            code += input.value;
        });
        return code;
    }

    function checkComplete() {
        const code = getOtpCode();
        if (verifyBtn) {
            verifyBtn.disabled = code.length !== OTP_LENGTH;
        }
    }

    function showError(message) {
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }
        if (successMsg) successMsg.style.display = 'none';
    }

    function clearMessages() {
        if (errorMsg) errorMsg.style.display = 'none';
        if (successMsg) successMsg.style.display = 'none';
    }

    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) {
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
            const sb = supabase || (window.teraSupabase || await window.waitForSupabase?.());
            if (!sb) throw new Error('خدمة المصادقة غير متوفرة');

            // محاولة التحقق من الرمز (يدعم email OTP و magic link)
            const { data, error } = await sb.auth.verifyOtp({
                email: email,
                token: code,
                type: 'email' // يمكن أن يكون 'email' أو 'sms'
            });

            if (error) throw error;

            // التحقق الناجح
            if (data?.session) {
                sessionStorage.removeItem('otpEmail');
                if (successMsg) {
                    successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...';
                    successMsg.style.display = 'block';
                }
                setTimeout(() => {
                    window.location.href = '/pages/dashboard/index.html';
                }, 1500);
            } else {
                // في حالة Magic link أو إعادة تعيين كلمة مرور
                if (successMsg) {
                    successMsg.textContent = 'تم التحقق بنجاح';
                    successMsg.style.display = 'block';
                }
                if (window.onOtpVerified) {
                    window.onOtpVerified(code);
                } else {
                    // السلوك الافتراضي: التوجيه للوحة التحكم
                    setTimeout(() => {
                        window.location.href = '/pages/dashboard/index.html';
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('خطأ في التحقق:', error);
            showError(getArabicErrorMessage(error.message));
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
            }
        }
    }

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
            const sb = supabase || (window.teraSupabase || await window.waitForSupabase?.());
            if (!sb) throw new Error('خدمة المصادقة غير متوفرة');

            const { error } = await sb.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: false // لا ينشئ مستخدم جديد، فقط إعادة إرسال
                }
            });

            if (error) throw error;

            if (successMsg) {
                successMsg.textContent = 'تم إرسال رمز جديد إلى بريدك الإلكتروني';
                successMsg.style.display = 'block';
            }

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

    function startCountdown() {
        let seconds = RESEND_TIMEOUT;
        updateTimerDisplay(seconds);
        if (resendBtn) resendBtn.disabled = true;

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
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            timerSpan.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }

    function getArabicErrorMessage(message) {
        const translations = {
            'Token has expired or is invalid': 'انتهت صلاحية الرمز أو أنه غير صحيح',
            'Invalid OTP': 'رمز التحقق غير صحيح',
            'Email not confirmed': 'البريد الإلكتروني غير مفعل',
            'User not found': 'المستخدم غير موجود'
        };
        return translations[message] || message || 'حدث خطأ غير معروف';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
