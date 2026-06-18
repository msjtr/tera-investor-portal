/* ================================================= */
/* TERA SUPPORT MODULE (support.js) */
/* ================================================= */
'use strict';

const SupportManager = {
    init() {
        console.log('Support Module Initialized');
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM() {
        // نموذج إرسال التذاكر
        this.ticketForm = document.getElementById('ticketForm');
    },

    bindEvents() {
        // 1. إدارة الأسئلة الشائعة (FAQ Accordion) باستخدام Event Delegation
        document.addEventListener('click', (e) => {
            const faqHeader = e.target.closest('.faq-trigger-header');
            
            if (faqHeader) {
                const parentItem = faqHeader.closest('.faq-accordion-item');
                const content = parentItem.querySelector('.faq-panel-content');
                const icon = faqHeader.querySelector('i'); // لتدوير أيقونة السهم إن وجدت

                // إغلاق جميع العناصر الأخرى المفتوحة (تصميم الأكورديون)
                document.querySelectorAll('.faq-accordion-item').forEach(item => {
                    if (item !== parentItem) {
                        item.classList.remove('active');
                        const otherContent = item.querySelector('.faq-panel-content');
                        const otherIcon = item.querySelector('.faq-trigger-header i');
                        
                        if (otherContent) otherContent.style.display = 'none';
                        if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                    }
                });

                // تبديل حالة العنصر الحالي (فتح / إغلاق)
                const isActive = parentItem.classList.contains('active');
                
                if (isActive) {
                    parentItem.classList.remove('active');
                    if (content) content.style.display = 'none';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    parentItem.classList.add('active');
                    if (content) content.style.display = 'block';
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            }
        });

        // 2. معالجة نموذج إرسال التذاكر
        if (this.ticketForm) {
            this.ticketForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTicketSubmit();
            });
        }
    },

    handleTicketSubmit() {
        // التحقق المبدئي من الحقول
        const subject = document.getElementById('subject');
        const message = document.getElementById('message');

        if ((subject && subject.value.trim() === '') || (message && message.value.trim() === '')) {
            alert('يرجى تعبئة جميع الحقول المطلوبة (عنوان ومحتوى التذكرة).');
            return;
        }

        // إعداد حالة التحميل للزر
        const submitBtn = this.ticketForm.querySelector('button[type="submit"]');
        let originalText = '';

        if (submitBtn) {
            originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-left: 8px;"></i> جاري الإرسال...';
            submitBtn.style.opacity = '0.7';
        }

        // تجميع البيانات
        const formData = {
            subject: subject ? subject.value : '',
            priority: document.getElementById('priority') ? document.getElementById('priority').value : 'normal',
            message: message ? message.value : '',
            date: new Date().toISOString()
        };

        console.log('Sending Ticket:', formData);

        // محاكاة الاتصال بالخادم (API Call)
        setTimeout(() => {
            alert('تم إرسال تذكرتك بنجاح، سيقوم فريق الدعم الفني بالرد عليك في أقرب وقت.');
            
            // إعادة ضبط النموذج والزر
            this.ticketForm.reset();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                submitBtn.style.opacity = '1';
            }
        }, 1500);
    }
};

/* ================================================= */
/* التهيئة عند تحميل الصفحة */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    SupportManager.init();
});
