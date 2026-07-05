/**
 * ==========================================================
 * profile-contact-information.js – v3.3 (مرونة مع 403)
 * ==========================================================
 * - جلب رقم الجوال: user_metadata → auth_register → user_contact_info → profiles
 * - لا يوقف محاولة أي مصدر نهائياً بسبب 403 (يعيد المحاولة كل تحميل).
 * - الحفظ يُحدّث user_metadata + auth_register + user_contact_info.
 */

'use strict';

(function () {
    let supabase = null;
    let currentUser = null;

    const countryPatterns = {
        '966': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX' },
        '971': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX' },
        '965': { regex: /^[5-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '973': { regex: /^[3-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '974': { regex: /^[3-7]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '968': { regex: /^[7-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '20':  { regex: /^1[0-2]\d{8}$/, length: 10, placeholder: '1XXXXXXXXX' }
    };

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
        }, 7000);
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

    // ========== الحصول على رقم الجوال من جميع المصادر ==========
    async function getMobileNumber() {
        // 1. user_metadata (أسرع وأضمن)
        let mobile = currentUser.user_metadata?.mobile_number || '';
        if (mobile) return mobile;

        // 2. auth_register (لا نوقف المحاولة حتى لو فشل، ربما تصلح الصلاحية لاحقاً)
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
            // إذا كان الخطأ 403، نعرف أن الصلاحية مفقودة لكن نواصل
        } catch (e) { /* تجاهل */ }

        // 3. user_contact_info
        try {
            const { data, error } = await supabase
                .from('user_contact_info')
                .select('mobile_number')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (!error && data?.mobile_number) {
                mobile = data.mobile_number;
                await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                return mobile;
            }
        } catch (e) { /* تجاهل */ }

        // 4. profiles (لا نوقف المحاولة أيضاً)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('mobile_number')
                .eq('id', currentUser.id)
                .maybeSingle();

            if (!error && data?.mobile_number) {
                mobile = data.mobile_number;
                await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                return mobile;
            }
        } catch (e) { /* تجاهل */ }

        return ''; // لا يوجد
    }

    async function populateCurrentData() {
        if (!currentUser) return;

        document.getElementById('primaryEmail').value = currentUser.email || '';

        const mobile = await getMobileNumber();
        if (mobile) {
            const match = mobile.match(/^\+(\d+)/);
            if (match) {
                document.getElementById('countryCode').value = match[1];
                document.getElementById('mobileNumber').value = mobile.substring(match[0].length);
            }
        }
    }

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
            await supabase.auth.updateUser({ data: { mobile_number: fullMobile } });

            // محاولة تحديث auth_register
            try {
                await supabase.from('auth_register')
                    .update({ mobile_number: fullMobile, updated_at: new Date().toISOString() })
                    .eq('user_id', currentUser.id);
            } catch (e) { /* تجاهل */ }

            // محاولة تحديث user_contact_info
            try {
                await supabase.from('user_contact_info').upsert({
                    user_id: currentUser.id,
                    mobile_number: fullMobile,
                    updated_at: new Date().toISOString()
                });
            } catch (e) { /* تجاهل */ }

            // محاولة تحديث profiles
            try {
                await supabase.from('profiles').upsert({
                    id: currentUser.id,
                    mobile_number: fullMobile,
                    updated_at: new Date().toISOString()
                });
            } catch (e) { /* تجاهل */ }

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
