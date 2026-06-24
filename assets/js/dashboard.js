/* ============================================================
   TERA INVESTOR PORTAL - DEBUGGED SIDEBAR LOGIC
   ============================================================ */

const Dashboard = {
    init: function() {
        console.log("🚀 Initializing Tera Dashboard...");
        this.initSidebar();
    },

    initSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const closeBtn = document.getElementById('closeSidebarBtn');

        // تتبع الأخطاء: إذا لم نجد العناصر، سنطبع رسالة في الـ Console
        if (!sidebar) console.error("❌ Error: Element with ID 'sidebar' NOT FOUND.");
        if (!toggleBtn) console.error("❌ Error: Element with ID 'sidebarToggle' NOT FOUND.");

        // زر الفتح
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("🟢 Sidebar Toggle Clicked");
                if (window.innerWidth > 991) {
                    sidebar.classList.toggle('collapsed');
                } else {
                    sidebar.classList.add('sidebar-open');
                }
            });
        }

        // زر الإغلاق
        if (closeBtn && sidebar) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("🔴 Sidebar Close Clicked");
                sidebar.classList.remove('sidebar-open');
            });
        }
    }
};

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
