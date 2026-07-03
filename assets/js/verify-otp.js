/**
 * verify-otp.js – تأكيد الرمز OTP (8 أرقام)
 * يدعم: signup | recovery | personal_info | contact_info | national_address | bank_info | attachments | change_mobile | login_otp | email_change
 * مع مؤقت إعادة إرسال (5 دقائق)، توجيه ذكي، تحديث اسم العميل من auth_register، ورسائل عربية.
 * 
 * مطابقة قوالب Supabase:
 * - signup          → Confirm Sign Up
 * - recovery        → Reset Password
 * - email           → Magic Link / Email OTP (لـ personal_info, contact_info, ...)
 * - login_otp       → Magic Link / Email OTP (تسجيل الدخول)
 * - email_change    → Change Email Address
 * - sms             → Change Phone Number (لـ change_mobile)
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        const form = document.getElementById('otpForm');
        const otpInput = document.getElementById('otp');
        const submitBtn = document.getElementById('submitBtn');
        const resendBtn = document.getElementById('resendCode');
        const timerDisplay = document.getElementById('timerDisplay');
        const timerContainer = document.getElementById('timerContainer');
        const otpError = document.getElementById('otp-error');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const instructionMainText = document.getElementById('instructionMainText');
        const instructionEmailText = document.getElementById('instructionEmailText');
        const loaderOverlay = document.getElementById('creativeLoaderScreen');
        const backLink = document.getElementById('backLink');
        const backLinkText = document.getElementById('backLinkText');

        if (!form) return;

        // ---------- ١. انتظار جاهزية Supabase ----------
        let supabase;
        if (!window.teraSupabase) {
            if (typeof waitForSupabase === 'function') {
                try { await waitForSupabase(); } catch (e) {
                    showAlert('تعذر الاتصال بخدمة المصادقة.', 'error');
                    if (submitBtn) submitBtn.disabled = true;
                    return;
                }
            } else {
                try {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                        document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
                        document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('error')); }, { once: true });
                    });
                } catch (err) {
                    showAlert('تعذر الاتصال بخدمة المصادقة.', 'error');
                    if (submitBtn) submitBtn.disabled = true;
                    return;
                }
            }
        }
        supabase = window.teraSupabase;

        // ---------- ٢. تحديث اسم العميل في الهيدر (من auth_register أو البريد) ----------
        async function refreshHeader() {
            const headerName = document.getElementById('headerUserName');
            const headerAvatar = document.getElementById('headerAvatar');
            let displayName = 'مستخدم';
            let userId = null;

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    userId = user.id;
                    displayName = user.user_metadata?.full_name || '';
                }

                if (!displayName && userId) {
                    const { data: reg } = await supabase
                        .from('auth_register')
                        .select('full_name')
                        .eq('user_id', userId)
                        .maybeSingle();
                    if (reg?.full_name) displayName = reg.full_name;
                }

                if (!displayName) {
                    const email = user?.email || localStorage.getItem('pendingVerificationEmail');
                    if (email) displayName = email.split('@')[0];
                }
            } catch (e) {
                const pending = localStorage.getItem('pendingVerificationEmail');
                if (pending) displayName = pending.split('@')[0];
            }

            if (headerName) headerName.textContent = displayName;
            if (headerAvatar) headerAvatar.textContent = displayName.charAt(0).toUpperCase();
        }
        await refreshHeader();

        // ---------- ٣. قراءة السياق ----------
        const pendingEmail = localStorage.getItem('pendingVerificationEmail');
        const verifyType = localStorage.getItem('tera_verify_type') || 'signup';

        if (pendingEmail) {
            let mainMessage = 'أدخل رمز التحقق المكون من 8 أرقام المرسل إلى بريدك الإلكتروني';
            if (verifyType === 'signup') mainMessage = 'أدخل رمز تأكيد التسجيل (8 أرقام) المرسل إلى';
            else if (verifyType === 'recovery') mainMessage = 'أدخل رمز إعادة تعيين كلمة المرور (8 أرقام) المرسل إلى';
            else if (verifyType === 'login_otp') mainMessage = 'أدخل رمز التحقق لتسجيل الدخول (8 أرقام) المرسل إلى';
            else if (verifyType === 'email_change') mainMessage = 'أدخل رمز تأكيد تغيير البريد الإلكتروني (8 أرقام) المرسل إلى';
            else if (verifyType === 'personal_info') mainMessage = 'أدخل رمز تأكيد المعلومات الشخصية (8 أرقام) المرسل إلى';
            else if (verifyType === 'contact_info') mainMessage = 'أدخل رمز تأكيد معلومات الاتصال (8 أرقام) المرسل إلى';
            else if (verifyType === 'national_address') mainMessage = 'أدخل رمز تأكيد العنوان الوطني (8 أرقام) المرسل إلى';
            else if (verifyType === 'bank_info') mainMessage = 'أدخل رمز تأكيد المعلومات البنكية (8 أرقام) المرسل إلى';
            else if (verifyType === 'attachments') mainMessage = 'أدخل رمز تأكيد المرفقات (8 أرقام) المرسل إلى';
            else if (verifyType === 'change_mobile') mainMessage = 'أدخل رمز تأكيد تغيير رقم الجوال (8 أرقام) المرسل إلى';
            
            if (instructionMainText) instructionMainText.textContent = mainMessage;
            if (instructionEmailText) instructionEmailText.textContent = pendingEmail;
        } else {
            showAlert('لم يتم العثور على بريد إلكتروني معلق.', 'error');
            if (submitBtn) submitBtn.disabled = true;
        }

        // ---------- ٤. تخصيص رابط العودة حسب نوع العملية ----------
        if (verifyType === 'login_otp' || verifyType === 'personal_info' || verifyType === 'contact_info' || verifyType === 'national_address' || verifyType === 'bank_info' || verifyType === 'attachments' || verifyType === 'change_mobile') {
            backLink.href = '/pages/dashboard/index.html';
            backLinkText.textContent = 'العودة';
        } else {
            backLink.href = '/auth/auth/login/login.html';
            backLinkText.textContent = 'العودة لتسجيل الدخول';
        }

        // ---------- ٥. مؤقت إعادة الإرسال (5 دقائق) ----------
        let timerSeconds = 300;
        let timerInterval = null;

        function startTimer() {
            resendBtn.classList.add('disabled');
            timerContainer.style.display = 'block';
            timerSeconds = 300;
            updateTimerDisplay();

            timerInterval = setInterval(() => {
                timerSeconds--;
                updateTimerDisplay();
                if (timerSeconds <= 0) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    timerContainer.style.display = 'none';
                    resendBtn.classList.remove('disabled');
                }
            }, 1000);
        }

        function updateTimerDisplay() {
            const min = Math.floor(timerSeconds / 60);
            const sec = timerSeconds % 60;
            timerDisplay.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }

        startTimer();

        // ---------- ٦. إدخال الرمز وإرسال تلقائي ----------
        otpInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (otpError) otpError.textContent = '';
            if (this.value.length === 8) {
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                } else {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });

        otpInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 8);
            this.value = paste;
            if (paste.length === 8) {
                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                else form.dispatchEvent(new Event('submit'));
            }
        });

        // ---------- ٧. تقديم النموذج (مطابقة القوالب القياسية) ----------
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideAlert();
            if (otpError) otpError.textContent = '';

            const otpValue = otpInput.value.trim();
            if (otpValue.length !== 8) {
                if (otpError) otpError.textContent = 'الرجاء إدخال رمز التحقق المكون من 8 أرقام';
                return;
            }

            if (!pendingEmail) {
                showAlert('بيانات الجلسة غير متوفرة.', 'error');
                return;
            }

            showLoader(true);
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

            try {
                // تحديد النوع حسب القالب المطلوب
                let otpType;
                if (verifyType === 'signup') otpType = 'signup';              // Confirm Sign Up
                else if (verifyType === 'recovery') otpType = 'recovery';     // Reset Password
                else if (verifyType === 'email_change') otpType = 'email_change'; // Change Email Address
                else if (verifyType === 'change_mobile') otpType = 'sms';     // Change Phone Number
                else otpType = 'email'; // Magic Link / Email OTP (login_otp, personal_info, contact_info, ...)

                let verifyParams = { token: otpValue, type: otpType };
                if (verifyType === 'change_mobile') {
                    const mobile = localStorage.getItem('pendingNewMobile');
                    if (!mobile) throw new Error('رقم الجوال غير موجود');
                    verifyParams.phone = mobile;
                } else {
                    verifyParams.email = pendingEmail;
                }

                const { error } = await supabase.auth.verifyOtp(verifyParams);
                if (error) throw error;

                localStorage.removeItem('pendingVerificationEmail');
                localStorage.removeItem('tera_verify_type');

                showAlert('تم التحقق من الرمز بنجاح.', 'success');

                setTimeout(async () => {
                    if (verifyType === 'signup') {
                        window.location.replace('/auth/auth/login/login.html');
                    } else if (verifyType === 'recovery') {
                        window.location.replace('/auth/reset-password.html');
                    } else if (verifyType === 'login_otp') {
                        const password = sessionStorage.getItem('tera_login_password');
                        const email = pendingEmail;
                        if (password && email) {
                            try {
                                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                                if (error) throw error;
                                sessionStorage.removeItem('tera_login_password');
                                window.location.replace('/pages/dashboard/index.html');
                            } catch (err) {
                                showAlert('فشل تسجيل الدخول. حاول مرة أخرى.', 'error');
                                window.location.replace('/auth/auth/login/login.html');
                            }
                        } else {
                            window.location.replace('/auth/auth/login/login.html');
                        }
                    } else if (verifyType === 'change_mobile') {
                        await changeMobile(supabase);
                    } else {
                        await updateStageCompleted(supabase, verifyType);
                        finalizeRequestIfComplete(supabase);
                    }
                }, 1500);

            } catch (error) {
                console.error('❌ فشل التحقق من الرمز:', error);
                let msg = 'رمز التحقق غير صحيح أو منتهي الصلاحية.';
                if (error.message.includes('expired') || error.message.includes('invalid')) {
                    msg = 'انتهت صلاحية رمز التحقق أو أنه غير صحيح. حاول مرة أخرى.';
                }
                showAlert(msg, 'error');
                otpInput.value = '';
                otpInput.focus();
            } finally {
                showLoader(false);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
            }
        });

        // ---------- ٨. إعادة الإرسال (مطابقة القوالب القياسية) ----------
        if (resendBtn) {
            resendBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                if (timerInterval) {
                    showAlert('يرجى الانتظار حتى انتهاء المؤقت لإعادة الإرسال.', 'error');
                    return;
                }
                if (!pendingEmail && verifyType !== 'change_mobile') {
                    showAlert('لا يوجد بريد لإعادة الإرسال.', 'error');
                    return;
                }

                resendBtn.style.pointerEvents = 'none';
                resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

                try {
                    if (verifyType === 'signup') {
                        // إعادة إرسال تأكيد التسجيل
                        await supabase.auth.resend({ type: 'signup', email: pendingEmail });
                    } else if (verifyType === 'recovery') {
                        // إعادة إرسال تعيين كلمة المرور
                        await supabase.auth.resend({ type: 'recovery', email: pendingEmail });
                    } else if (verifyType === 'email_change') {
                        // إعادة إرسال تأكيد تغيير البريد
                        await supabase.auth.resend({ type: 'email_change', email: pendingEmail });
                    } else if (verifyType === 'change_mobile') {
                        // إعادة إرسال رمز الجوال
                        const mobile = localStorage.getItem('pendingNewMobile');
                        if (!mobile) throw new Error('رقم الجوال غير موجود');
                        await supabase.auth.signInWithOtp({ phone: mobile, options: { shouldCreateUser: false } });
                    } else {
                        // Magic Link / Email OTP (login_otp, personal_info, contact_info, ...)
                        await supabase.auth.signInWithOtp({ email: pendingEmail, options: { shouldCreateUser: false } });
                    }
                    showAlert('تم إرسال رمز تحقق جديد.', 'success');
                    startTimer();
                } catch (error) {
                    showAlert('حدث خطأ أثناء إرسال الرمز. يرجى المحاولة مرة أخرى.', 'error');
                } finally {
                    resendBtn.style.pointerEvents = 'auto';
                    resendBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال الرمز';
                }
            });
        }

        // ---------- ٩. دوال التحديث بعد التحقق ----------
        async function updateStageCompleted(client, type) {
            try {
                const { data: { user } } = await client.auth.getUser();
                if (!user) return;

                let fields = { updated_at: new Date().toISOString() };
                if (type === 'personal_info') fields.personal_info_completed = true;
                else if (type === 'contact_info') fields.contact_info_completed = true;
                else if (type === 'national_address') fields.national_address_completed = true;
                else if (type === 'bank_info') fields.bank_info_completed = true;
                else if (type === 'attachments') fields.attachments_completed = true;

                await client.from('verification_requests').upsert({
                    user_id: user.id,
                    ...fields
                }, { onConflict: 'user_id' });
            } catch (e) {
                console.error('خطأ في تحديث المرحلة:', e);
            }
        }

        async function changeMobile(client) {
            try {
                const newMobile = localStorage.getItem('pendingNewMobile');
                if (newMobile) await client.auth.updateUser({ phone: newMobile });
                localStorage.removeItem('pendingNewMobile');
                showAlert('✅ تم تغيير رقم الجوال بنجاح.', 'success');
                setTimeout(() => { window.location.replace('/pages/security/change-mobile.html'); }, 2000);
            } catch (e) {
                showAlert('تعذر تغيير رقم الجوال.', 'error');
                window.location.replace('/pages/security/change-mobile.html');
            }
        }

        async function finalizeRequestIfComplete(client) {
            try {
                const { data: { user } } = await client.auth.getUser();
                if (!user) return;

                const { data: req } = await client.from('verification_requests').select('*').eq('user_id', user.id).maybeSingle();
                if (!req) return;

                const requiredStages = ['personal_info_completed','national_address_completed','contact_info_completed','bank_info_completed','attachments_completed','agreed'];
                const allCompleted = requiredStages.every(key => req[key] === true);

                if (allCompleted) {
                    await client.from('verification_requests').upsert({
                        user_id: user.id, status: 'under_review', submitted: true,
                        submitted_at: new Date().toISOString(), updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
                }
                window.location.replace('/pages/dashboard/index.html');
            } catch (e) {
                window.location.replace('/pages/dashboard/index.html');
            }
        }

        // ---------- ١٠. دوال العرض ----------
        function showAlert(message, type) {
            if (!alertBox || !alertMessage) return;
            alertBox.style.display = 'flex';
            alertBox.className = 'alert-box show ' + (type || 'error');
            if (alertIcon) {
                alertIcon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
            }
            alertMessage.textContent = message;
            clearTimeout(window._alertTimer);
            window._alertTimer = setTimeout(() => alertBox.classList.remove('show'), 8000);
        }

        function hideAlert() {
            if (!alertBox) return;
            alertBox.classList.remove('show');
            alertBox.style.display = 'none';
        }

        function showLoader(show) {
            if (!loaderOverlay) return;
            loaderOverlay.style.display = show ? 'flex' : 'none';
            const progressBar = document.getElementById('progressFillBar');
            if (show && progressBar) {
                progressBar.style.width = '0%';
                setTimeout(() => { progressBar.style.width = '70%'; }, 500);
                setTimeout(() => { progressBar.style.width = '90%'; }, 1500);
            } else if (progressBar) {
                progressBar.style.width = '0%';
            }
        }
    });
})();
