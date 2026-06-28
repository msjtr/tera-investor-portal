/**
 * ============================================================
 * TERA INVESTOR PORTAL - APP.JS (نسخة المؤسسات - Enterprise)
 * ============================================================
 * - تم تحديث مسارات تسجيل الخروج لتكون مسارات مطلقة (Absolute Paths).
 * - تم ربط زر تسجيل الخروج بمحرك المصادقة الفعلي (TeraAuth) لإنهاء جلسة Supabase.
 * - إدارة تفويض الأحداث (Event Delegation) للقائمة الجانبية والقوائم الفرعية.
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // استخدام تفويض الأحداث على مستوى الـ document بالكامل لضمان الأداء العالي
    document.addEventListener('click', async function(e) {
        
        const sidebar = document.getElementById('sidebar');
        
        // 1. إصلاح زر القائمة الجانبية (Sidebar Toggle)
        const toggleBtn = e.target.closest('#sidebarToggle');
        if (toggleBtn) {
            e.preventDefault(); // منع أي سلوك افتراضي للزر
            if (sidebar) {
                if (window.innerWidth > 991) {
                    sidebar.classList.toggle('collapsed');
                } else {
                    sidebar.classList.toggle('sidebar-open');
                }
            }
            return; // إنهاء التنفيذ هنا لتجنب تداخل النقرات
        }

        // 2. إغلاق القائمة الجانبية في الجوال عند النقر خارجها
        if (window.innerWidth <= 991 && sidebar && sidebar.classList.contains('sidebar-open')) {
            // إذا كانت النقرة ليست بداخل القائمة الجانبية وليست على زر الفتح
            if (!e.target.closest('#sidebar') && !e.target.closest('#sidebarToggle')) {
                sidebar.classList.remove('sidebar-open');
            }
        }

        // 3. إصلاح القوائم الفرعية (Submenus) ودعم إمكانية الوصول
        const submenuLink = e.target.closest('.has-submenu > a');
        if (submenuLink) {
            e.preventDefault();
            const parentLi = submenuLink.parentElement;
            
            // إغلاق باقي القوائم المفتوحة لترتيب العرض
            document.querySelectorAll('.has-submenu').forEach(el => {
                if (el !== parentLi) {
                    el.classList.remove('submenu-open');
                    const link = el.querySelector('a');
                    if (link) link.setAttribute('aria-expanded', 'false');
                }
            });
            
            // فتح/إغلاق الفرع الحالي وتحديث حالة الـ aria
            const isOpen = parentLi.classList.toggle('submenu-open');
            submenuLink.setAttribute('aria-expanded', isOpen);
        }

        // 4. ربط زر تسجيل الخروج بمحرك المصادقة الحقيقي (Supabase Auth)
        const logoutBtn = e.target.closest('#logoutBtn');
        if (logoutBtn) {
            e.preventDefault();
            console.log("🔒 [App] جاري تسجيل الخروج الآمن وإنهاء الجلسة...");

            // تعطيل الزر مؤقتاً لمنع تكرار النقرات أثناء الاتصال بالخادم
            logoutBtn.style.pointerEvents = 'none';

            try {
                // الاعتماد على المحرك المركزي لإنهاء الجلسة بشكل حقيقي
                if (window.TeraAuth && typeof window.TeraAuth.logout === 'function') {
                    await window.TeraAuth.logout();
                } else {
                    // إجراء احتياطي: مسح التخزين المحلي والتوجيه بالمسار المطلق
                    console.warn("⚠️ [App] محرك TeraAuth غير متوفر، سيتم فرض التوجيه الاحتياطي.");
                    localStorage.removeItem('tera_token');
                    localStorage.removeItem('tera_user');
                    sessionStorage.clear();
                    window.location.replace('/auth/auth/login/login.html');
                }
            } catch (error) {
                console.error('❌ [App] خطأ أثناء تسجيل الخروج:', error);
                // فرض الخروج أمنياً في حال فشل الاتصال بخادم Supabase
                window.location.replace('/auth/auth/login/login.html');
            }
        }
    });
});
