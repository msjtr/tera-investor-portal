/**
 * ============================================================
 * investments.js - إدارة صفحات الاستثمارات وتغذية البيانات المركزية
 * ============================================================
 * تم التحديث لدمج قاعدة البيانات المركزية (mockData) والدوال المشتركة
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
    // 0. الدوال المشتركة وقاعدة البيانات (متاحة لجميع الصفحات)
    // ============================================================
    
    window.getDynamicDate = function(daysOffset) {
        let d = new Date(); d.setDate(d.getDate() + daysOffset);
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    };

    window.generateOpportunityId = function(type, dateStr, sequence) {
        const parts = dateStr.split('/');
        const yyyy = parts[2] || parts[0]; const mm = parts[1].padStart(2, '0'); const dd = parts[0].padStart(2, '0'); const seq = String(sequence).padStart(3, '0');
        return (type === 'شراكة ممتدة' ? 'TR' : 'FTR') + `-${yyyy}-${mm}-${dd}-${seq}`;
    };

    window.formatMoney = function(num) { 
        return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
    };

    window.getBadgeClass = function(status) {
        switch(status) {
            case 'القادمة': return 'status-upcoming'; 
            case 'قائم': case 'النشطة': return 'status-active';
            case 'المكتملة': return 'status-completed';
            case 'المنتهية': return 'status-expired';
            case 'المغلقة': return 'status-closed';
            case 'الملغاة': return 'status-cancelled';
            default: return 'status-active';
        }
    };

    window.getTypeBadgeClass = function(type) { 
        return type === 'شراكة ممتدة' ? 'type-extended' : 'type-opportunity'; 
    };

    // 🌟 توحيد قاعدة البيانات (12 فرصة استثمارية مطابقة تماماً لصفحات HTML) لتكون المصدر المركزي
    window.mockData = [
        // 6 فرص (شراكة ممتدة)
        { id: "TR-2026-06-20-001", type: "شراكة ممتدة", status: "النشطة", fundedPercentage: 10, reqEntity: "افراد", company: "تمويل أفراد - شراء احتياجات", sharesCount: 100, sharePrice: 100, capital: 10000, expectedProfit: 5000, roi: 50, duration: 6, offeringPeriod: "01/06/2026 - 15/06/2026", reqDate: "2026/05/20" },
        { id: "TR-2026-06-20-002", type: "شراكة ممتدة", status: "قائم", fundedPercentage: 85, reqEntity: "افراد", company: "تمويل أفراد - زواج", sharesCount: 50, sharePrice: 500, capital: 25000, expectedProfit: 10000, roi: 40, duration: 6, offeringPeriod: "05/06/2026 - 20/06/2026", reqDate: "2026/05/25" },
        { id: "TR-2026-06-20-003", type: "شراكة ممتدة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 4, reqEntity: "افراد", company: "تمويل أفراد - ترميم منزل", sharesCount: 80, sharePrice: 200, capital: 16000, expectedProfit: 4800, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/05" },
        { id: "TR-2026-06-20-004", type: "شراكة ممتدة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - سيارة", sharesCount: 40, sharePrice: 1000, capital: 40000, expectedProfit: 8000, roi: 20, duration: 6, offeringPeriod: "15/04/2026 - 30/04/2026", reqDate: "2026/04/01" },
        { id: "TR-2026-06-20-005", type: "شراكة ممتدة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - شخصي", sharesCount: 100, sharePrice: 50, capital: 5000, expectedProfit: 2000, roi: 40, duration: 6, offeringPeriod: "10/03/2026 - 25/03/2026", reqDate: "2026/02/20" },
        { id: "TR-2026-06-20-006", type: "شراكة ممتدة", status: "المغلقة", fundedPercentage: 100, reqEntity: "افراد", company: "تمويل أفراد - طبي", sharesCount: 20, sharePrice: 500, capital: 10000, expectedProfit: 4000, roi: 40, duration: 6, offeringPeriod: "05/02/2026 - 20/02/2026", reqDate: "2026/01/15" },
        
        // 6 فرص (فرصة شراكة)
        { id: "FTR-2026-06-20-007", type: "فرصة شراكة", status: "النشطة", fundedPercentage: 20, reqEntity: "افراد", company: "فرصة شراكة - تأثيث منزل", sharesCount: 50, sharePrice: 1000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "02/06/2026 - 17/06/2026", reqDate: "2026/05/22" },
        { id: "FTR-2026-06-20-008", type: "فرصة شراكة", status: "قائم", fundedPercentage: 95, daysLeftToJoin: 1, reqEntity: "افراد", company: "فرصة شراكة - سفر وسياحة", sharesCount: 20, sharePrice: 2000, capital: 40000, expectedProfit: 16000, roi: 40, duration: 6, offeringPeriod: "08/06/2026 - 23/06/2026", reqDate: "2026/05/28" },
        { id: "FTR-2026-06-20-009", type: "فرصة شراكة", status: "القادمة", fundedPercentage: 0, daysLeftToStart: 2, reqEntity: "افراد", company: "فرصة شراكة - استثمار مبدئي", sharesCount: 100, sharePrice: 200, capital: 20000, expectedProfit: 6000, roi: 30, duration: 6, offeringPeriod: "25/06/2026 - 10/07/2026", reqDate: "2026/06/15" },
        { id: "FTR-2026-06-20-010", type: "فرصة شراكة", status: "المكتملة", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - عقار سكني", sharesCount: 10, sharePrice: 5000, capital: 50000, expectedProfit: 25000, roi: 50, duration: 6, offeringPeriod: "10/04/2026 - 25/04/2026", reqDate: "2026/03/25" },
        { id: "FTR-2026-06-20-011", type: "فرصة شراكة", status: "المنتهية", fundedPercentage: 100, reqEntity: "افراد", company: "فرصة شراكة - تجارة إلكترونية", sharesCount: 20, sharePrice: 600, capital: 12000, expectedProfit: 4800, roi: 40, duration: 6, offeringPeriod: "05/03/2026 - 20/03/2026", reqDate: "2026/02/18" },
        { id: "FTR-2026-06-20-012", type: "فرصة شراكة", status: "الملغاة", fundedPercentage: 0, reqEntity: "افراد", company: "فرصة شراكة - تطبيق ذكي", sharesCount: 40, sharePrice: 1500, capital: 60000, expectedProfit: 30000, roi: 50, duration: 6, offeringPeriod: "14/06/2026 - 29/06/2026", reqDate: "2026/06/01" }
    ];

    // ============================================================
    // 1. تهيئة الصفحات حسب النوع 
    // ============================================================

    function initExtendedInvestments() {
        console.log('📊 [Investments] تهيئة صفحة الشراكة الممتدة');
        
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
        
        // إصلاح: السماح للروابط (<a>) بالعمل بشكل طبيعي دون مقاطعتها بالتنبيهات إذا كانت توجه لصفحة أخرى
        document.querySelectorAll('.opportunity-card .btn-primary').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                if(this.tagName.toLowerCase() !== 'a') {
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
                }
            });
        });

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

        document.querySelectorAll('.filter-group select, .filter-group input').forEach(function(element) {
            element.addEventListener('change', function() {
                console.log('🔍 [Investments] تغيير الفلتر:', this.value);
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
        
        document.querySelectorAll('.payment-method').forEach(function(method) {
            method.addEventListener('click', function() {
                document.querySelectorAll('.payment-method').forEach(function(m) {
                    m.classList.remove('selected');
                });
                this.classList.add('selected');
            });
        });

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
        // إصلاح: التوجيه الصحيح للصفحة مع تمرير الـ ID
        document.querySelectorAll('.table-actions .btn-sm-primary').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                // إذا كان الزر عبارة عن رابط href، دعه يعمل بشكل طبيعي
                if (this.tagName.toLowerCase() === 'a' && this.getAttribute('href') && this.getAttribute('href') !== '#') {
                    return;
                }
                
                e.preventDefault();
                const row = this.closest('tr');
                if (row) {
                    const idCell = row.querySelector('td:first-child')?.textContent;
                    const id = idCell ? idCell.trim() : '';
                    
                    console.log('📄 [Investments] عرض تفاصيل:', id);
                    
                    // التوجيه لصفحة التفاصيل بالاسم المعتمد لديك مع تمرير الـ ID
                    if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
                        TeraApp.navigateTo(`completed-investments.html?id=${id}`);
                    } else {
                        window.location.href = `completed-investments.html?id=${id}`;
                    }
                }
            });
        });

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
        
        const isInvestmentsPage = document.querySelector('.opportunity-card, .schedule-table, .investments-table-wrapper, .filter-section, .grid-view-container, .tera-table');
        if (!isInvestmentsPage) {
            console.log('ℹ️ [Investments] هذه ليست صفحة استثمارات، تخطي التهيئة');
            return;
        }

        console.log('📊 [Investments] تهيئة صفحة الاستثمارات');

        // مطابقة مسارات الصفحات حسب التسميات المخصصة للمشروع
        if (path.includes('investment-details')) {
            // صفحة سوق الفرص
            initOpportunities();
        } else if (path.includes('completed-investments')) {
            // صفحة تفاصيل الفرصة
            initInvestmentDetails();
        } else if (path.includes('cancelled-investments')) {
            // صفحة طلب الانضمام
            initCancelledInvestments();
        } else if (path.includes('extended-investments') || path.includes('extended')) {
            initExtendedInvestments();
        } else if (path.includes('active-investments') || path.includes('active')) {
            initActiveInvestments();
        } else {
            initTableActions();
        }

        console.log('✅ [Investments] تم الانتهاء من التهيئة');
    }

    // ============================================================
    // 4. التصدير والتهيئة
    // ============================================================

    window.initInvestments = initInvestments;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInvestments);
    } else {
        setTimeout(initInvestments, 50);
    }

    console.log('✅ [Investments] تم تحميل investments.js (مع البيانات المركزية المحدثة) بنجاح');

})();
