/**
 * مكونات واجهة المستخدم للمصادقة الثنائية
 */
(function() {
    'use strict';

    // دوال مساعدة
    function formatDate(dateStr) { /* ... نفس الكود السابق ... */ }
    function formatDateTime(dateStr) { /* ... نفس الكود السابق ... */ }

    window.TwoFactorUI = {
        // الحالة العامة (مشتركة)
        state: {
            isEnabled: false,
            method: null,
            enabledAt: null,
            lastUsedAt: null,
            lastFailedAt: null,
            backupCodesRemaining: 0,
            backupCodesLastUsed: null,
            trustedDevices: [],
            activityLog: [],
            isLoading: true,
            pendingSetupSecret: null,
        },
        // دوال العرض
        renderEducationalSection() { /* ... نفس الكود ... */ },
        renderStatusBadge() { /* ... */ },
        renderInfoGrid() { /* ... */ },
        renderTrustedDevices() { /* ... */ },
        renderActivityLog() { /* ... */ },
        renderNotificationToggles() { /* ... */ },
        renderFullPage(container) { /* ... */ },
        // دوال الـ UI العامة
        showToast(message, type) { /* ... */ },
        showModal(title, bodyHTML, footerHTML) { /* ... */ },
        closeModal() { /* ... */ },
        // ... (نفس الدوال السابقة بدون استدعاء API)
    };
})();
