/**
 * verify-otp.js – v45 (دعم كامل للدخول العادي، TOTP فقط، وكلمة مرور + TOTP)
 * متوافق مع auth.js v20 + session-manager v12
 *
 * المتطلبات من sessionStorage:
 *   - otpEmail: البريد الإلكتروني للمستخدم
 *   - loginMethod: 'password_otp' | 'totp' | 'password_totp'
 *   - otpPassword: كلمة المرور (فقط لحالة password_totp – تُمسح بعد الاستخدام)
 */
(function() {
    // سيتم ضبط الطول ديناميكياً: 8 لـ OTP البريد، 6 لـ TOTP
    let OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300;

    let supabase;
    let countdownInterval;
    let redirectTimer = null;
    let currentLoginMethod = 'password_otp'; // افتراضي

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');

    // ─── بدء التهيئة ──────────────────────────────────
    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase?.();

        // تحديد طريقة الدخول
        currentLoginMethod = sessionStorage.getItem('loginMethod') || 'password_otp';

        // ضبط واجهة المستخدم حسب الطريقة
        configureUIForLoginMethod();

        updateUserDisplayFromSession();
        bindEvents();
        if (currentLoginMethod === 'password_otp') {
            startCountdown();
        } else {
            // إخفاء المؤقت وزر الإعادة لـ TOTP
            if (timerSpan) timerSpan.style.display = 'none';
            if (resendBtn) resendBtn.style.display = 'none';
        }
        updateEmailDisplay();
        setupBackLink();
    }

    function configureUIForLoginMethod() {
        const titleEl = document.querySelector('.page-subheader h1');
        const instructionEl = document.getElementById('instructionText');

        if (currentLoginMethod === 'totp' || currentLoginMethod === 'password_totp') {
            OTP_LENGTH = 6; // رموز TOTP مكونة من 6 أرقام

            // تغيير النصوص
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-shield-alt"></i> التحقق من المصادقة الثنائية';
            if (instructionEl) instructionEl.textContent = 'أدخل رمز التحقق المكون من 6 أرقام من تطبيق المصادقة على هاتفك.';

            // ضبط حقول الإدخال لـ 6 خانات
            otpInputs.forEach((input, index) => {
                if (index >= 6) {
                    input.style.display = 'none'; // إخفاء الخانات الزائدة
                }
            });
        }
    }

    // ─── اسم المستخدم ─────────────────────────────────
    function updateUserDisplayFromSession() {
        const name = sessionStorage.getItem('otpName');
        if (name) {
            const nameEl = document.getElementById('headerUserName');
            const avatarEl = document.getElementById('headerAvatar');
            if (nameEl) nameEl.textContent = name;
            if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
        }
    }

    // ─── الأحداث ──────────────────────────────────────
    function bindEvents() {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = value;
                if (value && index < OTP_LENGTH - 1) {
                    // الانتقال إلى الحقل التالي (حسب العدد المعدل)
                    const nextInput = otpInputs[index + 1];
                    if (nextInput && nextInput.style.display !== 'none') nextInput.focus();
                }
                checkComplete();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    const prevInput = otpInputs[index - 1];
                    if (prevInput && prevInput.style.display !== 'none') prevInput.focus();
                }
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (digits.length === OTP_LENGTH) {
                    for (let i = 0; i < OTP_LENGTH; i++) {
                        if (otpInputs[i] && otpInputs[i].style.display !== 'none') {
                            otpInputs[i].value = digits[i] || '';
                        }
                    }
                    // التركيز على آخر حقل مرئي
                    const lastVisible = Array.from(otpInputs).filter(inp => inp.style.display !== 'none').pop();
                    if (lastVisible) lastVisible.focus();
                    checkComplete();
                }
            });
        });

        if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);
        if (resendBtn) resendBtn.addEventListener('click', handleResend);
    }

    function getOtpCode() {
        let code = '';
        otpInputs.forEach((input, index) => {
            if (index < OTP_LENGTH && input.style.display !== 'none') {
                code += input.value;
            }
        });
        return code;
    }
    function checkComplete() {
        if (verifyBtn) verifyBtn.disabled = getOtpCode().length !== OTP_LENGTH;
    }

    function showError(msg) {
        if (errorMsg) { errorMsg.textContent = msg; errorMsg.style.display = 'block'; }
        if (successMsg) successMsg.style.display = 'none';
    }
    function clearMessages() {
        if (errorMsg) errorMsg.style.display = 'none';
        if (successMsg) successMsg.style.display = 'none';
    }

    function updateEmailDisplay() {
        const email = sessionStorage.getItem('otpEmail');
        if (email) {
            const el = document.getElementById('instructionEmailText');
            if (el) el.textContent = email;
        }
    }

    function setupBackLink() {
        const backLink = document.getElementById('backLink');
        if (backLink) backLink.href = document.referrer || '/auth/auth/login/login.html';
    }

    // ─── تسجيل الجلسة ─────────────────────────────────
    async function createSessionRecord(userId) {
        console.log('📦 [verify-otp] محاولة تسجيل الجلسة...');
        if (!window.SessionManager) {
            console.error('❌ SessionManager غير محمل.');
            return null;
        }

        let fullLocation = null;
        try {
            if (window.LocationServices?.getGPSCoords && window.LocationServices?.fetchLocationIQFull) {
                const gpsMeta = await window.LocationServices.getGPSCoords();
                const lat = gpsMeta.coords?.latitude;
                const lon = gpsMeta.coords?.longitude;
                if (lat && lon) {
                    fullLocation = await window.LocationServices.fetchLocationIQFull(lat, lon, gpsMeta, 'auto_login');
                }
            }
        } catch (e) {
            console.warn('⚠️ تعذر جمع بيانات الموقع، استمرار بدونها.');
        }

        const extraData = { locationIQ: fullLocation || {} };
        try {
            const result = await window.SessionManager.createSessionRecord(userId, extraData);
            if (result && result.success) {
                console.log('✅ [verify-otp] تم تسجيل الجلسة – المعرف: ' + result.sessionId);
                sessionStorage.setItem('currentSessionId', result.sessionId);
                if (window.SessionManager.startSessionGuard) {
                    window.SessionManager.startSessionGuard(userId, result.sessionId);
                }
                return result.sessionId;
            } else {
                console.error('❌ [verify-otp] createSessionRecord فشل');
                return null;
            }
        } catch (e) {
            console.error('❌ [verify-otp] استثناء:', e);
            return null;
        }
    }

    // ─── التحقق من الرمز (OTP أو TOTP حسب الطريقة) ─────
    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) {
            showError(`يرجى إدخال رمز التحقق كاملاً (${OTP_LENGTH} أرقام)`);
            return;
        }
        clearMessages();

        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        }

        const email = sessionStorage.getItem('otpEmail');
        if (!email) {
            showError('انتهت الجلسة. يرجى العودة لصفحة الدخول.');
            resetVerifyButton();
            return;
        }

        if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }

        let sessionRecorded = false;
        let userId = null;

        try {
            // ════ طريقة الدخول: TOTP فقط ════
            if (currentLoginMethod === 'totp') {
                if (!window.Auth?.loginWithTOTP) throw new Error('خدمة المصادقة غير متوفرة');
                const result = await window.Auth.loginWithTOTP(email, code);
                if (result?.success) {
                    // استرجع المستخدم من الجلسة الجديدة
                    const user = await window.Auth.getUser();
                    userId = user?.id;
                }
            }
            // ════ طريقة الدخول: كلمة مرور + TOTP ════
            else if (currentLoginMethod === 'password_totp') {
                const password = sessionStorage.getItem('otpPassword');
                if (!password) throw new Error('كلمة المرور غير متوفرة. يرجى العودة لصفحة الدخول.');
                // تنظيف كلمة المرور فورًا من التخزين
                sessionStorage.removeItem('otpPassword');

                if (!window.Auth?.loginWithPassword) throw new Error('خدمة المصادقة غير متوفرة');
                const result = await window.Auth.loginWithPassword(email, password, code);
                if (result?.user) {
                    userId = result.user.id;
                } else if (result?.success) {
                    const user = await window.Auth.getUser();
                    userId = user?.id;
                }
            }
            // ════ طريقة الدخول: كلمة مرور + OTP (البريد) ════
            else {
                if (!window.Auth?.verifyOTP) throw new Error('خدمة المصادقة غير متوفرة');
                const data = await window.Auth.verifyOTP(email, code);
                if (data?.session) {
                    userId = data.session.user.id;
                }
            }

            // ─── تسجيل الجلسة ───
            if (userId) {
                const sessionId = await createSessionRecord(userId);
                if (sessionId) {
                    sessionStorage.removeItem('otpEmail');
                    sessionStorage.removeItem('loginMethod');
                    if (successMsg) {
                        successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...';
                        successMsg.style.display = 'block';
                    }
                    if (window.UIHelpers?.showToast) {
                        window.UIHelpers.showToast('مرحباً بعودتك!', 'success', 3000);
                    }
                    sessionRecorded = true;
                } else {
                    showError('فشل تسجيل الجلسة. يرجى التواصل مع الدعم.');
                }
            } else {
                // في حالات verifyOTP التي قد لا تعيد جلسة (مثل إعادة تعيين كلمة المرور)
                if (successMsg) {
                    successMsg.textContent = 'تم التحقق بنجاح';
                    successMsg.style.display = 'block';
                }
                if (window.onOtpVerified) window.onOtpVerified(code);
            }
        } catch (error) {
            console.error(error);
            if (error.message === 'TOTP_REQUIRED') {
                // حدث خطأ نادر: طلب TOTP مرة أخرى
                showError('الرجاء إدخال رمز المصادقة الثنائية من تطبيقك.');
            } else {
                showError(getArabicErrorMessage(error.message));
            }
        } finally {
            if (sessionRecorded) {
                redirectTimer = setTimeout(() => {
                    window.location.href = '/pages/dashboard/index.html';
                }, 3000);
            } else {
                resetVerifyButton();
            }
        }
    }

    function resetVerifyButton() {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
        }
    }

    // ─── إعادة إرسال الرمز (فقط لـ OTP البريد) ────────
    async function handleResend() {
        if (currentLoginMethod !== 'password_otp') return; // لا إعادة إرسال لـ TOTP

        const email = sessionStorage.getItem('otpEmail');
        if (!email) {
            showError('البريد الإلكتروني غير متوفر. يرجى العودة لصفحة الدخول.');
            return;
        }

        clearMessages();
        if (resendBtn) {
            resendBtn.disabled = true;
            resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
        }

        try {
            if (!window.Auth?.sendOTP) throw new Error('الخدمة غير متوفرة');
            await window.Auth.sendOTP(email);
            if (successMsg) {
                successMsg.textContent = 'تم إرسال رمز جديد إلى بريدك الإلكتروني';
                successMsg.style.display = 'block';
            }
            resetCountdown();
        } catch (e) {
            showError('فشل إعادة الإرسال. حاول مرة أخرى لاحقاً.');
        } finally {
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.textContent = 'إعادة إرسال الرمز';
            }
        }
    }

    // ─── مؤقت إعادة الإرسال ────────────────────────────
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
            const m = Math.floor(seconds / 60), s = seconds % 60;
            timerSpan.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }

    function getArabicErrorMessage(msg) {
        const map = {
            'Token has expired or is invalid': 'انتهت صلاحية الرمز أو أنه غير صحيح',
            'Invalid OTP': 'رمز التحقق غير صحيح',
            'Invalid TOTP': 'رمز التحقق غير صحيح',
            'Email not confirmed': 'البريد الإلكتروني غير مفعل',
            'User not found': 'المستخدم غير موجود',
            'TOTP_REQUIRED': 'مطلوب رمز المصادقة الثنائية',
        };
        return map[msg] || msg || 'حدث خطأ غير معروف';
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
