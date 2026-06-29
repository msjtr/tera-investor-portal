/**
 * ============================================================
 * profile.js - الملف الرئيسي لإدارة صفحات الملف الشخصي (Enterprise)
 * ============================================================
 * الموقع: /assets/js/profile.js
 * - يدير القوائم والمكونات المشتركة لصفحات الملف الشخصي.
 * - يستخدم TeraAuth.logout() لتسجيل الخروج الحقيقي.
 * - متوافق مع الملفات المستقلة لكل صفحة (personal‑information, contact, ...).
 */
(function() {
    'use strict';

    // تعريف الكائن العام للصفحات الفرعية (اختياري)
    window.ProfilePages = window.ProfilePages || {};

    const Profile = {
        init: function() {
            console.log('🚀 تهيئة صفحات الملف الشخصي...');

            this.initSidebar();
            this.initSubmenus();
            this.initLogout();
            this.initActiveNav();
            this.loadPageScript();

            console.log('✅ صفحات الملف الشخصي مهيأة.');
        },

        loadPageScript: function() {
            const currentPage = this.getCurrentPage();
            console.log(`📄 الصفحة الحالية: ${currentPage}`);

            if (window.ProfilePages && typeof window.ProfilePages === 'object') {
                const pageModule = window.ProfilePages[currentPage];
                if (pageModule && typeof pageModule.init === 'function') {
                    try {
                        pageModule.init();
                        console.log(`✅ تم تهيئة ${currentPage} من ملفه الفرعي.`);
                        return;
                    } catch (e) {
                        console.warn(`⚠️ خطأ في تهيئة ${currentPage}:`, e);
                    }
                }
            }

            // إذا لم يوجد ملف فرعي، نقوم بتهيئة احتياطية (رفع الملفات فقط)
            console.warn(`⚠️ لم يتم العثور على ملف منفصل لـ ${currentPage}، تشغيل احتياطي.`);
            this.initUploadZones();
        },

        getCurrentPage: function() {
            const path = window.location.pathname;
            if (path.includes('personal-information')) return 'personal-information';
            if (path.includes('contact-information')) return 'contact-information';
            if (path.includes('national-address')) return 'national-address';
            if (path.includes('bank-information')) return 'bank-information';
            if (path.includes('attachments')) return 'attachments';
            return 'unknown';
        },

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

        // القائمة الجانبية
        initSidebar: function() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            const isMobile = () => window.innerWidth <= 991;

            if (!sidebar) return;

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
                    if (!isMobile()) sidebar.classList.toggle('collapsed');
                });
            }

            window.addEventListener('resize', function() {
                if (!isMobile() && sidebar) {
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                }
            });
        },

        // القوائم الفرعية
        initSubmenus: function() {
            const submenuToggles = document.querySelectorAll('.has-submenu > a');
            if (!submenuToggles.length) return;

            const handleSubmenuClick = function(e) {
                const href = this.getAttribute('href');
                const parentLi = this.closest('.has-submenu');
                if (href && href !== '#' && href !== 'javascript:void(0)' && href !== 'javascript:;') return;
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

        // الحالة النشطة للقائمة
        initActiveNav: function() {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('.nav-item > a[href]');
            if (!navLinks.length) return;

            navLinks.forEach(function(link) {
                const href = link.getAttribute('href');
                if (href === currentPath || (href !== '#' && href !== 'javascript:void(0)' && currentPath.includes(href))) {
                    const parent = link.closest('.nav-item');
                    if (parent) {
                        parent.classList.add('active');
                        if (parent.classList.contains('has-submenu')) parent.classList.add('submenu-open');
                    }
                }
            });
        },

        // تسجيل الخروج الحقيقي
        initLogout: function() {
            const logoutBtn = document.getElementById('logoutBtn');
            if (!logoutBtn) return;

            logoutBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                if (!confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) return;

                console.log('🔴 جاري تسجيل الخروج...');

                try {
                    if (window.TeraAuth && typeof window.TeraAuth.logout === 'function') {
                        await window.TeraAuth.logout();
                    } else {
                        // إجراء احتياطي
                        console.warn('⚠️ TeraAuth غير متوفر، توجيه احتياطي.');
                        localStorage.removeItem('tera_token');
                        localStorage.removeItem('tera_user');
                        sessionStorage.clear();
                        window.location.replace('/auth/auth/login/login.html');
                    }
                } catch (error) {
                    console.error('❌ خطأ أثناء تسجيل الخروج:', error);
                    window.location.replace('/auth/auth/login/login.html');
                }
            });
        }
    };

    // تشغيل عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', function() {
        Profile.init();
    });

    // تصدير للاستخدام الخارجي
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Profile;
    }
})();
