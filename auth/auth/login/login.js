<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <title>التحقق من المصادقة الثنائية | تيرا</title>
    <link rel="icon" type="image/svg+xml" href="/images/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/assets/css/core.css">
    <link rel="stylesheet" href="/assets/css/main.css">
    <link rel="stylesheet" href="/assets/css/auth.css">
    <style>
        /* نفس أنماط verify-totp السابقة */
        :root { --primary: #028090; --primary-dark: #0A1B3F; --danger: #dc2626; --success: #059669; --gray-50: #f8fafc; --gray-100: #f1f5f9; --gray-200: #e2e8f0; --gray-300: #d1d9e6; --gray-500: #64748b; --gray-700: #334155; --gray-900: #0A1B3F; --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px; }
        /* … (جميع الأنماط السابقة) … */
    </style>
</head>
<body>
    <header class="focused-header no-print">
        <div class="logo"><img src="/images/logo.svg" alt="تيرا"></div>
        <div class="client-info">
            <h5 id="headerUserName">مستخدم</h5>
            <div class="avatar" id="headerAvatar">م</div>
        </div>
    </header>
    <div class="page-subheader no-print">
        <h1><i class="fas fa-shield-alt"></i> التحقق من المصادقة الثنائية</h1>
        <a href="/auth/auth/login/login.html" class="btn-back" id="backLink"><i class="fas fa-arrow-right"></i> العودة</a>
    </div>
    <main class="content-container">
        <div class="auth-card">
            <div class="text-center">
                <div class="totp-icon-circle"><i class="fas fa-shield-alt"></i></div>
                <h2 class="portal-title">المصادقة الثنائية</h2>
            </div>
            <div class="instruction-wrapper">
                <p id="instructionText">أدخل رمز التحقق المكون من 6 أرقام من تطبيق المصادقة على هاتفك.</p>
                <span id="instructionEmailText"></span>
            </div>
            <div id="totpError" class="alert-box error" role="alert"></div>
            <div id="totpSuccess" class="alert-box success" role="alert"></div>
            <div class="otp-fields-container" id="totpFieldsContainer">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric" autocomplete="one-time-code">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-input" maxlength="1" inputmode="numeric">
            </div>
            <button type="button" id="verifyTotpBtn" class="btn-submit" disabled>
                <i class="fas fa-check-circle"></i> تحقق
            </button>
        </div>
    </main>
    <footer class="page-footer no-print">© 2026 بوابة تيرا للمستثمرين. جميع الحقوق محفوظة.</footer>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="/assets/js/supabase-client.js"></script>
    <script src="/assets/js/auth.js"></script>
    <script src="/assets/js/modules/session-manager.js"></script>
    <script>
        // سكريبت verify-totp المطور
        (function() {
            const OTP_LENGTH = 6;
            const TOTP_TIMEOUT = 10 * 60 * 1000;
            let totpTimeout;

            const inputs = document.querySelectorAll('#totpFieldsContainer .otp-input');
            const verifyBtn = document.getElementById('verifyTotpBtn');
            const errorEl = document.getElementById('totpError');
            const successEl = document.getElementById('totpSuccess');
            const backLink = document.getElementById('backLink');

            // تهيئة اسم المستخدم والبريد
            const name = sessionStorage.getItem('otpName');
            if (name) {
                document.getElementById('headerUserName').textContent = name;
                document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
            }
            const email = sessionStorage.getItem('otpEmail');
            if (email) {
                document.getElementById('instructionEmailText').textContent = email;
            } else {
                showError('انتهت الجلسة. يرجى العودة لصفحة الدخول.');
            }

            function getCode() { let code = ''; inputs.forEach(i => code += i.value); return code; }
            function checkComplete() { verifyBtn.disabled = getCode().length !== OTP_LENGTH; }
            function showError(msg) { if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'flex'; } if (successEl) successEl.style.display = 'none'; }
            function clearMessages() { if (errorEl) errorEl.style.display = 'none'; if (successEl) successEl.style.display = 'none'; }

            inputs.forEach((input, index) => {
                input.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                    if (e.target.value && index < OTP_LENGTH - 1) inputs[index + 1]?.focus();
                    checkComplete();
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && index > 0) inputs[index - 1]?.focus();
                });
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                    if (digits.length === OTP_LENGTH) {
                        for (let i = 0; i < OTP_LENGTH; i++) inputs[i].value = digits[i] || '';
                        checkComplete();
                    }
                });
            });

            verifyBtn.addEventListener('click', async () => {
                const code = getCode();
                if (code.length !== OTP_LENGTH) return;
                clearMessages();
                verifyBtn.disabled = true;
                verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

                try {
                    const email = sessionStorage.getItem('otpEmail');
                    if (!email) throw new Error('البريد الإلكتروني غير متوفر');

                    const loginMethod = sessionStorage.getItem('loginMethod');

                    if (loginMethod === 'password_totp') {
                        // تم الوصول بعد كلمة مرور (جلسة موجودة)
                        const result = await window.Auth.completeLoginWithTOTP(code);
                        if (!result?.user) throw new Error('لم يتم التحقق');
                        await tryCreateSessionRecord(result.user.id);
                    } else {
                        // دخول مباشر من تبويب TOTP
                        await window.Auth.loginWithTOTP(email, code);
                    }

                    clearTimeout(totpTimeout);
                    sessionStorage.removeItem('loginMethod');
                    sessionStorage.removeItem('otpEmail');
                    sessionStorage.removeItem('otpName');

                    if (successEl) {
                        successEl.textContent = 'تم التحقق بنجاح، جاري تحويلك...';
                        successEl.style.display = 'flex';
                    }
                    setTimeout(() => { window.location.href = '/pages/dashboard/index.html'; }, 3000);
                } catch (error) {
                    showError(error.message || 'رمز التحقق غير صحيح');
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تحقق';
                }
            });

            async function tryCreateSessionRecord(userId) {
                if (!window.SessionManager) return;
                try {
                    const result = await window.SessionManager.createSessionRecord(userId);
                    if (result?.success) {
                        sessionStorage.setItem('currentSessionId', result.sessionId);
                        window.SessionManager.startSessionGuard?.(userId, result.sessionId);
                    }
                } catch (e) {}
            }

            function startTimeout() {
                totpTimeout = setTimeout(async () => {
                    if (window.Auth?.cancelTOTPLogin) await window.Auth.cancelTOTPLogin();
                    sessionStorage.removeItem('loginMethod');
                    sessionStorage.removeItem('otpEmail');
                    sessionStorage.removeItem('otpName');
                    window.location.href = '/auth/auth/login/login.html';
                }, TOTP_TIMEOUT);
            }
            startTimeout();

            if (backLink) {
                backLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (window.Auth?.cancelTOTPLogin) await window.Auth.cancelTOTPLogin();
                    sessionStorage.removeItem('loginMethod');
                    sessionStorage.removeItem('otpEmail');
                    sessionStorage.removeItem('otpName');
                    window.location.href = backLink.href;
                });
            }

            window.addEventListener('beforeunload', () => { if (totpTimeout) clearTimeout(totpTimeout); });
        })();
    </script>
</body>
</html>
