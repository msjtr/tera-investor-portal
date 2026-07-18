/**
 * login-tabs.js – إدارة التبويبات وفحص الجلسة (يدعم password_totp و password_otp)
 */
(function() {
    const tabPassword = document.getElementById('tabPassword');
    const tabTOTP = document.getElementById('tabTOTP');
    const passwordSection = document.getElementById('passwordSection');
    const totpSection = document.getElementById('totpSection');

    // تبديل التبويبات
    if (tabPassword) {
        tabPassword.addEventListener('click', () => {
            tabPassword.classList.add('active');
            tabTOTP.classList.remove('active');
            passwordSection.style.display = 'block';
            totpSection.style.display = 'none';
            const errorMsg = document.getElementById('loginError');
            if (errorMsg) errorMsg.style.display = 'none';
        });
    }

    if (tabTOTP) {
        tabTOTP.addEventListener('click', () => {
            tabTOTP.classList.add('active');
            tabPassword.classList.remove('active');
            passwordSection.style.display = 'none';
            totpSection.style.display = 'block';
            const errorMsg = document.getElementById('loginError');
            if (errorMsg) errorMsg.style.display = 'none';
        });
    }

    // فحص الجلسة عند تحميل الصفحة
    async function checkExistingSession() {
        if (!window.Auth) {
            await new Promise(resolve => setTimeout(resolve, 300));
            if (!window.Auth) return;
        }
        try {
            const valid = await window.Auth.isSessionValid();
            if (!valid) return;

            const sessionId = sessionStorage.getItem('currentSessionId');
            const loginMethod = sessionStorage.getItem('loginMethod');

            if (sessionId) {
                // جلسة كاملة – انتقال إلى لوحة التحكم
                window.location.replace('/pages/dashboard/index.html');
            } else if (loginMethod === 'password_totp') {
                // المستخدم في منتصف عملية TOTP
                window.location.replace('/auth/verify-totp.html');
            } else if (loginMethod === 'password_otp') {
                // المستخدم في منتصف عملية OTP بريدي
                window.location.replace('/auth/verify-otp.html');
            } else {
                // جلسة قديمة – إنهاء
                await window.Auth.logout();
            }
        } catch (e) {
            console.warn('تعذر فحص الجلسة:', e);
        }
    }

    window.addEventListener('load', () => setTimeout(checkExistingSession, 300));
})();
