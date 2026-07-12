/**
 * verify-otp.js – v25 (حماية كاملة ضد التوجيه الخاطئ + اسم المستخدم الحقيقي)
 */
(function() {
    const OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300;

    let supabase;
    let countdownInterval;
    let isVerifying = false; // قفل
    let redirectTimeout = null; // لتخزين مؤقت التوجيه

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');

    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        await updateUserDisplay();
        bindEvents();
        startCountdown();
        updateEmailDisplay();
        setupBackLink();
    }

    async function updateUserDisplay() {
        try {
            let user = null;
            if (window.Auth?.getUser) {
                user = await window.Auth.getUser();
            } else if (supabase) {
                const { data } = await supabase.auth.getUser();
                user = data?.user;
            }
            if (user) {
                const name = user.user_metadata?.full_name || user.email || 'مستخدم';
                const nameEl = document.getElementById('headerUserName');
                const avatarEl = document.getElementById('headerAvatar');
                if (nameEl) nameEl.textContent = name;
                if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
            }
        } catch (e) { /* تجاهل */ }
    }

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
            const emailEl = document.getElementById('instructionEmailText');
            if (emailEl) emailEl.textContent = email;
        }
    }

    function setupBackLink() {
        const backLink = document.getElementById('backLink');
        if (backLink) {
            backLink.href = document.referrer || '/auth/auth/login/login.html';
        }
    }

    async function createSessionRecord(userId) {
        if (!window.SessionManager) {
            console.error('❌ SessionManager غير محمل.');
            return false;
        }
        try {
            let gpsCoords = null;
            if (window.LocationServices?.getGPSCoords) {
                gpsCoords = await window.LocationServices.getGPSCoords();
            }

            let geo = {};
            if (window.LocationServices?.fetchBasicGeo) {
                geo = await window.LocationServices.fetchBasicGeo();
            }

            let loc = {};
            const lat = gpsCoords?.latitude || geo.lat;
            const lon = gpsCoords?.longitude || geo.lon;
            if (lat && lon && window.LocationServices?.fetchLocationIQ) {
                loc = await window.LocationServices.fetchLocationIQ(lat, lon);
            }

            const success = await window.SessionManager.createSessionRecord(userId, {
                geo: geo,
                locationIQ: loc,
                gps: gpsCoords,
                ip: geo.ip
            });

            if (success) {
                console.log('✅ تم تسجيل الجلسة');
                if (window.SessionManager.deactivateOtherSessions) {
                    await window.SessionManager.deactivateOtherSessions(userId, null);
                }
            } else {
                console.error('❌ createSessionRecord فشل');
            }
            return success;
        } catch (e) {
            console.error('❌ استثناء أثناء تسجيل الجلسة:', e);
            return false;
        }
    }

    async function handleVerify() {
        // منع الضغط المتكرر
        if (isVerifying) return;
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) { showError('يرجى إدخال رمز التحقق كاملاً'); return; }
        clearMessages();

        isVerifying = true;
        if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...'; }
        const email = sessionStorage.getItem('otpEmail');

        // إلغاء أي مؤقت توجيه سابق
        if (redirectTimeout) {
            clearTimeout(redirectTimeout);
            redirectTimeout = null;
        }

        let redirectAllowed = false;

        try {
            if (!window.Auth?.verifyOTP) throw new Error('خدمة المصادقة غير متوفرة');
            const data = await window.Auth.verifyOTP(email, code);

            if (data?.session) {
                const sessionCreated = await createSessionRecord(data.session.user.id);

                if (!sessionCreated) {
                    showError('تعذر تسجيل الجلسة. يرجى التواصل مع الدعم الفني أو المحاولة لاحقاً.');
                    // لا نسمح بالتوجيه
                } else {
                    sessionStorage.removeItem('otpEmail');
                    if (successMsg) {
                        successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...';
                        successMsg.style.display = 'block';
                    }
                    redirectAllowed = true;
                }
            } else {
                if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح'; successMsg.style.display = 'block'; }
                if (window.onOtpVerified) window.onOtpVerified(code);
                // لا توجيه تلقائي
            }
        } catch (error) {
            console.error(error);
            showError(getArabicErrorMessage(error.message));
        } finally {
            if (redirectAllowed) {
                // إنشاء مؤقت توجيه جديد
                redirectTimeout = setTimeout(() => {
                    window.location.href = '/pages/dashboard/index.html';
                }, 2000);
            } else {
                // فشل: إعادة تمكين الزر والخروج من القفل
                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
                }
                isVerifying = false;
            }
        }
    }

    async function handleResend() {
        const email = sessionStorage.getItem('otpEmail');
        if (!email) { showError('البريد الإلكتروني غير متوفر'); return; }
        clearMessages();
        if (resendBtn) { resendBtn.disabled = true; resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...'; }
        try {
            if (!window.Auth?.sendOTP) throw new Error('الخدمة غير متوفرة');
            await window.Auth.sendOTP(email);
            if (successMsg) { successMsg.textContent = 'تم إرسال رمز جديد'; successMsg.style.display = 'block'; }
            resetCountdown();
        } catch (e) { showError('فشل إعادة الإرسال'); }
        finally { if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = 'إعادة إرسال الرمز'; } }
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
                if (resendBtn) { resendBtn.disabled = false; resendBtn.textContent = 'إعادة إرسال الرمز'; }
                if (timerSpan) timerSpan.textContent = '';
            }
        }, 1000);
    }
    function resetCountdown() { clearInterval(countdownInterval); startCountdown(); }
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
