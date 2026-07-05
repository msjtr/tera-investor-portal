/**
 * ==========================================================
 * profile-contact-information.js
 * إدارة صفحة معلومات الاتصال – Enterprise Version 2026
 * ==========================================================
 * - جلب بيانات المستخدم وعرضها من user_metadata أولاً.
 * - تحقق ديناميكي من رقم الجوال حسب الدولة.
 * - تجاهل أخطاء صلاحيات profiles (403/404) والاعتماد على auth.
 * - إرسال التحديثات إلى Supabase.
 */

'use strict';

(function () {
    let supabase = null;
    let currentUser = null;

    const countryPatterns = {
        '966': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX', msg: 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام' },
        '971': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX', msg: 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام' },
        '965': { regex: /^[5-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 5-9' },
        '973': { regex: /^[3-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 3-9' },
        '974': { regex: /^[3-7]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 3-7' },
        '968': { regex: /^[7-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 7-9' },
        '20':  { regex: /^1[0-2]\d{8}$/, length: 10, placeholder: '1XXXXXXXXX', msg: 'يجب أن يبدأ بـ 1 ويتكون من 10 أرقام' }
    };

    function showAlert(message, type = 'error') {
        const box = document.getElementById('formAlert');
        const icon = document.getElementById('alertIcon');
        const msg = document.getElementById('alertMessage');
        if (!box || !msg) return;
        box.style.display = 'flex';
        box.className = `alert-box show ${type}`;
        if (icon) icon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
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
        const avatar = fullName.charAt(0).toUpperCase();
        const headerName = document.getElementById('headerUserName');
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerName) headerName.textContent = fullName;
        if (headerAvatar) headerAvatar.textContent = avatar;
    }

    // عرض البيانات من user_metadata مباشرة
    function populateCurrentData() {
        if (!currentUser) return;

        // البريد الإلكتروني من auth
        const primaryEmail = document.getElementById('primaryEmail');
        if (primaryEmail) primaryEmail.value = currentUser.email || '';

        // رقم الجوال من user_metadata (موجود بعد التسجيل أو التحديث)
        const mobile = currentUser.user_metadata?.mobile_number || '';
        if (mobile) {
            const match = mobile.match(/^\+(\d+)/);
            if (match) {
                document.getElementById('countryCode').value = match[1];
                document.getElementById('mobileNumber').value = mobile.substring(match[0].length);
            }
        }

        // تحميل باقي البيانات من profiles (اختياري وسيتم تجاهل الأخطاء)
        loadProfileData();
    }

    async function loadProfileData() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();

            // تجاهل أي خطأ بهدوء (403, 404, PGRST116...)
            if (error) {
                // لا نفعل شيئاً، فقط نعتمد على user_metadata
                return;
            }

            if (!data) return;

            // تحديث رقم الجوال من profiles فقط إذا لم يكن موجوداً في user_metadata
            if (!currentUser.user_metadata?.mobile_number && data.mobile_number) {
                const match = data.mobile_number.match(/^\+(\d+)/);
                if (match) {
                    document.getElementById('countryCode').value = match[1];
                    document.getElementById('mobileNumber').value = data.mobile_number.substring(match[0].length);
                }
            }

            // الحقول الأخرى
            document.getElementById('backupEmail').value = data.backup_email || '';
            document.getElementById('emergencyName').value = data.emergency_contact_name || '';
            document.getElementById('emergencyRelation').value = data.emergency_contact_relation || '';
            if (data.emergency_contact_mobile) {
                const m = data.emergency_contact_mobile.match(/^\+(\d+)/);
                if (m) {
                    document.getElementById('emergencyCountryCode').value = m[1];
                    document.getElementById('emergencyMobile').value = data.emergency_contact_mobile.substring(m[0].length);
                }
            }
            document.getElementById('emergencyEmail').value = data.emergency_contact_email || '';

            const langRadios = document.getElementsByName('preferredLanguage');
            for (const r of langRadios) {
                if (r.value === (data.preferred_language || 'arabic')) r.checked = true;
            }
            const methodRadios = document.getElementsByName('preferredMethod');
            for (const r of methodRadios) {
                if (r.value === (data.preferred_contact_method || 'email')) r.checked = true;
            }

        } catch (err) {
            // تجاهل أخطاء الشبكة أو غيرها
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
        const backupEmail = document.getElementById('backupEmail').value.trim();
        const preferredLanguage = document.querySelector('input[name="preferredLanguage"]:checked')?.value || 'arabic';
        const preferredMethod = document.querySelector('input[name="preferredMethod"]:checked')?.value || 'email';
        const emergencyName = document.getElementById('emergencyName').value.trim();
        const emergencyRelation = document.getElementById('emergencyRelation').value;
        const emergencyCountryCode = document.getElementById('emergencyCountryCode').value;
        const emergencyMobile = document.getElementById('emergencyMobile').value.replace(/\D/g, '');
        const emergencyEmail = document.getElementById('emergencyEmail').value.trim();
        const declarationCheck = document.getElementById('declarationCheck').checked;

        if (!mobileNumber || !primaryEmail || !emergencyName || !emergencyRelation || !emergencyMobile || !declarationCheck) {
            showAlert('يرجى ملء جميع الحقول المطلوبة.', 'error');
            return;
        }
        if (!validateMobileInput('mobileNumber', 'countryCode')) {
            showAlert('رقم الجوال غير صحيح.', 'error');
            return;
        }
        if (!validateMobileInput('emergencyMobile', 'emergencyCountryCode')) {
            showAlert('رقم جوال الطوارئ غير صحيح.', 'error');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(primaryEmail)) {
            showAlert('البريد الإلكتروني الأساسي غير صحيح.', 'error');
            return;
        }
        if (backupEmail && !emailRegex.test(backupEmail)) {
            showAlert('البريد الإلكتروني الاحتياطي غير صحيح.', 'error');
            return;
        }
        if (emergencyEmail && !emailRegex.test(emergencyEmail)) {
            showAlert('البريد الإلكتروني للطوارئ غير صحيح.', 'error');
            return;
        }

        const fullMobile = '+' + countryCode + mobileNumber;
        const fullEmergencyMobile = '+' + emergencyCountryCode + emergencyMobile;

        const btn = document.querySelector('.btn-submit');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            // تحديث رقم الجوال في user_metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { mobile_number: fullMobile }
            });
            if (authError) throw authError;

            // محاولة تحديث profiles (اختياري)
            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: currentUser.id,
                    mobile_number: fullMobile,
                    backup_email: backupEmail || null,
                    preferred_language: preferredLanguage,
                    preferred_contact_method: preferredMethod,
                    emergency_contact_name: emergencyName,
                    emergency_contact_relation: emergencyRelation,
                    emergency_contact_mobile: fullEmergencyMobile,
                    emergency_contact_email: emergencyEmail || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (upsertError && upsertError.status !== 404) {
                // خطأ حقيقي غير "الجدول غير موجود"
                throw upsertError;
            }

            showAlert('✅ تم حفظ بيانات الاتصال بنجاح.', 'success');
            currentUser.user_metadata.mobile_number = fullMobile;
            updateHeader(currentUser);

        } catch (err) {
            console.error('فشل الحفظ:', err);
            showAlert('تعذر حفظ البيانات. تأكد من صلاحيات قاعدة البيانات.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> حفظ بيانات الاتصال';
        }
    }

    function bindEvents() {
        const form = document.getElementById('contactForm');
        if (form) form.addEventListener('submit', saveContactInformation);

        setupCountryMobileBinding('countryCode', 'mobileNumber');
        setupCountryMobileBinding('emergencyCountryCode', 'emergencyMobile');

        const emergencyNameInput = document.getElementById('emergencyName');
        if (emergencyNameInput) {
            emergencyNameInput.addEventListener('input', function () {
                this.value = this.value.replace(/[^\u0600-\u06FF\s]/g, '');
            });
        }
    }

    async function init() {
        try {
            if (typeof window.waitForSupabase === 'function') {
                supabase = await window.waitForSupabase();
            } else if (window.TeraAuth?._client) {
                supabase = window.TeraAuth._client;
            } else if (window.teraSupabase) {
                supabase = window.teraSupabase;
            } else {
                throw new Error('Supabase client not found');
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.replace('/auth/auth/login/login.html');
                return;
            }
            currentUser = user;
            updateHeader(currentUser);
            populateCurrentData();
            bindEvents();

            console.log('✅ [Contact Info] جاهز، المستخدم:', user.email);
        } catch (err) {
            console.error('فشلت التهيئة:', err);
            showAlert('تعذر تحميل الصفحة.', 'error');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
