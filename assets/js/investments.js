(function() {
    'use strict';
    
    // تأكد من تشغيل التهيئة مرة واحدة فقط عند التنقل
    window.initInvestments = function() {
        const path = window.location.pathname.toLowerCase();
        console.log('🔄 [Investments] تشغيل التهيئة للصفحة:', path);
        
        if (path.includes('investment-details')) {
            initOpportunities();
        } else if (path.includes('completed-investments')) {
            initInvestmentDetails();
        } else if (path.includes('cancelled-investments')) {
            initCancelledInvestments();
        }
    };

    // بدلاً من المراقبة المستمرة المزعجة، نستخدم تشغيل ذكي عند تحميل الـ DOM
    document.addEventListener('DOMContentLoaded', window.initInvestments);
    
    // (إزالة الـ MutationObserver نهائياً لمنع التجميد)
    
    // [ضع هنا باقي الدوال: mockData, initOpportunities, initInvestmentDetails, إلخ...]
    // ملاحظة: تأكد من أن الدوال initOpportunities, initInvestmentDetails, initCancelledInvestments 
    // موجودة في هذا الملف كما أرسلتها لك سابقاً.
})();
