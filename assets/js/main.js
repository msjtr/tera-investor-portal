/**
 * TERA MAIN JS - Controller for Site Interactions
 * هذا الملف مسؤول عن التفاعلات (أزرار، قوائم، نوافذ)
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. القائمة الجانبية: تبديل الحالة (Collapsed)
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('#sidebarToggle');
        if (toggleBtn) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
                // حفظ حالة القائمة في الـ LocalStorage إذا أردت
                localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
            }
        }
    });

    // 2. القوائم الفرعية (Submenus)
    document.addEventListener('click', (e) => {
        const submenuToggle = e.target.closest('.submenu-toggle');
        if (submenuToggle) {
            e.preventDefault();
            const parent = submenuToggle.parentElement;
            
            // إغلاق القوائم الأخرى المفتوحة (اختياري لجمالية التصميم)
            document.querySelectorAll('.menu-item.has-submenu').forEach(item => {
                if (item !== parent) item.classList.remove('active');
            });

            // تبديل حالة القائمة الحالية
            parent.classList.toggle('active');
        }
    });

    // 3. النوافذ المنبثقة (Modals)
    document.addEventListener('click', (e) => {
        // فتح المودال
        const modalTrigger = e.target.closest('[data-toggle="modal"]');
        if (modalTrigger) {
            const targetId = modalTrigger.getAttribute('data-target');
            const modal = document.querySelector(targetId);
            if (modal) modal.style.display = 'flex';
        }

        // إغلاق المودال
        if (e.target.matches('[data-dismiss="modal"]') || e.target.classList.contains('modal')) {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        }
    });

    // 4. استعادة حالة القائمة الجانبية عند تحميل الصفحة
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    const sidebar = document.getElementById('sidebar');
    if (sidebar && isCollapsed) {
        sidebar.classList.add('collapsed');
    }

    console.log('Main Interactions System Ready.');
});
