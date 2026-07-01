/**
 * security.js – دوال صفحات الأمان (Enterprise)
 * =============================================
 * يعتمد على كائن window.SecurityPages لتهيئة الصفحات المختلفة:
 * - change-password
 * - change-email (سبق إنشاؤه)
 * - change-mobile
 * - login-history
 * - registered-devices
 * - two-factor-authentication
 */

window.SecurityPages = window.SecurityPages || {};

// دالة تنبيه عامة
function showSecurityAlert(message, type) {
    const box = document.getElementById('formAlert');
    const icon = document.getElementById('alertIcon');
    const msg = document.getElementById('alertMessage');
    if (!box) return alert(message);
    if (icon) icon.className = 'fas ' + (type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle');
    if (msg) msg.textContent = message;
    box.style.display = 'flex';
    box.className = 'alert-box show ' + (type || 'error');
    clearTimeout(window._securityAlertTimer);
    window._securityAlertTimer = setTimeout(() => { if (box) box.style.display = 'none'; }, 8000);
}

// ========== تغيير كلمة المرور ==========
window.SecurityPages['change-password'] = {
    init: async function() {
        console.log('🔐 تهيئة صفحة تغيير كلمة المرور...');
        // انتظار Supabase
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                    document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
                    document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('error')); }, { once: true });
                });
            } catch (err) {
                showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
                return;
            }
        }

        // تحديث الهيدر
        try {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            if (user) {
                const fullName = user.user_metadata?.full_name || 'مستخدم';
                document.getElementById('headerUserName').textContent = fullName;
                document.getElementById('headerAvatar').textContent = fullName.charAt(0).toUpperCase();
            }
        } catch (e) { console.warn('تعذر تحديث الهيدر:', e); }

        const form = document.getElementById('changePasswordForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const currentPassword = document.getElementById('currentPassword')?.value;
                const newPassword = document.getElementById('newPassword')?.value;
                const confirmPassword = document.getElementById('confirmPassword')?.value;

                if (newPassword !== confirmPassword) {
                    showSecurityAlert('كلمة المرور الجديدة غير متطابقة.', 'error');
                    return;
                }

                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...'; }

                try {
                    const { error } = await window.teraSupabase.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                    showSecurityAlert('✅ تم تغيير كلمة المرور بنجاح.', 'success');
                    form.reset();
                } catch (error) {
                    console.error('❌ خطأ في تغيير كلمة المرور:', error);
                    showSecurityAlert(error.message || 'تعذر تغيير كلمة المرور.', 'error');
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> تغيير كلمة المرور'; }
                }
            });
        }
    }
};

// ========== تغيير رقم الجوال ==========
window.SecurityPages['change-mobile'] = {
    init: async function() {
        console.log('📱 تهيئة صفحة تغيير رقم الجوال...');
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                    document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
                    document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('error')); }, { once: true });
                });
            } catch (err) {
                showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
                return;
            }
        }

        try {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            if (user) {
                document.getElementById('headerUserName').textContent = user.user_metadata?.full_name || 'مستخدم';
                document.getElementById('headerAvatar').textContent = (user.user_metadata?.full_name || 'م')[0];
            }
        } catch (e) { console.warn(e); }

        const form = document.getElementById('changeMobileForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const mobile = document.getElementById('newMobile')?.value.trim();
                if (!mobile) {
                    showSecurityAlert('يرجى إدخال رقم الجوال الجديد.', 'error');
                    return;
                }

                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...'; }

                try {
                    // إرسال OTP إلى الجوال الجديد (متطلب Supabase)
                    const { error } = await window.teraSupabase.auth.signInWithOtp({
                        phone: mobile,
                        options: { shouldCreateUser: false }
                    });
                    if (error) throw error;

                    localStorage.setItem('pendingNewMobile', mobile);
                    localStorage.setItem('pendingVerificationEmail', mobile); // استعارة للحفظ المؤقت
                    localStorage.setItem('tera_verify_type', 'change_mobile');

                    showSecurityAlert('✅ تم إرسال رمز التحقق إلى رقم الجوال الجديد.', 'success');
                    setTimeout(() => window.location.replace('/auth/verify-otp.html'), 1500);
                } catch (error) {
                    console.error('❌ فشل إرسال رمز التحقق:', error);
                    showSecurityAlert(error.message || 'تعذر إرسال الرمز.', 'error');
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> تغيير رقم الجوال'; }
                }
            });
        }
    }
};

