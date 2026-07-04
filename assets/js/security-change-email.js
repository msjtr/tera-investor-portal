/**
 * security-change-email.js
 * تغيير البريد الإلكتروني – مرحلتان:
 * 1. التحقق من البريد الحالي (OTP عبر Magic Link)
 * 2. تأكيد البريد الجديد (OTP عبر Change email address)
 * مع تسجيل email_changed_at في قاعدة البيانات
 */

'use strict';

(function() {
    let supabase = null;
    let currentUser = null;
    let isOldEmailVerified = false;
    let isNewEmailVerified = false;
    let timerIntervalOld = null;
    let timerIntervalNew = null;
    let isSendingOldOtp = false;
    let isSendingNewOtp = false;
    let isSaving = false;
    let initialized = false;
    let newEmailValue = '';

    // ===== عناصر DOM =====
    const currentEmailDisplay = document.getElementById('currentEmailDisplay');
    const sendOldOtpBtn = document.getElementById('sendOldOtpBtn');
    const oldOtpCode = document.getElementById('oldOtpCode');
    const oldOtpHint = document.getElementById('oldOtpHint');
    const oldOtpIcon = document.getElementById('oldOtpIcon');
    const oldOtpMessage = document.getElementById('oldOtpMessage');
    const timerContainerOld = document.getElementById('timerContainerOld');
    const timerDisplayOld = document.getElementById('timerDisplayOld');

    const newEmailInput = document.getElementById('newEmail');
    const newEmailHint = document.getElementById('newEmailHint');
    const newEmailIcon = document.getElementById('newEmailIcon');
    const newEmailMessage = document.getElementById('newEmailMessage');

    const sendNewOtpBtn = document.getElementById('sendNewOtpBtn');
    const newOtpCode = document.getElementById('newOtpCode');
    const newOtpHint = document.getElementById('newOtpHint');
    const newOtpIcon = document.getElementById('newOtpIcon');
    const newOtpMessage = document.getElementById('newOtpMessage');
    const timerContainerNew = document.getElementById('timerContainerNew');
    const timerDisplayNew = document.getElementById('timerDisplayNew');

    const newEmailVerifyGroup = document.getElementById('newEmailVerifyGroup');
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
        const email = newEmailInput.value.trim();
        const currentEmail = currentUser?.email || '';

        if (!email) {
            newEmailIcon.className = 'validation-icon';
            newEmailMessage.textContent = 'أدخل البريد الإلكتروني الجديد';
            newEmailHint.className = 'format-hint';
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

        if (email.toLowerCase() === currentEmail.toLowerCase()) {
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
            const { data, error } = await supabase
                .from('auth_register')
                .select('email')
                .eq('email', email)
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

    // ===== إرسال رمز التحقق إلى البريد الحالي (OTP) =====
    async function sendOldOtp() {
        if (isSendingOldOtp) return;
        if (timerIntervalOld) {
            showAlert('يرجى الانتظار حتى انتهاء المؤقت.', 'error');
            return;
        }

        const email = currentUser?.email;
        if (!email) {
            showAlert('البريد الإلكتروني غير متوفر.', 'error');
            return;
        }

        isSendingOldOtp = true;
        sendOldOtpBtn.disabled = true;
        sendOldOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: { shouldCreateUser: false }
            });
            if (error) throw error;

            showAlert('✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني الحالي.', 'success');
            oldOtpCode.disabled = false;
            oldOtpCode.value = '';
            oldOtpCode.focus();
            oldOtpIcon.className = 'validation-icon';
            oldOtpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك الحالي';
            oldOtpHint.className = 'format-hint';

            startTimer('old');
            sendOldOtpBtn.style.display = 'none';
            timerContainerOld.style.display = 'block';

        } catch (err) {
            console.error(err);
            let msg = 'فشل إرسال الرمز. حاول مرة أخرى.';
            if (err.message.includes('rate limit')) msg = 'تم تجاوز عدد المحاولات. انتظر بضع دقائق.';
            showAlert(msg, 'error');
            sendOldOtpBtn.style.display = 'block';
            timerContainerOld.style.display = 'none';
        } finally {
            isSendingOldOtp = false;
            sendOldOtpBtn.disabled = false;
            sendOldOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق إلى البريد الإلكتروني الحالي';
            if (timerIntervalOld) {
                sendOldOtpBtn.style.display = 'none';
                timerContainerOld.style.display = 'block';
            } else {
                sendOldOtpBtn.style.display = 'block';
                timerContainerOld.style.display = 'none';
            }
        }
    }

    // ===== التحقق من رمز البريد الحالي =====
    async function verifyOldOtp() {
        const otp = oldOtpCode.value.trim();
        if (otp.length !== 8) {
            oldOtpIcon.className = 'validation-icon error';
            oldOtpIcon.innerHTML = '✖';
            oldOtpMessage.textContent = 'يرجى إدخال رمز مكون من 8 أرقام.';
            oldOtpHint.className = 'format-hint error';
            return;
        }

        const email = currentUser?.email;
        if (!email) {
            showAlert('البريد الإلكتروني غير متوفر.', 'error');
            return;
        }

        oldOtpIcon.className = 'validation-icon loading';
        oldOtpMessage.textContent = 'جارٍ التحقق من الرمز…';
        oldOtpHint.className = 'format-hint';

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: email,
                token: otp,
                type: 'email'
            });
            if (error) throw error;

            oldOtpIcon.className = 'validation-icon success';
            oldOtpIcon.innerHTML = '✔';
            oldOtpMessage.textContent = 'تم التحقق من ملكية البريد الإلكتروني الحالي بنجاح.';
            oldOtpHint.className = 'format-hint success';
            isOldEmailVerified = true;
            oldOtpCode.disabled = true;

            newEmailInput.disabled = false;
            newEmailInput.focus();
            newEmailMessage.textContent = 'أدخل البريد الإلكتروني الجديد';
            newEmailIcon.className = 'validation-icon';
            newEmailHint.className = 'format-hint';

            showAlert('✅ تم التحقق من البريد الإلكتروني الحالي.', 'success');

        } catch (err) {
            console.error(err);
            let msg = 'رمز التحقق غير صحيح.';
            if (err.message.includes('expired')) msg = 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
            else if (err.message.includes('invalid')) msg = 'رمز التحقق غير صحيح. حاول مرة أخرى.';
            oldOtpIcon.className = 'validation-icon error';
            oldOtpIcon.innerHTML = '✖';
            oldOtpMessage.textContent = msg;
            oldOtpHint.className = 'format-hint error';
            isOldEmailVerified = false;
            if (!timerIntervalOld) {
                sendOldOtpBtn.style.display = 'block';
                timerContainerOld.style.display = 'none';
                sendOldOtpBtn.disabled = false;
                sendOldOtpBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
            }
        }
    }

    // ===== إرسال رمز OTP إلى البريد الجديد =====
    async function sendNewOtp() {
        if (isSendingNewOtp) return;
        if (timerIntervalNew) {
            showAlert('يرجى الانتظار حتى انتهاء المؤقت.', 'error');
            return;
        }

        if (!isOldEmailVerified) {
            showAlert('يرجى التحقق من البريد الإلكتروني الحالي أولاً.', 'error');
            return;
        }

        const newEmail = newEmailInput.value.trim();
        if (!newEmail) {
            showAlert('يرجى إدخال البريد الإلكتروني الجديد.', 'error');
            newEmailInput.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            showAlert('صيغة البريد الإلكتروني غير صحيحة.', 'error');
            newEmailInput.focus();
            return;
        }

        if (newEmail.toLowerCase() === currentUser.email.toLowerCase()) {
            showAlert('البريد الإلكتروني الجديد مطابق للبريد الحالي.', 'error');
            newEmailInput.focus();
            return;
        }

        // التحقق من عدم استخدام البريد مسبقاً
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

        isSendingNewOtp = true;
        sendNewOtpBtn.disabled = true;
        sendNewOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            // إرسال OTP إلى البريد الجديد (يستخدم قالب Change email address مع {{ .Token }})
            const { error } = await supabase.auth.signInWithOtp({
                email: newEmail,
                options: { shouldCreateUser: true }
            });
            if (error) {
                if (error.message && error.message.includes('Signups not allowed')) {
                    showErrorModal('⚠️ عذراً، إرسال رمز التحقق إلى البريد الجديد غير متاح حالياً بسبب إعدادات النظام.<br/>يرجى التواصل مع الدعم الفني أو تمكين التسجيل في إعدادات Supabase.');
                    return;
                }
                throw error;
            }

            showAlert('✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني الجديد. يرجى إدخال الرمز المكون من 8 أرقام.', 'success');
            if (newOtpCode) {
                newOtpCode.disabled = false;
                newOtpCode.value = '';
                newOtpCode.focus();
            }
            if (newOtpIcon) {
                newOtpIcon.className = 'validation-icon';
                newOtpIcon.innerHTML = '';
            }
            if (newOtpMessage) {
                newOtpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك الجديد';
            }
            if (newOtpHint) {
                newOtpHint.className = 'format-hint';
            }

            startTimer('new');
            if (sendNewOtpBtn) sendNewOtpBtn.style.display = 'none';
            if (timerContainerNew) timerContainerNew.style.display = 'block';

        } catch (err) {
            console.error(err);
            let msg = 'فشل إرسال الرمز. حاول مرة أخرى.';
            if (err.message.includes('rate limit')) msg = 'تم تجاوز عدد المحاولات. انتظر بضع دقائق.';
            showAlert(msg, 'error');
            if (sendNewOtpBtn) sendNewOtpBtn.style.display = 'block';
            if (timerContainerNew) timerContainerNew.style.display = 'none';
        } finally {
            isSendingNewOtp = false;
            if (sendNewOtpBtn) {
                sendNewOtpBtn.disabled = false;
                sendNewOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق إلى البريد الإلكتروني الجديد';
            }
            if (timerIntervalNew) {
                sendNewOtpBtn.style.display = 'none';
                timerContainerNew.style.display = 'block';
            } else {
                sendNewOtpBtn.style.display = 'block';
                timerContainerNew.style.display = 'none';
            }
        }
    }

    // ===== التحقق من رمز البريد الجديد =====
    async function verifyNewOtp() {
        if (!newOtpCode) return;
        const otp = newOtpCode.value.trim();
        if (otp.length !== 8) {
            if (newOtpIcon) {
                newOtpIcon.className = 'validation-icon error';
                newOtpIcon.innerHTML = '✖';
            }
            if (newOtpMessage) {
                newOtpMessage.textContent = 'يرجى إدخال رمز مكون من 8 أرقام.';
            }
            if (newOtpHint) {
                newOtpHint.className = 'format-hint error';
            }
            return;
        }

        const newEmail = newEmailValue || (newEmailInput ? newEmailInput.value.trim() : '');
        if (!newEmail) {
            showAlert('البريد الإلكتروني الجديد غير متوفر.', 'error');
            return;
        }

        if (newOtpIcon) {
            newOtpIcon.className = 'validation-icon loading';
            newOtpIcon.innerHTML = '';
        }
        if (newOtpMessage) {
            newOtpMessage.textContent = 'جارٍ التحقق من الرمز…';
        }
        if (newOtpHint) {
            newOtpHint.className = 'format-hint';
        }

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: newEmail,
                token: otp,
                type: 'email'
            });

            if (error) throw error;

            if (newOtpIcon) {
                newOtpIcon.className = 'validation-icon success';
                newOtpIcon.innerHTML = '✔';
            }
            if (newOtpMessage) {
                newOtpMessage.textContent = 'تم التحقق من البريد الإلكتروني الجديد بنجاح.';
            }
            if (newOtpHint) {
                newOtpHint.className = 'format-hint success';
            }
            isNewEmailVerified = true;
            if (newOtpCode) newOtpCode.disabled = true;

            if (saveGroup) saveGroup.style.display = 'block';
            showAlert('✅ تم التحقق من البريد الإلكتروني الجديد.', 'success');

        } catch (err) {
            console.error(err);
            let msg = 'رمز التحقق غير صحيح.';
            if (err.message.includes('expired')) msg = 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
            else if (err.message.includes('invalid')) msg = 'رمز التحقق غير صحيح. حاول مرة أخرى.';
            if (newOtpIcon) {
                newOtpIcon.className = 'validation-icon error';
                newOtpIcon.innerHTML = '✖';
            }
            if (newOtpMessage) {
                newOtpMessage.textContent = msg;
            }
            if (newOtpHint) {
                newOtpHint.className = 'format-hint error';
            }
            isNewEmailVerified = false;
            if (saveGroup) saveGroup.style.display = 'none';
            if (!timerIntervalNew) {
                if (sendNewOtpBtn) {
                    sendNewOtpBtn.style.display = 'block';
                    sendNewOtpBtn.disabled = false;
                    sendNewOtpBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
                }
                if (timerContainerNew) timerContainerNew.style.display = 'none';
            }
        }
    }

    // ===== مؤقت =====
    function startTimer(type) {
        const timerDisplay = type === 'old' ? timerDisplayOld : timerDisplayNew;
        const timerContainer = type === 'old' ? timerContainerOld : timerContainerNew;
        const sendBtn = type === 'old' ? sendOldOtpBtn : sendNewOtpBtn;
        const intervalVar = type === 'old' ? 'timerIntervalOld' : 'timerIntervalNew';

        if (window[intervalVar]) clearInterval(window[intervalVar]);
        let seconds = 300;
        if (timerDisplay) timerDisplay.textContent = '05:00';
        window[intervalVar] = setInterval(() => {
            seconds--;
            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            if (timerDisplay) timerDisplay.textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
            if (seconds <= 0) {
                clearInterval(window[intervalVar]);
                window[intervalVar] = null;
                if (sendBtn) {
                    sendBtn.style.display = 'block';
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
                }
                if (timerContainer) timerContainer.style.display = 'none';
            }
        }, 1000);
    }

    // ===== حفظ التغييرات =====
    async function saveEmail() {
        if (isSaving) return;
        if (!isOldEmailVerified) {
            showAlert('يرجى التحقق من البريد الإلكتروني الحالي أولاً.', 'error');
            return;
        }
        if (!isNewEmailVerified) {
            showAlert('يرجى التحقق من البريد الإلكتروني الجديد أولاً.', 'error');
            return;
        }

        const newEmail = newEmailValue || (newEmailInput ? newEmailInput.value.trim() : '');
        if (!newEmail) {
            showAlert('البريد الإلكتروني الجديد غير متوفر.', 'error');
            return;
        }

        isSaving = true;
        if (saveEmailBtn) {
            saveEmailBtn.disabled = true;
            saveEmailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            // تحديث البريد الإلكتروني في Auth
            const { error } = await supabase.auth.updateUser({
                email: newEmail
            });
            if (error) {
                if (error.message.includes('already been taken')) {
                    throw new Error('البريد الإلكتروني مستخدم مسبقاً.');
                }
                throw error;
            }

            // تحديث email_changed_at في جدول auth_register
            try {
                const now = new Date().toISOString();
                await supabase
                    .from('auth_register')
                    .update({
                        email_changed_at: now,
                        updated_at: now
                    })
                    .eq('user_id', currentUser.id);
                console.log('✅ تم تحديث email_changed_at في قاعدة البيانات');
            } catch (e) {
                console.warn('⚠️ فشل تحديث email_changed_at:', e);
            }

            showAlert('✅ تم تغيير البريد الإلكتروني بنجاح.', 'success');
            showSuccessModal();
            setTimeout(() => {
                resetForm();
            }, 1000);

        } catch (err) {
            console.error(err);
            let msg = 'حدث خطأ أثناء حفظ البيانات.';
            if (err.message.includes('already been taken')) msg = 'البريد الإلكتروني مستخدم مسبقاً.';
            else if (err.message.includes('email')) msg = 'البريد الإلكتروني غير صالح.';
            else if (err.message.includes('session')) {
                msg = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.';
                isOldEmailVerified = false;
                isNewEmailVerified = false;
                if (saveGroup) saveGroup.style.display = 'none';
            } else if (err.message.includes('Network')) msg = 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
            showErrorModal(msg);
        } finally {
            isSaving = false;
            if (saveEmailBtn) {
                saveEmailBtn.disabled = false;
                saveEmailBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات';
            }
        }
    }

    // ===== إعادة تعيين النموذج =====
    function resetForm() {
        if (oldOtpCode) {
            oldOtpCode.value = '';
            oldOtpCode.disabled = true;
        }
        if (oldOtpIcon) {
            oldOtpIcon.className = 'validation-icon';
            oldOtpIcon.innerHTML = '';
        }
        if (oldOtpMessage) {
            oldOtpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك الحالي';
        }
        if (oldOtpHint) {
            oldOtpHint.className = 'format-hint';
        }
        if (timerContainerOld) {
            timerContainerOld.style.display = 'none';
        }
        if (sendOldOtpBtn) {
            sendOldOtpBtn.style.display = 'block';
            sendOldOtpBtn.disabled = false;
            sendOldOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق إلى البريد الإلكتروني الحالي';
        }

        if (newEmailInput) {
            newEmailInput.value = '';
            newEmailInput.disabled = true;
        }
        if (newEmailIcon) {
            newEmailIcon.className = 'validation-icon';
            newEmailIcon.innerHTML = '';
        }
        if (newEmailMessage) {
            newEmailMessage.textContent = 'يجب التحقق من البريد الحالي أولاً';
        }
        if (newEmailHint) {
            newEmailHint.className = 'format-hint';
        }

        if (newOtpCode) {
            newOtpCode.value = '';
            newOtpCode.disabled = true;
        }
        if (newOtpIcon) {
            newOtpIcon.className = 'validation-icon';
            newOtpIcon.innerHTML = '';
        }
        if (newOtpMessage) {
            newOtpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك الجديد';
        }
        if (newOtpHint) {
            newOtpHint.className = 'format-hint';
        }
        if (sendNewOtpBtn) {
            sendNewOtpBtn.style.display = 'block';
            sendNewOtpBtn.disabled = false;
            sendNewOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق إلى البريد الإلكتروني الجديد';
        }
        if (timerContainerNew) {
            timerContainerNew.style.display = 'none';
        }
        if (newEmailVerifyGroup) {
            newEmailVerifyGroup.style.display = 'none';
        }
        if (saveGroup) {
            saveGroup.style.display = 'none';
        }

        if (timerIntervalOld) {
            clearInterval(timerIntervalOld);
            timerIntervalOld = null;
        }
        if (timerIntervalNew) {
            clearInterval(timerIntervalNew);
            timerIntervalNew = null;
        }

        isOldEmailVerified = false;
        isNewEmailVerified = false;
        newEmailValue = '';

        if (alertBox) {
            alertBox.classList.remove('show');
            alertBox.style.display = 'none';
        }
    }

    // ===== تهيئة الصفحة =====
    async function initPage() {
        if (initialized) return;
        initialized = true;

        const success = await initSupabase();
        if (!success || !currentUser) {
            showErrorModal('لم يتم التعرف على جلسة المستخدم. يرجى تسجيل الدخول مرة أخرى.');
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
            };
        }

        if (currentEmailDisplay) {
            currentEmailDisplay.value = currentUser.email || '';
        }
        updateHeaderUI(currentUser);

        // ===== ربط الأحداث =====
        if (sendOldOtpBtn) {
            sendOldOtpBtn.addEventListener('click', sendOldOtp);
        }

        if (oldOtpCode) {
            oldOtpCode.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '');
                if (this.value.length === 8) {
                    verifyOldOtp();
                }
            });
        }

        if (newEmailInput) {
            newEmailInput.addEventListener('input', function() {
                if (isOldEmailVerified) {
                    const isValid = validateNewEmail();
                    if (isValid) {
                        if (newEmailVerifyGroup) newEmailVerifyGroup.style.display = 'block';
                    } else {
                        if (newEmailVerifyGroup) newEmailVerifyGroup.style.display = 'none';
                    }
                }
            });
        }

        if (sendNewOtpBtn) {
            sendNewOtpBtn.addEventListener('click', sendNewOtp);
        }

        if (newOtpCode) {
            newOtpCode.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '');
                if (this.value.length === 8) {
                    verifyNewOtp();
                }
            });
        }

        if (saveEmailBtn) {
            saveEmailBtn.addEventListener('click', saveEmail);
        }

        if (errorCloseBtn) {
            errorCloseBtn.addEventListener('click', hideErrorModal);
        }

        resetForm();
        console.log('✅ صفحة تغيير البريد الإلكتروني جاهزة (OTP للبريد الجديد).');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }

})();
