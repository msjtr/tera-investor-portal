/**
 * security.js – دوال صفحات الأمان (Enterprise)
 * =============================================
 * يعتمد على كائن window.SecurityPages لتهيئة الصفحات المختلفة:
 * - change-password
 * - change-email (منفصل في security-change-email.js)
 * - change-mobile
 * - login-history
 * - registered-devices
 * - two-factor-authentication
 */

window.SecurityPages = window.SecurityPages || {};

// ========== دوال مساعدة عامة ==========

/**
 * انتظار جاهزية Supabase (مع محاولات متعددة)
 * @returns {Promise<object>} عميل Supabase
 */
async function waitForSupabase() {
    if (window.teraSupabase) return window.teraSupabase;

    // المحاولة الأولى: الاستماع لحدث supabase:ready
    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
            document.addEventListener('supabase:ready', (e) => {
                clearTimeout(timeout);
                resolve(e.detail.client);
            }, { once: true });
            document.addEventListener('supabase:error', () => {
                clearTimeout(timeout);
                reject(new Error('error'));
            }, { once: true });
        });
        if (window.teraSupabase) return window.teraSupabase;
    } catch (e) {
        // إذا فشل الحدث، ننتظر قليلاً ثم نتحقق مباشرة
    }

    // المحاولة الثانية: الانتظار لظهور window.teraSupabase مباشرة
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1000));
        if (window.teraSupabase) return window.teraSupabase;
    }

    throw new Error('Supabase غير متوفر');
}

/**
 * عرض رسالة تنبيه في صفحة الأمان
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع التنبيه (success | error | info)
 */
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

/**
 * تحديث اسم المستخدم والأفاتار في الهيدر
 * @param {object} user - كائن المستخدم من Supabase
 */
function updateHeader(user) {
    if (!user) return;
    const fullName = user.user_metadata?.full_name || 'مستخدم';
    const headerName = document.getElementById('headerUserName');
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerName) headerName.textContent = fullName;
    if (headerAvatar) headerAvatar.textContent = fullName.charAt(0).toUpperCase();
}

// ========== تغيير كلمة المرور ==========
window.SecurityPages['change-password'] = {
    init: async function() {
        console.log('🔐 تهيئة صفحة تغيير كلمة المرور...');
        let supabase;
        try { supabase = await waitForSupabase(); } catch (err) {
            showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
            return;
        }

        // تحديث الهيدر
        try {
            const { data: { user } } = await supabase.auth.getUser();
            updateHeader(user);
        } catch (e) { console.warn('تعذر تحديث الهيدر:', e); }

        const form = document.getElementById('changePasswordForm');
        if (!form) return;

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
                const { error } = await supabase.auth.updateUser({ password: newPassword });
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
};

// ========== تغيير رقم الجوال ==========
window.SecurityPages['change-mobile'] = {
    init: async function() {
        console.log('📱 تهيئة صفحة تغيير رقم الجوال...');
        let supabase;
        try { supabase = await waitForSupabase(); } catch (err) {
            showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            updateHeader(user);
        } catch (e) { console.warn(e); }

        const form = document.getElementById('changeMobileForm');
        if (!form) return;

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
                const { error } = await supabase.auth.signInWithOtp({
                    phone: mobile,
                    options: { shouldCreateUser: false }
                });
                if (error) throw error;

                localStorage.setItem('pendingNewMobile', mobile);
                localStorage.setItem('pendingVerificationEmail', mobile);
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
};

// ========== سجل عمليات الدخول ==========
window.SecurityPages['login-history'] = {
    init: async function() {
        console.log('📋 تهيئة صفحة سجل الدخول...');
        let supabase;
        try { supabase = await waitForSupabase(); } catch (err) {
            showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                updateHeader(user);

                const { data: logs, error } = await supabase
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
        let supabase;
        try { supabase = await waitForSupabase(); } catch (err) {
            showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                updateHeader(user);

                const { data: devices, error } = await supabase
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
        let supabase;
        try { supabase = await waitForSupabase(); } catch (err) {
            showSecurityAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                updateHeader(user);

                const { data: totp, error } = await supabase
                    .from('auth_totp')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                const statusEl = document.getElementById('totpStatus');
                if (statusEl && totp) {
                    statusEl.textContent = totp.is_enabled ? 'مفعلة' : 'غير مفعلة';
                    statusEl.style.color = totp.is_enabled ? '#16a34a' : '#dc2626';
                }
            }
        } catch (e) {
            console.warn('تعذر جلب إعدادات 2FA:', e);
        }
    }
};

// بدء الصفحة المطلوبة تلقائياً
document.addEventListener('DOMContentLoaded', function() {
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
