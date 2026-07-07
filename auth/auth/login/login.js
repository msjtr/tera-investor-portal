/**
 * login.js – مدير تسجيل الدخول مع التحقق الإجباري من البريد (OTP)
 * المسار: auth/auth/login/login.js
 */
(function() {
    'use strict';

    const DASHBOARD_URL = '/pages/dashboard/index.html';
    const VERIFY_OTP_URL = '/auth/verify-otp.html';

    const form = document.getElementById('teraLoginForm');
    const emailInput = document.getElementById('login_identifier');
    const passwordInput = document.getElementById('login_password');
    const showPasswordCheck = document.getElementById('show_login_password');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const alertBox = document.getElementById('formAlert');
    const alertIcon = document.getElementById('alertIcon');
    const alertMessage = document.getElementById('alertMessage');
    const loader = document.getElementById('creativeLoaderScreen');

    let supabaseClient = null;

    async function getClient() {
        if (window.teraSupabase) return window.teraSupabase;
        return new Promise((resolve) => {
            document.addEventListener('supabase:ready', e => resolve(e.detail.client), { once: true });
        });
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
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
        showLoader();

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                let msg = 'بيانات الدخول غير صحيحة. حاول مرة أخرى.';
                if (error.message.includes('Invalid login credentials')) msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                showAlert(msg, 'error');
                return;
            }

            const user = data.user;

            // ✅ فحص تأكيد البريد – يُطبق على الجميع
            if (!user.email_confirmed_at) {
                // إرسال رمز تحقق OTP إلى البريد الإلكتروني
                try {
                    await supabaseClient.auth.signInWithOtp({
                        email: email,
                        options: { shouldCreateUser: false }
                    });
                } catch (otpError) {
                    console.warn('تعذر إرسال رمز التحقق:', otpError);
                }

                localStorage.setItem('pendingVerificationEmail', email);
                localStorage.setItem('tera_verify_type', 'signup');
                showAlert('يجب تأكيد بريدك الإلكتروني. جاري تحويلك إلى صفحة التحقق...', 'success');
                setTimeout(() => {
                    window.location.replace(VERIFY_OTP_URL);
                }, 1500);
                return;
            }

            // البريد مؤكد – الدخول إلى لوحة التحكم
            showAlert('تم تسجيل الدخول بنجاح، جاري توجيهك...', 'success');
            window.location.replace(DASHBOARD_URL);
        } catch (err) {
            console.error(err);
            showAlert('حدث خطأ غير متوقع. حاول لاحقاً.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> تسجيل الدخول الآمن';
            hideLoader();
        }
    }

    async function init() {
        try { supabaseClient = await getClient(); } catch (e) {
            showAlert('تعذر الاتصال بالخادم.', 'error'); return;
        }
        form.addEventListener('submit', handleLogin);
        showPasswordCheck.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });
        console.log('✅ صفحة الدخول جاهزة.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
