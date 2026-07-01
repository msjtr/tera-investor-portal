/**
 * security-change-email.js – تغيير البريد الإلكتروني (رابط تأكيد)
 * يعتمد على security.js الذي يوفر waitForSupabase() و showSecurityAlert() و updateHeader()
 */
(function() {
    'use strict';

    window.SecurityPages = window.SecurityPages || {};

    window.SecurityPages['change-email'] = {
        init: async function() {
            console.log('📧 تهيئة صفحة تغيير البريد الإلكتروني...');
            let supabase;
            try { supabase = await waitForSupabase(); } catch (err) {
                showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showSecurityAlert('يجب تسجيل الدخول أولاً.', 'error');
                setTimeout(() => window.location.replace('/auth/auth/login/login.html'), 2000);
                return;
            }
            updateHeader(user);

            const currentEmail = user.email;
            document.getElementById('currentEmailDisplay').textContent = currentEmail;

            // عناصر DOM – المرحلة 1
            const sendOldEmailOtpBtn = document.getElementById('sendOldEmailOtpBtn');
            const step1OtpGroup = document.getElementById('step1OtpGroup');
            const oldEmailOtp = document.getElementById('oldEmailOtp');
            const verifyOldEmailBtn = document.getElementById('verifyOldEmailBtn');
            const oldEmailOtpError = document.getElementById('oldEmailOtpError');
            const step1 = document.getElementById('step1');
            const step2 = document.getElementById('step2');
            const resendOldOtpBtn = document.getElementById('resendOldOtpBtn');
            const timerDisplay = document.getElementById('timerDisplay');
            const timerContainer = document.getElementById('timerContainer');

            // عناصر DOM – المرحلة 2
            const newEmailInput = document.getElementById('newEmail');
            const confirmEmailInput = document.getElementById('confirmEmail');
            const changeEmailBtn = document.getElementById('changeEmailBtn');

            let timerInterval = null;
            let timerSeconds = 300;

            function startTimer() {
                clearInterval(timerInterval);
                timerContainer.style.display = 'block';
                resendOldOtpBtn.style.display = 'inline-flex';
                timerSeconds = 300;
                updateTimerDisplay();
                resendOldOtpBtn.classList.add('disabled');
                resendOldOtpBtn.style.pointerEvents = 'none';

                timerInterval = setInterval(() => {
                    timerSeconds--;
                    updateTimerDisplay();
                    if (timerSeconds <= 0) {
                        clearInterval(timerInterval);
                        timerInterval = null;
                        resendOldOtpBtn.classList.remove('disabled');
                        resendOldOtpBtn.style.pointerEvents = 'auto';
                    }
                }, 1000);
            }

            function updateTimerDisplay() {
                const min = Math.floor(timerSeconds / 60);
                const sec = timerSeconds % 60;
                timerDisplay.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
            }

            // ========== المرحلة 1: تأكيد البريد القديم ==========
            sendOldEmailOtpBtn.addEventListener('click', async function() {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
                try {
                    const { error } = await supabase.auth.signInWithOtp({
                        email: currentEmail,
                        options: { shouldCreateUser: false }
                    });
                    if (error) throw error;
                    showSecurityAlert('تم إرسال رمز التحقق إلى بريدك الإلكتروني الحالي.', 'success');
                    step1OtpGroup.style.display = 'block';
                    oldEmailOtp.focus();
                    this.style.display = 'none';
                    startTimer();
                } catch (err) {
                    showSecurityAlert(err.message || 'فشل إرسال الرمز.', 'error');
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق إلى البريد الحالي';
                }
            });

            resendOldOtpBtn.addEventListener('click', async function() {
                if (timerInterval) {
                    showSecurityAlert('يرجى الانتظار حتى انتهاء المؤقت.', 'error');
                    return;
                }
                this.style.pointerEvents = 'none';
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
                try {
                    const { error } = await supabase.auth.signInWithOtp({
                        email: currentEmail,
                        options: { shouldCreateUser: false }
                    });
                    if (error) throw error;
                    showSecurityAlert('تم إرسال رمز تحقق جديد.', 'success');
                    startTimer();
                } catch (err) {
                    showSecurityAlert(err.message || 'فشل إرسال الرمز.', 'error');
                } finally {
                    this.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال الرمز';
                    if (!timerInterval) {
                        this.classList.remove('disabled');
                        this.style.pointerEvents = 'auto';
                    }
                }
            });

            verifyOldEmailBtn.addEventListener('click', async function() {
                const otp = oldEmailOtp.value.trim();
                if (otp.length !== 8) {
                    oldEmailOtpError.textContent = 'الرجاء إدخال 8 أرقام.';
                    return;
                }
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
                try {
                    const { error } = await supabase.auth.verifyOtp({
                        email: currentEmail,
                        token: otp,
                        type: 'email'
                    });
                    if (error) throw error;
                    clearInterval(timerInterval);
                    showSecurityAlert('تم تأكيد البريد الحالي بنجاح.', 'success');
                    step1.style.display = 'none';
                    step2.style.display = 'block';
                } catch (err) {
                    oldEmailOtpError.textContent = err.message.includes('expired') ? 'انتهت صلاحية الرمز' : 'رمز التحقق غير صحيح.';
                } finally {
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
                }
            });

            // ========== المرحلة 2: زر تغيير البريد (يرسل رابط تأكيد) ==========
            if (changeEmailBtn) {
                changeEmailBtn.addEventListener('click', async function() {
                    const newEmail = newEmailInput.value.trim();
                    const confirm = confirmEmailInput.value.trim();
                    if (!newEmail || newEmail !== confirm) {
                        showSecurityAlert('البريد الإلكتروني غير متطابق.', 'error');
                        return;
                    }
                    if (newEmail === currentEmail) {
                        showSecurityAlert('البريد الجديد مطابق للحالي.', 'error');
                        return;
                    }
                    this.disabled = true;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
                    try {
                        const { error } = await supabase.auth.updateUser(
                            { email: newEmail },
                            { emailRedirectTo: `${window.location.origin}/pages/security/confirm-email.html` }
                        );
                        if (error) throw error;
                        showSecurityAlert('✅ تم إرسال رابط تأكيد إلى البريد الإلكتروني الجديد. يرجى التحقق منه (والبريد العشوائي) لإكمال التغيير.', 'success');
                        setTimeout(() => window.location.replace('/pages/dashboard/index.html'), 4000);
                    } catch (err) {
                        showSecurityAlert(err.message || 'فشل تغيير البريد.', 'error');
                    } finally {
                        this.disabled = false;
                        this.innerHTML = '<i class="fas fa-check-circle"></i> تغيير البريد الإلكتروني';
                    }
                });
            }
        }
    };
})();
