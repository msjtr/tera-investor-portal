/**
 * ============================================================
 * verify-otp.js - التحقق من رمز OTP (Enterprise)
 * ============================================================
 * الموقع: /assets/js/verify-otp.js
 * - ينتظر جاهزية Supabase عبر 'supabase:ready'.
 * - يستخدم localStorage للحصول على البريد ونوع العملية.
 * - يتحقق من الرمز (8 أرقام) باستخدام supabase.auth.verifyOtp.
 * - يدعم نوعي signup و recovery، ويُعيد التوجيه بناءً عليهما.
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
        const verifyType = localStorage.getItem('tera_verify_type') || 'signup'; // signup أو recovery

        if (pendingEmail) {
            instructionText.textContent = `أدخل رمز التحقق المرسل إلى: ${pendingEmail}`;
        } else {
            showAlert('لم يتم العثور على بريد إلكتروني معلق. يرجى بدء العملية من جديد.', 'error');
            if (submitBtn) submitBtn.disabled = true;
        }

        // فلترة الإدخال: أرقام فقط، وإرسال تلقائي عند 8 أرقام
        otpInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (otpError) otpError.textContent = '';
            if (this.value.length === 8) {
                // إرسال تلقائي
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                } else {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });

        // معالجة تقديم النموذج
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
                showAlert('بيانات الجلسة غير متوفرة. أعد المحاولة.', 'error');
                return;
            }

            // تعطيل الزر وإظهار اللودر
            showLoader(true);
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

            try {
                const { data, error } = await supabaseClient.auth.verifyOtp({
                    email: pendingEmail,
                    token: otpValue,
                    type: verifyType
                });

                if (error) throw error;

                // نجاح التحقق – تنظيف التخزين
                localStorage.removeItem('pendingVerificationEmail');
                localStorage.removeItem('tera_verify_type');

                showAlert('✅ تم التحقق بنجاح! جاري التوجيه...', 'success');

                // توجيه حسب نوع العملية
                setTimeout(() => {
                    if (verifyType === 'recovery') {
                        window.location.replace('/auth/reset-password.html');
                    } else {
                        // بعد تأكيد التسجيل، نذهب إلى صفحة إكمال البيانات أو الدخول
                        window.location.replace('/auth/complete-profile.html');
                    }
                }, 1500);

            } catch (error) {
                console.error('❌ فشل التحقق من الرمز:', error);
                let msg = error.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية';
                showAlert(msg, 'error');
                otpInput.value = '';
                otpInput.focus();
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
                    const { error } = await supabaseClient.auth.resend({
                        type: verifyType,
                        email: pendingEmail
                    });

                    if (error) throw error;
                    showAlert('✅ تمت إعادة إرسال رمز التحقق إلى بريدك الإلكتروني.', 'success');
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
