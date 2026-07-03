/**
 * login.js – معالج تسجيل الدخول (Enterprise)
 * ===========================================
 * يعتمد على: supabase-client.js, auth.js
 * - ينتظر جاهزية Supabase
 * - يعالج نموذج تسجيل الدخول
 * - يعرض رسائل عربية واضحة
 * - يوجّه إلى لوحة التحكم بعد النجاح
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function () {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');

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
                // انتظار احتياطي
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

        // دالة تعطيل/تفعيل النموذج
        function disableForm(disabled) {
            if (emailInput) emailInput.disabled = disabled;
            if (passwordInput) passwordInput.disabled = disabled;
            if (submitBtn) submitBtn.disabled = disabled;
        }

        // عرض رسالة خطأ
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

            // طباعة تشخيصية للمساعدة
            console.log('📧 البريد المستخدم لتسجيل الدخول:', email);
            console.log('🔑 طول كلمة المرور:', password.length);

            disableForm(true);
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
            }

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                console.log('📬 data:', data);
                console.log('❌ error:', error);

                if (error) throw error;

                // نجاح – سيتم تحديث الجلسة بواسطة auth.js (إن كان محملاً)
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> تم الدخول بنجاح';
                }

                // توجيه إلى لوحة التحكم
                setTimeout(() => {
                    window.location.replace('/pages/dashboard/index.html');
                }, 800);

            } catch (error) {
                console.error('❌ [Login] فشل تسجيل الدخول:', error);

                let msg = 'فشل تسجيل الدخول.';
                if (error.message) {
                    if (error.message.includes('Invalid login credentials') || error.message.includes('invalid')) {
                        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                    } else if (error.message.includes('Email not confirmed')) {
                        msg = 'لم يتم تأكيد البريد الإلكتروني بعد. يرجى التحقق من بريدك.';
                    } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
                        msg = 'تم تجاوز عدد المحاولات. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
                    } else {
                        msg = error.message;
                    }
                }
                showError(msg);

            } finally {
                disableForm(false);
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
                }
            }
        });
    });
})();
