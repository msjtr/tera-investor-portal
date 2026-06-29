/**
 * ============================================================
 * verify-otp.js – تأكيد الرمز OTP (6 أرقام) – يدعم signup | recovery | personal_info
 * ============================================================
 * الموقع: /assets/js/verify-otp.js
 * - ينتظر جاهزية Supabase عبر 'supabase:ready'.
 * - يستخدم localStorage للبريد ونوع العملية (signup / recovery / personal_info).
 * - يتحقق من الرمز (6 أرقام) باستخدام supabase.auth.verifyOtp.
 * - بعد نجاح تأكيد التسجيل: يوجه المستخدم إلى صفحة الدخول.
 * - بعد نجاح استعادة كلمة المرور: يوجه إلى إعادة تعيين كلمة المرور.
 * - بعد نجاح اعتماد المعلومات الشخصية: ينشئ طلب مراجعة ويوجه إلى لوحة التحكم.
 * - يعرض رسائل مناسبة حسب نوع العملية.
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        const form = document.getElementById('otpForm');
        const otpInput = document.getElementById('otp');
        const submitBtn = document.getElementById('submitBtn');
        const resendBtn = document.getElementById('resendCode');
        const otpError = document.getElementById('otp-error');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const instructionText = document.getElementById('instructionText');
        const loaderOverlay = document.getElementById('creativeLoaderScreen');

        if (!form) return;

        // انتظار جاهزية Supabase
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('انتهت مهلة انتظار Supabase')), 10000);
                    document.addEventListener('supabase:ready', (e) => {
                        clearTimeout(timeout);
                        resolve(e.detail.client);
                    }, { once: true });
                    document.addEventListener('supabase:error', () => {
                        clearTimeout(timeout);
                        reject(new Error('فشل تحميل Supabase'));
                    }, { once: true });
                });
            } catch (err) {
                showAlert('تعذر الاتصال بخدمة المصادقة. تأكد من اتصالك بالإنترنت.', 'error');
                if (submitBtn) submitBtn.disabled = true;
                return;
            }
        }

        const supabaseClient = window.teraSupabase;

        // جلب بيانات الجلسة المؤقتة من localStorage
        const pendingEmail = localStorage.getItem('pendingVerificationEmail');
        const verifyType = localStorage.getItem('tera_verify_type') || 'signup'; // signup | recovery | personal_info

        // عرض عنوان مخصص حسب نوع العملية
        if (pendingEmail) {
            let intro = 'أدخل رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني';
            if (verifyType === 'signup') {
                intro = 'أدخل رمز تأكيد التسجيل المرسل إلى بريدك الإلكتروني';
            } else if (verifyType === 'recovery') {
                intro = 'أدخل رمز إعادة تعيين كلمة المرور المرسل إلى بريدك الإلكتروني';
            } else if (verifyType === 'personal_info') {
                intro = 'أدخل رمز تأكيد المعلومات الشخصية المرسل إلى بريدك الإلكتروني';
            }
            instructionText.textContent = intro + ': ' + pendingEmail;
        } else {
            showAlert('لم يتم العثور على بريد إلكتروني معلق. يرجى بدء العملية من جديد.', 'error');
            if (submitBtn) submitBtn.disabled = true;
        }

        // فلترة الإدخال: أرقام فقط (يُدار الآن عبر المربعات الشبكية، لكننا نضبط الحقل المخفي)
        // الإدخال الفعلي يتم عبر مربعات .otp-box ويُجمع في #otp
        // نراقب تغير قيمة الحقل المخفي (الذي تحدثه المربعات)
        const observer = new MutationObserver(function() {
            const val = otpInput.value;
            if (val.length === 6) {
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                } else {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });
        observer.observe(otpInput, { attributes: true, attributeFilter: ['value'] });

        // معالجة تقديم النموذج
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideAlert();
            if (otpError) otpError.textContent = '';

            const otpValue = otpInput.value.trim();
            if (otpValue.length !== 6) {
                if (otpError) otpError.textContent = 'الرجاء إدخال رمز التحقق المكون من 6 أرقام';
                return;
            }

            if (!pendingEmail) {
                showAlert('بيانات الجلسة غير متوفرة. أعد المحاولة.', 'error');
                return;
            }

            // تعطيل الزر وإظهار اللودر
            showLoader(true);
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

            try {
                // تحديد نوع الرمز الصحيح:
                // بالنسبة لـ signup / recovery : type = verifyType
                // بالنسبة لـ personal_info : الرمز أُرسل عبر signInWithOtp لذا نستخدم type = 'email'
                const otpType = (verifyType === 'personal_info') ? 'email' : verifyType;

                const { error } = await supabaseClient.auth.verifyOtp({
                    email: pendingEmail,
                    token: otpValue,
                    type: otpType
                });

                if (error) throw error;

                // نجاح التحقق – تنظيف التخزين
                localStorage.removeItem('pendingVerificationEmail');
                localStorage.removeItem('tera_verify_type');

                if (verifyType === 'signup') {
                    // تم تأكيد التسجيل → توجيه إلى صفحة الدخول
                    showAlert('✅ تم تأكيد البريد بنجاح! يمكنك الآن تسجيل الدخول.', 'success');
                    setTimeout(() => {
                        window.location.replace('/auth/auth/login/login.html');
                    }, 2000);
                } else if (verifyType === 'recovery') {
                    // استعادة كلمة المرور → التوجيه إلى صفحة إعادة التعيين
                    showAlert('✅ تم التحقق بنجاح! جاري التوجيه لإعادة تعيين كلمة المرور.', 'success');
                    setTimeout(() => {
                        window.location.replace('/auth/reset-password.html');
                    }, 1500);
                } else if (verifyType === 'personal_info') {
                    // اعتماد المعلومات الشخصية – إنشاء طلب مراجعة
                    try {
                        const { data: { user } } = await supabaseClient.auth.getUser();
                        if (user) {
                            const { data: existingReq } = await supabaseClient
                                .from('verification_requests')
                                .select('id')
                                .eq('user_id', user.id)
                                .maybeSingle();

                            if (existingReq) {
                                await supabaseClient.from('verification_requests')
                                    .update({
                                        status: 'under_review',
                                        submitted: true,
                                        submitted_at: new Date().toISOString(),
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('user_id', user.id);
                            } else {
                                await supabaseClient.from('verification_requests')
                                    .insert({
                                        user_id: user.id,
                                        status: 'under_review',
                                        submitted: true,
                                        submitted_at: new Date().toISOString()
                                    });
                            }
                        }
                        showAlert('✅ تم تأكيد هويتك. طلبك قيد المراجعة الآن.', 'success');
                        setTimeout(() => {
                            window.location.replace('/pages/dashboard/index.html');
                        }, 1500);
                    } catch (reqError) {
                        console.error('❌ خطأ في إنشاء طلب المراجعة:', reqError);
                        showAlert('تم التأكيد ولكن حدث خطأ أثناء إنشاء الطلب. حاول مجدداً.', 'error');
                    }
                }

            } catch (error) {
                console.error('❌ فشل التحقق من الرمز:', error);
                let msg = error.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية';
                showAlert(msg, 'error');
                // مسح المربعات الشبكية
                document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.remove('filled'); });
                otpInput.value = '';
                // تركيز أول مربع
                const firstBox = document.querySelector('.otp-box');
                if (firstBox) firstBox.focus();
            } finally {
                showLoader(false);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
            }
        });

        // إعادة إرسال الرمز
        if (resendBtn) {
            resendBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                if (!pendingEmail) {
                    showAlert('لا يوجد بريد لإعادة الإرسال.', 'error');
                    return;
                }

                resendBtn.style.pointerEvents = 'none';
                resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إعادة الإرسال...';

                try {
                    if (verifyType === 'personal_info') {
                        // إعادة إرسال رمز OTP عبر signInWithOtp (نفس الآلية المستخدمة عند الحفظ)
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
                    showAlert('✅ تمت إعادة إرسال رمز التحقق.', 'success');
                } catch (error) {
                    console.error('❌ فشل إعادة الإرسال:', error);
                    showAlert(error.message || 'تعذرت إعادة الإرسال. حاول لاحقاً.', 'error');
                } finally {
                    resendBtn.style.pointerEvents = 'auto';
                    resendBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال الرمز';
                }
            });
        }

        // دوال مساعدة
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
