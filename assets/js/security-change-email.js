/**
 * ============================================================
 * تغيير البريد الإلكتروني - Change Email (نسخة المؤسسات)
 * ============================================================
 * الموقع: /assets/js/security-change-email.js
 * - آلية تحقق بخطوتين: OTP للبريد القديم، ثم تغيير مباشر للبريد الجديد.
 * - يستخدم رابط تأكيد للبريد الجديد (لا OTP للبريد الجديد).
 * - يعتمد على security.js الذي يوفر waitForSupabase() و showSecurityAlert()
 * ============================================================
 */

window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['change-email'] = {
    init: async function() {
        console.log('📧 تهيئة صفحة تغيير البريد الإلكتروني (مرحلتين)...');

        // ---------- انتظار جاهزية Supabase ----------
        let supabase;
        try { supabase = await waitForSupabase(); } catch (err) {
            showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showSecurityAlert('يجب تسجيل الدخول أولاً.', 'error');
            setTimeout(() => window.location.replace('/auth/auth/login/login.html'), 2000);
            return;
        }

        // ---------- تحديث الهيدر ----------
        const fullName = user.user_metadata?.full_name || 'مستخدم';
        document.getElementById('headerUserName').textContent = fullName;
        document.getElementById('headerAvatar').textContent = fullName.charAt(0).toUpperCase();

        const currentEmail = user.email;
        document.getElementById('currentEmailDisplay').textContent = currentEmail;

        // ---------- عناصر DOM للمرحلتين ----------
        const sendOldEmailOtpBtn = document.getElementById('sendOldEmailOtpBtn');
        const step1OtpGroup = document.getElementById('step1OtpGroup');
        const oldEmailOtp = document.getElementById('oldEmailOtp');
        const verifyOldEmailBtn = document.getElementById('verifyOldEmailBtn');
        const oldEmailOtpError = document.getElementById('oldEmailOtpError');

        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        const newEmailInput = document.getElementById('newEmail');
        const confirmEmailInput = document.getElementById('confirmEmail');
        const changeEmailBtn = document.getElementById('changeEmailBtn');   // الزر الجديد

        // ========== المرحلة 1: إرسال رمز إلى البريد القديم ==========
        sendOldEmailOtpBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
            try {
                const { error } = await supabase.auth.signInWithOtp({
                    email: currentEmail,
                    options: { shouldCreateUser: false }
                });
                if (error) throw error;
                showSecurityAlert('تم إرسال رمز التحقق إلى بريدك الإلكتروني الحالي.', 'success');
                step1OtpGroup.style.display = 'block';
                oldEmailOtp.focus();
                this.style.display = 'none';
            } catch (err) {
                console.error(err);
                showSecurityAlert(err.message || 'فشل إرسال الرمز.', 'error');
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق إلى البريد الحالي';
            }
        });

        verifyOldEmailBtn.addEventListener('click', async function() {
            const otp = oldEmailOtp.value.trim();
            if (otp.length !== 8) {
                oldEmailOtpError.textContent = 'الرجاء إدخال 8 أرقام.';
                return;
            }
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
            try {
                const { error } = await supabase.auth.verifyOtp({
                    email: currentEmail,
                    token: otp,
                    type: 'email'
                });
                if (error) throw error;
                showSecurityAlert('تم تأكيد البريد الحالي بنجاح. يمكنك الآن إدخال البريد الجديد.', 'success');
                step1.style.display = 'none';
                step2.style.display = 'block';
            } catch (err) {
                console.error(err);
                oldEmailOtpError.textContent = err.message.includes('expired') ? 'انتهت صلاحية الرمز' : 'رمز التحقق غير صحيح.';
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز والمتابعة';
            }
        });

        // ========== المرحلة 2: زر تغيير البريد (رابط تأكيد) ==========
        if (changeEmailBtn) {
            changeEmailBtn.addEventListener('click', async function() {
                const newEmail = newEmailInput.value.trim();
                const confirm = confirmEmailInput.value.trim();

                if (!newEmail || newEmail !== confirm) {
                    showSecurityAlert('البريد الإلكتروني غير متطابق.', 'error');
                    return;
                }
                if (newEmail === currentEmail) {
                    showSecurityAlert('البريد الجديد مطابق للحالي.', 'error');
                    return;
                }

                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
                try {
                    const { error } = await supabase.auth.updateUser({
                        email: newEmail
                    });
                    if (error) throw error;
                    showSecurityAlert('✅ تم إرسال رابط تأكيد إلى البريد الإلكتروني الجديد. يرجى التحقق منه لإكمال التغيير.', 'success');
                    setTimeout(() => window.location.replace('/pages/dashboard/index.html'), 3000);
                } catch (err) {
                    console.error(err);
                    showSecurityAlert(err.message || 'فشل تغيير البريد.', 'error');
                } finally {
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-check-circle"></i> تغيير البريد الإلكتروني';
                }
            });
        }

        console.log('✅ صفحة تغيير البريد الإلكتروني (مرحلتين) مهيأة.');
    }
};

// بدء التهيئة تلقائياً عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (window.SecurityPages && window.SecurityPages['change-email']) {
        window.SecurityPages['change-email'].init();
    }
});
