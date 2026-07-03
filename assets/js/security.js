/**
 * ============================================================
 * security.js
 * نظام صفحات الأمان - Enterprise Edition
 * متوافق مع Supabase JS v2 و TeraAuth
 * النسخة المُحدَّثة: استخدام TeraAuth، مسارات مطلقة، تحسين الأداء
 * ============================================================
 */

'use strict';

window.SecurityPages = window.SecurityPages || {};

/* ============================================================
   انتظار جاهزية Supabase (متوافق مع TeraAuth)
============================================================ */

async function waitForSupabase() {
    // 1. محاولة استخدام TeraAuth أولاً
    if (window.TeraAuth) {
        if (!window.TeraAuth._initialized) {
            try {
                await window.TeraAuth.init();
            } catch (e) {
                console.warn('⚠️ [Security] فشل تهيئة TeraAuth:', e);
            }
        }
        if (window.TeraAuth._client) {
            return window.TeraAuth._client;
        }
    }

    // 2. محاولة استخدام window.teraSupabase مباشرة
    if (window.teraSupabase) {
        return window.teraSupabase;
    }

    // 3. انتظار الحدث كخطة احتياطية
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Supabase Timeout'));
        }, 15000);

        document.addEventListener(
            'supabase:ready',
            () => {
                clearTimeout(timeout);
                resolve(window.teraSupabase);
            },
            { once: true }
        );

        document.addEventListener(
            'supabase:error',
            () => {
                clearTimeout(timeout);
                reject(new Error('Supabase Error'));
            },
            { once: true }
        );
    });
}

/* ============================================================
   رسائل التنبيه
============================================================ */

