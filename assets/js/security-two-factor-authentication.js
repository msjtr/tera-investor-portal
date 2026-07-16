/**
 * modules/security-two-factor-authentication.js
 * المصادقة الثنائية (2FA) – آمنة ومتسامحة مع الأخطاء
 * تعتمد على Auth (setupTwoFactor, enableTwoFactor, getTwoFactorStatus, verifyTwoFactor, disableTwoFactor)
 */
(function() {
    'use strict';

    /**
     * عرض واجهة المصادقة الثنائية داخل حاوية محددة
     * @param {string} containerId - id العنصر الحاوي
     */
    async function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // التأكد من توفر الخدمات المطلوبة
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

    // ─── عرض واجهة غير مفعلة ────────────────────────
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

    // ─── عرض واجهة مفعلة ──────────────────────────
    function renderEnabledUI(container, status) {
        container.innerHTML = `
            <div class="totp-card">
                <h4><i class="fas fa-shield-alt"></i> المصادقة الثنائية</h4>
                <p>المصادقة الثنائية <strong>مفعلة</strong>.</p>
                <p>رموز الاسترداد المتبقية: <strong>${status.backup_codes_count || 0}</strong></p>
                ${status.last_verified_at ? `<p>آخر تحقق: ${new Date(status.last_verified_at).toLocaleString('ar-SA')}</p>` : ''}
                <button class="btn-action danger" id="disable2FABtn"><i class="fas fa-unlock-alt"></i> تعطيل المصادقة الثنائية</button>
            </div>
        `;
        document.getElementById('disable2FABtn').addEventListener('click', handleDisable);
    }

    // ─── بدء عملية الإعداد ─────────────────────────
    async function startSetup() {
        const setupArea = document.getElementById('setupArea');
        if (!setupArea) return;
        setupArea.style.display = 'block';
        setupArea.innerHTML = '<p style="text-align:center"><i class="fas fa-spinner fa-spin"></i> جاري الإعداد...</p>';

        try {
            const data = await window.Auth.setupTwoFactor();

            // التحقق من اكتمال البيانات
            const { qr_code, manual_key, backup_codes } = data || {};
            if (!qr_code || !manual_key || !Array.isArray(backup_codes)) {
                throw new Error('استجابة غير مكتملة من الخادم. تأكد من اتصالك وحاول مجدداً.');
            }

            setupArea.innerHTML = `
                <div style="background:#f0fdf4; padding:16px; border-radius:12px; border:1px solid #bbf7d0;">
                    <p><strong>الخطوة 1:</strong> امسح رمز QR أو أدخل المفتاح يدوياً في تطبيق المصادقة (Google Authenticator، Authy، Microsoft Authenticator).</p>
                    <img src="${escapeHtml(qr_code)}" alt="QR Code" style="display:block; margin:10px auto; max-width:200px; border:1px solid #ccc; padding:4px; background:#fff;"/>
                    <p style="font-size:12px; word-break:break-all; margin-top:10px;">المفتاح اليدوي: <code>${escapeHtml(manual_key)}</code></p>
                    <p style="margin-top:10px; font-weight:bold;">رموز الاسترداد (احفظها في مكان آمن – لن تظهر مرة أخرى):</p>
                    <div style="background:#fff; padding:8px; border-radius:6px; font-family:monospace; font-size:13px; max-height:150px; overflow-y:auto;">
                        ${backup_codes.map(c => escapeHtml(c)).join('<br>')}
                    </div>
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

            document.getElementById('verifyTokenBtn').addEventListener('click', verifyAndEnable);
            document.getElementById('totpToken').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') verifyAndEnable();
            });
        } catch (e) {
            setupArea.innerHTML = `<p style="color:var(--danger);">فشل الإعداد: ${escapeHtml(e.message)}</p>`;
        }
    }

    // ─── التحقق من الرمز والتفعيل ──────────────────
    async function verifyAndEnable() {
        const tokenInput = document.getElementById('totpToken');
        const errorEl = document.getElementById('verifyError');
        const token = tokenInput?.value?.trim() || '';

        if (!token || token.length !== 6) {
            if (errorEl) {
                errorEl.style.display = 'block';
                errorEl.textContent = 'يرجى إدخال رمز تحقق مكون من 6 أرقام.';
            }
            return;
        }
        if (errorEl) errorEl.style.display = 'none';

        const btn = document.getElementById('verifyTokenBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التفعيل...';
        }

        try {
            await window.Auth.enableTwoFactor(token);
            showNotification('تم تفعيل المصادقة الثنائية بنجاح!', 'success');
            // إعادة عرض الواجهة بالحالة الجديدة
            await render('totp-container');
        } catch (e) {
            if (errorEl) {
                errorEl.style.display = 'block';
                errorEl.textContent = e.message || 'رمز التحقق غير صحيح. حاول مرة أخرى.';
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'تفعيل';
            }
        }
    }

    // ─── تعطيل المصادقة ────────────────────────────
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

    // ─── دوال مساعدة ──────────────────────────────
    function showNotification(message, type = 'info') {
        if (window.UIHelpers?.showToast) {
            window.UIHelpers.showToast(message, type);
        } else {
            alert(message);
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ─── واجهة عامة ────────────────────────────────
    window.TwoFactorAuth = {
        render
    };
})();
