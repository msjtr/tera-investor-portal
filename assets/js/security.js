/**
 * ============================================================
 * security.js
 * نظام صفحات الأمان - Enterprise Edition
 * متوافق مع Supabase JS v2 و TeraAuth
 * النسخة المُحدَّثة: إزالة التوجيه التلقائي من SecurityCore.init()
 * مع إضافة دالة togglePasswordVisibility العامة
 * ============================================================
 */

'use strict';

window.SecurityPages = window.SecurityPages || {};

/* ============================================================
   انتظار جاهزية Supabase (متوافق مع TeraAuth)
============================================================ */

async function waitForSupabase() {
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

    if (window.teraSupabase) {
        return window.teraSupabase;
    }

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
   تبديل إظهار/إخفاء كلمة المرور (دالة عامة)
============================================================ */

function togglePasswordVisibility(e) {
    e.preventDefault();
    e.stopPropagation();

    const button = e.currentTarget || this;
    const targetId = button.getAttribute('data-target');
    if (!targetId) return;

    const input = document.getElementById(targetId);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    const icon = button.querySelector('i');
    if (icon) {
        icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
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
   Security Core - مدير الأمان المركزي (تم تعديله لإزالة التوجيه التلقائي)
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
                // ✅ لا نقوم بالتوجيه، نعيد null فقط
                console.warn('⚠️ [Security] لا يوجد مستخدم مسجل الدخول');
                this.currentUser = null;
                this._initialized = true;
                return null;
            }

            this.currentUser = user;
            this._initialized = true;

            updateHeader(user);

            return user;

        } catch (err) {
            console.error('❌ [Security] خطأ في التهيئة:', err);
            this._initialized = true;
            this.currentUser = null;
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

    // دوال التوجيه أصبحت اختيارية، يمكن للصفحة استدعاؤها إذا رغبت
    redirectToLogin() {
        window.location.replace('/auth/auth/login/login.html');
    },

    redirectToDashboard() {
        window.location.replace('/pages/dashboard/index.html');
    }
};

/* ============================================================
   صفحات الأمان المختلفة - مع حماية من إعادة التعريف
============================================================ */

/* ----- تغيير كلمة المرور (يتم التعريف في ملف منفصل) ----- */
if (!window.SecurityPages['change-password']) {
    window.SecurityPages['change-password'] = {
        async init() {
            console.warn('⚠️ [Security] تم تحميل التعريف الافتراضي لـ change-password.');
            console.warn('⚠️ [Security] يرجى التأكد من تحميل security-change-password.js للحصول على الوظائف الكاملة.');
            
            const user = await SecurityCore.init();
            if (!user) return;

            // ربط أزرار إظهار/إخفاء كلمة المرور
            document.querySelectorAll('.password-toggle').forEach(btn => {
                btn.removeEventListener('click', togglePasswordVisibility);
                btn.addEventListener('click', togglePasswordVisibility);
            });

            const btn = document.getElementById('changePasswordBtn');
            if (btn) {
                btn.addEventListener('click', async function() {
                    showSecurityAlert('يرجى تحميل ملف security-change-password.js.', 'warning');
                });
            }
        }
    };
}

/* ----- تغيير رقم الجوال ----- */
if (!window.SecurityPages['change-mobile']) {
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
                btn.addEventListener('click', async function() {
                    showSecurityAlert('يتم تطوير هذه الخدمة حالياً.', 'warning');
                });
            }
        }
    };
}

/* ----- سجل الدخول ----- */
if (!window.SecurityPages['login-history']) {
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
}

/* ----- الأجهزة المصرح بها ----- */
if (!window.SecurityPages['registered-devices']) {
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
}

/* ----- المصادقة الثنائية (2FA) ----- */
if (!window.SecurityPages['two-factor-authentication']) {
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
}

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
            // تهيئة SecurityCore
            await SecurityCore.init();
            // إذا كان المستخدم غير موجود، قد ترغب الصفحة في التعامل مع ذلك
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

window.SecurityCore = SecurityCore;
window.waitForSupabase = waitForSupabase;
window.showSecurityAlert = showSecurityAlert;
window.updateHeader = updateHeader;
window.setButtonLoading = setButtonLoading;
window.restoreButton = restoreButton;
window.togglePasswordVisibility = togglePasswordVisibility;
window.isValidSaudiMobile = isValidSaudiMobile;
window.normalizeMobile = normalizeMobile;
window.formatDate = formatDate;

console.log('✅ [Security] تم تحميل security.js بنجاح (Enterprise)');
