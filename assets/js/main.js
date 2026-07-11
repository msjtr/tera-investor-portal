/**
 * main.js – المنسق العام لواجهة المستخدم
 * يعتمد على auth.js, app.js, core.js
 * يعمل في جميع الصفحات التي تحتوي على قائمة جانبية وهيدر
 */
(function() {
    'use strict';

    // ========== التهيئة عند تحميل الصفحة ==========
    async function init() {
        // إذا كانت الصفحة محمية (تحتوي على قائمة جانبية)
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            // استخدام TeraApp لتهيئة الصفحة المحمية
            if (window.TeraApp && window.TeraApp.initProtectedPage) {
                await window.TeraApp.initProtectedPage();
            }
        }

        // روابط العودة للوحة التحكم (في الصفحات الفرعية)
        initBackToDashboardLinks();

        // تحديث التاريخ والوقت الحاليين إن وجدت عناصرهم
        updateDateTime();

        // الأحداث العامة للنقر
        initGlobalClickEvents();

        console.log('✅ [Main] تمت تهيئة الواجهة الرئيسية.');
    }

    // ========== روابط العودة للوحة التحكم ==========
    function initBackToDashboardLinks() {
        document.body.addEventListener('click', function(e) {
            const backBtn = e.target.closest('#backToDashboardLink, #backToDashboard, .btn-back');
            if (backBtn) {
                e.preventDefault();
                window.location.replace('/pages/dashboard/index.html');
            }
        });
    }

    // ========== تحديث التاريخ والوقت ==========
    function updateDateTime() {
        const dateEl = document.getElementById('currentDate');
        const timeEl = document.getElementById('currentTime');
        if (!dateEl && !timeEl) return;

        const update = () => {
            const now = new Date();
            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        };

        update();
        setInterval(update, 30000); // تحديث كل 30 ثانية
    }

    // ========== أحداث عامة ==========
    function initGlobalClickEvents() {
        // أي عنصر له data-action يمكن التعامل معه مركزياً
        document.body.addEventListener('click', function(e) {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;

            const action = actionBtn.getAttribute('data-action');
            switch (action) {
                case 'go-back':
                    e.preventDefault();
                    window.history.back();
                    break;
                case 'refresh-page':
                    e.preventDefault();
                    window.location.reload();
                    break;
                case 'go-to-dashboard':
                    e.preventDefault();
                    window.location.href = '/pages/dashboard/index.html';
                    break;
                default:
                    break;
            }
        });
    }

    // ========== تغيير حالة القائمة الجانبية يدوياً ==========
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('collapsed');
        if (window.innerWidth < 992) {
            sidebar.classList.toggle('sidebar-open');
            const overlay = document.getElementById('sidebarOverlay');
            if (overlay) overlay.classList.toggle('active');
        }
    };

    // ========== بدء التشغيل ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
