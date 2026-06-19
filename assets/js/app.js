/* ============================================================
   TERA INVESTOR PORTAL - APP.JS (حل مشكلة توقف الأزرار)
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    // استخدام تفويض الأحداث على مستوى الـ document بالكامل
    // هذا يضمن عمل الأزرار حتى لو تم تحميل الـ HTML ديناميكياً
    document.addEventListener('click', function(e) {
        
        // 1. إصلاح زر القائمة الجانبية (Sidebar Toggle)
        const toggleBtn = e.target.closest('#sidebarToggle');
        if (toggleBtn) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                if (window.innerWidth > 991) {
                    sidebar.classList.toggle('collapsed');
                } else {
                    sidebar.classList.toggle('sidebar-open');
                }
            }
        }

        // 2. إصلاح القوائم الفرعية (Submenus)
        const submenuLink = e.target.closest('.has-submenu > a');
        if (submenuLink) {
            e.preventDefault();
            const parentLi = submenuLink.parentElement;
            
            // إغلاق باقي القوائم المفتوحة لترتيب العرض
            document.querySelectorAll('.has-submenu').forEach(el => {
                if (el !== parentLi) el.classList.remove('submenu-open');
            });
            
            // فتح/إغلاق الفرع الحالي
            parentLi.classList.toggle('submenu-open');
        }

        // 3. زر تسجيل الخروج
        if (e.target.closest('#logoutBtn')) {
            console.log("جاري تسجيل الخروج...");
            // أضف منطق تسجيل الخروج هنا
        }
    });
});
