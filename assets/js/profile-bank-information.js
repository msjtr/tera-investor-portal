/**
 * profile-bank-information.js – المعلومات البنكية (حقيقي مع Supabase)
 * ============================================================
 * الموقع: /assets/js/profile-bank-information.js
 * - ينتظر جاهزية Supabase.
 * - يجلب بيانات المستخدم ويعرض اسمه في الهيدر.
 * - يجلب البيانات البنكية المخزنة من user_bank_info ويملأ النموذج.
 * - يحفظ البيانات ويرفع إثبات الحساب إلى Supabase Storage (اسم آمن).
 * - يرسل رمز OTP ويوجّه إلى verify-otp.html بعد الحفظ.
 * - يُحدّث شريط التقدم تلقائياً.
 */
(function() {
    'use strict';

    // ---------- دوال مساعدة ----------
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

    /** تعقيم اسم الملف لإزالة الأحرف غير الآمنة (مثل العربية) */
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

    /** جلب مرفق إثبات الحساب البنكي السابق */
    async function loadExistingBankProof(supabase, userId) {
        const { data } = await supabase
            .from('user_attachments')
            .select('*')
            .eq('user_id', userId)
            .eq('description', 'bank_proof')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        return data || null;
    }

    // ---------- التهيئة الرئيسية ----------
    async function initPage() {
        let supabase;
        try { supabase = await waitForSupabase(); } catch (err) { showAlert('تعذر الاتصال بقاعدة البيانات.', 'error'); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showAlert('يجب تسجيل الدخول أولاً.', 'error');
            setTimeout(() => window.location.replace('/auth/auth/login/login.html'), 2000);
            return;
        }

        // تحديث الهيدر (إصلاح: استخدام textContent)
        const userName = user.user_metadata?.full_name || 'مستخدم';
        const headerNameEl = document.getElementById('headerUserName');
        if (headerNameEl) headerNameEl.textContent = userName;
        const avatar = document.getElementById('headerAvatar');
        if (avatar) avatar.textContent = userName.charAt(0).toUpperCase();

        await updateProgressTracker(supabase, user.id);

        // جلب البيانات البنكية المخزنة
        try {
            const { data: bank } = await supabase.from('user_bank_info').select('*').eq('user_id', user.id).maybeSingle();
            if (bank) {
                setElementValue('bankName', bank.bank_name || '');
                setElementValue('iban', bank.iban || '');
                setElementValue('holderNameAr', bank.holder_name_ar || '');
                setElementValue('holderNameEn', bank.holder_name_en || '');
                setElementValue('bankCountry', bank.bank_country || '');
                setElementValue('accountCurrency', bank.account_currency || '');
                if (bank.bank_country !== 'sa') {
                    document.getElementById('internationalFields').classList.add('show');
                    setElementValue('swiftCode', bank.swift_code || '');
                    setElementValue('bankNameEn', bank.bank_name_en || '');
                    setElementValue('bankAddress', bank.bank_address || '');
                    setElementValue('bankCity', bank.bank_city || '');
                }
            }
        } catch (e) { console.warn('تعذر جلب البيانات البنكية:', e); }

        // 🔁 تحميل مرفق إثبات الحساب البنكي السابق وربطه بالقسم
        let existingBankProof = null;
        try {
            existingBankProof = await loadExistingBankProof(supabase, user.id);
            if (existingBankProof) {
                const zone = document.getElementById('bankProofUpload');
                if (zone) {
                    const span = zone.querySelector('span:first-of-type');
                    if (span) {
                        span.textContent = existingBankProof.file_name;
                        span.style.color = '#028090';
                    }
                }
            }
        } catch (e) { console.warn('تعذر تحميل مرفق البنكي:', e); }

        // إظهار/إخفاء الحقول الدولية
        document.getElementById('bankCountry').addEventListener('change', function() {
            document.getElementById('internationalFields').classList.toggle('show', this.value !== 'sa');
        });

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

        // معالج النموذج
        const form = document.getElementById('bankInfoForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();

                const iban = document.getElementById('iban').value.trim();
                const confirmIban = document.getElementById('confirmIban').value.trim();
                if (iban !== confirmIban) {
                    showAlert('رقم الآيبان غير متطابق. يرجى التأكد.', 'error');
                    return;
                }

                const bankName = document.getElementById('bankName').value.trim();
                if (!bankName || !iban) {
                    showAlert('يرجى ملء الحقول الإلزامية.', 'error');
                    return;
                }

                const proofInput = document.querySelector('#bankProofUpload input[type="file"]');
                const newFile = proofInput?.files?.[0];

                // يجب وجود ملف جديد أو مرفق سابق
                if (!newFile && !existingBankProof) {
                    showAlert('يرجى رفع مستند إثبات الحساب البنكي.', 'error');
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
                        // رفع ملف جديد
                        fileRecord = await uploadFile(newFile, user.id, 'bank_proof');
                        // إدراج سجل جديد
                        await supabase.from('user_attachments').insert({
                            user_id: user.id,
                            file_name: newFile.name,
                            file_path: fileRecord.path,
                            file_type: fileRecord.type,
                            file_size: fileRecord.size,
                            description: 'bank_proof',
                            uploaded_at: new Date().toISOString()
                        });
                        // تحديث المتغير للمرفق الموجود
                        existingBankProof = {
                            id: null,
                            file_name: newFile.name,
                            file_path: fileRecord.path,
                            file_size: fileRecord.size,
                            file_type: fileRecord.type
                        };
                    } else {
                        // استخدام المرفق القديم
                        fileRecord = {
                            path: existingBankProof.file_path,
                            publicUrl: '',
                            size: existingBankProof.file_size,
                            type: existingBankProof.file_type
                        };
                        // تحديث تاريخ المرفق فقط
                        if (existingBankProof.id) {
                            await supabase.from('user_attachments')
                                .update({ uploaded_at: new Date().toISOString() })
                                .eq('id', existingBankProof.id);
                        }
                    }

                    // حفظ البيانات البنكية
                    const payload = {
                        user_id: user.id,
                        bank_name: bankName,
                        iban: iban,
                        holder_name_ar: document.getElementById('holderNameAr').value.trim(),
                        holder_name_en: document.getElementById('holderNameEn').value.trim(),
                        bank_country: document.getElementById('bankCountry').value,
                        account_currency: document.getElementById('accountCurrency').value,
                        swift_code: document.getElementById('swiftCode')?.value || '',
                        bank_name_en: document.getElementById('bankNameEn')?.value || '',
                        bank_address: document.getElementById('bankAddress')?.value || '',
                        bank_city: document.getElementById('bankCity')?.value || '',
                        updated_at: new Date().toISOString()
                    };

                    const { error } = await supabase
                        .from('user_bank_info')
                        .upsert(payload, { onConflict: 'user_id' });
                    if (error) throw error;

                    // تحديث حالة التحقق والتقدم
                    await supabase.from('verification_requests').upsert({
                        user_id: user.id,
                        bank_info_completed: true,
                        progress: 90,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                    await updateProgressTracker(supabase, user.id);

                    // ✉️ إرسال رمز التحقق (OTP) وتوجيه إلى صفحة التحقق
                    const { error: otpError } = await supabase.auth.signInWithOtp({
                        email: user.email,
                        options: { shouldCreateUser: false }
                    });
                    if (otpError) console.warn('⚠️ تعذر إرسال رمز التحقق:', otpError);

                    localStorage.setItem('pendingVerificationEmail', user.email);
                    localStorage.setItem('tera_verify_type', 'bank_info');

                    showAlert('✅ تم حفظ البيانات البنكية. جاري توجيهك لتأكيد هويتك...', 'success');
                    setTimeout(() => {
                        window.location.replace('/auth/verify-otp.html');
                    }, 2000);

                } catch (error) {
                    console.error('فشل الحفظ:', error);
                    showAlert('تعذر حفظ البيانات: ' + (error.message || 'خطأ غير معروف'), 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
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
