/**
 * ============================================================
 * login.js - صفحة تسجيل الدخول
 * ============================================================
 * - يتوافق مع auth.js الجديد
 * - يستخدم مسارات absolute (PATHS.login, PATHS.dashboard)
 * - يمنع اللوب عند الانتقال من صفحة الدخول
 */
'use strict';

// ========================================================================
// 1. المسارات الثابتة (متسقة مع auth.js)
// ========================================================================
const PATHS = {
    login: '/auth/auth/login/login.html',
    dashboard: '/pages/dashboard/index.html',
    register: '/auth/register/register.html',
    forgotPassword: '/auth/forgot-password.html'
};

// ========================================================================
// 2. تهيئة الصفحة
// ========================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 [Login] DOM loaded, initializing login form...');

    // 2.1. تهيئة زر التبديل بين إخفاء وإظهار كلمة المرور
    TeraAuth.initPasswordToggles();

    // 2.2. ربط نموذج تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');

    if (!loginForm) {
        console.warn('⚠️ [Login] عنصر #login-form غير موجود في الصفحة');
        return;
    }

    if (!usernameInput || !passwordInput) {
        console.warn('⚠️ [Login] عناصر الإدخال غير موجودة: #username أو #password');
        return;
    }

    // تهيئة الأزرار الإضافية
    const registerButton = document.getElementById('btn-register');
    const forgotPasswordButton = document.getElementById('btn-forgot-password');

    if (registerButton) {
        registerButton.addEventListener('click', function() {
            window.location.replace(PATHS.register);
        });
    }

    if (forgotPasswordButton) {
        forgotPasswordButton.addEventListener('click', function() {
            window.location.replace(PATHS.forgotPassword);
        });
    }

    // 2.3. تسجيل الدخول
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const identifier = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!identifier) {
            alert('يرجى إدخال الاسم/البريد الإلكتروني/رقم الجوال.');
            return;
        }

        if (!password) {
            alert('يرجى إدخال كلمة المرور.');
            return;
        }

        // تعطيل الزر مؤقتًا
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = 'جاري تسجيل الدخول...';
        }

        try {
            const user = await TeraAuth.login(identifier, password);

            console.log('✅ [Login] تسجيل دخول ناجح، توجيه إلى لوحة التحكم');

            // الانتقال إلى لوحة التحكم
            window.location.replace(PATHS.dashboard);
        } catch (error) {
            console.error('❌ [Login] خطأ في تسجيل الدخول:', error);

            alert(error.message || 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مجددًا.');

            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = 'تسجيل الدخول';
            }
        }
    });

    // 2.4. السماح بالضغط على Enter لتسجيل الدخول
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            const activeElement = document.activeElement;
            if (
                activeElement &&
                (activeElement.id === 'username' || activeElement.id === 'password')
            ) {
                event.preventDefault();
                loginForm.dispatchEvent(new Event('submit'));
            }
        }
    });
});
