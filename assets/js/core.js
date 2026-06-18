/**
 * ============================================================
 * core.js - الملف الأساسي للدوال المشتركة في منصة تيرا
 * ============================================================
 * هذا الملف يحتوي على جميع الدوال الأساسية المستخدمة في
 * جميع صفحات المنصة، مثل:
 * - التحكم في القائمة الجانبية (Sidebar)
 * - التحكم في القوائم الفرعية (Submenu)
 * - دوال مساعدة عامة (إضافة/إزالة كلاسات)
 * - معالجة أحداث شائعة
 * ============================================================
 * تم تحديثه ليتوافق مع هيكل المشروع الحالي
 * ويستخدم المفاتيح الموحدة (tera_token, tera_user)
 * ولا يعتمد على أي مسارات مطلقة (جميع الدوال تعمل على DOM فقط)
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
     * @param {string} openClass - الكلاس الذي يضاف للعنصر المطابق لفتحه (اختياري)
     */
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
            // فتح العنصر المطابق تلقائياً
            if (isMatch && item.classList && !item.classList.contains(openClassToUse)) {
                item.classList.add(openClassToUse);
            }
        });
    }

    // ============================================================
    // 4. دوال مساعدة عامة (DOM Manipulation Helpers)
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

    /**
     * الحصول على قيمة آمنة من localStorage مع معالجة الأخطاء
     * @param {string} key - المفتاح
     * @param {*} defaultValue - القيمة الافتراضية في حال عدم وجود المفتاح
     * @returns {*} - القيمة المخزنة أو القيمة الافتراضية
     */
    function getLocalStorageItem(key, defaultValue) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (e) {
            console.warn('⚠️ [core.js] خطأ في قراءة localStorage:', e);
            return defaultValue;
        }
    }

    /**
     * تعيين قيمة في localStorage مع معالجة الأخطاء
     * @param {string} key - المفتاح
     * @param {*} value - القيمة المراد تخزينها
     * @returns {boolean} - نجاح العملية
     */
    function setLocalStorageItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn('⚠️ [core.js] خطأ في كتابة localStorage:', e);
            return false;
        }
    }

    /**
     * إزالة عنصر من localStorage مع معالجة الأخطاء
     * @param {string} key - المفتاح
     * @returns {boolean} - نجاح العملية
     */
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

    /**
     * التحقق مما إذا كان المستخدم مسجلاً للدخول
     * @returns {boolean}
     */
    function isUserLoggedIn() {
        return !!localStorage.getItem('tera_token');
    }

    /**
     * الحصول على بيانات المستخدم الحالي (إذا كان مسجلاً)
     * @returns {object|null}
     */
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
    // 6. دوال مساعدة لحساب العمق (للتعامل مع المسارات النسبية)
    // ============================================================

    /**
     * حساب عدد المستويات (العمق) للوصول إلى الجذر من المسار الحالي
     * يمكن استخدامها في ملفات أخرى لتوليد مسارات نسبية
     * @returns {number} عدد المستويات (0 للجذر، 1 لـ /assets/، 2 لـ /pages/، 3 لـ /auth/auth/)
     */
    function getBaseDepth() {
        const path = window.location.pathname;
        
        if (path.includes('/pages/')) return 2;
        if (path.includes('/auth/auth/')) return 3;
        if (path.includes('/auth/')) return 2;
        if (path.includes('/assets/')) return 1;
        if (path.includes('/components/')) return 1;
        if (path.includes('/layouts/')) return 1;
        if (path === '/' || path === '/index.html') return 0;
        
        const parts = path.split('/').filter(p => p.length > 0);
        return parts.length;
    }

    /**
     * إنشاء مسار نسبي من الجذر إلى المسار المطلوب
     * @param {string} targetPath - المسار المطلوب (بدون / في البداية)
     * @returns {string} المسار النسبي مع ../ بالعدد المناسب
     */
    function getRelativePath(targetPath) {
        let cleanPath = targetPath;
        if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.slice(1);
        }
        const depth = getBaseDepth();
        let prefix = '';
        for (let i = 0; i < depth; i++) {
            prefix += '../';
        }
        return prefix + cleanPath;
    }

    // ============================================================
    // 7. تهيئة الأحداث عند تحميل الصفحة
    // ============================================================

    /**
     * تهيئة جميع الأحداث والتفاعلات في الصفحة
     */
    function initCore() {
        // 7.1 تفعيل زر تبديل القائمة الجانبية
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleSidebar();
            });
        }

        // 7.2 تفعيل القوائم الفرعية (النقر على الروابط التي تحوي قوائم فرعية)
        document.querySelectorAll('.has-submenu > a').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                toggleSubmenu(this);
            });
        });

        // 7.3 إغلاق القائمة الجانبية عند النقر خارجها (للشاشات الصغيرة)
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

        // 7.4 إغلاق القائمة الجانبية عند تغيير حجم النافذة إلى حجم كبير (لتفادي التداخل)
        window.addEventListener('resize', function() {
            if (window.innerWidth > 991) {
                closeSidebar();
            }
        });

        // 7.5 تفعيل روابط "عرض الكل" (View All) في البطاقات - مجرد مثال
        document.querySelectorAll('.view-all').forEach(function(link) {
            link.addEventListener('click', function(e) {
                // يمكن إضافة تحليلات أو سلوك إضافي هنا
                console.log('📊 [core.js] تم النقر على عرض الكل: ' + this.getAttribute('href'));
            });
        });

        console.log('✅ [core.js] تم تهيئة جميع المكونات الأساسية بنجاح');
    }

    // ============================================================
    // 8. تشغيل التهيئة عند تحميل DOM
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCore);
    } else {
        // إذا كان DOM قد تم تحميله بالفعل، نفذ التهيئة مباشرة
        initCore();
    }

    // ============================================================
    // 9. تعريف دوال عامة يمكن استخدامها في صفحات أخرى
    // ============================================================

    window.TeraCore = {
        // دوال القائمة
        toggleSidebar: toggleSidebar,
        closeSidebar: closeSidebar,
        toggleSubmenu: toggleSubmenu,
        closeAllSubmenus: closeAllSubmenus,

        // دوال التصفية
        filterItems: filterItems,

        // دوال DOM
        addClass: addClass,
        removeClass: removeClass,
        toggleClass: toggleClass,
        findParentByClass: findParentByClass,

        // دوال التخزين المحلي
        getLocalStorageItem: getLocalStorageItem,
        setLocalStorageItem: setLocalStorageItem,
        removeLocalStorageItem: removeLocalStorageItem,

        // دوال المصادقة (مساعدة)
        isUserLoggedIn: isUserLoggedIn,
        getCurrentUser: getCurrentUser,

        // دوال المسارات النسبية
        getBaseDepth: getBaseDepth,
        getRelativePath: getRelativePath,

        // تهيئة
        initCore: initCore
    };

    console.log('✅ [core.js] تم تحميل المكتبة الأساسية (TeraCore) بنجاح');

})();
