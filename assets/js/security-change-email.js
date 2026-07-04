/**
 * security-change-email.js
 * تغيير البريد الإلكتروني – إرسال OTP إلى البريد الحالي فقط
 * بدون إنشاء حساب جديد، فقط تحديث البريد الإلكتروني للمستخدم الحالي
 * مع تسجيل كامل العملية في قاعدة البيانات
 */

'use strict';

(function() {
    let supabase = null;
    let currentUser = null;
    let timerInterval = null;
    let isSendingOtp = false;
    let isVerifying = false;
    let isSaving = false;
    let initialized = false;
    let newEmailValue = '';
    let attemptCount = 0;
    const MAX_ATTEMPTS = 5;

    // ===== عناصر DOM =====
    const currentEmailDisplay = document.getElementById('currentEmailDisplay');
    const newEmailInput = document.getElementById('newEmail');
    const newEmailHint = document.getElementById('newEmailHint');
    const newEmailIcon = document.getElementById('newEmailIcon');
    const newEmailMessage = document.getElementById('newEmailMessage');

    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const otpCode = document.getElementById('otpCode');
    const otpHint = document.getElementById('otpHint');
    const otpIcon = document.getElementById('otpIcon');
    const otpMessage = document.getElementById('otpMessage');
    const timerContainer = document.getElementById('timerContainer');
    const timerDisplay = document.getElementById('timerDisplay');

    const otpSendGroup = document.getElementById('otpSendGroup');
    const otpVerifyGroup = document.getElementById('otpVerifyGroup');
    const saveGroup = document.getElementById('saveGroup');
    const saveEmailBtn = document.getElementById('saveEmailBtn');

    const alertBox = document.getElementById('formAlert');
    const alertIcon = document.getElementById('alertIcon');
    const alertMessage = document.getElementById('alertMessage');

    const successModal = document.getElementById('successModal');
    const countdownDisplay = document.getElementById('countdownDisplay');
    const successGoNow = document.getElementById('successGoNow');
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const errorRetryBtn = document.getElementById('errorRetryBtn');
    const errorCloseBtn = document.getElementById('errorCloseBtn');

    // ===== دوال مساعدة =====
    async function initSupabase() {
        if (window.SecurityCore && window.SecurityCore.supabase) {
            supabase = window.SecurityCore.supabase;
            currentUser = window.SecurityCore.currentUser;
            return true;
        }
        if (window.teraSupabase) {
            supabase = window.teraSupabase;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
                return true;
            } catch (e) { return false; }
        }
        if (typeof waitForSupabase === 'function') {
            try {
                supabase = await waitForSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
                return true;
            } catch (e) { return false; }
        }
        return false;
    }

    function updateHeaderUI(user) {
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (!user) return;
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم';
        if (nameEl) nameEl.textContent = fullName;
        if (avatarEl) avatarEl.textContent = fullName.charAt(0).toUpperCase();
    }

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

    function showErrorModal(message) {
        if (!errorModal) return;
        errorMessage.textContent = message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
        errorModal.classList.add('show');
    }

    function hideErrorModal() {
        if (errorModal) errorModal.classList.remove('show');
    }

    function showSuccessModal() {
        if (!successModal) return;
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

    // ===== التحقق من البريد الجديد (Realtime) =====
    function validateNewEmail() {
        const email = newEmailInput.value.trim().toLowerCase();
        const currentEmail = currentUser?.email?.toLowerCase() || '';

        if (!email) {
            newEmailIcon.className = 'validation-icon';
            newEmailMessage.textContent = 'أدخل البريد الإلكتروني الجديد';
            newEmailHint.className = 'format-hint';
            return false;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            newEmailIcon.className = 'validation-icon error';
            newEmailIcon.innerHTML = '✖';
            newEmailMessage.textContent = 'صيغة البريد الإلكتروني غير صحيحة.';
            newEmailHint.className = 'format-hint error';
            return false;
        }

        if (/\s/.test(email)) {
            newEmailIcon.className = 'validation-icon error';
            newEmailIcon.innerHTML = '✖';
            newEmailMessage.textContent = 'البريد الإلكتروني لا يجب أن يحتوي على مسافات.';
            newEmailHint.className = 'format-hint error';
            return false;
        }

        if (email === currentEmail) {
            newEmailIcon.className = 'validation-icon error';
            newEmailIcon.innerHTML = '✖';
            newEmailMessage.textContent = 'البريد الإلكتروني الجديد مطابق للبريد الحالي.';
            newEmailHint.className = 'format-hint error';
            return false;
        }

        newEmailIcon.className = 'validation-icon success';
        newEmailIcon.innerHTML = '✔';
        newEmailMessage.textContent = '✅ البريد الإلكتروني صالح.';
        newEmailHint.className = 'format-hint success';
        return true;
    }

    // ===== التحقق من عدم استخدام البريد =====
    async function checkEmailExists(email) {
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const { data, error } = await supabase
                .from('auth_register')
                .select('email')
                .eq('email', normalizedEmail)
                .maybeSingle();
            if (error) {
                console.warn('⚠️ فشل التحقق من البريد في auth_register:', error);
                return null;
            }
            return !!data;
        } catch (err) {
            console.error('خطأ في التحقق من البريد:', err);
            return null;
        }
    }

    // ===== إرسال رمز التحقق إلى البريد الحالي =====
    async function sendOtp() {
        console.log('🟢 sendOtp تم استدعاؤها');

        if (!supabase || !currentUser) {
            showAlert('لم يتم تهيئة الاتصال. يرجى تحديث الصفحة.', 'error');
            return;
        }

        if (isSendingOtp) return;
        if (timerInterval) {
            showAlert('يرجى الانتظار حتى انتهاء المؤقت.', 'error');
            return;
        }

        const newEmail = newEmailInput.value.trim();
        if (!newEmail) {
            showAlert('يرجى إدخال البريد الإلكتروني الجديد.', 'error');
            newEmailInput.focus();
            return;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(newEmail)) {
            showAlert('صيغة البريد الإلكتروني غير صحيحة.', 'error');
            newEmailInput.focus();
            return;
        }

        const exists = await checkEmailExists(newEmail);
        if (exists === true) {
            showAlert('✖ هذا البريد الإلكتروني مستخدم مسبقاً.', 'error');
            newEmailInput.focus();
            return;
        } else if (exists === null) {
            showAlert('تعذر التحقق من البريد الإلكتروني. حاول مرة أخرى.', 'error');
            return;
        }

        newEmailValue = newEmail;

        const email = currentUser?.email;
        if (!email) {
            showAlert('البريد الإلكتروني للمستخدم غير متوفر. يرجى تسجيل الدخول مرة أخرى.', 'error');
            return;
        }

        isSendingOtp = true;
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            console.log('📧 جاري إرسال OTP إلى:', email);
            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: { shouldCreateUser: false }
            });

            if (error) {
                if (error.status === 429 || error.message.includes('rate limit') || error.message.includes('wait')) {
                    const match = error.message.match(/(\d+)\s*seconds?/);
                    let waitTime = 60;
                    if (match) waitTime = parseInt(match[1]) || 60;
                    showAlert(`⏳ تم تجاوز عدد المحاولات. يرجى الانتظار ${waitTime} ثانية ثم المحاولة مرة أخرى.`, 'error');
                    sendOtpBtn.disabled = true;
                    setTimeout(() => {
                        sendOtpBtn.disabled = false;
                        sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
                    }, waitTime * 1000 + 1000);
                    return;
                }
                throw error;
            }

            showAlert('✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني الحالي.', 'success');
            
            otpVerifyGroup.style.display = 'block';
            otpCode.disabled = false;
            otpCode.value = '';
            otpCode.focus();
            otpIcon.className = 'validation-icon';
            otpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك الحالي';
            otpHint.className = 'format-hint';
            attemptCount = 0;

            otpSendGroup.style.display = 'none';
            startTimer();

        } catch (err) {
            console.error('❌ فشل إرسال الرمز:', err);
            let msg = 'فشل إرسال الرمز. حاول مرة أخرى.';
            if (err.message.includes('rate limit')) msg = 'تم تجاوز عدد المحاولات. انتظر بضع دقائق.';
            if (err.message.includes('Failed to fetch')) msg = 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
            showAlert(msg, 'error');
            sendOtpBtn.style.display = 'block';
            timerContainer.style.display = 'none';
        } finally {
            isSendingOtp = false;
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
        }
    }

    // ===== التحقق من رمز OTP =====
    async function verifyOtp() {
        if (isVerifying) return;

        const otp = otpCode.value.trim();
        if (otp.length !== 8) {
            otpIcon.className = 'validation-icon error';
            otpIcon.innerHTML = '✖';
            otpMessage.textContent = 'يرجى إدخال رمز مكون من 8 أرقام.';
            otpHint.className = 'format-hint error';
            return;
        }

        if (attemptCount >= MAX_ATTEMPTS) {
            showAlert('⚠️ تم تجاوز عدد المحاولات المسموح بها (5 محاولات). يرجى طلب رمز جديد.', 'error');
            otpCode.disabled = true;
            sendOtpBtn.style.display = 'block';
            timerContainer.style.display = 'none';
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            return;
        }

        isVerifying = true;
        otpCode.disabled = true;
        otpIcon.className = 'validation-icon loading';
        otpMessage.textContent = 'جارٍ التحقق من الرمز…';
        otpHint.className = 'format-hint';

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: currentUser.email,
                token: otp,
                type: 'email'
            });

            if (error) {
                attemptCount++;
                throw error;
            }

            otpIcon.className = 'validation-icon success';
            otpIcon.innerHTML = '✔';
            otpMessage.textContent = '✅ تم التحقق من الرمز بنجاح.';
            otpHint.className = 'format-hint success';

            saveGroup.style.display = 'block';
            saveEmailBtn.disabled = false;
            showAlert('✅ تم التحقق من الرمز بنجاح.', 'success');

            otpCode.disabled = true;

        } catch (err) {
            console.error(err);
            let msg = 'رمز التحقق غير صحيح.';
            if (err.message.includes('expired')) {
                msg = 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
                sendOtpBtn.style.display = 'block';
                timerContainer.style.display = 'none';
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
            } else if (err.message.includes('invalid')) {
                msg = `رمز التحقق غير صحيح. تبقى ${MAX_ATTEMPTS - attemptCount} محاولة.`;
            }
            otpIcon.className = 'validation-icon error';
            otpIcon.innerHTML = '✖';
            otpMessage.textContent = msg;
            otpHint.className = 'format-hint error';
            otpCode.disabled = false;
            otpCode.value = '';
            otpCode.focus();
            saveGroup.style.display = 'none';
            saveEmailBtn.disabled = true;
        } finally {
            isVerifying = false;
            if (attemptCount >= MAX_ATTEMPTS) {
                otpCode.disabled = true;
                sendOtpBtn.style.display = 'block';
                timerContainer.style.display = 'none';
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
            }
        }
    }

    // ===== مؤقت إعادة الإرسال =====
    function startTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerContainer.style.display = 'block';
        let seconds = 300;
        timerDisplay.textContent = '05:00';
        timerInterval = setInterval(() => {
            seconds--;
            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            timerDisplay.textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
            if (seconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                timerContainer.style.display = 'none';
                sendOtpBtn.style.display = 'block';
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
            }
        }, 1000);
    }

    // ===== حفظ التغييرات =====
    async function saveEmail() {
        if (isSaving) return;

        if (!newEmailValue) {
            showAlert('يرجى إدخال البريد الإلكتروني الجديد.', 'error');
            return;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(newEmailValue)) {
            showAlert('صيغة البريد الإلكتروني غير صحيحة.', 'error');
            return;
        }

        isSaving = true;
        saveEmailBtn.disabled = true;
        saveEmailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            const exists = await checkEmailExists(newEmailValue);
            if (exists === true) {
                throw new Error('البريد الإلكتروني مستخدم مسبقاً.');
            }

            const { error } = await supabase.auth.updateUser({
                email: newEmailValue
            });
            if (error) {
                if (error.message.includes('already been taken')) {
                    throw new Error('البريد الإلكتروني مستخدم مسبقاً.');
                }
                if (error.message.includes('invalid format')) {
                    throw new Error('صيغة البريد الإلكتروني غير صحيحة.');
                }
                throw error;
            }

            try {
                await supabase
                    .from('auth_register')
                    .update({
                        email: newEmailValue,
                        email_changed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', currentUser.id);
            } catch (e) {
                console.warn('⚠️ فشل تحديث auth_register:', e);
            }

            try {
                await supabase
                    .from('security_logs')
                    .insert({
                        user_id: currentUser.id,
                        action: 'email_change',
                        old_email: currentUser.email,
                        new_email: newEmailValue,
                        ip_address: '',
                        user_agent: navigator.userAgent,
                        status: 'success',
                        created_at: new Date().toISOString()
                    });
            } catch (e) {
                console.warn('⚠️ فشل تسجيل السجل الأمني:', e);
            }

            showAlert('✅ تم تغيير البريد الإلكتروني بنجاح.', 'success');
            showSuccessModal();

            const { data: { user } } = await supabase.auth.getUser();
            currentUser = user;
            updateHeaderUI(currentUser);

            setTimeout(() => resetForm(), 1000);

        } catch (err) {
            console.error(err);
            let msg = 'حدث خطأ أثناء حفظ البيانات.';
            if (err.message.includes('already been taken')) msg = 'البريد الإلكتروني مستخدم مسبقاً.';
            else if (err.message.includes('invalid format')) msg = 'صيغة البريد الإلكتروني غير صحيحة.';
            else if (err.message.includes('email')) msg = 'البريد الإلكتروني غير صالح.';
            else if (err.message.includes('session')) {
                msg = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.';
            } else if (err.message.includes('Network') || err.message.includes('Failed to fetch')) {
                msg = 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
            }
            showErrorModal(msg);
        } finally {
            isSaving = false;
            saveEmailBtn.disabled = false;
            saveEmailBtn.innerHTML = '<i class="fas fa-save"></i> حفظ تغيير البريد الإلكتروني';
        }
    }

    // ===== إعادة تعيين النموذج =====
    function resetForm() {
        newEmailInput.value = '';
        newEmailInput.disabled = false;
        newEmailIcon.className = 'validation-icon';
        newEmailMessage.textContent = 'أدخل البريد الإلكتروني الجديد';
        newEmailHint.className = 'format-hint';

        otpCode.value = '';
        otpCode.disabled = true;
        otpIcon.className = 'validation-icon';
        otpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك الحالي';
        otpHint.className = 'format-hint';

        otpSendGroup.style.display = 'block';
        otpVerifyGroup.style.display = 'none';
        saveGroup.style.display = 'none';
        saveEmailBtn.disabled = true;

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerContainer.style.display = 'none';
        sendOtpBtn.style.display = 'block';
        sendOtpBtn.disabled = false;
        sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';

        attemptCount = 0;
        newEmailValue = '';

        alertBox.classList.remove('show');
        alertBox.style.display = 'none';
    }

    // ===== تهيئة الصفحة =====
    async function initPage() {
        if (initialized) return;
        initialized = true;

        const success = await initSupabase();
        if (!success || !currentUser) {
            showErrorModal('لم يتم التعرف على جلسة المستخدم أو تعذر الاتصال بالخادم. يرجى تسجيل الدخول مرة أخرى.');
            const retryBtn = document.getElementById('errorRetryBtn');
            if (retryBtn) {
                retryBtn.textContent = 'تسجيل الدخول';
                retryBtn.onclick = function() {
                    window.location.replace('/auth/auth/login/login.html');
                };
            }
            return;
        }

        const retryBtn = document.getElementById('errorRetryBtn');
        if (retryBtn) {
            retryBtn.textContent = 'إعادة المحاولة';
            retryBtn.onclick = function() {
                hideErrorModal();
                resetForm();
                initSupabase().then(() => {
                    if (!currentUser) {
                        window.location.replace('/auth/auth/login/login.html');
                    }
                });
            };
        }

        currentEmailDisplay.value = currentUser.email || '';
        updateHeaderUI(currentUser);

        sendOtpBtn.addEventListener('click', sendOtp);

        newEmailInput.addEventListener('input', function() {
            validateNewEmail();
        });

        otpCode.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length === 8) {
                verifyOtp();
            }
        });

        saveEmailBtn.addEventListener('click', saveEmail);

        errorCloseBtn.addEventListener('click', hideErrorModal);

        resetForm();
        console.log('✅ صفحة تغيير البريد الإلكتروني جاهزة.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }

})();
