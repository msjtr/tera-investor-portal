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
 * ربط الملفات:
 * - core.js: الدوال الأساسية
 * - app.js: التطبيق الرئيسي والتوجيه
 * - dashboard.js: لوحة التحكم
 * - investments.js: الاستثمارات
 * - portfolio.js: المحفظة
 * - reports.js: التقارير
 * - profile.js: الملف الشخصي
 * - security.js: الأمان
 * - support.js: الدعم
 * ============================================================
 * تم التحديث لتوحيد استخدام المفاتيح:
 * - tera_token (بدلاً من tera_auth_token)
 * - tera_user (بدلاً من tera_user_data)
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. التأكد من تحميل الملفات الأساسية
    // ============================================================

    /**
     * التحقق من تحميل core.js وإعادة تحميله إذا لزم الأمر
     */
    function ensureCoreLoaded() {
        if (typeof TeraCore === 'undefined') {
            console.warn('⚠️ core.js لم يتم تحميله، يتم تحميله الآن...');
            const script = document.createElement('script');
            script.src = '../../assets/js/core.js';
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
            script.src = '../../assets/js/app.js';
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
            'dashboard': '../../assets/js/dashboard.js',
            'investments': '../../assets/js/investments.js',
            'portfolio': '../../assets/js/portfolio.js',
            'reports': '../../assets/js/reports.js',
            'profile': '../../assets/js/profile.js',
            'security': '../../assets/js/security.js',
            'support': '../../assets/js/support.js'
        };

        const scriptPath = pageScripts[pageName];
        if (scriptPath) {
            // التحقق مما إذا كان الملف قد تم تحميله بالفعل
            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (!existingScript) {
                console.log(`📦 تحميل ${pageName}.js...`);
                const script = document.createElement('script');
                script.src = scriptPath;
                script.async = false;
                document.head.appendChild(script);
            }
        }
    }

    // ============================================================
    // 2. التعرف على الصفحة الحالية وتفعيل دوالها
    // ============================================================

    /**
     * تحديد نوع الصفحة الحالية بناءً على المسار
     * @returns {string} - اسم الصفحة (dashboard, investments, etc.)
     */
    function getCurrentPage() {
        const path = window.location.pathname;

        // استخراج اسم الملف أو المجلد
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

        // إذا كانت الصفحة هي الرئيسية أو لم يتم التعرف عليها
        if (path === '/' || path === '' || path === '/index.html') {
            return 'dashboard';
        }

        // صفحة المصادقة (لا تحتاج إلى تهيئة خاصة)
        if (path.includes('auth') || path.includes('login') || path.includes('register')) {
            return 'auth';
        }

        return 'unknown';
    }

    // ============================================================
    // 3. تهيئة المكونات المشتركة
    // ============================================================

    /**
     * تهيئة القائمة الجانبية (Sidebar)
     */
    function initSidebar() {
        // زر تبديل القائمة للشاشات الصغيرة
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

        // تفعيل القوائم الفرعية
        document.querySelectorAll('.has-submenu > a').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const parent = this.parentElement;
                if (parent) {
                    parent.classList.toggle('submenu-open');
                }
            });
        });

        // إغلاق القائمة عند النقر خارجها في الشاشات الصغيرة
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

        // إغلاق القائمة عند تغيير حجم النافذة إلى حجم كبير
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
                // عرض قائمة الإشعارات (يمكن توسيعها لاحقاً)
                if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                    TeraApp.showNotification('📬 لديك 3 إشعارات جديدة', 'info', 4000);
                } else {
                    alert('📬 لديك 3 إشعارات جديدة');
                }
            });
        }
    }

    /**
     * تهيئة زر تسجيل الخروج (تم التحديث لاستخدام المفاتيح الموحدة)
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
                        // ✅ الطريقة اليدوية باستخدام المفاتيح الموحدة
                        localStorage.removeItem('tera_token');
                        localStorage.removeItem('tera_user');
                        // إزالة أي مفاتيح قديمة للتأكد
                        localStorage.removeItem('tera_auth_token');
                        localStorage.removeItem('tera_user_data');
                        // التوجيه إلى صفحة تسجيل الدخول
                        window.location.href = '../../auth/auth/login/login.html';
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
            // تجاهل الروابط التي تمتلك target="_blank" أو تبدأ بـ http
            if (link.target === '_blank') return;
            if (link.getAttribute('href').startsWith('http://') || 
                link.getAttribute('href').startsWith('https://')) return;
            if (link.getAttribute('href').startsWith('#')) return;
            if (link.getAttribute('href').startsWith('javascript:')) return;
            if (link.getAttribute('href').endsWith('.css')) return;
            if (link.getAttribute('href').endsWith('.js')) return;
            
            // إذا كانت الصفحة داخل نفس الموقع، استخدم TeraApp للتنقل
            link.addEventListener('click', function(e) {
                if (typeof TeraApp !== 'undefined' && TeraApp.navigateTo) {
                    e.preventDefault();
                    const href = this.getAttribute('href');
                    TeraApp.navigateTo(href);
                }
                // وإلا، سيتم التعامل مع الرابط بشكل طبيعي
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
    // 4. دوال تهيئة الصفحات حسب النوع
    // ============================================================

    /**
     * تهيئة صفحة لوحة التحكم
     */
    function initDashboardPage() {
        console.log('📊 تهيئة لوحة التحكم');
        
        // تحميل سكريبت لوحة التحكم
        loadPageScript('dashboard');
        
        // تهيئة الرسم البياني إذا كان موجوداً
        const chartCanvas = document.getElementById('performanceChart');
        if (chartCanvas && typeof Chart !== 'undefined') {
            // سيتم تهيئته في dashboard.js
        }

        // تفعيل البطاقات الإحصائية (إضافة تأثيرات)
        document.querySelectorAll('.stat-card').forEach(function(card) {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
                this.style.transition = 'transform 0.3s ease';
            });
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });

        // تفعيل أزرار المشاركة في الفرص
        document.querySelectorAll('.btn-primary.btn-sm').forEach(function(btn) {
            if (btn.textContent.includes('مشاركة')) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const row = this.closest('tr');
                    if (row) {
                        const opportunity = row.querySelector('td:first-child')?.textContent || 'الفرصة';
                        if (typeof TeraApp !== 'undefined' && TeraApp.showNotification) {
                            TeraApp.showNotification(`✅ تم المشاركة في ${opportunity} بنجاح`, 'success', 3000);
                        } else {
                            alert(`✅ تم المشاركة في ${opportunity}`);
                        }
                    }
                });
            }
        });
    }

    /**
     * تهيئة صفحة الاستثمارات
     */
    function initInvestmentsPage() {
        console.log('💰 تهيئة صفحة الاستثمارات');
        loadPageScript('investments');

        // تفعيل أزرار "مشاركة الآن" في بطاقات الفرص
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

        // تفعيل زر "إضافة للمفضلة"
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

        // تفعيل الفلاتر
        document.querySelectorAll('.filter-group select, .filter-group input').forEach(function(element) {
            element.addEventListener('change', function() {
                console.log('🔍 تغيير الفلتر:', this.value);
                // يمكن تنفيذ عملية التصفية هنا
            });
        });
    }

    /**
     * تهيئة صفحة المحفظة
     */
    function initPortfolioPage() {
        console.log('💼 تهيئة صفحة المحفظة');
        loadPageScript('portfolio');

        // تفعيل طلب السحب
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

        // تفعيل طرق الدفع
        document.querySelectorAll('.payment-method').forEach(function(method) {
            method.addEventListener('click', function() {
                document.querySelectorAll('.payment-method').forEach(function(m) {
                    m.classList.remove('selected');
                });
                this.classList.add('selected');
            });
        });
    }

    /**
     * تهيئة صفحة التقارير
     */
    function initReportsPage() {
        console.log('📊 تهيئة صفحة التقارير');
        loadPageScript('reports');

        // تفعيل أزرار تحميل التقارير
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

    /**
     * تهيئة صفحة الملف الشخصي
     */
    function initProfilePage() {
        console.log('👤 تهيئة صفحة الملف الشخصي');
        loadPageScript('profile');

        // تفعيل زر حفظ التغييرات
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

    /**
     * تهيئة صفحة الأمان
     */
    function initSecurityPage() {
        console.log('🔐 تهيئة صفحة الأمان');
        loadPageScript('security');

        // تفعيل مفاتيح التبديل (Switches)
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

        // تفعيل زر توليد رموز الاسترداد
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

    /**
     * تهيئة صفحة الدعم
     */
    function initSupportPage() {
        console.log('🆘 تهيئة صفحة الدعم');
        loadPageScript('support');

        // تفعيل الأسئلة الشائعة (FAQ)
        document.querySelectorAll('.faq-question').forEach(function(question) {
            question.addEventListener('click', function() {
                const item = this.closest('.faq-item');
                if (item) {
                    item.classList.toggle('open');
                }
            });
        });

        // تفعيل بحث الأسئلة الشائعة
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

        // تفعيل إنشاء تذكرة
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

    /**
     * تهيئة صفحات المصادقة
     */
    function initAuthPage() {
        console.log('🔑 تهيئة صفحة المصادقة');
        // لا نحتاج إلى تحميل أي سكريبت إضافي هنا
        // يتم التعامل معها بواسطة auth.js
    }

    /**
     * توجيه التهيئة حسب نوع الصفحة
     */
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
    // 5. تحميل جميع الملفات المشتركة
    // ============================================================

    /**
     * تحميل جميع ملفات CSS المشتركة (في حال عدم تحميلها بالفعل)
     */
    function ensureStylesLoaded() {
        const styles = [
            '../../assets/css/core.css',
            '../../assets/css/main.css',
            '../../assets/css/dashboard.css',
            '../../assets/css/responsive.css'
        ];

        styles.forEach(function(stylePath) {
            if (!document.querySelector(`link[href="${stylePath}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = stylePath;
                document.head.appendChild(link);
                console.log(`📦 تحميل ${stylePath}...`);
            }
        });
    }

    /**
     * تحميل مكتبة Font Awesome (إذا لم تكن محملة)
     */
    function ensureFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
            document.head.appendChild(link);
            console.log('📦 تحميل Font Awesome...');
        }
    }

    /**
     * تحميل مكتبة Chart.js (إذا لزم الأمر)
     */
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
    // 6. التهيئة الرئيسية
    // ============================================================

    /**
     * التهيئة الرئيسية لملف main.js
     */
    function initMain() {
        console.log('🚀 بدء تهيئة main.js...');

        // 1. التأكد من تحميل الملفات الأساسية
        ensureCoreLoaded();
        ensureAppLoaded();

        // 2. التأكد من تحميل أنماط CSS
        ensureStylesLoaded();
        ensureFontAwesome();
        ensureChartJs();

        // 3. تهيئة المكونات المشتركة
        initCommonComponents();

        // 4. تحديد نوع الصفحة الحالية
        const pageType = getCurrentPage();
        console.log(`📄 نوع الصفحة: ${pageType}`);

        // 5. تهيئة الصفحة حسب نوعها
        initPageByType(pageType);

        // 6. إعادة تهيئة أي عناصر ديناميكية بعد تحميل المحتوى
        document.addEventListener('DOMContentLoaded', function() {
            // تنفيذ أي تهيئة إضافية بعد تحميل DOM بالكامل
            console.log('✅ DOM جاهز، يتم تنفيذ التهيئة النهائية');
        });

        console.log('✅ main.js تم تهيئته بنجاح');
        console.log('📌 جميع المكونات جاهزة للاستخدام');
    }

    // ============================================================
    // 7. بدء التهيئة
    // ============================================================

    // بدء التهيئة عند تحميل DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        // إذا كان DOM قد تم تحميله بالفعل
        initMain();
    }

    // ============================================================
    // 8. تصدير الدوال العامة
    // ============================================================

    window.TeraMain = {
        // تهيئة المكونات
        initMain: initMain,
        initCommonComponents: initCommonComponents,
        initSidebar: initSidebar,
        initNotifications: initNotifications,
        initLogout: initLogout,
        initInternalLinks: initInternalLinks,

        // تهيئة الصفحات
        initDashboardPage: initDashboardPage,
        initInvestmentsPage: initInvestmentsPage,
        initPortfolioPage: initPortfolioPage,
        initReportsPage: initReportsPage,
        initProfilePage: initProfilePage,
        initSecurityPage: initSecurityPage,
        initSupportPage: initSupportPage,
        initAuthPage: initAuthPage,

        // دوال مساعدة
        getCurrentPage: getCurrentPage,
        loadPageScript: loadPageScript,
        ensureCoreLoaded: ensureCoreLoaded,
        ensureAppLoaded: ensureAppLoaded,
        ensureStylesLoaded: ensureStylesLoaded,
        ensureFontAwesome: ensureFontAwesome,
        ensureChartJs: ensureChartJs
    };

    console.log('✅ main.js: تم تحميل المكتبة الرئيسية (TeraMain) بنجاح');

})();
