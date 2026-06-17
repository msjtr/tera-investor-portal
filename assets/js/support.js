/* ================================================= */
/* TERA SUPPORT MODULE (support.js) */
/* ================================================= */
'use strict';

const Support = {
    init() {
        console.log('Support Module Initialized');
        this.initFAQ();
        this.initTicketForm();
    },

    // إدارة الأسئلة الشائعة (Accordion)
    initFAQ() {
        const faqItems = document.querySelectorAll('.faq-question');
        faqItems.forEach(item => {
            item.addEventListener('click', () => {
                const parent = item.parentElement;
                parent.classList.toggle('active');
                
                // إغلاق العناصر الأخرى عند فتح عنصر جديد (اختياري)
                document.querySelectorAll('.faq-item').forEach(el => {
                    if (el !== parent) el.classList.remove('active');
                });
            });
        });
    },

    // معالجة نموذج إرسال تذكرة دعم جديدة
    initTicketForm() {
        const ticketForm = document.getElementById('ticketForm');
        if (!ticketForm) return;

        ticketForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = {
                subject: document.getElementById('subject').value,
                priority: document.getElementById('priority').value,
                message: document.getElementById('message').value,
                date: new Date().toISOString()
            };

            // هنا يمكنك إضافة كود الربط مع الـ API
            console.log('Sending Ticket:', formData);
            
            alert('تم إرسال تذكرتك بنجاح، سيتم الرد عليك في أقرب وقت.');
            ticketForm.reset();
        });
    }
};

// تهيئة الدعم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    Support.init();
});
