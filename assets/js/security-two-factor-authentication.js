/**
 * security-two-factor-authentication.js – واجهة إعدادات 2FA (مُحسَّنة)
 * متوافق مع auth.js v28 وجدول user_2fa
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
        isLoading: true,
        pendingSetupSecret: null,
        userEmail: ''           // البريد الإلكتروني للمستخدم
    };

    let mainContent, modalContainer, toastContainer;

    // ---------- دوال مساعدة ----------
    function formatDate(d) { if(!d) return '—'; const now = Date.now(), diff = now - new Date(d).getTime(), min = Math.floor(diff/60000); if(min<1) return 'الآن'; if(min<60) return `منذ ${min} دقيقة`; const h = Math.floor(min/60); if(h<24) return `منذ ${h} ساعة`; const days = Math.floor(h/24); if(days<7) return `منذ ${days} يوم`; return new Date(d).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}); }
    function formatDateTime(d) { if(!d) return '—'; return new Date(d).toLocaleString('ar-SA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }

    function showToast(m, t) {
        if(!toastContainer) return;
        const el = document.createElement('div');
        el.className = `toast ${t}`;
        el.textContent = m;
        toastContainer.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function showModal(title, body, footer) {
        if(!modalContainer) return;
        const ov = document.createElement('div');
        ov.className = 'modal-overlay';
        ov.innerHTML = `<div class="modal"><h3>${title}</h3><div>${body}</div>${footer?`<div class="btn-group" style="margin-top:16px;">${footer}</div>`:''}</div>`;
        ov.addEventListener('click', e => { if(e.target === ov) closeModal(); });
        modalContainer.appendChild(ov);
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if(modalContainer) modalContainer.innerHTML = '';
        document.body.style.overflow = '';
        state.pendingSetupSecret = null;
    }

    // ---------- API ----------
    async function fetchStatus() { return await window.Auth.getTwoFactorStatus(); }
    async function setupTwoFactor() { return await window.Auth.setupTwoFactor(); }
    async function enableTwoFactor(c) { return await window.Auth.enableTwoFactor(c); }
    async function disableTwoFactor(c) { return await window.Auth.disableTwoFactor(c); }
    async function regenerateBackupCodes(c) { return await window.Auth.regenerateBackupCodes(c); }

    // ---------- محتوى تعليمي ----------
    function renderEducationalSection() {
        return `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-question-circle"></i> ما هي المصادقة الثنائية؟</h3></div>
            <p style="margin:0;color:var(--gray-700);">
                المصادقة الثنائية (2FA) هي طبقة حماية إضافية لحسابك. بعد تفعيلها، لن يتمكن أي شخص من تسجيل الدخول إلى حسابك حتى لو عرف كلمة المرور، إلا باستخدام رمز تحقق مؤقت يتم إنشاؤه داخل تطبيق المصادقة على جهازك.
            </p>
        </div>
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-list-ol"></i> كيفية التفعيل</h3></div>
            <div class="steps-container">
                <div class="step"><div class="step-number">1</div><div class="step-content"><strong>ثبّت تطبيق المصادقة</strong><p>قم بتثبيت أحد تطبيقات المصادقة على هاتفك الذكي، مثل:</p><div class="app-links">
                    <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="fab fa-google-play"></i> Google Authenticator</a>
                    <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="fab fa-apple"></i> iOS</a>
                    <a href="https://play.google.com/store/apps/details?id=com.azure.authenticator" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Microsoft Authenticator</a>
                    <a href="https://authy.com/download/" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Authy</a>
                    <a href="https://bitwarden.com/download/" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Bitwarden Authenticator</a>
                </div></div></div>
                <div class="step"><div class="step-number">2</div><div class="step-content"><strong>اضغط "تفعيل المصادقة الثنائية"</strong><p>ستجد الزر في قسم الإجراءات أدناه.</p></div></div>
                <div class="step"><div class="step-number">3</div><div class="step-content"><strong>سيظهر لك رمز QR ومفتاح يدوي</strong><p>رمز QR للاستخدام السهل، والمفتاح اليدوي كحل بديل.</p></div></div>
                <div class="step"><div class="step-number">4</div><div class="step-content"><strong>افتح تطبيق المصادقة وأضف حساباً جديداً</strong><p>اختر "مسح رمز QR" ووجّه الكاميرا إلى الشاشة. أو اختر "إدخال المفتاح يدوياً".</p></div></div>
                <div class="step"><div class="step-number">5</div><div class="step-content"><strong>سيبدأ التطبيق بإظهار رمز مكون من 6 أرقام</strong><p>يتغير الرمز تلقائياً كل 30 ثانية.</p></div></div>
                <div class="step"><div class="step-number">6</div><div class="step-content"><strong>أدخل الرمز في المنصة واضغط "تأكيد التفعيل"</strong><p>بعد نجاح التحقق سيتم تفعيل المصادقة الثنائية وربط التطبيق بحسابك.</p></div></div>
            </div>
            <div style="margin-top:16px;padding:12px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;">
                <i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i>
                <strong>ملاحظات مهمة:</strong>
                <ul style="margin:8px 0 0 16px;font-size:14px;color:var(--gray-700);">
                    <li>لا تشارك رمز QR أو المفتاح اليدوي مع أي شخص.</li>
                    <li>احتفظ برموز الاسترداد (Backup Codes) في مكان آمن، فهي تساعدك على استعادة الوصول إذا فقدت هاتفك.</li>
                    <li>لا يمكن استخدام رمز التحقق إلا لفترة قصيرة، ثم يتغير تلقائياً كل 30 ثانية.</li>
                    <li>في حال تغيير هاتفك، قم بنقل حسابات تطبيق المصادقة أو أعد إعداد المصادقة الثنائية من داخل المنصة قبل حذف التطبيق من الجهاز القديم.</li>
                </ul>
            </div>
        </div>`;
    }

    function renderStatusBadge() {
        return `<span class="status-badge ${state.isEnabled?'active':'inactive'}"><span class="status-dot ${state.isEnabled?'green':'gray'}"></span>${state.isEnabled?'مفعلة':'غير مفعلة'}</span>`;
    }

    function renderInfoGrid() {
        const s = state;
        const rows = [
            ['طريقة المصادقة', s.method || '—'],
            ['تطبيق المصادقة', s.isEnabled ? 'Google Authenticator / متوافق' : '—'],
            ['تاريخ التفعيل', formatDateTime(s.enabledAt)],
            ['آخر استخدام ناجح', formatDate(s.lastUsedAt)],
            ['آخر محاولة فاشلة', formatDate(s.lastFailedAt) || 'لا توجد'],
            ['رموز الاسترداد المتبقية', s.isEnabled ? `<strong>${s.backupCodesRemaining}</strong> / 10` : '—']
        ];
        return rows.map(r => `<div class="info-item"><div class="info-label">${r[0]}</div><div class="info-value">${r[1]}</div></div>`).join('');
    }

    function renderNotificationToggles() {
        const toggles = [
            { id: 'notify_2fa_enabled', label: 'تفعيل المصادقة الثنائية', checked: true },
            { id: 'notify_2fa_disabled', label: 'تعطيل المصادقة الثنائية', checked: true },
            { id: 'notify_new_device', label: 'تسجيل الدخول من جهاز جديد', checked: true },
            { id: 'notify_backup_used', label: 'استخدام رمز استرداد', checked: true }
        ];
        return toggles.map(t => `
            <div class="notification-toggle">
                <span>${t.label}</span>
                <label class="toggle-switch">
                    <input type="checkbox" ${t.checked?'checked':''} data-notify-id="${t.id}">
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
        const email = state.userEmail || 'غير معروف';

        mainContent.innerHTML = `
            ${renderEducationalSection()}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-toggle-on"></i> حالة المصادقة الثنائية</h3>${renderStatusBadge()}</div>
                <div style="margin-top:8px; background:#f0f9ff; padding:10px; border-radius:8px; font-size:14px;">
                    <i class="fas fa-envelope" style="color:var(--primary);"></i>
                    <strong>البريد المرتبط:</strong> <span dir="ltr">${email}</span>
                    <br><small>جميع عمليات التفعيل والإشعارات سترتبط بهذا البريد.</small>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> معلومات عامة</h3></div>
                <div class="info-grid">${renderInfoGrid()}</div>
            </div>
            <div class="card no-print">
                <div class="card-header"><h3><i class="fas fa-cogs"></i> إجراءات</h3></div>
                <div class="btn-group">
                    ${!isEnabled ? `<button class="btn btn-primary" onclick="window.TwoFactorUI.showSetupWizard()"><i class="fas fa-shield-alt"></i> تفعيل المصادقة الثنائية</button>` :
                    `<button class="btn btn-outline" onclick="window.TwoFactorUI.showRegenerateCodes()"><i class="fas fa-sync-alt"></i> إنشاء رموز جديدة</button>
                     <button class="btn btn-outline" onclick="window.TwoFactorUI.downloadBackupCodes()"><i class="fas fa-download"></i> تنزيل رموز الاسترداد</button>
                     <button class="btn btn-danger" onclick="window.TwoFactorUI.confirmDisable()"><i class="fas fa-shield-slash"></i> تعطيل المصادقة</button>`}
                </div>
            </div>
            ${isEnabled ? `<div class="card"><div class="card-header"><h3><i class="fas fa-key"></i> رموز الاسترداد</h3></div>
                <div class="info-grid"><div class="info-item"><div class="info-label">المتبقية</div><div class="info-value">${state.backupCodesRemaining} / 10</div></div>
                <div class="info-item"><div class="info-label">آخر استخدام</div><div class="info-value">${formatDate(state.backupCodesLastUsed) || '—'}</div></div></div>
                <p style="font-size:13px;color:var(--gray-500);"><i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i> احفظ الرموز في مكان آمن.</p></div>` : ''}
            <div class="card no-print">
                <div class="card-header"><h3><i class="fas fa-bell"></i> تفضيلات الإشعارات</h3></div>
                <p style="font-size:13px; color:var(--gray-500); margin-top:0;">سيتم إرسال الإشعارات إلى بريدك المسجل (<strong>${email}</strong>)</p>
                ${renderNotificationToggles()}
            </div>
        `;

        // تفعيل الإشعارات (إرسال التفضيلات عند التغيير)
        document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', async function() {
                const id = this.dataset.notifyId;
                const enabled = this.checked;
                // محاكاة إرسال التفضيلات إلى الخادم (يمكن ربطها بـ Edge Function لاحقاً)
                try {
                    // يمكنك استبدال هذا بطلب حقيقي لـ Edge Function
                    // await window.Auth.updateNotificationPreference(id, enabled);
                    console.log(`تفضيل الإشعار "${id}" تم تغييره إلى: ${enabled}`);
                } catch(e) {}
                showToast('تم تحديث تفضيلات الإشعارات.', 'success');
            });
        });
    }

    // ---------- تحميل البيانات ----------
    async function loadData() {
        state.isLoading = true;
        renderFullPage();
        try {
            const data = await fetchStatus();
            state.isEnabled = data?.is_enabled || false;
            state.method = data?.method || (data?.is_enabled ? 'TOTP' : null);
            state.enabledAt = data?.enabled_at || null;
            state.lastUsedAt = data?.last_used_at || null;
            state.lastFailedAt = data?.last_failed_at || null;
            state.backupCodesRemaining = data?.backup_codes_remaining || 0;
            state.backupCodesLastUsed = data?.backup_codes_last_used || null;
            // جلب البريد الإلكتروني للمستخدم
            if (window.Auth?.getUser) {
                const user = await window.Auth.getUser();
                if (user) state.userEmail = user.email || '';
            }
        } catch (err) {
            console.error(err);
            showToast('تعذر تحميل إعدادات المصادقة.', 'error');
        } finally {
            state.isLoading = false;
            renderFullPage();
        }
    }

    // ---------- الإجراءات ----------
    async function showSetupWizard() {
        try {
            const secretData = await setupTwoFactor();
            if (!secretData?.qr_data_uri || !secretData?.secret) throw new Error('بيانات الإعداد غير مكتملة');
            state.pendingSetupSecret = secretData.secret;
            showModal('تفعيل المصادقة الثنائية',
                `<div style="background:#fffbeb;padding:10px;border-radius:8px;margin-bottom:16px;"><i class="fas fa-exclamation-circle" style="color:var(--warning);"></i> تنبيه: يظهر QR مرة واحدة. تأكد من حفظ رموز الاسترداد.</div>
                <div class="qr-container" style="text-align:center; margin-bottom:12px;"><img src="${secretData.qr_data_uri}" style="max-width:200px; width:100%; height:auto;"></div>
                <p style="margin-bottom:4px;"><strong>المفتاح اليدوي:</strong></p>
                <div style="display:flex; align-items:center; gap:8px; background:var(--gray-50); padding:8px 12px; border-radius:6px; border:1px solid var(--gray-200);">
                    <span class="manual-key" style="flex:1; font-family:monospace; word-break:break-all;">${secretData.secret}</span>
                    <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText('${secretData.secret}'); window.TwoFactorUI.showToast('تم نسخ المفتاح', 'success');"><i class="fas fa-copy"></i></button>
                </div>
                <div class="form-field-group" style="margin-top:16px;">
                    <label for="totp-verify-input" style="display:block; font-weight:700; margin-bottom:6px;">أدخل رمز التحقق من التطبيق:</label>
                    <input type="text" id="totp-verify-input" class="form-input-control" maxlength="6" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" placeholder="000000" style="text-align:center; font-size:22px; letter-spacing:6px; max-width:160px; margin:0 auto; display:block;">
                </div>
                <p id="setup-error" style="color:var(--danger);display:none;text-align:center;"></p>`,
                `<button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">إلغاء</button>
                 <button class="btn btn-primary" onclick="window.TwoFactorUI.verifyAndEnable()">تحقق وتفعيل</button>`
            );
        } catch (err) {
            showToast('تعذر بدء التفعيل: ' + err.message, 'error');
        }
    }

    async function verifyAndEnable() {
        const input = document.getElementById('totp-verify-input');
        const errorEl = document.getElementById('setup-error');
        const token = input?.value?.trim();
        if (!token || token.length !== 6) {
            if (errorEl) { errorEl.textContent = 'أدخل رمزاً مكوناً من 6 أرقام'; errorEl.style.display = 'block'; }
            return;
        }
        try {
            const result = await enableTwoFactor(token);
            if (result?.success) {
                closeModal();
                showToast('تم التفعيل بنجاح', 'success');
                if (result.backup_codes) showBackupCodesModal(result.backup_codes);
                await loadData();
            } else {
                if (errorEl) { errorEl.textContent = result?.error || 'فشل التفعيل'; errorEl.style.display = 'block'; }
            }
        } catch (err) {
            if (errorEl) { errorEl.textContent = err.message; errorEl.style.display = 'block'; }
        }
    }

    function showBackupCodesModal(codes) {
        const html = codes.map(c => `<span class="backup-code">${c}</span>`).join('');
        showModal('رموز الاسترداد',
            `<p style="color:var(--danger);font-weight:700;">احفظ هذه الرموز في مكان آمن. لن تظهر مرة أخرى!</p>
            <div class="backup-codes-grid">${html}</div>`,
            `<button class="btn btn-primary" onclick="window.TwoFactorUI.downloadBackupCodesInline('${encodeURIComponent(JSON.stringify(codes))}')"><i class="fas fa-download"></i> تنزيل</button>
             <button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">تم الحفظ</button>`
        );
    }

    function downloadBackupCodesInline(encoded) {
        const codes = JSON.parse(decodeURIComponent(encoded));
        const blob = new Blob([codes.join('\n')], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `tera-backup-codes-${new Date().toISOString().slice(0,10)}.txt`; a.click();
        showToast('تم التنزيل', 'success');
    }

    async function downloadBackupCodes() {
        const token = prompt('أدخل رمز المصادقة الثنائية الحالي لتنزيل رموز الاسترداد:');
        if (!token) return;
        try {
            const result = await regenerateBackupCodes(token);
            if (result.success && result.backup_codes) {
                const blob = new Blob([result.backup_codes.join('\n')], { type: 'text/plain;charset=utf-8' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = `tera-backup-codes-${new Date().toISOString().slice(0,10)}.txt`; a.click();
                showToast('تم التنزيل', 'success'); await loadData();
            } else showToast('فشل التنزيل', 'error');
        } catch (err) { showToast('خطأ: ' + err.message, 'error'); }
    }

    async function showRegenerateCodes() {
        showModal('إنشاء رموز استرداد جديدة', '<p>سيتم إبطال الرموز القديمة.</p><p style="color:var(--danger);">هل أنت متأكد؟</p>',
            `<button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">إلغاء</button><button class="btn btn-primary" onclick="window.TwoFactorUI.doRegenerateCodes()">نعم</button>`);
    }

    async function doRegenerateCodes() {
        const token = prompt('أدخل رمز المصادقة الثنائية الحالي:');
        if (!token) return;
        try {
            const result = await regenerateBackupCodes(token);
            if (result.success) {
                closeModal(); showToast('تم إنشاء رموز جديدة', 'success');
                showBackupCodesModal(result.backup_codes); await loadData();
            } else showToast('فشل', 'error');
        } catch (err) { showToast('خطأ: ' + err.message, 'error'); }
    }

    function confirmDisable() {
        showModal('تعطيل المصادقة الثنائية', '<p style="color:var(--danger);">تحذير: سيقل أمان حسابك.</p><p>هل أنت متأكد؟</p>',
            `<button class="btn btn-outline" onclick="window.TwoFactorUI.closeModal()">إلغاء</button><button class="btn btn-danger" onclick="window.TwoFactorUI.doDisable()">تعطيل</button>`);
    }

    async function doDisable() {
        const token = prompt('أدخل رمز المصادقة الثنائية الحالي للتعطيل:');
        if (!token) return;
        try {
            const result = await disableTwoFactor(token);
            if (result.success) { closeModal(); showToast('تم التعطيل', 'success'); await loadData(); }
            else showToast('فشل التعطيل', 'error');
        } catch (err) { showToast('خطأ: ' + err.message, 'error'); }
    }

    // إزالة الأجهزة الوهمية (غير مستخدمة لكننا نبقي الدالة فارغة لتجنب الأخطاء)
    function removeDevice(deviceId) { showToast('الميزة غير مدعومة حالياً.', 'error'); }
    async function doRemoveDevice(deviceId) {}

    window.TwoFactorUI = {
        showSetupWizard, verifyAndEnable, showRegenerateCodes, doRegenerateCodes,
        confirmDisable, doDisable, removeDevice, doRemoveDevice,
        downloadBackupCodes, downloadBackupCodesInline, closeModal, loadData
    };

    // ---------- بدء التشغيل ----------
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
        } else startAfterAuth();
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    }

    async function startAfterAuth() {
        try {
            const user = await window.Auth?.requireAuth();
            if (!user) return;

            const storedName = sessionStorage.getItem('otpName');
            const displayName = storedName || user.user_metadata?.full_name || user.email || 'مستخدم';
            const nameEl = document.getElementById('headerUserName');
            const avatarEl = document.getElementById('headerAvatar');
            if (nameEl) nameEl.textContent = displayName;
            if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

            // تخزين البريد الإلكتروني في الحالة
            state.userEmail = user.email || '';
            await loadData();
        } catch (e) { console.error('فشل بدء 2FA:', e); }
    }

    init();
})();