function showSecurityAlert(message, type = 'error') {
    const box = document.getElementById('formAlert');

    if (!box) {
        // إنشاء تنبيه مؤقت إذا لم يوجد العنصر
        const tempAlert = document.createElement('div');
        tempAlert.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: ${type === 'success' ? '#16a34a' : type === 'warning' ? '#f59e0b' : '#dc2626'};
            color: #fff; padding: 14px 28px; border-radius: 12px;
            font-weight: 700; font-size: 15px; z-index: 9999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 90%;
            text-align: center; font-family: 'Tajawal', sans-serif;
        `;
        tempAlert.textContent = message;
        document.body.appendChild(tempAlert);
        setTimeout(() => {
            tempAlert.style.opacity = '0';
            tempAlert.style.transition = 'opacity 0.5s';
            setTimeout(() => tempAlert.remove(), 500);
        }, 5000);
        return;
    }

    const icon = document.getElementById('alertIcon');
    const text = document.getElementById('alertMessage');

    box.className = `alert-box show ${type}`;

    if (text) text.textContent = message;

    if (icon) {
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'warning') {
            icon.className = 'fas fa-triangle-exclamation';
        } else {
            icon.className = 'fas fa-circle-exclamation';
        }
    }

    box.style.display = 'flex';

    clearTimeout(window.securityAlertTimer);
    window.securityAlertTimer = setTimeout(() => {
        box.style.display = 'none';
        box.className = 'alert-box';
    }, 7000);
}

/* ============================================================
   تحديث الهيدر
============================================================ */

function updateHeader(user) {
    if (!user) return;

    const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'مستخدم';

    const avatar = fullName.trim().charAt(0).toUpperCase();

    const headerName = document.getElementById('headerUserName');
    const headerAvatar = document.getElementById('headerAvatar');

    if (headerName) headerName.textContent = fullName;
    if (headerAvatar) headerAvatar.textContent = avatar;
}

/* ============================================================
   أدوات تحميل الأزرار
============================================================ */

function setButtonLoading(button, text = 'جاري التنفيذ...') {
    if (!button) return;

    button.disabled = true;
    button.dataset.original = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function restoreButton(button) {
    if (!button) return;

    button.disabled = false;
    if (button.dataset.original) {
        button.innerHTML = button.dataset.original;
    }
}

/* ============================================================
   التحقق من صحة المدخلات
============================================================ */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidSaudiMobile(mobile) {
    const cleaned = mobile.replace(/\s+/g, '');
    return /^(\+9665|05)[0-9]{8}$/.test(cleaned);
}

function normalizeMobile(mobile) {
    mobile = mobile.replace(/\s+/g, '');
    if (mobile.startsWith('05')) {
        return '+966' + mobile.substring(1);
    }
    return mobile;
}

function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/* ============================================================
   Security Core - مدير الأمان المركزي
============================================================ */

const SecurityCore = {
    supabase: null,
    currentUser: null,
    _initialized: false,

    async init() {
        if (this._initialized && this.supabase) {
            return this.currentUser;
        }

        try {
            // محاولة استخدام TeraAuth أولاً
            if (window.TeraAuth) {
                if (!window.TeraAuth._initialized) {
                    await window.TeraAuth.init();
                }
                if (window.TeraAuth._client) {
                    this.supabase = window.TeraAuth._client;
                    const user = await window.TeraAuth.getUser();
                    if (user) {
                        this.currentUser = user;
                        this._initialized = true;
                        updateHeader(user);
                        return user;
                    }
                }
            }

            // خطة احتياطية: استخدام waitForSupabase
            this.supabase = await waitForSupabase();

            const { data: { user }, error } = await this.supabase.auth.getUser();

            if (error || !user) {
                window.location.replace('/auth/auth/login/login.html');
                return null;
            }

            this.currentUser = user;
            this._initialized = true;

            updateHeader(user);

            return user;

        } catch (err) {
            console.error('❌ [Security] خطأ في التهيئة:', err);
            showSecurityAlert('تعذر الاتصال بخدمة المصادقة.', 'error');
            return null;
        }
    },

    async getUser() {
        if (this.currentUser) return this.currentUser;

        try {
            if (window.TeraAuth && window.TeraAuth._client) {
                const user = await window.TeraAuth.getUser();
                if (user) {
                    this.currentUser = user;
                    return user;
                }
            }

            const { data: { user } } = await this.supabase.auth.getUser();
            this.currentUser = user;
            return user;
        } catch (err) {
            console.error('❌ [Security] فشل جلب المستخدم:', err);
            return null;
        }
    },

    async refreshUser() {
        try {
            if (window.TeraAuth && window.TeraAuth._client) {
                const user = await window.TeraAuth.getUser();
                if (user) {
                    this.currentUser = user;
                    updateHeader(user);
                    return user;
                }
            }

            const { data: { user } } = await this.supabase.auth.getUser();
            this.currentUser = user;
            updateHeader(user);
            return user;
        } catch (err) {
            console.warn('⚠️ [Security] فشل تحديث المستخدم:', err);
            return this.currentUser;
        }
    },

    async redirectToLogin() {
        window.location.replace('/auth/auth/login/login.html');
    },

    async redirectToDashboard() {
        window.location.replace('/pages/dashboard/index.html');
    }
};

/* ============================================================
   ============================================================
   صفحات الأمان المختلفة
   ============================================================
   ============================================================ */

/* ----- تغيير كلمة المرور ----- */
window.SecurityPages['change-password'] = {

    async init() {
        const user = await SecurityCore.init();
        if (!user) return;

        const btn = document.getElementById('changePasswordBtn');
        if (btn) {
            btn.addEventListener('click', this.submit.bind(this));
        }

        // التحقق الفوري من قوة كلمة المرور
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');

        if (newPassword) {
            newPassword.addEventListener('input', () => this.validatePasswordStrength());
        }
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => this.validateConfirmMatch());
        }

        // إظهار/إخفاء كلمة المرور
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const input = document.getElementById(targetId);
                if (input) {
                    const type = input.type === 'password' ? 'text' : 'password';
                    input.type = type;
                    this.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
                }
            });
        });
    },

    validatePasswordStrength() {
        const password = document.getElementById('newPassword')?.value || '';
        const requirements = {
            length: document.getElementById('req-length'),
            uppercase: document.getElementById('req-uppercase'),
            lowercase: document.getElementById('req-lowercase'),
            number: document.getElementById('req-number'),
            special: document.getElementById('req-special')
        };

        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        let score = 0;
        Object.keys(checks).forEach(key => {
            const el = requirements[key];
            if (el) {
                el.className = checks[key] ? 'valid' : 'invalid';
                el.querySelector('i').className = checks[key] ? 'fas fa-check-circle' : 'fas fa-circle';
            }
            if (checks[key]) score++;
        });

        // تحديث شريط القوة
        const fill = document.getElementById('strengthFill');
        const label = document.getElementById('strengthLabel');

        if (fill) {
            const percent = (score / 5) * 100;
            fill.style.width = percent + '%';

            if (score <= 1) {
                fill.style.background = '#dc2626';
                if (label) { label.textContent = 'ضعيفة جداً'; label.className = 'strength-label weak'; }
            } else if (score <= 2) {
                fill.style.background = '#f59e0b';
                if (label) { label.textContent = 'ضعيفة'; label.className = 'strength-label weak'; }
            } else if (score <= 3) {
                fill.style.background = '#fbbf24';
                if (label) { label.textContent = 'متوسطة'; label.className = 'strength-label medium'; }
            } else if (score <= 4) {
                fill.style.background = '#34d399';
                if (label) { label.textContent = 'قوية'; label.className = 'strength-label strong'; }
            } else {
                fill.style.background = '#10b981';
                if (label) { label.textContent = 'قوية جداً'; label.className = 'strength-label very-strong'; }
            }
        }
    },

    validateConfirmMatch() {
        const newPassword = document.getElementById('newPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        const hint = document.getElementById('confirmPasswordHint');

        if (!hint) return;

        if (confirmPassword.length === 0) {
            hint.textContent = 'أعد كتابة كلمة المرور الجديدة';
            hint.style.color = '#64748b';
            return;
        }

        if (newPassword === confirmPassword) {
            hint.textContent = '✅ كلمة المرور متطابقة';
            hint.style.color = '#16a34a';
        } else {
            hint.textContent = '❌ كلمة المرور غير متطابقة';
            hint.style.color = '#dc2626';
        }
    },

    async submit() {
        const btn = document.getElementById('changePasswordBtn');
        const currentPassword = document.getElementById('currentPassword')?.value?.trim() || '';
        const newPassword = document.getElementById('newPassword')?.value?.trim() || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value?.trim() || '';

        // التحقق من الحقول
        if (!currentPassword) {
            showSecurityAlert('يرجى إدخال كلمة المرور الحالية.', 'error');
            document.getElementById('currentPassword')?.focus();
            return;
        }

        if (newPassword.length < 8) {
            showSecurityAlert('يجب أن تكون كلمة المرور 8 أحرف على الأقل.', 'error');
            document.getElementById('newPassword')?.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            showSecurityAlert('تأكيد كلمة المرور غير مطابق.', 'error');
            document.getElementById('confirmPassword')?.focus();
            return;
        }

        if (currentPassword === newPassword) {
            showSecurityAlert('يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية.', 'warning');
            return;
        }

        setButtonLoading(btn, 'جاري تغيير كلمة المرور...');

        try {
            const user = await SecurityCore.getUser();
            if (!user) throw new Error('المستخدم غير مسجل الدخول');

            const supabase = SecurityCore.supabase;

            // التحقق من كلمة المرور الحالية
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (verifyError) {
                if (verifyError.message.includes('Invalid login credentials')) {
                    throw new Error('كلمة المرور الحالية غير صحيحة.');
                }
                throw verifyError;
            }

            // تحديث كلمة المرور
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showSecurityAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');

            // تنظيف النموذج
            const form = document.getElementById('changePasswordForm');
            if (form) form.reset();

            // إعادة تعيين شريط القوة
            const fill = document.getElementById('strengthFill');
            const label = document.getElementById('strengthLabel');
            if (fill) { fill.style.width = '0%'; fill.style.background = '#e2e8f0'; }
            if (label) { label.textContent = 'ضعيفة'; label.className = 'strength-label'; }

            // إعادة تعيين متطلبات كلمة المرور
            document.querySelectorAll('#passwordRequirements ul li').forEach(li => {
                li.className = '';
                li.querySelector('i').className = 'fas fa-circle';
            });

            // تحديث معلومات المستخدم
            await SecurityCore.refreshUser();

        } catch (err) {
            console.error('❌ [Change Password]', err);
            showSecurityAlert(err.message || 'تعذر تغيير كلمة المرور.', 'error');
        } finally {
            restoreButton(btn);
        }
    }
};

/* ----- تغيير رقم الجوال ----- */
window.SecurityPages['change-mobile'] = {

    async init() {
        const user = await SecurityCore.init();
        if (!user) return;

        const display = document.getElementById('currentMobileDisplay');
        if (display) {
            display.textContent = user.user_metadata?.mobile_number || '--';
        }

        const btn = document.getElementById('changeMobileBtn');
        if (btn) {
            btn.addEventListener('click', this.submit.bind(this));
        }

        // التحقق الفوري من رقم الجوال
        const mobileInput = document.getElementById('newMobile');
        if (mobileInput) {
            mobileInput.addEventListener('input', function() {
                const hint = document.getElementById('mobileHint');
                if (hint) {
                    const valid = isValidSaudiMobile(this.value);
                    hint.textContent = valid ? '✅ رقم جوال صحيح' : '❌ رقم جوال غير صحيح (يبدأ بـ 05)';
                    hint.style.color = valid ? '#16a34a' : '#dc2626';
                }
            });
        }
    },

    async submit() {
        const btn = document.getElementById('changeMobileBtn');
        const mobile = document.getElementById('newMobile')?.value?.trim() || '';

        if (!isValidSaudiMobile(mobile)) {
            showSecurityAlert('رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام.', 'error');
            document.getElementById('newMobile')?.focus();
            return;
        }

        setButtonLoading(btn, 'جاري تحديث رقم الجوال...');

        try {
            const user = await SecurityCore.getUser();
            if (!user) throw new Error('المستخدم غير مسجل الدخول');

            const normalized = normalizeMobile(mobile);

            const { error } = await SecurityCore.supabase.auth.updateUser({
                data: {
                    mobile_number: normalized
                }
            });

            if (error) throw error;

            showSecurityAlert('✅ تم تحديث رقم الجوال بنجاح.', 'success');

            const display = document.getElementById('currentMobileDisplay');
            if (display) display.textContent = normalized;

            await SecurityCore.refreshUser();

            // تنظيف الحقل
            const input = document.getElementById('newMobile');
            if (input) input.value = '';

        } catch (err) {
            console.error('❌ [Change Mobile]', err);
            showSecurityAlert(err.message || 'تعذر تحديث رقم الجوال.', 'error');
        } finally {
            restoreButton(btn);
        }
    }
};

/* ----- سجل الدخول ----- */
window.SecurityPages['login-history'] = {

    async init() {
        const user = await SecurityCore.init();
        if (!user) return;
        await this.load(user.id);
    },

    async load(userId) {
        const tableBody = document.getElementById('loginHistoryBody');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">جاري تحميل البيانات...</td></tr>';

        try {
            const { data, error } = await SecurityCore.supabase
                .from('auth_login')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (!data || !data.length) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">لا توجد سجلات دخول.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            data.forEach(row => {
                tableBody.innerHTML += `
                    <tr>
                        <td>${formatDate(row.created_at)}</td>
                        <td>${row.browser || '-'}</td>
                        <td>${row.operating_system || '-'}</td>
                        <td>${row.ip_address || '-'}</td>
                        <td><span class="badge-success">${row.login_status || 'ناجح'}</span></td>
                    </tr>
                `;
            });

        } catch (err) {
            console.error('❌ [Login History]', err);
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#dc2626;">تعذر تحميل البيانات.</td></tr>';
        }
    }
};

/* ----- الأجهزة المصرح بها ----- */
window.SecurityPages['registered-devices'] = {

    async init() {
        const user = await SecurityCore.init();
        if (!user) return;
        await this.load(user.id);
    },

    async load(userId) {
        const container = document.getElementById('devicesContainer');
        if (!container) return;

        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">جاري تحميل الأجهزة...</p>';

        try {
            const { data, error } = await SecurityCore.supabase
                .from('authorized_devices')
                .select('*')
                .eq('user_id', userId)
                .order('last_used_at', { ascending: false });

            if (error) throw error;

            if (!data || !data.length) {
                container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">لا توجد أجهزة مسجلة.</p>';
                return;
            }

            container.innerHTML = '';
            data.forEach(device => {
                container.innerHTML += `
                    <div class="device-card">
                        <div class="device-header">
                            <h4>${device.device_name || 'جهاز غير معروف'}</h4>
                            <button class="btn-danger" onclick="SecurityPages['registered-devices'].remove('${device.id}')">
                                <i class="fas fa-trash-alt"></i> إزالة
                            </button>
                        </div>
                        <p><strong>المتصفح:</strong> ${device.browser || '-'}</p>
                        <p><strong>النظام:</strong> ${device.operating_system || '-'}</p>
                        <p><strong>آخر استخدام:</strong> ${formatDate(device.last_used_at)}</p>
                    </div>
                `;
            });

        } catch (err) {
            console.error('❌ [Devices]', err);
            container.innerHTML = '<p style="color:#dc2626;text-align:center;padding:20px;">تعذر تحميل الأجهزة.</p>';
        }
    },

    async remove(id) {
        if (!confirm('هل تريد حذف هذا الجهاز؟')) return;

        try {
            const { error } = await SecurityCore.supabase
                .from('authorized_devices')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showSecurityAlert('✅ تم حذف الجهاز بنجاح.', 'success');

            const user = await SecurityCore.getUser();
            if (user) this.load(user.id);

        } catch (err) {
            console.error('❌ [Remove Device]', err);
            showSecurityAlert('تعذر حذف الجهاز.', 'error');
        }
    }
};

/* ----- المصادقة الثنائية (2FA) ----- */
window.SecurityPages['two-factor-authentication'] = {

    async init() {
        const user = await SecurityCore.init();
        if (!user) return;

        const toggle = document.getElementById('twoFactorToggle');
        if (!toggle) return;

        toggle.checked = user.user_metadata?.two_factor_enabled || false;

        toggle.addEventListener('change', this.update.bind(this));
    },

    async update(e) {
        const enabled = e.target.checked;

        try {
            const { error } = await SecurityCore.supabase.auth.updateUser({
                data: {
                    two_factor_enabled: enabled
                }
            });

            if (error) throw error;

            showSecurityAlert(
                enabled ? '✅ تم تفعيل المصادقة الثنائية.' : '✅ تم تعطيل المصادقة الثنائية.',
                'success'
            );

            await SecurityCore.refreshUser();

        } catch (err) {
            console.error('❌ [2FA]', err);
            e.target.checked = !enabled;
            showSecurityAlert(err.message || 'تعذر تحديث الإعداد.', 'error');
        }
    }
};

/* ============================================================
   تشغيل الصفحة الحالية تلقائياً
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    const page =
        document.body.dataset.security ||
        document.body.dataset.page ||
        document.body.id ||
        '';

    if (!page) return;

    if (
        window.SecurityPages &&
        window.SecurityPages[page] &&
        typeof window.SecurityPages[page].init === 'function'
    ) {
        console.log('🔐 [Security] تهيئة الصفحة:', page);

        try {
            // تهيئة SecurityCore أولاً
            await SecurityCore.init();
            await window.SecurityPages[page].init();
        } catch (err) {
            console.error('❌ [Security] خطأ في تهيئة الصفحة:', err);
            showSecurityAlert('تعذر تحميل إعدادات الأمان.', 'error');
        }
    }
});

/* ============================================================
   واجهة عامة
============================================================ */

// تصدير الكائنات للاستخدام العالمي
window.SecurityCore = SecurityCore;
window.waitForSupabase = waitForSupabase;
window.showSecurityAlert = showSecurityAlert;
window.updateHeader = updateHeader;
window.setButtonLoading = setButtonLoading;
window.restoreButton = restoreButton;
window.isValidSaudiMobile = isValidSaudiMobile;
window.normalizeMobile = normalizeMobile;
window.formatDate = formatDate;

console.log('✅ [Security] تم تحميل security.js بنجاح (Enterprise)');
