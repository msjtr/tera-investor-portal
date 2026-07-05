/**
 * security-change-password.js
 * تغيير كلمة المرور – مع إصلاح مشكلة جلب البريد الإلكتروني
 * متوافق مع security.js و TeraAuth
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
    let attemptCount = 0;
    const MAX_ATTEMPTS = 5;

    // ===== عناصر DOM =====
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
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

    // ===== عرض البريد الإلكتروني في الصفحة =====
    function displayUserEmail(email) {
        // تحديث الهيدر
        const headerName = document.getElementById('headerUserName');
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerName && email) {
            const name = currentUser?.user_metadata?.full_name || email.split('@')[0] || 'مستخدم';
            headerName.textContent = name;
        }
        if (headerAvatar && email) {
            const initial = (currentUser?.user_metadata?.full_name || email.split('@')[0] || 'م').charAt(0).toUpperCase();
            headerAvatar.textContent = initial;
        }

        // ✅ تحديث حقل البريد الإلكتروني الظاهر في النموذج (الإصلاح)
        const userEmailInput = document.getElementById('userEmail');
        if (userEmailInput && email) {
            userEmailInput.value = email;
        }

        // تحديث البريد الإلكتروني في الحقل المخصص (إن وجد، للتوافق مع إصدارات سابقة)
        const emailDisplay = document.getElementById('currentEmailDisplay');
        if (emailDisplay && email) {
            emailDisplay.value = email;
        }
    }

    // ===== جلب المستخدم من مصادر متعددة =====
    async function fetchUser() {
        console.log('🔍 [Change Password] محاولة جلب المستخدم...');

        // 1. محاولة استخدام SecurityCore
        if (window.SecurityCore) {
            try {
                if (!window.SecurityCore._initialized) {
                    await window.SecurityCore.init();
                }
                if (window.SecurityCore.currentUser) {
                    console.log('✅ [Change Password] تم جلب المستخدم من SecurityCore');
                    return window.SecurityCore.currentUser;
                }
                if (window.SecurityCore.supabase) {
                    const { data: { user } } = await window.SecurityCore.supabase.auth.getUser();
                    if (user) {
                        console.log('✅ [Change Password] تم جلب المستخدم عبر SecurityCore.supabase');
                        return user;
                    }
                }
            } catch (e) {
                console.warn('⚠️ [Change Password] فشل SecurityCore:', e);
            }
        }

        // 2. محاولة استخدام TeraAuth
        if (window.TeraAuth) {
            try {
                if (!window.TeraAuth._initialized) {
                    await window.TeraAuth.init();
                }
                if (window.TeraAuth._client) {
                    const user = await window.TeraAuth.getUser();
                    if (user) {
                        console.log('✅ [Change Password] تم جلب المستخدم من TeraAuth');
                        return user;
                    }
                }
            } catch (e) {
                console.warn('⚠️ [Change Password] فشل TeraAuth:', e);
            }
        }

        // 3. محاولة استخدام waitForSupabase
        if (typeof waitForSupabase === 'function') {
            try {
                const client = await waitForSupabase();
                if (client) {
                    const { data: { user } } = await client.auth.getUser();
                    if (user) {
                        supabase = client;
                        console.log('✅ [Change Password] تم جلب المستخدم عبر waitForSupabase');
                        return user;
                    }
                }
            } catch (e) {
                console.warn('⚠️ [Change Password] فشل waitForSupabase:', e);
            }
        }

        // 4. محاولة استخدام window.teraSupabase
        if (window.teraSupabase) {
            try {
                const { data: { user } } = await window.teraSupabase.auth.getUser();
                if (user) {
                    supabase = window.teraSupabase;
                    console.log('✅ [Change Password] تم جلب المستخدم من window.teraSupabase');
                    return user;
                }
            } catch (e) {
                console.warn('⚠️ [Change Password] فشل window.teraSupabase:', e);
            }
        }

        // 5. محاولة جلب الجلسة من localStorage (كحل أخير)
        try {
            const sessionStr = localStorage.getItem('sb-ucmzavrsgkfpypgewpbd-auth-token');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                if (session && session.user) {
                    console.log('✅ [Change Password] تم جلب المستخدم من localStorage');
                    return session.user;
                }
            }
        } catch (e) {
            console.warn('⚠️ [Change Password] فشل جلب الجلسة من localStorage:', e);
        }

        console.error('❌ [Change Password] فشل جلب المستخدم من جميع المصادر');
        return null;
    }

    // ===== تهيئة Supabase وجلب المستخدم =====
    async function initSupabase() {
        try {
            const user = await fetchUser();
            if (user) {
                currentUser = user;
                if (!supabase) {
                    if (window.SecurityCore?.supabase) {
                        supabase = window.SecurityCore.supabase;
                    } else if (window.TeraAuth?._client) {
                        supabase = window.TeraAuth._client;
                    } else if (window.teraSupabase) {
                        supabase = window.teraSupabase;
                    }
                }
                displayUserEmail(user.email);
                return true;
            }
            return false;
        } catch (err) {
            console.error('❌ [Change Password] خطأ في التهيئة:', err);
            return false;
        }
    }

    function updateHeaderUI(user) {
        if (!user) return;
        displayUserEmail(user.email);
    }

    function showAlert(message, type = 'error') {
        if (!alertBox) {
            alert(message);
            return;
        }
        alertBox.className = `alert-box show ${type}`;
        alertIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        alertMessage.textContent = message;
        alertBox.style.display = 'flex';
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            alertBox.style.display = 'none';
            alertBox.className = 'alert-box';
        }, 7000);
    }

    function showErrorModal(message) {
        if (!errorModal) return;
        errorMessage.textContent = message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
        errorModal.classList.add('show');
        errorModal.style.display = 'flex';
    }

    function hideErrorModal() {
        if (errorModal) {
            errorModal.classList.remove('show');
            errorModal.style.display = 'none';
        }
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
        successGoNow.onclick = function() {
            clearInterval(interval);
            window.location.replace('/pages/dashboard/index.html');
        };
    }

    // ===== إرسال رمز التحقق إلى البريد الحالي =====
    async function sendOtp() {
        if (!supabase || !currentUser) {
            showAlert('لم يتم تهيئة الاتصال. يرجى تحديث الصفحة.', 'error');
            return;
        }

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
        const sendOtpBtn = document.getElementById('sendOtpBtn');
        if (sendOtpBtn) {
            sendOtpBtn.disabled = true;
            sendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
        }

        try {
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
                    if (sendOtpBtn) {
                        sendOtpBtn.disabled = true;
                        setTimeout(() => {
                            sendOtpBtn.disabled = false;
                            sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
                        }, waitTime * 1000 + 1000);
                    }
                    return;
                }
                throw error;
            }

            showAlert('✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني الحالي.', 'success');
            const otpCode = document.getElementById('otpCode');
            if (otpCode) {
                otpCode.disabled = false;
                otpCode.value = '';
                otpCode.focus();
            }
            const otpIcon = document.getElementById('otpIcon');
            const otpMessage = document.getElementById('otpMessage');
            const otpHint = document.getElementById('otpHint');
            if (otpIcon) otpIcon.className = 'validation-icon';
            if (otpMessage) otpMessage.textContent = 'أدخل رمز التحقق المرسل إلى بريدك الحالي';
            if (otpHint) otpHint.className = 'format-hint';

            const otpVerifyGroup = document.getElementById('otpVerifyGroup');
            if (otpVerifyGroup) otpVerifyGroup.style.display = 'block';

            const otpSendGroup = document.getElementById('otpSendGroup');
            if (otpSendGroup) otpSendGroup.style.display = 'none';

            startTimer();

        } catch (err) {
            console.error(err);
            let msg = 'فشل إرسال الرمز. حاول مرة أخرى.';
            if (err.message.includes('rate limit')) msg = 'تم تجاوز عدد المحاولات. انتظر بضع دقائق.';
            if (err.message.includes('Failed to fetch')) msg = 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
            showAlert(msg, 'error');
            if (sendOtpBtn) {
                sendOtpBtn.style.display = 'block';
                const timerContainer = document.getElementById('timerContainer');
                if (timerContainer) timerContainer.style.display = 'none';
            }
        } finally {
            isSendingOtp = false;
            if (sendOtpBtn) {
                if (!timerInterval) {
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق';
                }
            }
        }
    }

    // ===== مؤقت إعادة الإرسال =====
    function startTimer() {
        const timerContainer = document.getElementById('timerContainer');
        const timerDisplay = document.getElementById('timerDisplay');
        const sendOtpBtn = document.getElementById('sendOtpBtn');

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (timerContainer) timerContainer.style.display = 'block';
        let seconds = 300;
        if (timerDisplay) timerDisplay.textContent = '05:00';
        timerInterval = setInterval(() => {
            seconds--;
            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            if (timerDisplay) timerDisplay.textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
            if (seconds <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                if (timerContainer) timerContainer.style.display = 'none';
                if (sendOtpBtn) {
                    sendOtpBtn.style.display = 'block';
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال رمز التحقق';
                }
            }
        }, 1000);
    }

    // ===== التحقق من رمز OTP =====
    async function verifyOtp() {
        if (isVerifying) return;

        const otpCode = document.getElementById('otpCode');
        const otpIcon = document.getElementById('otpIcon');
        const otpMessage = document.getElementById('otpMessage');
        const otpHint = document.getElementById('otpHint');

        if (!otpCode) return;
        const otp = otpCode.value.trim();
        if (otp.length !== 8) {
            if (otpIcon) { otpIcon.className = 'validation-icon error'; otpIcon.innerHTML = '✖'; }
            if (otpMessage) otpMessage.textContent = 'يرجى إدخال رمز مكون من 8 أرقام.';
            if (otpHint) otpHint.className = 'format-hint error';
            return;
        }

        if (attemptCount >= MAX_ATTEMPTS) {
            showAlert('⚠️ تم تجاوز عدد المحاولات المسموح بها (5 محاولات). يرجى طلب رمز جديد.', 'error');
            otpCode.disabled = true;
            const sendOtpBtn = document.getElementById('sendOtpBtn');
            if (sendOtpBtn) {
                sendOtpBtn.style.display = 'block';
                const timerContainer = document.getElementById('timerContainer');
                if (timerContainer) timerContainer.style.display = 'none';
            }
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            return;
        }

        isVerifying = true;
        otpCode.disabled = true;
        if (otpIcon) { otpIcon.className = 'validation-icon loading'; }
        if (otpMessage) otpMessage.textContent = 'جارٍ التحقق من الرمز…';
        if (otpHint) otpHint.className = 'format-hint';

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

            if (otpIcon) { otpIcon.className = 'validation-icon success'; otpIcon.innerHTML = '✔'; }
            if (otpMessage) otpMessage.textContent = '✅ تم التحقق من الرمز بنجاح.';
            if (otpHint) otpHint.className = 'format-hint success';

            const changeBtn = document.getElementById('changePasswordBtn');
            if (changeBtn) {
                changeBtn.disabled = false;
                const saveGroup = document.getElementById('saveGroup');
                if (saveGroup) saveGroup.style.display = 'block';
            }
            showAlert('✅ تم التحقق من الرمز بنجاح.', 'success');

            otpCode.disabled = true;

        } catch (err) {
            console.error(err);
            let msg = 'رمز التحقق غير صحيح.';
            if (err.message.includes('expired')) {
                msg = 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
                const sendOtpBtn = document.getElementById('sendOtpBtn');
                if (sendOtpBtn) {
                    sendOtpBtn.style.display = 'block';
                    const timerContainer = document.getElementById('timerContainer');
                    if (timerContainer) timerContainer.style.display = 'none';
                }
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
            } else if (err.message.includes('invalid')) {
                msg = `رمز التحقق غير صحيح. تبقى ${MAX_ATTEMPTS - attemptCount} محاولة.`;
            }
            if (otpIcon) { otpIcon.className = 'validation-icon error'; otpIcon.innerHTML = '✖'; }
            if (otpMessage) otpMessage.textContent = msg;
            if (otpHint) otpHint.className = 'format-hint error';
            otpCode.disabled = false;
            otpCode.value = '';
            otpCode.focus();
            const saveGroup = document.getElementById('saveGroup');
            if (saveGroup) saveGroup.style.display = 'none';
            const changeBtn = document.getElementById('changePasswordBtn');
            if (changeBtn) changeBtn.disabled = true;
        } finally {
            isVerifying = false;
            if (attemptCount >= MAX_ATTEMPTS) {
                const otpCode = document.getElementById('otpCode');
                if (otpCode) otpCode.disabled = true;
                const sendOtpBtn = document.getElementById('sendOtpBtn');
                if (sendOtpBtn) {
                    sendOtpBtn.style.display = 'block';
                    const timerContainer = document.getElementById('timerContainer');
                    if (timerContainer) timerContainer.style.display = 'none';
                }
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
            }
        }
    }

    // ===== تغيير كلمة المرور =====
    async function changePassword() {
        if (isSaving) return;

        const currentPassword = currentPasswordInput?.value?.trim() || '';
        const newPassword = newPasswordInput?.value?.trim() || '';
        const confirmPassword = confirmPasswordInput?.value?.trim() || '';

        if (!currentPassword) {
            showAlert('يرجى إدخال كلمة المرور الحالية.', 'error');
            currentPasswordInput?.focus();
            return;
        }

        if (newPassword.length < 8) {
            showAlert('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.', 'error');
            newPasswordInput?.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert('تأكيد كلمة المرور غير مطابق.', 'error');
            confirmPasswordInput?.focus();
            return;
        }

        if (currentPassword === newPassword) {
            showAlert('⚠️ كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.', 'error');
            newPasswordInput?.focus();
            newPasswordInput?.select();
            return;
        }

        isSaving = true;
        const btn = document.getElementById('changePasswordBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تغيير كلمة المرور...';
        }

        try {
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: currentUser.email,
                password: currentPassword
            });

            if (verifyError) {
                if (verifyError.message.includes('Invalid login credentials')) {
                    throw new Error('كلمة المرور الحالية غير صحيحة.');
                }
                throw verifyError;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                if (updateError.message.includes('should be different from the old password')) {
                    throw new Error('كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.');
                }
                throw updateError;
            }

            showAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');
            showSuccessModal();

            if (currentPasswordInput) currentPasswordInput.value = '';
            if (newPasswordInput) newPasswordInput.value = '';
            if (confirmPasswordInput) confirmPasswordInput.value = '';

            const strengthFill = document.getElementById('strengthFill');
            const strengthLabel = document.getElementById('strengthLabel');
            if (strengthFill) { strengthFill.style.width = '0%'; strengthFill.style.background = '#e2e8f0'; }
            if (strengthLabel) { strengthLabel.textContent = 'ضعيفة'; strengthLabel.className = 'strength-label'; }

            document.querySelectorAll('#passwordRequirements ul li').forEach(li => {
                li.className = '';
                const icon = li.querySelector('i');
                if (icon) icon.className = 'fas fa-circle';
            });

            if (window.SecurityCore) {
                await window.SecurityCore.refreshUser();
            }

            const saveGroup = document.getElementById('saveGroup');
            if (saveGroup) saveGroup.style.display = 'none';

        } catch (err) {
            console.error(err);
            let msg = 'حدث خطأ أثناء تغيير كلمة المرور.';
            if (err.message.includes('Invalid login credentials')) msg = 'كلمة المرور الحالية غير صحيحة.';
            else if (err.message.includes('should be different from the old password')) msg = '⚠️ كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.';
            else if (err.message.includes('session')) {
                msg = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.';
                setTimeout(() => {
                    window.location.replace('/auth/auth/login/login.html');
                }, 2000);
            } else if (err.message.includes('Network') || err.message.includes('Failed to fetch')) {
                msg = 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
            }
            showErrorModal(msg);
        } finally {
            isSaving = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> تغيير كلمة المرور';
            }
        }
    }

    // ===== فحص قوة كلمة المرور =====
    function validatePasswordStrength() {
        const password = newPasswordInput?.value || '';
        const requirements = {
            length: document.getElementById('req-length'),
            uppercase: document.getElementById('req-uppercase'),
            lowercase: document.getElementById('req-lowercase'),
            number: document.getElementById('req-number'),
            special: document.getElementById('req-special')
        };

        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        let score = 0;
        Object.keys(checks).forEach(key => {
            const el = requirements[key];
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
            const percent = (score / 5) * 100;
            fill.style.width = percent + '%';
            if (score <= 1) {
                fill.style.background = '#dc2626';
                if (label) { label.textContent = 'ضعيفة جداً'; label.className = 'strength-label weak'; }
            } else if (score <= 2) {
                fill.style.background = '#f59e0b';
                if (label) { label.textContent = 'ضعيفة'; label.className = 'strength-label weak'; }
            } else if (score <= 3) {
                fill.style.background = '#fbbf24';
                if (label) { label.textContent = 'متوسطة'; label.className = 'strength-label medium'; }
            } else if (score <= 4) {
                fill.style.background = '#34d399';
                if (label) { label.textContent = 'قوية'; label.className = 'strength-label strong'; }
            } else {
                fill.style.background = '#10b981';
                if (label) { label.textContent = 'قوية جداً'; label.className = 'strength-label very-strong'; }
            }
        }
    }

    function validateConfirmMatch() {
        const newPass = newPasswordInput?.value || '';
        const confirmPass = confirmPasswordInput?.value || '';
        const hint = document.getElementById('confirmPasswordHint');
        if (!hint) return;
        if (confirmPass.length === 0) {
            hint.textContent = 'أعد كتابة كلمة المرور الجديدة';
            hint.style.color = '#64748b';
            return;
        }
        if (newPass === confirmPass) {
            hint.textContent = '✅ كلمة المرور متطابقة';
            hint.style.color = '#16a34a';
        } else {
            hint.textContent = '❌ كلمة المرور غير متطابقة';
            hint.style.color = '#dc2626';
        }
    }

    // ===== تهيئة الصفحة =====
    async function initPage() {
        if (initialized) return;
        initialized = true;

        const success = await initSupabase();
        if (!success || !currentUser) {
            console.error('❌ [Change Password] فشل جلب المستخدم');
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

        updateHeaderUI(currentUser);

        const changeBtn = document.getElementById('changePasswordBtn');
        if (changeBtn) changeBtn.disabled = true;

        const sendOtpBtn = document.getElementById('sendOtpBtn');
        if (sendOtpBtn) {
            sendOtpBtn.addEventListener('click', sendOtp);
        }

        const otpCode = document.getElementById('otpCode');
        if (otpCode) {
            otpCode.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '');
                if (this.value.length === 8) {
                    verifyOtp();
                }
            });
        }

        if (changeBtn) {
            changeBtn.addEventListener('click', changePassword);
        }

        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const input = document.getElementById(targetId);
                if (!input) return;
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                const icon = this.querySelector('i');
                if (icon) icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        });

        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', function() {
                validatePasswordStrength();
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', function() {
                validateConfirmMatch();
            });
        }

        errorCloseBtn.addEventListener('click', hideErrorModal);

        const otpSendGroup = document.getElementById('otpSendGroup');
        if (otpSendGroup) otpSendGroup.style.display = 'block';

        console.log('✅ صفحة تغيير كلمة المرور جاهزة. المستخدم:', currentUser.email);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }

})();
