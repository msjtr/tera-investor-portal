/**
 * ============================================================
 * تغيير رقم الجوال - Change Mobile (نسخة المؤسسات)
 * ============================================================
 * الموقع: /assets/js/security-change-mobile.js
 * - ينتظر جاهزية Supabase عبر 'supabase:ready'.
 * - يعرض الرقم الحالي من بيانات المستخدم.
 * - يُحدِّث رقم الجوال عبر Supabase Auth.
 * - يدعم مفتاح الدولة (966+) بشكل ديناميكي.
 * - جاهز للإنتاج دون أي بيانات ثابتة أو محاكاة.
 * ============================================================
 */

window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['change-mobile'] = {
    init: async function() {
        console.log('📱 تهيئة صفحة تغيير رقم الجوال (Enterprise)...');

        // انتظار جاهزية عميل Supabase
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('انتهت مهلة انتظار Supabase')), 10000);
                    document.addEventListener('supabase:ready', (e) => {
                        clearTimeout(timeout);
                        resolve(e.detail.client);
                    }, { once: true });
                    document.addEventListener('supabase:error', () => {
                        clearTimeout(timeout);
                        reject(new Error('فشل تحميل Supabase'));
                    }, { once: true });
                });
            } catch (err) {
                console.error('❌ تعذر الاتصال بـ Supabase:', err);
                alert('تعذر الاتصال بقاعدة البيانات. تأكد من اتصالك بالإنترنت.');
                return;
            }
        }

        const form = document.getElementById('changeMobileForm');
        if (!form) {
            console.warn('⚠️ نموذج تغيير الجوال غير موجود.');
            return;
        }

        const newMobile = document.getElementById('newMobile');
        const confirmMobile = document.getElementById('confirmMobile');
        const newMobileHint = document.getElementById('newMobileHint');
        const confirmHint = document.getElementById('confirmMobileHint');
        const currentCountryCode = document.getElementById('currentCountryCode');
        const currentMobileInput = document.getElementById('currentMobile');
        const newCountryCode = document.getElementById('newCountryCode');

        // ---------- 1. عرض رقم الجوال الحالي من بيانات المستخدم ----------
        try {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            if (user) {
                // قد يكون الرقم محفوظاً في user_metadata أو phone
                const savedPhone = user.phone || user.user_metadata?.mobile_number || '';
                if (savedPhone) {
                    // استخراج مفتاح الدولة والرقم إذا كان النمط "+9665xxxxxxxx"
                    let countryCode = '966';
                    let number = savedPhone;
                    if (savedPhone.startsWith('+')) {
                        const withoutPlus = savedPhone.substring(1);
                        // افتراض أن مفتاح الدولة أول 1-3 أرقام
                        const matches = withoutPlus.match(/^(\d{1,3})(\d+)$/);
                        if (matches) {
                            countryCode = matches[1];
                            number = matches[2];
                        } else {
                            countryCode = withoutPlus.substring(0, 3);
                            number = withoutPlus.substring(3);
                        }
                    }
                    if (currentCountryCode) currentCountryCode.value = countryCode;
                    if (currentMobileInput) currentMobileInput.value = number;
                }
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب بيانات المستخدم الحالية:', e);
        }

        // ---------- 2. التحقق من صحة الرقم الجديد ----------
        if (newMobile && newMobileHint) {
            newMobile.addEventListener('input', function() {
                const value = this.value.trim();
                const isValid = /^[0-9]{9,12}$/.test(value);

                if (value === '') {
                    newMobileHint.className = 'mobile-hint';
                    newMobileHint.innerHTML = '<i class="fas fa-info-circle"></i> أدخل رقم الجوال بدون مفتاح الدولة.';
                    this.style.borderColor = '';
                } else if (isValid) {
                    newMobileHint.className = 'mobile-hint success';
                    newMobileHint.innerHTML = '<i class="fas fa-check-circle"></i> رقم الجوال صحيح.';
                    this.style.borderColor = '#16a34a';
                } else {
                    newMobileHint.className = 'mobile-hint error';
                    newMobileHint.innerHTML = '<i class="fas fa-times-circle"></i> يجب أن يتكون من 9-12 رقم فقط.';
                    this.style.borderColor = '#dc2626';
                }

                if (confirmMobile && confirmMobile.value) checkMatch();
            });
        }

        // ---------- 3. التحقق من تطابق الرقمين ----------
        function checkMatch() {
            if (!newMobile || !confirmMobile || !confirmHint) return;
            const newVal = newMobile.value.trim();
            const confirmVal = confirmMobile.value.trim();

            if (confirmVal === '') {
                confirmHint.className = 'mobile-hint';
                confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع رقم الجوال الجديد.';
                confirmMobile.style.borderColor = '';
                return;
            }

            if (newVal === confirmVal && /^[0-9]{9,12}$/.test(confirmVal)) {
                confirmHint.className = 'mobile-hint success';
                confirmHint.innerHTML = '<i class="fas fa-check-circle"></i> الرقمان متطابقان.';
                confirmMobile.style.borderColor = '#16a34a';
            } else {
                confirmHint.className = 'mobile-hint error';
                confirmHint.innerHTML = '<i class="fas fa-times-circle"></i> الرقمان غير متطابقين.';
                confirmMobile.style.borderColor = '#dc2626';
            }
        }

        if (newMobile && confirmMobile && confirmHint) {
            confirmMobile.addEventListener('input', checkMatch);
            newMobile.addEventListener('input', function() {
                if (confirmMobile.value) checkMatch();
            });
        }

        // ---------- 4. معالج إرسال النموذج ----------
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const newVal = newMobile.value.trim();
            const confirmVal = confirmMobile.value.trim();
            const countryCode = newCountryCode ? newCountryCode.value : '966';

            if (!newVal || !/^[0-9]{9,12}$/.test(newVal)) {
                Security.showAlert('يرجى إدخال رقم جوال صحيح (9-12 رقم).', 'error');
                newMobile.focus();
                return;
            }

            if (newVal !== confirmVal) {
                Security.showAlert('رقم الجوال الجديد وتأكيده غير متطابقين.', 'error');
                confirmMobile.focus();
                return;
            }

            // التأكد من أن الرقم الجديد مختلف عن الحالي
            const currentNumber = currentMobileInput ? currentMobileInput.value.trim() : '';
            const currentCountry = currentCountryCode ? currentCountryCode.value : '966';
            if (currentNumber === newVal && currentCountry === countryCode) {
                Security.showAlert('رقم الجوال الجديد مطابق للرقم الحالي.', 'error');
                newMobile.focus();
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
            }

            try {
                const fullPhone = '+' + countryCode + newVal;

                // تحديث رقم الجوال في Supabase Auth
                const { error } = await window.teraSupabase.auth.updateUser({
                    phone: fullPhone
                });

                if (error) throw error;

                Security.showAlert('✅ تم تحديث رقم الجوال بنجاح. قد تحتاج إلى تأكيد الرمز المرسل.', 'success');
                form.reset();

                // إعادة تعيين التلميحات والحقول
                if (newMobileHint) {
                    newMobileHint.className = 'mobile-hint';
                    newMobileHint.innerHTML = '<i class="fas fa-info-circle"></i> أدخل رقم الجوال بدون مفتاح الدولة.';
                }
                if (confirmHint) {
                    confirmHint.className = 'mobile-hint';
                    confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع رقم الجوال الجديد.';
                }
                if (newMobile) newMobile.style.borderColor = '';
                if (confirmMobile) confirmMobile.style.borderColor = '';

                // تحديث عرض الرقم الحالي في الواجهة ليعكس الجديد
                if (currentCountryCode) currentCountryCode.value = countryCode;
                if (currentMobileInput) currentMobileInput.value = newVal;

            } catch (error) {
                console.error('❌ خطأ في تغيير رقم الجوال:', error);
                Security.showAlert(error.message || 'تعذر تغيير رقم الجوال.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> تغيير رقم الجوال';
                }
            }
        });

        console.log('✅ صفحة تغيير رقم الجوال مهيأة.');
    }
};
