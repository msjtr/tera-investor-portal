/**
 * security-change-password.js
 * تغيير كلمة المرور عبر OTP (Magic Link / Email OTP)
 * متوافق مع security.js و TeraAuth
 */

'use strict';

window.SecurityPages = window.SecurityPages || {};

// نحافظ على التعريف إذا كان موجوداً، وإلا ننشئه
if (!window.SecurityPages['change-password']) {
    window.SecurityPages['change-password'] = {};
}

window.SecurityPages['change-password'] = {

    // حالة المؤقت
    _timerInterval: null,
    _timerSeconds: 300,

    async init() {
        console.log('🔐 [Change Password] تهيئة الصفحة (عبر OTP)');

        // 1. تأكد من وجود SecurityCore
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

        // 2. تأكد من وجود المستخدم
        const user = await SecurityCore.getUser();
        if (!user) {
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        // 3. ربط الأحداث
        this.bindEvents();

        // 4. ملء البريد الإلكتروني تلقائياً (للمساعدة)
        const emailInput = document.getElementById('emailForOtp');
        if (emailInput && user.email) {
            emailInput.value = user.email;
        }

        console.log('✅ [Change Password] جاهز.');
    },

    bindEvents() {
        // زر إرسال الرمز
        const sendBtn = document.getElementById('sendOtpBtn');
        if (sendBtn) {
            sendBtn.removeEventListener('click', this.sendOtp);
            sendBtn.addEventListener('click', this.sendOtp.bind(this));
        }

        // زر تغيير كلمة المرور (بعد التحقق)
        const changeBtn = document.getElementById('changePasswordBtn');
        if (changeBtn) {
            changeBtn.removeEventListener('click', this.changePassword);
            changeBtn.addEventListener('click', this.changePassword.bind(this));
        }

        // حقل رمز OTP – الإرسال التلقائي عند اكتمال 8 أرقام
        const otpInput = document.getElementById('otpCode');
        if (otpInput) {
            otpInput.removeEventListener('input', this.autoSubmitOtp);
            otpInput.addEventListener('input', this.autoSubmitOtp.bind(this));
        }

        // أزرار إظهار/إخفاء كلمة المرور (لكلمة المرور الجديدة وتأكيدها)
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.removeEventListener('click', this.togglePasswordVisibility);
            toggle.addEventListener('click', this.togglePasswordVisibility);
        });

        // التحقق الفوري من قوة كلمة المرور الجديدة
        const newPassword = document.getElementById('newPassword');
        if (newPassword) {
            newPassword.removeEventListener('input', this.validatePasswordStrength);
            newPassword.addEventListener('input', this.validatePasswordStrength);
        }

        // التحقق من تطابق كلمة المرور
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

    // ==================== إرسال رمز OTP ====================
    async sendOtp() {
        const emailInput = document.getElementById('emailForOtp');
        const email = emailInput?.value?.trim();
        if (!email) {
            showSecurityAlert('يرجى إدخال البريد الإلكتروني.', 'error');
            emailInput?.focus();
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showSecurityAlert('البريد الإلكتروني غير صحيح.', 'error');
            emailInput?.focus();
            return;
        }

        const btn = document.getElementById('sendOtpBtn');
        setButtonLoading(btn, 'جاري الإرسال...');

        try {
            const supabase = SecurityCore.supabase;
            // إرسال OTP عبر البريد (Magic Link / Email OTP)
            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: false,
                    // يمكن تخصيص القالب إن لزم
                }
            });

            if (error) throw error;

            // عرض حقل الرمز وإخفاء زر الإرسال
            document.getElementById('otpSection').style.display = 'block';
            btn.style.display = 'none';

            // بدء المؤقت
            this.startTimer();

            showSecurityAlert('✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني.', 'success');

        } catch (err) {
            console.error('❌ [Send OTP]', err);
            let msg = 'فشل إرسال الرمز. حاول مرة أخرى.';
            if (err.message.includes('rate limit')) {
                msg = 'تم تجاوز عدد المحاولات. انتظر بضع دقائق.';
            } else if (err.message.includes('Email not found')) {
                msg = 'البريد الإلكتروني غير مسجل.';
            }
            showSecurityAlert(msg, 'error');
        } finally {
            restoreButton(btn);
            // إذا فشل، نعيد ظهور زر الإرسال
            if (document.getElementById('otpSection').style.display !== 'block') {
                btn.style.display = 'block';
            }
        }
    },

    // ==================== مؤقت إعادة الإرسال ====================
    startTimer() {
        this._timerSeconds = 300;
        this._timerInterval = setInterval(() => {
            this._timerSeconds--;
            this.updateTimerDisplay();
            if (this._timerSeconds <= 0) {
                clearInterval(this._timerInterval);
                this._timerInterval = null;
                // نعيد ظهور زر إرسال الرمز (مع إتاحة إعادة الإرسال)
                const sendBtn = document.getElementById('sendOtpBtn');
                if (sendBtn) {
                    sendBtn.style.display = 'block';
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i class="fas fa-redo-alt"></i> إعادة إرسال الرمز';
                }
                document.getElementById('timerDisplay').textContent = '00:00';
            }
        }, 1000);
    },

    updateTimerDisplay() {
        const min = Math.floor(this._timerSeconds / 60);
        const sec = this._timerSeconds % 60;
        document.getElementById('timerDisplay').textContent =
            String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    },

    // ==================== الإرسال التلقائي عند اكتمال 8 أرقام ====================
    autoSubmitOtp(e) {
        const input = e.currentTarget;
        input.value = input.value.replace(/\D/g, '');
        const otp = input.value.trim();
        if (otp.length === 8) {
            // تشغيل تغيير كلمة المرور تلقائياً
            this.changePassword();
        }
    },

    // ==================== تغيير كلمة المرور بعد التحقق من OTP ====================
    async changePassword() {
        const otpInput = document.getElementById('otpCode');
        const otp = otpInput?.value?.trim();
        if (!otp || otp.length !== 8) {
            showSecurityAlert('يرجى إدخال رمز التحقق المكون من 8 أرقام.', 'error');
            otpInput?.focus();
            return;
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
        setButtonLoading(btn, 'جاري التحقق وتغيير كلمة المرور...');

        try {
            const supabase = SecurityCore.supabase;
            const email = document.getElementById('emailForOtp').value.trim();

            // 1. التحقق من الرمز
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: email,
                token: otp,
                type: 'email' // أو 'magiclink' حسب الإعدادات
            });

            if (verifyError) throw verifyError;

            // 2. بعد التحقق، نقوم بتحديث كلمة المرور
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            // 3. نجاح
            showSecurityAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');

            // تنظيف النموذج
            document.getElementById('changePasswordForm')?.reset();
            document.getElementById('otpCode').value = '';
            document.getElementById('changePasswordBtn').style.display = 'none';
            document.getElementById('sendOtpBtn').style.display = 'block';
            document.getElementById('otpSection').style.display = 'none';
            document.getElementById('strengthFill').style.width = '0%';
            document.getElementById('strengthLabel').textContent = 'ضعيفة';
            document.querySelectorAll('#passwordRequirements ul li').forEach(li => {
                li.className = '';
                li.querySelector('i').className = 'fas fa-circle';
            });

            // تحديث المستخدم
            await SecurityCore.refreshUser();

        } catch (err) {
            console.error('❌ [Change Password]', err);
            let msg = 'رمز التحقق غير صحيح أو منتهي الصلاحية.';
            if (err.message.includes('expired')) {
                msg = 'انتهت صلاحية الرمز. يرجى طلب رمز جديد.';
            } else if (err.message.includes('invalid')) {
                msg = 'الرمز غير صحيح. يرجى المحاولة مرة أخرى.';
            }
            showSecurityAlert(msg, 'error');
            // إعادة تمكين زر الإرسال إذا كان الرمز خاطئاً
            document.getElementById('sendOtpBtn').style.display = 'block';
        } finally {
            restoreButton(btn);
        }
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
                el.querySelector('i').className = valid ? 'fas fa-check-circle' : 'fas fa-circle';
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

// ============================================================
// بدء التشغيل التلقائي
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    const page = document.body.dataset.security || document.body.dataset.page || document.body.id || '';
    if (page === 'change-password') {
        console.log('🔐 [Change Password] بدء التشغيل التلقائي...');
        try {
            await window.SecurityPages['change-password'].init();
        } catch (err) {
            console.error('❌ [Change Password] خطأ في التهيئة:', err);
        }
    }
});
