/**
 * profile-contact-information.js – v6.6 (أسماء أعمدة صحيحة)
 * - يتوافق مع أعمدة user_contact_info: phone, secondary_email, emergency_contact_phone، إلخ.
 * - يجلب البيانات القديمة ويقسم رقم الطوارئ إلى مفتاح الدولة والرقم.
 * - يحفظ البيانات الجديدة باستخدام الأسماء الصحيحة.
 */

'use strict';

(function () {
    let supabase = null;
    let currentUser = null;
    let profilesAvailable = true;
    let contactInfoAvailable = true;
    let authRegisterAvailable = true;

    const countryPatterns = {
        '966': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX' },
        '971': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX' },
        '965': { regex: /^[5-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '973': { regex: /^[3-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '974': { regex: /^[3-7]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '968': { regex: /^[7-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '20':  { regex: /^1[0-2]\d{8}$/, length: 10, placeholder: '1XXXXXXXXX' }
    };

    function parseMobile(fullNumber) {
        if (!fullNumber) return null;
        let cleaned = fullNumber.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
        cleaned = cleaned.substring(1);
        for (const code of Object.keys(countryPatterns)) {
            if (cleaned.startsWith(code)) {
                return { code, number: cleaned.substring(code.length) };
            }
        }
        return null;
    }

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

    async function getMobileNumber() {
        let mobile = currentUser.user_metadata?.mobile_number || '';
        if (mobile) return mobile;

        if (authRegisterAvailable) {
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
                if (error && (error.status === 403 || error.status === 404)) authRegisterAvailable = false;
            } catch (e) {}
        }

        if (contactInfoAvailable) {
            try {
                const { data, error } = await supabase
                    .from('user_contact_info')
                    .select('phone')  // استخدمنا العمود الصحيح
                    .eq('user_id', currentUser.id)
                    .maybeSingle();
                if (!error && data?.phone) {
                    mobile = data.phone;
                    await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                    return mobile;
                }
                if (error && error.status === 400) contactInfoAvailable = false;
            } catch (e) {}
        }

        if (profilesAvailable) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('mobile_number') // profiles قد يحتفظ بالاسم القديم
                    .eq('id', currentUser.id)
                    .maybeSingle();
                if (!error && data?.mobile_number) {
                    mobile = data.mobile_number;
                    await supabase.auth.updateUser({ data: { mobile_number: mobile } });
                    return mobile;
                }
                if (error && (error.status === 403 || error.status === 404)) profilesAvailable = false;
            } catch (e) {}
        }

        return '';
    }

    function fillFieldsFromData(data) {
        if (!data) return;

        // الأسماء الجديدة المطابقة للجدول
        if (data.secondary_email) {
            document.getElementById('backupEmail').value = data.secondary_email;
        } else if (data.backup_email) { // توافق مع profiles القديم
            document.getElementById('backupEmail').value = data.backup_email;
        }

        if (data.emergency_contact_name) document.getElementById('emergencyName').value = data.emergency_contact_name;
        if (data.emergency_contact_relation) document.getElementById('emergencyRelation').value = data.emergency_contact_relation;

        // رقم الطوارئ (العمود emergency_contact_phone)
        const emergencyPhone = data.emergency_contact_phone || data.emergency_contact_mobile;
        if (emergencyPhone) {
            let fullEmergency = emergencyPhone.trim();
            if (!fullEmergency.startsWith('+')) fullEmergency = '+' + fullEmergency;
            const parsed = parseMobile(fullEmergency);
            if (parsed) {
                document.getElementById('emergencyCountryCode').value = parsed.code;
                document.getElementById('emergencyMobile').value = parsed.number;
            } else {
                document.getElementById('emergencyCountryCode').value = '966';
                document.getElementById('emergencyMobile').value = fullEmergency.replace(/[^\d]/g, '');
            }
        }

        if (data.emergency_contact_email) document.getElementById('emergencyEmail').value = data.emergency_contact_email;

        if (data.preferred_language) {
            const langRadio = document.querySelector(`input[name="preferredLanguage"][value="${data.preferred_language}"]`);
            if (langRadio) langRadio.checked = true;
        }
        if (data.preferred_contact_method) {
            const methodRadio = document.querySelector(`input[name="preferredMethod"][value="${data.preferred_contact_method}"]`);
            if (methodRadio) methodRadio.checked = true;
        }
    }

    async function loadAdditionalData() {
        let found = false;
        if (contactInfoAvailable) {
            try {
                const { data, error } = await supabase
                    .from('user_contact_info')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .maybeSingle();
                if (!error && data) {
                    fillFieldsFromData(data);
                    found = true;
                } else if (error && error.status === 400) contactInfoAvailable = false;
            } catch (e) {}
        }
        if (!found && profilesAvailable) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .maybeSingle();
                if (!error && data) {
                    fillFieldsFromData(data);
                } else if (error && (error.status === 403 || error.status === 404)) profilesAvailable = false;
            } catch (e) {}
        }
    }

    async function populateCurrentData() {
        if (!currentUser) return;
        document.getElementById('primaryEmail').value = currentUser.email || '';

        const mobile = await getMobileNumber();
        if (mobile) {
            const parsed = parseMobile(mobile);
            if (parsed) {
                document.getElementById('countryCode').value = parsed.code;
                document.getElementById('mobileNumber').value = parsed.number;
            } else {
                showAlert('⚠️ تنسيق رقم الجوال غير معروف.', 'warning');
            }
        } else {
            showAlert('⚠️ لم يتم العثور على رقم جوال مسجل.', 'warning');
        }

        await loadAdditionalData();
    }

    async function updateVerificationStatus() {
        try {
            await supabase.from('verification_requests').upsert({
                user_id: currentUser.id,
                contact_info_completed: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch (e) {}
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
        const emergencyName = document.getElementById('emergencyName').value.trim();
        const emergencyRelation = document.getElementById('emergencyRelation').value;
        const emergencyCountryCode = document.getElementById('emergencyCountryCode').value;
        const emergencyMobile = document.getElementById('emergencyMobile').value.replace(/\D/g, '');
        const emergencyEmail = document.getElementById('emergencyEmail').value.trim();
        const preferredLanguage = document.querySelector('input[name="preferredLanguage"]:checked')?.value || 'arabic';
        const preferredMethod = document.querySelector('input[name="preferredMethod"]:checked')?.value || 'email';
        const declarationCheck = document.getElementById('declarationCheck').checked;

        if (!mobileNumber || !primaryEmail) { showAlert('يرجى ملء رقم الجوال والبريد الإلكتروني.', 'error'); return; }
        if (!emergencyName || !emergencyRelation || !emergencyMobile) { showAlert('يرجى ملء جميع بيانات جهة اتصال الطوارئ.', 'error'); return; }
        if (!declarationCheck) { showAlert('يجب الموافقة على الإقرار.', 'error'); return; }
        if (!validateMobileInput('mobileNumber', 'countryCode')) { showAlert('رقم الجوال غير صحيح.', 'error'); return; }
        if (!validateMobileInput('emergencyMobile', 'emergencyCountryCode')) { showAlert('رقم جوال الطوارئ غير صحيح.', 'error'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail)) { showAlert('البريد الإلكتروني غير صحيح.', 'error'); return; }
        if (backupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(backupEmail)) { showAlert('البريد الاحتياطي غير صحيح.', 'error'); return; }
        if (emergencyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyEmail)) { showAlert('بريد الطوارئ غير صحيح.', 'error'); return; }

        const fullMobile = '+' + countryCode + mobileNumber;
        const fullEmergencyMobile = '+' + emergencyCountryCode + emergencyMobile;
        const btn = document.querySelector('.btn-submit');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            await supabase.auth.updateUser({ data: { mobile_number: fullMobile } });

            // استخدام الأسماء الصحيحة عند الحفظ
            const payload = {
                user_id: currentUser.id,
                phone: fullMobile,                    // بدلاً من mobile_number
                secondary_email: backupEmail || null, // بدلاً من backup_email
                preferred_language: preferredLanguage,
                preferred_contact_method: preferredMethod,
                emergency_contact_name: emergencyName,
                emergency_contact_relation: emergencyRelation,
                emergency_contact_phone: fullEmergencyMobile, // بدلاً من emergency_contact_mobile
                emergency_contact_email: emergencyEmail || null,
                updated_at: new Date().toISOString()
            };

            let saved = false;
            if (contactInfoAvailable) {
                const { error } = await supabase.from('user_contact_info').upsert(payload, { onConflict: 'user_id' });
                if (!error) saved = true;
                else if (error.status === 400) contactInfoAvailable = false;
            }
            if (!saved && profilesAvailable) {
                // profiles قد لا يزال يستخدم الأسماء القديمة، لذا نرسل له الاسماء القديمة إن لزم الأمر
                const profilePayload = {
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
                };
                const { error } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
                if (!error) saved = true;
                else if (error.status === 403 || error.status === 404) profilesAvailable = false;
            }
            if (!saved) {
                showAlert('❌ لم نتمكن من حفظ البيانات. تأكد من صلاحيات RLS.', 'error');
                return;
            }

            await updateVerificationStatus();
            showAlert('✅ تم حفظ جميع بيانات الاتصال بنجاح.', 'success');
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
