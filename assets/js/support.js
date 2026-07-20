/**
 * ========================================================
 * support.js – الوظائف المشتركة لقسم الدعم (الإصدار المحسّن v3)
 * متوافق مع النظام الحالي، يدعم عدة مصادر للحصول على المستخدم
 * متكامل مع auth.js v31 وإدارة OneSignal
 * ========================================================
 */

(function() {
    'use strict';

    if (window.__supportInitialized) return;
    window.__supportInitialized = true;

    // ============================================================
    // 1. إدارة الحالة المركزية
    // ============================================================
    const state = {
        currentUser: null,
        supabase: null,
        isInitialized: false,
        sidebar: {
            isOpen: false,
            isCollapsed: false
        },
        logoutInProgress: false
    };

    // ============================================================
    // 2. الأدوات المساعدة (Logging)
    // ============================================================
    const Logger = {
        levels: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
        currentLevel: 0,

        log(level, message, data = null) {
            if (level < this.currentLevel) return;
            const prefix = {
                0: '🔍 [DEBUG]',
                1: 'ℹ️ [INFO]',
                2: '⚠️ [WARN]',
                3: '❌ [ERROR]'
            }[level] || '[LOG]';
            console.log(prefix, message, data || '');
        },

        debug(msg, data) { this.log(0, msg, data); },
        info(msg, data) { this.log(1, msg, data); },
        warn(msg, data) { this.log(2, msg, data); },
        error(msg, data) { this.log(3, msg, data); }
    };

    // ============================================================
    // 3. الحصول على Supabase والمستخدم (محسّن مع عدة مصادر)
    // ============================================================
    async function getSupabase() {
        if (state.supabase) return state.supabase;
        try {
            if (window.teraSupabase) {
                state.supabase = window.teraSupabase;
                return state.supabase;
            }
            if (window.waitForSupabase) {
                state.supabase = await window.waitForSupabase();
                return state.supabase;
            }
            Logger.warn('Supabase غير متوفر');
            return null;
        } catch (e) {
            Logger.error('فشل الحصول على Supabase', e);
            return null;
        }
    }

    async function getCurrentUser(force = false) {
        if (state.currentUser && !force) return state.currentUser;

        try {
            // 1. عبر window.Auth.getCurrentUser (الطريقة الأساسية)
            if (window.Auth && typeof window.Auth.getCurrentUser === 'function') {
                const user = await window.Auth.getCurrentUser();
                if (user) {
                    state.currentUser = user;
                    return user;
                }
            }

            // 2. عبر window.Auth.getUser (طريقة بديلة)
            if (window.Auth && typeof window.Auth.getUser === 'function') {
                const user = await window.Auth.getUser();
                if (user) {
                    state.currentUser = user;
                    return user;
                }
            }

            // 3. عبر supabase مباشرة
            const sb = await getSupabase();
            if (sb) {
                const { data: { user }, error } = await sb.auth.getUser();
                if (!error && user) {
                    state.currentUser = user;
                    return user;
                }
            }

            // 4. من sessionStorage كحل أخير
            const storedUser = sessionStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    if (parsed && parsed.id) {
                        state.currentUser = parsed;
                        return parsed;
                    }
                } catch (e) { /* تجاهل */ }
            }

            Logger.warn('لم يتم العثور على مستخدم');
            return null;

        } catch (e) {
            Logger.error('فشل جلب المستخدم', e);
            return null;
        }
    }

    // ============================================================
    // 4. تهيئة اسم المستخدم (محسّن)
    // ============================================================
    async function initUserHeader() {
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');

        if (!nameEl && !avatarEl) return;

        try {
            let displayName = sessionStorage.getItem('otpName');

            if (!displayName) {
                const user = await getCurrentUser();
                if (user) {
                    displayName = user.user_metadata?.full_name ||
                                 user.user_metadata?.name ||
                                 user.email ||
                                 'مستخدم';
                    sessionStorage.setItem('otpName', displayName);
                } else {
                    displayName = 'مستخدم';
                }
            }

            if (nameEl) {
                nameEl.textContent = displayName;
                nameEl.setAttribute('data-user-name', displayName);
            }
            if (avatarEl) {
                const initial = displayName.charAt(0).toUpperCase();
                avatarEl.textContent = initial;
                avatarEl.setAttribute('data-user-initial', initial);
            }

            Logger.debug('تم تحديث اسم المستخدم', { displayName });

        } catch (e) {
            Logger.warn('فشل تحديث اسم المستخدم', e);
            if (nameEl) nameEl.textContent = 'مستخدم';
            if (avatarEl) avatarEl.textContent = 'م';
        }
    }

    // ============================================================
    // 5. القائمة الجانبية (محسّنة)
    // ============================================================
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const closeBtn = document.getElementById('closeSidebarBtn');
        const overlay = document.getElementById('sidebarOverlay');

        if (!sidebar) return;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isMobile = window.innerWidth < 992;
                if (isMobile) {
                    sidebar.classList.toggle('sidebar-open');
                    if (overlay) overlay.classList.toggle('active');
                    state.sidebar.isOpen = sidebar.classList.contains('sidebar-open');
                } else {
                    sidebar.classList.toggle('collapsed');
                    state.sidebar.isCollapsed = sidebar.classList.contains('collapsed');
                }
            });
        }

        if (closeBtn && overlay) {
            closeBtn.addEventListener('click', () => {
                sidebar.classList.remove('sidebar-open');
                if (overlay) overlay.classList.remove('active');
                state.sidebar.isOpen = false;
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
                state.sidebar.isOpen = false;
            });
        }

        document.querySelectorAll('.has-submenu > a').forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href && href !== '#' && href !== 'javascript:void(0)') return;
                e.preventDefault();
                const parent = this.closest('.has-submenu');
                if (parent) {
                    parent.classList.toggle('submenu-open');
                }
            });
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.innerWidth >= 992) {
                    sidebar.classList.remove('sidebar-open');
                    if (overlay) overlay.classList.remove('active');
                    state.sidebar.isOpen = false;
                }
            }, 250);
        });

        Logger.debug('القائمة الجانبية جاهزة');
    }

    // ============================================================
    // 6. زر الخروج (محسّن بالتوافق مع Auth.logout)
    // ============================================================
    function initLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (state.logoutInProgress) return;
            if (!confirm('هل أنت متأكد من تسجيل الخروج؟')) return;

            state.logoutInProgress = true;
            logoutBtn.disabled = true;
            const originalText = logoutBtn.innerHTML;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الخروج...';

            try {
                // استخدام Auth.logout الموحدة (التي تدير OneSignal)
                if (window.Auth && typeof window.Auth.logout === 'function') {
                    await window.Auth.logout();
                } else {
                    // خطة احتياطية: تنظيف يدوي
                    const sb = await getSupabase();
                    if (sb) {
                        try { await sb.auth.signOut(); } catch (e) { /* تجاهل */ }
                    }
                    localStorage.clear();
                    sessionStorage.clear();
                    document.cookie.split(';').forEach(c => {
                        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                    });
                    window.location.replace('/auth/auth/login/login.html');
                }
            } catch (err) {
                Logger.error('فشل تسجيل الخروج', err);
                // تنظيف احتياطي
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('/auth/auth/login/login.html');
            } finally {
                state.logoutInProgress = false;
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = originalText;
            }
        });
    }

    // ============================================================
    // 7. تحديث عداد الإشعارات (للتوافق مع support-notifications.js)
    // ============================================================
    async function updateNotificationBadge() {
        try {
            const user = await getCurrentUser();
            if (!user) return 0;

            const sb = await getSupabase();
            if (!sb) return 0;

            const { count, error } = await sb
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'unread');

            if (error) throw error;

            const unreadCount = count || 0;

            // تحديث جميع البادجات
            const badges = document.querySelectorAll('.notification-badge, .badge-count, #unreadBadge');
            badges.forEach(el => {
                if (el) {
                    el.textContent = unreadCount;
                    el.style.display = unreadCount > 0 ? 'inline-block' : 'none';
                }
            });

            // عداد التاب
            const tabBadge = document.querySelector('.tab-btn[data-tab="inbox"] .badge-count');
            if (tabBadge) {
                tabBadge.textContent = unreadCount;
                tabBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }

            // عداد الهيدر
            const headerBadge = document.querySelector('.header-notification-badge');
            if (headerBadge) {
                headerBadge.textContent = unreadCount;
                headerBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }

            return unreadCount;

        } catch (e) {
            Logger.warn('فشل تحديث عداد الإشعارات', e);
            return 0;
        }
    }

    // ============================================================
    // 8. تهيئة عامة
    // ============================================================
    async function init() {
        if (state.isInitialized) return;

        try {
            await initUserHeader();
            initSidebar();
            initLogout();
            await updateNotificationBadge();

            state.isInitialized = true;
            Logger.info('✅ support.js v3 ready');

        } catch (err) {
            Logger.error('فشل تهيئة support.js', err);
            setTimeout(() => {
                state.isInitialized = false;
                init();
            }, 5000);
        }
    }

    // ============================================================
    // 9. API العامة (للتوافق مع الملفات الأخرى)
    // ============================================================
    window.Support = {
        getSupabase,
        getCurrentUser,
        updateNotificationBadge,
        initUserHeader,
        initSidebar,
        initLogout,
        state
    };

    // ============================================================
    // 10. مستمعات الأحداث
    // ============================================================
    document.addEventListener('user:updated', async (e) => {
        if (e.detail?.name) {
            const nameEl = document.getElementById('headerUserName');
            const avatarEl = document.getElementById('headerAvatar');
            if (nameEl) nameEl.textContent = e.detail.name;
            if (avatarEl) avatarEl.textContent = e.detail.name.charAt(0).toUpperCase();
            sessionStorage.setItem('otpName', e.detail.name);
        } else {
            await initUserHeader();
        }
    });

    document.addEventListener('notifications:updated', async () => {
        await updateNotificationBadge();
    });

    // ============================================================
    // 11. التشغيل
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
