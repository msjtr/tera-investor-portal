/**
 * security-change-mobile.js – v1.1 (إصلاح ظهور نافذة النجاح تلقائياً)
 * تغيير رقم الجوال – صفحة مستقلة مع OTP عبر البريد الإلكتروني
 */

'use strict';

(function () {
    let supabase = null;
    let currentUser = null;
    let isSendingOtp = false;
    let isVerifyingOtp = false;
    let isUpdatingMobile = false;
    let timerInterval = null;
    let passwordVerified = false;
    let otpVerified = false;
    let otpAttempts = 0;
    const MAX_OTP_ATTEMPTS = 5;

    // عناصر DOM
    const currentMobileDisplay = document.getElementById('currentMobileDisplay');
    const currentPassword = document.getElementById('currentPassword');
    const verifyPasswordBtn = document.getElementById('verifyPasswordBtn');
    const passwordHint = document.getElementById('passwordHint');

    const newMobile = document.getElementById('newMobile');
    const confirmMobile = document.getElementById('confirmMobile');
    const countryCodeSelect = document.getElementById('countryCodeSelect');
    const mobileHint = document.getElementById('mobileHint');
    const confirmHint = document.getElementById('confirmMobileHint');

    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const timerContainer = document.getElementById('timerContainer');
    const timerDisplay = document.getElementById('timerDisplay');

    const otpCode = document.getElementById('otpCode');
    const otpVerifyGroup = document.getElementById('otpVerifyGroup');
    const otpSendGroup = document.getElementById('otpSendGroup');
    const otpIcon = document.getElementById('otpIcon');
    const otpMessage = document.getElementById('otpMessage');

    const saveMobileBtn = document.getElementById('saveMobileBtn');
    const saveGroup = document.getElementById('saveGroup');
    const successModal = document.getElementById('successModal');
    const countdownDisplay = document.getElementById('countdownDisplay');
    const successGoNow = document.getElementById('successGoNow');
    const alertBox = document.getElementById('formAlert');
    const alertIcon = document.getElementById('alertIcon');
    const alertMessage = document.getElementById('alertMessage');

    const countryPatterns = {
        '+966': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX', msg: 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام' },
        '+971': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX', msg: 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام' },
        '+965': { regex: /^[5-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 5-9' },
        '+973': { regex: /^[3-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 3-9' },
        '+974': { regex: /^[3-7]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 3-7' },
        '+968': { regex: /^[7-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 7-9' },
        '+20':  { regex: /^1[0-2]\d{8}$/, length: 10, placeholder: '1XXXXXXXXX', msg: 'يجب أن يبدأ بـ 1 ويتكون من 10 أرقام' }
    };

    // ===== دوال مساعدة =====
    function showAlert(message, type = 'error') {
        if (!alertBox) return;
        alertBox.style.display = 'flex';
        alertBox.className = `alert-box show ${type}`;
        alertIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        alertMessage.textContent = message;
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            alertBox.style.display = 'none';
            alertBox.className = 'alert-box';
        }, 7000);
    }

    function showSuccessModal() {
        if (!successModal) return;
        successModal.classList.add('show');
        successModal.style.display = 'flex';
        let count = 5;
        countdownDisplay.textContent = count;
        const interval = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(interval);
                window.location.replace('/pages/dashboard/index.html');
                return;
            }
            countdownDisplay.textContent = count;
        }, 1000);
        successGoNow.onclick = () => {
            clearInterval(interval);
            window.location.replace('/pages/dashboard/index.html');
        };
    }

    // إخفاء النافذة دائماً عند البدء
    function hideSuccessModal() {
        if (successModal) {
            successModal.classList.remove('show');
            successModal.style.display = 'none';
        }
    }

    function updateHeader(user) {
        if (!user) return;
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم';
        const avatar = fullName.charAt(0).toUpperCase();
        const headerName = document.getElementById('headerUserName');
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerName) headerName.textContent = fullName;
        if (headerAvatar) headerAvatar.textContent = avatar;
    }

    function loadCurrentMobile() {
        if (!currentUser || !currentMobileDisplay) return;
        const mobile = currentUser.user_metadata?.mobile_number || '';
        currentMobileDisplay.value = mobile || 'غير مسجل';
    }

    // ===== التحقق من كلمة المرور =====
    async function verifyPassword() {
        const password = currentPassword.value.trim();
        if (!password) {
            showAlert('يرجى إدخال كلمة المرور الحالية.', 'error');
            return;
        }

        verifyPasswordBtn.disabled = true;
        verifyPasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: currentUser.email,
                password: password
            });

            if (error) {
                passwordHint.innerHTML = '<span style="color:#dc2626;">✖ كلمة المرور غير صحيحة.</span>';
                showAlert('كلمة المرور الحالية غير صحيحة.', 'error');
                return;
            }

            passwordVerified = true;
            passwordHint.innerHTML = '<span style="color:#16a34a;">✅ تم التحقق بنجاح</span>';
            currentPassword.disabled = true;
            verifyPasswordBtn.style.display = 'none';
            document.getElementById('stage2Panel').style.display = 'block';
            document.getElementById('stage2Panel').scrollIntoView({ behavior: 'smooth' });
            showAlert('✅ تم التحقق من كلمة المرور بنجاح.', 'success');
        } catch (err) {
            console.error(err);
            showAlert('حدث خطأ أثناء التحقق. حاول لاحقاً.', 'error');
        } finally {
            verifyPasswordBtn.disabled = false;
            verifyPasswordBtn.innerHTML = '<i class="fas fa-check-circle"></i> تحقق من كلمة المرور';
        }
    }

    // ===== إرسال OTP =====
    async function sendOtp() {
        if (isSendingOtp) return;
        if (timerInterval) {
            showAlert('يرجى الانتظار حتى انتهاء المؤقت.', 'warning');
            return;
        }
        if (!validateNewMobile()) {
            showAlert('يرجى تصحيح رقم الجوال الجديد أولاً.', 'error');
            return;
        }

        isSendingOtp = true;
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: currentUser.email,
                options: { shouldCreateUser: false }
            });

            if (error) {
                if (error.status === 429 || error.message.includes('rate limit')) {
                    const match = error.message.match(/(\d+)\s*seconds?/);
                    const waitTime = match ? parseInt(match[1]) : 60;
                    showAlert(`⏳ تم تجاوز عدد المحاولات. يرجى الانتظار ${waitTime} ثانية.`, 'error');
                    sendOtpBtn.disabled = true;
                    setTimeout(() => {
                        sendOtpBtn.disabled = false;
                        sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
                    }, waitTime * 1000 + 1000);
                    return;
                }
                throw error;
            }

            showAlert('✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني.', 'success');
            otpSendGroup.style.display = 'none';
            otpVerifyGroup.style.display = 'block';
            otpCode.focus();
            startResendTimer();
        } catch (err) {
            console.error('فشل إرسال OTP:', err);
            showAlert('تعذر إرسال رمز التحقق، يرجى المحاولة لاحقاً.', 'error');
        } finally {
            isSendingOtp = false;
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
        }
    }

    function startResendTimer() {
        timerContainer.style.display = 'block';
        let seconds = 300;
        timerDisplay.textContent = '05:00';
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            seconds--;
            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            timerDisplay.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
            if (seconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                timerContainer.style.display = 'none';
                otpSendGroup.style.display = 'block';
                sendOtpBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
            }
        }, 1000);
    }

    // ===== التحقق من OTP =====
    async function verifyOtp() {
        if (isVerifyingOtp) return;
        const code = otpCode.value.trim();
        if (code.length !== 8) {
            otpIcon.className = 'validation-icon error';
            otpMessage.textContent = 'الرجاء إدخال رمز مكون من 8 أرقام';
            return;
        }
        if (otpAttempts >= MAX_OTP_ATTEMPTS) {
            showAlert('⚠️ تم تجاوز عدد المحاولات، يرجى طلب رمز جديد.', 'error');
            otpCode.disabled = true;
            return;
        }

        isVerifyingOtp = true;
        otpIcon.className = 'validation-icon loading';
        otpMessage.textContent = 'جارٍ التحقق...';

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: currentUser.email,
                token: code,
                type: 'email'
            });

            if (error) {
                otpAttempts++;
                throw error;
            }

            otpVerified = true;
            otpIcon.className = 'validation-icon success';
            otpMessage.textContent = '✅ تم التحقق بنجاح';
            otpCode.disabled = true;
            saveGroup.style.display = 'block';
            otpVerifyGroup.style.display = 'none';
            showAlert('✅ تم التحقق من الرمز بنجاح. يمكنك الآن حفظ التغيير.', 'success');
        } catch (err) {
            console.error(err);
            let msg = 'رمز التحقق غير صحيح.';
            if (err.message.includes('expired')) msg = 'انتهت صلاحية رمز التحقق.';
            else if (err.message.includes('invalid')) msg = `رمز التحقق غير صحيح. تبقى ${MAX_OTP_ATTEMPTS - otpAttempts} محاولة.`;
            otpIcon.className = 'validation-icon error';
            otpMessage.textContent = msg;
            otpCode.value = '';
            otpCode.focus();
        } finally {
            isVerifyingOtp = false;
        }
    }

    // ===== التحقق من صحة الرقم =====
    function validateNewMobile() {
        const code = countryCodeSelect?.value || '+966';
        const mobile = newMobile.value.replace(/\D/g, '');
        const pattern = countryPatterns[code];
        if (!pattern) return false;
        if (mobile.length !== pattern.length || !pattern.regex.test(mobile)) {
            mobileHint.textContent = pattern.msg;
            mobileHint.className = 'mobile-hint error';
            return false;
        }
        const currentFullMobile = currentUser.user_metadata?.mobile_number;
        if (currentFullMobile && currentFullMobile === code + mobile) {
            mobileHint.textContent = '✖ رقم الجوال الجديد مطابق للرقم الحالي.';
            mobileHint.className = 'mobile-hint error';
            return false;
        }
        mobileHint.textContent = '✅ رقم الجوال صالح';
        mobileHint.className = 'mobile-hint success';
        return true;
    }

    function validateConfirmMobile() {
        const newVal = newMobile.value.replace(/\D/g, '');
        const confirmVal = confirmMobile.value.replace(/\D/g, '');
        if (!confirmVal) {
            confirmHint.textContent = 'أعد إدخال رقم الجوال';
            confirmHint.className = 'mobile-hint';
            return false;
        }
        if (newVal !== confirmVal) {
            confirmHint.textContent = '✖ رقم الجوال غير متطابق';
            confirmHint.className = 'mobile-hint error';
            return false;
        }
        confirmHint.textContent = '✅ رقم الجوال متطابق';
        confirmHint.className = 'mobile-hint success';
        return true;
    }

    // ===== حفظ التغيير =====
    async function saveMobileChange() {
        if (isUpdatingMobile) return;
        if (!passwordVerified) {
            showAlert('يجب التحقق من كلمة المرور أولاً.', 'error');
            return;
        }
        if (!validateNewMobile() || !validateConfirmMobile()) {
            showAlert('يرجى التأكد من صحة رقم الجوال الجديد.', 'error');
            return;
        }
        if (!otpVerified) {
            showAlert('يجب التحقق من رمز OTP أولاً.', 'error');
            return;
        }

        const code = countryCodeSelect?.value || '+966';
        const mobile = newMobile.value.replace(/\D/g, '');
        const fullMobile = code + mobile;

        isUpdatingMobile = true;
        saveMobileBtn.disabled = true;
        saveMobileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            await supabase.auth.updateUser({ data: { mobile_number: fullMobile } });

            try { await supabase.from('user_contact_info').upsert({ user_id: currentUser.id, phone: fullMobile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); } catch (e) {}
            try { await supabase.from('auth_register').update({ mobile_number: fullMobile, updated_at: new Date().toISOString() }).eq('user_id', currentUser.id); } catch (e) {}

            showAlert('✅ تم تغيير رقم الجوال بنجاح.', 'success');
            showSuccessModal(); // يظهر فقط بعد الحفظ الناجح
        } catch (err) {
            console.error(err);
            showAlert('تعذر حفظ التغيير. تأكد من صلاحية البيانات.', 'error');
        } finally {
            isUpdatingMobile = false;
            saveMobileBtn.disabled = false;
            saveMobileBtn.innerHTML = '<i class="fas fa-save"></i> حفظ تغيير رقم الجوال';
        }
    }

    // ===== ربط الأحداث =====
    function bindEvents() {
        verifyPasswordBtn?.addEventListener('click', verifyPassword);

        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    this.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                }
            });
        });

        countryCodeSelect?.addEventListener('change', function () {
            const p = countryPatterns[this.value];
            if (p) {
                newMobile.placeholder = p.placeholder;
                newMobile.maxLength = p.length;
                newMobile.value = '';
                confirmMobile.value = '';
                validateNewMobile();
                validateConfirmMobile();
            }
        });

        newMobile?.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
            validateNewMobile();
            validateConfirmMobile();
        });
        confirmMobile?.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
            validateConfirmMobile();
        });

        sendOtpBtn?.addEventListener('click', sendOtp);
        otpCode?.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length === 8) verifyOtp();
        });

        saveMobileBtn?.addEventListener('click', saveMobileChange);
    }

    // ===== التهيئة =====
    async function init() {
        hideSuccessModal(); // إخفاء النافذة فوراً

        try {
            if (window.SecurityCore?.supabase) {
                supabase = window.SecurityCore.supabase;
                currentUser = window.SecurityCore.currentUser;
            } else if (typeof waitForSupabase === 'function') {
                supabase = await waitForSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
            } else if (window.teraSupabase) {
                supabase = window.teraSupabase;
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
            } else {
                throw new Error('Supabase client not found');
            }

            if (!currentUser) {
                window.location.replace('/auth/auth/login/login.html');
                return;
            }

            updateHeader(currentUser);
            loadCurrentMobile();
            if (countryCodeSelect) countryCodeSelect.value = '+966';
            bindEvents();
            console.log('✅ [Change Mobile] جاهز، المستخدم:', currentUser.email);
        } catch (err) {
            console.error('فشلت التهيئة:', err);
            showAlert('تعذر تحميل الصفحة. يرجى تحديث المتصفح.', 'error');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
