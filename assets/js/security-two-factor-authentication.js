/**
 * security-two-factor-authentication.js – v3 (آمن مع معالجة أخطاء محسّنة)
 */
(function() {
    'use strict';

    async function renderTOTPUI(containerId) {
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
            container.innerHTML = `<p style="color:var(--danger);">تعذر تحميل حالة المصادقة: ${e.message}</p>`;
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

    async function startSetup() {
        const setupArea = document.getElementById('setupArea');
        if (!setupArea) return;
        setupArea.style.display = 'block';
        setupArea.innerHTML = '<p style="text-align:center"><i class="fas fa-spinner fa-spin"></i> جاري الإعداد...</p>';

        try {
            const data = await window.Auth.setupTwoFactor();
            // التحقق من وجود البيانات المطلوبة
            if (!data || !data.qr_code || !data.manual_key || !Array.isArray(data.backup_codes)) {
                throw new Error('استجابة غير مكتملة من الخادم');
            }

            setupArea.innerHTML = `
                <div style="background:#f0fdf4; padding:16px; border-radius:12px; border:1px solid #bbf7d0;">
                    <p><strong>الخطوة 1:</strong> امسح رمز QR أو أدخل المفتاح يدوياً في تطبيق المصادقة.</p>
                    <img src="${data.qr_code}" alt="QR Code" style="display:block; margin:10px auto; max-width:200px;"/>
                    <p style="font-size:12px; word-break:break-all;">المفتاح اليدوي: <code>${data.manual_key}</code></p>
                    <p style="margin-top:10px;"><strong>رموز الاسترداد (احفظها بأمان):</strong><br>
                    <code>${data.backup_codes.join('<br>')}</code></p>
                </div>
                <div style="margin-top:16px;">
                    <label>الخطوة 2: أدخل رمز التحقق من التطبيق:</label>
                    <input type="text" id="totpToken" class="form-input-control" placeholder="XXXXXX" maxlength="6" autocomplete="off" style="width:120px; text-align:center; font-size:20px; letter-spacing:4px;"/>
                    <button class="btn-action" id="verifyTokenBtn" style="margin-right:10px;">تفعيل</button>
                    <p id="verifyError" style="color:var(--danger); display:none; margin-top:8px;">الرمز غير صحيح. حاول مرة أخرى.</p>
                </div>
            `;
            document.getElementById('verifyTokenBtn').addEventListener('click', verifyAndEnable);
        } catch (e) {
            setupArea.innerHTML = `<p style="color:var(--danger);">فشل الإعداد: ${e.message}</p>`;
        }
    }

    async function verifyAndEnable() {
        const token = document.getElementById('totpToken').value.trim();
        const errorEl = document.getElementById('verifyError');
        if (!token || token.length !== 6) {
            errorEl.style.display = 'block';
            return;
        }
        errorEl.style.display = 'none';

        try {
            await window.Auth.enableTwoFactor(token);
            if (window.UIHelpers?.showToast) window.UIHelpers.showToast('تم تفعيل المصادقة الثنائية بنجاح!', 'success');
            else alert('تم تفعيل المصادقة الثنائية بنجاح!');
            renderTOTPUI('totp-container');
        } catch (e) {
            errorEl.style.display = 'block';
            errorEl.textContent = e.message;
        }
    }

    async function handleDisable() {
        const code = prompt('أدخل رمز المصادقة الثنائية للتعطيل:');
        if (!code) return;
        try {
            await window.Auth.disableTwoFactor(code);
            if (window.UIHelpers?.showToast) window.UIHelpers.showToast('تم تعطيل المصادقة الثنائية.', 'info');
            else alert('تم تعطيل المصادقة الثنائية.');
            renderTOTPUI('totp-container');
        } catch (e) {
            alert('فشل التعطيل: ' + e.message);
        }
    }

    window.TwoFactorAuth = {
        render: renderTOTPUI
    };
})();
