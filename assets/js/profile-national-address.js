/**
 * ============================================================
 * profile-national-address.js – العنوان الوطني (حقيقي مع Supabase)
 * ============================================================
 * الموقع: /assets/js/profile-national-address.js
 * - ينتظر جاهزية Supabase.
 * - يجلب بيانات المستخدم ويعرض اسمه في الهيدر.
 * - يجلب العنوان الوطني المخزن من user_national_address ويملأ النموذج.
 * - يدعم رفع الملفات إلى Supabase Storage (أسماء آمنة).
 * - يحفظ البيانات ويرسل OTP للتأكيد.
 * - يربط مرفق إثبات العنوان بالقسم ويُظهره تلقائياً.
 * - يُحدّث شريط التقدم (Progress Tracker) تلقائياً.
 */
(function() {
    'use strict';

    // ---------- عنصر التنبيه الاحتياطي ----------
    function ensureAlertBox() {
        if (document.getElementById('formAlert')) return;
        const box = document.createElement('div');
        box.id = 'formAlert';
        box.className = 'alert-box';
        box.style.cssText = 'display:none; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; margin-bottom:16px;';
        box.innerHTML = '<span id="alertIcon"></span><span id="alertMessage"></span>';
        const form = document.getElementById('nationalAddressForm');
        if (form) form.parentNode.insertBefore(box, form);
    }

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

    /** تعقيم اسم الملف لإزالة الأحرف غير الآمنة (ASCII فقط) */
    function sanitizeFileName(originalName) {
        const ext = originalName.split('.').pop().toLowerCase();
        const safeBase = `${Date.now()}-${crypto.randomUUID()}`;
        return `${safeBase}.${ext}`;
    }

    async function uploadFile(file, userId, folder) {
        const supabase = window.teraSupabase;
        const safeName = sanitizeFileName(file.name);
        const fileName = `${folder}/${userId}/${safeName}`;
        const { data, error } = await supabase.storage
            .from('attachments')
            .upload(fileName, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName);
        return { path: fileName, publicUrl: urlData.publicUrl, size: file.size, type: file.type };
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
            if (index < stages.length - 1) {
                html += `<li class="step-line ${completed ? 'completed' : ''}"></li>`;
            }
        });
        tracker.innerHTML = html;
    }

    /** جلب آخر مرفق إثبات عنوان */
    async function loadExistingProofAttachment(supabase, userId) {
        const { data } = await supabase
            .from('user_attachments')
            .select('*')
            .eq('user_id', userId)
            .eq('description', 'proof_address')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        return data || null;
    }

    // ---------- المنطق الرئيسي ----------
    async function initPage() {
        ensureAlertBox();
        let supabase;
        try { supabase = await waitForSupabase(); }
        catch (err) { showAlert('تعذر الاتصال بقاعدة البيانات.', 'error'); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showAlert('يجب تسجيل الدخول أولاً.', 'error');
            setTimeout(() => window.location.replace('/auth/auth/login/login.html'), 2000);
            return;
        }

        // تحديث الهيدر
        const userName = user.user_metadata?.full_name || 'مستخدم';
        const headerNameEl = document.getElementById('headerUserName');
        if (headerNameEl) headerNameEl.textContent = userName;
        const avatar = document.getElementById('headerAvatar');
        if (avatar) avatar.textContent = userName.charAt(0).toUpperCase();

        // شريط التقدم
        await updateProgressTracker(supabase, user.id);

        // جلب العنوان الوطني المخزن
        try {
            const { data: addr } = await supabase
                .from('user_national_address')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (addr) {
                setElementValue('buildingNumber', addr.building_number || '');
                setElementValue('streetName', addr.street || '');
                setElementValue('neighborhood', addr.district || '');
                setElementValue('city', addr.city || '');
                setElementValue('region', addr.region || '');
                setElementValue('postalCode', addr.postal_code || '');
                setElementValue('additionalNumber', addr.additional_number || '');
                setElementValue('unitNumber', addr.unit_number || '');
            }
        } catch (e) { console.warn('تعذر جلب العنوان:', e); }

        // 🔁 تحميل مرفق الإثبات الموجود سابقاً وربطه بالقسم
        let existingProofAttachment = null;
        try {
            existingProofAttachment = await loadExistingProofAttachment(supabase, user.id);
            if (existingProofAttachment) {
                const zone = document.getElementById('proofAddressUpload');
                if (zone) {
                    const span = zone.querySelector('span:first-of-type');
                    if (span) {
                        span.textContent = existingProofAttachment.file_name;
                        span.style.color = '#028090';
                    }
                }
            }
        } catch (e) { console.warn('تعذر تحميل مرفق الإثبات:', e); }

        // إظهار/إخفاء الأقسام حسب نوع الإقامة
        const residencyRadios = document.querySelectorAll('input[name="residencyType"]');
        const nationalSection = document.getElementById('nationalAddressSection');
        const outsideSection = document.getElementById('outsideAddressSection');
        function toggleAddressSections() {
            const selected = document.querySelector('input[name="residencyType"]:checked');
            if (!selected) return;
            if (selected.value === 'citizen' || selected.value === 'resident_inside') {
                nationalSection.style.display = 'block';
                outsideSection.style.display = 'none';
            } else {
                nationalSection.style.display = 'none';
                outsideSection.style.display = 'block';
            }
        }
        residencyRadios.forEach(radio => radio.addEventListener('change', toggleAddressSections));
        toggleAddressSections();

        // تفعيل رفع الملفات (عام)
        document.querySelectorAll('.upload-zone').forEach(zone => {
            const fileInput = zone.querySelector('input[type="file"]');
            if (fileInput) {
                zone.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
                fileInput.addEventListener('change', function(e) {
                    e.stopPropagation();
                    if (this.files && this.files[0]) {
                        const span = zone.querySelector('span:first-of-type');
                        if (span) {
                            span.textContent = this.files[0].name;
                            span.style.color = '#028090';
                        }
                    }
                });
            }
        });

        // معالج حفظ النموذج
        const form = document.getElementById('nationalAddressForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();

                const declaration = document.getElementById('declarationCheck');
                if (!declaration.checked) {
                    showAlert('يرجى الموافقة على الإقرار والتعهد قبل المتابعة.', 'error');
                    return;
                }

                const proofInput = document.querySelector('#proofAddressUpload input[type="file"]');
                const newFile = proofInput?.files?.[0];

                // يجب وجود ملف جديد أو مرفق سابق
                if (!newFile && !existingProofAttachment) {
                    showAlert('يرجى رفع مستند إثبات العنوان.', 'error');
                    return;
                }

                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : '';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
                }

                try {
                    let fileRecord;

                    if (newFile) {
                        // رفع الملف الجديد
                        fileRecord = await uploadFile(newFile, user.id, 'address_proof');
                        // إدراج سجل جديد في المرفقات
                        await supabase.from('user_attachments').insert({
                            user_id: user.id,
                            file_name: newFile.name,
                            file_path: fileRecord.path,
                            file_type: fileRecord.type,
                            file_size: fileRecord.size,
                            description: 'proof_address',
                            uploaded_at: new Date().toISOString()
                        });
                        // تحديث المتغير ليعكس المرفق الجديد
                        existingProofAttachment = {
                            id: null, // سيكون له id جديد بعد الإدراج، لكن لا بأس
                            file_name: newFile.name,
                            file_path: fileRecord.path,
                            file_size: fileRecord.size,
                            file_type: fileRecord.type
                        };
                    } else {
                        // استخدام المرفق القديم
                        fileRecord = {
                            path: existingProofAttachment.file_path,
                            publicUrl: '',
                            size: existingProofAttachment.file_size,
                            type: existingProofAttachment.file_type
                        };
                        // تحديث تاريخ المرفق فقط
                        if (existingProofAttachment.id) {
                            await supabase.from('user_attachments')
                                .update({ uploaded_at: new Date().toISOString() })
                                .eq('id', existingProofAttachment.id);
                        }
                    }

                    // حفظ العنوان الوطني
                    const payload = {
                        user_id: user.id,
                        building_number: document.getElementById('buildingNumber')?.value || '',
                        street: document.getElementById('streetName')?.value || '',
                        district: document.getElementById('neighborhood')?.value || '',
                        city: document.getElementById('city')?.value || '',
                        region: document.getElementById('region')?.value || '',
                        postal_code: document.getElementById('postalCode')?.value || '',
                        additional_number: document.getElementById('additionalNumber')?.value || '',
                        unit_number: document.getElementById('unitNumber')?.value || '',
                        updated_at: new Date().toISOString()
                    };

                    const { error } = await supabase
                        .from('user_national_address')
                        .upsert(payload, { onConflict: 'user_id' });
                    if (error) throw error;

                    // تحديث verification_requests
                    await supabase.from('verification_requests').upsert({
                        user_id: user.id,
                        national_address_completed: true,
                        progress: 80,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                    await updateProgressTracker(supabase, user.id);

                    // ✉️ إرسال رمز التحقق (OTP)
                    const { error: otpError } = await supabase.auth.signInWithOtp({
                        email: user.email,
                        options: { shouldCreateUser: false }
                    });
                    if (otpError) console.warn('⚠️ تعذر إرسال رمز التحقق:', otpError);

                    // تخزين بيانات التوجيه
                    localStorage.setItem('pendingVerificationEmail', user.email);
                    localStorage.setItem('tera_verify_type', 'national_address');

                    showAlert('✅ تم حفظ العنوان الوطني. جاري توجيهك لتأكيد هويتك...', 'success');
                    setTimeout(() => {
                        window.location.replace('/auth/verify-otp.html');
                    }, 2000);

                } catch (error) {
                    console.error('فشل الحفظ:', error);
                    showAlert('تعذر حفظ العنوان: ' + (error.message || 'خطأ غير معروف'), 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                }
            });
        }

        console.log('📍 [National Address] جاهزة.');
    }

    // بدء التهيئة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }
})();
