/**
 * ==========================================================
 * profile-contact-information.js
 * إدارة صفحة معلومات الاتصال – Enterprise Version 2026
 * ==========================================================
 * - جلب بيانات المستخدم وعرضها (من user_metadata أولاً ثم profiles).
 * - تحقق ديناميكي من رقم الجوال حسب الدولة.
 * - إرسال التحديثات إلى Supabase (profiles).
 * - عرض رسائل تنبيه وتفاعل كامل.
 * - معالجة أخطاء عدم وجود جدول profiles أو صلاحيات القراءة.
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

        // رقم الجوال الحالي من user_metadata (الأولوية)
        const currentMobile = currentUser.user_metadata?.mobile_number || '';
        if (currentMobile) {
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

        // تحميل باقي البيانات من profiles (إن وُجدت الصلاحية)
        loadProfileData();
    }

    async function loadProfileData() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();

            // معالجة الأخطاء بهدوء
            if (error) {
                // تجاهل أخطاء عدم وجود جدول، أو عدم وجود صفوف، أو منع الصلاحية
                if (error.code === 'PGRST116' || error.status === 404) {
                    console.log('ℹ️ جدول profiles غير موجود أو لا يحتوي على بيانات.');
                    return;
                }
                if (error.status === 403) {
                    console.log('🔒 لا توجد صلاحية لقراءة جدول profiles (403 Forbidden). سيتم تجاهل تحميل البيانات الإضافية.');
                    return;
                }
                // أي خطأ آخر: تجاهله مع تحذير
                console.warn('⚠️ تعذّر تحميل بيانات profiles:', error);
                return;
            }

            if (!data) return;

            const profile = data;
            // إذا لم يكن رقم الجوال موجوداً في user_metadata، نأخذه من profiles كحل بديل
            if (!currentUser.user_metadata?.mobile_number && profile.mobile_number) {
                const profMobile = profile.mobile_number;
                const countryCodeMatch = profMobile.match(/^\+(\d+)/);
                if (countryCodeMatch) {
                    document.getElementById('countryCode').value = countryCodeMatch[1];
                    document.getElementById('mobileNumber').value = profMobile.substring(countryCodeMatch[0].length);
                }
            }

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

            const langRadios = document.getElementsByName('preferredLanguage');
            for (const radio of langRadios) {
                if (radio.value === (profile.preferred_language || 'arabic')) radio.checked = true;
            }
            const methodRadios = document.getElementsByName('preferredMethod');
            for (const radio of methodRadios) {
                if (radio.value === (profile.preferred_contact_method || 'email')) radio.checked = true;
            }
        } catch (err) {
            console.warn('فشل تحميل بيانات profiles:', err);
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
            input.value = '';
        });
        updatePlaceholder();
        input.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    // ========== الحفظ ==========
    async function saveContactInformation(e) {
        e.preventDefault();

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

        if (!mobileNumber || !primaryEmail || !emergencyName || !emergencyRelation || !emergencyMobile || !declarationCheck) {
            showAlert('يرجى ملء جميع الحقول المطلوبة.', 'error');
            return;
        }

        if (!validateMobileInput('mobileNumber', 'countryCode')) {
            showAlert('رقم الجوال غير صحيح. يرجى مراجعة الدولة وعدد الأرقام.', 'error');
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
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        }

        try {
            // تحديث رقم الجوال في user_metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { mobile_number: fullMobile }
            });
            if (authError) throw authError;

            // محاولة حفظ باقي البيانات في profiles
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

            if (upsertError) {
                if (upsertError.status === 404) {
                    console.warn('⚠️ جدول profiles غير موجود، تم حفظ رقم الجوال في الحساب فقط.');
                    showAlert('✅ تم حفظ بيانات الاتصال الأساسية بنجاح.', 'success');
                } else {
                    throw upsertError;
                }
            } else {
                showAlert('✅ تم حفظ جميع بيانات الاتصال بنجاح.', 'success');
            }

            currentUser.user_metadata.mobile_number = fullMobile;
            updateHeader(currentUser);
        } catch (err) {
            console.error('فشل الحفظ:', err);
            showAlert('تعذر حفظ البيانات. تأكد من صلاحيات قاعدة البيانات.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> حفظ بيانات الاتصال';
            }
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
            console.error('فشلت التهيئة:', err);
            showAlert('تعذر تحميل الصفحة. يرجى تحديث المتصفح.', 'error');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
