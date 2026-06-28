/**
 * ============================================================
 * تغيير كلمة المرور - Change Password (نسخة المؤسسات)
 * ============================================================
 * الموقع: /assets/js/security-change-password.js
 * - ربط حقيقي مع Supabase Auth.
 * - يتحقق من كلمة المرور الحالية قبل التحديث.
 * - يعرض مؤشر قوة كلمة المرور ومتطلباتها.
 * - ينتظر جاهزية العميل (supabase:ready).
 * ============================================================
 */

window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['change-password'] = {
    init: async function() {
        console.log('🔑 تهيئة صفحة تغيير كلمة المرور (Enterprise)...');

        // انتظار جاهزية عميل Supabase (في حال تأخر التحميل)
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

        // ---------- 1. تهيئة أزرار إظهار/إخفاء كلمة المرور ----------
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const input = document.getElementById(targetId);
                if (!input) return;

                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    if (icon) icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    if (icon) icon.className = 'fas fa-eye';
                }
            });
        });

        // ---------- 2. مؤشر قوة كلمة المرور ----------
        const passwordInput = document.getElementById('newPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', function() {
                const strength = Security.calculatePasswordStrength(this.value);
                const strengthFill = document.getElementById('strengthFill');
                const strengthLabel = document.getElementById('strengthLabel');

                if (strengthFill) {
                    strengthFill.style.width = strength.percentage + '%';
                    strengthFill.style.background = strength.percentage < 30 ? '#dc2626' :
                        strength.percentage < 50 ? '#f59e0b' :
                        strength.percentage < 75 ? '#16a34a' : '#028090';
                }
                if (strengthLabel) {
                    const strengthText = strength.percentage < 30 ? 'ضعيفة' :
                        strength.percentage < 50 ? 'متوسطة' :
                        strength.percentage < 75 ? 'قوية' : 'قوية جداً';
                    strengthLabel.className = 'strength-label ' + strengthText.replace(' ', '-');
                    strengthLabel.textContent = strengthText;
                }

                Security.updatePasswordRequirements(this.value);
            });
            Security.updatePasswordRequirements('');
        }

        // ---------- 3. التحقق من تطابق كلمة المرور ----------
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const confirmHint = document.getElementById('confirmPasswordHint');

        if (newPassword && confirmPassword && confirmHint) {
            const checkMatch = () => {
                if (confirmPassword.value.length === 0) {
                    confirmHint.textContent = '';
                    confirmPassword.style.borderColor = '';
                    return;
                }
                if (newPassword.value === confirmPassword.value) {
                    confirmHint.textContent = '✅ كلمة المرور متطابقة';
                    confirmHint.style.color = '#16a34a';
                    confirmPassword.style.borderColor = '#16a34a';
                } else {
                    confirmHint.textContent = '❌ كلمة المرور غير متطابقة';
                    confirmHint.style.color = '#dc2626';
                    confirmPassword.style.borderColor = '#dc2626';
                }
            };
            newPassword.addEventListener('input', checkMatch);
            confirmPassword.addEventListener('input', checkMatch);
        }

        // ---------- 4. معالج تقديم النموذج ----------
        const form = document.getElementById('changePasswordForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const currentPassword = document.getElementById('currentPassword');
                const newPasswordInput = document.getElementById('newPassword');
                const confirmPasswordInput = document.getElementById('confirmPassword');

                // التحقق من تعبئة الحقول
                if (!currentPassword.value) {
                    Security.showAlert('يرجى إدخال كلمة المرور الحالية.', 'error');
                    currentPassword.focus();
                    return;
                }
                if (!newPasswordInput.value) {
                    Security.showAlert('يرجى إدخال كلمة المرور الجديدة.', 'error');
                    newPasswordInput.focus();
                    return;
                }
                if (newPasswordInput.value !== confirmPasswordInput.value) {
                    Security.showAlert('كلمة المرور الجديدة وتأكيدها غير متطابقين.', 'error');
                    confirmPasswordInput.focus();
                    return;
                }

                // التحقق من قوة كلمة المرور
                const strength = Security.calculatePasswordStrength(newPasswordInput.value);
                if (strength.percentage < 50) {
                    Security.showAlert('كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى.', 'error');
                    newPasswordInput.focus();
                    return;
                }

                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق والتحديث...';
                }

                try {
                    // 1. إعادة المصادقة باستخدام كلمة المرور الحالية للتأكد من صحتها
                    const { data: signInData, error: signInError } = await window.teraSupabase.auth.signInWithPassword({
                        email: window.TeraAuth?.getCurrentUser()?.email, // الحصول على البريد من الجلسة الحالية
                        password: currentPassword.value
                    });

                    if (signInError) {
                        throw new Error('كلمة المرور الحالية غير صحيحة.');
                    }

                    // 2. تحديث كلمة المرور الجديدة
                    const { error: updateError } = await window.teraSupabase.auth.updateUser({
                        password: newPasswordInput.value
                    });

                    if (updateError) throw updateError;

                    // نجاح التغيير
                    Security.showAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');
                    form.reset();
                    Security.updatePasswordRequirements('');
                    const strengthFill = document.getElementById('strengthFill');
                    if (strengthFill) strengthFill.style.width = '0%';
                    const strengthLabel = document.getElementById('strengthLabel');
                    if (strengthLabel) strengthLabel.textContent = 'ضعيفة';
                    if (confirmHint) confirmHint.textContent = '';

                } catch (error) {
                    console.error('❌ خطأ في تغيير كلمة المرور:', error);
                    Security.showAlert(error.message || 'تعذر تغيير كلمة المرور. تأكد من صحة البيانات.', 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-save"></i> تغيير كلمة المرور';
                    }
                }
            });
        }

        console.log('✅ صفحة تغيير كلمة المرور مهيأة بالكامل.');
    }
};
