/**
 * ============================================================
 * تغيير البريد الإلكتروني - Change Email (نسخة المؤسسات)
 * ============================================================
 * الموقع: /assets/js/security-change-email.js
 * - آلية تحقق بخطوتين: تأكيد البريد القديم أولاً ثم إدخال الجديد.
 * - يعتمد على security.js الذي يوفر waitForSupabase() و showSecurityAlert()
 * - يُحدث اسم المستخدم في الهيدر.
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
        const sendNewEmailOtpBtn = document.getElementById('sendNewEmailOtpBtn');
        const step2OtpGroup = document.getElementById('step2OtpGroup');
        const newEmailOtp = document.getElementById('newEmailOtp');
        const verifyNewEmailBtn = document.getElementById('verifyNewEmailBtn');
        const newEmailOtpError = document.getElementById('newEmailOtpError');

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

        // ========== المرحلة 2: إرسال رمز إلى البريد الجديد ==========
        sendNewEmailOtpBtn.addEventListener('click', async function() {
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
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
            try {
                const { error } = await supabase.auth.signInWithOtp({
                    email: newEmail,
                    options: { shouldCreateUser: false }
                });
                if (error) throw error;
                showSecurityAlert('تم إرسال رمز التحقق إلى البريد الجديد.', 'success');
                step2OtpGroup.style.display = 'block';
                newEmailOtp.focus();
                this.style.display = 'none';
            } catch (err) {
                console.error(err);
                showSecurityAlert(err.message || 'فشل إرسال الرمز.', 'error');
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق إلى البريد الجديد';
            }
        });

        verifyNewEmailBtn.addEventListener('click', async function() {
            const otp = newEmailOtp.value.trim();
            const newEmail = newEmailInput.value.trim();
            if (otp.length !== 8) {
                newEmailOtpError.textContent = 'الرجاء إدخال 8 أرقام.';
                return;
            }

            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
            try {
                const { error: otpError } = await supabase.auth.verifyOtp({
                    email: newEmail,
                    token: otp,
                    type: 'email'
                });
                if (otpError) throw otpError;

                const { error: updateError } = await supabase.auth.updateUser({ email: newEmail });
                if (updateError) throw updateError;

                showSecurityAlert('✅ تم تغيير البريد الإلكتروني بنجاح.', 'success');
                setTimeout(() => window.location.replace('/pages/dashboard/index.html'), 2000);
            } catch (err) {
                console.error(err);
                newEmailOtpError.textContent = err.message.includes('expired') ? 'انتهت صلاحية الرمز' : 'فشل التغيير: ' + err.message;
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد وتغيير البريد';
            }
        });

        console.log('✅ صفحة تغيير البريد الإلكتروني (مرحلتين) مهيأة.');
    }
};

// بدء التهيئة تلقائياً عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (window.SecurityPages && window.SecurityPages['change-email']) {
        window.SecurityPages['change-email'].init();
    }
});
