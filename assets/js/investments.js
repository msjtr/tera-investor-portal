/* ================================================= */
/* TERA INVESTMENTS MODULE */
/* ================================================= */
'use strict';

const InvestmentsManager = {
    init() {
        console.log('Investments Module Initialized');
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM() {
        this.searchInput = document.getElementById('searchInput');
        // جلب جميع بطاقات الاستثمار الموجودة في الصفحة
        this.opportunityCards = document.querySelectorAll('.opportunity-card');
    },

    bindEvents() {
        // تفعيل البحث اللحظي عند الكتابة
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.filterInvestments(e.target.value);
            });
        }
    },

    // دالة التصفية الفعلية
    filterInvestments(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        this.opportunityCards.forEach(card => {
            const titleElement = card.querySelector('.opp-title');
            if (!titleElement) return;

            const title = titleElement.textContent.toLowerCase();
            
            // إظهار البطاقة إذا كان العنوان يحتوي على نص البحث، وإخفاؤها إن لم يطابق
            if (title.includes(term)) {
                card.style.display = 'flex'; // استخدام flex كما هو معرف في CSS
            } else {
                card.style.display = 'none';
            }
        });
    },

    // دالة الانتقال لتفاصيل الاستثمار
    viewInvestment(id) {
        if (!id) {
            console.error("لم يتم توفير معرف الاستثمار (ID)");
            return;
        }
        window.location.href = `investment-details.html?id=${id}`;
    }
};

/* ================================================= */
/* إتاحة الدوال عالمياً (Global Scope) */
/* لضمان عملها إذا كانت مربوطة عبر onclick في الـ HTML */
/* ================================================= */

window.filterInvestments = function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        InvestmentsManager.filterInvestments(searchInput.value);
    }
};

window.viewInvestment = function(id) {
    InvestmentsManager.viewInvestment(id);
};

/* ================================================= */
/* التهيئة عند تحميل الصفحة */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    InvestmentsManager.init();
});
