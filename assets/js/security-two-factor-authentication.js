/**
 * نقطة الدخول الرئيسية لصفحة إعدادات المصادقة الثنائية
 */
(async function() {
    // التأكد من تحميل جميع الوحدات
    if (!window.TwoFactorAPI || !window.TwoFactorUI || !window.TwoFactorActions) {
        console.error('تعذر تحميل وحدات 2FA');
        return;
    }

    const user = await window.Auth?.requireAuth();
    if (!user) return;

    // تحديث الهيدر
    const name = user.user_metadata?.full_name || user.email || 'مستخدم';
    document.getElementById('headerUserName').textContent = name;
    document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();

    const sessionId = sessionStorage.getItem('currentSessionId');
    if (window.SessionManager?.startSessionGuard && sessionId) {
        window.SessionManager.startSessionGuard(user.id, sessionId);
    }

    // بدء تحميل البيانات
    await window.TwoFactorActions.loadData();
})();
