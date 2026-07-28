/**
 * verify-totp.js – v9 (متوافق مع password_totp: جلسة موجودة، رمز TOTP فقط)
 * - دعم تسجيل OneSignal v16 بعد التحقق الناجح مع إعادة المحاولة
 * - رسائل واضحة للمستخدم
 * - تحسين معالجة الأخطاء
 */
(function() {
    'use strict';

    const OTP_LENGTH = 6;
    const TOTP_SESSION_TIMEOUT = 10 * 60 * 1000;
    let totpTimeout, redirectTimer;

    const inputs = document.querySelectorAll('#totpFieldsContainer .otp-input');
    const verifyBtn = document.getElementById('verifyTotpBtn');
    const errorEl = document.getElementById('totpError');
    const successEl = document.getElementById('totpSuccess');
    const backLink = document.getElementById('backLink');

    // ─── عرض اسم المستخدم ───
    function updateUserDisplay() {
        const name = sessionStorage.getItem('otpName');
        const email = sessionStorage.getItem('otpEmail');
        const displayName = name || (email ? email.split('@')[0] : 'مستخدم');
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (nameEl) nameEl.textContent = displayName;
        if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();
    }

    // ─── عرض البريد الإلكتروني ───
    function showEmail() {
        const email = sessionStorage.getItem('otpEmail');
        const emailEl = document.getElementById('instructionEmailText');
        if (email && emailEl) {
            emailEl.textContent = email;
        } else if (!email) {
            showError('انتهت الجلسة. يرجى العودة لصفحة الدخول.');
            if (verifyBtn) verifyBtn.disabled = true;
        }
    }

    // ─── دوال مساعدة ───
    function getCode() {
        let code = '';
        inputs.forEach(i => code += i.value);
        return code;
    }

    function checkComplete() {
        if (verifyBtn) verifyBtn.disabled = getCode().length !== OTP_LENGTH;
    }

    function showError(msg) {
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'flex';
        }
        if (successEl) successEl.style.display = 'none';
    }

    function showSuccess(msg) {
        if (successEl) {
            successEl.textContent = msg;
            successEl.style.display = 'flex';
        }
        if (errorEl) errorEl.style.display = 'none';
    }

    function clearMessages() {
        if (errorEl) errorEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
    }

    // ─── ربط الأحداث ───
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value && index < OTP_LENGTH - 1) {
                inputs[index + 1]?.focus();
            }
            checkComplete();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1]?.focus();
            }
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
            if (digits.length === OTP_LENGTH) {
                for (let i = 0; i < OTP_LENGTH; i++) {
                    inputs[i].value = digits[i] || '';
                }
                checkComplete();
            }
        });
    });

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
    verifyBtn.addEventListener('click', async () => {
        const code = getCode();
        if (code.length !== OTP_LENGTH) return;

        clearMessages();
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            if (!window.Auth?.completeLoginWithTOTP) {
                throw new Error('خدمة المصادقة غير متاحة');
            }

            const result = await window.Auth.completeLoginWithTOTP(code);
            if (!result?.user) {
                throw new Error('فشل التحقق');
            }

            const user = result.user;

            // تحديث الاسم إن وجد
            if (user.user_metadata?.full_name) {
                sessionStorage.setItem('otpName', user.user_metadata.full_name);
            }

            // إنشاء سجل الجلسة
            await tryCreateSessionRecord(user.id);

            // تسجيل OneSignal مع إعادة محاولة
            showSuccess('جاري تهيئة الإشعارات الفورية...');
            await registerPushWithRetry(user.id, 2);

            // تنظيف الجلسة
            clearTimeout(totpTimeout);
            sessionStorage.removeItem('loginMethod');
            sessionStorage.removeItem('otpEmail');
            // نبقي otpName للوحة التحكم

            showSuccess('تم التحقق بنجاح، جاري تحويلك إلى لوحة التحكم...');

            if (redirectTimer) clearTimeout(redirectTimer);
            redirectTimer = setTimeout(() => {
                window.location.href = '/pages/dashboard/index.html';
            }, 2000);

        } catch (error) {
            console.error('❌ خطأ في TOTP:', error);
            let message = error.message || 'رمز التحقق غير صحيح';
            if (error.message?.includes('SESSION_EXPIRED')) {
                message = 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.';
            } else if (error.message?.includes('Invalid TOTP')) {
                message = 'رمز التحقق غير صحيح. حاول مرة أخرى.';
            }
            showError(message);
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تحقق';
            // مسح الحقول
            inputs.forEach(inp => inp.value = '');
            inputs[0]?.focus();
        }
    });

    // ─── إلغاء TOTP والعودة ───
    if (backLink) {
        backLink.addEventListener('click', async (e) => {
            e.preventDefault();
            if (window.Auth?.cancelTOTPLogin) {
                await window.Auth.cancelTOTPLogin();
            }
            sessionStorage.removeItem('loginMethod');
            sessionStorage.removeItem('otpEmail');
            sessionStorage.removeItem('otpName');
            window.location.href = backLink.href;
        });
    }

    // ─── مهلة انتهاء الجلسة ───
    function startTimeout() {
        totpTimeout = setTimeout(async () => {
            if (window.Auth?.cancelTOTPLogin) {
                await window.Auth.cancelTOTPLogin();
            }
            sessionStorage.removeItem('loginMethod');
            sessionStorage.removeItem('otpEmail');
            sessionStorage.removeItem('otpName');
            window.location.href = '/auth/auth/login/login.html';
        }, TOTP_SESSION_TIMEOUT);
    }

    // ─── تنظيف عند الخروج ───
    window.addEventListener('beforeunload', () => {
        if (totpTimeout) clearTimeout(totpTimeout);
        if (redirectTimer) clearTimeout(redirectTimer);
    });

    // ─── التهيئة ───
    updateUserDisplay();
    showEmail();
    startTimeout();
    // تفعيل زر التحقق إذا كان الرمز مكتملاً
    checkComplete();

})();
