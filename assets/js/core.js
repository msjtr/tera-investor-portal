/**
 * ============================================================
 * core.js - الملف الأساسي للدوال المشتركة في منصة تيرا (نسخة الـ SPA)
 * ============================================================
 * الموقع: /assets/js/core.js
 * التحديثات:
 * 1. إزالة تهيئة Supabase المكررة (المنوطة بـ supabase-client.js).
 * 2. الاعتماد على العميل المركزي window.teraSupabase (عند الحاجة فقط).
 * 3. الحفاظ على تحويل جميع الأحداث إلى Event Delegation للصفحات الديناميكية.
 * 4. قفل (Flag) يمنع تكرار تكدس الأحداث في الذاكرة.
 * 5. حفظ حالة القائمة (مفتوحة/مغلقة) في localStorage.
 * 6. تحديث هندسة الأزرار باستخدام preventDefault و return لرفع كفاءة المعالجة.
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. دوال التحكم في القائمة الجانبية (Sidebar)
    // ============================================================

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (window.innerWidth > 991) {
                // سطح المكتب: طي / توسعة
                sidebar.classList.toggle('collapsed');
                setLocalStorageItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
            } else {
                // الموبايل: فتح / إغلاق
                sidebar.classList.toggle('sidebar-open');
            }
        }
    }

    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('sidebar-open')) {
            sidebar.classList.remove('sidebar-open');
        }
    }

    function restoreSidebarState() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth > 991) {
            const isCollapsed = getLocalStorageItem('sidebarCollapsed', 'false') === 'true';
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
        }
    }

    // ============================================================
    // 2. دوال مساعدة عامة (DOM Manipulation & Storage)
    // ============================================================

    function getLocalStorageItem(key, defaultValue) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (e) {
            console.warn('⚠️ [core.js] خطأ في قراءة localStorage:', e);
            return defaultValue;
        }
    }

    function setLocalStorageItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn('⚠️ [core.js] خطأ في كتابة localStorage:', e);
            return false;
        }
    }

    // ============================================================
    // 3. تهيئة الأحداث الشاملة (Event Delegation)
    // ============================================================

    function initCore() {
        // حماية هامة جداً للـ SPA: منع تكرار تهيئة الأحداث عند التنقل بين الصفحات
        if (window._coreEventsInitialized) {
            console.log('⚡ [core.js] الأحداث مهيأة مسبقاً، لا حاجة للتكرار.');
            return;
        }
        window._coreEventsInitialized = true;

        // تفويض حدث النقر على مستوى الـ Body ليعمل مع أي عناصر يتم جلبها بـ fetch
        document.body.addEventListener('click', function(e) {
            
            // 1. زر تبديل القائمة الجانبية
            const toggleBtn = e.target.closest('#sidebarToggle');
            if (toggleBtn) {
                e.preventDefault();
                toggleSidebar();
                return;
            }

            // 2. النقر على القوائم الفرعية
            const submenuLink = e.target.closest('.has-submenu > a');
            if (submenuLink) {
                e.preventDefault();
                const parentLi = submenuLink.parentElement;
                const sidebarEl = document.getElementById('sidebar');

                // منع فتح القائمة الفرعية إذا كانت القائمة الرئيسية مطوية (سطح مكتب)
                if (window.innerWidth > 991 && sidebarEl && sidebarEl.classList.contains('collapsed')) {
                    // تنبيه اختياري
                    if (window.TeraApp && typeof window.TeraApp.showNotification === 'function') {
                        window.TeraApp.showNotification('يرجى فتح القائمة الجانبية أولاً لعرض الخيارات', 'info');
                    } else {
                        alert('يرجى فتح القائمة الجانبية أولاً لعرض الخيارات');
                    }
                    return;
                }

                // إغلاق القوائم الفرعية المفتوحة الأخرى
                document.querySelectorAll('.has-submenu').forEach(function(li) {
                    if (li !== parentLi) {
                        li.classList.remove('submenu-open');
                    }
                });

                // التبديل للقائمة الحالية
                parentLi.classList.toggle('submenu-open');
            }

            // 3. إغلاق القائمة في الموبايل عند النقر خارجها
            if (window.innerWidth <= 991) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('sidebar-open')) {
                    const isInsideSidebar = e.target.closest('#sidebar');
                    const isToggleBtn = e.target.closest('#sidebarToggle');
                    if (!isInsideSidebar && !isToggleBtn) {
                        closeSidebar();
                    }
                }
            }
        });

        // 4. معالجة تغيير حجم الشاشة
        window.addEventListener('resize', function() {
            if (window.innerWidth > 991) {
                closeSidebar(); // نزيل كلاس الموبايل
                restoreSidebarState(); // نستعيد حالة الانهيار
            }
        });

        // استعادة الحالة عند التحميل الأول
        restoreSidebarState();

        console.log('✅ [core.js] تم تهيئة الأحداث الشاملة بنظام (Event Delegation) بنجاح');
    }

    // ============================================================
    // 4. تشغيل التهيئة عند تحميل DOM
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCore);
    } else {
        initCore();
    }

    // ============================================================
    // 5. تعريف دوال عامة للاستخدام الخارجي
    // ============================================================

    window.TeraCore = {
        toggleSidebar: toggleSidebar,
        closeSidebar: closeSidebar,
        getLocalStorageItem: getLocalStorageItem,
        setLocalStorageItem: setLocalStorageItem,
        initCore: initCore
    };

})();
