/**
 * ============================================================
 * تغيير البريد الإلكتروني - Change Email (نسخة المؤسسات)
 * ============================================================
 * الموقع: /assets/js/security-change-email.js
 * - ينتظر جاهزية Supabase عبر 'supabase:ready'.
 * - يعرض البريد الإلكتروني الحالي من حساب المستخدم.
 * - يُرسل طلب تغيير البريد عبر Supabase Auth (يتطلب تأكيد).
 * - جاهز للإنتاج دون أي بيانات ثابتة أو محاكاة.
 * ============================================================
 */

window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['change-email'] = {
    init: async function() {
        console.log('📧 تهيئة صفحة تغيير البريد الإلكتروني (Enterprise)...');

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

        const form = document.getElementById('changeEmailForm');
        if (!form) {
            console.warn('⚠️ نموذج تغيير البريد غير موجود.');
            return;
        }

        const newEmail = document.getElementById('newEmail');
        const confirmEmail = document.getElementById('confirmEmail');
        const newEmailHint = document.getElementById('newEmailHint');
        const confirmHint = document.getElementById('confirmEmailHint');
        const currentEmailInput = document.getElementById('currentEmail');

        // ---------- 1. عرض البريد الإلكتروني الحالي من الجلسة ----------
        try {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            if (user && user.email && currentEmailInput) {
                currentEmailInput.value = user.email;
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب البريد الحالي:', e);
        }

        // ---------- 2. التحقق من صحة البريد الجديد ----------
        if (newEmail && newEmailHint) {
            newEmail.addEventListener('input', function() {
                const value = this.value.trim();
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

                if (value === '') {
                    newEmailHint.className = 'email-hint';
                    newEmailHint.innerHTML = '<i class="fas fa-info-circle"></i> أدخل بريداً إلكترونياً صحيحاً وفعالاً.';
                    this.style.borderColor = '';
                } else if (isValid) {
                    newEmailHint.className = 'email-hint success';
                    newEmailHint.innerHTML = '<i class="fas fa-check-circle"></i> البريد الإلكتروني صحيح.';
                    this.style.borderColor = '#16a34a';
                } else {
                    newEmailHint.className = 'email-hint error';
                    newEmailHint.innerHTML = '<i class="fas fa-times-circle"></i> يرجى إدخال بريد إلكتروني صحيح.';
                    this.style.borderColor = '#dc2626';
                }

                if (confirmEmail && confirmEmail.value) checkMatch();
            });
        }

        // ---------- 3. التحقق من تطابق البريدين ----------
        function checkMatch() {
            if (!newEmail || !confirmEmail || !confirmHint) return;
            const newVal = newEmail.value.trim();
            const confirmVal = confirmEmail.value.trim();

            if (confirmVal === '') {
                confirmHint.className = 'email-hint';
                confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع البريد الإلكتروني الجديد.';
                confirmEmail.style.borderColor = '';
                return;
            }

            if (newVal === confirmVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(confirmVal)) {
                confirmHint.className = 'email-hint success';
                confirmHint.innerHTML = '<i class="fas fa-check-circle"></i> البريدان متطابقان.';
                confirmEmail.style.borderColor = '#16a34a';
            } else {
                confirmHint.className = 'email-hint error';
                confirmHint.innerHTML = '<i class="fas fa-times-circle"></i> البريدان غير متطابقين.';
                confirmEmail.style.borderColor = '#dc2626';
            }
        }

        if (newEmail && confirmEmail && confirmHint) {
            confirmEmail.addEventListener('input', checkMatch);
            newEmail.addEventListener('input', function() {
                if (confirmEmail.value) checkMatch();
            });
        }

        // ---------- 4. معالج إرسال النموذج ----------
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const newEmailVal = newEmail.value.trim();
            const confirmVal = confirmEmail.value.trim();

            if (!newEmailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmailVal)) {
                Security.showAlert('يرجى إدخال بريد إلكتروني جديد صحيح.', 'error');
                newEmail.focus();
                return;
            }

            if (newEmailVal !== confirmVal) {
                Security.showAlert('البريد الإلكتروني الجديد وتأكيده غير متطابقين.', 'error');
                confirmEmail.focus();
                return;
            }

            const currentEmail = currentEmailInput ? currentEmailInput.value.trim() : '';
            if (currentEmail === newEmailVal) {
                Security.showAlert('البريد الإلكتروني الجديد مطابق للبريد الحالي.', 'error');
                newEmail.focus();
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
            }

            try {
                const { error } = await window.teraSupabase.auth.updateUser({
                    email: newEmailVal
                });

                if (error) throw error;

                Security.showAlert('✅ تم إرسال رابط تأكيد إلى بريدك الإلكتروني الجديد. يرجى التحقق منه لإكمال التغيير.', 'success');
                form.reset();

                // إعادة تعيين التلميحات والحقول
                if (newEmailHint) {
                    newEmailHint.className = 'email-hint';
                    newEmailHint.innerHTML = '<i class="fas fa-info-circle"></i> أدخل بريداً إلكترونياً صحيحاً وفعالاً.';
                }
                if (confirmHint) {
                    confirmHint.className = 'email-hint';
                    confirmHint.innerHTML = '<i class="fas fa-info-circle"></i> يجب أن يتطابق مع البريد الإلكتروني الجديد.';
                }
                if (newEmail) newEmail.style.borderColor = '';
                if (confirmEmail) confirmEmail.style.borderColor = '';

            } catch (error) {
                console.error('❌ خطأ في تغيير البريد الإلكتروني:', error);
                Security.showAlert(error.message || 'تعذر تغيير البريد الإلكتروني.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> تغيير البريد الإلكتروني';
                }
            }
        });

        console.log('✅ صفحة تغيير البريد الإلكتروني مهيأة.');
    }
};
