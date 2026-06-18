/* ================================================= */
/* TERA PORTFOLIO MODULE */
/* ================================================= */
'use strict';

const PortfolioManager = {
    init() {
        console.log('Portfolio Module Initialized');
        this.cacheDOM();
        this.bindEvents();
        this.loadPortfolio();
    },

    cacheDOM() {
        // جلب عناصر صفحة المحفظة إن وجدت
        this.withdrawForm = document.getElementById('withdrawForm');
        this.balanceDisplay = document.querySelector('.balance-amount-display');
    },

    bindEvents() {
        // ربط حدث الإرسال بنموذج السحب (إن وجد)
        if (this.withdrawForm) {
            this.withdrawForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleWithdrawRequest();
            });
        }
    },

    loadPortfolio() {
        // محاكاة جلب بيانات المحفظة من السيرفر
        console.log('جاري تحميل وتحديث بيانات المحفظة...');
        
        // إضافة تأثير بصري لظهور الرصيد بنعومة (Fade-in effect)
        if (this.balanceDisplay) {
            this.balanceDisplay.style.opacity = '0';
            setTimeout(() => {
                this.balanceDisplay.style.transition = 'opacity 0.6s ease';
                this.balanceDisplay.style.opacity = '1';
            }, 300);
        }
    },

    handleWithdrawRequest() {
        // جلب حقل المبلغ للتحقق منه (بافتراض وجود حقل يحمل هذا الـ ID)
        const amountInput = document.getElementById('withdrawAmount');
        
        if (amountInput && (amountInput.value === '' || parseFloat(amountInput.value) <= 0)) {
            alert('يرجى إدخال مبلغ صحيح للسحب.');
            return;
        }

        // تفعيل حالة التحميل للزر لمنع الإرسال المزدوج
        const submitBtn = this.withdrawForm ? this.withdrawForm.querySelector('button[type="submit"]') : null;
        let originalText = '';
        
        if (submitBtn) {
            originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-left: 8px;"></i> جاري المعالجة...';
            submitBtn.style.opacity = '0.7';
        }

        // محاكاة الاتصال بالخادم (API Call)
        setTimeout(() => {
            alert('تم إرسال طلب السحب بنجاح. ستتم المعالجة وإيداع المبلغ في حسابك البنكي خلال أيام العمل الرسمية.');
            
            // إعادة ضبط النموذج
            if (this.withdrawForm) {
                this.withdrawForm.reset();
            }
            
            // إعادة الزر لحالته الطبيعية
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                submitBtn.style.opacity = '1';
            }
        }, 1500);
    }
};

/* ================================================= */
/* إتاحة الدوال عالمياً (Global Scope) */
/* لضمان استمرار عمل الأزرار المربوطة بـ onclick في HTML */
/* ================================================= */

window.requestWithdraw = function(e) {
    if (e) e.preventDefault();
    PortfolioManager.handleWithdrawRequest();
};

window.loadPortfolio = function() {
    PortfolioManager.loadPortfolio();
};

/* ================================================= */
/* التهيئة عند تحميل الصفحة */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    PortfolioManager.init();
});
