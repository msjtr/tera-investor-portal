/**
 * ============================================================
 * main.js - الملف الرئيسي لإدارة واجهة المستخدم (النسخة المنظفة للـ SPA)
 * ============================================================
 * الموقع: /assets/js/main.js
 * * تم التحديث:
 * 1. إزالة كود القائمة الجانبية (Sidebar) لمنع التعارض مع core.js.
 * 2. إزالة كود التوجيه (Routing) لمنع التعارض مع app.js.
 * 3. الإبقاء على دالة Toast وتحديث الرابط النشط وزر العودة.
 * 4. تحسينات الأداء ومنع السلوك الافتراضي (PreventDefault) للأزرار.
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. تحديد نوع الصفحة الحالية
    // ============================================================
    function getCurrentPage() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('investments')) return 'investments';
        if (path.includes('portfolio')) return 'portfolio';
        if (path.includes('reports')) return 'reports';
        if (path.includes('profile')) return 'profile';
        if (path.includes('security')) return 'security';
        if (path.includes('support')) return 'support';
        if (path.includes('auth')) return 'auth';
        return 'dashboard';
    }

    // ============================================================
    // 2. دالة Toast (تنبيه لحظي) - موحدة
    // ============================================================
    function showToast(message, type) {
        // الاعتماد على دالة التطبيق الرئيسية إذا كانت موجودة لتوحيد الشكل
        if (typeof TeraApp !== 'undefined' && typeof TeraApp.showNotification === 'function') {
            TeraApp.showNotification(message, type);
            return;
        }

        type = type || 'info';
        const existing = document.querySelector('.custom-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.innerHTML = `
            <div class="toast-content ${type}">
                <span>${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;
        document.body.appendChild(toast);

        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                .custom-toast { position: fixed; bottom: 30px; left: 30px; z-index: 99999; direction: rtl; animation: slideUp 0.4s ease; }
                .toast-content { background: var(--white-color, #fff); padding: 14px 24px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); display: flex; align-items: center; gap: 16px; border-right: 4px solid #028090; color: #1e293b; font-weight: 500; min-width: 200px; }
                .toast-content.info { border-right-color: #0D6EFD; } .toast-content.success { border-right-color: #10b981; } .toast-content.error { border-right-color: #ef4444; }
                .toast-content .toast-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; padding: 0 4px; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `;
            document.head.appendChild(style);
        }

        toast.querySelector('.toast-close').addEventListener('click', function() { toast.remove(); });
        setTimeout(function() { 
            if (toast.parentElement) { 
                toast.style.opacity = '0'; 
                toast.style.transition = 'opacity 0.3s'; 
                setTimeout(function() { if (toast.parentElement) toast.remove(); }, 300); 
            } 
        }, 4000);
    }

    // ============================================================
    // 3. تمييز الرابط النشط في القائمة
    // ============================================================
    function setActiveNavItem() {
        const currentPath = window.location.pathname.toLowerCase();
        const navLinks = document.querySelectorAll('.nav-list a[href]');

        document.querySelectorAll('.nav-item.active').forEach(function(el) { el.classList.remove('active'); });
        document.querySelectorAll('.submenu li.active').forEach(function(el) { el.classList.remove('active'); });

        navLinks.forEach(function(link) {
            const href = link.getAttribute('href').toLowerCase();
            if (!href || href === '#') return;

            const isMatch = href === currentPath || (href !== '/' && currentPath.startsWith(href) && href.length > 1);

            if (isMatch) {
                const parentItem = link.closest('.nav-item');
                if (parentItem) {
                    parentItem.classList.add('active');
                    const parentSub = parentItem.closest('.has-submenu');
                    if (parentSub) {
                        parentSub.classList.add('submenu-open');
                    }
                }
                if (link.closest('.submenu')) {
                    const li = link.closest('li');
                    if (li) li.classList.add('active');
                }
            }
        });
    }

    // ============================================================
    // 4. تهيئة زر العودة إلى لوحة التحكم
    // ============================================================
    function initBackToDashboard() {
        // منع التكرار في الأحداث باستخدام Event Delegation
        if(window._backBtnInitialized) return;
        window._backBtnInitialized = true;

        document.body.addEventListener('click', function(e) {
            const backBtn = e.target.closest('#backToDashboardLink') || e.target.closest('#backToDashboard');
            if (backBtn) {
                e.preventDefault();
                const url = '/pages/dashboard/index.html';
                if (typeof TeraApp !== 'undefined' && typeof TeraApp.navigateTo === 'function') {
                    TeraApp.navigateTo(url);
                } else {
                    window.location.href = url;
                }
            }
        });
    }

    function updateDashboardStyling() {
        const currentPath = window.location.pathname.toLowerCase();
        const isDashboard = currentPath.includes('/dashboard/') || currentPath.endsWith('dashboard/index.html') || currentPath === '/pages/dashboard/index.html' || currentPath === '/dashboard' || currentPath === '/';

        if (isDashboard) {
            document.body.classList.add('page-dashboard');
        } else {
            document.body.classList.remove('page-dashboard');
        }

        const pageTitleEl = document.getElementById('pageTitle');
        if (pageTitleEl) {
            const titleTag = document.querySelector('title');
            if (titleTag) {
                const parts = titleTag.textContent.split('|');
                pageTitleEl.textContent = parts[0].trim();
            }
        }
    }

    // ============================================================
    // 5. تهيئة الإشعارات وتسجيل الخروج (Event Delegation)
    // ============================================================
    function initUiEvents() {
        if(window._uiEventsInitialized) return;
        window._uiEventsInitialized = true;

        document.body.addEventListener('click', function(e) {
            // زر الإشعارات
            const notifIcon = e.target.closest('.notifications');
            if (notifIcon) {
                e.preventDefault(); // منع قفز الصفحة إذا كان الرابط #
                showToast('📬 لديك إشعارات جديدة', 'info');
            }

            // زر تسجيل الخروج
            const logoutBtn = e.target.closest('.logout-btn');
            if (logoutBtn) {
                e.preventDefault();
                if (confirm('🔒 هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
                    showToast('جاري تسجيل الخروج...', 'info');
                    setTimeout(function() {
                        if (typeof TeraAuth !== 'undefined' && typeof TeraAuth.logout === 'function') {
                            TeraAuth.logout();
                        } else if (typeof TeraApp !== 'undefined' && typeof TeraApp.logout === 'function') {
                            TeraApp.logout();
                        } else {
                            localStorage.removeItem('tera_token');
                            localStorage.removeItem('tera_user');
                            window.location.href = '/auth/auth/login/login.html';
                        }
                    }, 600);
                }
            }
        });
    }

    // ============================================================
    // 6. التهيئة الرئيسية
    // ============================================================
    function initMain() {
        console.log('🚀 [Main] بدء تهيئة واجهة المستخدم (UI)...');
        
        initBackToDashboard();
        initUiEvents();
        updateDashboardStyling();
        setActiveNavItem();

        console.log('✅ [Main] تم الانتهاء من تهيئة واجهة المستخدم');
    }

    // ============================================================
    // 7. الاستماع لتغيير الصفحة (مهم للـ SPA)
    // ============================================================
    function handlePageChange() {
        updateDashboardStyling();
        setActiveNavItem();
    }

    // ربط تغيير الصفحة بأحداث المتصفح
    window.addEventListener('popstate', handlePageChange);

    // ربط تحديث الواجهة مع دالة loadPage في app.js
    // نستخدم setInterval بسيط للتأكد من تحميل TeraApp
    const checkAppInterval = setInterval(function() {
        if (typeof window.TeraApp !== 'undefined' && typeof window.TeraApp.loadPage === 'function') {
            clearInterval(checkAppInterval);
            const originalLoadPage = window.TeraApp.loadPage;
            window.TeraApp.loadPage = function(url) {
                originalLoadPage(url);
                // تأخير بسيط لضمان تحديث الـ DOM
                setTimeout(handlePageChange, 150);
            };
        }
    }, 100);

    // ============================================================
    // 8. بدء التهيئة
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    // ============================================================
    // 9. تصدير الدوال العامة
    // ============================================================
    window.TeraMain = {
        initMain: initMain,
        getCurrentPage: getCurrentPage,
        refreshUI: handlePageChange,
        showToast: showToast,
        setActiveNavItem: setActiveNavItem
    };

    console.log('✅ [Main] تم تحميل المكتبة المساعدة للواجهة بنجاح');

})();
