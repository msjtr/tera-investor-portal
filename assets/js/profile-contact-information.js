/**
 * verify-otp.js – تأكيد الرمز OTP (8 أرقام) – يدعم signup | recovery | personal_info | contact_info | national_address | bank_info
 * مع مؤقت إعادة إرسال، توجيه ذكي حسب السياق، تحديث اسم العميل، ورسائل عربية.
 * تحديث: يُكمل الطلب تلقائياً بعد اكتمال جميع المراحل.
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
        if (!window.teraSupabase) {
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

        const supabaseClient = window.teraSupabase;

        // ---------- ٢. تحديث اسم العميل في الهيدر ----------
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                const fullName = user.user_metadata?.full_name || 'مستخدم';
                document.getElementById('headerUserName').textContent = fullName;
                document.getElementById('headerAvatar').textContent = fullName.charAt(0).toUpperCase();
            }
        } catch (e) {
            console.warn('تعذر تحميل اسم المستخدم:', e);
        }

        // ---------- ٣. قراءة السياق ----------
        const pendingEmail = localStorage.getItem('pendingVerificationEmail');
        const verifyType = localStorage.getItem('tera_verify_type') || 'signup'; // signup | recovery | personal_info | contact_info | national_address | bank_info

        if (pendingEmail) {
            let mainMessage = 'أدخل رمز التحقق المكون من 8 أرقام المرسل إلى بريدك الإلكتروني';
            if (verifyType === 'signup') mainMessage = 'أدخل رمز تأكيد التسجيل (8 أرقام) المرسل إلى';
            else if (verifyType === 'recovery') mainMessage = 'أدخل رمز إعادة تعيين كلمة المرور (8 أرقام) المرسل إلى';
            else if (verifyType === 'personal_info') mainMessage = 'أدخل رمز تأكيد المعلومات الشخصية (8 أرقام) المرسل إلى';
            else if (verifyType === 'contact_info') mainMessage = 'أدخل رمز تأكيد معلومات الاتصال (8 أرقام) المرسل إلى';
            else if (verifyType === 'national_address') mainMessage = 'أدخل رمز تأكيد العنوان الوطني (8 أرقام) المرسل إلى';
            else if (verifyType === 'bank_info') mainMessage = 'أدخل رمز تأكيد المعلومات البنكية (8 أرقام) المرسل إلى';
            
            if (instructionMainText) instructionMainText.textContent = mainMessage;
            if (instructionEmailText) instructionEmailText.textContent = pendingEmail;
        } else {
            showAlert('لم يتم العثور على بريد إلكتروني معلق.', 'error');
            if (submitBtn) submitBtn.disabled = true;
        }

        // ---------- ٤. تخصيص رابط العودة حسب نوع العملية ----------
        if (verifyType === 'personal_info' || verifyType === 'contact_info' || verifyType === 'national_address' || verifyType === 'bank_info') {
            backLink.href = '/pages/dashboard/index.html';
            backLinkText.textContent = 'العودة';
        } else {
            backLink.href = '/auth/auth/login/login.html';
            backLinkText.textContent = 'العودة لتسجيل الدخول';
        }

        // ---------- ٥. مؤقت إعادة الإرسال (60 ثانية) ----------
        let timerSeconds = 60;
        let timerInterval = null;

        function startTimer() {
            resendBtn.classList.add('disabled');
            timerContainer.style.display = 'block';
            timerSeconds = 60;
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

        // ---------- ٦. إدخال الرمز (8 أرقام) وإرسال تلقائي ----------
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

        // ---------- ٧. تقديم النموذج ----------
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
                // الأنواع التي تستخدم OTP عبر البريد الإلكتروني (وليس signup/recovery)
                const otpType = (verifyType === 'personal_info' || verifyType === 'contact_info' || verifyType === 'national_address' || verifyType === 'bank_info') ? 'email' : verifyType;

                const { error } = await supabaseClient.auth.verifyOtp({
                    email: pendingEmail,
                    token: otpValue,
                    type: otpType
                });

                if (error) throw error;

                localStorage.removeItem('pendingVerificationEmail');
                localStorage.removeItem('tera_verify_type');

                showAlert('تم التحقق من الرمز بنجاح.', 'success');

                // التوجيه حسب نوع العملية
                setTimeout(async () => {
                    if (verifyType === 'signup') {
                        window.location.replace('/auth/auth/login/login.html');
                    } else if (verifyType === 'recovery') {
                        window.location.replace('/auth/reset-password.html');
                    } else {
                        // تحديث المرحلة المكتملة في verification_requests
                        await updateStageCompleted(supabaseClient, verifyType);
                        // التحقق من إكمال جميع المراحل وتحديث الطلب إلى "قيد المراجعة"
                        finalizeRequestIfComplete(supabaseClient);
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

        // ---------- ٨. إعادة الإرسال ----------
        if (resendBtn) {
            resendBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                if (timerInterval) {
                    showAlert('يرجى الانتظار حتى انتهاء المؤقت لإعادة الإرسال.', 'error');
                    return;
                }
                if (!pendingEmail) {
                    showAlert('لا يوجد بريد لإعادة الإرسال.', 'error');
                    return;
                }

                resendBtn.style.pointerEvents = 'none';
                resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

                try {
                    if (verifyType === 'personal_info' || verifyType === 'contact_info' || verifyType === 'national_address' || verifyType === 'bank_info') {
                        await supabaseClient.auth.signInWithOtp({
                            email: pendingEmail,
                            options: { shouldCreateUser: false }
                        });
                    } else {
                        await supabaseClient.auth.resend({
                            type: verifyType,
                            email: pendingEmail
                        });
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

        // ---------- ٩. دوال تحديث المراحل والتحقق من الاكتمال ----------
        async function updateStageCompleted(client, type) {
            try {
                const { data: { user } } = await client.auth.getUser();
                if (!user) return;

                let fields = { updated_at: new Date().toISOString() };

                if (type === 'personal_info') {
                    fields.personal_info_completed = true;
                } else if (type === 'contact_info') {
                    fields.contact_info_completed = true;
                } else if (type === 'national_address') {
                    fields.national_address_completed = true;
                } else if (type === 'bank_info') {
                    fields.bank_info_completed = true;
                }

                // تحديث الحقل في verification_requests
                await client.from('verification_requests').upsert({
                    user_id: user.id,
                    ...fields
                }, { onConflict: 'user_id' });
            } catch (e) {
                console.error('خطأ في تحديث المرحلة:', e);
            }
        }

        async function finalizeRequestIfComplete(client) {
            try {
                const { data: { user } } = await client.auth.getUser();
                if (!user) return;

                const { data: req } = await client
                    .from('verification_requests')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!req) return;

                const requiredStages = [
                    'email_verified',
                    'personal_info_completed',
                    'national_address_completed',
                    'contact_info_completed',
                    'bank_info_completed',
                    'attachments_completed',
                    'agreed'
                ];

                const allCompleted = requiredStages.every(key => req[key] === true);

                if (allCompleted) {
                    await client.from('verification_requests').upsert({
                        user_id: user.id,
                        status: 'under_review',
                        submitted: true,
                        submitted_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
                }

                window.location.replace('/pages/dashboard/index.html');
            } catch (e) {
                console.error('خطأ في إنهاء الطلب:', e);
                window.location.replace('/pages/dashboard/index.html');
            }
        }

        // ---------- ١٠. دوال العرض ----------
        function showAlert(message, type) {
            if (!alertBox || !alertMessage) return;
            alertBox.style.display = 'flex';
            alertBox.className = 'alert-box show ' + (type || 'error');
            if (alertIcon) {
                alertIcon.innerHTML = type === 'success'
                    ? '<i class="fas fa-check-circle"></i>'
                    : '<i class="fas fa-exclamation-circle"></i>';
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
