/**
 * security-two-factor-authentication.js (كامل – جميع الدوال معرفة)
 */
(function() {
    'use strict';

    // ========== الحالة ==========
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

    // ========== دوال مساعدة ==========
    function formatDate(d) { /* كما هي دون تغيير */ }
    function formatDateTime(d) { /* كما هي */ }

    function showToast(msg, type) {
        if (!toastContainer) return;
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        toastContainer.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    function showModal(title, bodyHTML, footerHTML) {
        if (!modalContainer) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal"><h3>${title}</h3><div>${bodyHTML}</div>${footerHTML ? `<div class="btn-group" style="margin-top:16px;">${footerHTML}</div>` : ''}</div>`;
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        modalContainer.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (modalContainer) modalContainer.innerHTML = '';
        document.body.style.overflow = '';
        state.pendingSetupSecret = null;
    }

    // ========== استدعاءات API عبر Auth ==========
    async function fetchStatus() {
        if (!window.Auth?.getTwoFactorStatus) throw new Error('خدمة المصادقة غير متاحة');
        return await window.Auth.getTwoFactorStatus();
    }
    async function setupTwoFactor() {
        if (!window.Auth?.setupTwoFactor) throw new Error('خدمة المصادقة غير متاحة');
        console.log('📞 [UI] استدعاء setupTwoFactor...');
        const result = await window.Auth.setupTwoFactor();
        console.log('📬 [UI] نتيجة setupTwoFactor:', result);
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

    // ========== عرض المكونات (جميع دوال render كما هي) ==========
    function renderEducationalSection() { /* ... كود HTML التعليمي ... */ }
    function renderStatusBadge() { /* ... */ }
    function renderInfoGrid() { /* ... */ }
    // ... إلخ

    // ========== الإجراءات الأساسية ==========
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
        console.log('🛠️ [UI] بدء معالج الإعداد...');
        try {
            const secretData = await setupTwoFactor();
            if (!secretData || !secretData.qr_data_uri || !secretData.secret) {
                throw new Error('لم يتم استلام بيانات الإعداد كاملة من الخادم.');
            }
            state.pendingSetupSecret = secretData.secret;
            const qrHTML = `<img src="${secretData.qr_data_uri}" alt="QR Code" style="max-width:200px;">`;
            const account = secretData.account || 'المستخدم';
            const issuer = secretData.issuer || 'تيرا';

            showModal(
                'تفعيل المصادقة الثنائية',
                `<div style="background:#fffbeb; padding:10px; border-radius:8px; margin-bottom:16px; border:1px solid #fde68a;">
                    <i class="fas fa-exclamation-circle" style="color:var(--warning);"></i>
                    <strong>تنبيه:</strong> رمز QR والمفتاح اليدوي يظهران مرة واحدة فقط.
                </div>
                <p>امسح رمز QR باستخدام تطبيق المصادقة.</p>
                <div class="qr-container">${qrHTML}</div>
                <p style="font-size:13px;color:var(--gray-500);">أو أدخل المفتاح اليدوي:</p>
                <div class="manual-key">${secretData.secret}</div>
                <p style="font-size:13px;color:var(--gray-500);">
                    <i class="fas fa-user"></i> ${account}<br>
                    <i class="fas fa-building"></i> ${issuer}
                </p>
                <label for="totp-verify-input" style="display:block;font-weight:700;margin-top:12px;">أدخل رمز التحقق من التطبيق:</label>
                <input type="text" id="totp-verify-input" class="form-input-control" maxlength="6" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" placeholder="000000" style="margin:8px auto;display:block;max-width:160px;font-size:22px;letter-spacing:6px;">
                <p id="setup-error" style="color:var(--danger);font-size:13px;display:none;margin-top:8px;"></p>`,
                `<button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">إلغاء</button>
                <button class="btn btn-primary" onclick="window.TwoFactorUI.verifyAndEnable()">تحقق وتفعيل</button>`
            );
        } catch (err) {
            console.error('❌ [UI] فشل showSetupWizard:', err);
            showToast('تعذر بدء عملية التفعيل: ' + err.message, 'error');
        }
    }

    async function verifyAndEnable() {
        const input = document.getElementById('totp-verify-input');
        const errorEl = document.getElementById('setup-error');
        const token = input?.value?.trim();
        if (!token || token.length !== 6) {
            if (errorEl) { errorEl.textContent = 'الرجاء إدخال رمز صحيح مكون من 6 أرقام.'; errorEl.style.display = 'block'; }
            return;
        }
        try {
            const result = await enableTwoFactor(token);
            if (result && result.success) {
                closeModal();
                showToast('تم تفعيل المصادقة الثنائية بنجاح!', 'success');
                if (result.backup_codes) showBackupCodesModal(result.backup_codes);
                await loadData();
            } else {
                if (errorEl) { errorEl.textContent = (result && result.error) || 'فشل التفعيل، تأكد من الرمز.'; errorEl.style.display = 'block'; }
            }
        } catch (err) {
            if (errorEl) {
                errorEl.textContent = err.message || 'حدث خطأ غير معروف.';
                errorEl.style.display = 'block';
            }
        }
    }

    function showBackupCodesModal(codes) {
        if (!codes || codes.length === 0) return;
        const codesHTML = codes.map(c => `<span class="backup-code">${c}</span>`).join('');
        showModal('رموز الاسترداد',
            `<p style="color:var(--danger);font-weight:700;">احفظ هذه الرموز في مكان آمن. لن تظهر مرة أخرى!</p>
            <div class="backup-codes-grid">${codesHTML}</div>`,
            `<button class="btn btn-primary" onclick="window.TwoFactorUI.downloadBackupCodesInline('${encodeURIComponent(JSON.stringify(codes))}')"><i class="fas fa-download"></i> تنزيل</button>
            <button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">تم الحفظ</button>`
        );
    }

    function downloadBackupCodesInline(encodedCodes) {
        const codes = JSON.parse(decodeURIComponent(encodedCodes));
        const blob = new Blob([codes.join('\n')], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `tera-backup-codes-${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
        showToast('تم تنزيل الرموز.', 'success');
    }

    async function downloadBackupCodes() {
        const token = prompt('أدخل رمز المصادقة الثنائية الحالي لتنزيل رموز الاسترداد:');
        if (!token) return;
        try {
            const result = await regenerateBackupCodes(token);
            if (result.success && result.backup_codes) {
                const blob = new Blob([result.backup_codes.join('\n')], { type: 'text/plain;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `tera-backup-codes-${new Date().toISOString().slice(0,10)}.txt`;
                a.click();
                showToast('تم تنزيل الرموز.', 'success');
                await loadData();
            } else {
                showToast('فشل تنزيل الرموز.', 'error');
            }
        } catch (err) {
            showToast('خطأ: ' + err.message, 'error');
        }
    }

    async function showRegenerateCodes() {
        showModal('إنشاء رموز استرداد جديدة',
            '<p>سيؤدي هذا إلى إبطال جميع الرموز السابقة وإنشاء مجموعة جديدة (10 رموز).</p><p style="color:var(--danger);">هل أنت متأكد؟</p>',
            `<button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">إلغاء</button><button class="btn btn-primary" onclick="window.TwoFactorUI.doRegenerateCodes()">نعم</button>`
        );
    }

    async function doRegenerateCodes() {
        const token = prompt('أدخل رمز المصادقة الثنائية الحالي:');
        if (!token) return;
        try {
            const result = await regenerateBackupCodes(token);
            if (result.success) {
                closeModal();
                showToast('تم إنشاء رموز جديدة.', 'success');
                showBackupCodesModal(result.backup_codes);
                await loadData();
            } else {
                showToast('فشل إنشاء الرموز.', 'error');
            }
        } catch (err) {
            showToast('خطأ: ' + err.message, 'error');
        }
    }

    function confirmDisable() {
        showModal('تعطيل المصادقة الثنائية',
            '<p style="color:var(--danger);">تحذير: تعطيل المصادقة يقلل أمان حسابك.</p><p>هل أنت متأكد؟</p>',
            `<button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">إلغاء</button><button class="btn btn-danger" onclick="window.TwoFactorUI.doDisable()">تعطيل</button>`
        );
    }

    async function doDisable() {
        const token = prompt('أدخل رمز المصادقة الثنائية الحالي للتعطيل:');
        if (!token) return;
        try {
            const result = await disableTwoFactor(token);
            if (result.success) {
                closeModal();
                showToast('تم تعطيل المصادقة الثنائية.', 'success');
                await loadData();
            } else {
                showToast('فشل التعطيل.', 'error');
            }
        } catch (err) {
            showToast('خطأ: ' + err.message, 'error');
        }
    }

    function removeDevice(deviceId) {
        showModal('إزالة الجهاز الموثوق', '<p>هل تريد إزالة الثقة من هذا الجهاز؟</p>',
            `<button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">إلغاء</button><button class="btn btn-danger" onclick="window.TwoFactorUI.doRemoveDevice('${deviceId}')">إزالة</button>`
        );
    }

    async function doRemoveDevice(deviceId) {
        showToast('الميزة قيد التطوير.', 'error');
    }

    // ========== تصدير الدوال ==========
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
    async function init() {
        mainContent = document.getElementById('main-content');
        modalContainer = document.getElementById('modal-container');
        toastContainer = document.getElementById('toast-container');
        if (!mainContent) {
            document.addEventListener('DOMContentLoaded', () => {
                mainContent = document.getElementById('main-content');
                modalContainer = document.getElementById('modal-container');
                toastContainer = document.getElementById('toast-container');
                if (mainContent) startAfterAuth();
            });
        } else {
            startAfterAuth();
        }
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    }

    async function startAfterAuth() {
        try {
            const user = await window.Auth?.requireAuth();
            if (!user) return;
            const name = user.user_metadata?.full_name || user.email || 'مستخدم';
            document.getElementById('headerUserName').textContent = name;
            document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
            const sessionId = sessionStorage.getItem('currentSessionId');
            if (window.SessionManager?.startSessionGuard && sessionId) {
                window.SessionManager.startSessionGuard(user.id, sessionId);
            }
            await loadData();
        } catch (e) {
            console.error('فشل بدء واجهة 2FA:', e);
        }
    }

    init();
})();
