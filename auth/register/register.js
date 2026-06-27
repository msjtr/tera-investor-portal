/**
 * منصة تيرا - بوابة الشركاء
 * register.js - إدارة نموذج إنشاء حساب الشريك
 * يعتمد على:
 * - حدث 'supabase:ready' من supabase-client.js لتوفر العميل
 * - نظام TeraAuth (auth.js) لمزامنة الجلسة بعد التسجيل
 */
(function() {
    'use strict';

    // --------------------------------------------------------
    // المتغيرات العامة للملف
    // --------------------------------------------------------
    let supabaseClient = null;
    let currentStage = 1;

    // --------------------------------------------------------
    // دوال التحقق من الحقول
    // --------------------------------------------------------
    function updateFieldStatus(fieldId, isValid, errorMsg) {
        const statusIcon = document.getElementById(fieldId + '-status');
        const errorDiv = document.getElementById(fieldId + '-error');
        if (statusIcon) statusIcon.textContent = isValid ? '✅' : '❌';
        if (errorDiv) errorDiv.textContent = isValid ? '' : errorMsg;
    }

    function validateArabicName(value) {
        const arabicRegex = /^[\u0621-\u064A\s]+$/;
        return arabicRegex.test(value.trim());
    }

    function validateMobile(value) {
        const mobileRegex = /^5\d{8}$/;
        return mobileRegex.test(value.trim());
    }

    function validateEmail(value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value.trim());
    }

    function validateUsername(value) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(value.trim());
    }

    function validatePassword(value) {
        return value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
    }

    // التحقق من اكتمال المرحلة الأولى
    function checkStage1Complete() {
        const fields = ['name_ar', 'mobile', 'email', 'username', 'password'];
        const allValid = fields.every(id => {
            const icon = document.getElementById(id + '-status');
            return icon && icon.textContent === '✅';
        });

        const nextBtn = document.getElementById('action-next-btn');
        if (nextBtn) nextBtn.disabled = !allValid;
    }

    // --------------------------------------------------------
    // التنقل بين المراحل
    // --------------------------------------------------------
    function goToStage(stage) {
        const stage1Content = document.getElementById('stage-1-content');
        const stage2Content = document.getElementById('stage-2-content');
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');
        const prevBtn = document.getElementById('action-prev-btn');
        const nextBtn = document.getElementById('action-next-btn');
        const submitBtn = document.getElementById('action-submit-btn');

        if (!stage1Content || !stage2Content) return;

        // عند الانتقال من 1 إلى 2، تأكد من صحة الحقول
        if (stage === 2 && currentStage === 1) {
            const nextBtnDisabled = document.getElementById('action-next-btn')?.disabled;
            if (nextBtnDisabled) {
                alert('يرجى استكمال جميع الحقول بشكل صحيح أولاً');
                return;
            }
        }

        stage1Content.classList.toggle('active', stage === 1);
        stage2Content.classList.toggle('active', stage === 2);
        step1?.classList.toggle('active', stage === 1);
        step2?.classList.toggle('active', stage === 2);

        if (prevBtn) prevBtn.style.visibility = stage === 1 ? 'hidden' : 'visible';
        if (nextBtn) nextBtn.style.display = stage === 2 ? 'none' : 'inline-block';
        if (submitBtn) {
            submitBtn.style.display = stage === 2 ? 'inline-block' : 'none';
            submitBtn.disabled = true; // سيفعل عند الموافقة على الشروط
        }

        currentStage = stage;
    }

    // --------------------------------------------------------
    // إرسال النموذج (يتم استدعاؤها من زر HTML)
    // --------------------------------------------------------
    window.submitForm = async function() {
        if (!supabaseClient) {
            alert('❌ الاتصال بقاعدة البيانات غير جاهز. حاول مرة أخرى.');
            return;
        }

        // تجميع البيانات من الحقول
        const fullname = document.getElementById('fullname_ar')?.value.trim();
        const countryCode = document.getElementById('country_code_select')?.value;
        const mobile = document.getElementById('mobile_number')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value;

        if (!fullname || !mobile || !email || !username || !password) {
            alert('يرجى ملء جميع الحقول.');
            return;
        }

        const submitBtn = document.getElementById('action-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'جاري إنشاء الحساب...';
        }

        try {
            // استدعاء Supabase للتسجيل مع البيانات الإضافية
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullname,
                        mobile: countryCode + mobile,
                        username: username
                    }
                }
            });

            if (error) throw error;

            // التحقق من وجود جلسة (عند عدم طلب تأكيد البريد)
            if (data.session) {
                // مزامنة الجلسة عبر TeraAuth إذا كان موجوداً، وإلا نخزن مباشرة
                if (window.TeraAuth && typeof window.TeraAuth.syncSession === 'function') {
                    await window.TeraAuth.syncSession(data.session);
                } else {
                    // تخزين احتياطي في localStorage
                    localStorage.setItem('tera_token', data.session.access_token);
                    localStorage.setItem('tera_user', JSON.stringify({
                        id: data.user.id,
                        email: data.user.email,
                        name: data.user.user_metadata?.full_name || fullname,
                        role: 'partner'
                    }));
                }
                console.log('✅ تم التسجيل وجلسة المستخدم نشطة.');
            } else {
                console.log('ℹ️ تم إنشاء الحساب، لكن الجلسة غير متاحة (قد يكون تأكيد البريد مطلوباً).');
            }

            // إعلام المستخدم بالنجاح
            alert('✅ تم إنشاء الحساب بنجاح! ' + 
                (data.session ? 'سيتم تحويلك إلى لوحة التحكم.' : 'تحقق من بريدك الإلكتروني لتأكيد الحساب.'));

            // إذا كانت الجلسة متاحة، يمكن توجيه المستخدم إلى لوحة التحكم
            if (data.session) {
                // احصل على مسار لوحة التحكم النسبي باستخدام TeraAuth إن وجد
                if (window.TeraAuth && typeof window.TeraAuth.getRelativePath === 'function') {
                    const dashboardPath = window.TeraAuth.getRelativePath('pages/dashboard/index.html');
                    window.location.replace(dashboardPath);
                } else {
                    // fallback: الانتقال النسبي
                    window.location.replace('../../pages/dashboard/index.html');
                }
            }

        } catch (error) {
            console.error('❌ فشل إنشاء الحساب:', error);
            let msg = error.message || 'خطأ غير معروف';
            if (error.status) msg += ' (كود: ' + error.status + ')';
            alert('⚠️ فشل إنشاء الحساب: ' + msg);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'إنشاء حساب شريك';
            }
        }
    };

    // --------------------------------------------------------
    // بدء التطبيق عند جاهزية العميل
    // --------------------------------------------------------
    function startApp(client) {
        supabaseClient = client;
        console.log('🚀 تطبيق register.js يعمل الآن.');

        // ربط أحداث التحقق من الحقول
        const fullnameAr = document.getElementById('fullname_ar');
        const mobileInput = document.getElementById('mobile_number');
        const emailInput = document.getElementById('email');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const showPassword = document.getElementById('show-password');
        const masterAgree = document.getElementById('master-global-agree');
        const prevBtn = document.getElementById('action-prev-btn');
        const nextBtn = document.getElementById('action-next-btn');
        const submitBtn = document.getElementById('action-submit-btn');

        // الاسم العربي
        if (fullnameAr) {
            fullnameAr.addEventListener('input', function() {
                const valid = validateArabicName(this.value);
                updateFieldStatus('name_ar', valid, 'يجب أن يحتوي على أحرف عربية فقط');
                const ruleIcon = document.querySelector('#nar-rule-char .icon-marker');
                if (ruleIcon) ruleIcon.textContent = valid ? '✅' : '❌';
                checkStage1Complete();
            });
        }

        // رقم الجوال
        if (mobileInput) {
            mobileInput.addEventListener('input', function() {
                const valid = validateMobile(this.value);
                updateFieldStatus('mobile', valid, 'رقم جوال غير صحيح (يبدأ بـ 5 ويتكون من 9 أرقام)');
                checkStage1Complete();
            });
        }

        // البريد الإلكتروني
        if (emailInput) {
            emailInput.addEventListener('input', function() {
                const valid = validateEmail(this.value);
                updateFieldStatus('email', valid, 'بريد إلكتروني غير صحيح');
                checkStage1Complete();
            });
        }

        // اسم المستخدم
        if (usernameInput) {
            usernameInput.addEventListener('input', function() {
                const valid = validateUsername(this.value);
                updateFieldStatus('username', valid, 'يجب أن يكون بين 3-20 حرفاً إنجليزياً أو رقماً');
                checkStage1Complete();
            });
        }

        // كلمة المرور
        if (passwordInput) {
            passwordInput.addEventListener('input', function() {
                const valid = validatePassword(this.value);
                updateFieldStatus('password', valid, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم');
                checkStage1Complete();
            });
        }

        // إظهار/إخفاء كلمة المرور
        if (showPassword) {
            showPassword.addEventListener('change', function() {
                if (passwordInput) {
                    passwordInput.type = this.checked ? 'text' : 'password';
                }
            });
        }

        // الموافقة على الشروط
        if (masterAgree) {
            masterAgree.addEventListener('change', function() {
                if (submitBtn) submitBtn.disabled = !this.checked;
            });
        }

        // أزرار التنقل
        if (prevBtn) prevBtn.addEventListener('click', () => goToStage(1));
        if (nextBtn) nextBtn.addEventListener('click', () => goToStage(2));

        // ربط زر الإرسال احتياطياً
        if (submitBtn) {
            submitBtn.addEventListener('click', window.submitForm);
        }

        // الحالة الأولية: الذهاب للمرحلة الأولى، وتعطيل زر التالي حتى تكتمل الحقول
        goToStage(1);
        checkStage1Complete();
    }

    // --------------------------------------------------------
    // آلية الانتظار: إما أن العميل موجود أو ننتظر الحدث
    // --------------------------------------------------------
    if (window.teraSupabase) {
        // العميل موجود مسبقاً (تم تحميل supabase-client.js قبله)
        startApp(window.teraSupabase);
    } else {
        // انتظار إشارة الجاهزية
        document.addEventListener('supabase:ready', function(e) {
            if (e.detail && e.detail.client) {
                startApp(e.detail.client);
            } else {
                console.error('❌ [register.js] حدث supabase:ready بدون عميل!');
                alert('⚠️ فشل الاتصال بقاعدة البيانات. أعد تحميل الصفحة.');
            }
        });

        // في حال خطأ التحميل
        document.addEventListener('supabase:error', function() {
            console.error('❌ [register.js] تعذر الاتصال بـ Supabase. تأكد من اتصالك بالإنترنت.');
            alert('⚠️ تعذر الاتصال بقاعدة البيانات. يرجى التحقق من الإنترنت وإعادة المحاولة.');
        });
    }

})();
