    <!-- السكربتات الأساسية -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="/assets/js/supabase-client.js"></script>
    <script src="/assets/js/auth.js"></script>

    <!-- وحدات النظام -->
    <script src="/assets/js/modules/ui-helpers.js"></script>
    <script src="/assets/js/modules/activity-tracker.js"></script>
    <script src="/assets/js/modules/session-manager.js"></script>

    <!-- سكربت المصادقة الثنائية (النسخة المطورة) -->
    <script src="/assets/js/security-two-factor-authentication.js"></script>

    <!-- بدء تشغيل الواجهة (مع requireAuth) -->
    <script>
        (async function() {
            const user = await window.Auth?.requireAuth();
            if (!user) return;

            const name = user.user_metadata?.full_name || user.email || 'مستخدم';
            document.getElementById('headerUserName').textContent = name;
            document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();

            const sessionId = sessionStorage.getItem('currentSessionId');
            if (window.SessionManager?.startSessionGuard && sessionId) {
                window.SessionManager.startSessionGuard(user.id, sessionId);
            }
            // ملاحظة: واجهة 2FA تُشغَّل تلقائياً من داخل security-two-factor-authentication.js
        })();
    </script>
