/**
 * login.js – معالج تسجيل الدخول مع تحقق OTP (Enterprise)
 * ======================================================
 * يعتمد على: supabase-client.js, auth.js
 * متوافق مع: login.html (login_identifier, login_password, teraLoginForm)
 * يرسل رمز OTP عبر قالب Magic Link / Email OTP
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function () {
        const loginForm = document.getElementById('teraLoginForm');
        if (!loginForm) return;

        const emailInput = document.getElementById('login_identifier');
        const passwordInput = document.getElementById('login_password');
        const submitBtn = document.getElementById('loginSubmitBtn');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const loaderOverlay = document.getElementById('creativeLoaderScreen');
        const showPasswordToggle = document.getElementById('show_login_password');

        // إظهار/إخفاء كلمة المرور
        if (showPasswordToggle && passwordInput) {
            showPasswordToggle.addEventListener('change', function () {
                passwordInput.type = this.checked ? 'text' : 'password';
            });
        }

        // انتظار جاهزية Supabase
        let supabase;
        if (!window.teraSupabase) {
            if (typeof waitForSupabase === 'function') {
                try {
                    await waitForSupabase();
                } catch (e) {
                    showError('تعذر الاتصال بخدمة المصادقة. تأكد من اتصالك بالإنترنت.');
                    disableForm(true);
                    return;
                }
            } else {
                try {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
                        document.addEventListener('supabase:ready', (e) => {
                            clearTimeout(timeout);
                            resolve(e.detail.client);
                        }, { once: true });
                        document.addEventListener('supabase:error', () => {
                            clearTimeout(timeout);
                            reject(new Error('error'));
                        }, { once: true });
                    });
                } catch (err) {
                    showError('تعذر الاتصال بقاعدة البيانات.');
                    disableForm(true);
                    return;
                }
            }
        }
        supabase = window.teraSupabase;

        console.log('🔒 [Login] تم تأمين صفحة الدخول');

        // دوال مساعدة
        function disableForm(disabled) {
            if (emailInput) emailInput.disabled = disabled;
            if (passwordInput) passwordInput.disabled = disabled;
            if (submitBtn) submitBtn.disabled = disabled;
        }

        function showLoader(show, text = 'جاري تسجيل الدخول...') {
            if (!loaderOverlay) return;
            loaderOverlay.style.display = show ? 'flex' : 'none';
            const quoteEl = document.getElementById('creativeQuoteText');
            if (quoteEl && show) quoteEl.textContent = text;
            const progressBar = document.getElementById('progressFillBar');
            if (progressBar && show) {
                progressBar.style.width = '0%';
                setTimeout(() => { progressBar.style.width = '70%'; }, 300);
            } else if (progressBar) {
                progressBar.style.width = '0%';
            }
        }

        function showError(msg) {
            if (alertBox && alertMessage) {
                alertBox.style.display = 'flex';
                alertBox.className = 'alert-box show error';
                if (alertIcon) alertIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                alertMessage.textContent = msg;
            } else {
                alert(msg);
            }
        }

        function hideAlert() {
            if (alertBox) {
                alertBox.style.display = 'none';
                alertBox.className = 'alert-box';
            }
        }

        // مستمع إرسال النموذج
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideAlert();

            const email = emailInput?.value.trim() || '';
            const password = passwordInput?.value || '';

            if (!email) {
                showError('يرجى إدخال البريد الإلكتروني.');
                emailInput?.focus();
                return;
            }
            if (!password) {
                showError('يرجى إدخال كلمة المرور.');
                passwordInput?.focus();
                return;
            }

            console.log('📧 البريد المستخدم لتسجيل الدخول:', email);

            disableForm(true);
            showLoader(true, 'جاري إرسال رمز التحقق...');

            try {
                // إرسال رمز OTP عبر قالب Magic Link / Email OTP
                const { error } = await supabase.auth.signInWithOtp({
                    email: email,
                    options: { shouldCreateUser: false }
                });

                if (error) throw error;

                // تخزين بيانات الجلسة المؤقتة للتحقق
                localStorage.setItem('tera_verify_type', 'login_otp');   // نوع العملية
                localStorage.setItem('pendingVerificationEmail', email);
                sessionStorage.setItem('tera_login_password', password);

                showLoader(false);
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> تم إرسال الرمز';

                // توجيه المستخدم إلى صفحة التحقق
                setTimeout(() => {
                    window.location.replace('/auth/verify-otp.html');
                }, 800);

            } catch (error) {
                console.error('❌ [Login] فشل إرسال رمز التحقق:', error);
                showLoader(false);

                let msg = 'فشل إرسال رمز التحقق.';
                if (error.message.includes('rate limit')) msg = 'تم تجاوز عدد المحاولات. يرجى الانتظار.';
                else if (error.message.includes('Email not found')) msg = 'البريد الإلكتروني غير مسجل.';
                else msg = error.message;
                showError(msg);

            } finally {
                disableForm(false);
                if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> تسجيل الدخول الآمن';
            }
        });
    });
})();
