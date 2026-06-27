/**
 * login.js - معالجة تسجيل الدخول عبر Supabase
 * يعتمد على TeraAuth.login (من auth.js) التي تستخدم supabase.auth.signInWithPassword
 * يتضمن فحص الجلسة المسبقة، تأمين الصفحة، تفعيل إظهار كلمة المرور، وعرض اللودر.
 */
(function() {
    'use strict';

    // ---------- عناصر الصفحة ----------
    const form = document.getElementById('teraLoginForm');
    const errorBox = document.getElementById('loginErrorBox');
    const errorText = document.getElementById('errorBoxText');
    const loaderOverlay = document.getElementById('creativeLoaderScreen');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const showPasswordCheckbox = document.getElementById('show_login_password');
    const passwordInput = document.getElementById('login_password');

    // ---------- ١. فحص الجلسة الحالية ----------
    if (window.TeraAuth && window.TeraAuth.isLoggedIn()) {
        // المستخدم مسجل دخول مسبقاً -> توجيه فوري للوحة التحكم
        window.TeraAuth.redirectTo(window.TeraAuth.getRelativePath('pages/dashboard/index.html'));
        return; // إيقاف التنفيذ
    }

    // ---------- ٢. تأمين الصفحة (منع حلقات التوجيه) ----------
    if (window.TeraAuth) {
        window.TeraAuth.disableAutoRedirect();
        window.TeraAuth.blockCheck();
        console.log('🔒 [login.js] تم تأمين صفحة الدخول');
    }

    // ---------- ٣. تفعيل إظهار/إخفاء كلمة المرور ----------
    if (showPasswordCheckbox && passwordInput) {
        showPasswordCheckbox.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    }

    // ---------- ٤. معالجة تقديم النموذج ----------
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // إخفاء أي خطأ سابق
        if (errorBox) errorBox.style.display = 'none';

        // جلب البيانات
        const email = document.getElementById('login_identifier').value.trim();
        const password = passwordInput ? passwordInput.value : '';

        if (!email || !password) {
            showError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }

        // إظهار اللودر
        showLoader(true);
        if (submitBtn) submitBtn.disabled = true;

        try {
            if (!window.TeraAuth) {
                throw new Error('نظام المصادقة غير جاهز، أعد تحميل الصفحة.');
            }

            const user = await window.TeraAuth.login(email, password);
            console.log('✅ [Login] تم تسجيل الدخول بنجاح:', user);

            // التوجيه إلى لوحة التحكم
            const dashboardPath = window.TeraAuth.getRelativePath('pages/dashboard/index.html');
            window.location.replace(dashboardPath);
        } catch (error) {
            console.error('❌ [Login] فشل تسجيل الدخول:', error);
            let message = 'بيانات الدخول غير صحيحة';
            if (error.message.includes('Invalid login credentials')) {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد من صحة البيانات ومن تأكيد بريدك الإلكتروني (إن لزم).';
            } else if (error.message.includes('Email not confirmed')) {
                message = 'يرجى تأكيد بريدك الإلكتروني أولاً. تحقق من صندوق الوارد.';
            } else {
                message = error.message || message;
            }
            showError(message);
        } finally {
            showLoader(false);
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    // ---------- دوال مساعدة ----------
    function showLoader(show) {
        if (loaderOverlay) loaderOverlay.style.display = show ? 'flex' : 'none';
        // محاكاة شريط التقدم
        const progressBar = document.getElementById('progressFillBar');
        if (show && progressBar) {
            progressBar.style.width = '0%';
            setTimeout(() => { progressBar.style.width = '70%'; }, 500);
            setTimeout(() => { progressBar.style.width = '90%'; }, 1500);
        } else if (progressBar) {
            progressBar.style.width = '0%';
        }
    }

    function showError(message) {
        if (errorBox && errorText) {
            errorText.textContent = message;
            errorBox.style.display = 'block';
        }
    }
})();
