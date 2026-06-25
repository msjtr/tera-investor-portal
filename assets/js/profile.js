/**
 * ============================================================
 * profile.js - الملف الرئيسي لإدارة صفحات الملف الشخصي
 * يشغل 5 صفحات:个人信息، الاتصال، العنوان، البنكي، المرفقات
 * ============================================================
 * الموقع: /assets/js/profile.js
 * تاريخ التحديث: 2026-06-25
 * ============================================================
 * الصفحات المدعومة:
 *   1. personal-information.html   - المعلومات الشخصية
 *   2. contact-information.html    - معلومات الاتصال
 *   3. national-address.html       - العنوان الوطني
 *   4. bank-information.html       - المعلومات البنكية
 *   5. attachments.html            - المرفقات والوثائق
 * ============================================================
 * الهيكل:
 *   - هذا الملف هو النواة الرئيسية (Core)
 *   - يقوم بتحميل وتهيئة الملفات الفرعية لكل صفحة
 *   - يحتوي على الدوال المشتركة (القائمة الجانبية، تسجيل الخروج، إلخ)
 *   - كل صفحة لها ملف أوامر مستقل:
 *     profile-personal-information.js
 *     profile-contact-information.js
 *     profile-national-address.js
 *     profile-bank-information.js
 *     profile-attachments.js
 * ============================================================
 */

const Profile = {
    /**
     * تهيئة الملف الشخصي بالكامل
     */
    init: function() {
        console.log('🚀 Initializing Profile Pages...');

        // تهيئة المكونات المشتركة بين جميع الصفحات
        this.initSidebar();
        this.initSubmenus();
        this.initLogout();
        this.initActiveNav();

        // تحميل وتهيئة الملف الفرعي المناسب للصفحة الحالية
        this.loadPageScript();

        console.log('✅ Profile pages initialized successfully.');
    },

    /**
     * تحميل الملف الفرعي المناسب للصفحة الحالية
     */
    loadPageScript: function() {
        const currentPage = this.getCurrentPage();
        console.log(`📄 Current page: ${currentPage}`);

        // محاولة استدعاء دالة التهيئة من الملف الفرعي (إن وجدت)
        // الملفات الفرعية تقوم بتسجيل دوالها في النطاق العالمي أو في كائن ProfilePages
        if (typeof ProfilePages !== 'undefined' && ProfilePages[currentPage]) {
            try {
                ProfilePages[currentPage].init();
                console.log(`✅ ${currentPage} initialized from external file.`);
                return;
            } catch (e) {
                console.warn(`⚠️ Error initializing ${currentPage}:`, e);
            }
        }

        // إذا لم يتم تحميل الملف الفرعي، نقدم تهيئة أساسية
        console.warn(`⚠️ External script for ${currentPage} not loaded. Using fallback.`);
        this.initFallback(currentPage);
    },

    /**
     * تحديد الصفحة الحالية بناءً على مسار URL
     */
    getCurrentPage: function() {
        const path = window.location.pathname;
        if (path.includes('personal-information')) return 'personal-information';
        if (path.includes('contact-information')) return 'contact-information';
        if (path.includes('national-address')) return 'national-address';
        if (path.includes('bank-information')) return 'bank-information';
        if (path.includes('attachments')) return 'attachments';
        return 'unknown';
    },

    /**
     * تهيئة احتياطية (في حال عدم تحميل الملف الفرعي)
     */
    initFallback: function(page) {
        console.log(`🔄 Using fallback initialization for ${page}`);
        // تنبيه المستخدم بأن بعض الوظائف قد لا تعمل
        if (document.querySelector('.panel-card')) {
            // محاولة تفعيل الوظائف الأساسية
            this.initUploadZones();
        }
    },

    /**
     * تفعيل مناطق رفع الملفات (دالة مساعدة مشتركة)
     */
    initUploadZones: function() {
        document.querySelectorAll('.upload-zone').forEach(function(zone) {
            const fileInput = zone.querySelector('input[type="file"]');
            if (fileInput) {
                zone.addEventListener('click', function(e) {
                    e.stopPropagation();
                    fileInput.click();
                });
                fileInput.addEventListener('change', function(e) {
                    e.stopPropagation();
                    if (this.files && this.files.length > 0) {
                        const fileName = this.files[0].name;
                        const span = zone.querySelector('span:first-of-type');
                        if (span) {
                            span.textContent = fileName.length > 25 ? fileName.slice(0, 22) + '…' : fileName;
                            span.style.color = '#028090';
                        }
                    }
                });
            }
        });
    },

    // ============================================================
    // 1. تهيئة القائمة الجانبية (مشتركة)
    // ============================================================
    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 991;

        if (!sidebar) {
            console.error('❌ Error: Element with ID "sidebar" NOT FOUND.');
            return;
        }

        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                } else {
                    const isOpen = sidebar.classList.contains('sidebar-open');
                    if (isOpen) {
                        sidebar.classList.remove('sidebar-open');
                        if (overlay) overlay.classList.remove('active');
                    } else {
                        sidebar.classList.add('sidebar-open');
                        if (overlay) overlay.classList.add('active');
                    }
                }
            });
        }

        const closeBtn = document.getElementById('closeSidebarBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('sidebar-open')) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });

        const logo = document.querySelector('.header-logo a');
        if (logo) {
            logo.addEventListener('dblclick', function(e) {
                if (!isMobile()) {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }

        window.addEventListener('resize', function() {
            if (!isMobile() && sidebar) {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
            }
        });
    },

    // ============================================================
    // 2. إدارة القوائم الفرعية (مشتركة)
    // ============================================================
    initSubmenus: function() {
        const submenuToggles = document.querySelectorAll('.has-submenu > a');
        if (!submenuToggles.length) return;

        const handleSubmenuClick = function(e) {
            const href = this.getAttribute('href');
            const parentLi = this.closest('.has-submenu');

            if (href && href !== '#' && href !== 'javascript:void(0)' && href !== 'javascript:;') {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (!parentLi) return;

            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('collapsed') && window.innerWidth > 991) {
                sidebar.classList.remove('collapsed');
            }

            document.querySelectorAll('.has-submenu').forEach(function(el) {
                if (el !== parentLi) el.classList.remove('submenu-open');
            });

            parentLi.classList.toggle('submenu-open');
        };

        submenuToggles.forEach(function(link) {
            link.removeEventListener('click', handleSubmenuClick);
            link.addEventListener('click', handleSubmenuClick);
        });
    },

    // ============================================================
    // 3. تفعيل الحالة النشطة للقائمة (مشتركة)
    // ============================================================
    initActiveNav: function() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-item > a[href]');

        navLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            if (href === currentPath || (href !== '#' && href !== 'javascript:void(0)' && currentPath.includes(href))) {
                const parent = link.closest('.nav-item');
                if (parent) {
                    parent.classList.add('active');
                    if (parent.classList.contains('has-submenu')) {
                        parent.classList.add('submenu-open');
                    }
                }
            }
        });
    },

    // ============================================================
    // 4. تسجيل الخروج (مشترك)
    // ============================================================
    initLogout: function() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', function() {
            if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(';').forEach(function(c) {
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                });
                window.location.replace('https://tera-investor-portal.onrender.com');
            }
        });
    }
};

// ============================================================
// تشغيل عند تحميل الصفحة
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    Profile.init();
});

// تصدير للاستخدام في بيئات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Profile;
}
