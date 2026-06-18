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
 * ============================================================
 * يعتمد على:
 * - TeraAuth (المعرفة في assets/js/auth.js)
 * - توحيد المفاتيح: tera_token, tera_user
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. مراجع عناصر DOM
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
    // 2. التحقق من وجود العناصر الأساسية
    // ============================================================

    if (!loginForm || !identifierInput || !passwordInput || !submitBtn) {
        console.error('❌ [login.js] عناصر النموذج الأساسية غير موجودة في الصفحة.');
        return;
    }

    // ============================================================
    // 3. دوال مساعدة
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
        identifierInput.classList.remove('is-invalid-active');
        passwordInput.classList.remove('is-invalid-active');
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
                const interval = setInterval(() => {
                    progress += Math.random() * 15 + 5;
                    if (progress > 95) progress = 95;
                    progressBar.style.width = progress + '%';
                    if (progress >= 95) clearInterval(interval);
                }, 400);
                // حفظ معرف المؤقت لإيقافه لاحقاً
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
                clearInterval(interval);
                delete loaderOverlay.dataset.progressInterval;
            }
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'تسجيل الدخول الآمن';
    }

    /**
     * إعادة تعيين حالة الحقول (إزالة علامات الصحة/الخطأ)
     */
    function resetFieldStates() {
        identifierInput.classList.remove('is-valid-active', 'is-invalid-active');
        passwordInput.classList.remove('is-valid-active', 'is-invalid-active');
    }

    // ============================================================
    // 4. تبديل إظهار كلمة المرور
    // ============================================================

    if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    }

    // ============================================================
    // 5. تنظيف المدخلات من الأحرف العربية (اختياري)
    // ============================================================

    identifierInput.addEventListener('input', function() {
        // منع الأحرف العربية في اسم المستخدم (يمكن تعديل حسب الحاجة)
        // this.value = this.value.replace(/[\u0600-\u06FF]/g, '');
        // إخفاء الخطأ أثناء الكتابة
        if (this.classList.contains('is-invalid-active')) {
            this.classList.remove('is-invalid-active');
            const err = document.getElementById('identifier-error');
            if (err) err.textContent = '';
        }
    });

    passwordInput.addEventListener('input', function() {
        if (this.classList.contains('is-invalid-active')) {
            this.classList.remove('is-invalid-active');
            const err = document.getElementById('password-error');
            if (err) err.textContent = '';
        }
    });

    // ============================================================
    // 6. معالجة تقديم النموذج
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

        // إذا كان TeraAuth متاحاً، نستخدمه
        if (window.TeraAuth && typeof TeraAuth.login === 'function') {
            // إظهار التحميل
            showLoader();

            // محاولة تسجيل الدخول
            TeraAuth.login(identifier, password)
                .then(function(user) {
                    // نجاح تسجيل الدخول
                    console.log('✅ [login.js] تم تسجيل الدخول بنجاح', user);
                    // إخفاء التحميل وعرض شاشة الترحيب (اختياري)
                    // نترك شاشة التحميل ظاهرة لثانية ونصف ثم نوجه
                    setTimeout(function() {
                        // إخفاء التحميل (سيتم التوجيه بواسطة checkSession)
                        // ولكن نتركها حتى يتم التوجيه
                        // التوجيه سيتم بواسطة TeraAuth.checkSession() في auth.js
                        // لكن قد نحتاج للتوجيه يدوياً في حال عدم وجود checkSession
                        if (typeof TeraAuth.checkSession === 'function') {
                            // ندع auth.js يقوم بالتوجيه
                            TeraAuth.checkSession();
                        } else {
                            // توجيه يدوي
                            window.location.href = '/pages/dashboard/index.html';
                        }
                    }, 1500);
                })
                .catch(function(err) {
                    // فشل تسجيل الدخول
                    console.error('❌ [login.js] فشل تسجيل الدخول:', err);
                    hideLoader();
                    showError(err.message || 'فشل تسجيل الدخول. تأكد من بياناتك وحاول مرة أخرى.');
                });
        } else {
            // حل احتياطي إذا لم يتم تحميل TeraAuth
            console.warn('⚠️ [login.js] TeraAuth غير متاح، استخدام محاكاة بسيطة');

            // محاكاة بيانات المستخدم (للتجربة)
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
                // تخزين بيانات الجلسة
                const userData = {
                    id: 1,
                    name: 'مستثمر تجريبي',
                    email: matchedUser.email,
                    role: 'investor',
                    verified: true
                };
                localStorage.setItem('tera_token', 'mock-token-' + Date.now());
                localStorage.setItem('tera_user', JSON.stringify(userData));

                // إظهار التحميل ثم التوجيه
                showLoader();
                setTimeout(function() {
                    // التوجيه إلى لوحة التحكم
                    window.location.href = '/pages/dashboard/index.html';
                }, 1500);
            } else {
                showError('البيانات المدخلة غير متطابقة مع سجلات المستثمرين.');
                identifierInput.classList.add('is-invalid-active');
                passwordInput.classList.add('is-invalid-active');
            }
        }
    });

    // ============================================================
    // 7. تسجيل الخروج التلقائي إذا كان المستخدم مسجلاً (للتجربة)
    // ============================================================

    // إذا كان المستخدم مسجلاً بالفعل، يمكن توجيهه للوحة التحكم فوراً
    // ولكن هذا يتم التعامل معه بواسطة auth.js في DOMContentLoaded

    // ============================================================
    // 8. إضافة دالة لتوسيع العبارات الإبداعية (اختياري)
    // ============================================================

    const creativeQuotes = [
        "جاري تهيئة بيئتك المالية الفاخرة... أهلاً بك في تيرا 🌌",
        "نصنع مستقبلك الاستثماري المالي الواعد بثقة وأمان وثبات 📈",
        "جاري استدعاء وتحليل أصول محفظتك الاستثمارية الذكية الآن 💼",
        "تجهيز تقاريرك الدورية وعوائدك التنافسية الفورية بامتياز... ✨"
    ];

    /**
     * بدء عرض العبارات الإبداعية في شاشة التحميل
     * (يمكن استدعاؤها من login إذا أردت)
     */
    function startCreativeQuotesCycle() {
        const quoteEl = document.getElementById('creativeQuoteText');
        if (!quoteEl) return;
        let index = 0;
        quoteEl.textContent = creativeQuotes[0];
        quoteEl.style.opacity = '1';
        setInterval(() => {
            index = (index + 1) % creativeQuotes.length;
            quoteEl.style.opacity = '0';
            setTimeout(() => {
                quoteEl.textContent = creativeQuotes[index];
                quoteEl.style.opacity = '1';
            }, 300);
        }, 1200);
    }

    // إذا كانت شاشة التحميل موجودة، نبدأ العبارات عند ظهورها (يمكن استدعاؤها من showLoader)
    // نضيف استماع لظهور شاشة التحميل
    if (loaderOverlay) {
        const observer = new MutationObserver(function() {
            if (loaderOverlay.style.display === 'flex') {
                startCreativeQuotesCycle();
            }
        });
        observer.observe(loaderOverlay, { attributes: true, attributeFilter: ['style'] });
    }

    // ============================================================
    // 9. رسالة في وحدة التحكم للتأكد من تحميل الملف
    // ============================================================

    console.log('✅ [login.js] تم تحميل سكريبت تسجيل الدخول بنجاح');
    console.log('📌 [login.js] استخدم النموذج لتسجيل الدخول إلى منصة تيرا');

})();
