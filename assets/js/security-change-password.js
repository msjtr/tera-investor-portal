/**
 * security-change-password.js
 * صفحة تغيير كلمة المرور – التحقق بكلمة المرور الحالية + OTP
 * جميع الوظائف منفصلة عن HTML، متوافقة مع security.js
 */

'use strict';

(function() {
    // ===== متغيرات عامة =====
    let supabase = null;
    let currentUser = null;
    let isCurrentPasswordValid = false;
    let isOtpVerified = false;
    let timerInterval = null;
    let timerSeconds = 300;
    let isSendingOtp = false;
    let isSaving = false;

    // ===== عناصر DOM =====
    const emailDisplay = document.getElementById('userEmail');
    const currentPasswordInput = document.getElementById('currentPassword');
    const currentPasswordHint = document.getElementById('currentPasswordHint');
    const currentPasswordIcon = document.getElementById('currentPasswordIcon');
    const currentPasswordMessage = document.getElementById('currentPasswordMessage');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const newPasswordHint = document.getElementById('newPasswordHint');
    const confirmPasswordHint = document.getElementById('confirmPasswordHint');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const otpSendGroup = document.getElementById('otpSendGroup');
    const timerContainer = document.getElementById('timerContainer');
    const timerDisplay = document.getElementById('timerDisplay');
    const otpVerifyGroup = document.getElementById('otpVerifyGroup');
    const otpCodeInput = document.getElementById('otpCode');
    const otpHint = document.getElementById('otpHint');
    const otpIcon = document.getElementById('otpIcon');
    const otpMessage = document.getElementById('otpMessage');
    const saveGroup = document.getElementById('saveGroup');
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    const alertBox = document.getElementById('formAlert');
    const alertIcon = document.getElementById('alertIcon');
    const alertMessage = document.getElementById('alertMessage');

    // نوافذ منبثقة
    const successModal = document.getElementById('successModal');
    const countdownDisplay = document.getElementById('countdownDisplay');
    const successGoNow = document.getElementById('successGoNow');
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const errorRetryBtn = document.getElementById('errorRetryBtn');
    const errorCloseBtn = document.getElementById('errorCloseBtn');

    // ===== دوال مساعدة للاتصال بـ Supabase =====
    async function initSupabase() {
        // محاولة استخدام SecurityCore من security.js
        if (window.SecurityCore && window.SecurityCore.supabase) {
            supabase = window.SecurityCore.supabase;
            currentUser = window.SecurityCore.currentUser;
            return true;
        }
        // محاولة استخدام window.teraSupabase
        if (window.teraSupabase) {
            supabase = window.teraSupabase;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
                return true;
            } catch (e) {
                return false;
            }
        }
        // محاولة استخدام waitForSupabase من security.js
        if (typeof waitForSupabase === 'function') {
            try {
                supabase = await waitForSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    // ===== تحديث الهيدر =====
    function updateHeaderUI(user) {
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (!user) return;
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم';
        if (nameEl) nameEl.textContent = fullName;
        if (avatarEl) avatarEl.textContent = fullName.charAt(0).toUpperCase();
    }

    // ===== عرض تنبيه علوي =====
    function showAlert(message, type = 'error') {
        if (!alertBox) return;
        alertBox.className = `alert-box show ${type}`;
        alertIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        alertMessage.textContent = message;
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            alertBox.classList.remove('show');
            alertBox.style.display = 'none';
        }, 7000);
    }

    // ===== عرض نافذة الخطأ =====
    function showErrorModal(message) {
        errorMessage.textContent = message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
        errorModal.classList.add('show');
    }

    function hideErrorModal() {
        errorModal.classList.remove('show');
    }

    // ===== عرض نافذة النجاح مع عداد =====
    function showSuccessModal() {
        successModal.classList.add('show');
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
        successGoNow.onclick = function() {
            clearInterval(interval);
            window.location.replace('/pages/dashboard/index.html');
        };
    }

    // ===== التحقق من كلمة المرور الحالية =====
    async function verifyCurrentPassword() {
        const password = currentPasswordInput.value.trim();
        if (!password) {
            currentPasswordIcon.className = 'validation-icon';
            currentPasswordMessage.textContent = 'أدخل كلمة المرور الحالية للتحقق';
            currentPasswordHint.className = 'format-hint';
            isCurrentPasswordValid = false;
            toggleNewPasswordFields(false);
            return;
        }

        currentPasswordIcon.className = 'validation-icon loading';
        currentPasswordMessage.textContent = 'جارٍ التحقق من كلمة المرور…';
        currentPasswordHint.className = 'format-hint';

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: currentUser.email,
                password: password
            });

            if (error) {
                currentPasswordIcon.className = 'validation-icon error';
                currentPasswordIcon.innerHTML = '✖';
                currentPasswordMessage.textContent = 'كلمة المرور الحالية غير صحيحة.';
                currentPasswordHint.className = 'format-hint error';
                isCurrentPasswordValid = false;
                toggleNewPasswordFields(false);
                return;
            }

            currentPasswordIcon.className = 'validation-icon success';
            currentPasswordIcon.innerHTML = '✔';
            currentPasswordMessage.textContent = 'تم التحقق من كلمة المرور الحالية بنجاح.';
            currentPasswordHint.className = 'format-hint success';
            isCurrentPasswordValid = true;
            toggleNewPasswordFields(true);
            showAlert('✅ تم التحقق من كلمة المرور الحالية.', 'success');

        } catch (err) {
            console.error(err);
            currentPasswordIcon.className = 'validation-icon error';
            currentPasswordIcon.innerHTML = '✖';
            currentPasswordMessage.textContent = 'حدث خطأ أثناء التحقق. حاول مرة أخرى.';
            currentPasswordHint.className = 'format-hint error';
            isCurrentPasswordValid = false;
            toggleNewPasswordFields(false);
        }
    }

    // ===== تفعيل / تعطيل حقول كلمة المرور الجديدة =====
    function toggleNewPasswordFields(enabled) {
        newPasswordInput.disabled = !enabled;
        confirmPasswordInput.disabled = !enabled;
        if (!enabled) {
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            newPasswordHint.textContent = '';
            confirmPasswordHint.textContent = 'أعد كتابة كلمة المرور الجديدة';
            confirmPasswordHint.className = 'format-hint';
            document.querySelectorAll('#passwordRequirements ul li').forEach(li => {
                li.className = '';
                const icon = li.querySelector('i');
                if (icon) icon.className = 'fas fa-circle';
            });
            document.getElementById('strengthFill').style.width = '0%';
            document.getElementById('strengthLabel').textContent = 'ضعيفة';
            otpSendGroup.style.display = 'none';
            otpVerifyGroup.style.display = 'none';
            saveGroup.style.display = 'none';
            isOtpVerified = false;
        } else {
            otpSendGroup.style.display = 'none';
            otpVerifyGroup.style.display = 'none';
            saveGroup.style.display = 'none';
            isOtpVerified = false;
            otpCodeInput.value = '';
            otpIcon.className = 'validation-icon';
            otpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك';
            otpHint.className = 'format-hint';
        }
    }

    // ===== فحص قوة كلمة المرور (جميع الشروط) =====
    function validatePasswordStrength() {
        const password = newPasswordInput.value;
        const email = currentUser?.email || '';
        const currentPass = currentPasswordInput.value.trim();

        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password),
            nospace: !/\s/.test(password),
            notEmail: password.length > 0 && !email.toLowerCase().includes(password.toLowerCase()) && !password.toLowerCase().includes(email.toLowerCase().split('@')[0]),
            notCurrent: password.length > 0 && password !== currentPass,
            notSequential: !/(12345678|abcdefgh|qwertyui|87654321)/i.test(password),
            notRepetitive: !/(.)\1{7,}/.test(password) && !/(password){2,}/i.test(password)
        };

        const reqMap = {
            length: 'req-length',
            uppercase: 'req-uppercase',
            lowercase: 'req-lowercase',
            number: 'req-number',
            special: 'req-special',
            nospace: 'req-nospace',
            notEmail: 'req-not-email',
            notCurrent: 'req-not-current',
            notSequential: 'req-not-sequential',
            notRepetitive: 'req-not-repetitive'
        };

        let score = 0;
        Object.keys(reqMap).forEach(key => {
            const el = document.getElementById(reqMap[key]);
            if (el) {
                const valid = checks[key];
                el.className = valid ? 'valid' : 'invalid';
                const icon = el.querySelector('i');
                if (icon) icon.className = valid ? 'fas fa-check-circle' : 'fas fa-circle';
                if (valid) score++;
            }
        });

        const fill = document.getElementById('strengthFill');
        const label = document.getElementById('strengthLabel');
        if (fill) {
            const percent = (score / 10) * 100;
            fill.style.width = percent + '%';
            if (score <= 3) {
                fill.style.background = '#dc2626';
                if (label) { label.textContent = 'ضعيفة جداً'; label.className = 'strength-label weak'; }
            } else if (score <= 5) {
                fill.style.background = '#f59e0b';
                if (label) { label.textContent = 'ضعيفة'; label.className = 'strength-label weak'; }
            } else if (score <= 7) {
                fill.style.background = '#fbbf24';
                if (label) { label.textContent = 'متوسطة'; label.className = 'strength-label medium'; }
            } else if (score <= 9) {
                fill.style.background = '#34d399';
                if (label) { label.textContent = 'قوية'; label.className = 'strength-label strong'; }
            } else {
                fill.style.background = '#10b981';
                if (label) { label.textContent = 'قوية جداً'; label.className = 'strength-label very-strong'; }
            }
        }

        const allValid = Object.values(checks).every(v => v === true);
        if (password.length === 0) {
            newPasswordHint.textContent = '';
            newPasswordHint.className = 'format-hint';
        } else if (allValid) {
            newPasswordHint.textContent = '✅ كلمة المرور تستوفي جميع المتطلبات.';
            newPasswordHint.className = 'format-hint success';
        } else {
            newPasswordHint.textContent = '⚠️ راجع المتطلبات غير المستوفاة أعلاه.';
            newPasswordHint.className = 'format-hint error';
        }

        validateConfirmMatch();

        const allConditionsMet = isCurrentPasswordValid && allValid && password.length > 0 && confirmPasswordInput.value === password;
        if (allConditionsMet && !isOtpVerified) {
            otpSendGroup.style.display = 'block';
            if (timerInterval) {
                sendOtpBtn.disabled = true;
            } else {
                sendOtpBtn.disabled = false;
            }
        } else {
            otpSendGroup.style.display = 'none';
        }

        return allValid;
    }

    // ===== التحقق من تطابق كلمة المرور =====
    function validateConfirmMatch() {
        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;
        if (confirmPass.length === 0) {
            confirmPasswordHint.textContent = 'أعد كتابة كلمة المرور الجديدة';
            confirmPasswordHint.className = 'format-hint';
            return;
        }
        if (newPass === confirmPass) {
            confirmPasswordHint.textContent = '✔ كلمتا المرور متطابقتان.';
            confirmPasswordHint.className = 'format-hint success';
        } else {
            confirmPasswordHint.textContent = '✖ كلمتا المرور غير متطابقتين.';
            confirmPasswordHint.className = 'format-hint error';
        }
    }

    // ===== إرسال رمز التحقق =====
    async function sendOtp() {
        if (isSendingOtp) return;
        if (timerInterval) {
            showAlert('يرجى الانتظار حتى انتهاء المؤقت.', 'error');
            return;
        }

        const email = currentUser?.email;
        if (!email) {
            showAlert('البريد الإلكتروني غير متوفر.', 'error');
            return;
        }

        isSendingOtp = true;
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: { shouldCreateUser: false }
            });
            if (error) throw error;

            showAlert('✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني.', 'success');
            otpVerifyGroup.style.display = 'block';
            otpCodeInput.value = '';
            otpCodeInput.focus();
            otpIcon.className = 'validation-icon';
            otpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك';
            otpHint.className = 'format-hint';

            startTimer();
            sendOtpBtn.style.display = 'none';
            timerContainer.style.display = 'block';

        } catch (err) {
            console.error(err);
            let msg = 'فشل إرسال الرمز. حاول مرة أخرى.';
            if (err.message.includes('rate limit')) msg = 'تم تجاوز عدد المحاولات. انتظر بضع دقائق.';
            else if (err.message.includes('Email not found')) msg = 'البريد الإلكتروني غير مسجل.';
            showAlert(msg, 'error');
            sendOtpBtn.style.display = 'block';
            timerContainer.style.display = 'none';
        } finally {
            isSendingOtp = false;
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
            if (timerInterval) {
                sendOtpBtn.style.display = 'none';
                timerContainer.style.display = 'block';
            } else {
                sendOtpBtn.style.display = 'block';
                timerContainer.style.display = 'none';
            }
        }
    }

    // ===== مؤقت إعادة الإرسال =====
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerSeconds = 300;
        timerDisplay.textContent = '05:00';
        timerInterval = setInterval(() => {
            timerSeconds--;
            const min = Math.floor(timerSeconds / 60);
            const sec = timerSeconds % 60;
            timerDisplay.textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                sendOtpBtn.style.display = 'block';
                timerContainer.style.display = 'none';
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
            }
        }, 1000);
    }

    // ===== التحقق من رمز OTP =====
    async function verifyOtp() {
        const otp = otpCodeInput.value.trim();
        if (otp.length !== 8) {
            otpIcon.className = 'validation-icon error';
            otpIcon.innerHTML = '✖';
            otpMessage.textContent = 'يرجى إدخال رمز مكون من 8 أرقام.';
            otpHint.className = 'format-hint error';
            return;
        }

        const email = currentUser?.email;
        if (!email) {
            showAlert('البريد الإلكتروني غير متوفر.', 'error');
            return;
        }

        otpIcon.className = 'validation-icon loading';
        otpMessage.textContent = 'جارٍ التحقق من الرمز…';
        otpHint.className = 'format-hint';

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: email,
                token: otp,
                type: 'email'
            });
            if (error) throw error;

            otpIcon.className = 'validation-icon success';
            otpIcon.innerHTML = '✔';
            otpMessage.textContent = 'تم التحقق من رمز التحقق بنجاح.';
            otpHint.className = 'format-hint success';
            isOtpVerified = true;
            otpCodeInput.disabled = true;
            saveGroup.style.display = 'block';
            showAlert('✅ تم التحقق من الرمز بنجاح.', 'success');

        } catch (err) {
            console.error(err);
            let msg = 'رمز التحقق غير صحيح.';
            if (err.message.includes('expired')) msg = 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
            else if (err.message.includes('invalid')) msg = 'رمز التحقق غير صحيح. حاول مرة أخرى.';
            otpIcon.className = 'validation-icon error';
            otpIcon.innerHTML = '✖';
            otpMessage.textContent = msg;
            otpHint.className = 'format-hint error';
            isOtpVerified = false;
            otpCodeInput.disabled = false;
            saveGroup.style.display = 'none';
            if (!timerInterval) {
                sendOtpBtn.style.display = 'block';
                timerContainer.style.display = 'none';
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
            }
        }
    }

    // ===== حفظ كلمة المرور الجديدة =====
    async function saveNewPassword() {
        if (isSaving) return;
        if (!isCurrentPasswordValid) {
            showAlert('يرجى التحقق من كلمة المرور الحالية أولاً.', 'error');
            return;
        }
        if (!isOtpVerified) {
            showAlert('يرجى التحقق من رمز التحقق أولاً.', 'error');
            return;
        }

        const newPassword = newPasswordInput.value.trim();
        const confirmPass = confirmPasswordInput.value.trim();
        if (newPassword !== confirmPass) {
            showAlert('كلمتا المرور غير متطابقتين.', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showAlert('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.', 'error');
            return;
        }

        isSaving = true;
        savePasswordBtn.disabled = true;
        savePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) {
                if (error.message.includes('should be different from the old password')) {
                    throw new Error('كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.');
                }
                throw error;
            }

            showAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');
            showSuccessModal();
            setTimeout(() => {
                resetForm();
            }, 1000);

        } catch (err) {
            console.error(err);
            let msg = 'حدث خطأ أثناء حفظ البيانات.';
            if (err.message.includes('should be different')) msg = 'كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.';
            else if (err.message.includes('session')) {
                msg = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.';
                isOtpVerified = false;
                otpCodeInput.disabled = false;
                saveGroup.style.display = 'none';
                sendOtpBtn.style.display = 'block';
                timerContainer.style.display = 'none';
            } else if (err.message.includes('Network')) msg = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
            showErrorModal(msg);
        } finally {
            isSaving = false;
            savePasswordBtn.disabled = false;
            savePasswordBtn.innerHTML = '<i class="fas fa-save"></i> حفظ تغيير كلمة المرور';
        }
    }

    // ===== إعادة تعيين النموذج =====
    function resetForm() {
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        otpCodeInput.value = '';
        otpCodeInput.disabled = false;
        isCurrentPasswordValid = false;
        isOtpVerified = false;
        toggleNewPasswordFields(false);
        otpSendGroup.style.display = 'none';
        otpVerifyGroup.style.display = 'none';
        saveGroup.style.display = 'none';
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        sendOtpBtn.style.display = 'block';
        timerContainer.style.display = 'none';
        sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
        sendOtpBtn.disabled = false;
        currentPasswordIcon.className = 'validation-icon';
        currentPasswordMessage.textContent = 'أدخل كلمة المرور الحالية للتحقق';
        currentPasswordHint.className = 'format-hint';
        otpIcon.className = 'validation-icon';
        otpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك';
        otpHint.className = 'format-hint';
        document.querySelectorAll('#passwordRequirements ul li').forEach(li => {
            li.className = '';
            const icon = li.querySelector('i');
            if (icon) icon.className = 'fas fa-circle';
        });
        document.getElementById('strengthFill').style.width = '0%';
        document.getElementById('strengthLabel').textContent = 'ضعيفة';
        newPasswordHint.textContent = '';
        confirmPasswordHint.textContent = 'أعد كتابة كلمة المرور الجديدة';
        confirmPasswordHint.className = 'format-hint';
        alertBox.classList.remove('show');
        alertBox.style.display = 'none';
    }

    // ===== تهيئة الصفحة =====
    async function initPage() {
        const success = await initSupabase();
        if (!success) {
            showErrorModal('تعذر الاتصال بخدمة المصادقة. يرجى تحديث الصفحة.');
            return;
        }
        if (!currentUser) {
            window.location.replace('/auth/auth/login/login.html');
            return;
        }
        emailDisplay.value = currentUser.email || '';
        updateHeaderUI(currentUser);

        // ربط الأحداث
        currentPasswordInput.addEventListener('input', function() {
            if (this.value.trim().length >= 4) {
                verifyCurrentPassword();
            } else {
                currentPasswordIcon.className = 'validation-icon';
                currentPasswordMessage.textContent = 'أدخل كلمة المرور الحالية للتحقق';
                currentPasswordHint.className = 'format-hint';
                isCurrentPasswordValid = false;
                toggleNewPasswordFields(false);
            }
        });

        newPasswordInput.addEventListener('input', function() {
            if (isCurrentPasswordValid) {
                validatePasswordStrength();
            }
        });

        confirmPasswordInput.addEventListener('input', function() {
            if (isCurrentPasswordValid) {
                validatePasswordStrength();
                validateConfirmMatch();
            }
        });

        sendOtpBtn.addEventListener('click', sendOtp);

        otpCodeInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length === 8) {
                verifyOtp();
            }
        });

        savePasswordBtn.addEventListener('click', saveNewPassword);

        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const target = document.getElementById(this.dataset.target);
                if (!target) return;
                const isPassword = target.type === 'password';
                target.type = isPassword ? 'text' : 'password';
                const icon = this.querySelector('i');
                if (icon) icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        });

        errorRetryBtn.addEventListener('click', function() {
            hideErrorModal();
            if (!timerInterval) {
                sendOtpBtn.style.display = 'block';
                timerContainer.style.display = 'none';
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
            }
            otpCodeInput.disabled = false;
            otpCodeInput.value = '';
            otpIcon.className = 'validation-icon';
            otpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك';
            otpHint.className = 'format-hint';
            isOtpVerified = false;
            saveGroup.style.display = 'none';
        });

        errorCloseBtn.addEventListener('click', hideErrorModal);

        toggleNewPasswordFields(false);
        console.log('✅ صفحة تغيير كلمة المرور جاهزة.');
    }

    // بدء التشغيل عند تحميل DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }
})();
