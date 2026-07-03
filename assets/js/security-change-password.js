/**
 * ==========================================================
 * security-change-password.js
 * صفحة تغيير كلمة المرور - تعمل بشكل مستقل أو عبر SecurityPages
 * متوافق مع security.js (Enterprise)
 * ==========================================================
 */

'use strict';

// تأكد من وجود SecurityPages
window.SecurityPages = window.SecurityPages || {};

// إذا كان هناك تعريف سابق من security.js، ندمج أو نستبدل
// لكننا نفضل استخدام تعريفنا الخاص مع دمج وظائف security.js
if (!window.SecurityPages['change-password']) {
    window.SecurityPages['change-password'] = {};
}

// دمج الوظائف الجديدة مع الحفاظ على أي وظائف سابقة (إن وجدت)
const originalInit = window.SecurityPages['change-password'].init || function() {};

window.SecurityPages['change-password'] = {

    // نسخة محسنة من init تعمل مع SecurityCore
    async init() {
        console.log('🔐 [Change Password] تهيئة الصفحة...');

        // 1. تأكد من وجود SecurityCore (من security.js)
        if (typeof SecurityCore === 'undefined' || !SecurityCore.supabase) {
            // إذا لم يتم تحميل security.js، نحاول تهيئة يدوياً
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

        // 2. تأكد من وجود المستخدم
        const user = await SecurityCore.getUser();
        if (!user) {
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        // 3. ربط الأحداث
        this.bindEvents();

        // 4. تهيئة حالة الأزرار والحقول
        this.initUI();

        console.log('✅ [Change Password] جاهز.');
    },

    // ربط الأحداث
    bindEvents() {
        // زر تغيير كلمة المرور
        const changeBtn = document.getElementById('changePasswordBtn');
        if (changeBtn) {
            // إزالة أي مستمعات سابقة لتجنب التكرار
            changeBtn.removeEventListener('click', this.handleSubmit);
            changeBtn.addEventListener('click', this.handleSubmit.bind(this));
        }

        // أزرار إظهار/إخفاء كلمة المرور
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            // إزالة المستمعات السابقة
            toggle.removeEventListener('click', this.togglePasswordVisibility);
            toggle.addEventListener('click', this.togglePasswordVisibility);
        });

        // التحقق الفوري من قوة كلمة المرور
        const newPassword = document.getElementById('newPassword');
        if (newPassword) {
            newPassword.removeEventListener('input', this.validatePasswordStrength);
            newPassword.addEventListener('input', this.validatePasswordStrength);
        }

        // التحقق الفوري من تطابق كلمة المرور
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.removeEventListener('input', this.validateConfirmMatch);
            confirmPassword.addEventListener('input', this.validateConfirmMatch);
        }
    },

    // تهيئة واجهة المستخدم
    initUI() {
        // تعيين القيم الأولية (إن وجدت)
        // يمكن إضافة أي تهيئة إضافية هنا
    },

    // دالة تبديل إظهار كلمة المرور
    togglePasswordVisibility(e) {
        const button = e.currentTarget;
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);

        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        // تغيير الأيقونة
        const icon = button.querySelector('i');
        if (icon) {
            icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        }

        // منع انتشار الحدث
        e.stopPropagation();
    },

    // دالة التحقق من قوة كلمة المرور
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
                const isValid = checks[key];
                el.className = isValid ? 'valid' : 'invalid';
                const icon = el.querySelector('i');
                if (icon) {
                    icon.className = isValid ? 'fas fa-check-circle' : 'fas fa-circle';
                }
                if (isValid) score++;
            }
        });

        // تحديث شريط القوة
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

    // دالة التحقق من تطابق كلمة المرور
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
    },

    // دالة معالجة تقديم النموذج
    async handleSubmit() {
        const btn = document.getElementById('changePasswordBtn');
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
            showSecurityAlert('يجب أن تكون كلمة المرور 8 أحرف على الأقل.', 'error');
            document.getElementById('newPassword')?.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            showSecurityAlert('تأكيد كلمة المرور غير مطابق.', 'error');
            document.getElementById('confirmPassword')?.focus();
            return;
        }

        if (currentPassword === newPassword) {
            showSecurityAlert('يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية.', 'warning');
            return;
        }

        setButtonLoading(btn, 'جاري تغيير كلمة المرور...');

        try {
            const user = await SecurityCore.getUser();
            if (!user) throw new Error('المستخدم غير مسجل الدخول');

            const supabase = SecurityCore.supabase;

            // التحقق من كلمة المرور الحالية
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

            // تحديث كلمة المرور
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showSecurityAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');

            // تنظيف النموذج
            const form = document.getElementById('changePasswordForm');
            if (form) form.reset();

            // إعادة تعيين شريط القوة
            const fill = document.getElementById('strengthFill');
            const label = document.getElementById('strengthLabel');
            if (fill) { fill.style.width = '0%'; fill.style.background = '#e2e8f0'; }
            if (label) { label.textContent = 'ضعيفة'; label.className = 'strength-label'; }

            // إعادة تعيين متطلبات كلمة المرور
            document.querySelectorAll('#passwordRequirements ul li').forEach(li => {
                li.className = '';
                const icon = li.querySelector('i');
                if (icon) icon.className = 'fas fa-circle';
            });

            // تحديث معلومات المستخدم
            await SecurityCore.refreshUser();

        } catch (err) {
            console.error('❌ [Change Password]', err);
            showSecurityAlert(err.message || 'تعذر تغيير كلمة المرور.', 'error');
        } finally {
            restoreButton(btn);
        }
    }
};

// ============================================================
// تشغيل الصفحة فور تحميل DOM (بديل عن حدث security.js)
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    // إذا كان هناك سمة data-security في body تطابق هذه الصفحة
    const page = document.body.dataset.security || document.body.dataset.page || document.body.id || '';
    if (page === 'change-password') {
        console.log('🔐 [Change Password] بدء التشغيل عبر DOMContentLoaded');
        try {
            // انتظر قليلاً حتى يتم تحميل security.js كاملاً
            await new Promise(resolve => setTimeout(resolve, 100));
            await window.SecurityPages['change-password'].init();
        } catch (err) {
            console.error('❌ [Change Password] خطأ في التهيئة:', err);
        }
    }
});

console.log('✅ security-change-password.js تم تحميله');