// ========== سجل عمليات الدخول ==========
window.SecurityPages['login-history'] = {
    init: async function() {
        console.log('📋 تهيئة صفحة سجل الدخول...');
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                    document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
                    document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('error')); }, { once: true });
                });
            } catch (err) {
                showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
                return;
            }
        }

        try {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            if (user) {
                document.getElementById('headerUserName').textContent = user.user_metadata?.full_name || 'مستخدم';
                document.getElementById('headerAvatar').textContent = (user.user_metadata?.full_name || 'م')[0];

                const { data: logs, error } = await window.teraSupabase
                    .from('auth_login')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('login_at', { ascending: false });

                const tbody = document.getElementById('loginHistoryTableBody');
                if (tbody && !error) {
                    if (logs && logs.length > 0) {
                        tbody.innerHTML = logs.map(log => `
                            <tr>
                                <td>${new Date(log.login_at).toLocaleDateString('ar-SA')}</td>
                                <td>${log.ip_address || '-'}</td>
                                <td>${log.device_name || '-'}</td>
                                <td>${log.browser || '-'}</td>
                                <td>${log.operating_system || '-'}</td>
                                <td>${log.login_status || '-'}</td>
                            </tr>
                        `).join('');
                    } else {
                        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد عمليات دخول سابقة</td></tr>';
                    }
                }
            }
        } catch (e) {
            console.warn('تعذر جلب سجل الدخول:', e);
        }
    }
};

// ========== الأجهزة المصرحة ==========
window.SecurityPages['registered-devices'] = {
    init: async function() {
        console.log('💻 تهيئة صفحة الأجهزة المصرحة...');
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                    document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
                    document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('error')); }, { once: true });
                });
            } catch (err) {
                showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
                return;
            }
        }

        try {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            if (user) {
                document.getElementById('headerUserName').textContent = user.user_metadata?.full_name || 'مستخدم';
                document.getElementById('headerAvatar').textContent = (user.user_metadata?.full_name || 'م')[0];

                const { data: devices, error } = await window.teraSupabase
                    .from('auth_devices')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('last_login_at', { ascending: false });

                const tbody = document.getElementById('devicesTableBody');
                if (tbody && !error) {
                    if (devices && devices.length > 0) {
                        tbody.innerHTML = devices.map(dev => `
                            <tr>
                                <td>${dev.device_name || '-'}</td>
                                <td>${dev.device_type || '-'}</td>
                                <td>${dev.browser || '-'}</td>
                                <td>${dev.operating_system || '-'}</td>
                                <td>${dev.ip_address || '-'}</td>
                                <td>${dev.is_trusted ? '✅ موثوق' : '❌ غير موثوق'}</td>
                                <td>${new Date(dev.last_login_at).toLocaleDateString('ar-SA')}</td>
                            </tr>
                        `).join('');
                    } else {
                        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد أجهزة مسجلة</td></tr>';
                    }
                }
            }
        } catch (e) {
            console.warn('تعذر جلب الأجهزة:', e);
        }
    }
};

// ========== المصادقة الثنائية ==========
window.SecurityPages['two-factor-authentication'] = {
    init: async function() {
        console.log('🔑 تهيئة صفحة المصادقة الثنائية...');
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                    document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
                    document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('error')); }, { once: true });
                });
            } catch (err) {
                showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
                return;
            }
        }

        try {
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            if (user) {
                document.getElementById('headerUserName').textContent = user.user_metadata?.full_name || 'مستخدم';
                document.getElementById('headerAvatar').textContent = (user.user_metadata?.full_name || 'م')[0];

                const { data: totp, error } = await window.teraSupabase
                    .from('auth_totp')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                const statusEl = document.getElementById('totpStatus');
                const toggleBtn = document.getElementById('toggleTotpBtn');
                if (statusEl && totp) {
                    statusEl.textContent = totp.is_enabled ? 'مفعلة' : 'غير مفعلة';
                    statusEl.style.color = totp.is_enabled ? '#16a34a' : '#dc2626';
                }

                if (toggleBtn) {
                    toggleBtn.addEventListener('click', async function() {
                        // منطق التفعيل/التعطيل يتم عبر Supabase Auth admin أو من خلال إعادة التوجيه لإعدادات الحساب
                        showSecurityAlert('يرجى إعداد المصادقة الثنائية من خلال إعدادات الحساب الرئيسية.', 'info');
                    });
                }
            }
        } catch (e) {
            console.warn('تعذر جلب إعدادات 2FA:', e);
        }
    }
};

// بدء الصفحة المطلوبة تلقائياً
document.addEventListener('DOMContentLoaded', function() {
    // استخراج اسم الصفحة من المسار
    const path = window.location.pathname;
    let pageName = '';
    if (path.includes('change-password')) pageName = 'change-password';
    else if (path.includes('change-email')) pageName = 'change-email';
    else if (path.includes('change-mobile')) pageName = 'change-mobile';
    else if (path.includes('login-history')) pageName = 'login-history';
    else if (path.includes('registered-devices')) pageName = 'registered-devices';
    else if (path.includes('two-factor')) pageName = 'two-factor-authentication';

    if (pageName && window.SecurityPages && window.SecurityPages[pageName]) {
        window.SecurityPages[pageName].init();
    }
});
