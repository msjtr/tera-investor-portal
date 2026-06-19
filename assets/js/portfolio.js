/**
 * ============================================================
 * portfolio.js - ملف إدارة عمليات المحفظة (النسخة المتوافقة مع SPA)
 * ============================================================
 * الموقع: /assets/js/portfolio.js
 * * التحديثات:
 * 1. تحويل الأحداث إلى Event Delegation لتعمل مع الصفحات الديناميكية.
 * 2. التخلص من رسائل alert المزعجة واستخدام نظام Toast.
 * 3. دمج التهيئة مع نظام `app.js` عبر دالة `initPortfolio`.
 * 4. استخدام `registerCleanup` لمنع تكرار الأحداث.
 * ============================================================
 */

(function() {
    'use strict';

    const PortfolioManager = {
        initialized: false,

        init() {
            console.log('💼 [Portfolio] بدء تهيئة وحدة المحفظة');
            this.loadPortfolio();
            this.bindEvents();
        },

        bindEvents() {
            // استخدام تفويض الأحداث (Event Delegation) لنموذج السحب
            // لمنع تكرار الأحداث في نظام الـ SPA
            if (this.initialized) return;
            this.initialized = true;

            const submitHandler = (e) => {
                const withdrawForm = e.target.closest('#withdrawForm');
                if (withdrawForm) {
                    e.preventDefault();
                    this.handleWithdrawRequest(withdrawForm);
                }
            };

            document.body.addEventListener('submit', submitHandler);

            // تسجيل دالة تنظيف (Cleanup) لإزالة الحدث إذا غادر المستخدم صفحة المحفظة
            if (typeof TeraApp !== 'undefined' && typeof TeraApp.registerCleanup === 'function') {
                TeraApp.registerCleanup(() => {
                    document.body.removeEventListener('submit', submitHandler);
                    this.initialized = false;
                    console.log('🧹 [Portfolio] تم تنظيف أحداث المحفظة');
                });
            }
        },

        loadPortfolio() {
            console.log('💼 [Portfolio] جاري تحديث الأرصدة والبيانات...');
            
            const balanceDisplay = document.querySelector('.balance-amount-display');
            
            // تأثير بصري للرصيد
            if (balanceDisplay) {
                balanceDisplay.style.opacity = '0';
                setTimeout(() => {
                    balanceDisplay.style.transition = 'opacity 0.6s ease';
                    balanceDisplay.style.opacity = '1';
                }, 100);
            }
        },

        handleWithdrawRequest(form) {
            const amountInput = form.querySelector('#withdrawAmount');
            
            // جلب دالة التنبيه الموحدة (Toast)
            const showNotification = (typeof TeraMain !== 'undefined' && TeraMain.showToast) 
                                      ? TeraMain.showToast 
                                      : (msg) => alert(msg);

            // التحقق من صحة المبلغ
            if (!amountInput || amountInput.value.trim() === '' || parseFloat(amountInput.value) <= 0) {
                showNotification('❌ يرجى إدخال مبلغ صحيح للسحب أكبر من صفر.', 'error');
                return;
            }

            // تفعيل حالة التحميل للزر
            const submitBtn = form.querySelector('button[type="submit"]');
            let originalText = '';
            
            if (submitBtn) {
                originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-left: 8px;"></i> جاري المعالجة...';
                submitBtn.style.opacity = '0.7';
            }

            // محاكاة الاتصال بالسيرفر (API Call)
            setTimeout(() => {
                showNotification('✅ تم إرسال طلب السحب بنجاح. ستتم المعالجة قريباً.', 'success');
                
                // إعادة ضبط النموذج
                form.reset();
                
                // إعادة الزر لحالته
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.opacity = '1';
                }
            }, 1500);
        }
    };

    // ============================================================
    // تصدير دالة التهيئة للـ Router (app.js)
    // ============================================================
    
    // هذه الدالة سيقوم app.js باستدعائها تلقائياً عند الدخول لصفحات المحفظة
    window.initPortfolio = function() {
        PortfolioManager.init();
    };

    // لتوافقية الأكواد القديمة (إن وجدت في الـ HTML)
    window.requestWithdraw = function(e) {
        if (e) e.preventDefault();
        const form = document.getElementById('withdrawForm');
        if(form) PortfolioManager.handleWithdrawRequest(form);
    };

    window.loadPortfolio = function() {
        PortfolioManager.loadPortfolio();
    };

    // تشغيل مبدئي في حال تم فتح الصفحة بشكل مباشر (خارج الـ SPA)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.location.pathname.includes('portfolio')) {
                PortfolioManager.init();
            }
        });
    } else {
        if (window.location.pathname.includes('portfolio')) {
            PortfolioManager.init();
        }
    }

})();
