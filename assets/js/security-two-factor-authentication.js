/**
 * modules/security-two-factor-authentication.js
 * المصادقة الثنائية (2FA) – v4 (متوافقة مع auth.js v18+ ومزايا إضافية)
 * تعتمد على Auth: setupTwoFactor, enableTwoFactor, getTwoFactorStatus, verifyTwoFactor, disableTwoFactor, regenerateBackupCodes
 */
(function() {
    'use strict';

    async function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!window.Auth?.getTwoFactorStatus) {
            container.innerHTML = '<p style="color:var(--danger);">خدمة المصادقة الثنائية غير متاحة حالياً.</p>';
            return;
        }

        try {
            const status = await window.Auth.getTwoFactorStatus();
            if (status && status.two_factor_enabled) {
                renderEnabledUI(container, status);
            } else {
                renderDisabledUI(container);
            }
        } catch (e) {
            container.innerHTML = `<p style="color:var(--danger);">تعذر تحميل حالة المصادقة: ${escapeHtml(e.message)}</p>`;
        }
    }

    function renderDisabledUI(container) {
        container.innerHTML = `
            <div class="totp-card">
                <h4><i class="fas fa-shield-alt"></i> المصادقة الثنائية</h4>
                <p>المصادقة الثنائية غير مفعلة حالياً. قم بتفعيلها لزيادة أمان حسابك.</p>
                <button class="btn-action" id="enable2FABtn"><i class="fas fa-lock"></i> تفعيل المصادقة الثنائية</button>
                <div id="setupArea" style="display:none; margin-top:20px;"></div>
            </div>
        `;
        document.getElementById('enable2FABtn').addEventListener('click', startSetup);
    }

    function renderEnabledUI(container, status) {
        const backupCount = status.backup_codes_count || 0;
        const lastVerified = status.last_verified_at
            ? new Date(status.last_verified_at).toLocaleString('ar-SA')
            : '—';

        container.innerHTML = `
            <div class="totp-card">
                <h4><i class="fas fa-shield-alt"></i> المصادقة الثنائية</h4>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <i class="fas fa-check-circle" style="color:var(--success); font-size:20px;"></i>
                    <strong style="color:var(--success);">مفعلة</strong>
                </div>
                <div style="background:var(--gray-50); border-radius:8px; padding:12px; margin-bottom:16px;">
                    <p style="margin:0 0 6px;"><strong>آخر تحقق ناجح:</strong> ${lastVerified}</p>
                    <p style="margin:0;"><strong>رموز الاسترداد المتبقية:</strong> ${backupCount} / 10</p>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn-action" id="regenerateBackupBtn"><i class="fas fa-redo-alt"></i> إعادة إنشاء رموز الاسترداد</button>
                    <button class="btn-action danger" id="disable2FABtn"><i class="fas fa-unlock-alt"></i> تعطيل المصادقة الثنائية</button>
                </div>
            </div>
        `;

        document.getElementById('disable2FABtn').addEventListener('click', handleDisable);
        document.getElementById('regenerateBackupBtn').addEventListener('click', handleRegenerateBackupCodes);
    }

    async function startSetup() {
        const setupArea = document.getElementById('setupArea');
        if (!setupArea) return;
        setupArea.style.display = 'block';
        setupArea.innerHTML = '<p style="text-align:center"><i class="fas fa-spinner fa-spin"></i> جاري الإعداد...</p>';

        try {
            const data = await window.Auth.setupTwoFactor();
            const { qr_code, manual_key, backup_codes } = data || {};
            if (!qr_code || !manual_key || !Array.isArray(backup_codes)) {
                throw new Error('استجابة غير مكتملة من الخادم. تأكد من اتصالك وحاول مجدداً.');
            }

            setupArea.innerHTML = `
                <div style="background:#f0fdf4; padding:16px; border-radius:12px; border:1px solid #bbf7d0;">
                    <p><strong>الخطوة 1:</strong> امسح رمز QR أو أدخل المفتاح يدوياً في تطبيق المصادقة (Google Authenticator، Authy).</p>
                    <img src="${escapeHtml(qr_code)}" alt="QR Code" style="display:block; margin:10px auto; max-width:200px; border:1px solid #ccc; padding:4px; background:#fff;"/>
                    <p style="font-size:12px; word-break:break-all; margin-top:10px;">المفتاح اليدوي: <code>${escapeHtml(manual_key)}</code></p>
                    <p style="margin-top:10px; font-weight:bold;">رموز الاسترداد (احفظها في مكان آمن – لن تظهر مرة أخرى):</p>
                    <div style="background:#fff; padding:8px; border-radius:6px; font-family:monospace; font-size:13px; max-height:150px; overflow-y:auto;">
                        ${backup_codes.map(c => escapeHtml(c)).join('<br>')}
                    </div>
                    <button class="btn-action" id="downloadBackupCodesBtn" style="margin-top:8px;"><i class="fas fa-download"></i> تنزيل الرموز</button>
                </div>
                <div style="margin-top:16px;">
                    <label>الخطوة 2: أدخل رمز التحقق من التطبيق:</label>
                    <div style="display:flex; gap:10px; align-items:center; margin-top:6px;">
                        <input type="text" id="totpToken" class="form-input-control" placeholder="XXXXXX" maxlength="6" autocomplete="off" style="width:130px; text-align:center; font-size:20px; letter-spacing:4px;"/>
                        <button class="btn-action" id="verifyTokenBtn">تفعيل</button>
                    </div>
                    <p id="verifyError" style="color:var(--danger); display:none; margin-top:8px;"></p>
                </div>
            `;

            // تنزيل الرموز الاحتياطية كملف TXT
            document.getElementById('downloadBackupCodesBtn').addEventListener('click', () => {
                const blob = new Blob([backup_codes.join('\n')], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'tera_backup_codes.txt';
                a.click();
            });

            document.getElementById('verifyTokenBtn').addEventListener('click', verifyAndEnable);
            document.getElementById('totpToken').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') verifyAndEnable();
            });
        } catch (e) {
            setupArea.innerHTML = `<p style="color:var(--danger);">فشل الإعداد: ${escapeHtml(e.message)}</p>`;
        }
    }

    async function verifyAndEnable() {
        const tokenInput = document.getElementById('totpToken');
        const errorEl = document.getElementById('verifyError');
        const token = tokenInput?.value?.trim() || '';

        if (!token || token.length !== 6) {
            if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = 'يرجى إدخال رمز تحقق مكون من 6 أرقام.'; }
            return;
        }
        if (errorEl) errorEl.style.display = 'none';

        const btn = document.getElementById('verifyTokenBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التفعيل...'; }

        try {
            await window.Auth.enableTwoFactor(token);
            showNotification('تم تفعيل المصادقة الثنائية بنجاح!', 'success');
            await render('totp-container');
        } catch (e) {
            if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = e.message || 'رمز التحقق غير صحيح.'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'تفعيل'; }
        }
    }

    async function handleDisable() {
        const code = prompt('أدخل رمز المصادقة الثنائية للتعطيل:');
        if (!code) return;
        try {
            await window.Auth.disableTwoFactor(code);
            showNotification('تم تعطيل المصادقة الثنائية.', 'info');
            await render('totp-container');
        } catch (e) {
            alert('فشل التعطيل: ' + e.message);
        }
    }

    async function handleRegenerateBackupCodes() {
        const code = prompt('أدخل رمز المصادقة الثنائية الحالي لإعادة إنشاء رموز الاسترداد:');
        if (!code) return;
        try {
            // نفترض وجود الدالة في auth.js (أضفناها أدناه)
            const result = await window.Auth.regenerateBackupCodes(code);
            if (result && result.backup_codes) {
                alert('تم إنشاء رموز استرداد جديدة:\n\n' + result.backup_codes.join('\n'));
                await render('totp-container');
            }
        } catch (e) {
            alert('فشل إعادة إنشاء الرموز: ' + e.message);
        }
    }

    function showNotification(message, type = 'info') {
        if (window.UIHelpers?.showToast) window.UIHelpers.showToast(message, type);
        else alert(message);
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    window.TwoFactorAuth = { render };
})();
