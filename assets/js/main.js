/**
 * ==========================================================================
 * TERA INVESTOR PORTAL - UI & UTILITIES (main.js)
 * ==========================================================================
 * يتحكم هذا الملف في السلوك الحركي لعناصر واجهة المستخدم المشتركة بالبوابة.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // تهيئة ميزات واجهات الاستخدام بأمان
    TeraUI.initLoader();
    TeraUI.initDropdowns();
    TeraUI.initAlertAutoClose();
    TeraUI.initFormPlaceholders();
});

const TeraUI = {
    /**
     * إخفاء شاشة الانتظار (Loader) بعد اكتمال تحميل الصفحة
     */
    initLoader: function () {
        const loader = document.querySelector('.tera-loader-wrapper');
        if (loader) {
            setTimeout(() => {
                loader.style.opacity = '0';
                loader.style.visibility = 'hidden';
            }, 300);
        }
    },

    /**
     * نظام إطلاق التنبيهات الديناميكي في الواجهة (Alerts System)
     * @param {string} message - نص الرسالة
     * @param {string} type - نوع التنبيه ('success', 'danger', 'warning', 'info')
     */
    showAlert: function (message, type = 'info') {
        let alertContainer = document.getElementById('global-alert-container');
        
        if (!alertContainer) {
            // إنشاء حاوية التنبيهات إن لم تكن موجودة بداخل الصفحة
            alertContainer = document.createElement('div');
            alertContainer.id = 'global-alert-container';
            // تم التعديل: التموضع الآن في اليمين (right: 20px) ليتناسب تماماً مع الواجهة العربية RTL
            alertContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 350px; width: 100%;';
            document.body.appendChild(alertContainer);
        }

        const alertId = 'alert-' + Date.now();
        
        // استخدام الألوان والحدود المتناسقة مع هوية تيرا من اليمين
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show mb-2" role="alert" style="box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-right: 4px solid var(--${type}-color); background-color: var(--${type}-light, #ffffff); padding: 1rem 1.25rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                    <span style="font-size: 0.9rem; font-weight: 500;">${message}</span>
                    <button type="button" class="btn-close-style" onclick="document.getElementById('${alertId}').remove()" style="background:none; border:none; cursor:pointer; color:inherit; font-weight:bold; font-size: 1.2rem; line-height: 1;">&times;</button>
                </div>
            </div>
        `;

        alertContainer.insertAdjacentHTML('beforeend', alertHtml);

        // تدمير التنبيه تلقائياً بعد 5 ثوانٍ بشكل ناعم
        setTimeout(() => {
            const targetAlert = document.getElementById(alertId);
            if (targetAlert) {
                targetAlert.style.transition = 'opacity 0.3s ease';
                targetAlert.style.opacity = '0';
                setTimeout(() => targetAlert.remove(), 300);
            }
        }, 5000);
    },

    /**
     * إغلاق التنبيهات الثابتة المكتوبة في الـ HTML تلقائياً بشكل ناعم
     */
    initAlertAutoClose: function () {
        document.querySelectorAll('.alert-dismissible').forEach(alert => {
            setTimeout(() => {
                alert.style.transition = 'opacity 0.3s ease';
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 300);
            }, 6000);
        });
    },

    /**
     * تشغيل القوائم المنسدلة (Dropdowns) لملفات الحساب الشخصي أو اللغات بأمان تام
     */
    initDropdowns: function () {
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                
                const menu = this.nextElementSibling;
                // حماية أمنية: التحقق من وجود القائمة لمنع كسر السكربت في الكونسول
                if (menu && (menu.classList.contains('dropdown-menu') || menu.tagName === 'DIV' || menu.tagName === 'UL')) {
                    
                    // إغلاق أي قائمة منسدلة أخرى مفتوحة أولاً لمنع التداخل البصري
                    document.querySelectorAll('.dropdown-menu.show, .dropdown-toggle-menu.show').forEach(openMenu => {
                        if (openMenu !== menu) openMenu.classList.remove('show');
                    });
                    
                    menu.classList.toggle('show');
                }
            });
        });

        // إغلاق كافة القوائم عند النقر في أي مكان خارجها بداخل الصفحة
        document.addEventListener('click', function () {
            document.querySelectorAll('.dropdown-menu.show, .dropdown-toggle-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        });
    },

    /**
     * إضفاء تأثير تفاعلي على حقول الإدخال لتتبع وجود البيانات بداخلها (أثناء التحميل وعند المغادرة)
     */
    initFormPlaceholders: function () {
        const inputs = document.querySelectorAll('.form-control');
        
        inputs.forEach(input => {
            // فحص فوري لحالة الحقل عند التحميل (في حال كان المتصفح قد قام بملء الحقول تلقائياً)
            if (input.value.trim() !== '') {
                input.classList.add('has-value');
            }

            // فحص الحقل عند مغادرته (Blur)
            input.addEventListener('blur', function () {
                if (this.value.trim() !== '') {
                    this.classList.add('has-value');
                } else {
                    this.classList.remove('has-value');
                }
            });
        });
    }
};
