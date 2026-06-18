/* ================================================= */
/* TERA PROFILE & KYC MODULE */
/* ================================================= */
'use strict';

const ProfileManager = {
    init() {
        console.log('Profile Module Initialized');
        this.cacheDOM();
        this.bindEvents();
        this.setupDragAndDrop();
    },

    cacheDOM() {
        // نماذج البيانات
        this.personalForm = document.getElementById('personalInfoForm');
        this.bankForm = document.getElementById('bankInfoForm');
        
        // منطقة رفع الملفات
        this.uploadZone = document.querySelector('.upload-zone-wrapper');
        this.fileInput = document.getElementById('documentUpload');
    },

    bindEvents() {
        // معالجة تحديث البيانات الشخصية
        if (this.personalForm) {
            this.personalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(this.personalForm, 'تم تحديث البيانات الشخصية بنجاح.');
            });
        }

        // معالجة تحديث البيانات البنكية
        if (this.bankForm) {
            this.bankForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(this.bankForm, 'تم تحديث المعلومات البنكية بنجاح.');
            });
        }

        // معالجة اختيار ملف عبر النقر
        if (this.uploadZone && this.fileInput) {
            this.uploadZone.addEventListener('click', () => {
                this.fileInput.click();
            });

            this.fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    },

    // دالة موحدة لمعالجة حفظ النماذج مع حالة التحميل
    handleFormSubmit(form, successMessage) {
        const submitBtn = form.querySelector('button[type="submit"]');
        let originalText = '';

        if (submitBtn) {
            originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-left: 8px;"></i> جاري الحفظ...';
            submitBtn.style.opacity = '0.7';
        }

        // محاكاة الاتصال بالخادم (API Call)
        setTimeout(() => {
            alert(successMessage);
            
            // إعادة الزر لحالته الطبيعية
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                submitBtn.style.opacity = '1';
            }
        }, 1200);
    },

    // تهيئة خاصية السحب والإفلات للمرفقات
    setupDragAndDrop() {
        if (!this.uploadZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, () => {
                this.uploadZone.style.borderColor = 'var(--tera-secondary, #00C2C7)';
                this.uploadZone.style.background = 'rgba(0, 194, 199, 0.1)';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, () => {
                this.uploadZone.style.borderColor = '';
                this.uploadZone.style.background = '';
            }, false);
        });

        this.uploadZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            this.handleFiles(files);
        }, false);
    },

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    // معالجة الملفات المرفوعة
    handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            
            // التحقق من نوع وحجم الملف المبدئي (مثال: أقل من 5 ميجابايت)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('حجم الملف كبير جداً. يرجى رفع ملف بحجم أقل من 5 ميجابايت.');
                return;
            }

            // عرض اسم الملف كـ Feedback للمستخدم
            const textElement = this.uploadZone.querySelector('p, span');
            if (textElement) {
                textElement.innerHTML = `<strong>تم اختيار:</strong> ${file.name} <br> <small>جاري الرفع...</small>`;
            }

            // محاكاة رفع الملف
            setTimeout(() => {
                alert(`تم رفع الملف "${file.name}" بنجاح.`);
                // إعادة النص للحالة الأصلية
                if (textElement) {
                    textElement.innerHTML = 'اسحب وأفلت الملفات هنا أو <strong>اضغط للاستعراض</strong>';
                }
            }, 2000);
        }
    }
};

/* ================================================= */
/* إتاحة الدوال عالمياً (Global Scope) */
/* ================================================= */
window.updateProfile = function(formId) {
    const form = document.getElementById(formId);
    if (form) {
        ProfileManager.handleFormSubmit(form, 'تم التحديث بنجاح.');
    }
};

/* ================================================= */
/* التهيئة عند تحميل الصفحة */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
});
