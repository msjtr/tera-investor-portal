/**
 * ==========================================================
 * profile-contact-information.js – v3.5 (تنبيهات النقص + تجاهل الأخطاء)
 * ==========================================================
 * - يظهر تنبيه إذا كان رقم الجوال غير مسجل.
 * - يوقف محاولة profiles بعد 403، و user_contact_info بعد 400.
 * - يدعم صيغ الجوال "+966..." أو "966...".
 */

'use strict';

(function () {
    let supabase = null;
    let currentUser = null;
    let profilesAvailable = true;       // false بعد أول 403
    let contactInfoAvailable = true;    // false بعد أول 400

    const countryPatterns = {
        '966': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX' },
        '971': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX' },
        '965': { regex: /^[5-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '973': { regex: /^[3-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '974': { regex: /^[3-7]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '968': { regex: /^[7-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '20':  { regex: /^1[0-2]\d{8}$/, length: 10, placeholder: '1XXXXXXXXX' }
    };

    // استخراج مفتاح الدولة والرقم من أي صيغة
    function parseMobile(fullNumber) {
        if (!fullNumber) return null;
        let cleaned = fullNumber.replace(/[^\d+]/g, '');
        if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
        for (const code of Object.keys(countryPatterns)) {
            if (cleaned.startsWith(code)) {
                const number = cleaned.substring(code.length);
                return { code, number };
            }
        }
        return null;
    }

    // ========== التنبيهات ==========
    function showAlert(message, type = 'error') {
        const box = document.getElementById('formAlert');
        if (!box) return;
        const icon = document.getElementById('alertIcon');
        const msg = document.getElementById('alertMessage');
        box.style.display = 'flex';
        box.className = `alert-box show ${type}`;
        icon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        msg.textContent = message;
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            box.style.display = 'none';
            box.className = 'alert-box';
        }, 8000);
    }

    function updateHeader(user) {
        if (!user) return;
        if (typeof window.updateHeader === 'function') {
            window.updateHeader(user);
            return;
        }
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم';
        document.getElementById('headerUserName').textContent = fullName;
        document.getElementById('headerAvatar').textContent = fullName.charAt(0).toUpperCase();
    }

    // ========== جلب رقم الجوال ==========
    async function getMobileNumber() {
        // 1. user_metadata
        let mobile = currentUser.user_metadata?.mobile_number || '';
        if (mobile) return mobile;

        // 2. auth_register
        try {
            const { data, error } = await supabase
                .from('auth_register')
                .select('mobile_number')
                .eq('user_id', currentUser.id)
                .maybeSingle();
            if (!error && data?.mobile_number) {
                mobile = data.mobile_number;
                await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                return mobile;
            }
        } catch (e) {}

        // 3. user_contact_info (فقط إذا متاحة)
        if (contactInfoAvailable) {
            try {
                const { data, error } = await supabase
                    .from('user_contact_info')
                    .select('mobile_number')
                    .eq('user_id', currentUser.id)
                    .maybeSingle();
                if (error) {
                    if (error.status === 400) contactInfoAvailable = false;
                } else if (data?.mobile_number) {
                    mobile = data.mobile_number;
                    await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                    return mobile;
                }
            } catch (e) {}
        }

        // 4. profiles (فقط إذا متاحة)
        if (profilesAvailable) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('mobile_number')
                    .eq('id', currentUser.id)
                    .maybeSingle();
                if (error) {
                    if (error.status === 403) profilesAvailable = false;
                } else if (data?.mobile_number) {
                    mobile = data.mobile_number;
                    await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                    return mobile;
                }
            } catch (e) {}
        }

        return '';
    }

    // ========== تحميل البيانات وعرض التنبيهات ==========
    async function populateCurrentData() {
        if (!currentUser) return;

        document.getElementById('primaryEmail').value = currentUser.email || '';

        const mobile = await getMobileNumber();
        if (mobile) {
            const parsed = parseMobile(mobile);
            if (parsed) {
                document.getElementById('countryCode').value = parsed.code;
                document.getElementById('mobileNumber').value = parsed.number;
            }
        } else {
            // رقم الجوال غير موجود -> تنبيه تحذيري
            showAlert('⚠️ لم يتم العثور على رقم جوال مسجل. يرجى إدخاله للحفظ.', 'warning');
        }
    }

    // ========== التحقق من صحة المدخلات ==========
    function validateMobileInput(inputId, countrySelectId) {
        const code = document.getElementById(countrySelectId).value;
        const mobile = document.getElementById(inputId).value.replace(/\D/g, '');
        const pattern = countryPatterns[code];
        return pattern && mobile.length === pattern.length && pattern.regex.test(mobile);
    }

    function setupCountryMobileBinding(countrySelectId, inputId) {
        const select = document.getElementById(countrySelectId);
        const input = document.getElementById(inputId);
        if (!select || !input) return;
        const update = () => {
            const p = countryPatterns[select.value];
            if (p) {
                input.placeholder = p.placeholder;
                input.maxLength = p.length;
            }
        };
        select.addEventListener('change', () => {
            update();
            input.value = '';
        });
        update();
        input.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    // ========== الحفظ ==========
    async function saveContactInformation(e) {
        e.preventDefault();

        const countryCode = document.getElementById('countryCode').value;
        const mobileNumber = document.getElementById('mobileNumber').value.replace(/\D/g, '');
        const primaryEmail = document.getElementById('primaryEmail').value.trim();

        if (!mobileNumber || !primaryEmail) {
            showAlert('يرجى ملء رقم الجوال والبريد الإلكتروني.', 'error');
            return;
        }
        if (!validateMobileInput('mobileNumber', 'countryCode')) {
            showAlert('رقم الجوال غير صحيح.', 'error');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail)) {
            showAlert('البريد الإلكتروني غير صحيح.', 'error');
            return;
        }

        const fullMobile = '+' + countryCode + mobileNumber;
        const btn = document.querySelector('.btn-submit');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            // 1. تحديث user_metadata (دائماً)
            await supabase.auth.updateUser({ data: { mobile_number: fullMobile } });

            // 2. تحديث auth_register
            try {
                await supabase.from('auth_register')
                    .update({ mobile_number: fullMobile, updated_at: new Date().toISOString() })
                    .eq('user_id', currentUser.id);
            } catch (e) {}

            // 3. تحديث user_contact_info إذا كانت متاحة
            if (contactInfoAvailable) {
                try {
                    const { error } = await supabase.from('user_contact_info').upsert({
                        user_id: currentUser.id,
                        mobile_number: fullMobile,
                        updated_at: new Date().toISOString()
                    });
                    if (error && error.status === 400) contactInfoAvailable = false;
                } catch (e) {}
            }

            // 4. تحديث profiles إذا كانت متاحة
            if (profilesAvailable) {
                try {
                    const { error } = await supabase.from('profiles').upsert({
                        id: currentUser.id,
                        mobile_number: fullMobile,
                        updated_at: new Date().toISOString()
                    });
                    if (error && error.status === 403) profilesAvailable = false;
                } catch (e) {}
            }

            showAlert('✅ تم حفظ بيانات الاتصال بنجاح.', 'success');
            currentUser.user_metadata.mobile_number = fullMobile;
            updateHeader(currentUser);
        } catch (err) {
            console.error(err);
            showAlert('تعذر حفظ البيانات.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> حفظ بيانات الاتصال';
        }
    }

    function bindEvents() {
        document.getElementById('contactForm')?.addEventListener('submit', saveContactInformation);
        setupCountryMobileBinding('countryCode', 'mobileNumber');
        setupCountryMobileBinding('emergencyCountryCode', 'emergencyMobile');
        document.getElementById('emergencyName')?.addEventListener('input', function () {
            this.value = this.value.replace(/[^\u0600-\u06FF\s]/g, '');
        });
    }

    async function init() {
        try {
            if (typeof window.waitForSupabase === 'function') {
                supabase = await window.waitForSupabase();
            } else if (window.TeraAuth?._client) {
                supabase = window.TeraAuth._client;
            } else if (window.teraSupabase) {
                supabase = window.teraSupabase;
            } else throw new Error('Supabase client not found');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.replace('/auth/auth/login/login.html');
                return;
            }
            currentUser = user;
            updateHeader(currentUser);
            await populateCurrentData();
            bindEvents();
            console.log('✅ [Contact Info] جاهز، المستخدم:', user.email);
        } catch (err) {
            console.error(err);
            showAlert('تعذر تحميل الصفحة. يرجى تحديث المتصفح.', 'error');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
