/**
 * profile-contact-information.js – معلومات الاتصال (حفظ + تحقق OTP)
 * ============================================================
 * - يحفظ البيانات في user_contact_info أولاً.
 * - ثم يرسل رمز OTP ويُوجّه إلى verify-otp.html.
 * - يعرض اسم المستخدم في الهيدر.
 * - يجلب البيانات المخزنة ويعرضها بشكل صحيح.
 */
(function() {
    'use strict';

    function waitForSupabase() {
        return new Promise((resolve, reject) => {
            if (window.teraSupabase) return resolve(window.teraSupabase);
            const timeout = setTimeout(() => reject(new Error('انتهت مهلة انتظار Supabase')), 10000);
            document.addEventListener('supabase:ready', e => { clearTimeout(timeout); resolve(e.detail.client); }, { once: true });
            document.addEventListener('supabase:error', () => { clearTimeout(timeout); reject(new Error('فشل تحميل Supabase')); }, { once: true });
        });
    }

    function showAlert(message, type) {
        const box = document.getElementById('formAlert');
        if (!box) return alert(message);
        box.innerHTML = `<span id="alertIcon">${type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>'}</span>
                         <span id="alertMessage">${message}</span>`;
        box.style.display = 'flex';
        box.className = `alert-box show ${type || 'error'}`;
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => { if (box) box.style.display = 'none'; }, 8000);
    }

    function setElementValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    async function updateProgressTracker(supabase, userId) {
        const tracker = document.getElementById('progressTracker');
        if (!tracker) return;
        const { data: req } = await supabase.from('verification_requests').select('*').eq('user_id', userId).maybeSingle();
        const reqData = req || {};
        const stages = [
            { key: 'email_verified', label: 'التحقق من البريد', icon: 'fa-envelope' },
            { key: 'personal_info_completed', label: 'المعلومات الشخصية', icon: 'fa-user' },
            { key: 'national_address_completed', label: 'العنوان الوطني', icon: 'fa-map-marker-alt' },
            { key: 'contact_info_completed', label: 'معلومات التواصل', icon: 'fa-phone' },
            { key: 'bank_info_completed', label: 'المعلومات البنكية', icon: 'fa-university' },
            { key: 'attachments_completed', label: 'المرفقات', icon: 'fa-paperclip' },
            { key: 'agreed', label: 'الإقرار', icon: 'fa-check' },
            { key: 'submitted', label: 'إرسال الطلب', icon: 'fa-paper-plane' }
        ];
        let html = '';
        stages.forEach((stage, index) => {
            const completed = reqData[stage.key] || (stage.key === 'email_verified');
            let active = false;
            if (!completed && (index === 0 || stages[index-1]?.completed)) active = true;
            html += `<li class="${completed ? 'completed' : ''} ${active ? 'active' : ''}">
                <span class="step-num">${completed ? '<i class="fas fa-check" style="font-size:11px;"></i>' : (index+1)}</span>
                <span class="step-label">${stage.label}</span>
            </li>`;
            if (index < stages.length - 1) html += `<li class="step-line ${completed ? 'completed' : ''}"></li>`;
        });
        tracker.innerHTML = html;
    }

    async function initPage() {
        let supabase;
        try { supabase = await waitForSupabase(); } catch (err) { showAlert('تعذر الاتصال بقاعدة البيانات.', 'error'); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showAlert('يجب تسجيل الدخول أولاً.', 'error');
            setTimeout(() => window.location.replace('/auth/auth/login/login.html'), 2000);
            return;
        }

        // ---------- تحديث الهيدر باسم المستخدم ----------
        const fullName = user.user_metadata?.full_name || 'مستخدم';
        const headerName = document.getElementById('headerUserName');
        if (headerName) headerName.textContent = fullName;
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar) headerAvatar.textContent = fullName.charAt(0).toUpperCase();

        // شريط التقدم
        await updateProgressTracker(supabase, user.id);

        // ---------- جلب بيانات الاتصال المخزنة ----------
        try {
            const { data: contact } = await supabase.from('user_contact_info').select('*').eq('user_id', user.id).maybeSingle();

            if (contact) {
                setElementValue('primaryEmail', contact.email || user.email);
                setElementValue('backupEmail', contact.secondary_email || '');

                // معالجة رقم الهاتف: استخراج رمز الدولة والرقم
                if (contact.phone) {
                    // افتراض أن رقم الهاتف يبدأ برمز الدولة (مثلاً "966551234567")
                    let phoneNumber = contact.phone;
                    let countryCode = '966'; // افتراضي السعودية
                    // محاولة فصل رمز الدولة عن الرقم إذا كان الطول أكبر من 9
                    if (phoneNumber.length > 9) {
                        // نأخذ أول 3 أرقام كرمز دولة (أو أكثر حسب الدولة)
                        const possibleCode = phoneNumber.substring(0, 3);
                        // قائمة رموز الدول المدعومة
                        const knownCodes = ['966', '971', '965', '974', '973', '968', '20'];
                        if (knownCodes.includes(possibleCode)) {
                            countryCode = possibleCode;
                            phoneNumber = phoneNumber.substring(3);
                        }
                    }
                    setElementValue('countryCode', countryCode);
                    setElementValue('mobileNumber', phoneNumber);
                }

                // جهة اتصال الطوارئ
                setElementValue('emergencyName', contact.emergency_contact_name || '');
                setElementValue('emergencyRelation', contact.emergency_contact_relation || '');

                if (contact.emergency_contact_phone) {
                    let emergencyPhone = contact.emergency_contact_phone;
                    let emergencyCode = '966';
                    if (emergencyPhone.length > 9) {
                        const possibleCode = emergencyPhone.substring(0, 3);
                        const knownCodes = ['966', '971', '965', '974', '973', '968', '20'];
                        if (knownCodes.includes(possibleCode)) {
                            emergencyCode = possibleCode;
                            emergencyPhone = emergencyPhone.substring(3);
                        }
                    }
                    setElementValue('emergencyCountryCode', emergencyCode);
                    setElementValue('emergencyMobile', emergencyPhone);
                }

                setElementValue('emergencyEmail', contact.emergency_contact_email || '');
            } else {
                // لا توجد بيانات اتصال سابقة، نستخدم البريد الإلكتروني من الجلسة
                setElementValue('primaryEmail', user.email || '');
                // يمكن محاولة جلب رقم الجوال من auth_register إن وُجد
                try {
                    const { data: reg } = await supabase.from('auth_register').select('mobile_number').eq('user_id', user.id).maybeSingle();
                    if (reg && reg.mobile_number) {
                        let phone = reg.mobile_number;
                        let code = '966';
                        if (phone.startsWith('+')) phone = phone.substring(1);
                        if (phone.length > 9) {
                            const possibleCode = phone.substring(0, 3);
                            const knownCodes = ['966', '971', '965', '974', '973', '968', '20'];
                            if (knownCodes.includes(possibleCode)) {
                                code = possibleCode;
                                phone = phone.substring(3);
                            }
                        }
                        setElementValue('countryCode', code);
                        setElementValue('mobileNumber', phone);
                    }
                } catch (e) {}
            }
        } catch (e) { console.warn('تعذر جلب بيانات الاتصال:', e); }

        // ---------- معالج النموذج ----------
        const form = document.getElementById('contactForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const primaryEmail = document.getElementById('primaryEmail').value.trim();
                const mobile = document.getElementById('mobileNumber').value.trim();
                const countryCode = document.getElementById('countryCode').value;
                const emergencyName = document.getElementById('emergencyName').value.trim();
                const emergencyMobile = document.getElementById('emergencyMobile').value.trim();

                if (!primaryEmail || !mobile || !emergencyName || !emergencyMobile) {
                    showAlert('يرجى ملء جميع الحقول الإلزامية.', 'error');
                    return;
                }

                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : '';
                if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'; }

                try {
                    // 1. حفظ بيانات الاتصال
                    const payload = {
                        user_id: user.id,
                        email: primaryEmail,
                        secondary_email: document.getElementById('backupEmail').value.trim(),
                        phone: countryCode + mobile,
                        emergency_contact_name: emergencyName,
                        emergency_contact_relation: document.getElementById('emergencyRelation').value,
                        emergency_contact_phone: document.getElementById('emergencyCountryCode').value + emergencyMobile,
                        emergency_contact_email: document.getElementById('emergencyEmail').value.trim(),
                        updated_at: new Date().toISOString()
                    };

                    const { error: saveError } = await supabase.from('user_contact_info').upsert(payload, { onConflict: 'user_id' });
                    if (saveError) throw saveError;

                    // 2. تحديث auth_register برقم الجوال
                    await supabase.from('auth_register').update({ mobile_number: countryCode + mobile, updated_at: new Date().toISOString() }).eq('user_id', user.id);

                    // 3. إرسال رمز التحقق
                    const { error: otpError } = await supabase.auth.signInWithOtp({
                        email: user.email,
                        options: { shouldCreateUser: false }
                    });
                    if (otpError) console.warn('⚠️ تعذر إرسال رمز التحقق:', otpError);

                    // 4. تخزين بيانات التوجيه
                    localStorage.setItem('pendingVerificationEmail', user.email);
                    localStorage.setItem('tera_verify_type', 'contact_info');

                    showAlert('✅ تم حفظ البيانات. سيتم توجيهك لتأكيد هويتك برمز التحقق.', 'success');
                    setTimeout(() => {
                        window.location.replace('/auth/verify-otp.html');
                    }, 2000);

                } catch (error) {
                    console.error('فشل الحفظ:', error);
                    showAlert('تعذر حفظ البيانات: ' + (error.message || 'خطأ غير معروف'), 'error');
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }
})();
