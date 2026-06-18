/**
 * ============================================================
 * login.js - سكريبت صفحة تسجيل الدخول لمنصة تيرا
 * ============================================================
 * هذا الملف مسؤول عن:
 * 1. معالجة تقديم نموذج تسجيل الدخول
 * 2. التحقق من صحة المدخلات
 * 3. التواصل مع TeraAuth لتسجيل الدخول
 * 4. إظهار وإخفاء كلمة المرور
 * 5. إدارة شاشة التحميل والرسائل
 * 6. منع الحلقات اللانهائية (إعادة التوجيه المتكرر)
 * ============================================================
 * يعتمد على:
 * - TeraAuth (المعرفة في assets/js/auth.js)
 * - توحيد المفاتيح: tera_token, tera_user
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. التأكد من أن الصفحة في وضع المصادقة (منع التوجيه المزدوج)
    // ============================================================

    // منع تنفيذ checkSession بشكل تلقائي عند تحميل الصفحة
    // (سيتم التعامل معه يدوياً بعد تسجيل الدخول)
    if (window.TeraAuth && typeof window.TeraAuth.checkSession === 'function') {
        const originalCheck = window.TeraAuth.checkSession;
        // استبدال الدالة مؤقتاً لمنع التوجيه التلقائي
        window.TeraAuth.checkSession = function() {
            // في صفحة تسجيل الدخول، لا نقوم بالتوجيه
            console.log('🔒 [login.js] تم تعطيل checkSession التلقائي في صفحة تسجيل الدخول');
            // لكن نحتفظ بالدالة الأصلية للاستخدام لاحقاً
        };
        // حفظ الدالة الأصلية لاستعادتها بعد تسجيل الدخول
        window._originalCheckSession = originalCheck;
    }

    // ============================================================
    // 2. مراجع عناصر DOM
    // ============================================================

    const loginForm = document.getElementById('teraLoginForm');
    const identifierInput = document.getElementById('login_identifier');
    const passwordInput = document.getElementById('login_password');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const errorBox = document.getElementById('loginErrorBox');
    const errorText = document.getElementById('errorBoxText');
    const loaderOverlay = document.getElementById('creativeLoaderScreen');
    const progressBar = document.getElementById('progressFillBar');
    const showPasswordCheckbox = document.getElementById('show_login_password');
    const rememberMeCheckbox = document.getElementById('remember_me');

    // ============================================================
    // 3. التحقق من وجود العناصر الأساسية
    // ============================================================

    if (!loginForm || !identifierInput || !passwordInput || !submitBtn) {
        console.error('❌ [login.js] عناصر النموذج الأساسية غير موجودة في الصفحة.');
        return;
    }

    // ============================================================
    // 4. دوال مساعدة
    // ============================================================

    /**
     * عرض رسالة خطأ في الصندوق العلوي
     * @param {string} message - نص الخطأ
     */
    function showError(message) {
        if (errorBox && errorText) {
            errorBox.style.display = 'flex';
            errorText.textContent = message;
        }
        // إضافة كلاس الخطأ للحقول
        identifierInput.classList.add('is-invalid-active');
        passwordInput.classList.add('is-invalid-active');
    }

    /**
     * إخفاء رسائل الخطأ
     */
    function hideError() {
        if (errorBox) {
            errorBox.style.display = 'none';
        }
        identifierInput.classList.remove('is-invalid-active', 'is-valid-active');
        passwordInput.classList.remove('is-invalid-active', 'is-valid-active');
        // إزالة رسائل الخطأ الصغيرة
        const idErr = document.getElementById('identifier-error');
        const passErr = document.getElementById('password-error');
        if (idErr) idErr.textContent = '';
        if (passErr) passErr.textContent = '';
    }

    /**
     * إظهار شاشة التحميل مع تقدم وهمي
     */
    function showLoader() {
        if (loaderOverlay) {
            loaderOverlay.style.display = 'flex';
            // بدء تقدم وهمي
            if (progressBar) {
                let progress = 0;
                progressBar.style.width = '0%';
                // إزالة أي مؤقت سابق
                if (loaderOverlay.dataset.progressInterval) {
                    clearInterval(parseInt(loaderOverlay.dataset.progressInterval));
                }
                const interval = setInterval(() => {
                    progress += Math.random() * 15 + 5;
                    if (progress > 95) progress = 95;
                    progressBar.style.width = progress + '%';
                    if (progress >= 95) {
                        clearInterval(interval);
                        loaderOverlay.dataset.progressInterval = '';
                    }
                }, 400);
                loaderOverlay.dataset.progressInterval = interval;
            }
        }
        // تعطيل الزر ومنع تكرار الإرسال
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';
    }

    /**
     * إخفاء شاشة التحميل وإعادة تمكين الزر
     */
    function hideLoader() {
        if (loaderOverlay) {
            loaderOverlay.style.display = 'none';
            // إيقاف مؤقت التقدم
            const interval = loaderOverlay.dataset.progressInterval;
            if (interval) {
                clearInterval(parseInt(interval));
                delete loaderOverlay.dataset.progressInterval;
            }
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> تسجيل الدخول الآمن';
    }

    /**
     * إعادة تعيين حالة الحقول (إزالة علامات الصحة/الخطأ)
     */
    function resetFieldStates() {
        identifierInput.classList.remove('is-valid-active', 'is-invalid-active');
        passwordInput.classList.remove('is-valid-active', 'is-invalid-active');
    }

    // ============================================================
    // 5. تبديل إظهار كلمة المرور
    // ============================================================

    if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    }

    // ============================================================
    // 6. تنظيف المدخلات وإزالة الأخطاء أثناء الكتابة
    // ============================================================

    identifierInput.addEventListener('input', function() {
        this.classList.remove('is-invalid-active');
        const err = document.getElementById('identifier-error');
        if (err) err.textContent = '';
        if (errorBox) errorBox.style.display = 'none';
    });

    passwordInput.addEventListener('input', function() {
        this.classList.remove('is-invalid-active');
        const err = document.getElementById('password-error');
        if (err) err.textContent = '';
        if (errorBox) errorBox.style.display = 'none';
    });

    // ============================================================
    // 7. معالجة تقديم النموذج (المنطق الرئيسي)
    // ============================================================

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // إعادة تعيين الأخطاء والحالات
        hideError();
        resetFieldStates();

        // قراءة القيم
        const identifier = identifierInput.value.trim();
        const password = passwordInput.value.trim();
        const remember = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

        // التحقق من المدخلات
        let isValid = true;
        const idErr = document.getElementById('identifier-error');
        const passErr = document.getElementById('password-error');

        if (!identifier) {
            if (idErr) idErr.textContent = 'يرجى إدخال اسم المستخدم أو البريد أو الجوال.';
            identifierInput.classList.add('is-invalid-active');
            isValid = false;
        }
        if (!password) {
            if (passErr) passErr.textContent = 'يرجى إدخال كلمة المرور.';
            passwordInput.classList.add('is-invalid-active');
            isValid = false;
        }

        if (!isValid) return;

        // ============================================================
        // 8. محاولة تسجيل الدخول عبر TeraAuth
        // ============================================================

        if (window.TeraAuth && typeof TeraAuth.login === 'function') {
            // إظهار التحميل
            showLoader();

            // محاولة تسجيل الدخول
            TeraAuth.login(identifier, password)
                .then(function(user) {
                    // نجاح تسجيل الدخول
                    console.log('✅ [login.js] تم تسجيل الدخول بنجاح', user);
                    
                    // إذا كان المستخدم يريد التذكر، نخزن معلومات إضافية
                    if (remember) {
                        try {
                            localStorage.setItem('tera_remember', 'true');
                            localStorage.setItem('tera_identifier', identifier);
                        } catch (e) {
                            console.warn('⚠️ [login.js] لا يمكن تخزين تذكرني:', e);
                        }
                    } else {
                        localStorage.removeItem('tera_remember');
                        localStorage.removeItem('tera_identifier');
                    }

                    // إكمال شريط التقدم
                    if (progressBar) progressBar.style.width = '100%';

                    // استعادة دالة checkSession الأصلية (إذا كانت موجودة)
                    if (window._originalCheckSession) {
                        window.TeraAuth.checkSession = window._originalCheckSession;
                        console.log('🔓 [login.js] تم استعادة checkSession الأصلية');
                    }

                    // التوجيه إلى لوحة التحكم (تجنب الحلقات)
                    setTimeout(function() {
                        // استخدام replace لتجنب إضافة الصفحة في التاريخ
                        window.location.replace('/pages/dashboard/index.html');
                    }, 600);
                })
                .catch(function(err) {
                    // فشل تسجيل الدخول
                    console.error('❌ [login.js] فشل تسجيل الدخول:', err);
                    hideLoader();
                    showError(err.message || 'فشل تسجيل الدخول. تأكد من بياناتك وحاول مرة أخرى.');
                    
                    // تنظيف أي بيانات جلسة خاطئة
                    localStorage.removeItem('tera_token');
                    localStorage.removeItem('tera_user');
                });
        } else {
            // ============================================================
            // 9. حل احتياطي (إذا لم يتم تحميل TeraAuth)
            // ============================================================
            console.warn('⚠️ [login.js] TeraAuth غير متاح، استخدام المحاكاة المحلية');

            // بيانات اختبارية (للتجربة)
            const mockUsers = [
                { username: '106', email: 'investor106@tera.sa', mobile: '506060606', password: '123' },
                { username: 'admin', email: 'admin@tera.sa', mobile: '500000000', password: 'admin123' }
            ];

            const matchedUser = mockUsers.find(u =>
                u.username === identifier ||
                u.email.toLowerCase() === identifier.toLowerCase() ||
                u.mobile === identifier
            );

            if (matchedUser && matchedUser.password === password) {
                // تخزين بيانات الجلسة بالمفاتيح الموحدة
                const userData = {
                    id: 1,
                    name: 'مستثمر تجريبي',
                    email: matchedUser.email,
                    role: 'investor',
                    verified: true,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem('tera_token', 'mock-token-' + Date.now());
                localStorage.setItem('tera_user', JSON.stringify(userData));

                // إظهار التحميل ثم التوجيه
                showLoader();
                if (progressBar) progressBar.style.width = '100%';
                setTimeout(function() {
                    window.location.replace('/pages/dashboard/index.html');
                }, 800);
            } else {
                showError('البيانات المدخلة غير متطابقة مع سجلات المستثمرين.');
                identifierInput.classList.add('is-invalid-active');
                passwordInput.classList.add('is-invalid-active');
            }
        }
    });

    // ============================================================
    // 10. العبارات الإبداعية (لشاشة التحميل)
    // ============================================================

    const creativeQuotes = [
        "جاري تهيئة بيئتك المالية الفاخرة... أهلاً بك في تيرا 🌌",
        "نصنع مستقبلك الاستثماري المالي الواعد بثقة وأمان وثبات 📈",
        "جاري استدعاء وتحليل أصول محفظتك الاستثمارية الذكية الآن 💼",
        "تجهيز تقاريرك الدورية وعوائدك التنافسية الفورية بامتياز... ✨"
    ];

    /**
     * بدء عرض العبارات الإبداعية في شاشة التحميل
     */
    function startCreativeQuotesCycle() {
        const quoteEl = document.getElementById('creativeQuoteText');
        if (!quoteEl) return;
        
        let index = 0;
        quoteEl.textContent = creativeQuotes[0];
        quoteEl.style.opacity = '1';
        
        // إزالة أي مؤقت سابق
        if (window._quoteInterval) {
            clearInterval(window._quoteInterval);
        }
        
        window._quoteInterval = setInterval(() => {
            index = (index + 1) % creativeQuotes.length;
            quoteEl.style.opacity = '0';
            setTimeout(() => {
                quoteEl.textContent = creativeQuotes[index];
                quoteEl.style.opacity = '1';
            }, 300);
        }, 1200);
    }

    // مراقبة ظهور شاشة التحميل لبدء العبارات
    if (loaderOverlay) {
        const observer = new MutationObserver(function() {
            if (loaderOverlay.style.display === 'flex') {
                startCreativeQuotesCycle();
            }
        });
        observer.observe(loaderOverlay, { attributes: true, attributeFilter: ['style'] });
    }

    // ============================================================
    // 11. تنظيف عند مغادرة الصفحة
    // ============================================================

    window.addEventListener('beforeunload', function() {
        // تنظيف المؤقتات
        if (window._quoteInterval) {
            clearInterval(window._quoteInterval);
        }
        const interval = loaderOverlay?.dataset?.progressInterval;
        if (interval) {
            clearInterval(parseInt(interval));
        }
    });

    // ============================================================
    // 12. رسالة في وحدة التحكم للتأكد من تحميل الملف
    // ============================================================

    console.log('✅ [login.js] تم تحميل سكريبت تسجيل الدخول بنجاح');
    console.log('📌 [login.js] البيانات التجريبية:');
    console.log('   - اسم المستخدم: 106');
    console.log('   - كلمة المرور: 123');

})();
