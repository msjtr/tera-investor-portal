/**
 * ============================================================
 * security.js
 * نظام صفحات الأمان - Enterprise Edition
 * متوافق مع Supabase JS v2
 * ============================================================
 */

'use strict';

window.SecurityPages = window.SecurityPages || {};

/* ============================================================
   Security Core
============================================================ */

const SecurityCore = {

    supabase: null,
    currentUser: null,

    async init() {

        try {

            this.supabase = await waitForSupabase();

            const {
                data: { user },
                error
            } = await this.supabase.auth.getUser();

            if (error || !user) {

                window.location.replace('/auth/auth/login/login.html');
                return null;

            }

            this.currentUser = user;

            updateHeader(user);

            return user;

        } catch (err) {

            console.error('Security Init Error', err);

            showSecurityAlert(
                'تعذر الاتصال بخدمة المصادقة.',
                'error'
            );

            return null;

        }

    },

    async getUser() {

        if (this.currentUser)
            return this.currentUser;

        const {
            data: { user }
        } = await this.supabase.auth.getUser();

        this.currentUser = user;

        return user;

    }

};

/* ============================================================
   انتظار جاهزية Supabase
============================================================ */

async function waitForSupabase() {

    if (window.teraSupabase)
        return window.teraSupabase;

    return new Promise((resolve, reject) => {

        const timeout = setTimeout(() => {

            reject(new Error('Supabase Timeout'));

        }, 10000);

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

        alert(message);

        return;

    }

    const icon = document.getElementById('alertIcon');
    const text = document.getElementById('alertMessage');

    box.className = `alert-box show ${type}`;

    if (text)
        text.textContent = message;

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

    }, 7000);

}

/* ============================================================
   تحديث الهيدر
============================================================ */

function updateHeader(user) {

    if (!user)
        return;

    const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        'مستخدم';

    const avatar =
        fullName.trim().charAt(0).toUpperCase();

    const headerName =
        document.getElementById('headerUserName');

    const headerAvatar =
        document.getElementById('headerAvatar');

    if (headerName)
        headerName.textContent = fullName;

    if (headerAvatar)
        headerAvatar.textContent = avatar;

}

/* ============================================================
   أدوات مساعدة
============================================================ */

function setButtonLoading(button, text = 'جاري التنفيذ...') {

    if (!button)
        return;

    button.disabled = true;

    button.dataset.original = button.innerHTML;

    button.innerHTML =
        `<i class="fas fa-spinner fa-spin"></i> ${text}`;

}

