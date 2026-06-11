/**
 * ==========================================================================
 * TERA INVESTOR PORTAL - UI & UTILITIES (main.js)
 * ==========================================================================
 * يتحكم هذا الملف في السلوك الحركي لعناصر واجهة المستخدم المشتركة بالبوابة.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // تهيئة ميزات واجهات الاستخدام
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
        const alertContainer = document.getElementById('global-alert-container');
        if (!alertContainer) {
            // إنشاء حاوية التنبيهات إن لم تكن موجودة بداخل الصفحة
            const container = document.createElement('div');
            container.id = 'global-alert-container';
            container.style.cssText = 'position: fixed; top: 20px; left: 20px; z-index: 9999; max-width: 350px; width: 100%;';
            document.body.appendChild(container);
        }

        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show mb-2" role="alert" style="box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-right: 4px solid var(--${type}-color);">
                <div class="d-flex align-items-center justify-content-between">
                    <span>${message}</span>
                    <button type="button" class="btn-close-style" onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; cursor:pointer; color:inherit; font-weight:bold;">×</button>
                </div>
            </div>
        `;

        document.getElementById('global-alert-container').insertAdjacentHTML('beforeend', alertHtml);

        // تدمير التنبيه تلقائياً بعد 5 ثوانٍ
        setTimeout(() => {
            const targetAlert = document.getElementById(alertId);
            if (targetAlert) targetAlert.remove();
        }, 5000);
    },

    /**
     * إغلاق التنبيهات الثابتة في الـ HTML تلقائياً
     */
    initAlertAutoClose: function () {
        document.querySelectorAll('.alert-dismissible').forEach(alert => {
            setTimeout(() => {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 300);
            }, 6000);
        });
    },

    /**
     * تشغيل القوائم المنسدلة (Dropdowns) لملفات الحساب الشخصي أو اللغات
     */
    initDropdowns: function () {
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                const menu = this.nextElementSibling;
                menu.classList.toggle('show');
            });
        });

        // إغلاق كافة القوائم عند النقر في أي مكان خارجها
        document.addEventListener('click', function () {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        });
    },

    /**
     * إضفاء تأثير تفاعلي على حقول الإدخال الفارغة وغير الفارغة لتنسيق الـ CSS
     */
    initFormPlaceholders: function () {
        const inputs = document.querySelectorAll('.form-control');
        inputs.forEach(input => {
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
