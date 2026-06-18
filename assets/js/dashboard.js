/**
 * بوابة المستثمر - منصة تيرا
 * محرك لوحة التحكم الرئيسية (Dashboard) - نسخة محسنة
 * * ملاحظة: تم إزالة دوال التحقق من الجلسة وتسجيل الخروج من هنا،
 * لأن ملف (core.js) و (app.js) يقومان بهذه المهمة مركزياً وبشكل آمن لجميع الصفحات.
 */
'use strict';

const Dashboard = {
    init() {
        console.log('Dashboard Module Initialized');
        this.setupDynamicGreeting();
        this.animateStats();
    },

    setupDynamicGreeting() {
        const hour = new Date().getHours();
        // يفترض وجود عنصر بهذا الكلاس في index.html الخاص بلوحة التحكم
        const subtitleEl = document.querySelector('.greeting-subtitle'); 
        
        if (subtitleEl) {
            let greeting = "أهلاً بك،";
            if (hour >= 5 && hour < 12) {
                greeting = "صباح الخير،";
            } else if (hour >= 12 && hour < 18) {
                greeting = "مساء الخير،";
            } else {
                greeting = "طابت ليلتك،";
            }
            
            // جلب اسم المستخدم من التخزين المحلي إن وجد لجعله أكثر تخصيصاً
            const userData = JSON.parse(localStorage.getItem('tera_user')) || {};
            const nameStr = userData.fullName ? ` ${userData.fullName}` : ' مستثمرنا العزيز';
            
            subtitleEl.textContent = `${greeting}${nameStr}.. إليك ملخص أداء محفظتك الاستثمارية اليوم.`;
        }
    },

    // تأثير حركي لعداد الأرقام في البطاقات الإحصائية (إضافة بصرية لزيادة الفخامة)
    animateStats() {
        const statValues = document.querySelectorAll('.stat-value');
        
        statValues.forEach(stat => {
            // استخراج الرقم فقط وتجاهل النصوص والعملات
            const text = stat.innerText;
            const numberMatch = text.replace(/,/g, '').match(/\d+/);
            
            if (numberMatch) {
                const target = parseInt(numberMatch[0], 10);
                const suffix = text.replace(/[\d,]/g, '').trim(); // الاحتفاظ بالعملة (مثل ر.س)
                
                let current = 0;
                const increment = target / 30; // سرعة العداد
                
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        stat.innerHTML = `${Math.ceil(current).toLocaleString()} <span class="currency">${suffix}</span>`;
                        requestAnimationFrame(updateCounter);
                    } else {
                        stat.innerHTML = `${target.toLocaleString()} <span class="currency">${suffix}</span>`;
                    }
                };
                
                updateCounter();
            }
        });
    }
};

// تشغيل النظام بعد تأخير بسيط لضمان اكتمال حقن مكونات core.js
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(() => {
        Dashboard.init();
    }, 400); 
});
