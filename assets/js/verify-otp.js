/**
 * verify-otp.js – v40 (متوافق مع session-manager v4 + تجميع كافة البيانات)
 * - يجمع بيانات الموقع عبر LocationServices وينقلها كاملة
 * - يخزن sessionId ويبدأ حماية الجلسة
 */
(function() {
    const OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300; // 5 دقائق

    let supabase;
    let countdownInterval;
    let redirectTimer = null;

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');

    // ─── بدء التهيئة ───
    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        updateUserDisplayFromSession();
        bindEvents();
        startCountdown();
        updateEmailDisplay();
        setupBackLink();
    }

    // ─── اسم المستخدم ───
    function updateUserDisplayFromSession() {
        const name = sessionStorage.getItem('otpName');
        if (name) {
            const nameEl = document.getElementById('headerUserName');
            const avatarEl = document.getElementById('headerAvatar');
            if (nameEl) nameEl.textContent = name;
            if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
        }
    }

    // ─── الأحداث ───
    function bindEvents() {
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = value;
                if (value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
                checkComplete();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) otpInputs[index - 1].focus();
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (digits.length === OTP_LENGTH) {
                    for (let i = 0; i < OTP_LENGTH; i++) if (otpInputs[i]) otpInputs[i].value = digits[i] || '';
                    otpInputs[OTP_LENGTH - 1].focus();
                    checkComplete();
                }
            });
        });

        if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);
        if (resendBtn) resendBtn.addEventListener('click', handleResend);
    }

    function getOtpCode() { let code = ''; otpInputs.forEach(i => code += i.value); return code; }
    function checkComplete() { if (verifyBtn) verifyBtn.disabled = getOtpCode().length !== OTP_LENGTH; }

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

    // ─── تسجيل الجلسة (مع تجميع كافة البيانات) ───
    async function createSessionRecord(userId) {
        console.log('📦 [verify-otp] محاولة تسجيل الجلسة...');

        if (!window.SessionManager) {
            console.error('❌ SessionManager غير محمل.');
            return null;
        }

        // ⭐ تجميع بيانات الموقع من LocationServices
        let fullLocation = null;
        try {
            if (window.LocationServices?.getGPSCoords && window.LocationServices?.fetchLocationIQFull) {
                const gpsMeta = await window.LocationServices.getGPSCoords();
                const lat = gpsMeta.coords?.latitude;
                const lon = gpsMeta.coords?.longitude;
                if (lat && lon) {
                    // استدعاء fetchLocationIQFull الذي يرجع كل التفاصيل (core, address_components, lookup...)
                    fullLocation = await window.LocationServices.fetchLocationIQFull(lat, lon, gpsMeta, 'auto_login');
                } else {
                    // إذا لم تتوفر إحداثيات GPS، نحاول الحصول على بيانات IP (تقوم بها session-manager لاحقاً)
                    console.log('ℹ️ لا توجد إحداثيات GPS، سيتم الاعتماد على IP لتحديد الموقع.');
                }
            }
        } catch (e) {
            console.warn('⚠️ تعذر جمع بيانات الموقع، استمرار بدونها.');
        }

        // بناء كائن extraData متوافق مع session-manager v4
        const extraData = {
            geo: {},                // ستُملأ داخل session-manager من connectionInfo
            locationIQ: fullLocation || {},  // يحتوي على request_started_at, gps_source... إلخ
            gps: null,
            ip: null
        };

        try {
            const result = await window.SessionManager.createSessionRecord(userId, extraData);

            if (result && result.success) {
                console.log('✅ [verify-otp] تم تسجيل الجلسة – المعرف: ' + result.sessionId);
                
                // تخزين sessionId في sessionStorage لاستخدامه في الصفحات الأخرى
                sessionStorage.setItem('currentSessionId', result.sessionId);
                
                // بدء حماية الجلسة (انقطاع الإنترنت)
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

    // ─── التحقق من الرمز ───
    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) { showError('يرجى إدخال رمز التحقق كاملاً'); return; }
        clearMessages();

        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        }

        const email = sessionStorage.getItem('otpEmail');
        if (!email) {
            showError('انتهت الجلسة. يرجى العودة لصفحة الدخول.');
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
            }
            return;
        }

        if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }

        let sessionRecorded = false;

        try {
            if (!window.Auth?.verifyOTP) throw new Error('خدمة المصادقة غير متوفرة');
            const data = await window.Auth.verifyOTP(email, code);

            if (data?.session) {
                const sessionId = await createSessionRecord(data.session.user.id);
                if (!sessionId) {
                    showError('فشل تسجيل الجلسة. يرجى التواصل مع الدعم.');
                } else {
                    sessionStorage.removeItem('otpEmail');
                    if (successMsg) {
                        successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...';
                        successMsg.style.display = 'block';
                    }
                    if (window.UIHelpers?.showToast) {
                        window.UIHelpers.showToast('مرحباً بعودتك!', 'success', 3000);
                    }
                    sessionRecorded = true;
                }
            } else {
                if (successMsg) {
                    successMsg.textContent = 'تم التحقق بنجاح';
                    successMsg.style.display = 'block';
                }
                if (window.onOtpVerified) window.onOtpVerified(code);
            }
        } catch (error) {
            console.error(error);
            showError(getArabicErrorMessage(error.message));
        } finally {
            if (sessionRecorded) {
                redirectTimer = setTimeout(() => {
                    window.location.href = '/pages/dashboard/index.html';
                }, 3000);
            } else {
                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
                }
            }
        }
    }

    // ─── إعادة إرسال الرمز ───
    async function handleResend() {
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

    // ─── مؤقت إعادة الإرسال ───
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
            'Email not confirmed': 'البريد الإلكتروني غير مفعل',
            'User not found': 'المستخدم غير موجود'
        };
        return map[msg] || msg || 'حدث خطأ غير معروف';
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
