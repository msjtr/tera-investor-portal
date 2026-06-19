/**
 * ============================================================
 * core.js - الملف الأساسي للدوال المشتركة في منصة تيرا
 * ============================================================
 * الموقع: /assets/js/core.js
 * 
 * يحتوي على الدوال الأساسية المستخدمة في جميع الصفحات:
 * - التحكم في القائمة الجانبية (Sidebar)
 * - التحكم في القوائم الفرعية (Submenu)
 * - دوال مساعدة عامة (إضافة/إزالة كلاسات)
 * - معالجة أحداث شائعة
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
            sidebar.classList.toggle('sidebar-open');
        }
    }

    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('sidebar-open')) {
            sidebar.classList.remove('sidebar-open');
        }
    }

    // ============================================================
    // 2. دوال التحكم في القوائم الفرعية (Submenu)
    // ============================================================

    function toggleSubmenu(element) {
        const parent = element.closest('.has-submenu');
        if (parent) {
            parent.classList.toggle('submenu-open');
        }
    }

    function closeAllSubmenus() {
        document.querySelectorAll('.has-submenu.submenu-open').forEach(function(item) {
            item.classList.remove('submenu-open');
        });
    }

    // ============================================================
    // 3. دوال البحث والتصفية
    // ============================================================

    function filterItems(inputId, itemsSelector, textSelector, openClass) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const filter = input.value.toLowerCase().trim();
        const items = document.querySelectorAll(itemsSelector);
        const openClassToUse = openClass || 'open';

        if (filter === '') {
            items.forEach(function(item) {
                item.style.display = '';
            });
            return;
        }

        items.forEach(function(item) {
            const textElement = item.querySelector(textSelector);
            const text = textElement ? textElement.textContent.toLowerCase() : '';
            const isMatch = text.includes(filter);
            item.style.display = isMatch ? '' : 'none';
            if (isMatch && item.classList && !item.classList.contains(openClassToUse)) {
                item.classList.add(openClassToUse);
            }
        });
    }

    // ============================================================
    // 4. دوال مساعدة عامة (DOM Manipulation Helpers)
    // ============================================================

    function addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    }

    function removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    }

    function toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    }

    function findParentByClass(element, className) {
        while (element) {
            if (element.classList && element.classList.contains(className)) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }

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

    function removeLocalStorageItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('⚠️ [core.js] خطأ في حذف localStorage:', e);
            return false;
        }
    }

    // ============================================================
    // 5. دوال متعلقة بالمصادقة (مختصرة للاستخدام العام)
    // ============================================================

    function isUserLoggedIn() {
        return !!localStorage.getItem('tera_token');
    }

    function getCurrentUser() {
        try {
            const userData = localStorage.getItem('tera_user');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            console.warn('⚠️ [core.js] خطأ في قراءة بيانات المستخدم:', e);
            return null;
        }
    }

    // ============================================================
    // 6. تهيئة الأحداث عند تحميل الصفحة
    // ============================================================

    function initCore() {
        // 6.1 تفعيل زر تبديل القائمة الجانبية
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleSidebar();
            });
        }

        // 6.2 تفعيل القوائم الفرعية (النقر على الروابط التي تحوي قوائم فرعية)
        document.querySelectorAll('.has-submenu > a').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                toggleSubmenu(this);
            });
        });

        // 6.3 إغلاق القائمة الجانبية عند النقر خارجها (للشاشات الصغيرة)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 991) {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('sidebarToggle');
                if (sidebar && toggleBtn) {
                    const isClickInsideSidebar = sidebar.contains(e.target);
                    const isClickOnToggle = toggleBtn.contains(e.target);
                    if (!isClickInsideSidebar && !isClickOnToggle) {
                        closeSidebar();
                    }
                }
            }
        });

        // 6.4 إغلاق القائمة الجانبية عند تغيير حجم النافذة إلى حجم كبير (لتفادي التداخل)
        window.addEventListener('resize', function() {
            if (window.innerWidth > 991) {
                closeSidebar();
            }
        });

        // 6.5 تفعيل روابط "عرض الكل" (View All) في البطاقات - مجرد مثال
        document.querySelectorAll('.view-all').forEach(function(link) {
            link.addEventListener('click', function(e) {
                console.log('📊 [core.js] تم النقر على عرض الكل: ' + this.getAttribute('href'));
            });
        });

        console.log('✅ [core.js] تم تهيئة جميع المكونات الأساسية بنجاح');
    }

    // ============================================================
    // 7. تشغيل التهيئة عند تحميل DOM
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCore);
    } else {
        initCore();
    }

    // ============================================================
    // 8. تعريف دوال عامة
    // ============================================================

    window.TeraCore = {
        toggleSidebar: toggleSidebar,
        closeSidebar: closeSidebar,
        toggleSubmenu: toggleSubmenu,
        closeAllSubmenus: closeAllSubmenus,
        filterItems: filterItems,
        addClass: addClass,
        removeClass: removeClass,
        toggleClass: toggleClass,
        findParentByClass: findParentByClass,
        getLocalStorageItem: getLocalStorageItem,
        setLocalStorageItem: setLocalStorageItem,
        removeLocalStorageItem: removeLocalStorageItem,
        isUserLoggedIn: isUserLoggedIn,
        getCurrentUser: getCurrentUser,
        initCore: initCore
    };

    console.log('✅ [core.js] تم تحميل المكتبة الأساسية (TeraCore) بنجاح');

})();
