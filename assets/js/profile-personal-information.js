/**
 * ============================================================
 * profile-personal-information.js - المعلومات الشخصية (v2.0)
 * ============================================================
 * الموقع: /assets/js/profile-personal-information.js
 * - ينتظر جاهزية Supabase (حدث supabase:ready).
 * - يتحقق من جلسة المستخدم ويجلب بياناته الأساسية.
 * - إذا كانت user_personal_info فارغة (عميل جديد)، يتم جلب
 *   الاسم والجوال من auth_register (بيانات التسجيل) تلقائيًا.
 * - يحفظ البيانات في user_personal_info عند تقديم النموذج،
 *   مع تحديث auth_register بالمعلومات الجديدة.
 * - يعرض اسم المستخدم في الهيدر مباشرة.
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
        const alertBox = document.getElementById('formAlert');
        if (alertBox) {
            const alertIcon = document.getElementById('alertIcon');
            const alertMessage = document.getElementById('alertMessage');
            if (alertMessage) alertMessage.textContent = message;
            if (alertIcon) {
                alertIcon.innerHTML = type === 'success'
                    ? '<i class="fas fa-check-circle"></i>'
                    : '<i class="fas fa-exclamation-circle"></i>';
            }
            alertBox.style.display = 'flex';
            alertBox.className = 'alert-box show ' + (type || 'error');
            clearTimeout(window._alertTimer);
            window._alertTimer = setTimeout(() => {
                if (alertBox) alertBox.style.display = 'none';
            }, 8000);
        } else {
            alert(message);
        }
    }

    function setElementValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    // ---------- المنطق الرئيسي ----------
    async function initPage() {
        let supabase;
        try {
            supabase = await waitForSupabase();
        } catch (err) {
            console.error('❌ تعذر الاتصال بـ Supabase:', err);
            showAlert('تعذر الاتصال بقاعدة البيانات. تأكد من اتصالك بالإنترنت.', 'error');
            return;
        }

        // التحقق من جلسة المستخدم
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showAlert('يجب تسجيل الدخول للوصول إلى هذه الصفحة.', 'error');
            setTimeout(() => window.location.replace('/auth/auth/login/login.html'), 2000);
            return;
        }

        // تحديث الهيدر باسم المستخدم (من بيانات التسجيل أو metadata)
        const userName = user.user_metadata?.full_name || 'مستخدم';
        setElementValue('headerUserName', userName);
        const avatar = document.getElementById('headerAvatar');
        if (avatar) avatar.textContent = userName.charAt(0).toUpperCase();

        // ========== جلب البيانات الشخصية ==========
        let profile = null;
        try {
            const { data: personalData } = await supabase
                .from('user_personal_info')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();   // لا يرمي خطأ إذا لم توجد صفوف
            profile = personalData;
        } catch (e) {
            console.warn('⚠️ تعذر جلب user_personal_info:', e);
        }

        // إذا لم توجد بيانات شخصية بعد (عميل جديد)، نجلب من auth_register
        if (!profile) {
            try {
                const { data: regData } = await supabase
                    .from('auth_register')
                    .select('full_name, username, mobile_number')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (regData) {
                    // تعبئة الاسم العربي من بيانات التسجيل
                    setElementValue('fullNameAr', regData.full_name || '');
                    // استخراج رقم الجوال بدون مفتاح الدولة
                    const mobile = (regData.mobile_number || '').replace('+966', '');
                    setElementValue('mobile', mobile);
                    // ضبط مفتاح الدولة الافتراضي
                    const countryCode = document.getElementById('countryCode');
                    if (countryCode) countryCode.value = '+966';
                }
            } catch (e) {
                console.warn('⚠️ تعذر جلب auth_register:', e);
            }
        } else {
            // ملء الحقول من user_personal_info
            setElementValue('fullNameAr', profile.full_name_ar || '');
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
