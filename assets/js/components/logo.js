/* ============================================================
   TERA INVESTOR PORTAL - LOGO COMPONENT LOGIC
   ============================================================ */

const LogoComponent = {
    init: function() {
        this.protectBrand();
        this.handleImageFallbacks();
    },

    /**
     * منع سحب الشعار أو نسخه للحفاظ على نقاء العلامة التجارية وحمايتها
     * من التشويه أو الاستخدام العشوائي
     */
    protectBrand: function() {
        const logos = document.querySelectorAll('.logo-img, .page-logo');
        
        logos.forEach(logo => {
            // منع المستخدم من سحب الشعار (Drag)
            logo.addEventListener('dragstart', (e) => {
                e.preventDefault();
            });

            // إزالة أي تحديد (Selection) قد يقع على الشعار بالخطأ
            logo.addEventListener('selectstart', (e) => {
                e.preventDefault();
            });
        });
    },

    /**
     * معالجة ذكية للأخطاء: 
     * في حال فشل تحميل الصورة الأصلية (بسبب مشكلة في الخادم أو الشبكة)،
     * يتم استبدالها بنص يعكس الهوية البصرية بدلاً من ظهور "أيقونة مكسورة".
     */
    handleImageFallbacks: function() {
        const logos = document.querySelectorAll('.logo-img, .page-logo');
        
        logos.forEach(logo => {
            logo.addEventListener('error', function() {
                console.warn('⚠️ فشل تحميل صورة الشعار الأساسية. جاري تطبيق المظهر البديل.');
                
                // إنشاء حاوية نصية أنيقة كبديل
                const fallbackContainer = document.createElement('div');
                fallbackContainer.className = 'logo-fallback no-print';
                
                // تطبيق التنسيقات باستخدام ألوان وخطوط النظام المعتمدة
                fallbackContainer.style.color = '#072B72'; // Primary Color
                fallbackContainer.style.fontFamily = "'Cairo', sans-serif";
                fallbackContainer.style.fontWeight = '900';
                fallbackContainer.style.fontSize = '24px';
                fallbackContainer.style.letterSpacing = '1px';
                fallbackContainer.style.display = 'flex';
                fallbackContainer.style.alignItems = 'center';
                fallbackContainer.innerText = 'TERA';

                // استبدال الصورة (أو حاوية picture بالكامل) بالنص البديل
                if (this.parentNode && this.parentNode.tagName === 'PICTURE') {
                    this.parentNode.replaceWith(fallbackContainer);
                } else {
                    this.replaceWith(fallbackContainer);
                }
            });
        });
    }
};

// تهيئة المكون عند اكتمال بناء شجرة عناصر الـ DOM
document.addEventListener('DOMContentLoaded', () => {
    LogoComponent.init();
});
