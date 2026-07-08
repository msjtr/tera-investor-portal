/**
 * ============================================================
 * register.js - إدارة نموذج تسجيل الشريك (النسخة المؤسسية - Enterprise)
 * ============================================================
 * - يعتمد على waitForSupabase الموحدة.
 * - يمرر البيانات بشكل يتوافق مع هيكل الجداول الجديد (auth_register).
 * - يستخدم المسارات المطلقة للتوجيه.
 * - يخزن نوع التحقق (signup) لتوجيه صحيح بعد التحقق.
 * - متوافق مع verify-otp.js و auth.js.
 * - يدعم جميع دول الخليج + مصر مع تحقق ديناميكي من رقم الجوال.
 */

(function () {
    'use strict';

    const ROUTES = {
        VERIFY_OTP: '/auth/verify-otp.html',
        LOGIN: '/auth/auth/login/login.html',
        DASHBOARD: '/pages/dashboard/index.html'
    };

    let supabaseClient = null;
    let currentStage = 1;

    function updateFieldStatus(fieldId, isValid, errorMsg) {
        const icon = document.getElementById(fieldId + '-status');
        const errorDiv = document.getElementById(fieldId + '-error');
        if (icon) icon.textContent = isValid ? '✅' : '❌';
        if (errorDiv) errorDiv.textContent = isValid ? '' : errorMsg;
    }

    function checkStage1Complete() {
        const fields = ['name_ar', 'mobile', 'email', 'username', 'password'];
        const allValid = fields.every(id => {
            const el = document.getElementById(id + '-status');
            return el && el.textContent === '✅';
        });
        const nextBtn = document.getElementById('action-next-btn');
        if (nextBtn) nextBtn.disabled = !allValid;
    }

    function goToStage(stage) {
        const stage1 = document.getElementById('stage-1-content');
        const stage2 = document.getElementById('stage-2-content');
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');
        const prev = document.getElementById('action-prev-btn');
        const next = document.getElementById('action-next-btn');
        const submit = document.getElementById('action-submit-btn');

        if (!stage1 || !stage2) return;

        if (stage === 2 && currentStage === 1 && next?.disabled) {
            showAlert('يرجى استكمال جميع الحقول بشكل صحيح أولاً', 'error');
            return;
        }

        stage1.classList.toggle('active', stage === 1);
        stage2.classList.toggle('active', stage === 2);
        step1?.classList.toggle('active', stage === 1);
        step2?.classList.toggle('active', stage === 2);

        if (prev) prev.style.visibility = stage === 1 ? 'hidden' : 'visible';
        if (next) next.style.display = stage === 2 ? 'none' : 'inline-block';
        if (submit) {
            submit.style.display = stage === 2 ? 'inline-block' : 'none';
            submit.disabled = true;
        }
        currentStage = stage;
    }

    function showAlert(message, type = 'error') {
        const alertBox = document.getElementById('formAlert');
        const alertMessage = document.getElementById('alertMessage');
        const alertIcon = document.getElementById('alertIcon');

        if (!alertBox || !alertMessage) {
            alert(message);
            return;
        }

        alertBox.style.display = 'flex';
        alertBox.className = 'alert-box show ' + type;
        if (alertIcon) {
            alertIcon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
        }
        alertMessage.textContent = message;
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            alertBox.style.display = 'none';
            alertBox.className = 'alert-box';
        }, 8000);
    }

    function showLoader(show, text = 'جاري إنشاء الحساب...') {
        const loader = document.getElementById('creativeLoaderScreen');
        const quoteEl = document.getElementById('creativeQuoteText');
        const progressBar = document.getElementById('progressFillBar');

        if (!loader) return;
        loader.style.display = show ? 'flex' : 'none';
        if (quoteEl && show) quoteEl.textContent = text;
        if (progressBar && show) {
            progressBar.style.width = '0%';
            setTimeout(() => { progressBar.style.width = '70%'; }, 300);
        } else if (progressBar) {
            progressBar.style.width = '0%';
        }
    }

    function getMobilePattern(countryCode) {
        const patterns = {
            '+966': { regex: /^5\d{8}$/, min: 9, max: 9, msg: 'رقم الجوال يجب أن يبدأ بـ 5 ويتكون من 9 أرقام' },
            '+971': { regex: /^5\d{8}$/, min: 9, max: 9, msg: 'رقم الجوال يجب أن يبدأ بـ 5 ويتكون من 9 أرقام' },
            '+965': { regex: /^[5-9]\d{7}$/, min: 8, max: 8, msg: 'رقم الجوال يجب أن يتكون من 8 أرقام ويبدأ بـ 5-9' },
            '+973': { regex: /^[3-9]\d{7}$/, min: 8, max: 8, msg: 'رقم الجوال يجب أن يتكون من 8 أرقام ويبدأ بـ 3-9' },
            '+974': { regex: /^[3-7]\d{7}$/, min: 8, max: 8, msg: 'رقم الجوال يجب أن يتكون من 8 أرقام ويبدأ بـ 3-7' },
            '+968': { regex: /^[7-9]\d{7}$/, min: 8, max: 8, msg: 'رقم الجوال يجب أن يتكون من 8 أرقام ويبدأ بـ 7-9' },
            '+20':  { regex: /^1[0-2]\d{8}$/, min: 10, max: 10, msg: 'رقم الجوال يجب أن يبدأ بـ 1 ويتكون من 10 أرقام' }
        };
        return patterns[countryCode] || patterns['+966'];
    }

    function validateMobileForCountry(mobile, countryCode) {
        const pattern = getMobilePattern(countryCode);
        const cleaned = mobile.replace(/[\s\-\(\)]/g, '');
        if (cleaned.length < pattern.min || cleaned.length > pattern.max) {
            return { valid: false, msg: pattern.msg };
        }
        if (!pattern.regex.test(cleaned)) {
            return { valid: false, msg: pattern.msg };
        }
        return { valid: true, msg: '' };
    }

    async function submitForm() {
        if (!supabaseClient) {
            showAlert('❌ الاتصال بقاعدة البيانات غير جاهز.', 'error');
            return;
        }

        const fullname = document.getElementById('fullname_ar')?.value?.trim() || '';
        const countryCode = document.getElementById('country_code_select')?.value || '+966';
        const mobile = document.getElementById('mobile_number')?.value?.trim() || '';
        const email = document.getElementById('email')?.value?.trim() || '';
        const username = document.getElementById('username')?.value?.trim() || '';
        const password = document.getElementById('password')?.value || '';

        if (!fullname || !mobile || !email || !username || !password) {
            showAlert('يرجى ملء جميع الحقول.', 'error');
            return;
        }

        const submitBtn = document.getElementById('action-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إنشاء الحساب...';
        }

        const fullPhoneNumber = countryCode + mobile;
        showLoader(true, 'جاري إنشاء حسابك الاستثماري...');

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                phone: fullPhoneNumber,
                options: {
                    data: {
                        full_name: fullname,
                        username: username,
                        mobile_number: fullPhoneNumber,
                        role: 'partner'
                    }
                }
            });

            if (error) throw error;
            if (!data.user) throw new Error('لم يتم إنشاء المستخدم في Auth');

            console.log('✅ [Register] تم إنشاء المستخدم:', data.user.id);

            localStorage.setItem('pendingVerificationEmail', email);
            localStorage.setItem('tera_verify_type', 'signup');

            showLoader(false);
            showAlert('✅ تم إنشاء الحساب بنجاح. جاري توجيهك للتحقق...', 'success');

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'إنشاء حساب شريك';
            }

            setTimeout(() => {
                window.location.replace(ROUTES.VERIFY_OTP);
            }, 1500);

        } catch (error) {
            console.error('❌ [Register] فشل إنشاء الحساب:', error);
            let msg = 'حدث خطأ أثناء إنشاء الحساب.';
            if (error.message.includes('User already registered')) msg = 'البريد الإلكتروني مسجل بالفعل.';
            else if (error.message.includes('rate limit')) msg = 'تم تجاوز عدد المحاولات.';
            else if (error.message.includes('password')) msg = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
            else msg = error.message;

            showAlert('⚠️ ' + msg, 'error');
            showLoader(false);

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'إنشاء حساب شريك';
            }
        }
    }

    async function startApp(client) {
        supabaseClient = client;
        console.log('🚀 [Register] التطبيق جاهز للعمل.');

        const fullnameInput = document.getElementById('fullname_ar');
        if (fullnameInput) {
            fullnameInput.addEventListener('input', function () {
                const valid = /^[\u0621-\u064A\s]+$/.test(this.value.trim());
                updateFieldStatus('name_ar', valid, 'أحرف عربية فقط');
                const marker = document.querySelector('#nar-rule-char .icon-marker');
                if (marker) marker.textContent = valid ? '✅' : '❌';
                checkStage1Complete();
            });
        }

        const countrySelect = document.getElementById('country_code_select');
        const mobileInput = document.getElementById('mobile_number');
        const placeholders = {
            '+966': '5XXXXXXXX', '+971': '5XXXXXXXX', '+965': 'XXXXXXXX',
            '+973': 'XXXXXXXX', '+974': 'XXXXXXXX', '+968': 'XXXXXXXX', '+20': '1XXXXXXXXX'
        };

        if (countrySelect && mobileInput) {
            countrySelect.addEventListener('change', function() {
                mobileInput.placeholder = placeholders[this.value] || 'XXXXXXXXX';
                mobileInput.value = '';
                updateFieldStatus('mobile', false, '');
                checkStage1Complete();
            });
        }

        if (mobileInput) {
            mobileInput.addEventListener('input', function () {
                const countryCode = countrySelect?.value || '+966';
                const mobile = this.value.trim();
                if (mobile === '') {
                    updateFieldStatus('mobile', false, 'رقم الجوال مطلوب');
                    checkStage1Complete();
                    return;
                }
                const result = validateMobileForCountry(mobile, countryCode);
                updateFieldStatus('mobile', result.valid, result.msg);
                checkStage1Complete();
            });
        }

        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('input', function () {
                const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value.trim());
                updateFieldStatus('email', valid, 'بريد إلكتروني غير صحيح');
                checkStage1Complete();
            });
        }

        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('input', function () {
                const valid = /^[a-zA-Z0-9_]{3,20}$/.test(this.value.trim());
                updateFieldStatus('username', valid, '3-20 حرف إنجليزي أو رقم');
                checkStage1Complete();
            });
        }

        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', function () {
                const val = this.value;
                const valid = val.length >= 8 && /[A-Za-z]/.test(val) && /[0-9]/.test(val);
                updateFieldStatus('password', valid, '8 أحرف على الأقل، تتضمن حرف ورقم');
                checkStage1Complete();
            });
        }

        const showPasswordCheck = document.getElementById('show-password');
        if (showPasswordCheck && passwordInput) {
            showPasswordCheck.addEventListener('change', function () {
                passwordInput.type = this.checked ? 'text' : 'password';
            });
        }

        const agreeCheck = document.getElementById('master-global-agree');
        const submitBtn = document.getElementById('action-submit-btn');
        if (agreeCheck && submitBtn) {
            agreeCheck.addEventListener('change', function () {
                submitBtn.disabled = !this.checked;
            });
        }

        const prevBtn = document.getElementById('action-prev-btn');
        const nextBtn = document.getElementById('action-next-btn');

        if (prevBtn) prevBtn.addEventListener('click', () => goToStage(1));
        if (nextBtn) nextBtn.addEventListener('click', () => goToStage(2));
        if (submitBtn) {
            submitBtn.removeEventListener('click', submitForm);
            submitBtn.addEventListener('click', submitForm);
        }

        goToStage(1);
        checkStage1Complete();
    }

    (async function init() {
        try {
            if (window.teraSupabase) {
                startApp(window.teraSupabase);
                return;
            }

            if (typeof window.waitForSupabase === 'function') {
                const client = await window.waitForSupabase();
                startApp(client);
                return;
            }

            // انتظار الحدث كحل أخير
            const client = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Supabase timeout')), 15000);
                document.addEventListener('supabase:ready', (e) => {
                    clearTimeout(timeout);
                    resolve(e.detail.client);
                }, { once: true });
                document.addEventListener('supabase:error', () => {
                    clearTimeout(timeout);
                    reject(new Error('Supabase error'));
                }, { once: true });
            });
            startApp(client);
        } catch (err) {
            console.error('❌ [Register] تعذر الاتصال بـ Supabase:', err);
            showAlert('⚠️ تعذر الاتصال بقاعدة البيانات. أعد تحميل الصفحة.', 'error');
        }
    })();

})();
