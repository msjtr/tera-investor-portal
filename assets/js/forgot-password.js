/* ================================================= */
/* TERA AUTH - Forgot Password Handler */
/* ================================================= */
'use strict';

const ForgotPasswordModule = {
    init() {
        console.log('Forgot Password Module Initialized');
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM() {
        this.form = document.getElementById('forgotPasswordForm');
        if (this.form) {
            this.emailInput = this.form.querySelector('#email');
            this.submitBtn = this.form.querySelector('button[type="submit"]');
            // إنشاء حاوية للرسائل التنبيهية أعلى النموذج إذا لم تكن موجودة
            this.alertBox = document.createElement('div');
            this.alertBox.className = 'auth-alert';
            this.alertBox.style.display = 'none';
            this.alertBox.style.marginBottom = '20px';
            this.alertBox.style.padding = '12px';
            this.alertBox.style.borderRadius = '12px';
            this.alertBox.style.fontSize = '0.9rem';
            this.alertBox.style.fontWeight = '600';
            this.form.prepend(this.alertBox);
        }
    },

    bindEvents() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleResetRequest.bind(this));
        }
    },

    async handleResetRequest(e) {
        e.preventDefault();
        
        // مسح التنبيهات السابقة
        this.hideAlert();
        
        const email = this.emailInput.value.trim();

        // 1. التحقق من صحة المدخلات
        if (!email) {
            this.showAlert('يرجى إدخال البريد الإلكتروني الخاص بك.', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showAlert('صيغة البريد الإلكتروني غير صحيحة.', 'error');
            return;
        }

        // 2. تفعيل حالة التحميل (Loading State)
        const originalBtnText = this.submitBtn.innerHTML;
        this.setLoadingState(true, 'جاري الإرسال...');

        try {
            // محاكاة إرسال الطلب للخادم (API Call Simulation)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // تخزين البريد الإلكتروني في الجلسة لاستخدامه في صفحة OTP
            sessionStorage.setItem('tera_reset_email', email);

            // 3. عرض رسالة النجاح والتوجيه
            this.showAlert('تم إرسال رمز التحقق إلى بريدك بنجاح.', 'success');
            
            setTimeout(() => {
                // توجيه المستخدم لصفحة إدخال رمز التحقق
                // المسار مبني على افتراض أن الملفين في نفس المجلد (auth)
                window.location.href = 'verify-otp.html';
            }, 1200);

        } catch (error) {
            console.error('Password Reset Error:', error);
            this.showAlert('حدث خطأ أثناء معالجة طلبك، يرجى المحاولة لاحقاً.', 'error');
            this.setLoadingState(false, originalBtnText);
        }
    },

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    setLoadingState(isLoading, text) {
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-left: 8px;"></i> ${text}`;
            this.submitBtn.style.opacity = '0.7';
            this.submitBtn.style.cursor = 'not-allowed';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = text;
            this.submitBtn.style.opacity = '1';
            this.submitBtn.style.cursor = 'pointer';
        }
    },

    showAlert(message, type) {
        this.alertBox.textContent = message;
        this.alertBox.style.display = 'block';
        
        if (type === 'error') {
            this.alertBox.style.backgroundColor = '#FEF2F2';
            this.alertBox.style.color = '#DC2626';
            this.alertBox.style.border = '1px solid #FCA5A5';
        } else if (type === 'success') {
            this.alertBox.style.backgroundColor = '#F0FDF4';
            this.alertBox.style.color = '#16A34A';
            this.alertBox.style.border = '1px solid #86EFAC';
        }
    },

    hideAlert() {
        this.alertBox.style.display = 'none';
        this.alertBox.textContent = '';
    }
};

// تهيئة السكريبت عند تحميل محتوى الصفحة
document.addEventListener('DOMContentLoaded', () => {
    ForgotPasswordModule.init();
});
