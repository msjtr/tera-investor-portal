/**
 * ========================================================
 * support.js – الوظائف المشتركة لقسم الدعم
 * ========================================================
 */

(function() {
    'use strict';

    if (window.__supportInitialized) return;
    window.__supportInitialized = true;

    // ===== تهيئة اسم المستخدم =====
    function initUserHeader() {
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (nameEl && window.Auth && window.Auth.getCurrentUser) {
            const user = window.Auth.getCurrentUser();
            if (user && user.user_metadata) {
                const fullName = user.user_metadata.full_name || user.email || 'مستخدم';
                nameEl.textContent = fullName;
                avatarEl.textContent = fullName.charAt(0).toUpperCase();
            }
        }
    }

    // ===== القائمة الجانبية (إن وجدت) =====
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const overlay = document.getElementById('sidebarOverlay');
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                if (window.innerWidth < 992) {
                    sidebar.classList.toggle('sidebar-open');
                    if (overlay) overlay.classList.toggle('active');
                } else {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
            });
        }
        // القوائم الفرعية
        document.querySelectorAll('.has-submenu > a').forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href && href !== '#' && href !== 'javascript:void(0)') return;
                e.preventDefault();
                this.closest('.has-submenu').classList.toggle('submenu-open');
            });
        });
    }

    // ===== زر الخروج =====
    function initLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!confirm('هل أنت متأكد من تسجيل الخروج؟')) return;
                logoutBtn.disabled = true;
                try {
                    if (window.Auth && window.Auth.logout) {
                        await window.Auth.logout();
                    } else {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.replace('/auth/auth/login/login.html');
                    }
                } catch (err) {
                    window.location.replace('/auth/auth/login/login.html');
                }
            });
        }
    }

    // ===== تهيئة عامة =====
    function init() {
        initUserHeader();
        initSidebar();
        initLogout();
        console.log('✅ support.js ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
