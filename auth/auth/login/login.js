/**
 * login.js – مدير تسجيل الدخول مع مصادقة OTP إجبارية للجميع
 */
(function() {
    'use strict';

    const DASHBOARD_URL = '/pages/dashboard/index.html';
    const VERIFY_OTP_URL = '/auth/verify-otp.html';

    window.addEventListener('DOMContentLoaded', async function() {
        const form = document.getElementById('teraLoginForm');
        const emailInput = document.getElementById('login_identifier');
        const passwordInput = document.getElementById('login_password');
        const showPasswordCheck = document.getElementById('show_login_password');
        const submitBtn = document.getElementById('loginSubmitBtn');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const loader = document.getElementById('creativeLoaderScreen');

        if (!form || !emailInput || !passwordInput || !submitBtn) return;

        let supabaseClient = null;

        try {
            if (typeof window.waitForSupabase === 'function') {
                supabaseClient = await window.waitForSupabase();
            } else if (window.teraSupabase) {
                supabaseClient = window.teraSupabase;
            } else {
                throw new Error('عميل Supabase غير متوفر');
            }
        } catch (e) {
            showAlert('تعذر الاتصال بالخادم. حاول تحديث الصفحة.', 'error');
            return;
        }

        function showAlert(msg, type = 'error') {
            if (!alertBox) return;
            alertBox.style.display = 'flex';
            alertBox.className = `alert-box show ${type}`;
            alertIcon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
            alertMessage.textContent = msg;
            clearTimeout(window._alertTimer);
            window._alertTimer = setTimeout(() => {
                alertBox.style.display = 'none';
                alertBox.className = 'alert-box';
            }, 8000);
        }

        function showLoader() { if (loader) loader.style.display = 'flex'; }
        function hideLoader() { if (loader) loader.style.display = 'none'; }

        async function handleLogin(e) {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                showAlert('يرجى إدخال البريد الإلكتروني وكلمة المرور.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';
            showLoader();

            try {
                const { error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password,
                    options: { shouldCreateUser: false }
                });

                if (error) {
                    let msg = 'بيانات الدخول غير صحيحة.';
                    if (error.message.includes('Invalid login credentials')) msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                    else if (error.message.includes('Email not confirmed')) msg = 'يجب تأكيد البريد الإلكتروني أولاً.';
                    showAlert(msg, 'error');
                    return;
                }

                await supabaseClient.auth.signInWithOtp({
                    email: email,
                    options: { shouldCreateUser: false }
                });

                localStorage.setItem('pendingVerificationEmail', email);
                localStorage.setItem('tera_verify_type', 'login_otp');
                sessionStorage.setItem('tera_login_password', password);

                showAlert('تم إرسال رمز تحقق إلى بريدك الإلكتروني. جاري توجيهك...', 'success');
                setTimeout(() => {
                    window.location.replace(VERIFY_OTP_URL);
                }, 1000);

            } catch (err) {
                console.error(err);
                showAlert('حدث خطأ. يرجى المحاولة لاحقاً.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> تسجيل الدخول الآمن';
                hideLoader();
            }
        }

        form.addEventListener('submit', handleLogin);
        showPasswordCheck.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    });
})();
