/**
 * login.js – مدير تسجيل الدخول مع مصادقة OTP إجبارية للجميع (إصدار محدث)
 * المسار: auth/auth/login/login.js
 * - يتحقق من كلمة المرور ثم يرسل OTP
 * - يخزن البيانات المؤقتة للتحقق في verify-otp.js
 * - لا ينشئ جلسة كاملة قبل إدخال OTP
 */
(function() {
    'use strict';

    const DASHBOARD_URL = '/pages/dashboard/index.html';
    const VERIFY_OTP_URL = '/auth/verify-otp.html';

    window.addEventListener('DOMContentLoaded', async function() {
        console.log('✅ login.js: DOM جاهز.');

        const form = document.getElementById('teraLoginForm');
        const emailInput = document.getElementById('login_identifier');
        const passwordInput = document.getElementById('login_password');
        const showPasswordCheck = document.getElementById('show_login_password');
        const submitBtn = document.getElementById('loginSubmitBtn');
        const alertBox = document.getElementById('formAlert');
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        const loader = document.getElementById('creativeLoaderScreen');

        // فحص وجود العناصر الأساسية
        if (!form || !emailInput || !passwordInput || !submitBtn) {
            console.error('❌ login.js: أحد العناصر الأساسية غير موجود.');
            return;
        }

        let supabaseClient = null;

        // الحصول على العميل باستخدام الدالة الموحدة
        try {
            if (typeof window.waitForSupabase === 'function') {
                supabaseClient = await window.waitForSupabase();
            } else if (window.teraSupabase) {
                supabaseClient = window.teraSupabase;
            } else {
                supabaseClient = await new Promise((resolve) => {
                    document.addEventListener('supabase:ready', e => resolve(e.detail.client), { once: true });
                });
            }
            console.log('✅ login.js: العميل جاهز.');
        } catch (e) {
            console.error('❌ فشل الحصول على عميل Supabase:', e);
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
            console.log('🔘 زر الدخول تم الضغط عليه.');

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
                // 1. التحقق من صحة كلمة المرور (سينشئ جلسة مؤقتة)
                console.log('🔐 محاولة signInWithPassword...');
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    console.error('❌ فشل المصادقة:', error);
                    let msg = 'بيانات الدخول غير صحيحة.';
                    if (error.message.includes('Invalid login credentials')) {
                        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                    } else if (error.message.includes('Email not confirmed')) {
                        msg = 'يجب تأكيد البريد الإلكتروني أولاً.';
                    }
                    showAlert(msg, 'error');
                    return;
                }

                console.log('✅ كلمة المرور صحيحة. إرسال OTP...');

                // 2. إرسال OTP إجباري (الرمز سيُرسل للبريد)
                await supabaseClient.auth.signInWithOtp({
                    email: email,
                    options: { shouldCreateUser: false }
                });

                // 3. تخزين بيانات الجلسة المؤقتة لاستخدامها في verify-otp.js
                localStorage.setItem('pendingVerificationEmail', email);
                localStorage.setItem('tera_verify_type', 'login_otp');
                // تخزين كلمة المرور بشكل مؤقت في sessionStorage (وليس localStorage)
                sessionStorage.setItem('tera_login_password', password);

                console.log('📧 OTP أُرسل. تحويل إلى صفحة التحقق.');
                showAlert('تم إرسال رمز تحقق إلى بريدك الإلكتروني. جاري توجيهك...', 'success');
                setTimeout(() => {
                    window.location.replace(VERIFY_OTP_URL);
                }, 1000);

            } catch (err) {
                console.error('💥 خطأ غير متوقع:', err);
                showAlert('حدث خطأ. يرجى المحاولة لاحقاً.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> تسجيل الدخول الآمن';
                hideLoader();
            }
        }

        // ربط الأحداث
        form.addEventListener('submit', handleLogin);
        console.log('👂 مستمع الحدث submit مُضاف.');

        showPasswordCheck.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });

        console.log('✅ login.js: جاهز تماماً.');
    });
})();
