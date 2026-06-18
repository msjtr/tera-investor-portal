/**
 * ============================================================
 * core.js - الملف الأساسي للدوال المشتركة في منصة تيرا
 * ============================================================
 * هذا الملف يحتوي على جميع الدوال الأساسية المستخدمة في
 * جميع صفحات المنصة، مثل:
 * - التحكم في القائمة الجانبية (Sidebar)
 * - التحكم في القوائم الفرعية (Submenu)
 * - دوال مساعدة عامة
 * - معالجة أحداث شائعة
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. دوال التحكم في القائمة الجانبية (Sidebar)
    // ============================================================

    /**
     * تبديل حالة القائمة الجانبية (فتح/إغلاق) للشاشات الصغيرة
     */
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('sidebar-open');
        }
    }

    /**
     * إغلاق القائمة الجانبية (في حال كانت مفتوحة)
     */
    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('sidebar-open')) {
            sidebar.classList.remove('sidebar-open');
        }
    }

    // ============================================================
    // 2. دوال التحكم في القوائم الفرعية (Submenu)
    // ============================================================

    /**
     * تبديل حالة القائمة الفرعية (فتح/إغلاق) لعنصر معين
     * @param {HTMLElement} element - العنصر الذي يحتوي على القائمة الفرعية
     */
    function toggleSubmenu(element) {
        const parent = element.closest('.has-submenu');
        if (parent) {
            parent.classList.toggle('submenu-open');
        }
    }

    /**
     * إغلاق جميع القوائم الفرعية المفتوحة
     */
    function closeAllSubmenus() {
        document.querySelectorAll('.has-submenu.submenu-open').forEach(function(item) {
            item.classList.remove('submenu-open');
        });
    }

    // ============================================================
    // 3. دوال البحث والتصفية (للأسئلة الشائعة والقوائم)
    // ============================================================

    /**
     * تصفية عناصر بناءً على نص البحث (تستخدم في صفحة الأسئلة الشائعة مثلاً)
     * @param {string} inputId - معرف حقل الإدخال الذي يحتوي على نص البحث
     * @param {string} itemsSelector - محدد CSS لعناصر التصفية
     * @param {string} textSelector - محدد CSS للنص المراد البحث فيه داخل كل عنصر
     */
    function filterItems(inputId, itemsSelector, textSelector) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const filter = input.value.toLowerCase().trim();
        const items = document.querySelectorAll(itemsSelector);

        if (filter === '') {
            items.forEach(function(item) {
                item.style.display = '';
            });
            return;
        }

        items.forEach(function(item) {
            const textElement = item.querySelector(textSelector);
            const text = textElement ? textElement.textContent.toLowerCase() : '';
            if (text.includes(filter)) {
                item.style.display = '';
                // إذا كان العنصر قابلاً للطي، افتحه تلقائياً عند التطابق
                if (item.classList && !item.classList.contains('open')) {
                    item.classList.add('open');
                }
            } else {
                item.style.display = 'none';
            }
        });
    }

    // ============================================================
    // 4. دوال مساعدة عامة
    // ============================================================

    /**
     * إضافة كلاس إلى عنصر معين
     * @param {HTMLElement} element - العنصر المستهدف
     * @param {string} className - اسم الكلاس المراد إضافته
     */
    function addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    }

    /**
     * إزالة كلاس من عنصر معين
     * @param {HTMLElement} element - العنصر المستهدف
     * @param {string} className - اسم الكلاس المراد إزالته
     */
    function removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    }

    /**
     * تبديل كلاس في عنصر معين
     * @param {HTMLElement} element - العنصر المستهدف
     * @param {string} className - اسم الكلاس المراد تبديله
     */
    function toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    }

    /**
     * البحث عن أقرب عنصر أب يحتوي على كلاس معين
     * @param {HTMLElement} element - العنصر الحالي
     * @param {string} className - اسم الكلاس المراد البحث عنه
     * @returns {HTMLElement|null} - العنصر الأب المطابق أو null
     */
    function findParentByClass(element, className) {
        while (element) {
            if (element.classList && element.classList.contains(className)) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }

    // ============================================================
    // 5. تهيئة الأحداث عند تحميل الصفحة
    // ============================================================

    /**
     * تهيئة جميع الأحداث والتفاعلات في الصفحة
     */
    function init() {
        // 5.1 تفعيل زر تبديل القائمة الجانبية
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleSidebar();
            });
        }

        // 5.2 تفعيل القوائم الفرعية (النقر على الروابط التي تحوي قوائم فرعية)
        document.querySelectorAll('.has-submenu > a').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                toggleSubmenu(this);
            });
        });

        // 5.3 إغلاق القائمة الجانبية عند النقر خارجها (للشاشات الصغيرة)
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

        // 5.4 إغلاق القائمة الجانبية عند تغيير حجم النافذة إلى حجم كبير (لتفادي التداخل)
        window.addEventListener('resize', function() {
            if (window.innerWidth > 991) {
                closeSidebar();
            }
        });

        // 5.5 تفعيل روابط "عرض الكل" (View All) في البطاقات - مجرد مثال
        document.querySelectorAll('.view-all').forEach(function(link) {
            link.addEventListener('click', function(e) {
                // يمكن إضافة تحليلات أو سلوك إضافي هنا
                console.log('تم النقر على عرض الكل: ' + this.getAttribute('href'));
            });
        });

        console.log('✅ core.js: تم تهيئة جميع المكونات الأساسية بنجاح');
    }

    // ============================================================
    // 6. تشغيل التهيئة عند تحميل DOM
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // إذا كان DOM قد تم تحميله بالفعل، نفذ التهيئة مباشرة
        init();
    }

    // ============================================================
    // 7. تعريف دوال عامة يمكن استخدامها في صفحات أخرى (اختياري)
    // ============================================================

    // نُعرّف دوالنا في النطاق العام لتكون متاحة في وحدات التحكم
    // أو في السكريبتات الأخرى (مع الحرص على عدم التعارض)
    window.TeraCore = {
        toggleSidebar: toggleSidebar,
        closeSidebar: closeSidebar,
        toggleSubmenu: toggleSubmenu,
        closeAllSubmenus: closeAllSubmenus,
        filterItems: filterItems,
        addClass: addClass,
        removeClass: removeClass,
        toggleClass: toggleClass,
        findParentByClass: findParentByClass
    };

    console.log('✅ core.js: تم تحميل المكتبة الأساسية (TeraCore) بنجاح');

})();
