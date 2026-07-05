/**
 * ==========================================================
 * profile-contact-information.js
 * إدارة صفحة معلومات الاتصال – Enterprise Version 2026
 * ==========================================================
 * - جلب بيانات المستخدم وعرضها.
 * - تحقق ديناميكي من رقم الجوال حسب الدولة.
 * - تحقق من البريد الإلكتروني الأساسي.
 * - إرسال التحديثات إلى Supabase (profiles).
 * - عرض رسائل تنبيه وتفاعل كامل.
 */

'use strict';

(function () {
    let supabase = null;
    let currentUser = null;

    // أنماط أرقام الجوال حسب الدولة
    const countryPatterns = {
        '966': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX', msg: 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام' },
        '971': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX', msg: 'يجب أن يبدأ بـ 5 ويتكون من 9 أرقام' },
        '965': { regex: /^[5-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 5-9' },
        '973': { regex: /^[3-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 3-9' },
        '974': { regex: /^[3-7]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 3-7' },
        '968': { regex: /^[7-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX', msg: 'يجب أن يتكون من 8 أرقام ويبدأ بـ 7-9' },
        '20':  { regex: /^1[0-2]\d{8}$/, length: 10, placeholder: '1XXXXXXXXX', msg: 'يجب أن يبدأ بـ 1 ويتكون من 10 أرقام' }
    };

    // ========== دوال التنبيه ==========
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

    // ========== تحديث الهيدر ==========
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

    // ========== عرض البيانات الحالية ==========
    function populateCurrentData() {
        if (!currentUser) return;

        // البريد الإلكتروني الأساسي (من auth)
        const primaryEmail = document.getElementById('primaryEmail');
        if (primaryEmail) primaryEmail.value = currentUser.email || '';

        // رقم الجوال الحالي
        const currentMobile = currentUser.user_metadata?.mobile_number || '';
        if (currentMobile) {
            // استخراج مفتاح الدولة والرقم
            const countryCodeMatch = currentMobile.match(/^\+(\d+)/);
            if (countryCodeMatch) {
                const code = countryCodeMatch[1];
                const number = currentMobile.substring(countryCodeMatch[0].length);
                const countrySelect = document.getElementById('countryCode');
                const mobileInput = document.getElementById('mobileNumber');
                if (countrySelect) countrySelect.value = code;
                if (mobileInput) mobileInput.value = number;
            }
        }

        // البيانات الإضافية من profiles (يمكن تحميلها لاحقاً)
        loadProfileData();
    }

    async function loadProfileData() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (!data) return;

            // تعبئة الحقول من profile
            const profile = data;
            document.getElementById('backupEmail') && (document.getElementById('backupEmail').value = profile.backup_email || '');
            document.getElementById('emergencyName') && (document.getElementById('emergencyName').value = profile.emergency_contact_name || '');
            document.getElementById('emergencyRelation') && (document.getElementById('emergencyRelation').value = profile.emergency_contact_relation || '');
            if (profile.emergency_contact_mobile) {
                const emergCodeMatch = profile.emergency_contact_mobile.match(/^\+(\d+)/);
                if (emergCodeMatch) {
                    document.getElementById('emergencyCountryCode').value = emergCodeMatch[1];
                    document.getElementById('emergencyMobile').value = profile.emergency_contact_mobile.substring(emergCodeMatch[0].length);
                }
            }
            document.getElementById('emergencyEmail') && (document.getElementById('emergencyEmail').value = profile.emergency_contact_email || '');
            // لغة التواصل المفضلة
            const langRadios = document.getElementsByName('preferredLanguage');
            for (const radio of langRadios) {
                if (radio.value === (profile.preferred_language || 'arabic')) radio.checked = true;
            }
            // طريقة التواصل
            const methodRadios = document.getElementsByName('preferredMethod');
            for (const radio of methodRadios) {
                if (radio.value === (profile.preferred_contact_method || 'email')) radio.checked = true;
            }

        } catch (err) {
            console.warn('تحميل بيانات الملف الشخصي:', err);
        }
    }

    // ========== التحقق من الحقول ==========
    function validateMobileInput(inputId, countrySelectId) {
        const countryCode = document.getElementById(countrySelectId).value;
        const mobile = document.getElementById(inputId).value.trim().replace(/\D/g, '');
        const pattern = countryPatterns[countryCode];
        if (!pattern) return false;
        if (mobile.length === 0) return false;
        if (mobile.length !== pattern.length) return false;
        if (!pattern.regex.test(mobile)) return false;
        return true;
    }

    function validateEmailUniqueness(email, currentEmail) {
        // تحقق مبسط: إذا كان نفس البريد الحالي فهو مقبول
        if (email === currentEmail) return true;
        // وإلا سيتم التحقق عند الإرسال من الخادم
        return true;
    }

    // ========== تحديث Placeholder للجوال ==========
    function setupCountryMobileBinding(countrySelectId, inputId) {
        const countrySelect = document.getElementById(countrySelectId);
        const input = document.getElementById(inputId);
        if (!countrySelect || !input) return;
        const updatePlaceholder = () => {
            const pattern = countryPatterns[countrySelect.value];
            if (pattern) {
                input.placeholder = pattern.placeholder;
                input.maxLength = pattern.length;
            }
        };
        countrySelect.addEventListener('change', () => {
            updatePlaceholder();
            input.value = ''; // مسح القيمة لتجنب الأخطاء
        });
        updatePlaceholder();
        input.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    // ========== الحفظ ==========
    async function saveContactInformation(e) {
        e.preventDefault();

        // جمع البيانات
        const countryCode = document.getElementById('countryCode').value;
        const mobileNumber = document.getElementById('mobileNumber').value.trim().replace(/\D/g, '');
        const primaryEmail = document.getElementById('primaryEmail').value.trim();
        const backupEmail = document.getElementById('backupEmail').value.trim();
        const preferredLanguage = document.querySelector('input[name="preferredLanguage"]:checked')?.value || 'arabic';
        const preferredMethod = document.querySelector('input[name="preferredMethod"]:checked')?.value || 'email';

        const emergencyName = document.getElementById('emergencyName').value.trim();
        const emergencyRelation = document.getElementById('emergencyRelation').value;
        const emergencyCountryCode = document.getElementById('emergencyCountryCode').value;
        const emergencyMobile = document.getElementById('emergencyMobile').value.trim().replace(/\D/g, '');
        const emergencyEmail = document.getElementById('emergencyEmail').value.trim();
        const declarationCheck = document.getElementById('declarationCheck').checked;

        // التحقق من الحقول المطلوبة
        if (!mobileNumber || !primaryEmail || !emergencyName || !emergencyRelation || !emergencyMobile || !declarationCheck) {
            showAlert('يرجى ملء جميع الحقول المطلوبة.', 'error');
            return;
        }

        // التحقق من صحة رقم الجوال
        if (!validateMobileInput('mobileNumber', 'countryCode')) {
            showAlert('رقم الجوال غير صحيح. يرجى مراجعة الدولة وعدد الأرقام.', 'error');
            return;
        }
        if (!validateMobileInput('emergencyMobile', 'emergencyCountryCode')) {
            showAlert('رقم جوال الطوارئ غير صحيح.', 'error');
            return;
        }

        // التحقق من البريد الإلكتروني
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
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            // 1. تحديث user_metadata في auth (رقم الجوال)
            const { error: updateAuthError } = await supabase.auth.updateUser({
                data: { mobile_number: fullMobile }
            });
            if (updateAuthError) throw updateAuthError;

            // 2. تحديث جدول profiles (أو upsert)
            const profileData = {
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

            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert(profileData, { onConflict: 'id' });

            if (upsertError) throw upsertError;

            showAlert('✅ تم حفظ بيانات الاتصال بنجاح.', 'success');

            // تحديث الكائن المحلي
            currentUser.user_metadata.mobile_number = fullMobile;
            updateHeader(currentUser);

        } catch (err) {
            console.error('فشل حفظ بيانات الاتصال:', err);
            let message = 'تعذر حفظ البيانات.';
            if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
                message = 'رقم الجوال أو البريد الإلكتروني مستخدم بالفعل.';
            }
            showAlert(message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> حفظ بيانات الاتصال';
            }
        }
    }

    // ========== ربط الأحداث ==========
    function bindEvents() {
        const form = document.getElementById('contactForm');
        if (form) {
            form.addEventListener('submit', saveContactInformation);
        }

        // ربط تغيير الدولة بالـ placeholder للجوال الأساسي
        setupCountryMobileBinding('countryCode', 'mobileNumber');
        // وللطوارئ
        setupCountryMobileBinding('emergencyCountryCode', 'emergencyMobile');

        // فلترة الاسم العربي
        const emergencyNameInput = document.getElementById('emergencyName');
        if (emergencyNameInput) {
            emergencyNameInput.addEventListener('input', function () {
                this.value = this.value.replace(/[^\u0600-\u06FF\s]/g, '');
            });
        }
    }

    // ========== التهيئة ==========
    async function init() {
        try {
            // الحصول على Supabase
            if (typeof window.waitForSupabase === 'function') {
                supabase = await window.waitForSupabase();
            } else if (window.TeraAuth && window.TeraAuth._client) {
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
            console.error('فشلت تهيئة صفحة معلومات الاتصال:', err);
            showAlert('تعذر تحميل الصفحة. يرجى تحديث المتصفح.', 'error');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
