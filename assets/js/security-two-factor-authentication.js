/**
 * security-two-factor-authentication.js (إصدار نهائي مُصلح)
 * يعتمد على:
 *   - window.Auth (من auth.js v20) للتحقق من الجلسة واستدعاءات 2FA
 *   - window.SessionManager (اختياري) لإدارة الجلسة
 *
 * تم دمج API + UI + Actions في ملف واحد لتجنب مشاكل الاعتماديات.
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
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMin = Math.floor((now - d) / 60000);
        if (diffMin < 1) return 'الآن';
        if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
        const diffHrs = Math.floor(diffMin / 60);
        if (diffHrs < 24) return `منذ ${diffHrs} ساعة`;
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays < 7) return `منذ ${diffDays} يوم`;
        if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
        return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function showToast(message, type = '') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function showModal(title, bodyHTML, footerHTML = '') {
        if (!modalContainer) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <h3>${title}</h3>
                <div>${bodyHTML}</div>
                ${footerHTML ? `<div class="btn-group" style="margin-top:16px;">${footerHTML}</div>` : ''}
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
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
        return await window.Auth.setupTwoFactor();
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

    // ========== عرض المكونات ==========
    function renderEducationalSection() {
        return `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-question-circle"></i> ما هي المصادقة الثنائية؟</h3>
            </div>
            <p style="margin:0; color:var(--gray-700);">
                المصادقة الثنائية (2FA) هي طبقة حماية إضافية لحسابك. بعد تفعيلها، لن يتمكن أي شخص من تسجيل الدخول إلى حسابك حتى لو عرف كلمة المرور، إلا باستخدام رمز تحقق مؤقت يتم إنشاؤه داخل تطبيق المصادقة على جهازك.
            </p>
        </div>
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-list-ol"></i> كيفية التفعيل</h3>
            </div>
            <div class="steps-container">
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <strong>ثبّت تطبيق المصادقة</strong>
                        <p>حمّل أحد تطبيقات المصادقة على هاتفك:</p>
                        <div class="app-links">
                            <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="fab fa-google-play"></i> Google Authenticator</a>
                            <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="fab fa-apple"></i> iOS</a>
                            <a href="https://play.google.com/store/apps/details?id=com.azure.authenticator" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Microsoft Authenticator</a>
                            <a href="https://authy.com/download/" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Authy</a>
                            <a href="https://bitwarden.com/download/" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Bitwarden Authenticator</a>
                        </div>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <strong>اضغط "تفعيل المصادقة الثنائية"</strong>
                        <p>ستجد الزر في قسم الإجراءات أدناه.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <strong>سيظهر لك رمز QR ومفتاح يدوي</strong>
                        <p>رمز QR للاستخدام السهل، والمفتاح اليدوي كحل بديل.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <strong>افتح تطبيق المصادقة وأضف حساباً جديداً</strong>
                        <p>اختر "مسح رمز QR" ووجّه الكاميرا إلى الشاشة. أو اختر "إدخال المفتاح يدوياً".</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">5</div>
                    <div class="step-content">
                        <strong>سيبدأ التطبيق بإظهار رمز مكون من 6 أرقام</strong>
                        <p>يتغير الرمز تلقائياً كل 30 ثانية.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">6</div>
                    <div class="step-content">
                        <strong>أدخل الرمز في المنصة واضغط "تأكيد التفعيل"</strong>
                        <p>بعد التحقق الناجح سيتم تفعيل المصادقة الثنائية.</p>
                    </div>
                </div>
            </div>
            <div style="margin-top:16px; padding:12px; background:#fffbeb; border-radius:8px; border:1px solid #fde68a;">
                <i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i>
                <strong>ملاحظات مهمة:</strong>
                <ul style="margin:8px 0 0 16px; font-size:14px; color:var(--gray-700);">
                    <li>لا تشارك رمز QR أو المفتاح اليدوي مع أي شخص.</li>
                    <li>احتفظ برموز الاسترداد (Backup Codes) في مكان آمن.</li>
                    <li>في حال تغيير هاتفك، انقل حسابات تطبيق المصادقة أو أعد الإعداد من هنا.</li>
                </ul>
            </div>
        </div>`;
    }

    function renderStatusBadge() {
        return `
            <span class="status-badge ${state.isEnabled ? 'active' : 'inactive'}">
                <span class="status-dot ${state.isEnabled ? 'green' : 'gray'}"></span>
                ${state.isEnabled ? 'مفعلة' : 'غير مفعلة'}
            </span>`;
    }

    function renderInfoGrid() {
        const s = state;
        const rows = [
            { label: 'طريقة المصادقة', value: s.method || '—' },
            { label: 'تطبيق المصادقة', value: s.isEnabled ? 'Google Authenticator / متوافق' : '—' },
            { label: 'تاريخ التفعيل', value: formatDateTime(s.enabledAt) },
            { label: 'آخر استخدام ناجح', value: formatDate(s.lastUsedAt) },
            { label: 'آخر محاولة فاشلة', value: formatDate(s.lastFailedAt) || 'لا توجد' },
            { label: 'رموز الاسترداد المتبقية', value: s.isEnabled ? `<strong>${s.backupCodesRemaining}</strong> / 10` : '—' }
        ];
        return rows.map(r => `
            <div class="info-item">
                <div class="info-label">${r.label}</div>
                <div class="info-value">${r.value}</div>
            </div>`).join('');
    }

    function renderTrustedDevices() {
        const devices = state.trustedDevices || [];
        if (devices.length === 0) return '<p style="color:var(--gray-500);text-align:center;padding:12px;">لا توجد أجهزة موثوقة حالياً.</p>';
        const rows = devices.map(d => `
            <tr>
                <td><div class="device-icon"><i class="fas fa-${d.device_type === 'mobile' ? 'mobile-alt' : d.device_type === 'tablet' ? 'tablet-alt' : 'laptop'}"></i></div></td>
                <td><strong>${d.device_name || 'جهاز غير معروف'}</strong>${d.is_current ? '<span class="device-current-badge">الحالي</span>' : ''}</td>
                <td>${d.browser || '—'}</td>
                <td>${formatDate(d.last_used_at)}</td>
                <td dir="ltr" style="font-size:12px;">${d.last_ip || '—'}</td>
                <td>${d.location || '—'}</td>
                <td>${!d.is_current ? `<button class="btn-remove-device" onclick="window.TwoFactorUI.removeDevice('${d.id}')"><i class="fas fa-times-circle"></i></button>` : '<span style="color:var(--gray-400);">—</span>'}</td>
            </tr>`).join('');
        return `<div style="overflow-x:auto;"><table class="devices-table">
            <thead><tr><th>الجهاز</th><th>الاسم</th><th>المتصفح</th><th>آخر استخدام</th><th>آخر IP</th><th>الموقع</th><th>إجراء</th></tr></thead>
            <tbody>${rows}</tbody></table></div>`;
    }

    function renderActivityLog() {
        const log = state.activityLog || [];
        if (log.length === 0) return '<p style="color:var(--gray-500);text-align:center;padding:12px;">لا توجد عمليات مسجلة حتى الآن.</p>';
        return log.map(entry => {
            let iconClass = 'info', iconSymbol = 'fa-info-circle';
            if (entry.type === 'success' || entry.type === 'enabled' || entry.type === 'login_success') {
                iconClass = 'success'; iconSymbol = 'fa-check-circle';
            } else if (entry.type === 'fail' || entry.type === 'disabled' || entry.type === 'login_fail') {
                iconClass = 'fail'; iconSymbol = 'fa-times-circle';
            } else if (entry.type === 'warning' || entry.type === 'locked') {
                iconClass = 'warning'; iconSymbol = 'fa-exclamation-triangle';
            }
            return `<div class="log-entry">
                <div class="log-icon ${iconClass}"><i class="fas ${iconSymbol}"></i></div>
                <div class="log-details"><div class="log-action">${entry.action}</div><div class="log-meta">${entry.details || ''} ${entry.ip ? '· IP: ' + entry.ip : ''}</div></div>
                <div class="log-time">${formatDate(entry.timestamp)}</div>
            </div>`;
        }).join('');
    }

    function renderNotificationToggles() {
        const toggles = [
            { id: 'notify_2fa_enabled', label: 'تفعيل المصادقة الثنائية', checked: true },
            { id: 'notify_2fa_disabled', label: 'تعطيل المصادقة الثنائية', checked: true },
            { id: 'notify_backup_regenerated', label: 'إعادة إنشاء رموز الاسترداد', checked: true },
            { id: 'notify_totp_login', label: 'تسجيل الدخول باستخدام TOTP', checked: true },
            { id: 'notify_backup_used', label: 'استخدام رمز استرداد', checked: true },
            { id: 'notify_new_device', label: 'تسجيل الدخول من جهاز جديد', checked: true },
            { id: 'notify_password_lock', label: 'تجاوز عدد محاولات كلمة المرور', checked: true },
            { id: 'notify_device_trust_change', label: 'تغيير الجهاز الموثوق', checked: true }
        ];
        return toggles.map(t => `
            <div class="notification-toggle">
                <span>${t.label}</span>
                <label class="toggle-switch">
                    <input type="checkbox" ${t.checked ? 'checked' : ''} data-notify-id="${t.id}">
                    <span class="toggle-slider"></span>
                </label>
            </div>`).join('');
    }

    function renderFullPage() {
        if (!mainContent) return;
        if (state.isLoading) {
            mainContent.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> جاري تحميل إعدادات المصادقة...</div>';
            return;
        }
        const isEnabled = state.isEnabled;
        mainContent.innerHTML = `
            ${renderEducationalSection()}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-toggle-on"></i> حالة المصادقة الثنائية</h3>${renderStatusBadge()}</div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> معلومات عامة</h3></div>
                <div class="info-grid">${renderInfoGrid()}</div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-laptop-house"></i> الأجهزة الموثوقة</h3></div>
                ${renderTrustedDevices()}
            </div>
            <div class="card no-print">
                <div class="card-header"><h3><i class="fas fa-cogs"></i> إجراءات</h3></div>
                <div class="btn-group">
                    ${!isEnabled ? `
                        <button class="btn btn-primary" onclick="window.TwoFactorUI.showSetupWizard()"><i class="fas fa-shield-alt"></i> تفعيل المصادقة الثنائية</button>
                    ` : `
                        <button class="btn btn-outline" onclick="window.TwoFactorUI.showRegenerateCodes()"><i class="fas fa-sync-alt"></i> إنشاء رموز استرداد جديدة</button>
                        <button class="btn btn-outline" onclick="window.TwoFactorUI.downloadBackupCodes()"><i class="fas fa-download"></i> تنزيل رموز الاسترداد</button>
                        <button class="btn btn-danger" onclick="window.TwoFactorUI.confirmDisable()"><i class="fas fa-shield-slash"></i> تعطيل المصادقة الثنائية</button>
                    `}
                </div>
            </div>
            ${isEnabled ? `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-key"></i> رموز الاسترداد (Backup Codes)</h3></div>
                <div class="info-grid">
                    <div class="info-item"><div class="info-label">الرموز المتبقية</div><div class="info-value">${state.backupCodesRemaining} / 10</div></div>
                    <div class="info-item"><div class="info-label">آخر استخدام</div><div class="info-value">${formatDate(state.backupCodesLastUsed) || 'لم تُستخدم بعد'}</div></div>
                </div>
                <p style="font-size:13px;color:var(--gray-500);margin-top:12px;"><i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i> احفظ هذه الرموز في مكان آمن. كل رمز صالح للاستخدام مرة واحدة فقط.</p>
            </div>` : ''}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-history"></i> سجل العمليات</h3></div>
                <div class="activity-log">${renderActivityLog()}</div>
            </div>
            <div class="card no-print">
                <div class="card-header"><h3><i class="fas fa-bell"></i> تفضيلات الإشعارات</h3></div>
                ${renderNotificationToggles()}
            </div>`;
    }

    // ========== الإجراءات ==========
    async function loadData() {
        state.isLoading = true;
        renderFullPage();
        try {
            const data = await fetchStatus();
            console.log('بيانات 2FA:', data);
            state.isEnabled = data?.is_enabled || false;
            state.method = data?.method || (data?.is_enabled ? 'TOTP' : null);
            state.enabledAt = data?.enabled_at || null;
            state.lastUsedAt = data?.last_used_at || null;
            state.lastFailedAt = data?.last_failed_at || null;
            state.backupCodesRemaining = data?.backup_codes_remaining || 0;
            state.backupCodesLastUsed = data?.backup_codes_last_used || null;
            state.trustedDevices = data?.trusted_devices || [];
            state.activityLog = data?.activity_log || [];
        } catch (err) {
            console.error('فشل تحميل إعدادات 2FA:', err);
            showToast('تعذر تحميل إعدادات المصادقة الثنائية.', 'error');
        } finally {
            state.isLoading = false;
            renderFullPage();
        }
    }

    async function showSetupWizard() {
        try {
            const secretData = await setupTwoFactor();
            state.pendingSetupSecret = secretData.secret;
            const qrHTML = secretData.qr_data_uri
                ? `<img src="${secretData.qr_data_uri}" alt="QR Code" style="max-width:200px;">`
                : `<p style="color:var(--gray-500);">تعذر تحميل رمز QR. استخدم المفتاح اليدوي.</p>`;

            showModal(
                'تفعيل المصادقة الثنائية',
                `<div style="background:#fffbeb; padding:10px; border-radius:8px; margin-bottom:16px; border:1px solid #fde68a;">
                    <i class="fas fa-exclamation-circle" style="color:var(--warning);"></i>
                    <strong>تنبيه:</strong> رمز QR والمفتاح اليدوي يظهران مرة واحدة فقط. احفظ رموز الاسترداد جيداً.
                </div>
                <p>امسح رمز QR باستخدام تطبيق المصادقة.</p>
                <div class="qr-container">${qrHTML}</div>
                <p style="font-size:13px;color:var(--gray-500);">أو أدخل المفتاح اليدوي:</p>
                <div class="manual-key">${secretData.secret}</div>
                <p style="font-size:13px;color:var(--gray-500);">
                    <i class="fas fa-user"></i> ${secretData.account || 'المستخدم'}<br>
                    <i class="fas fa-building"></i> ${secretData.issuer || 'تيرا'}
                </p>
                <label for="totp-verify-input" style="display:block;font-weight:700;margin-top:12px;">أدخل رمز التحقق من التطبيق:</label>
                <input type="text" id="totp-verify-input" class="form-input-control" maxlength="6" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" placeholder="000000" style="margin:8px auto;display:block;max-width:160px;font-size:22px;letter-spacing:6px;">
                <p id="setup-error" style="color:var(--danger);font-size:13px;display:none;margin-top:8px;"></p>`,
                `<button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">إلغاء</button>
                <button class="btn btn-primary" onclick="window.TwoFactorUI.verifyAndEnable()">تحقق وتفعيل</button>`
            );
        } catch (err) {
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
                errorEl.textContent = err.message || 'حدث خطأ غير معروف. حاول مرة أخرى.';
                errorEl.style.display = 'block';
            }
        }
    }

    function showBackupCodesModal(codes) {
        if (!codes || codes.length === 0) return;
        const codesHTML = codes.map(c => `<span class="backup-code">${c}</span>`).join('');
        showModal('رموز الاسترداد الخاصة بك',
            `<p style="color:var(--danger);font-weight:700;">احفظ هذه الرموز في مكان آمن. لن تظهر مرة أخرى!</p>
            <div class="backup-codes-grid">${codesHTML}</div>`,
            `<button class="btn btn-primary" onclick="window.TwoFactorUI.downloadBackupCodesInline('${encodeURIComponent(JSON.stringify(codes))}')"><i class="fas fa-download"></i> تنزيل</button>
            <button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">تم الحفظ</button>`
        );
    }

    function downloadBackupCodesInline(encodedCodes) {
        const codes = JSON.parse(decodeURIComponent(encodedCodes));
        const text = codes.join('\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
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
                const text = result.backup_codes.join('\n');
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
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

    // ========== تصدير الدوال العامة ==========
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

    // ========== بدء التشغيل بعد التحقق من الجلسة ==========
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
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
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
