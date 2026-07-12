/**
 * verify-otp.js – v34 (الاعتماد على LocationIQ فقط، توجيه بعد 10 ثوانٍ، مرن مع الأخطاء)
 */
(function() {
    const OTP_LENGTH = 8;
    const RESEND_TIMEOUT = 300;

    let supabase;
    let countdownInterval;
    let redirectTimer = null;

    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const resendBtn = document.getElementById('resendOtpBtn');
    const errorMsg = document.getElementById('otpError');
    const timerSpan = document.getElementById('otpTimer');
    const successMsg = document.getElementById('otpSuccess');

    async function init() {
        supabase = window.teraSupabase || await window.waitForSupabase?.();
        updateUserDisplayFromSession(); // الاسم المخزن من login.js
        await updateUserDisplayFromAuth(); // محاولة من Supabase
        bindEvents();
        startCountdown();
        updateEmailDisplay();
        setupBackLink();
    }

    function updateUserDisplayFromSession() {
        const name = sessionStorage.getItem('otpName');
        if (name) {
            document.getElementById('headerUserName').textContent = name;
            document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
        }
    }

    async function updateUserDisplayFromAuth() {
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
                document.getElementById('headerUserName').textContent = name;
                document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
            }
        } catch (e) {}
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
        if (email) document.getElementById('instructionEmailText').textContent = email;
    }

    function setupBackLink() {
        const backLink = document.getElementById('backLink');
        if (backLink) backLink.href = document.referrer || '/auth/auth/login/login.html';
    }

    async function createSessionRecord(userId) {
        console.log('📦 [verify-otp] محاولة تسجيل الجلسة...');
        if (!window.SessionManager) {
            console.error('❌ SessionManager غير محمل.');
            return false;
        }

        // جمع بيانات الموقع – أي خطأ لا يمنع تسجيل الجلسة
        let gpsCoords = null, geo = {}, loc = {};
        try {
            if (window.LocationServices?.getGPSCoords) {
                gpsCoords = await window.LocationServices.getGPSCoords();
            }
            if (window.LocationServices?.fetchBasicGeo) {
                geo = await window.LocationServices.fetchBasicGeo();
            }
            const lat = gpsCoords?.latitude || geo.lat;
            const lon = gpsCoords?.longitude || geo.lon;
            if (lat && lon && window.LocationServices?.fetchLocationIQ) {
                loc = await window.LocationServices.fetchLocationIQ(lat, lon);
            }
        } catch (e) {
            console.warn('⚠️ تعذر جمع بيانات الموقع، استمرار بدونها.');
        }

        try {
            const success = await window.SessionManager.createSessionRecord(userId, {
                geo: geo,
                locationIQ: loc,
                gps: gpsCoords,
                ip: geo.ip || null
            });

            if (success) {
                console.log('✅ [verify-otp] تم تسجيل الجلسة');
                if (window.SessionManager.deactivateOtherSessions) {
                    await window.SessionManager.deactivateOtherSessions(userId, null);
                }
            } else {
                console.error('❌ [verify-otp] createSessionRecord فشل');
            }
            return success;
        } catch (e) {
            console.error('❌ [verify-otp] استثناء أثناء تسجيل الجلسة:', e);
            return false;
        }
    }

    async function handleVerify() {
        const code = getOtpCode();
        if (code.length !== OTP_LENGTH) { showError('يرجى إدخال رمز التحقق كاملاً'); return; }
        clearMessages();
        if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...'; }
        const email = sessionStorage.getItem('otpEmail');

        if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }

        let sessionRecorded = false;

        try {
            if (!window.Auth?.verifyOTP) throw new Error('خدمة المصادقة غير متوفرة');
            const data = await window.Auth.verifyOTP(email, code);

            if (data?.session) {
                const sessionCreated = await createSessionRecord(data.session.user.id);
                if (!sessionCreated) {
                    showError('فشل تسجيل الجلسة. يرجى التواصل مع الدعم.');
                } else {
                    sessionStorage.removeItem('otpEmail');
                    if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح، جاري تحويلك...'; successMsg.style.display = 'block'; }
                    sessionRecorded = true;
                }
            } else {
                if (successMsg) { successMsg.textContent = 'تم التحقق بنجاح'; successMsg.style.display = 'block'; }
                if (window.onOtpVerified) window.onOtpVerified(code);
            }
        } catch (error) {
            console.error(error);
            showError(getArabicErrorMessage(error.message));
        } finally {
            if (sessionRecorded) {
                redirectTimer = setTimeout(() => {
                    window.location.href = '/pages/dashboard/index.html';
                }, 10000);
            } else {
                if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة'; }
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
