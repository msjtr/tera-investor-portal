/**
 * ==========================================================
 * profile-contact-information.js – إصدار مرن (v3.0)
 * ==========================================================
 * - جلب رقم الجوال من: user_metadata → user_contact_info → profiles.
 * - لا يظهر أي خطأ للمستخدم.
 * - الحفظ يُحدّث user_metadata و user_contact_info.
 */

'use strict';

(function () {
    let supabase = null;
    let currentUser = null;
    let profilesAvailable = true;  // سنوقف محاولات profiles بعد أول فشل

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

    // ========== جلب رقم الجوال من مصادر متعددة ==========
    async function getMobileNumber() {
        // 1. من user_metadata
        let mobile = currentUser.user_metadata?.mobile_number || '';
        if (mobile) return mobile;

        // 2. من user_contact_info (غالباً بدون RLS معقدة)
        try {
            const { data, error } = await supabase
                .from('user_contact_info')
                .select('mobile_number')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (!error && data?.mobile_number) {
                mobile = data.mobile_number;
                // تحديث user_metadata للمرات القادمة
                await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                return mobile;
            }
        } catch (e) { /* تجاهل */ }

        // 3. من profiles (إذا كانت الصلاحية متاحة)
        if (profilesAvailable) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('mobile_number')
                    .eq('id', currentUser.id)
                    .maybeSingle();

                if (error && (error.status === 403 || error.status === 404 || error.code === 'PGRST116')) {
                    profilesAvailable = false;
                } else if (data?.mobile_number) {
                    mobile = data.mobile_number;
                    await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                    return mobile;
                }
            } catch (e) { /* تجاهل */ }
        }

        return ''; // لم يتم العثور على رقم
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
        // إن لم يوجد، يبقى فارغاً
    }

    // ... (باقي الدوال: validate, setupBinding, save) ...

    async function saveContactInformation(e) {
        e.preventDefault();
        // ... التحقق من صحة المدخلات ...
        const countryCode = document.getElementById('countryCode').value;
        const mobileNumber = document.getElementById('mobileNumber').value.replace(/\D/g, '');
        const fullMobile = '+' + countryCode + mobileNumber;

        const btn = document.querySelector('.btn-submit');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            // تحديث user_metadata
            await supabase.auth.updateUser({ data: { mobile_number: fullMobile } });

            // تحديث user_contact_info (إذا كان الجدول موجوداً)
            try {
                await supabase.from('user_contact_info').upsert({
                    user_id: currentUser.id,
                    mobile_number: fullMobile,
                    updated_at: new Date().toISOString()
                });
            } catch (e) { /* تجاهل */ }

            // تحديث profiles (إن أمكن)
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

    // ... bindEvents, init, إلخ ...

})();
