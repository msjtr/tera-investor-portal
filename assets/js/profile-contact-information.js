/**
 * ==========================================================
 * profile-contact-information.js – إصدار شامل (v3.1)
 * ==========================================================
 * - جلب رقم الجوال: user_metadata → user_contact_info → profiles
 * - لا يظهر أي خطأ للمستخدم، حتى لو فشلت المصادر.
 * - الحفظ يُحدّث user_metadata + user_contact_info.
 */

'use strict';

(function () {
    let supabase = null;
    let currentUser = null;
    let profilesAvailable = true; // يمنع محاولات profiles بعد فشل 403

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

    // ========== الحصول على رقم الجوال من جميع المصادر الممكنة ==========
    async function getMobileNumber() {
        // 1. user_metadata (أسرع وأضمن)
        let mobile = currentUser.user_metadata?.mobile_number || '';
        if (mobile) return mobile;

        // 2. جدول user_contact_info (غالباً موجود وسهل الوصول)
        try {
            const { data, error } = await supabase
                .from('user_contact_info')
                .select('mobile_number')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (!error && data?.mobile_number) {
                mobile = data.mobile_number;
                // تحديث user_metadata لتكون متاحة فوراً في المرات القادمة
                await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                return mobile;
            }
        } catch (e) { /* تجاهل */ }

        // 3. جدول profiles (إذا كان متاحاً)
        if (profilesAvailable) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('mobile_number')
                    .eq('id', currentUser.id)
                    .maybeSingle();

                if (error && (error.status === 403 || error.status === 404 || error.code === 'PGRST116')) {
                    profilesAvailable = false; // نوقف المحاولات
                } else if (data?.mobile_number) {
                    mobile = data.mobile_number;
                    await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                    return mobile;
                }
            } catch (e) { /* تجاهل */ }
        }

        return ''; // لا يوجد رقم محفوظ بعد
    }

    async function populateCurrentData() {
        if (!currentUser) return;

        // البريد الإلكتروني
        document.getElementById('primaryEmail').value = currentUser.email || '';

        // رقم الجوال
        const mobile = await getMobileNumber();
        if (mobile) {
            const match = mobile.match(/^\+(\d+)/);
            if (match) {
                document.getElementById('countryCode').value = match[1];
                document.getElementById('mobileNumber').value = mobile.substring(match[0].length);
            }
        }
        // باقي الحقول (الطوارئ، اللغة) تبقى فارغة حالياً لحين توفرها في جدول منفصل
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

            // 2. تحديث user_contact_info (إن وُجد)
            try {
                await supabase.from('user_contact_info').upsert({
                    user_id: currentUser.id,
                    mobile_number: fullMobile,
                    updated_at: new Date().toISOString()
                });
            } catch (e) { /* تجاهل */ }

            // 3. تحديث profiles إن أمكن (بدون انتظار)
            if (profilesAvailable) {
                supabase.from('profiles').upsert({
                    id: currentUser.id,
                    mobile_number: fullMobile,
                    updated_at: new Date().toISOString()
                }).then(() => {}).catch(() => {});
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
