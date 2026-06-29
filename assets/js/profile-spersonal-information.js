/**
 * ============================================================
 * profile-spersonal-information.js – معلومات شخصية إضافية (حقيقي)
 * ============================================================
 * الموقع: /assets/js/profile-spersonal-information.js
 * - ينتظر جاهزية Supabase.
 * - يجلب بيانات المستخدم الأساسية (الاسم، الجوال) من auth_register.
 * - يجلب البيانات الإضافية من user_personal_info (نفس جدول المعلومات الشخصية).
 * - يحفظ البيانات عند تقديم النموذج، مع تحديث auth_register.
 * - يُحدّث شريط التقدم (Progress Tracker) تلقائياً.
 */
(function() {
    'use strict';

    // ---------- دوال مساعدة ----------
    function waitForSupabase() {
        return new Promise((resolve, reject) => {
            if (window.teraSupabase) return resolve(window.teraSupabase);
            const timeout = setTimeout(() => reject(new Error('انتهت مهلة انتظار Supabase')), 10000);
            document.addEventListener('supabase:ready', e => {
                clearTimeout(timeout);
                resolve(e.detail.client);
            }, { once: true });
            document.addEventListener('supabase:error', () => {
                clearTimeout(timeout);
                reject(new Error('فشل تحميل Supabase'));
            }, { once: true });
        });
    }

    function showAlert(message, type) {
        const box = document.createElement('div');
        box.className = `alert-box show ${type || 'error'}`;
        box.style.cssText = 'display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; margin-bottom:16px; background:#fef2f2; color:#b91c1c;';
        if (type === 'success') {
            box.style.background = '#f0fdf4';
            box.style.color = '#166534';
        }
        box.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${message}</span>`;
        const container = document.querySelector('.content-container');
        if (container) {
            container.insertBefore(box, container.firstChild);
            setTimeout(() => box.remove(), 5000);
        } else {
            alert(message);
        }
    }

    function setElementValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    async function updateProgressTracker(supabase, userId) {
        const tracker = document.getElementById('progressTracker');
        if (!tracker) return;
        const { data: req } = await supabase
            .from('verification_requests')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
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

    // ---------- المنطق الرئيسي ----------
    async function initPage() {
        let supabase;
        try {
            supabase = await waitForSupabase();
        } catch (err) {
            showAlert('تعذر الاتصال بقاعدة البيانات.', 'error');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showAlert('يجب تسجيل الدخول أولاً.', 'error');
            setTimeout(() => window.location.replace('/auth/auth/login/login.html'), 2000);
            return;
        }

        // تحديث الهيدر
        const userName = user.user_metadata?.full_name || 'مستخدم';
        setElementValue('headerUserName', userName);
        const avatar = document.getElementById('headerAvatar');
        if (avatar) avatar.textContent = userName.charAt(0).toUpperCase();

        // شريط التقدم
        await updateProgressTracker(supabase, user.id);

        // ========== جلب البيانات الأساسية من auth_register ==========
        try {
            const { data: regData } = await supabase
                .from('auth_register')
                .select('full_name, mobile_number')
                .eq('user_id', user.id)
                .maybeSingle();

            if (regData) {
                setElementValue('fullNameAr', regData.full_name || '');
                const mobile = (regData.mobile_number || '').replace('+966', '');
                setElementValue('mobile', mobile);
                const countryCode = document.getElementById('countryCode');
                if (countryCode) countryCode.value = '+966';
            }
        } catch (e) {
            console.warn('⚠️ تعذر جلب auth_register:', e);
        }

        // ========== جلب البيانات الإضافية من user_personal_info ==========
        let profile = null;
        try {
            const { data: personalData } = await supabase
                .from('user_personal_info')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
            profile = personalData;
        } catch (e) {
            console.warn('⚠️ تعذر جلب user_personal_info:', e);
        }

        if (profile) {
            // نملأ الحقول الإضافية (غير الأساسية) من user_personal_info
            setElementValue('fullNameEn', profile.full_name_en || '');
            setElementValue('nationality', profile.nationality || '');
            setElementValue('idType', profile.id_type || '');
            setElementValue('idNumber', profile.id_number || '');
            setElementValue('birthDate', profile.birth_date || '');
            setElementValue('issueDate', profile.issue_date || '');
            setElementValue('expiryDate', profile.expiry_date || '');

            if (profile.gender) {
                const radio = document.querySelector(`input[name="gender"][value="${profile.gender}"]`);
                if (radio) radio.checked = true;
            }

            setElementValue('maritalStatus', profile.marital_status || '');
            setElementValue('occupation', profile.occupation || '');
            setElementValue('employer', profile.employer || '');
            setElementValue('employmentStatus', profile.employment_status || '');
            setElementValue('monthlyIncome', profile.monthly_income || '');

            if (profile.nationality === 'other') {
                const otherContainer = document.getElementById('nationalityOtherContainer');
                if (otherContainer) otherContainer.classList.add('show');
                setElementValue('nationalityOther', profile.nationality_other || '');
            }
        }

        // ---------- معالج تقديم النموذج ----------
        const form = document.getElementById('personalInfoForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();

                const formData = {
                    fullNameAr: document.getElementById('fullNameAr')?.value.trim() || '',
                    fullNameEn: document.getElementById('fullNameEn')?.value.trim() || '',
                    nationality: document.getElementById('nationality')?.value || '',
                    nationalityOther: document.getElementById('nationalityOther')?.value.trim() || '',
                    idType: document.getElementById('idType')?.value || '',
                    idNumber: document.getElementById('idNumber')?.value.trim() || '',
                    birthDate: document.getElementById('birthDate')?.value || '',
                    issueDate: document.getElementById('issueDate')?.value || '',
                    expiryDate: document.getElementById('expiryDate')?.value || '',
                    gender: document.querySelector('input[name="gender"]:checked')?.value || '',
                    maritalStatus: document.getElementById('maritalStatus')?.value || '',
                    occupation: document.getElementById('occupation')?.value.trim() || '',
                    employer: document.getElementById('employer')?.value.trim() || '',
                    employmentStatus: document.getElementById('employmentStatus')?.value || '',
                    monthlyIncome: document.getElementById('monthlyIncome')?.value || '',
                    mobile: document.getElementById('mobile')?.value.trim() || '',
                    countryCode: document.getElementById('countryCode')?.value || '+966'
                };

                if (!formData.fullNameAr || !formData.fullNameEn || !formData.nationality ||
                    !formData.idType || !formData.idNumber || !formData.birthDate || !formData.gender) {
                    showAlert('يرجى ملء جميع الحقول الإلزامية.', 'error');
                    return;
                }

                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : '';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
                }

                try {
                    // 1. تحديث user_personal_info
                    const payload = {
                        user_id: user.id,
                        full_name_ar: formData.fullNameAr,
                        full_name_en: formData.fullNameEn,
                        nationality: formData.nationality,
                        nationality_other: formData.nationality === 'other' ? formData.nationalityOther : null,
                        id_type: formData.idType,
                        id_number: formData.idNumber,
                        birth_date: formData.birthDate,
                        issue_date: formData.issueDate,
                        expiry_date: formData.expiryDate,
                        gender: formData.gender,
                        marital_status: formData.maritalStatus,
                        occupation: formData.occupation,
                        employer: formData.employer,
                        employment_status: formData.employmentStatus,
                        monthly_income: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
                        updated_at: new Date().toISOString()
                    };

                    const { error: personalError } = await supabase
                        .from('user_personal_info')
                        .upsert(payload, { onConflict: 'user_id' });

                    if (personalError) throw personalError;

                    // 2. تحديث auth_register (الاسم ورقم الجوال)
                    const fullPhone = formData.countryCode + formData.mobile;
                    const { error: regError } = await supabase
                        .from('auth_register')
                        .update({
                            full_name: formData.fullNameAr,
                            mobile_number: fullPhone,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', user.id);

                    if (regError) {
                        console.warn('⚠️ تعذر تحديث auth_register:', regError);
                    }

                    // 3. تحديث تقدم الرحلة
                    await supabase.from('verification_requests').upsert({
                        user_id: user.id,
                        personal_info_completed: true,
                        progress: 60,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                    await updateProgressTracker(supabase, user.id);

                    showAlert('✅ تم حفظ البيانات الشخصية بنجاح.', 'success');
                } catch (error) {
                    console.error('❌ فشل الحفظ:', error);
                    showAlert('تعذر حفظ البيانات: ' + (error.message || 'خطأ غير معروف'), 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                }
            });
        }

        // إظهار حقل "أخرى" عند اختيار الجنسية "أخرى"
        const nationalitySelect = document.getElementById('nationality');
        if (nationalitySelect) {
            nationalitySelect.addEventListener('change', function() {
                const otherContainer = document.getElementById('nationalityOtherContainer');
                if (otherContainer) {
                    otherContainer.classList.toggle('show', this.value === 'other');
                }
            });
        }
    }

    // بدء التهيئة عند اكتمال تحميل DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }
})();
