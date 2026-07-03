/**
 * ============================================================
 * security.js
 * نظام صفحات الأمان - Enterprise Edition
 * متوافق مع Supabase JS v2 و TeraAuth
 * النسخة المُحدَّثة: إزالة التوجيه التلقائي من SecurityCore.init()
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
                // لا نقوم بالتوجيه، نعيد null فقط
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
   (تم تركها كما هي، لكن يمكن تعديلها لاستخدام SecurityCore.redirectToLogin بدلاً من التوجيه المباشر)
============================================================ */

// ... باقي تعريفات الصفحات (نفس الكود السابق، مع استخدام SecurityCore.redirectToLogin عند الحاجة) ...

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
window.isValidSaudiMobile = isValidSaudiMobile;
window.normalizeMobile = normalizeMobile;
window.formatDate = formatDate;

console.log('✅ [Security] تم تحميل security.js بنجاح (Enterprise)');
