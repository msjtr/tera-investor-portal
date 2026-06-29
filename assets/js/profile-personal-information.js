/**
 * ============================================================
 * profile-personal-information.js – معلومات شخصية + رحلة العميل (v5.0)
 * ============================================================
 * - يبني شريط التقدم من جدول verification_requests.
 * - يبني حقول رفع المرفقات حسب نوع الهوية.
 * - يحفظ البيانات ويحدث progress تلقائياً.
 * - بعد اكتمال جميع المراحل، يُظهر زر "إرسال الطلب للمراجعة".
 * - يحافظ على إرسال رمز OTP للتحقق.
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

    async function uploadFile(file, userId, folder) {
        const supabase = window.teraSupabase;
        const fileName = `${folder}/${userId}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from('attachments')
            .upload(fileName, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName);
        return { path: fileName, publicUrl: urlData.publicUrl, size: file.size, type: file.type };
    }

    function buildUploadFields(idType) {
        const container = document.getElementById('uploadFieldsContainer');
        if (!container) return;
        container.innerHTML = '';

        const types = {
            national: [
                { label: 'رفع صورة الهوية (الوجه الأمامي)', key: 'id_front' },
                { label: 'رفع صورة الهوية (الوجه الخلفي)', key: 'id_back' }
            ],
            gcc: [
                { label: 'رفع الهوية الخليجية (الوجه الأمامي)', key: 'gcc_front' },
                { label: 'رفع الهوية الخليجية (الوجه الخلفي)', key: 'gcc_back' }
            ],
            arab: [
                { label: 'رفع الهوية العربية (الوجه الأمامي)', key: 'arab_front' },
                { label: 'رفع الهوية العربية (الوجه الخلفي)', key: 'arab_back' }
            ],
            residency: [
                { label: 'رفع صورة الإقامة (الوجه الأمامي)', key: 'residency_front' },
                { label: 'رفع صورة الإقامة (الوجه الخلفي)', key: 'residency_back' }
            ],
            passport: [
                { label: 'رفع صفحة بيانات جواز السفر', key: 'passport_page' }
            ]
        };

        const fields = types[idType] || [];
        fields.forEach(f => {
            const div = document.createElement('div');
            div.className = 'upload-zone';
            div.innerHTML = `<i class="fas fa-cloud-upload-alt"></i>
                <span>${f.label}</span>
                <small class="sub-text">PDF, JPG, PNG (max 5MB)</small>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-key="${f.key}" style="display:none">`;
            container.appendChild(div);

            const fileInput = div.querySelector('input[type="file"]');
            fileInput.addEventListener('change', function(e) {
                if (this.files[0]) {
                    const span = div.querySelector('span');
                    span.textContent = this.files[0].name;
                    span.style.color = '#028090';
                    div.classList.add('file-selected');
                }
            });
            div.addEventListener('click', () => fileInput.click());
        });
    }

    /**
     * تحديث شريط التقدم بناءً على بيانات verification_requests
     */
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
        let activeFound = false;
        stages.forEach((stage, index) => {
            const completed = reqData[stage.key] || (stage.key === 'email_verified');
            let active = false;
            if (!completed && !activeFound) {
                active = true;
                activeFound = true;
            }
            html += `<div class="progress-step ${completed ? 'completed' : ''} ${active ? 'active' : ''}">
                <i class="fas ${stage.icon}"></i> ${stage.label}
            </div>`;
        });

        const percentageEl = document.getElementById('progressPercentage');
        if (percentageEl) percentageEl.textContent = (reqData.progress || 0) + '% مكتمل';

        // الاحتفاظ بعنصر النسبة المئوية في النهاية
        const existingPercent = tracker.querySelector('.progress-percentage');
        tracker.innerHTML = html + (existingPercent ? existingPercent.outerHTML : '');

        // إظهار أو إخفاء زر الإرسال للمراجعة
        const submitReviewBtn = document.getElementById('submitReviewBtn');
        if (submitReviewBtn) {
            const allCompleted = stages.slice(0, -1).every(s => reqData[s.key] || s.key === 'email_verified');
            submitReviewBtn.style.display = allCompleted && !reqData.submitted ? 'inline-block' : 'none';
        }
    }

    // ---------- المنطق الرئيسي ----------
    async function initPage() {
        let supabase;
        try { supabase = await waitForSupabase(); }
        catch (err) { showAlert('تعذر الاتصال بقاعدة البيانات.', 'error'); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showAlert('يجب تسجيل الدخول أولاً.', 'error');
            setTimeout(() => window.location.replace('/auth/auth/login/login.html'), 2000);
            return;
        }

        const userName = user.user_metadata?.full_name || 'مستخدم';
        setElementValue('headerUserName', userName);
        const avatar = document.getElementById('headerAvatar');
        if (avatar) avatar.textContent = userName.charAt(0).toUpperCase();

        // تحديث شريط التقدم
        await updateProgressTracker(supabase, user.id);

        // ========== جلب البيانات الشخصية ==========
        let profile = null;
        try {
            const { data: personalData } = await supabase
                .from('user_personal_info')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
            profile = personalData;
        } catch (e) { console.warn('⚠️ تعذر جلب user_personal_info:', e); }

        if (!profile) {
            try {
                const { data: regData } = await supabase
                    .from('auth_register')
                    .select('full_name, username, mobile_number')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (regData) {
                    setElementValue('fullNameAr', regData.full_name || '');
                    const mobile = (regData.mobile_number || '').replace('+966', '');
                    setElementValue('mobile', mobile);
                    const countryCode = document.getElementById('countryCode');
                    if (countryCode) countryCode.value = '+966';
                }
            } catch (e) { console.warn('⚠️ تعذر جلب auth_register:', e); }
        } else {
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

            if (profile.id_type) {
                const docCard = document.getElementById('documentsCard');
                if (docCard) docCard.style.display = 'block';
                buildUploadFields(profile.id_type);
            }
        }

        const idTypeSelect = document.getElementById('idType');
        if (idTypeSelect) {
            idTypeSelect.addEventListener('change', function() {
                const docCard = document.getElementById('documentsCard');
                if (docCard) docCard.style.display = 'block';
                buildUploadFields(this.value);
                const uploadWarning = document.getElementById('uploadWarning');
                if (uploadWarning) uploadWarning.style.display = 'none';
            });
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

                const requiredUploads = document.querySelectorAll('#uploadFieldsContainer input[type="file"]');
                let allUploaded = requiredUploads.length > 0;
                requiredUploads.forEach(inp => {
                    if (!inp.files || !inp.files[0]) allUploaded = false;
                });
                if (!allUploaded) {
                    const uploadWarning = document.getElementById('uploadWarning');
                    if (uploadWarning) uploadWarning.style.display = 'flex';
                    showAlert('يجب رفع جميع المرفقات المطلوبة.', 'error');
                    return;
                } else {
                    const uploadWarning = document.getElementById('uploadWarning');
                    if (uploadWarning) uploadWarning.style.display = 'none';
                }

                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : '';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
                }

                try {
                    const fileRecords = [];
                    for (let inp of requiredUploads) {
                        if (inp.files[0]) {
                            const uploaded = await uploadFile(inp.files[0], user.id, formData.idType);
                            fileRecords.push({
                                user_id: user.id,
                                file_name: inp.files[0].name,
                                file_path: uploaded.path,
                                file_type: uploaded.type,
                                file_size: uploaded.size,
                                description: inp.dataset.key,
                                uploaded_at: new Date().toISOString()
                            });
                        }
                    }

                    const personalPayload = {
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

                    await supabase.from('user_personal_info').upsert(personalPayload, { onConflict: 'user_id' });

                    const fullPhone = formData.countryCode + formData.mobile;
                    await supabase.from('auth_register').update({
                        full_name: formData.fullNameAr,
                        mobile_number: fullPhone,
                        updated_at: new Date().toISOString()
                    }).eq('user_id', user.id);

                    if (fileRecords.length > 0) {
                        await supabase.from('user_attachments').insert(fileRecords);
                    }

                    // تحديث تقدم الطلب في verification_requests
                    await supabase.from('verification_requests').upsert({
                        user_id: user.id,
                        personal_info_completed: true,
                        attachments_completed: true,
                        agreed: document.getElementById('declarationCheck')?.checked || false,
                        progress: 60, // يمكن حسابها بشكل ديناميكي لاحقاً
                        current_stage: 'personal_info',
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                    // إرسال رمز OTP للتحقق
                    const { error: otpError } = await supabase.auth.signInWithOtp({
                        email: user.email,
                        options: { shouldCreateUser: false }
                    });
                    if (otpError) console.warn('⚠️ تعذر إرسال رمز التحقق:', otpError);

                    localStorage.setItem('pendingVerificationEmail', user.email);
                    localStorage.setItem('tera_verify_type', 'personal_info');

                    await updateProgressTracker(supabase, user.id);

                    showAlert('✅ تم حفظ البيانات. سيتم توجيهك لتأكيد هويتك برمز التحقق.', 'success');
                    setTimeout(() => {
                        window.location.replace('/auth/verify-otp.html');
                    }, 2000);

                } catch (error) {
                    console.error('❌ فشل الحفظ:', error);
                    showAlert('تعذر الحفظ: ' + (error.message || 'خطأ غير معروف'), 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                }
            });
        }

        // زر إرسال الطلب للمراجعة (يظهر عند اكتمال جميع المراحل)
        const submitReviewBtn = document.getElementById('submitReviewBtn');
        if (submitReviewBtn) {
            submitReviewBtn.addEventListener('click', async function() {
                try {
                    await supabase.from('verification_requests').upsert({
                        user_id: user.id,
                        status: 'under_review',
                        submitted: true,
                        submitted_at: new Date().toISOString(),
                        progress: 100,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                    await updateProgressTracker(supabase, user.id);
                    showAlert('✅ تم إرسال طلبك للمراجعة بنجاح!', 'success');
                } catch (error) {
                    showAlert('تعذر الإرسال: ' + error.message, 'error');
                }
            });
        }

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }
})();
