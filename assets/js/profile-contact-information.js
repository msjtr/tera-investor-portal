/**
 * ==========================================================
 * profile-contact-information.js – الإصدار النهائي (بدون profiles)
 * ==========================================================
 * - يعرض البريد من user.email مباشرة.
 * - يعرض رقم الجوال من user_metadata (يُخزّن تلقائياً بعد التسجيل).
 * - لا يتصل بجدول profiles أبداً لتجنب أخطاء 403.
 * - الحفظ يُحدّث user_metadata فقط (رقم الجوال).
 * - باقي بيانات الطوارئ تُحفظ لاحقاً عند توفر profiles.
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
        const avatar = fullName.charAt(0).toUpperCase();
        document.getElementById('headerUserName').textContent = fullName;
        document.getElementById('headerAvatar').textContent = avatar;
    }

    // عرض البيانات من auth فقط (بدون profiles)
    function populateCurrentData() {
        if (!currentUser) return;

        // البريد الإلكتروني
        document.getElementById('primaryEmail').value = currentUser.email || '';

        // رقم الجوال من user_metadata
        const mobile = currentUser.user_metadata?.mobile_number || '';
        if (mobile) {
            const match = mobile.match(/^\+(\d+)/);
            if (match) {
                document.getElementById('countryCode').value = match[1];
                document.getElementById('mobileNumber').value = mobile.substring(match[0].length);
            }
        }
        // باقي الحقول (الطوارئ وغيرها) تبقى فارغة لعدم وجود profiles،
        // وعند الحفظ سيتم حفظ رقم الجوال فقط في auth.
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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(primaryEmail)) {
            showAlert('البريد الإلكتروني غير صحيح.', 'error');
            return;
        }

        const fullMobile = '+' + countryCode + mobileNumber;
        const btn = document.querySelector('.btn-submit');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            // تحديث رقم الجوال في user_metadata (المصدر الوحيد الموثوق حالياً)
            const { error } = await supabase.auth.updateUser({
                data: { mobile_number: fullMobile }
            });
            if (error) throw error;

            showAlert('✅ تم حفظ بيانات الاتصال بنجاح.', 'success');
            currentUser.user_metadata.mobile_number = fullMobile;
            updateHeader(currentUser);
        } catch (err) {
            console.error(err);
            showAlert('تعذر حفظ البيانات. حاول مرة أخرى.', 'error');
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
            populateCurrentData(); // تعبئة البريد والجوال فوراً من user
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
