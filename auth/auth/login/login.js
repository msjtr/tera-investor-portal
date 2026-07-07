/**
 * login.js – مدير تسجيل الدخول مع مصادقة OTP إجبارية للجميع
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
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';
        showLoader();

        try {
            // 1. التحقق من صحة كلمة المرور أولاً
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                let msg = 'بيانات الدخول غير صحيحة. حاول مرة أخرى.';
                if (error.message.includes('Invalid login credentials')) msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                showAlert(msg, 'error');
                return;
            }

            // 2. كلمة المرور صحيحة – إرسال رمز OTP إجباري للجميع
            await supabaseClient.auth.signInWithOtp({
                email: email,
                options: { shouldCreateUser: false }
            });

            // 3. تخزين البيانات المؤقتة للتحقق في verify-otp.js
            localStorage.setItem('pendingVerificationEmail', email);
            localStorage.setItem('tera_verify_type', 'login_otp');
            sessionStorage.setItem('tera_login_password', password); // تخزين مؤقت لكلمة المرور

            showAlert('تم إرسال رمز تحقق إلى بريدك الإلكتروني. أكمل المصادقة...', 'success');
            setTimeout(() => {
                window.location.replace(VERIFY_OTP_URL);
            }, 1500);

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
        console.log('✅ صفحة الدخول جاهزة (OTP إجباري للجميع).');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