function restoreButton(button) {

    if (!button)
        return;

    button.disabled = false;

    if (button.dataset.original)
        button.innerHTML = button.dataset.original;

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

/* ============================================================
   تغيير كلمة المرور
============================================================ */

window.SecurityPages['change-password'] = {

    async init() {

        const user = await SecurityCore.init();

        if (!user)
            return;

        const form =
            document.getElementById('changePasswordForm');

        if (!form)
            return;

        form.addEventListener(
            'submit',
            this.submit.bind(this)
        );

    },

    async submit(e) {

        e.preventDefault();

        const btn =
            document.getElementById('changePasswordBtn');

        const currentPassword =
            document.getElementById('currentPassword').value.trim();

        const newPassword =
            document.getElementById('newPassword').value.trim();

        const confirmPassword =
            document.getElementById('confirmPassword').value.trim();

        if (!currentPassword) {

            showSecurityAlert(
                'يرجى إدخال كلمة المرور الحالية.',
                'error'
            );

            return;

        }

        if (newPassword.length < 8) {

            showSecurityAlert(
                'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
                'error'
            );

            return;

        }

        if (newPassword !== confirmPassword) {

            showSecurityAlert(
                'تأكيد كلمة المرور غير مطابق.',
                'error'
            );

            return;

        }

        setButtonLoading(btn);

        try {

            const user =
                await SecurityCore.getUser();

            const verify =
                await SecurityCore.supabase.auth.signInWithPassword({

                    email: user.email,

                    password: currentPassword

                });

            if (verify.error)
                throw verify.error;

            const result =
                await SecurityCore.supabase.auth.updateUser({

                    password: newPassword

                });

            if (result.error)
                throw result.error;

            showSecurityAlert(

                'تم تغيير كلمة المرور بنجاح.',

                'success'

            );

            form.reset();

        }

        catch (err) {

            console.error(err);

            showSecurityAlert(

                err.message ||

                'تعذر تغيير كلمة المرور.',

                'error'

            );

        }

        finally {

            restoreButton(btn);

        }

    }

};

/* ============================================================
   تغيير رقم الجوال
============================================================ */

window.SecurityPages['change-mobile'] = {

    async init() {

        const user =
            await SecurityCore.init();

        if (!user)
            return;

        document.getElementById('currentMobileDisplay').textContent =

            user.user_metadata?.mobile_number ||

            '--';

        document

            .getElementById('changeMobileBtn')

            .addEventListener(

                'click',

                this.submit.bind(this)

            );

    },

    async submit() {

        const btn =
            document.getElementById('changeMobileBtn');

        const mobile =
            document.getElementById('newMobile').value.trim();

        if (!isValidSaudiMobile(mobile)) {

            showSecurityAlert(

                'رقم الجوال غير صحيح.',

                'error'

            );

            return;

        }

        setButtonLoading(btn);

        try {

            const user =
                await SecurityCore.getUser();

            const result =
                await SecurityCore.supabase.auth.updateUser({

                    data: {

                        mobile_number:

                            normalizeMobile(mobile)

                    }

                });

            if (result.error)
                throw result.error;

            showSecurityAlert(

                'تم تحديث رقم الجوال.',

                'success'

            );

            document.getElementById(

                'currentMobileDisplay'

            ).textContent =

                normalizeMobile(mobile);

        }

        catch (err) {

            console.error(err);

            showSecurityAlert(

                err.message ||

                'تعذر تحديث رقم الجوال.',

                'error'

            );

        }

        finally {

            restoreButton(btn);

        }

    }

};


/* ============================================================
   سجل الدخول
============================================================ */

window.SecurityPages['login-history'] = {

    async init() {

        const user = await SecurityCore.init();

        if (!user) return;

        await this.load(user.id);

    },

    async load(userId) {

        const tableBody = document.getElementById('loginHistoryBody');

        if (!tableBody) return;

        tableBody.innerHTML =
            '<tr><td colspan="5">جاري تحميل البيانات...</td></tr>';

        try {

            const { data, error } =
                await SecurityCore.supabase
                    .from('auth_login')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || !data.length) {

                tableBody.innerHTML =
                    '<tr><td colspan="5">لا توجد سجلات.</td></tr>';

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

<td>

<span class="badge-success">

${row.login_status || 'Success'}

</span>

</td>

</tr>

`;

            });

        }

        catch (err) {

            console.error(err);

            tableBody.innerHTML =
                '<tr><td colspan="5">تعذر تحميل البيانات.</td></tr>';

        }

    }

};

/* ============================================================
   الأجهزة المصرح بها
============================================================ */

window.SecurityPages['registered-devices'] = {

    async init() {

        const user =
            await SecurityCore.init();

        if (!user) return;

        await this.load(user.id);

    },

    async load(userId) {

        const container =
            document.getElementById('devicesContainer');

        if (!container) return;

        container.innerHTML =
            '<p>جاري تحميل الأجهزة...</p>';

        try {

            const { data, error } =
                await SecurityCore.supabase
                    .from('authorized_devices')
                    .select('*')
                    .eq('user_id', userId)
                    .order('last_used_at', {
                        ascending: false
                    });

            if (error) throw error;

            if (!data.length) {

                container.innerHTML =
                    '<p>لا توجد أجهزة مسجلة.</p>';

                return;

            }

            container.innerHTML = '';

            data.forEach(device => {

                container.innerHTML += `

<div class="device-card">

<div class="device-header">

<h4>${device.device_name || 'جهاز غير معروف'}</h4>

<button

class="btn-danger"

onclick="SecurityPages['registered-devices'].remove('${device.id}')">

إزالة

</button>

</div>

<p>

<strong>المتصفح:</strong>

${device.browser || '-'}

</p>

<p>

<strong>النظام:</strong>

${device.operating_system || '-'}

</p>

<p>

<strong>آخر استخدام:</strong>

${formatDate(device.last_used_at)}

</p>

</div>

`;

            });

        }

        catch (err) {

            console.error(err);

            container.innerHTML =
                '<p>تعذر تحميل الأجهزة.</p>';

        }

    },

    async remove(id) {

        if (!confirm('هل تريد حذف هذا الجهاز؟'))
            return;

        try {

            const { error } =
                await SecurityCore.supabase
                    .from('authorized_devices')
                    .delete()
                    .eq('id', id);

            if (error) throw error;

            showSecurityAlert(

                'تم حذف الجهاز.',

                'success'

            );

            const user =
                await SecurityCore.getUser();

            this.load(user.id);

        }

        catch (err) {

            console.error(err);

            showSecurityAlert(

                'تعذر حذف الجهاز.',

                'error'

            );

        }

    }

};

/* ============================================================
   أدوات مساعدة
============================================================ */

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
   المصادقة الثنائية (2FA)
============================================================ */

window.SecurityPages['two-factor-authentication'] = {

    async init() {

        const user = await SecurityCore.init();

        if (!user) return;

        const toggle =
            document.getElementById('twoFactorToggle');

        if (!toggle) return;

        toggle.checked =
            user.user_metadata?.two_factor_enabled || false;

        toggle.addEventListener(
            'change',
            this.update.bind(this)
        );

    },

    async update(e) {

        const enabled = e.target.checked;

        try {

            const { error } =
                await SecurityCore.supabase.auth.updateUser({

                    data: {

                        two_factor_enabled: enabled

                    }

                });

            if (error) throw error;

            showSecurityAlert(

                enabled
                    ? 'تم تفعيل المصادقة الثنائية.'
                    : 'تم تعطيل المصادقة الثنائية.',

                'success'

            );

        }

        catch (err) {

            console.error(err);

            e.target.checked = !enabled;

            showSecurityAlert(

                err.message ||

                'تعذر تحديث الإعداد.',

                'error'

            );

        }

    }

};

/* ============================================================
   تشغيل الصفحة الحالية تلقائياً
============================================================ */

document.addEventListener(

    'DOMContentLoaded',

    async () => {

        const page =

            document.body.dataset.security ||

            document.body.dataset.page ||

            document.body.id ||

            '';

        if (!page)
            return;

        if (

            window.SecurityPages &&

            window.SecurityPages[page] &&

            typeof window.SecurityPages[page].init === 'function'

        ) {

            console.log(

                '🔐 Security Page:',

                page

            );

            try {

                await window.SecurityPages[page].init();

            }

            catch (err) {

                console.error(

                    'Security Init Error',

                    err

                );

            }

        }

    }

);

/* ============================================================
   واجهة عامة
============================================================ */

window.SecurityCore = SecurityCore;

window.waitForSupabase = waitForSupabase;

window.showSecurityAlert = showSecurityAlert;

window.updateHeader = updateHeader;

console.log(
    '✅ security.js Enterprise Loaded'
);
