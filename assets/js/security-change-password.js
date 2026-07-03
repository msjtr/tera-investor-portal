/**
 * security-change-password.js
 * تغيير كلمة المرور باستخدام كلمة المرور الحالية
 * متوافق مع security.js و TeraAuth
 * النسخة النهائية – مع رسالة نجاح وتوجيه بعد 3 ثوانٍ
 */

'use strict';

window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['change-password'] = {

    _isSubmitting: false,

    async init() {
        console.log('🔐 [Change Password] تهيئة الصفحة...');

        if (typeof SecurityCore === 'undefined' || !SecurityCore.supabase) {
            try {
                if (typeof waitForSupabase === 'function') {
                    const supabase = await waitForSupabase();
                    if (supabase) {
                        SecurityCore.supabase = supabase;
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            SecurityCore.currentUser = user;
                            if (typeof updateHeader === 'function') updateHeader(user);
                        }
                    }
                }
            } catch (e) {
                console.error('❌ [Change Password] فشل تهيئة SecurityCore:', e);
                showSecurityAlert('تعذر الاتصال بخدمة المصادقة.', 'error');
                return;
            }
        }

        const user = await SecurityCore.getUser();
        if (!user) {
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        this.bindEvents();

        console.log('✅ [Change Password] جاهز.');
    },

    bindEvents() {
        const changeBtn = document.getElementById('changePasswordBtn');
        if (changeBtn) {
            changeBtn.removeEventListener('click', this.changePassword);
            changeBtn.addEventListener('click', this.changePassword.bind(this));
        }

        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.removeEventListener('click', this.togglePasswordVisibility);
            toggle.addEventListener('click', this.togglePasswordVisibility);
        });

        const newPassword = document.getElementById('newPassword');
        if (newPassword) {
            newPassword.removeEventListener('input', this.validatePasswordStrength);
            newPassword.addEventListener('input', this.validatePasswordStrength);
        }

        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.removeEventListener('input', this.validateConfirmMatch);
            confirmPassword.addEventListener('input', this.validateConfirmMatch);
        }
    },

    togglePasswordVisibility(e) {
        const button = e.currentTarget;
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = button.querySelector('i');
        if (icon) icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        e.stopPropagation();
    },

    // ==================== تغيير كلمة المرور ====================
    async changePassword() {
        if (this._isSubmitting) return;

        const currentPassword = document.getElementById('currentPassword')?.value?.trim() || '';
        const newPassword = document.getElementById('newPassword')?.value?.trim() || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value?.trim() || '';

        // التحقق من الحقول
        if (!currentPassword) {
            showSecurityAlert('يرجى إدخال كلمة المرور الحالية.', 'error');
            document.getElementById('currentPassword')?.focus();
            return;
        }

        if (newPassword.length < 8) {
            showSecurityAlert('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.', 'error');
            document.getElementById('newPassword')?.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            showSecurityAlert('تأكيد كلمة المرور غير مطابق.', 'error');
            document.getElementById('confirmPassword')?.focus();
            return;
        }

        if (currentPassword === newPassword) {
            showSecurityAlert('⚠️ كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.', 'error');
            document.getElementById('newPassword')?.focus();
            document.getElementById('newPassword')?.select();
            return;
        }

        this._isSubmitting = true;
        const btn = document.getElementById('changePasswordBtn');
        setButtonLoading(btn, 'جاري تغيير كلمة المرور...');

        try {
            const supabase = SecurityCore.supabase;
            const user = await SecurityCore.getUser();
            if (!user) throw new Error('المستخدم غير مسجل الدخول');

            // 1. التحقق من كلمة المرور الحالية
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (verifyError) {
                if (verifyError.message.includes('Invalid login credentials')) {
                    throw new Error('كلمة المرور الحالية غير صحيحة.');
                }
                throw verifyError;
            }

            // 2. تحديث كلمة المرور
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            // نجاح – عرض رسالة النجاح والتوجيه بعد 3 ثوانٍ
            showSecurityAlert('✅ تم تغيير كلمة المرور بنجاح. جاري تحويلك إلى لوحة التحكم...', 'success');

            // إعادة تعيين النموذج
            this.resetForm();

            // تحديث معلومات المستخدم
            await SecurityCore.refreshUser();

            // توجيه بعد 3 ثوانٍ
            setTimeout(() => {
                window.location.replace('/pages/dashboard/index.html');
            }, 3000);

        } catch (err) {
            console.error('❌ [Change Password]', err);
            let msg = 'تعذر تغيير كلمة المرور.';
            if (err.message) {
                if (err.message.includes('should be different from the old password')) {
                    msg = '⚠️ كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.';
                } else if (err.message.includes('Invalid login credentials')) {
                    msg = '❌ كلمة المرور الحالية غير صحيحة.';
                } else {
                    msg = err.message;
                }
            }
            showSecurityAlert(msg, 'error');

            if (err.message && err.message.includes('should be different from the old password')) {
                document.getElementById('newPassword')?.focus();
                document.getElementById('newPassword')?.select();
            } else if (err.message && err.message.includes('Invalid login credentials')) {
                document.getElementById('currentPassword')?.focus();
                document.getElementById('currentPassword')?.select();
            }
        } finally {
            restoreButton(btn);
            this._isSubmitting = false;
        }
    },

    // ==================== إعادة تعيين النموذج ====================
    resetForm() {
        const form = document.getElementById('changePasswordForm');
        if (form) form.reset();

        const fill = document.getElementById('strengthFill');
        if (fill) { fill.style.width = '0%'; fill.style.background = '#e2e8f0'; }
        const label = document.getElementById('strengthLabel');
        if (label) { label.textContent = 'ضعيفة'; label.className = 'strength-label'; }

        document.querySelectorAll('#passwordRequirements ul li').forEach(li => {
            li.className = '';
            const icon = li.querySelector('i');
            if (icon) icon.className = 'fas fa-circle';
        });

        document.getElementById('confirmPasswordHint').textContent = 'أعد كتابة كلمة المرور الجديدة';
        document.getElementById('confirmPasswordHint').style.color = '#64748b';
    },

    // ==================== التحقق من قوة كلمة المرور ====================
    validatePasswordStrength() {
        const password = document.getElementById('newPassword')?.value || '';
        const requirements = {
            length: document.getElementById('req-length'),
            uppercase: document.getElementById('req-uppercase'),
            lowercase: document.getElementById('req-lowercase'),
            number: document.getElementById('req-number'),
            special: document.getElementById('req-special')
        };

        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        let score = 0;
        Object.keys(checks).forEach(key => {
            const el = requirements[key];
            if (el) {
                const valid = checks[key];
                el.className = valid ? 'valid' : 'invalid';
                const icon = el.querySelector('i');
                if (icon) icon.className = valid ? 'fas fa-check-circle' : 'fas fa-circle';
                if (valid) score++;
            }
        });

        const fill = document.getElementById('strengthFill');
        const label = document.getElementById('strengthLabel');
        if (fill) {
            const percent = (score / 5) * 100;
            fill.style.width = percent + '%';
            if (score <= 1) {
                fill.style.background = '#dc2626';
                if (label) { label.textContent = 'ضعيفة جداً'; label.className = 'strength-label weak'; }
            } else if (score <= 2) {
                fill.style.background = '#f59e0b';
                if (label) { label.textContent = 'ضعيفة'; label.className = 'strength-label weak'; }
            } else if (score <= 3) {
                fill.style.background = '#fbbf24';
                if (label) { label.textContent = 'متوسطة'; label.className = 'strength-label medium'; }
            } else if (score <= 4) {
                fill.style.background = '#34d399';
                if (label) { label.textContent = 'قوية'; label.className = 'strength-label strong'; }
            } else {
                fill.style.background = '#10b981';
                if (label) { label.textContent = 'قوية جداً'; label.className = 'strength-label very-strong'; }
            }
        }
    },

    validateConfirmMatch() {
        const newPassword = document.getElementById('newPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        const hint = document.getElementById('confirmPasswordHint');
        if (!hint) return;
        if (confirmPassword.length === 0) {
            hint.textContent = 'أعد كتابة كلمة المرور الجديدة';
            hint.style.color = '#64748b';
            return;
        }
        if (newPassword === confirmPassword) {
            hint.textContent = '✅ كلمة المرور متطابقة';
            hint.style.color = '#16a34a';
        } else {
            hint.textContent = '❌ كلمة المرور غير متطابقة';
            hint.style.color = '#dc2626';
        }
    }
};

// بدء التشغيل التلقائي
document.addEventListener('DOMContentLoaded', async function() {
    const page = document.body.dataset.security || document.body.dataset.page || document.body.id || '';
    if (page === 'change-password') {
        console.log('🔐 [Change Password] بدء التشغيل التلقائي...');
        try {
            if (window.SecurityPages && window.SecurityPages['change-password'] && typeof window.SecurityPages['change-password'].init === 'function') {
                await window.SecurityPages['change-password'].init();
            } else {
                console.error('❌ [Change Password] الكائن غير موجود أو init ليس دالة.');
            }
        } catch (err) {
            console.error('❌ [Change Password] خطأ في التهيئة:', err);
        }
    }
});
