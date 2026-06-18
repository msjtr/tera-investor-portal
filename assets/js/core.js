/**
 * ============================================================
 * core.js - الملف الأساسي للدوال المشتركة في منصة تيرا
 * ============================================================
 * - التحكم في القائمة الجانبية والقوائم الفرعية
 * - دوال مساعدة عامة (DOM Manipulation)
 * - التعامل الآمن مع التخزين المحلي (LocalStorage)
 * - توليد المسارات النسبية (Relative Paths Generator)
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. دوال التحكم في القائمة الجانبية (Sidebar)
    // ============================================================
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        // في هيكلنا الجديد القائمة الجانبية توجد داخل حاوية في الموبايل
        const sidebarContainer = sidebar ? sidebar : document.querySelector('.tera-sidebar');
        if (sidebarContainer) {
            sidebarContainer.classList.toggle('active'); // تم تغيير الكلاس ليتوافق مع css الخاص بنا
        }
    }

    function closeSidebar() {
        const sidebarContainer = document.querySelector('.tera-sidebar');
        if (sidebarContainer && sidebarContainer.classList.contains('active')) {
            sidebarContainer.classList.remove('active');
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

        items.forEach(function(item) {
            const textElement = item.querySelector(textSelector);
            const text = textElement ? textElement.textContent.toLowerCase() : '';
            const isMatch = text.includes(filter);
            
            item.style.display = isMatch ? '' : 'none';
            
            if (isMatch && filter !== '' && item.classList) {
                item.classList.add(openClassToUse);
            } else if (filter === '') {
                item.classList.remove(openClassToUse);
            }
        });
    }

    // ============================================================
    // 4. دوال مساعدة عامة (DOM Helpers)
    // ============================================================
    function addClass(element, className) { if (element) element.classList.add(className); }
    function removeClass(element, className) { if (element) element.classList.remove(className); }
    function toggleClass(element, className) { if (element) element.classList.toggle(className); }
    
    function findParentByClass(element, className) {
        while (element) {
            if (element.classList && element.classList.contains(className)) return element;
            element = element.parentElement;
        }
        return null;
    }

    function getLocalStorageItem(key, defaultValue) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    function setLocalStorageItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    }

    function removeLocalStorageItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    // ============================================================
    // 5. دوال متعلقة بالمصادقة (مختصرة)
    // ============================================================
    function isUserLoggedIn() {
        return !!localStorage.getItem('tera_token');
    }

    function getCurrentUser() {
        try {
            const userData = localStorage.getItem('tera_user');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            return null;
        }
    }

    // ============================================================
    // 6. دوال مساعدة لحساب المسارات النسبية (مُحسنة للسيرفرات)
    // ============================================================
    function getBaseDepth() {
        const path = window.location.pathname;
        
        // حساب العمق بناءً على عدد السلاش (/) في المسار
        // مثلاً: /pages/dashboard/index.html -> يحتاج الرجوع خطوتين ../../
        const pathParts = path.replace(/^\/|\/$/g, '').split('/');
        
        // استثناء مجلد المشروع الرئيسي إذا كان يعمل كمسار فرعي على السيرفر
        let depth = pathParts.length - 1; 
        if (pathParts[0] === 'tera-investor-portal-main') {
            depth -= 1; 
        }
        
        return Math.max(0, depth);
    }

    function getRelativePath(targetPath) {
        let cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
        const depth = getBaseDepth();
        const prefix = '../'.repeat(depth);
        return prefix + cleanPath;
    }

    // ============================================================
    // 7. تهيئة الأحداث
    // ============================================================
    function initCore() {
        // تفعيل زر القائمة الجانبية (Mobile Toggle)
        document.addEventListener('click', function(e) {
            const toggleBtn = e.target.closest('#sidebarToggle, .menu-toggle');
            if (toggleBtn) {
                e.stopPropagation();
                toggleSidebar();
            }
        });

        // تفعيل القوائم الفرعية
        document.addEventListener('click', function(e) {
            const submenuLink = e.target.closest('.has-submenu > a');
            if (submenuLink) {
                e.preventDefault();
                toggleSubmenu(submenuLink);
            }
        });

        // إغلاق القائمة عند النقر خارجها في الموبايل
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 991) {
                const sidebar = document.querySelector('.tera-sidebar');
                const toggleBtn = document.getElementById('sidebarToggle');
                
                if (sidebar && sidebar.classList.contains('active')) {
                    const isClickInside = sidebar.contains(e.target);
                    const isClickOnToggle = toggleBtn && toggleBtn.contains(e.target);
                    
                    if (!isClickInside && !isClickOnToggle) {
                        closeSidebar();
                    }
                }
            }
        });

        // إغلاق القائمة تلقائياً عند تكبير الشاشة
        window.addEventListener('resize', function() {
            if (window.innerWidth > 991) {
                closeSidebar();
            }
        });

        console.log('✅ [core.js] تم تهيئة المكونات بنجاح');
    }

    // ============================================================
    // 8. التشغيل والتصدير
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCore);
    } else {
        initCore();
    }

    window.TeraCore = {
        toggleSidebar, closeSidebar, toggleSubmenu, closeAllSubmenus, filterItems,
        addClass, removeClass, toggleClass, findParentByClass,
        getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem,
        isUserLoggedIn, getCurrentUser,
        getBaseDepth, getRelativePath, initCore
    };

})();
