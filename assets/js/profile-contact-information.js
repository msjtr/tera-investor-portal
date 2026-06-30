/**
 * profile-contact-information.js – معلومات الاتصال (إصدار نهائي مُصلَح)
 * ============================================================
 * - يعرض اسم المستخدم الحقيقي في الهيدر.
 * - يجلب بيانات الاتصال من user_contact_info ويعرضها بشكل صحيح.
 * - عند الحفظ: يُحدّث user_contact_info و auth_register، ثم يرسل OTP.
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
        box.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
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
            let active = !completed && index === 0;
            html += `<li class="${completed ? 'completed' : ''} ${active ? 'active' : ''}">
                <span class="step-num">${completed ? '<i class="fas fa-check"></i>' : (index+1)}</span>
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

        // ---------- تحديث الهيدر ----------
        const fullName = user.user_metadata?.full_name || 'مستخدم';
        const headerName = document.getElementById('headerUserName');
        if (headerName) headerName.textContent = fullName;
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar) headerAvatar.textContent = fullName.charAt(0).toUpperCase();

        await updateProgressTracker(supabase, user.id);

        // ---------- جلب بيانات الاتصال ----------
        try {
            const { data: contact } = await supabase.from('user_contact_info').select('*').eq('user_id', user.id).maybeSingle();

            if (contact) {
                setElementValue('primaryEmail', contact.email || user.email);
                setElementValue('backupEmail', contact.secondary_email || '');

                // معالجة رقم الهاتف الأساسي
                if (contact.phone) {
                    const { code, number } = extractPhoneParts(contact.phone);
                    setElementValue('countryCode', code);
                    setElementValue('mobileNumber', number);
                }

                // جهة اتصال الطوارئ
                setElementValue('emergencyName', contact.emergency_contact_name || '');
                setElementValue('emergencyRelation', contact.emergency_contact_relation || '');
                if (contact.emergency_contact_phone) {
                    const { code, number } = extractPhoneParts(contact.emergency_contact_phone);
                    setElementValue('emergencyCountryCode', code);
                    setElementValue('emergencyMobile', number);
                }
                setElementValue('emergencyEmail', contact.emergency_contact_email || '');
            } else {
                setElementValue('primaryEmail', user.email || '');
                // محاولة جلب رقم الجوال من auth_register
                try {
                    const { data: reg } = await supabase.from('auth_register').select('mobile_number').eq('user_id', user.id).maybeSingle();
                    if (reg && reg.mobile_number) {
                        const { code, number } = extractPhoneParts(reg.mobile_number);
                        setElementValue('countryCode', code);
                        setElementValue('mobileNumber', number);
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

                    // 2. تحديث auth_register
                    await supabase.from('auth_register').update({ mobile_number: countryCode + mobile, updated_at: new Date().toISOString() }).eq('user_id', user.id);

                    // 3. إرسال رمز التحقق
                    const { error: otpError } = await supabase.auth.signInWithOtp({
                        email: user.email,
                        options: { shouldCreateUser: false }
                    });
                    if (otpError) console.warn('⚠️ تعذر إرسال رمز التحقق:', otpError);

                    localStorage.setItem('pendingVerificationEmail', user.email);
                    localStorage.setItem('tera_verify_type', 'contact_info');

                    showAlert('✅ تم حفظ البيانات. سيتم توجيهك لتأكيد هويتك برمز التحقق.', 'success');
                    setTimeout(() => window.location.replace('/auth/verify-otp.html'), 2000);

                } catch (error) {
                    console.error('فشل الحفظ:', error);
                    showAlert('تعذر حفظ البيانات: ' + (error.message || 'خطأ غير معروف'), 'error');
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                }
            });
        }
    }

    // دالة مساعدة لاستخراج رمز الدولة ورقم الهاتف
    function extractPhoneParts(fullPhone) {
        const knownCodes = ['966', '971', '965', '974', '973', '968', '20'];
        // إزالة علامة + إن وُجدت
        let phone = fullPhone.replace(/^\+/, '');
        let code = '966';
        let number = phone;
        for (let c of knownCodes) {
            if (phone.startsWith(c)) {
                code = c;
                number = phone.substring(c.length);
                break;
            }
        }
        return { code, number };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }
})();
