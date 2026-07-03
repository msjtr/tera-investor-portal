/**
 * security-change-password.js
 * تغيير كلمة المرور عبر OTP (Magic Link / Email OTP)
 * متوافق مع security.js و TeraAuth
 * النسخة النهائية – مع منع الإرسال المتكرر وترتيب محسّن
 */

'use strict';

window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['change-password'] = {

    _timerInterval: null,
    _timerSeconds: 300,
    _otpVerified: false,
    _isSending: false, // لمنع الإرسال المتكرر

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

        this.bindEvents();

        const emailInput = document.getElementById('emailForOtp');
        if (emailInput && user.email) {
            emailInput.value = user.email;
        }

        console.log('✅ [Change Password] جاهز.');
    },

    bindEvents() {
        const sendBtn = document.getElementById('sendOtpBtn');
        if (sendBtn) {
            sendBtn.removeEventListener('click', this.sendOtp);
            sendBtn.addEventListener('click', this.sendOtp.bind(this));
        }

        const changeBtn = document.getElementById('changePasswordBtn');
        if (changeBtn) {
            changeBtn.removeEventListener('click', this.changePassword);
            changeBtn.addEventListener('click', this.changePassword.bind(this));
        }

        const otpInput = document.getElementById('otpCode');
        if (otpInput) {
            otpInput.removeEventListener('input', this.autoSubmitOtp);
            otpInput.addEventListener('input', this.autoSubmitOtp.bind(this));
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

    // ==================== إرسال رمز OTP (مع منع التكرار) ====================
    async sendOtp() {
        // منع الإرسال المتكرر
        if (this._isSending) {
            showSecurityAlert('جاري إرسال الرمز، يرجى الانتظار.', 'warning');
            return;
        }

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

        this._isSending = true;
        const btn = document.getElementById('sendOtpBtn');
        setButtonLoading(btn, 'جاري الإرسال...');

        try {
            const supabase = SecurityCore.supabase;
            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: { shouldCreateUser: false }
            });
            if (error) throw error;

            this._otpVerified = false;
            document.getElementById('otpSection').style.display = 'block';
            btn.style.display = 'none';
            document.getElementById('changePasswordBtn').style.display = 'none';
            document.getElementById('otpCode').value = '';
            document.getElementById('otpCode').focus();

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
            // إعادة إظهار الزر إذا فشل
            btn.style.display = 'block';
        } finally {
            restoreButton(btn);
            this._isSending = false;
            if (document.getElementById('otpSection').style.display !== 'block') {
                btn.style.display = 'block';
            }
        }
    },

    // ==================== مؤقت إعادة الإرسال ====================
    startTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
        this._timerSeconds = 300;
        this._timerInterval = setInterval(() => {
            this._timerSeconds--;
            this.updateTimerDisplay();
            if (this._timerSeconds <= 0) {
                clearInterval(this._timerInterval);
                this._timerInterval = null;
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
    async autoSubmitOtp(e) {
        const input = e.currentTarget;
        input.value = input.value.replace(/\D/g, '');
        const otp = input.value.trim();
        if (otp.length === 8) {
            await this.verifyOtpAndChangePassword(otp);
        }
    },

    // ==================== التحقق من الرمز وتغيير كلمة المرور ====================
    async verifyOtpAndChangePassword(otp) {
        if (this._otpVerified) {
            await this.changePassword();
            return;
        }

        const emailInput = document.getElementById('emailForOtp');
        const email = emailInput?.value?.trim();
        if (!email) {
            showSecurityAlert('يرجى إدخال البريد الإلكتروني.', 'error');
            return;
        }

        const btn = document.getElementById('changePasswordBtn');
        setButtonLoading(btn, 'جاري التحقق من الرمز...');

        try {
            const supabase = SecurityCore.supabase;
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: email,
                token: otp,
                type: 'email'
            });
            if (verifyError) throw verifyError;

            this._otpVerified = true;
            showSecurityAlert('✅ تم التحقق من الرمز بنجاح. جاري تغيير كلمة المرور...', 'success');

            // إظهار زر التأكيد (سيتم الضغط عليه تلقائياً)
            btn.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-key"></i> تأكيد الرمز وتغيير كلمة المرور';
            document.getElementById('otpCode').disabled = true;

            // تنفيذ التغيير فوراً بعد التحقق
            await this.changePassword();

        } catch (err) {
            console.error('❌ [Verify OTP]', err);
            let msg = 'رمز التحقق غير صحيح أو منتهي الصلاحية.';
            if (err.message.includes('expired')) {
                msg = 'انتهت صلاحية الرمز. يرجى طلب رمز جديد.';
            } else if (err.message.includes('invalid')) {
                msg = 'الرمز غير صحيح. يرجى المحاولة مرة أخرى.';
            }
            showSecurityAlert(msg, 'error');
            document.getElementById('sendOtpBtn').style.display = 'block';
            document.getElementById('otpCode').value = '';
            document.getElementById('otpCode').focus();
        } finally {
            restoreButton(btn);
        }
    },

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
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (updateError) throw updateError;

            showSecurityAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');
            this.resetForm();
            await SecurityCore.refreshUser();

        } catch (err) {
            console.error('❌ [Change Password]', err);
            let msg = 'تعذر تغيير كلمة المرور.';
            if (err.message) {
                if (err.message.includes('should be different from the old password')) {
                    msg = '⚠️ كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.';
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
        this._isSending = false;

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
