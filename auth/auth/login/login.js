/**
 * login.js – معالج تسجيل الدخول مع تحقق OTP (Enterprise)
 * ======================================================
 * يعتمد على: supabase-client.js, auth.js
 * متوافق مع: login.html (login_identifier, login_password, teraLoginForm)
 * يرسل رمز OTP عبر قالب Magic Link / Email OTP
 * النسخة المُحدَّثة: تستخدم TeraAuth للتوجيه الموحد، وتحسين معالجة الأخطاء
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function () {
        const loginForm = document.getElementById('teraLoginForm');
        if (!loginForm) return;

        // عناصر DOM
        const emailInput = document.getElementById('login_identifier');
        const passwordInput = document.getElementById('login_password');
        const submitBtn = document.getElementById('loginSubmitBtn');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const loaderOverlay = document.getElementById('creativeLoaderScreen');
        const showPasswordToggle = document.getElementById('show_login_password');

        // تبديل إظهار كلمة المرور
        if (showPasswordToggle && passwordInput) {
            showPasswordToggle.addEventListener('change', function () {
                passwordInput.type = this.checked ? 'text' : 'password';
            });
        }

        // ========== التأكد من وجود TeraAuth ==========
        if (!window.TeraAuth) {
            showError('تعذر تحميل نظام المصادقة.');
            disableForm(true);
            return;
        }

        // انتظار تهيئة TeraAuth (إذا لم تكن جاهزة)
        if (!window.TeraAuth._initialized) {
            await window.TeraAuth.init();
        }

        const auth = window.TeraAuth;
        const supabase = auth._client;
        if (!supabase) {
            showError('تعذر الاتصال بخدمة المصادقة.');
            disableForm(true);
            return;
        }

        console.log('🔒 [Login] تم تأمين صفحة الدخول');

        // ========== دوال مساعدة ==========
        function disableForm(disabled) {
            if (emailInput) emailInput.disabled = disabled;
            if (passwordInput) passwordInput.disabled = disabled;
            if (submitBtn) submitBtn.disabled = disabled;
        }

        function showLoader(show, text = 'جاري المعالجة...') {
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

        // ========== معالج تقديم النموذج ==========
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideAlert();

            const email = emailInput?.value.trim() || '';
            const password = passwordInput?.value || '';

            // التحقق من صحة الإدخال
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

            // التحقق من صيغة البريد (اختياري)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('يرجى إدخال بريد إلكتروني صحيح.');
                emailInput?.focus();
                return;
            }

            console.log('📧 البريد:', email);
            disableForm(true);
            showLoader(true, 'جاري إرسال رمز التحقق...');

            try {
                // إرسال رمز OTP عبر البريد
                const { error } = await supabase.auth.signInWithOtp({
                    email: email,
                    options: {
                        shouldCreateUser: false,
                        // يمكن إضافة تخصيص للقالب هنا إن لزم
                        // emailRedirectTo: window.location.origin + '/auth/verify-otp.html'
                    }
                });

                if (error) throw error;

                // حفظ بيانات الجلسة للتوجيه بعد التحقق
                localStorage.setItem('tera_verify_type', 'login_otp');
                localStorage.setItem('pendingVerificationEmail', email);
                sessionStorage.setItem('tera_login_password', password);

                showLoader(false);
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> تم إرسال الرمز';

                // استخدام TeraAuth للتوجيه (مسار نسبي)
                setTimeout(() => {
                    auth.redirectTo('/auth/verify-otp.html');
                }, 800);

            } catch (error) {
                console.error('❌ فشل إرسال رمز التحقق:', error);
                showLoader(false);
                let msg = 'فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.';
                if (error.message) {
                    if (error.message.includes('rate limit')) {
                        msg = 'تم تجاوز عدد المحاولات. يرجى الانتظار بضع دقائق.';
                    } else if (error.message.includes('Email not found') || error.message.includes('User not found')) {
                        msg = 'البريد الإلكتروني غير مسجل. يرجى التسجيل أولاً.';
                    } else if (error.message.includes('invalid')) {
                        msg = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
                    } else {
                        msg = error.message;
                    }
                }
                showError(msg);
                // إعادة تمكين الحقول
                disableForm(false);
                if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> تسجيل الدخول الآمن';
            } finally {
                // تأكد من إعادة تمكين الحقول في كل الأحوال
                disableForm(false);
                if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> تسجيل الدخول الآمن';
            }
        });
    });
})();
