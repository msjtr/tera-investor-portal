/**
 * security-two-factor-authentication.js (إصدار معزز مع تشخيص)
 * يعتمد على:
 *   - window.Auth (من auth.js v20.1) للتحقق من الجلسة واستدعاءات 2FA
 *   - window.SessionManager (اختياري) لإدارة الجلسة
 */
(function() {
    'use strict';

    const state = {
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
        pendingSetupSecret: null
    };

    let mainContent, modalContainer, toastContainer;

    // ────────────── دوال مساعدة ──────────────
    function formatDate(d) { /* ... كما هي ... */ }
    function formatDateTime(d) { /* ... كما هي ... */ }

    function showToast(msg, type) {
        if (!toastContainer) return;
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        toastContainer.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    function showModal(title, bodyHTML, footerHTML) { /* ... كما هي ... */ }
    function closeModal() { /* ... */ }

    // ────────────── API calls ──────────────
    async function fetchStatus() {
        if (!window.Auth?.getTwoFactorStatus) throw new Error('خدمة المصادقة غير متاحة');
        return await window.Auth.getTwoFactorStatus();
    }

    async function setupTwoFactor() {
        if (!window.Auth?.setupTwoFactor) throw new Error('خدمة المصادقة غير متاحة');
        console.log('📞 [2FA UI] استدعاء setupTwoFactor...');
        const result = await window.Auth.setupTwoFactor();
        console.log('📬 [2FA UI] نتيجة setupTwoFactor:', result);
        return result;
    }

    async function enableTwoFactor(code) {
        if (!window.Auth?.enableTwoFactor) throw new Error('خدمة المصادقة غير متاحة');
        return await window.Auth.enableTwoFactor(code);
    }

    async function disableTwoFactor(code) {
        if (!window.Auth?.disableTwoFactor) throw new Error('خدمة المصادقة غير متاحة');
        return await window.Auth.disableTwoFactor(code);
    }

    async function regenerateBackupCodes(code) {
        if (!window.Auth?.regenerateBackupCodes) throw new Error('خدمة المصادقة غير متاحة');
        return await window.Auth.regenerateBackupCodes(code);
    }

    // ────────────── عرض الأقسام ──────────────
    // ... (جميع دوال render كما هي دون تغيير) ...
    // لتجنب التكرار، يُفترض وجودها بنفس الكود السابق

    // ────────────── الإجراءات الأساسية ──────────────
    async function loadData() {
        state.isLoading = true;
        renderFullPage();
        try {
            const data = await fetchStatus();
            console.log('بيانات 2FA:', data);
            Object.assign(state, {
                isEnabled: data?.is_enabled || false,
                method: data?.method || (data?.is_enabled ? 'TOTP' : null),
                enabledAt: data?.enabled_at || null,
                lastUsedAt: data?.last_used_at || null,
                lastFailedAt: data?.last_failed_at || null,
                backupCodesRemaining: data?.backup_codes_remaining || 0,
                backupCodesLastUsed: data?.backup_codes_last_used || null,
                trustedDevices: data?.trusted_devices || [],
                activityLog: data?.activity_log || []
            });
        } catch (err) {
            console.error(err);
            showToast('تعذر تحميل إعدادات المصادقة.', 'error');
        } finally {
            state.isLoading = false;
            renderFullPage();
        }
    }

    async function showSetupWizard() {
        console.log('🛠️ [2FA UI] بدء معالج الإعداد...');
        try {
            const secretData = await setupTwoFactor();
            // التحقق من وجود الحقول الأساسية
            if (!secretData || !secretData.qr_data_uri || !secretData.secret) {
                console.error('❌ [2FA UI] استجابة /setup ناقصة:', secretData);
                throw new Error('لم يتم استلام بيانات الإعداد كاملة من الخادم.');
            }

            state.pendingSetupSecret = secretData.secret;
            const qrHTML = `<img src="${secretData.qr_data_uri}" alt="QR Code" style="max-width:200px;">`;
            const account = secretData.account || 'المستخدم';
            const issuer = secretData.issuer || 'تيرا';

            showModal(
                'تفعيل المصادقة الثنائية',
                `<div style="background:#fffbeb; ...">...</div>
                 ... (محتوى النافذة كما هو) ...
                 <p style="font-size:13px;color:var(--gray-500);">
                     <i class="fas fa-user"></i> ${account}<br>
                     <i class="fas fa-building"></i> ${issuer}
                 </p>
                 ... إلخ`,
                `<button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">إلغاء</button>
                 <button class="btn btn-primary" onclick="window.TwoFactorUI.verifyAndEnable()">تحقق وتفعيل</button>`
            );
            console.log('✅ [2FA UI] نافذة الإعداد جاهزة.');
        } catch (err) {
            console.error('❌ [2FA UI] فشل showSetupWizard:', err);
            showToast('تعذر بدء عملية التفعيل: ' + err.message, 'error');
        }
    }

    // ... (باقي الدوال verifyAndEnable, showBackupCodesModal, ...)

    // ========== التصدير ==========
    window.TwoFactorUI = {
        showSetupWizard,
        verifyAndEnable,
        showRegenerateCodes,
        doRegenerateCodes,
        confirmDisable,
        doDisable,
        removeDevice,
        doRemoveDevice,
        downloadBackupCodes,
        downloadBackupCodesInline,
        closeModal,
        loadData
    };

    // ========== بدء التشغيل ==========
    async function init() { /* ... */ }

    async function startAfterAuth() { /* ... */ }

    init();
})();
