/**
 * ==========================================================================
 * TERA Investor Portal - Core Utilities (core.js)
 * ==========================================================================
 */

const TeraCore = {
    // 1. الإعدادات العامة
    config: {
        apiUrl: 'https://api.tera-invest.com/v1', // رابط الـ API الافتراضي (مثال)
        language: 'ar',
        currency: 'SAR'
    },

    // 2. تنسيق المبالغ المالية (مثال: 1,500,000.00 ر.س)
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: this.config.currency,
            minimumFractionDigits: 2
        }).format(amount);
    },

    // 3. تنسيق التواريخ
    formatDate: function(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },

    // 4. نظام التنبيهات المنبثقة (Toast Alerts)
    showAlert: function(message, type = 'info') {
        // إنشاء عنصر التنبيه
        const alertBox = document.createElement('div');
        alertBox.className = `alert-msg alert-${type} toast-animation`;
        alertBox.style.position = 'fixed';
        alertBox.style.top = '20px';
        alertBox.style.left = '20px'; // في الزاوية العلوية اليسرى (لأن الاتجاه RTL)
        alertBox.style.zIndex = '9999';
        alertBox.style.minWidth = '250px';
        alertBox.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        
        alertBox.innerHTML = `<span>${message}</span>`;
        
        document.body.appendChild(alertBox);

        // إخفاء التنبيه بعد 3 ثوانٍ
        setTimeout(() => {
            alertBox.style.opacity = '0';
            setTimeout(() => alertBox.remove(), 300); // الانتظار حتى تنتهي حركة الاختفاء
        }, 3000);
    },

    // 5. التحقق من صحة المدخلات العامة (Validation Helpers)
    isValidEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    isValidPassword: function(password) {
        // على الأقل 8 أحرف، حرف كبير، حرف صغير، رقم، ورمز خاص
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        return re.test(password);
    }
};
