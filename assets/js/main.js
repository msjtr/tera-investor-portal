/* ==========================================
   TERA Investor Portal
   Main JS Loader (Smart Router)
========================================== */

// 1. ملفات النظام الأساسية والمصادقة (تعمل بشكل دائم في جميع الصفحات)
import './app.js';
import './auth.js';

// 2. الموجه الذكي لحقن الملفات بناءً على المجلد الحالي لمنع تعارض الـ DOM
document.addEventListener('DOMContentLoaded', () => {
    
    const path = window.location.pathname;

    // صفحات لوحة التحكم الرئيسية
    if (path.includes('/pages/dashboard/')) {
        import('./dashboard.js')
            .catch(err => console.error('Error loading dashboard.js:', err));
    }
    
    // صفحات الاستثمارات وفرص التمويل
    else if (path.includes('/pages/investments/')) {
        import('./investments.js')
            .catch(err => console.error('Error loading investments.js:', err));
    }
    
    // صفحات المحفظة، العمليات، وطلبات السحب
    else if (path.includes('/pages/portfolio/')) {
        import('./portfolio.js')
            .catch(err => console.error('Error loading portfolio.js:', err));
    }
    
    // صفحات معلومات وتحديث الملف الشخصي
    else if (path.includes('/pages/profile/')) {
        import('./profile.js')
            .catch(err => console.error('Error loading profile.js:', err));
    }
    
    // صفحات التقارير المالية وكشوفات الحساب
    else if (path.includes('/pages/reports/')) {
        import('./reports.js')
            .catch(err => console.error('Error loading reports.js:', err));
    }
    
    // صفحات الأمان وتغيير كلمات المرور والتوثيق الثنائي
    else if (path.includes('/pages/security/')) {
        import('./security.js')
            .catch(err => console.error('Error loading security.js:', err));
    }
    
    // صفحات الدعم الفني، التذاكر، والشروط والأحكام
    else if (path.includes('/pages/support/')) {
        import('./support.js')
            .catch(err => console.error('Error loading support.js:', err));
    }
    
    // صفحة استعادة كلمة المرور (خارج مجلد الصفحات الداخلية)
    else if (path.includes('/auth/forgot-password.html')) {
        import('./forgot-password.js')
            .catch(err => console.error('Error loading forgot-password.js:', err));
    }

});
