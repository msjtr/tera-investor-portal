/**
 * ============================================================
 * investments.js - إدارة صفحات الاستثمارات
 * ============================================================
 * تم التحديث لمنع التحميل المزدوج (Duplicate Declaration)
 * باستخدام IIFE (Immediately Invoked Function Expression)
 * ============================================================
 */

(function() {
    'use strict';

    // ✅ التحقق من عدم تكرار التحميل
    if (window.InvestmentsManagerLoaded) {
        console.log('ℹ️ [Investments] تم تحميل investments.js مسبقاً، تخطي التهيئة');
        return;
    }
    window.InvestmentsManagerLoaded = true;

    // ============================================================
    // 1. تهيئة الصفحات حسب النوع
    // ============================================================

    function initExtendedInvestments() {
        console.log('📊 [Investments] تهيئة صفحة الشراكة الممتدة');
        
        // تفعيل أزرار التصدير
        document.querySelectorAll('.export-actions .btn-export').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                const action = this.textContent.trim();
                if (action.includes('طباعة')) {
                    window.print();
                } else if (action.includes('PDF')) {
                    alert('📄 جاري تصدير التقرير بصيغة PDF...');
                } else if (action.includes('Excel')) {
                    alert('📊 جاري تصدير التقرير بصيغة Excel...');
                }
            });
        });

        // تأثيرات hover على صفوف الجدول
        document.querySelectorAll('.schedule-table tbody tr').forEach(function(row) {
            row.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--gray-50, #fafafa)';
            });
            row.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
            });
        });
    }

    function initOpportunities() {
        console.log('📊 [Investments] تهيئة صفحة فرص الاستثمار');
        
        // تفعيل أزرار "مشاركة الآن"
        document.querySelectorAll('.opportunity-card .btn-primary').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const card = this.closest('.opportunity-card');
                if (card) {
                    const title = card.querySelector('.opp-title')?.textContent || 'الفرصة';
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification(`✅ تم المشاركة في ${title} بنجاح`, 'success', 3000);
                    } else {
                        alert(`✅ تم المشاركة في ${title}`);
                    }
                }
            });
        });

        // تفعيل زر "إضافة للمفضلة"
        document.querySelectorAll('.opportunity-card .btn-outline').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('active');
                if (this.classList.contains('active')) {
                    this.innerHTML = '<i class="fas fa-heart" style="color: #DC3545;"></i>';
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification('❤️ تمت إضافة الفرصة إلى المفضلة', 'info', 2000);
                    }
                } else {
                    this.innerHTML = '<i class="far fa-heart"></i>';
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification('💔 تمت إزالة الفرصة من المفضلة', 'info', 2000);
                    }
                }
            });
        });

        // تفعيل الفلاتر
        document.querySelectorAll('.filter-group select, .filter-group input').forEach(function(element) {
            element.addEventListener('change', function() {
                console.log('🔍 [Investments] تغيير الفلتر:', this.value);
                // يمكن تنفيذ عملية التصفية هنا
            });
        });
    }

    function initActiveInvestments() {
        console.log('📊 [Investments] تهيئة صفحة الاستثمارات النشطة');
        initTableActions();
    }

    function initCompletedInvestments() {
        console.log('📊 [Investments] تهيئة صفحة الاستثمارات المكتملة');
        initTableActions();
    }

    function initCancelledInvestments() {
        console.log('📊 [Investments] تهيئة صفحة الاستثمارات الملغاة');
        initTableActions();
    }

    function initInvestmentDetails() {
        console.log('📊 [Investments] تهيئة صفحة تفاصيل الاستثمار');
        
        // تفعيل طرق الدفع
        document.querySelectorAll('.payment-method').forEach(function(method) {
            method.addEventListener('click', function() {
                document.querySelectorAll('.payment-method').forEach(function(m) {
                    m.classList.remove('selected');
                });
                this.classList.add('selected');
            });
        });

        // تفعيل زر تأكيد المشاركة
        const confirmBtn = document.querySelector('.btn-confirm-investment');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                    TeraApp.showNotification('✅ تم تأكيد المشاركة بنجاح', 'success', 4000);
                } else {
                    alert('✅ تم تأكيد المشاركة');
                }
            });
        }
    }

    // ============================================================
    // 2. دوال مساعدة للجداول
    // ============================================================

    function initTableActions() {
        // تفعيل أزرار التفاصيل في الجداول
        document.querySelectorAll('.table-actions .btn-sm-primary').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const row = this.closest('tr');
                if (row) {
                    const id = row.querySelector('td:first-child')?.textContent || '#';
                    console.log('📄 [Investments] عرض تفاصيل:', id);
                    if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
                        TeraApp.navigateTo('/investments/investment-details');
                    } else {
                        window.location.href = '/pages/investments/investment-details.html';
                    }
                }
            });
        });

        // تفعيل أزرار تحميل التقارير
        document.querySelectorAll('.table-actions .btn-sm-secondary').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                    TeraApp.showNotification('📄 جاري تحميل التقرير...', 'info', 2000);
                } else {
                    alert('📄 جاري تحميل التقرير...');
                }
            });
        });
    }

    // ============================================================
    // 3. تحديد نوع الصفحة وتفعيل التهيئة المناسبة
    // ============================================================

    function initInvestments() {
        const path = window.location.pathname.toLowerCase();
        
        // التحقق من وجود عناصر الصفحة قبل التهيئة
        const isInvestmentsPage = document.querySelector('.opportunity-card, .schedule-table, .investments-table-wrapper, .filter-section');
        if (!isInvestmentsPage) {
            console.log('ℹ️ [Investments] هذه ليست صفحة استثمارات، تخطي التهيئة');
            return;
        }

        console.log('📊 [Investments] تهيئة صفحة الاستثمارات');

        if (path.includes('extended-investments') || path.includes('extended')) {
            initExtendedInvestments();
        } else if (path.includes('opportunities')) {
            initOpportunities();
        } else if (path.includes('active-investments') || path.includes('active')) {
            initActiveInvestments();
        } else if (path.includes('completed-investments') || path.includes('completed')) {
            initCompletedInvestments();
        } else if (path.includes('cancelled-investments') || path.includes('cancelled')) {
            initCancelledInvestments();
        } else if (path.includes('investment-details') || path.includes('details')) {
            initInvestmentDetails();
        } else {
            // تهيئة عامة للصفحات الفرعية الأخرى
            initTableActions();
        }

        console.log('✅ [Investments] تم الانتهاء من التهيئة');
    }

    // ============================================================
    // 4. التصدير والتهيئة
    // ============================================================

    // تصدير الدالة للاستخدام في main.js أو صفحات أخرى
    window.initInvestments = initInvestments;

    // تهيئة تلقائية عند تحميل الصفحة (إذا لم تكن SPA)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInvestments);
    } else {
        // إذا تم تحميل الصفحة بالفعل (SPA أو تحميل ديناميكي)
        setTimeout(initInvestments, 50);
    }

    console.log('✅ [Investments] تم تحميل investments.js بنجاح');

})();
