/**
 * verify-otp.js – تأكيد الرمز OTP (8 أرقام)
 * يعتمد على TeraAuth (auth.js) لتنفيذ عمليات المصادقة والتوجيه
 * يدعم: signup, recovery, personal_info, contact_info, national_address,
 *       bank_info, attachments, change_mobile, login_otp, email_change
 * النسخة المُحدَّثة: إصلاح ثغرة رابط العودة
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function () {
        // عناصر DOM
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
        const progressFill = document.getElementById('progressFillBar');
        const backLink = document.getElementById('backLink');
        const backLinkText = document.getElementById('backLinkText');

        if (!form) return;

        // ========== التأكد من وجود TeraAuth ==========
        if (!window.TeraAuth) {
            showAlert('تعذر تحميل نظام المصادقة.', 'error');
            if (submitBtn) submitBtn.disabled = true;
            return;
        }

        // انتظار تهيئة TeraAuth (إذا لم تكن جاهزة)
        if (!window.TeraAuth._initialized) {
            await window.TeraAuth.init();
        }

        const auth = window.TeraAuth;
        const supabase = auth._client;
        if (!supabase) {
            showAlert('تعذر الاتصال بخدمة المصادقة.', 'error');
            if (submitBtn) submitBtn.disabled = true;
            return;
        }

        // ========== تحديث اسم المستخدم في الهيدر ==========
        await auth.getUser();

        // ========== قراءة السياق ==========
        const pendingEmail = localStorage.getItem('pendingVerificationEmail');
        let verifyType = localStorage.getItem('tera_verify_type') || 'signup';

        if (pendingEmail) {
            let mainMessage = 'أدخل رمز التحقق المكون من 8 أرقام المرسل إلى بريدك الإلكتروني';
            const typeMap = {
                'signup': 'أدخل رمز تأكيد التسجيل (8 أرقام) المرسل إلى',
                'recovery': 'أدخل رمز إعادة تعيين كلمة المرور (8 أرقام) المرسل إلى',
                'login_otp': 'أدخل رمز التحقق لتسجيل الدخول (8 أرقام) المرسل إلى',
                'email_change': 'أدخل رمز تأكيد تغيير البريد الإلكتروني (8 أرقام) المرسل إلى',
                'personal_info': 'أدخل رمز تأكيد المعلومات الشخصية (8 أرقام) المرسل إلى',
                'contact_info': 'أدخل رمز تأكيد معلومات الاتصال (8 أرقام) المرسل إلى',
                'national_address': 'أدخل رمز تأكيد العنوان الوطني (8 أرقام) المرسل إلى',
                'bank_info': 'أدخل رمز تأكيد المعلومات البنكية (8 أرقام) المرسل إلى',
                'attachments': 'أدخل رمز تأكيد المرفقات (8 أرقام) المرسل إلى',
                'change_mobile': 'أدخل رمز تأكيد تغيير رقم الجوال (8 أرقام) المرسل إلى'
            };
            mainMessage = typeMap[verifyType] || mainMessage;
            if (instructionMainText) instructionMainText.textContent = mainMessage;
            if (instructionEmailText) instructionEmailText.textContent = pendingEmail;
        } else {
            showAlert('لم يتم العثور على بريد إلكتروني معلق.', 'error');
            if (submitBtn) submitBtn.disabled = true;
        }

        // ========== تخصيص رابط العودة (تم إصلاح الثغرة) ==========
        const backRoutes = {
            // جميع حالات التحقق التي لا تملك جلسة مفتوحة بعد يجب أن تعود إلى صفحة الدخول
            'login_otp': { url: '/auth/auth/login/login.html', text: 'العودة لتسجيل الدخول' },
            'signup': { url: '/auth/auth/login/login.html', text: 'العودة لتسجيل الدخول' },
            'recovery': { url: '/auth/forgot-password.html', text: 'العودة' },
            'email_change': { url: '/pages/security/change-email.html', text: 'العودة' },
            'change_mobile': { url: '/pages/security/change-mobile.html', text: 'العودة' },
            // هذه الحالات تمتلك جلسة عادةً، لذا يمكنها العودة إلى لوحة التحكم
            'personal_info': { url: '/pages/dashboard/index.html', text: 'العودة' },
            'contact_info': { url: '/pages/dashboard/index.html', text: 'العودة' },
            'national_address': { url: '/pages/dashboard/index.html', text: 'العودة' },
            'bank_info': { url: '/pages/dashboard/index.html', text: 'العودة' },
            'attachments': { url: '/pages/dashboard/index.html', text: 'العودة' }
        };
        const defaultBack = { url: '/auth/auth/login/login.html', text: 'العودة لتسجيل الدخول' };
        const backConfig = backRoutes[verifyType] || defaultBack;
        if (backLink) backLink.href = backConfig.url;
        if (backLinkText) backLinkText.textContent = backConfig.text;

        // ========== مؤقت إعادة الإرسال ==========
        let timerSeconds = 300;
        let timerInterval = null;

        function startTimer() {
            resendBtn.classList.add('disabled');
            timerContainer.style.display = 'block';
            timerSeconds = 300;
            updateTimerDisplay();

            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(function () {
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
            timerDisplay.textContent = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
        }
        startTimer();

        // ========== إدخال الرمز ==========
        otpInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
            if (otpError) otpError.textContent = '';
            if (this.value.length === 8) {
                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                else form.dispatchEvent(new Event('submit'));
            }
        });

        otpInput.addEventListener('paste', function (e) {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 8);
            this.value = paste;
            if (paste.length === 8) {
                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                else form.dispatchEvent(new Event('submit'));
            }
        });

        // ========== تقديم النموذج ==========
        form.addEventListener('submit', async function (e) {
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
                let otpType;
                if (verifyType === 'signup') otpType = 'signup';
                else if (verifyType === 'recovery') otpType = 'recovery';
                else if (verifyType === 'email_change') otpType = 'email_change';
                else if (verifyType === 'change_mobile') otpType = 'sms';
                else otpType = 'email';

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

                setTimeout(async function () {
                    if (verifyType === 'signup') {
                        auth.redirectTo('/auth/auth/login/login.html');
                    } else if (verifyType === 'recovery') {
                        auth.redirectTo('/auth/reset-password.html');
                    } else if (verifyType === 'login_otp') {
                        const password = sessionStorage.getItem('tera_login_password');
                        const email = pendingEmail;
                        if (password && email) {
                            const { error } = await auth.login(email, password);
                            if (!error) {
                                sessionStorage.removeItem('tera_login_password');
                                auth.redirectTo('/pages/dashboard/index.html');
                            } else {
                                showAlert('فشل تسجيل الدخول. حاول مرة أخرى.', 'error');
                                auth.redirectTo('/auth/auth/login/login.html');
                            }
                        } else {
                            auth.redirectTo('/auth/auth/login/login.html');
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
                if (error.message && (error.message.includes('expired') || error.message.includes('invalid'))) {
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

        // ========== إعادة الإرسال ==========
        if (resendBtn) {
            resendBtn.addEventListener('click', async function (e) {
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
                        await supabase.auth.resend({ type: 'signup', email: pendingEmail });
                    } else if (verifyType === 'recovery') {
                        await supabase.auth.resend({ type: 'recovery', email: pendingEmail });
                    } else if (verifyType === 'email_change') {
                        await supabase.auth.resend({ type: 'email_change', email: pendingEmail });
                    } else if (verifyType === 'change_mobile') {
                        const mobile = localStorage.getItem('pendingNewMobile');
                        if (!mobile) throw new Error('رقم الجوال غير موجود');
                        await supabase.auth.signInWithOtp({ phone: mobile, options: { shouldCreateUser: false } });
                    } else {
                        await supabase.auth.signInWithOtp({ email: pendingEmail, options: { shouldCreateUser: false } });
                    }
                    showAlert('تم إرسال رمز تحقق جديد.', 'success');
                    startTimer();
                } catch (error) {
                    console.error('❌ خطأ في إعادة الإرسال:', error);
                    showAlert('حدث خطأ أثناء إرسال الرمز. يرجى المحاولة مرة أخرى.', 'error');
                } finally {
                    resendBtn.style.pointerEvents = 'auto';
                    resendBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال الرمز';
                }
            });
        }

        // ========== دوال التحديث بعد التحقق ==========
        async function updateStageCompleted(client, type) {
            try {
                const { data: { user } } = await client.auth.getUser();
                if (!user) return;

                let fields = { updated_at: new Date().toISOString() };
                const stageMap = {
                    'personal_info': 'personal_info_completed',
                    'contact_info': 'contact_info_completed',
                    'national_address': 'national_address_completed',
                    'bank_info': 'bank_info_completed',
                    'attachments': 'attachments_completed'
                };
                const key = stageMap[type];
                if (key) fields[key] = true;

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
                setTimeout(() => { auth.redirectTo('/pages/security/change-mobile.html'); }, 2000);
            } catch (e) {
                showAlert('تعذر تغيير رقم الجوال.', 'error');
                auth.redirectTo('/pages/security/change-mobile.html');
            }
        }

        async function finalizeRequestIfComplete(client) {
            try {
                const { data: { user } } = await client.auth.getUser();
                if (!user) return;

                const { data: req } = await client.from('verification_requests')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (!req) {
                    auth.redirectTo('/pages/dashboard/index.html');
                    return;
                }

                const requiredStages = ['personal_info_completed', 'national_address_completed',
                    'contact_info_completed', 'bank_info_completed', 'attachments_completed', 'agreed'
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
                auth.redirectTo('/pages/dashboard/index.html');
            } catch (e) {
                auth.redirectTo('/pages/dashboard/index.html');
            }
        }

        // ========== دوال العرض ==========
        function showAlert(message, type) {
            if (!alertBox || !alertMessage) return;
            alertBox.style.display = 'flex';
            alertBox.className = 'alert-box show ' + (type || 'error');
            if (alertIcon) {
                alertIcon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
            }
            alertMessage.textContent = message;
            clearTimeout(window._alertTimer);
            window._alertTimer = setTimeout(function () {
                alertBox.classList.remove('show');
                alertBox.style.display = 'none';
            }, 8000);
        }

        function hideAlert() {
            if (!alertBox) return;
            alertBox.classList.remove('show');
            alertBox.style.display = 'none';
        }

        function showLoader(show) {
            if (!loaderOverlay) return;
            loaderOverlay.style.display = show ? 'flex' : 'none';
            if (show && progressFill) {
                progressFill.style.width = '0%';
                setTimeout(function () { progressFill.style.width = '70%'; }, 500);
                setTimeout(function () { progressFill.style.width = '90%'; }, 1500);
            } else if (progressFill) {
                progressFill.style.width = '0%';
            }
        }
    });
})();
