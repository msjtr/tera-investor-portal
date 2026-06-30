/**
 * ============================================================
 * profile-national-address.js – العنوان الوطني (حقيقي مع Supabase)
 * ============================================================
 * الموقع: /assets/js/profile-national-address.js
 * - ينتظر جاهزية Supabase.
 * - يجلب بيانات المستخدم ويعرض اسمه في الهيدر.
 * - يجلب العنوان الوطني المخزن من user_national_address ويملأ النموذج.
 * - يدعم رفع الملفات إلى Supabase Storage.
 * - يحفظ البيانات في user_national_address ويربطها بـ verification_requests.
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

    /**
     * تعقيم اسم الملف لإزالة الأحرف غير الآمنة (مثل العربية) التي قد ترفضها Supabase Storage.
     * يُنشئ اسمًا فريدًا مكوّنًا من طابع زمني + UUID مع الاحتفاظ بامتداد الملف الأصلي.
     * @param {string} originalName - الاسم الأصلي للملف.
     * @returns {string} اسم آمن بالكامل (ASCII فقط).
     */
    function sanitizeFileName(originalName) {
        // استخراج الامتداد (بدون النقطة)
        const ext = originalName.split('.').pop().toLowerCase();
        // اسم آمن: طابع زمني + UUID عشوائي (يمكن استخدام crypto.randomUUID() في المتصفحات الحديثة)
        const safeBase = `${Date.now()}-${crypto.randomUUID()}`;
        return `${safeBase}.${ext}`;
    }

    async function uploadFile(file, userId, folder) {
        const supabase = window.teraSupabase;
        // استخدام الاسم المُعقَّم بدلاً من file.name مباشرةً
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

        // تحديث الهيدر - الإصلاح: استخدام textContent بدلاً من setElementValue
        const userName = user.user_metadata?.full_name || 'مستخدم';
        const headerNameEl = document.getElementById('headerUserName');
        if (headerNameEl) {
            headerNameEl.textContent = userName;
        }
        const avatar = document.getElementById('headerAvatar');
        if (avatar) {
            avatar.textContent = userName.charAt(0).toUpperCase();
        }

        // شريط التقدم
        await updateProgressTracker(supabase, user.id);

        // جلب البيانات المخزنة (إن وُجدت)
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
                if (!proofInput || !proofInput.files || !proofInput.files[0]) {
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
                    // رفع مستند إثبات العنوان (الآن باسم آمن خالٍ من الأحرف الممنوعة)
                    const fileRecord = await uploadFile(proofInput.files[0], user.id, 'address_proof');

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

                    // إدراج سجل المرفق (يحتفظ بالاسم الأصلي للعرض)
                    await supabase.from('user_attachments').insert({
                        user_id: user.id,
                        file_name: proofInput.files[0].name,
                        file_path: fileRecord.path,
                        file_type: fileRecord.type,
                        file_size: fileRecord.size,
                        description: 'proof_address',
                        uploaded_at: new Date().toISOString()
                    });

                    // تحديث verification_requests
                    await supabase.from('verification_requests').upsert({
                        user_id: user.id,
                        national_address_completed: true,
                        progress: 80,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                    await updateProgressTracker(supabase, user.id);

                    showAlert('✅ تم حفظ العنوان الوطني ورفع المستندات بنجاح.', 'success');
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
