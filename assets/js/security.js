/**
 * ============================================================
 * security.js – نظام صفحات الأمان (Enterprise Edition)
 * ============================================================
 * - متوافق مع auth.js, supabase-client.js
 * - يستخدم waitForSupabase العامة من supabase-client.js
 * - يحتوي على دوال مساعدة (تنبيهات، هيدر، تحقق)
 * - صفحات أمان اختيارية (login-history, devices)
 */

'use strict';

window.SecurityPages = window.SecurityPages || {};

/* ============================================================
   رسائل التنبيه (محسَّنة)
============================================================ */

function showSecurityAlert(message, type = 'error') {
    const box = document.getElementById('formAlert');
    if (!box) {
        // إنشاء عنصر مؤقت إذا لم يوجد formAlert
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
        if (type === 'success') icon.className = 'fas fa-check-circle';
        else if (type === 'warning') icon.className = 'fas fa-triangle-exclamation';
        else icon.className = 'fas fa-circle-exclamation';
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
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'مستخدم';
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
   تبديل إظهار/إخفاء كلمة المرور
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
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

/* ============================================================
   Security Core – مدير الأمان المركزي (مُحدث)
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
            // الاعتماد على waitForSupabase العامة (من supabase-client.js)
            this.supabase = await window.waitForSupabase();
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error || !user) {
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
            const { data: { user } } = await this.supabase.auth.getUser();
            this.currentUser = user;
            return user;
        } catch (err) {
            console.error('❌ [Security] فشل جلب المستخدم:', err);
            return null;
        }
    },

    redirectToLogin() {
        window.location.replace('/auth/auth/login/login.html');
    },

    redirectToDashboard() {
        window.location.replace('/pages/dashboard/index.html');
    }
};

/* ============================================================
   صفحات الأمان الاختيارية (باستخدام الجداول الجديدة)
============================================================ */

// --- سجل الدخول (يستخدم user_login_sessions) ---
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
            tableBody.innerHTML = '<tr><td colspan="5">جاري تحميل البيانات...</td></tr>';
            try {
                const { data, error } = await SecurityCore.supabase
                    .from('user_login_sessions')
                    .select('session_number, login_at, device_type, browser_name, ip_address, status')
                    .eq('user_id', userId)
                    .order('login_at', { ascending: false })
                    .limit(50);
                if (error) throw error;
                if (!data || !data.length) {
                    tableBody.innerHTML = '<tr><td colspan="5">لا توجد سجلات دخول.</td></tr>';
                    return;
                }
                tableBody.innerHTML = data.map(row => `
                    <tr>
                        <td>${row.session_number || '-'}</td>
                        <td>${formatDate(row.login_at)}</td>
                        <td>${row.device_type || '-'}</td>
                        <td>${row.browser_name || '-'}</td>
                        <td>${row.ip_address || '-'}</td>
                        <td><span class="status-badge status-${row.status}">${row.status === 'active' ? 'نشطة' : 'منتهية'}</span></td>
                    </tr>
                `).join('');
            } catch (err) {
                console.error('❌ [Login History]', err);
                tableBody.innerHTML = '<tr><td colspan="5">تعذر تحميل البيانات.</td></tr>';
            }
        }
    };
}

// --- الأجهزة المسجلة (يستخدم user_login_sessions) ---
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
            container.innerHTML = '<p>جاري تحميل الأجهزة...</p>';
            try {
                const { data, error } = await SecurityCore.supabase
                    .from('user_login_sessions')
                    .select('id, device_type, operating_system, browser_name, browser_version, login_at, status')
                    .eq('user_id', userId)
                    .order('login_at', { ascending: false });
                if (error) throw error;
                if (!data || !data.length) {
                    container.innerHTML = '<p>لا توجد أجهزة مسجلة.</p>';
                    return;
                }
                container.innerHTML = data.map(d => `
                    <div class="device-card">
                        <h4>${d.device_type || 'جهاز غير معروف'} - ${d.operating_system || ''}</h4>
                        <p>المتصفح: ${d.browser_name || '-'} ${d.browser_version || ''}</p>
                        <p>آخر دخول: ${formatDate(d.login_at)}</p>
                        <p>الحالة: ${d.status === 'active' ? 'نشطة' : 'منتهية'}</p>
                    </div>
                `).join('');
            } catch (err) {
                console.error('❌ [Devices]', err);
                container.innerHTML = '<p>تعذر تحميل الأجهزة.</p>';
            }
        }
    };
}

// --- المصادقة الثنائية (تبقى كما هي) ---
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
                    data: { two_factor_enabled: enabled }
                });
                if (error) throw error;
                showSecurityAlert(enabled ? '✅ تم تفعيل المصادقة الثنائية.' : '✅ تم تعطيل المصادقة الثنائية.', 'success');
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
    const page = document.body.dataset.security || document.body.dataset.page || document.body.id || '';
    if (!page) return;
    if (window.SecurityPages[page] && typeof window.SecurityPages[page].init === 'function') {
        console.log('🔐 [Security] تهيئة الصفحة:', page);
        try {
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

window.SecurityCore = SecurityCore;
window.showSecurityAlert = showSecurityAlert;
window.updateHeader = updateHeader;
window.setButtonLoading = setButtonLoading;
window.restoreButton = restoreButton;
window.togglePasswordVisibility = togglePasswordVisibility;
window.isValidSaudiMobile = isValidSaudiMobile;
window.normalizeMobile = normalizeMobile;
window.formatDate = formatDate;

console.log('✅ [Security] تم تحميل security.js بنجاح (Enterprise)');
