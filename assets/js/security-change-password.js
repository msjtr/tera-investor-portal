/**
 * security-change-password.js
 * تغيير كلمة المرور عبر OTP (Magic Link / Email OTP)
 * متوافق مع security.js و TeraAuth
 * النسخة المُحدَّثة: تحسين معالجة الأخطاء، التحقق من الجلسة، إعادة التوجيه التلقائي
 */

'use strict';

window.SecurityPages = window.SecurityPages || {};

if (!window.SecurityPages['change-password']) {
    window.SecurityPages['change-password'] = {};
}

window.SecurityPages['change-password'] = {

    _timerInterval: null,
    _timerSeconds: 300,
    _otpVerified: false,

    async init() {
        console.log('🔐 [Change Password] تهيئة الصفحة (عبر OTP)');

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

        // التحقق من صحة الجلسة
        const { data: { session } } = await SecurityCore.supabase.auth.getSession();
        if (!session) {
            showSecurityAlert('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.', 'error');
            setTimeout(() => {
                window.location.replace('/auth/auth/login/login.html');
            }, 2000);
            return;
        }

        this.bindEvents();

        const emailInput = document.getElementById('emailForOtp');
        if (emailInput && user.email) {
            emailInput.value = user.email;
        }

        console.log('✅ [Change Password] جاهز.');
    },

    // ... (بقية الدوال كما هي مع تعديلات طفيفة)

    // ==================== تغيير كلمة المرور (بعد التحقق) ====================
    async changePassword() {
        if (!this._otpVerified) {
            const otp = document.getElementById('otpCode')?.value?.trim();
            if (otp && otp.length === 8) {
                await this.verifyOtpAndChangePassword(otp);
                return;
            } else {
                showSecurityAlert('يرجى إدخال رمز التحقق المكون من 8 أرقام أولاً.', 'error');
                document.getElementById('otpCode')?.focus();
                return;
            }
        }

        const newPassword = document.getElementById('newPassword')?.value?.trim() || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value?.trim() || '';

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

        const btn = document.getElementById('changePasswordBtn');
        setButtonLoading(btn, 'جاري تغيير كلمة المرور...');

        try {
            const supabase = SecurityCore.supabase;

            // التحقق من الجلسة قبل التحديث
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('session_expired');
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            // نجاح
            showSecurityAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');

            // تنظيف النموذج
            this.resetForm();

            // تحديث المستخدم
            await SecurityCore.refreshUser();

            // إعادة التوجيه بعد 3 ثوانٍ
            setTimeout(() => {
                window.location.replace('/pages/dashboard/index.html');
            }, 3000);

        } catch (err) {
            console.error('❌ [Change Password]', err);

            let msg = 'تعذر تغيير كلمة المرور.';
            if (err.message) {
                if (err.message.includes('should be different from the old password')) {
                    msg = '⚠️ كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.';
                } else if (err.message.includes('session_expired') || err.message.includes('403') || err.message.includes('Auth session missing')) {
                    msg = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.';
                    setTimeout(() => {
                        window.location.replace('/auth/auth/login/login.html');
                    }, 2000);
                } else if (err.message.includes('expired')) {
                    msg = 'انتهت صلاحية الجلسة. يرجى طلب رمز جديد.';
                    this._otpVerified = false;
                    document.getElementById('sendOtpBtn').style.display = 'block';
                    document.getElementById('otpCode').disabled = false;
                    document.getElementById('otpCode').value = '';
                } else {
                    msg = err.message;
                }
            }
            showSecurityAlert(msg, 'error');

            if (err.message && err.message.includes('should be different from the old password')) {
                document.getElementById('newPassword')?.focus();
                document.getElementById('newPassword')?.select();
            }
        } finally {
            restoreButton(btn);
        }
    },

    // ==================== إعادة تعيين النموذج ====================
    resetForm() {
        const form = document.getElementById('changePasswordForm');
        if (form) form.reset();

        document.getElementById('otpCode').value = '';
        document.getElementById('otpCode').disabled = false;
        document.getElementById('changePasswordBtn').style.display = 'none';
        document.getElementById('sendOtpBtn').style.display = 'block';
        document.getElementById('sendOtpBtn').disabled = false;
        document.getElementById('otpSection').style.display = 'none';
        this._otpVerified = false;

        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
        document.getElementById('timerDisplay').textContent = '05:00';

        const fill = document.getElementById('strengthFill');
        if (fill) { fill.style.width = '0%'; fill.style.background = '#e2e8f0'; }
        const label = document.getElementById('strengthLabel');
        if (label) { label.textContent = 'ضعيفة'; label.className = 'strength-label'; }

        document.querySelectorAll('#passwordRequirements ul li').forEach(li => {
            li.className = '';
            const icon = li.querySelector('i');
            if (icon) icon.className = 'fas fa-circle';
        });

        const hint = document.getElementById('confirmPasswordHint');
        if (hint) {
            hint.textContent = 'أعد كتابة كلمة المرور الجديدة';
            hint.style.color = '#64748b';
        }
    },

    // ... (بقية الدوال كما هي)
};
