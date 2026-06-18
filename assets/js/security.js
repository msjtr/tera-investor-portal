/* ================================================= */
/* TERA SECURITY MODULE (security.js) */
/* ================================================= */
'use strict';

const SecurityManager = {
    init() {
        console.log('Security Module Initialized');
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM() {
        // نماذج تغيير البيانات الحساسة
        this.passwordForm = document.getElementById('changePasswordForm');
        this.emailForm = document.getElementById('changeEmailForm');
        this.mobileForm = document.getElementById('changeMobileForm');
    },

    bindEvents() {
        // 1. معالجة نماذج الأمان (تغيير كلمة المرور، البريد، الجوال)
        const forms = [
            { el: this.passwordForm, msg: 'تم تغيير كلمة المرور بنجاح. يرجى استخدام كلمة المرور الجديدة في المرة القادمة.' },
            { el: this.emailForm, msg: 'تم إرسال رابط تأكيد إلى البريد الإلكتروني الجديد.' },
            { el: this.mobileForm, msg: 'تم تحديث رقم الجوال بنجاح.' }
        ];

        forms.forEach(formObj => {
            if (formObj.el) {
                formObj.el.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleSecurityForm(formObj.el, formObj.msg);
                });
            }
        });

        // 2. معالجة مفاتيح التبديل (التحقق الثنائي 2FA) عبر Event Delegation
        document.addEventListener('change', (e) => {
            if (e.target.matches('.switch-control input[type="checkbox"]')) {
                this.handleTwoFactorToggle(e.target);
            }
        });

        // 3. معالجة إزالة الأجهزة المتصلة (تسجيل الخروج من جهاز)
        document.addEventListener('click', (e) => {
            const revokeBtn = e.target.closest('.btn-revoke-device');
            if (revokeBtn) {
                e.preventDefault();
                this.handleRevokeDevice(revokeBtn);
            }
        });
    },

    // دالة موحدة لمعالجة حفظ النماذج مع حالة التحميل
    handleSecurityForm(form, successMessage) {
        // تحقق إضافي خاص بكلمة المرور (تطابق كلمتي المرور)
        const newPass = form.querySelector('input[name="newPassword"]');
        const confirmPass = form.querySelector('input[name="confirmPassword"]');
        
        if (newPass && confirmPass && newPass.value !== confirmPass.value) {
            alert('كلمات المرور الجديدة غير متطابقة. يرجى التأكد والمحاولة مجدداً.');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        let originalText = '';

        if (submitBtn) {
            originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-left: 8px;"></i> جاري التحديث...';
            submitBtn.style.opacity = '0.7';
        }

        // محاكاة الاتصال بالخادم (API Call)
        setTimeout(() => {
            alert(successMessage);
            
            form.reset();
            
            // إعادة الزر لحالته الطبيعية
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                submitBtn.style.opacity = '1';
            }
        }, 1500);
    },

    // معالجة تفعيل وإلغاء التحقق الثنائي (2FA)
    handleTwoFactorToggle(checkbox) {
        const isEnabled = checkbox.checked;
        const statusText = isEnabled ? 'تفعيل' : 'إلغاء تفعيل';
        
        // تعطيل المؤشر مؤقتاً لمنع النقر المتعدد أثناء المعالجة
        checkbox.disabled = true;

        // محاكاة طلب التحديث في الخلفية
        setTimeout(() => {
            alert(`تم ${statusText} المصادقة الثنائية (2FA) بنجاح.`);
            checkbox.disabled = false;
        }, 800);
    },
