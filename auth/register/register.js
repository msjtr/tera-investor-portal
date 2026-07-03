/**
 * ============================================================
 * register.js - إدارة نموذج تسجيل الشريك (النسخة المؤسسية - Enterprise)
 * ============================================================
 * - ينتظر إشارة 'supabase:ready' من supabase-client.js.
 * - يمرر البيانات بشكل يتوافق مع هيكل الجداول الجديد (auth_register).
 * - لا يقوم بأي insert مباشر، يترك المهمة لـ Trigger قاعدة البيانات.
 * - يستخدم المسارات المطلقة (Absolute Paths) للتوجيه.
 * - يخزن نوع التحقق (signup) لتوجيه صحيح بعد التحقق.
 * - متوافق مع verify-otp.js و auth.js.
 */
(function() {
    'use strict';
    let supabaseClient = null;
    let currentStage = 1;

    // دالة مساعدة لانتظار Supabase (خطة احتياطية)
    function waitForSupabaseFallback() {
        return new Promise((resolve, reject) => {
            if (window.teraSupabase) return resolve(window.teraSupabase);
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
    }

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
            alert('يرجى استكمال جميع الحقول بشكل صحيح أولاً');
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

    window.submitForm = async function() {
        if (!supabaseClient) {
            alert('❌ الاتصال بقاعدة البيانات غير جاهز.');
            return;
        }

        const fullname = document.getElementById('fullname_ar')?.value.trim();
        const countryCode = document.getElementById('country_code_select')?.value || '+966';
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
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إنشاء الحساب...';
        }

        const fullPhoneNumber = countryCode + mobile;

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

            // تخزين البريد ونوع العملية للتحقق في الصفحة التالية
            localStorage.setItem('pendingVerificationEmail', email);
            localStorage.setItem('tera_verify_type', 'signup');  // ← ضروري لتوجيه verify-otp

            // التوجيه المطلق إلى صفحة التحقق
            window.location.replace('/auth/verify-otp.html');

        } catch (error) {
            console.error('❌ فشل إنشاء الحساب:', error);
            let msg = error.message || 'خطأ غير معروف';
            if (error.status) msg += ' (كود: ' + error.status + ')';
            alert('⚠️ فشل إنشاء الحساب: ' + msg);

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'إنشاء حساب شريك';
            }
        }
    };

    async function startApp(client) {
        supabaseClient = client;
        console.log('🚀 تطبيق register.js يعمل الآن.');

        document.getElementById('fullname_ar')?.addEventListener('input', function() {
            const valid = /^[\u0621-\u064A\s]+$/.test(this.value.trim());
            updateFieldStatus('name_ar', valid, 'أحرف عربية فقط');
            const marker = document.querySelector('#nar-rule-char .icon-marker');
            if (marker) marker.textContent = valid ? '✅' : '❌';
            checkStage1Complete();
        });
        document.getElementById('mobile_number')?.addEventListener('input', function() {
            const valid = /^5\d{8}$/.test(this.value.trim());
            updateFieldStatus('mobile', valid, 'رقم جوال غير صحيح (يبدأ بـ 5)');
            checkStage1Complete();
        });
        document.getElementById('email')?.addEventListener('input', function() {
            const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value.trim());
            updateFieldStatus('email', valid, 'بريد إلكتروني غير صحيح');
            checkStage1Complete();
        });
        document.getElementById('username')?.addEventListener('input', function() {
            const valid = /^[a-zA-Z0-9_]{3,20}$/.test(this.value.trim());
            updateFieldStatus('username', valid, '3-20 حرف إنجليزي أو رقم');
            checkStage1Complete();
        });
        document.getElementById('password')?.addEventListener('input', function() {
            const val = this.value;
            const valid = val.length >= 8 && /[A-Za-z]/.test(val) && /[0-9]/.test(val);
            updateFieldStatus('password', valid, '8 أحرف على الأقل، تتضمن حرف ورقم');
            checkStage1Complete();
        });

        document.getElementById('show-password')?.addEventListener('change', function() {
            const pwd = document.getElementById('password');
            if (pwd) pwd.type = this.checked ? 'text' : 'password';
        });
        document.getElementById('master-global-agree')?.addEventListener('change', function() {
            const btn = document.getElementById('action-submit-btn');
            if (btn) btn.disabled = !this.checked;
        });

        document.getElementById('action-prev-btn')?.addEventListener('click', () => goToStage(1));
        document.getElementById('action-next-btn')?.addEventListener('click', () => goToStage(2));
        document.getElementById('action-submit-btn')?.addEventListener('click', window.submitForm);

        goToStage(1);
        checkStage1Complete();
    }

    // آلية الانتظار: إما أن العميل موجود أو ننتظر الحدث
    if (window.teraSupabase) {
        startApp(window.teraSupabase);
    } else {
        // استخدام waitForSupabaseFallback كخطة احتياطية
        waitForSupabaseFallback()
            .then(client => startApp(client))
            .catch(() => {
                alert('⚠️ تعذر الاتصال بقاعدة البيانات. أعد تحميل الصفحة.');
            });
    }
})();
