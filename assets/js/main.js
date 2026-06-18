/**
 * ============================================================
 * main.js - الملف الرئيسي لإدارة وتنسيق جميع صفحات منصة تيرا
 * ============================================================
 * هذا الملف مسؤول عن:
 * 1. تحميل وتهيئة جميع المكونات المشتركة
 * 2. ربط جميع أحداث الصفحات المختلفة
 * 3. تنفيذ دوال خاصة بكل صفحة حسب المسار الحالي
 * 4. إدارة السلوك العام للموقع (مثل القوائم، الإشعارات، وغيرها)
 * ============================================================
 * تم التحديث لاستخدام المسارات النسبية بدلاً من المطلقة
 * لحل مشكلة 404 على خوادم مثل Render
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. دوال مساعدة للمسارات النسبية
    // ============================================================

    /**
     * حساب عدد المستويات (العمق) للوصول إلى الجذر من المسار الحالي
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
     * @param {string} targetPath - المسار المطلوب (يمكن أن يبدأ بـ / أو لا)
     * @returns {string} المسار النسبي مع ../ بالعدد المناسب
     */
    function resolveRelativePath(targetPath) {
        // إزالة / من البداية إذا وجدت
        let cleanPath = targetPath;
        if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.slice(1);
        }
        // إزالة أي تكرار لـ ../ في البداية
        while (cleanPath.startsWith('../')) {
            cleanPath = cleanPath.slice(3);
        }
        const depth = getBaseDepth();
        let prefix = '';
        for (let i = 0; i < depth; i++) {
            prefix += '../';
        }
        return prefix + cleanPath;
    }

    // ============================================================
    // 2. التأكد من تحميل الملفات الأساسية (باستخدام مسارات نسبية)
    // ============================================================

    /**
     * التحقق من تحميل core.js وإعادة تحميله إذا لزم الأمر
     */
    function ensureCoreLoaded() {
        if (typeof TeraCore === 'undefined') {
            console.warn('⚠️ core.js لم يتم تحميله، يتم تحميله الآن...');
            const script = document.createElement('script');
            script.src = resolveRelativePath('/assets/js/core.js');
            script.async = false;
            document.head.appendChild(script);
            return false;
        }
        return true;
    }

    /**
     * التحقق من تحميل app.js وإعادة تحميله إذا لزم الأمر
     */
    function ensureAppLoaded() {
        if (typeof TeraApp === 'undefined') {
            console.warn('⚠️ app.js لم يتم تحميله، يتم تحميله الآن...');
            const script = document.createElement('script');
            script.src = resolveRelativePath('/assets/js/app.js');
            script.async = false;
            document.head.appendChild(script);
            return false;
        }
        return true;
    }

    /**
     * تحميل ملف JS خاص بصفحة معينة
     * @param {string} pageName - اسم الصفحة (مثل: dashboard, investments)
     */
    function loadPageScript(pageName) {
        const pageScripts = {
            'dashboard': '/assets/js/dashboard.js',
            'investments': '/assets/js/investments.js',
            'portfolio': '/assets/js/portfolio.js',
            'reports': '/assets/js/reports.js',
            'profile': '/assets/js/profile.js',
            'security': '/assets/js/security.js',
            'support': '/assets/js/support.js'
        };

        const scriptPath = pageScripts[pageName];
        if (scriptPath) {
            const relativePath = resolveRelativePath(scriptPath);
            const existingScript = document.querySelector(`script[src="${relativePath}"]`);
            if (!existingScript) {
                console.log(`📦 تحميل ${pageName}.js...`);
                const script = document.createElement('script');
                script.src = relativePath;
                script.async = false;
                document.head.appendChild(script);
            }
        }
    }

    // ============================================================
    // 3. التعرف على الصفحة الحالية وتفعيل دوالها
    // ============================================================

    /**
     * تحديد نوع الصفحة الحالية بناءً على المسار
     * @returns {string} - اسم الصفحة (dashboard, investments, etc.)
     */
    function getCurrentPage() {
        const path = window.location.pathname;

        const pageMap = {
            'dashboard': ['dashboard', 'index.html'],
            'investments': ['investments', 'opportunities', 'active', 'completed', 'cancelled', 'extended', 'details'],
            'portfolio': ['portfolio', 'overview', 'transactions', 'profits', 'withdraw', 'withdrawals', 'statement'],
            'reports': ['reports', 'portfolio-report', 'investments-report', 'profits-report', 'withdrawals-report'],
            'profile': ['profile', 'personal', 'contact', 'address', 'bank', 'attachments'],
            'security': ['security', 'password', 'email', 'mobile', '2fa', 'devices', 'login-history'],
            'support': ['support', 'help', 'faq', 'tickets', 'notifications', 'privacy', 'terms']
        };

        for (const [page, keywords] of Object.entries(pageMap)) {
            for (const keyword of keywords) {
                if (path.includes(keyword)) {
                    return page;
                }
            }
        }

        if (path === '/' || path === '' || path === '/index.html') {
            return 'dashboard';
        }

        if (path.includes('auth') || path.includes('login') || path.includes('register')) {
            return 'auth';
        }

        return 'unknown';
    }

    // ============================================================
    // 4. تهيئة المكونات المشتركة
    // ============================================================

    /**
     * تهيئة القائمة الجانبية (Sidebar)
     */
    function initSidebar() {
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('sidebar-open');
                }
            });
        }

        document.querySelectorAll('.has-submenu > a').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const parent = this.parentElement;
                if (parent) {
                    parent.classList.toggle('submenu-open');
                }
            });
        });

        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 991) {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('sidebarToggle');
                if (sidebar && toggleBtn) {
                    const isClickInsideSidebar = sidebar.contains(e.target);
                    const isClickOnToggle = toggleBtn.contains(e.target);
                    if (!isClickInsideSidebar && !isClickOnToggle) {
                        sidebar.classList.remove('sidebar-open');
                    }
                }
            }
        });

        window.addEventListener('resize', function() {
            if (window.innerWidth > 991) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.remove('sidebar-open');
                }
            }
        });
    }

    /**
     * تهيئة الإشعارات
     */
    function initNotifications() {
        const notifIcon = document.querySelector('.notifications');
        if (notifIcon) {
            notifIcon.addEventListener('click', function() {
                if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                    TeraApp.showNotification('📬 لديك 3 إشعارات جديدة', 'info', 4000);
                } else {
                    alert('📬 لديك 3 إشعارات جديدة');
                }
            });
        }
    }

    /**
     * تهيئة زر تسجيل الخروج (باستخدام مسارات نسبية)
     */
    function initLogout() {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const confirmLogout = confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟');
                if (confirmLogout) {
                    if (typeof TeraApp !== 'undefined' && TeraApp.logout) {
                        TeraApp.logout();
                    } else {
                        localStorage.removeItem('tera_token');
                        localStorage.removeItem('tera_user');
                        localStorage.removeItem('tera_auth_token');
                        localStorage.removeItem('tera_user_data');
                        window.location.href = resolveRelativePath('/auth/auth/login/login.html');
                    }
                }
            });
        }
    }

    /**
     * تهيئة الروابط الداخلية للتنقل بين الصفحات
     */
    function initInternalLinks() {
        document.querySelectorAll('a[href]').forEach(function(link) {
            if (link.target === '_blank') return;
            if (link.getAttribute('href').startsWith('http://') || 
                link.getAttribute('href').startsWith('https://')) return;
            if (link.getAttribute('href').startsWith('#')) return;
            if (link.getAttribute('href').startsWith('javascript:')) return;
            if (link.getAttribute('href').endsWith('.css')) return;
            if (link.getAttribute('href').endsWith('.js')) return;
            
            link.addEventListener('click', function(e) {
                if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
                    e.preventDefault();
                    const href = this.getAttribute('href');
                    TeraApp.navigateTo(href);
                }
            });
        });
    }

    /**
     * تهيئة جميع المكونات المشتركة
     */
    function initCommonComponents() {
        initSidebar();
        initNotifications();
        initLogout();
        initInternalLinks();
        console.log('✅ تم تهيئة جميع المكونات المشتركة');
    }

    // ============================================================
    // 5. دوال تهيئة الصفحات حسب النوع
    // ============================================================

    function initDashboardPage() {
        console.log('📊 تهيئة لوحة التحكم');
        loadPageScript('dashboard');
    }

    function initInvestmentsPage() {
        console.log('💰 تهيئة صفحة الاستثمارات');
        loadPageScript('investments');

        document.querySelectorAll('.opportunity-card .btn-primary').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const card = this.closest('.opportunity-card');
                if (card) {
                    const title = card.querySelector('.opp-header h4')?.textContent || 'الفرصة';
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification(`✅ تم المشاركة في ${title} بنجاح`, 'success', 3000);
                    } else {
                        alert(`✅ تم المشاركة في ${title}`);
                    }
                }
            });
        });

        document.querySelectorAll('.opportunity-card .btn-outline-primary').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('active');
                if (this.classList.contains('active')) {
                    this.innerHTML = '<i class="fas fa-heart" style="color: #DC3545;"></i>';
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification('❤️ تمت إضافة الفرصة إلى المفضلة', 'info', 2000);
                    }
                } else {
                    this.innerHTML = '<i class="far fa-heart"></i>';
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification('💔 تمت إزالة الفرصة من المفضلة', 'info', 2000);
                    }
                }
            });
        });

        document.querySelectorAll('.filter-group select, .filter-group input').forEach(function(element) {
            element.addEventListener('change', function() {
                console.log('🔍 تغيير الفلتر:', this.value);
            });
        });
    }

    function initPortfolioPage() {
        console.log('💼 تهيئة صفحة المحفظة');
        loadPageScript('portfolio');

        const withdrawBtn = document.querySelector('.withdraw-submit-btn');
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const amount = document.querySelector('input[type="number"]')?.value;
                if (amount && parseFloat(amount) > 0) {
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification(`✅ تم تقديم طلب سحب بمبلغ ر.س ${amount}`, 'success', 4000);
                    } else {
                        alert(`✅ تم تقديم طلب سحب بمبلغ ر.س ${amount}`);
                    }
                } else {
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification('⚠️ يرجى إدخال مبلغ صحيح', 'warning', 3000);
                    } else {
                        alert('⚠️ يرجى إدخال مبلغ صحيح');
                    }
                }
            });
        }

        document.querySelectorAll('.payment-method').forEach(function(method) {
            method.addEventListener('click', function() {
                document.querySelectorAll('.payment-method').forEach(function(m) {
                    m.classList.remove('selected');
                });
                this.classList.add('selected');
            });
        });
    }

    function initReportsPage() {
        console.log('📊 تهيئة صفحة التقارير');
        loadPageScript('reports');

        document.querySelectorAll('.btn-primary .fa-file-pdf, .btn .fa-file-excel').forEach(function(icon) {
            const btn = icon.closest('button') || icon.closest('a');
            if (btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const reportName = this.closest('.card')?.querySelector('.card-header h3')?.textContent || 'التقرير';
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification(`📄 جاري تحميل ${reportName}...`, 'info', 3000);
                    } else {
                        alert(`📄 جاري تحميل ${reportName}`);
                    }
                });
            }
        });
    }

    function initProfilePage() {
        console.log('👤 تهيئة صفحة الملف الشخصي');
        loadPageScript('profile');

        document.querySelectorAll('.card .btn-primary').forEach(function(btn) {
            if (btn.textContent.includes('حفظ') || btn.textContent.includes('تحديث')) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification('✅ تم حفظ التغييرات بنجاح', 'success', 3000);
                    } else {
                        alert('✅ تم حفظ التغييرات');
                    }
                });
            }
        });
    }

    function initSecurityPage() {
        console.log('🔐 تهيئة صفحة الأمان');
        loadPageScript('security');

        document.querySelectorAll('.switch input[type="checkbox"]').forEach(function(checkbox) {
            checkbox.addEventListener('change', function() {
                const status = this.checked ? 'مفعل' : 'معطل';
                const label = this.closest('.switch')?.previousElementSibling?.textContent || 'الإعداد';
                if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                    TeraApp.showNotification(`⚙️ تم ${status} ${label}`, 'info', 3000);
                }
                console.log(`⚙️ تم ${status} ${label}`);
            });
        });

        document.querySelectorAll('.btn-secondary, .btn-outline-secondary').forEach(function(btn) {
            if (btn.textContent.includes('توليد')) {
                btn.addEventListener('click', function() {
                    if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                        TeraApp.showNotification('🔑 تم توليد رموز استرداد جديدة', 'success', 3000);
                    } else {
                        alert('🔑 تم توليد رموز استرداد جديدة');
                    }
                });
            }
        });
    }

    function initSupportPage() {
        console.log('🆘 تهيئة صفحة الدعم');
        loadPageScript('support');

        document.querySelectorAll('.faq-question').forEach(function(question) {
            question.addEventListener('click', function() {
                const item = this.closest('.faq-item');
                if (item) {
                    item.classList.toggle('open');
                }
            });
        });

        const searchInput = document.getElementById('faqSearchInput');
        if (searchInput) {
            searchInput.addEventListener('keyup', function() {
                const filter = this.value.toLowerCase().trim();
                const items = document.querySelectorAll('.faq-item');
                
                items.forEach(function(item) {
                    const question = item.querySelector('.faq-question span:first-child')?.textContent?.toLowerCase() || '';
                    const answer = item.querySelector('.faq-answer')?.textContent?.toLowerCase() || '';
                    
                    if (filter === '' || question.includes(filter) || answer.includes(filter)) {
                        item.style.display = 'block';
                        if (filter !== '' && !item.classList.contains('open')) {
                            item.classList.add('open');
                        }
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }

        const ticketBtn = document.querySelector('.btn-primary .fa-ticket-alt')?.closest('button') || 
                         document.querySelector('.btn-primary:has(.fa-ticket-alt)');
        if (ticketBtn) {
            ticketBtn.addEventListener('click', function() {
                if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                    TeraApp.showNotification('🎫 تم إنشاء تذكرة جديدة بنجاح', 'success', 3000);
                } else {
                    alert('🎫 تم إنشاء تذكرة جديدة');
                }
            });
        }
    }

    function initAuthPage() {
        console.log('🔑 تهيئة صفحة المصادقة');
    }

    function initPageByType(pageType) {
        switch (pageType) {
            case 'dashboard':
                initDashboardPage();
                break;
            case 'investments':
                initInvestmentsPage();
                break;
            case 'portfolio':
                initPortfolioPage();
                break;
            case 'reports':
                initReportsPage();
                break;
            case 'profile':
                initProfilePage();
                break;
            case 'security':
                initSecurityPage();
                break;
            case 'support':
                initSupportPage();
                break;
            case 'auth':
                initAuthPage();
                break;
            default:
                console.log('📄 صفحة غير معروفة، يتم التهيئة العامة فقط');
                break;
        }
    }

    // ============================================================
    // 6. تحميل جميع الملفات المشتركة (باستخدام مسارات نسبية)
    // ============================================================

    function ensureStylesLoaded() {
        const styles = [
            '/assets/css/core.css',
            '/assets/css/main.css',
            '/assets/css/dashboard.css',
            '/assets/css/responsive.css'
        ];

        styles.forEach(function(stylePath) {
            const relativePath = resolveRelativePath(stylePath);
            if (!document.querySelector(`link[href="${relativePath}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = relativePath;
                document.head.appendChild(link);
                console.log(`📦 تحميل ${stylePath}...`);
            }
        });
    }

    function ensureFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
            document.head.appendChild(link);
            console.log('📦 تحميل Font Awesome...');
        }
    }

    function ensureChartJs() {
        if (document.getElementById('performanceChart') && typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.async = false;
            document.head.appendChild(script);
            console.log('📦 تحميل Chart.js...');
        }
    }

    // ============================================================
    // 7. التهيئة الرئيسية
    // ============================================================

    function initMain() {
        console.log('🚀 بدء تهيئة main.js...');

        ensureCoreLoaded();
        ensureAppLoaded();
        ensureStylesLoaded();
        ensureFontAwesome();
        ensureChartJs();

        initCommonComponents();

        const pageType = getCurrentPage();
        console.log(`📄 نوع الصفحة: ${pageType}`);

        initPageByType(pageType);

        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ DOM جاهز، يتم تنفيذ التهيئة النهائية');
        });

        console.log('✅ main.js تم تهيئته بنجاح');
        console.log('📌 جميع المكونات جاهزة للاستخدام');
    }

    // ============================================================
    // 8. بدء التهيئة
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    // ============================================================
    // 9. تصدير الدوال العامة
    // ============================================================

    window.TeraMain = {
        initMain: initMain,
        initCommonComponents: initCommonComponents,
        initSidebar: initSidebar,
        initNotifications: initNotifications,
        initLogout: initLogout,
        initInternalLinks: initInternalLinks,
        initDashboardPage: initDashboardPage,
        initInvestmentsPage: initInvestmentsPage,
        initPortfolioPage: initPortfolioPage,
        initReportsPage: initReportsPage,
        initProfilePage: initProfilePage,
        initSecurityPage: initSecurityPage,
        initSupportPage: initSupportPage,
        initAuthPage: initAuthPage,
        getCurrentPage: getCurrentPage,
        loadPageScript: loadPageScript,
        ensureCoreLoaded: ensureCoreLoaded,
        ensureAppLoaded: ensureAppLoaded,
        ensureStylesLoaded: ensureStylesLoaded,
        ensureFontAwesome: ensureFontAwesome,
        ensureChartJs: ensureChartJs,
        getBaseDepth: getBaseDepth,
        resolveRelativePath: resolveRelativePath
    };

    console.log('✅ main.js: تم تحميل المكتبة الرئيسية (TeraMain) بنجاح');

})();
