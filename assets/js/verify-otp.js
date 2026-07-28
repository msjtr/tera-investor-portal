/**
 * verify-otp.js – v59 (محسّن مع دعم كامل لـ OneSignal v16 ومعالجة 409 Conflict)
 * - جلب اسم العميل من البريد الإلكتروني أو بيانات المستخدم
 * - دعم إعادة المحاولة التلقائية لتسجيل OneSignal بعد التحقق
 * - رسائل واضحة للمستخدم
 */
(function() {
    'use strict';

    const OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300; // 5 دقائق
    let countdownInterval, redirectTimer;

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');
    const backLink = document.getElementById('backLink');

    // ─── التهيئة ───
    async function init() {
        updateUserDisplay();
        bindEvents();
        startCountdown();
        updateEmailDisplay();

        // محاولة تسجيل OneSignal إذا كان المستخدم قد سجل بالفعل (حالة نادرة)
        try {
            const user = await window.Auth.getCurrentUser();
            if (user) {
                await window.Auth.registerPushNotifications(user.id);
            }
        } catch (e) {
            console.warn('⚠️ OneSignal registration on load:', e);
        }
    }

    // ─── عرض اسم المستخدم ───
    function updateUserDisplay() {
        const name = sessionStorage.getItem('otpName');
        const email = sessionStorage.getItem('otpEmail');
        const displayName = name || (email ? email.split('@')[0] : 'مستخدم');
        const headerName = document.getElementById('headerUserName');
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerName) headerName.textContent = displayName;
        if (headerAvatar) headerAvatar.textContent = displayName.charAt(0).toUpperCase();
    }

    // ─── ربط الأحداث ───
    function bindEvents() {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value && index < OTP_LENGTH - 1) {
                    otpInputs[index + 1]?.focus();
                }
                checkComplete();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1]?.focus();
                }
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (digits.length === OTP_LENGTH) {
                    for (let i = 0; i < OTP_LENGTH; i++) {
                        otpInputs[i].value = digits[i] || '';
                    }
                    checkComplete();
                }
            });
        });

        if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);
        if (resendBtn) resendBtn.addEventListener('click', handleResend);
        if (backLink) {
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                clearOtpSession();
                window.location.href = '/auth/auth/login/login.html';
            });
        }
    }

    // ─── الحصول على الرمز ───
    function getOtpCode() {
        let code = '';
        otpInputs.forEach(inp => code += inp.value);
        return code;
    }

    function checkComplete() {
        if (verifyBtn) verifyBtn.disabled = getOtpCode().length !== OTP_LENGTH;
    }

    // ─── عرض الأخطاء والرسائل ───
    function showError(msg) {
        if (errorMsg) {
            errorMsg.textContent = msg;
            errorMsg.style.display = 'block';
        }
        if (successMsg) successMsg.style.display = 'none';
    }

    function showSuccess(msg) {
        if (successMsg) {
            successMsg.textContent = msg;
            successMsg.style.display = 'block';
        }
        if (errorMsg) errorMsg.style.display = 'none';
    }

    function clearMessages() {
        if (errorMsg) errorMsg.style.display = 'none';
        if (successMsg) successMsg.style.display = 'none';
    }

    // ─── عرض البريد الإلكتروني ───
    function updateEmailDisplay() {
        const email = sessionStorage.getItem('otpEmail');
        if (email) {
            const el = document.getElementById('instructionEmailText');
            if (el) el.textContent = email;
        }
    }

    // ─── تنظيف جلسة OTP ───
    function clearOtpSession() {
        sessionStorage.removeItem('otpEmail');
        sessionStorage.removeItem('otpName');
        sessionStorage.removeItem('loginMethod');
    }

    // ─── إنشاء سجل الجلسة ───
    async function tryCreateSessionRecord(userId) {
        if (!window.SessionManager) return;
        try {
            const result = await window.SessionManager.createSessionRecord(userId);
            if (result?.success) {
                sessionStorage.setItem('currentSessionId', result.sessionId);
                window.SessionManager.startSessionGuard?.(userId, result.sessionId);
            }
        } catch (e) {
            console.warn('تعذر تسجيل الجلسة:', e);
        }
    }

    // ─── تسجيل OneSignal مع إعادة المحاولة ───
    async function registerPushWithRetry(userId, maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await window.Auth.registerPushNotifications(userId);
                if (result.success) {
                    console.log('✅ OneSignal registered successfully');
                    return true;
                }
                console.warn(`⚠️ OneSignal attempt ${attempt} failed:`, result.error);
                // ننتظر قليلاً قبل إعادة المحاولة
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (e) {
                console.warn(`⚠️ OneSignal attempt ${attempt} error:`, e);
            }
        }
        console.warn('⚠️ OneSignal registration failed after retries, but continuing...');
        return false;
    }

    // ─── معالجة التحقق ───
    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) {
            showError('يرجى إدخال رمز التحقق كاملاً (8 أرقام)');
            return;
        }
        clearMessages();
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const email = sessionStorage.getItem('otpEmail');
            if (!email) {
                throw new Error('انتهت الجلسة. يرجى العودة لصفحة الدخول.');
            }

            console.log('محاولة التحقق من OTP للبريد:', email);
            const data = await window.Auth.verifyOTP(email, code);
            console.log('استجابة verifyOTP:', data);

            if (!data?.session) {
                throw new Error('رمز التحقق غير صحيح أو منتهي الصلاحية');
            }

            const user = data.session.user;
            // تحديث الاسم بالاسم الحقيقي إن وُجد
            if (user.user_metadata?.full_name) {
                sessionStorage.setItem('otpName', user.user_metadata.full_name);
            }

            // إنشاء سجل الجلسة
            await tryCreateSessionRecord(user.id);

            // تسجيل OneSignal (مع إعادة محاولة)
            showSuccess('جاري تهيئة الإشعارات الفورية...');
            await registerPushWithRetry(user.id, 2);

            // تنظيف جلسة OTP
            clearOtpSession();

            // عرض رسالة نجاح والانتقال
            showSuccess('تم التحقق بنجاح، جاري تحويلك إلى لوحة التحكم...');

            // إلغاء أي مؤقت سابق
            if (redirectTimer) clearTimeout(redirectTimer);
            redirectTimer = setTimeout(() => {
                window.location.href = '/pages/dashboard/index.html';
            }, 2000);

        } catch (error) {
            console.error('خطأ في verifyOTP:', error);
            let message = error.message || 'حدث خطأ أثناء التحقق';
            if (error.message?.includes('otp_expired')) {
                message = 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.';
            } else if (error.message?.includes('Invalid OTP') || error.message?.includes('Token has expired')) {
                message = 'الرمز غير صحيح أو منتهي الصلاحية. حاول مرة أخرى أو اطلب رمزاً جديداً.';
            } else if (error.message?.includes('permission denied') || error.code === 'PGRST301') {
                message = 'حدث خطأ في المصادقة. يرجى المحاولة مرة أخرى.';
            }
            showError(message);
            resetBtn();
            otpInputs.forEach(inp => inp.value = '');
            otpInputs[0]?.focus();
        }
    }

    // ─── إعادة إرسال الرمز ───
    async function handleResend() {
        const email = sessionStorage.getItem('otpEmail');
        if (!email) {
            showError('البريد الإلكتروني غير متاح. يرجى العودة إلى صفحة الدخول.');
            return;
        }
        clearMessages();
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            await window.Auth.sendOTP(email);
            showSuccess('تم إرسال رمز جديد إلى بريدك الإلكتروني');
            resetCountdown();
        } catch (e) {
            showError('فشل الإرسال. تأكد من البريد وحاول لاحقاً.');
        } finally {
            resendBtn.disabled = false;
            resendBtn.textContent = 'إعادة إرسال الرمز';
        }
    }

    // ─── العد التنازلي ───
    function startCountdown() {
        clearInterval(countdownInterval);
        let seconds = RESEND_TIMEOUT;
        const update = () => {
            if (timerSpan) {
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                timerSpan.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'إعادة إرسال الرمز';
                }
                if (timerSpan) timerSpan.textContent = '';
                return;
            }
            seconds--;
        };
        update();
        countdownInterval = setInterval(update, 1000);
    }

    function resetCountdown() {
        clearInterval(countdownInterval);
        startCountdown();
    }

    function resetBtn() {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
        }
    }

    // ─── بدء التشغيل ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
