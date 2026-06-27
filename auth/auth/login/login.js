/**
 * ============================================================
 * login.js - صفحة تسجيل الدخول
 * ============================================================
 * - تم حل مشكلة تداخل المتغيرات (PATHS Collision Fixed)
 * - يستخدم مسارات مطلقة (Absolute Paths) حصراً لتفادي أخطاء الاستضافة (404)
 */

(function() {
    'use strict';

    // ========================================================================
    // 1. المسارات المطلقة (لضمان دقة التوجيه من أي مستوى في هيكل الملفات)
    // ========================================================================
    const LOGIN_ROUTES = {
        dashboard: '/pages/dashboard/index.html',
        register: '/auth/register/register.html',
        forgotPassword: '/auth/forgot-password.html',
        home: '/index.html'
    };

    // ========================================================================
    // 2. تهيئة الصفحة
    // ========================================================================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔐 [Login] DOM loaded, initializing login form...');

        // 2.1. تهيئة زر التبديل بين إخفاء وإظهار كلمة المرور
        if (typeof TeraAuth !== 'undefined' && TeraAuth) {
            TeraAuth.initPasswordToggles();
        }

        // 2.2. ربط نموذج تسجيل الدخول
        const loginForm = document.getElementById('teraLoginForm');
        const identifierInput = document.getElementById('login_identifier');
        const passwordInput = document.getElementById('login_password');
        const loginButton = document.getElementById('loginSubmitBtn');
        const showPasswordCheckbox = document.getElementById('show_login_password');
        const rememberMeCheckbox = document.getElementById('remember_me');

        // 2.3. عناصر واجهة المستخدم الإضافية
        const loginErrorBox = document.getElementById('loginErrorBox');
        const errorBoxText = document.getElementById('errorBoxText');
        const creativeLoaderScreen = document.getElementById('creativeLoaderScreen');
        const progressFillBar = document.getElementById('progressFillBar');

        if (!loginForm) {
            console.warn('⚠️ [Login] عنصر #teraLoginForm غير موجود في الصفحة');
            return;
        }

        // 2.4. أزرار التنقل (إنشاء حساب جديد + العودة للشاشة الرئيسية)
        document.addEventListener('click', function(e) {
            const routingLink = e.target.closest('.routing-link, .routing-link-secondary');
            if (!routingLink) return;

            e.preventDefault();
            const href = routingLink.getAttribute('href');

            if (href.includes('register')) {
                window.location.replace(LOGIN_ROUTES.register);
            } else if (href.includes('index.html')) {
                window.location.replace(LOGIN_ROUTES.home);
            }
        });

        // 2.5. معالجة نموذج تسجيل الدخول
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const identifier = identifierInput.value.trim();
            const password = passwordInput.value.trim();

            // تنظيف الأخطاء السابقة
            const identifierError = document.getElementById('identifier-error');
            const passwordError = document.getElementById('password-error');

            if (identifierError) identifierError.textContent = '';
            if (passwordError) passwordError.textContent = '';
            if (loginErrorBox) loginErrorBox.style.display = 'none';

            // التحقق من الإدخال
            if (!identifier) {
                if (identifierError) identifierError.textContent = 'يرجى إدخال الاسم/البريد الإلكتروني/رقم الجوال.';
                identifierInput.focus();
                return;
            }

            if (!password) {
                if (passwordError) passwordError.textContent = 'يرجى إدخال كلمة المرور.';
                passwordInput.focus();
                return;
            }

            // إظهار الـ loader
            if (creativeLoaderScreen) creativeLoaderScreen.style.display = 'flex';
            if (loginButton) loginButton.disabled = true;

            // تشغيل شريط التقدم
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 5;
                if (progressFillBar) progressFillBar.style.width = progress + '%';
                if (progress >= 100) clearInterval(progressInterval);
            }, 40);

            try {
                // نداء دالة تسجيل الدخول من auth.js
                const user = await TeraAuth.login(identifier, password);

                console.log('✅ [Login] تسجيل دخول ناجح، توجيه إلى لوحة التحكم');

                if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                    localStorage.setItem('tera_remember', 'true');
                } else {
                    localStorage.removeItem('tera_remember');
                }

                if (creativeLoaderScreen) creativeLoaderScreen.style.display = 'none';
                
                // التوجيه للوحة التحكم بالاعتماد على المسار المطلق
                window.location.replace(LOGIN_ROUTES.dashboard);
                
            } catch (error) {
                console.error('❌ [Login] خطأ في تسجيل الدخول:', error);

                if (creativeLoaderScreen) creativeLoaderScreen.style.display = 'none';
                if (progressFillBar) progressFillBar.style.width = '0%';

                const errorMsg = error.message || 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مجددًا.';
                if (errorBoxText) errorBoxText.textContent = errorMsg;
                if (loginErrorBox) loginErrorBox.style.display = 'flex';

                if (loginButton) loginButton.disabled = false;
            }
        });

        // 2.6. السماح بالضغط على Enter لتسجيل الدخول
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const activeElement = document.activeElement;
                if (
                    activeElement &&
                    (activeElement.id === 'login_identifier' || activeElement.id === 'login_password')
                ) {
                    event.preventDefault();
                    if(typeof loginForm.requestSubmit === 'function') {
                        loginForm.requestSubmit();
                    } else {
                        loginForm.dispatchEvent(new Event('submit'));
                    }
                }
            }
        });

        console.log('✅ [Login] السكربت جاهز بدون أي تداخل برمجي ومع مسارات مطلقة');
    });

})(); // نهاية التغليف لحماية المتغيرات
