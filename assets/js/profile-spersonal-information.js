/**
 * profile-personal-information.js - الصفحة الحقيقية للمعلومات الشخصية
 * الموقع: /assets/js/profile-personal-information.js
 * - ينتظر جاهزية Supabase.
 * - يحمّل البيانات الشخصية من جدول user_personal_info.
 * - يحفظ البيانات عند تقديم النموذج.
 * - يُحدّث الهيدر باسم المستخدم.
 */
(function() {
    'use strict';

    async function waitForSupabase() {
        if (window.teraSupabase) return window.teraSupabase;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
            document.addEventListener('supabase:ready', e => {
                clearTimeout(timeout);
                resolve(e.detail.client);
            }, { once: true });
            document.addEventListener('supabase:error', () => {
                clearTimeout(timeout);
                reject(new Error('error'));
            }, { once: true });
        });
    }

    function populateForm(profile) {
        if (!profile) return;
        document.getElementById('fullNameAr').value = profile.full_name_ar || '';
        document.getElementById('fullNameEn').value = profile.full_name_en || '';
        document.getElementById('nationality').value = profile.nationality || '';
        document.getElementById('idType').value = profile.id_type || '';
        document.getElementById('idNumber').value = profile.id_number || '';
        document.getElementById('birthDate').value = profile.birth_date || '';
        document.getElementById('issueDate').value = profile.issue_date || '';
        document.getElementById('expiryDate').value = profile.expiry_date || '';
        if (profile.gender) {
            const radio = document.querySelector(`input[name="gender"][value="${profile.gender}"]`);
            if (radio) radio.checked = true;
        }
        document.getElementById('maritalStatus').value = profile.marital_status || '';
        document.getElementById('occupation').value = profile.occupation || '';
        document.getElementById('employer').value = profile.employer || '';
        document.getElementById('employmentStatus').value = profile.employment_status || '';
        document.getElementById('monthlyIncome').value = profile.monthly_income || '';
        if (profile.nationality === 'other') {
            document.getElementById('nationalityOtherContainer').classList.add('show');
            document.getElementById('nationalityOther').value = profile.nationality_other || '';
        }
    }

    async function updateHeader() {
        try {
            const supabase = await waitForSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const name = user.user_metadata?.full_name || 'مستخدم';
                document.getElementById('headerUserName').textContent = name;
                document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
            }
        } catch (e) {
            console.warn('تعذر تحديث الهيدر:', e);
        }
    }

    async function loadPersonalInfo() {
        try {
            const supabase = await waitForSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('يجب تسجيل الدخول أولاً.');
                window.location.replace('/auth/auth/login/login.html');
                return;
            }
            const { data, error } = await supabase
                .from('user_personal_info')
                .select('*')
                .eq('user_id', user.id)
                .single();
            if (error && error.code !== 'PGRST116') {
                console.error('خطأ في جلب البيانات:', error);
            }
            if (data) {
                populateForm(data);
            }
        } catch (e) {
            console.error('فشل تحميل البيانات:', e);
        }
    }

    async function savePersonalInfo(formData) {
        const supabase = await waitForSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('غير مسجل الدخول');

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

        const { error } = await supabase
            .from('user_personal_info')
            .upsert(payload, { onConflict: 'user_id' });

        if (error) throw error;
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('personalInfoForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = {
                fullNameAr: document.getElementById('fullNameAr').value.trim(),
                fullNameEn: document.getElementById('fullNameEn').value.trim(),
                nationality: document.getElementById('nationality').value,
                nationalityOther: document.getElementById('nationalityOther').value.trim(),
                idType: document.getElementById('idType').value,
                idNumber: document.getElementById('idNumber').value.trim(),
                birthDate: document.getElementById('birthDate').value,
                issueDate: document.getElementById('issueDate').value,
                expiryDate: document.getElementById('expiryDate').value,
                gender: document.querySelector('input[name="gender"]:checked')?.value,
                maritalStatus: document.getElementById('maritalStatus').value,
                occupation: document.getElementById('occupation').value.trim(),
                employer: document.getElementById('employer').value.trim(),
                employmentStatus: document.getElementById('employmentStatus').value,
                monthlyIncome: document.getElementById('monthlyIncome').value
            };

            if (!formData.fullNameAr || !formData.fullNameEn || !formData.nationality || !formData.idType || !formData.idNumber || !formData.birthDate || !formData.gender) {
                alert('يرجى ملء جميع الحقول الإلزامية.');
                return;
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

            try {
                await savePersonalInfo(formData);
                alert('✅ تم حفظ البيانات الشخصية بنجاح.');
            } catch (error) {
                console.error('فشل الحفظ:', error);
                alert('تعذر حفظ البيانات: ' + (error.message || 'خطأ غير معروف'));
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });

        document.getElementById('nationality').addEventListener('change', function() {
            const otherContainer = document.getElementById('nationalityOtherContainer');
            if (this.value === 'other') {
                otherContainer.classList.add('show');
            } else {
                otherContainer.classList.remove('show');
            }
        });

        updateHeader();
        loadPersonalInfo();
    });
})();
