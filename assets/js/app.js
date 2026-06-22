/* ============================================================
   TERA INVESTOR PORTAL - APP.JS (نسخة محسنة وجاهزة للإطلاق)
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    // استخدام تفويض الأحداث على مستوى الـ document بالكامل
    document.addEventListener('click', function(e) {
        
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
                    if(link) link.setAttribute('aria-expanded', 'false');
                }
            });
            
            // فتح/إغلاق الفرع الحالي وتحديث حالة الـ aria
            const isOpen = parentLi.classList.toggle('submenu-open');
            submenuLink.setAttribute('aria-expanded', isOpen);
        }

        // 4. زر تسجيل الخروج
        if (e.target.closest('#logoutBtn')) {
            e.preventDefault();
            console.log("جاري تسجيل الخروج...");
            // مسار تسجيل الخروج
            // window.location.href = '../auth/login.html'; 
        }
    });
});
