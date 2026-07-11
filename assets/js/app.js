/**
 * app.js – الملف الرئيسي للتطبيق (واجهة المستخدم والتحكم المركزي)
 * يتولى:
 * - فحص الجلسة (Auth.requireAuth) للصفحات المحمية
 * - تهيئة القائمة الجانبية والتنقل
 * - زر تسجيل الخروج الآمن
 * - تتبع النشاط (ActivityTracker) ومؤقت الخمول
 * - تحديث اسم المستخدم والأفاتار
 * - إدارة الوضع المظلم (إن وجد)
 * يمكن تضمينه في أي صفحة تحتاج سلوك التطبيق الكامل.
 */
(function() {
    'use strict';

    // ========== دوال مساعدة ==========
    function getCurrentPage() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('investments')) return 'investments';
        if (path.includes('portfolio')) return 'portfolio';
        if (path.includes('profile')) return 'profile';
        if (path.includes('reports')) return 'reports';
        if (path.includes('security')) return 'security';
        if (path.includes('support')) return 'support';
        return 'dashboard';
    }

    function updateUserUI(user) {
        if (!user) return;
        const name = user.user_metadata?.full_name || user.email || 'مستخدم';
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (nameEl) nameEl.textContent = name;
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    }

    function showToast(message, type) {
        if (typeof window.showSecurityAlert === 'function') {
            window.showSecurityAlert(message, type);
            return;
        }
        console.log(`[App Toast: ${type}] ${message}`);
    }

    // ========== القائمة الجانبية والتنقل ==========
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const closeSidebarBtn = document.getElementById('closeSidebarBtn');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                // في الجوال، نضبط فتح/إغلاق مختلف
                if (window.innerWidth < 992) {
                    sidebar.classList.toggle('sidebar-open');
                    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
                }
            });
        }

        if (closeSidebarBtn && sidebar && sidebarOverlay) {
            closeSidebarBtn.addEventListener('click', () => {
                sidebar.classList.remove('sidebar-open');
                sidebarOverlay.classList.remove('active');
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('sidebar-open');
                sidebarOverlay.classList.remove('active');
            });
        }

        // تعليم القائمة النشطة
        const currentPath = window.location.pathname.toLowerCase();
        document.querySelectorAll('.nav-item').forEach(item => {
            const link = item.querySelector('a');
            if (link) {
                const href = link.getAttribute('href')?.toLowerCase();
                if (href && href !== '#' && currentPath.includes(href)) {
                    item.classList.add('active');
                    const parent = item.closest('.has-submenu');
                    if (parent) {
                        parent.classList.add('submenu-open');
                    }
                }
            }
        });

        // فتح/إغلاق القوائم الفرعية
        document.querySelectorAll('.has-submenu > a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const parent = this.closest('.has-submenu');
                parent.classList.toggle('submenu-open');
            });
        });
    }

    // ========== تسجيل الخروج ==========
    function initLogout() {
        document.body.addEventListener('click', async function(e) {
            const logoutBtn = e.target.closest('.logout-btn, #logoutBtn');
            if (!logoutBtn) return;

            e.preventDefault();
            console.log('🔒 [App] تسجيل الخروج...');
            logoutBtn.style.pointerEvents = 'none';
            logoutBtn.disabled = true;

            try {
                if (window.Auth?.logout) {
                    await window.Auth.logout();
                } else {
                    // خطة بديلة
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.replace('/auth/auth/login/login.html');
                }
            } catch (error) {
                console.error('❌ فشل تسجيل الخروج:', error);
                window.location.replace('/auth/auth/login/login.html');
            }
        });
    }

    // ========== تتبع النشاط والخمول ==========
    function initActivityTracking(userId) {
        if (!window.ActivityTracker) return;

        window.ActivityTracker.startIdleTimer(async () => {
            // إنهاء الجلسة عند الخمول
            if (window.Auth?.logout) {
                await window.Auth.logout();
            } else {
                window.location.href = '/auth/auth/login/login.html?reason=timeout';
            }
        }, userId);

        // تحديث last_activity_at كل دقيقة
        setInterval(() => {
            if (window.ActivityTracker.updateLastActivity) {
                window.ActivityTracker.updateLastActivity(userId);
            }
        }, 60000);
    }

    // ========== طلب الموقع الجغرافي (اختياري) ==========
    function requestLocationOnce() {
        if (!window.Auth?.getCurrentPosition) return;
        window.Auth.getCurrentPosition().then(pos => {
            sessionStorage.setItem('userLat', pos.latitude);
            sessionStorage.setItem('userLon', pos.longitude);
            console.log('📍 موقع GPS مسجل.');
        }).catch(err => {
            console.warn('⚠️ تعذر الحصول على GPS:', err.message);
        });
    }

    // ========== التهيئة العامة (للصفحات المحمية) ==========
    async function initProtectedPage() {
        // التحقق من الجلسة
        if (!window.Auth) {
            window.location.replace('/auth/auth/login/login.html');
            return;
        }

        const user = await window.Auth.requireAuth();
        if (!user) return; // requireAuth ستقوم بالتوجيه

        // تحديث واجهة المستخدم
        updateUserUI(user);

        // تهيئة القائمة الجانبية
        initSidebar();

        // زر تسجيل الخروج
        initLogout();

        // تتبع النشاط والخمول
        initActivityTracking(user.id);

        // محاولة الحصول على الموقع الجغرافي مرة واحدة
        requestLocationOnce();

        // تفعيل الوضع المظلم/الفاتح (يمكن تفعيله لاحقاً)
        // initThemeToggle();

        console.log('✅ [App] تمت تهيئة الصفحة المحمية بنجاح.');
    }

    // ========== واجهة عامة ==========
    window.TeraApp = {
        initProtectedPage,
        updateUserUI,
        showToast,
        getCurrentPage
    };

    // ========== بدء التشغيل التلقائي ==========
    // إذا تم تحميل الملف في صفحة، سيحاول تهيئة نفسه
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // لا نقوم بالتهيئة التلقائية لجميع الصفحات،
            // بل نعتمد على استدعاء TeraApp.initProtectedPage() من dashboard.js أو غيره.
        });
    }

})();
