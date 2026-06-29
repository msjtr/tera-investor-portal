/**
 * ============================================================
 * profile-personal-information.js - الصفحة الحقيقية للمعلومات الشخصية
 * الموقع: /assets/js/profile-personal-information.js
 * - ينتظر جاهزية Supabase (حدث supabase:ready).
 * - يتحقق من جلسة المستخدم ويجلب بياناته الشخصية من جدول user_personal_info.
 * - يملأ النموذج بالبيانات (إن وُجدت) ويعرض اسم المستخدم في الهيدر.
 * - يحفظ البيانات (جديدة أو محدثة) عند تقديم النموذج.
 * - يُظهر رسائل تنبيه أثناء الحفظ.
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
        // يمكن استخدام عنصر alert مخصص إذا وجد، وإلا نستخدم alert العادي
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

        // تحديث الهيدر باسم المستخدم
        const userName = user.user_metadata?.full_name || 'مستخدم';
        document.getElementById('headerUserName').textContent = userName;
        document.getElementById('headerAvatar').textContent = userName.charAt(0).toUpperCase();

        // جلب البيانات الشخصية من جدول user_personal_info
        try {
            const { data: profile, error } = await supabase
                .from('user_personal_info')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
                console.error('⚠️ خطأ في جلب البيانات الشخصية:', error);
            }

            if (profile) {
                // ملء الحقول بالبيانات الموجودة
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

                // إظهار حقل الجنسية الأخرى إذا كانت 'other'
                if (profile.nationality === 'other') {
                    document.getElementById('nationalityOtherContainer').classList.add('show');
                    document.getElementById('nationalityOther').value = profile.nationality_other || '';
                }
            }
        } catch (e) {
            console.warn('⚠️ فشل جلب البيانات الشخصية:', e);
        }

        // ---------- معالج تقديم النموذج ----------
        document.getElementById('personalInfoForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            // جمع البيانات من الحقول
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

            // تحقق بسيط من الحقول الإلزامية
            if (!formData.fullNameAr || !formData.fullNameEn || !formData.nationality ||
                !formData.idType || !formData.idNumber || !formData.birthDate || !formData.gender) {
                showAlert('يرجى ملء جميع الحقول الإلزامية.', 'error');
                return;
            }

            // إظهار اللودر
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

            try {
                // تحضير كائن البيانات
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

                // حفظ أو تحديث البيانات (upsert)
                const { error } = await supabase
                    .from('user_personal_info')
                    .upsert(payload, { onConflict: 'user_id' });

                if (error) throw error;

                showAlert('✅ تم حفظ البيانات الشخصية بنجاح.', 'success');
            } catch (error) {
                console.error('❌ فشل الحفظ:', error);
                showAlert('تعذر حفظ البيانات: ' + (error.message || 'خطأ غير معروف'), 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });

        // ---------- مستمعات أحداث إضافية ----------
        // إظهار حقل "أخرى" عند اختيار الجنسية "أخرى"
        document.getElementById('nationality').addEventListener('change', function() {
            const otherContainer = document.getElementById('nationalityOtherContainer');
            if (this.value === 'other') {
                otherContainer.classList.add('show');
            } else {
                otherContainer.classList.remove('show');
            }
        });
    }

    // بدء التهيئة عند اكتمال تحميل DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }
})();
