/**
 * profile-attachments.js – المرفقات والوثائق + Secure Document Viewer (مُصلَح)
 * ============================================================
 * - جلب وعرض المرفقات، رفع وحذف.
 * - Secure Viewer: OTP → Signed URL (120 ثانية) مع عداد.
 * - تم إصلاح: نوع OTP إلى 'magiclink'، فحوصات العناصر، وصلاحية الرابط.
 */
(function() {
    'use strict';

    // ---------- متغيرات عامة ----------
    let currentDocPath = '';
    let currentDocName = '';
    let signedUrlTimerInterval = null;

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
        const box = document.createElement('div');
        box.className = `alert-box show ${type || 'error'}`;
        box.style.cssText = 'display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; margin-bottom:16px;';
        box.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${message}</span>`;
        const container = document.querySelector('.content-container');
        if (container) {
            container.insertBefore(box, container.firstChild);
            setTimeout(() => box.remove(), 5000);
        } else {
            alert(message);
        }
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
            html += `<li class="${completed ? 'completed' : ''}"><span class="step-num">${completed ? '<i class="fas fa-check"></i>' : (index+1)}</span><span class="step-label">${stage.label}</span></li>`;
            if (index < stages.length - 1) html += `<li class="step-line ${completed ? 'completed' : ''}"></li>`;
        });
        tracker.innerHTML = html;
    }

    // ---------- Secure Document Viewer ----------
    function openSecureViewer(path, name) {
        const modal = document.getElementById('docViewerModal');
        if (!modal) return;
        currentDocPath = path || '';
        currentDocName = name || 'مستند';
        document.getElementById('docNameDisplay').textContent = currentDocName;
        document.getElementById('docViewerStep1').style.display = 'block';
        document.getElementById('docViewerStep2').style.display = 'none';
        document.getElementById('docViewerStep3').style.display = 'none';
        if (document.getElementById('docOtpInput')) document.getElementById('docOtpInput').value = '';
        if (document.getElementById('docOtpError')) document.getElementById('docOtpError').textContent = '';
        clearTimers();
        modal.classList.add('active');
    }

    function clearTimers() {
        if (signedUrlTimerInterval) {
            clearInterval(signedUrlTimerInterval);
            signedUrlTimerInterval = null;
        }
    }

    async function loadAttachments(supabase, userId) {
        const tbody = document.getElementById('documentsTableBody');
        if (!tbody) return;

        const { data, error } = await supabase.from('user_attachments').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false });
        if (error) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">تعذر تحميل المرفقات.</td></tr>';
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">لا توجد مرفقات حتى الآن.</td></tr>';
            updateStats(data || []);
            return;
        }

        let html = '';
        data.forEach((doc, index) => {
            const statusClass = doc.status === 'approved' ? 'status-approved' : doc.status === 'rejected' ? 'status-rejected' : 'status-pending';
            const statusText = doc.status === 'approved' ? 'معتمد' : doc.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
            const date = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('ar-SA') : '-';

            html += `<tr>
                <td>${index + 1}</td>
                <td class="text-title">${doc.file_name || 'بدون اسم'}</td>
                <td>${doc.file_type || '-'}</td>
                <td>${doc.description || '-'}</td>
                <td>${date}</td>
                <td><span class="status-badge ${statusClass}"><i class="fas fa-circle"></i> ${statusText}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view secure-view-btn" data-path="${doc.file_path}" data-name="${doc.file_name}" title="عرض آمن"><i class="fas fa-eye"></i></button>
                        <button class="action-btn delete" data-id="${doc.id}" title="حذف"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        });

        tbody.innerHTML = html;
        updateStats(data);

        // مستمعات الحذف
        tbody.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', async function() {
                if (!confirm('هل أنت متأكد من حذف هذا المرفق؟')) return;
                const id = this.dataset.id;
                const { error } = await supabase.from('user_attachments').delete().eq('id', id);
                if (error) {
                    showAlert('فشل حذف المرفق.', 'error');
                } else {
                    showAlert('تم حذف المرفق بنجاح.', 'success');
                    loadAttachments(supabase, userId);
                }
            });
        });

        // مستمعات Secure Viewer
        tbody.querySelectorAll('.secure-view-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                openSecureViewer(this.dataset.path, this.dataset.name);
            });
        });
    }

    function updateStats(data) {
        const total = data.length;
        const approved = data.filter(d => d.status === 'approved').length;
        const pending = data.filter(d => d.status !== 'approved' && d.status !== 'rejected').length;
        const rejected = data.filter(d => d.status === 'rejected').length;

        document.getElementById('totalDocs').textContent = total;
        document.getElementById('approvedDocs').textContent = approved;
        document.getElementById('pendingDocs').textContent = pending;
        document.getElementById('rejectedDocs').textContent = rejected;
    }

    async function uploadFile(file, userId) {
        const supabase = window.teraSupabase;
        const fileName = `manual/${userId}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage.from('attachments').upload(fileName, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName);
        return { path: fileName, publicUrl: urlData.publicUrl, size: file.size, type: file.type };
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function startSignedUrlTimer(seconds) {
        const timerDisplay = document.getElementById('docUrlTimer');
        const linkExpired = document.getElementById('linkExpiredMessage');
        const requestNewBtn = document.getElementById('requestNewLinkBtn');
        const link = document.getElementById('signedUrlLink');
        if (!timerDisplay || !link || !linkExpired || !requestNewBtn) return;
        let remaining = seconds;
        clearTimers();
        timerDisplay.textContent = formatTime(remaining);
        link.style.display = '';
        linkExpired.style.display = 'none';
        requestNewBtn.style.display = 'none';

        signedUrlTimerInterval = setInterval(() => {
            remaining--;
            timerDisplay.textContent = formatTime(remaining);
            if (remaining <= 0) {
                clearInterval(signedUrlTimerInterval);
                link.style.display = 'none';
                linkExpired.style.display = 'block';
                requestNewBtn.style.display = 'inline-block';
            }
        }, 1000);
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

        document.getElementById('headerUserName').textContent = user.user_metadata?.full_name || 'مستخدم';
        document.getElementById('headerAvatar').textContent = (user.user_metadata?.full_name || 'م')[0];

        await updateProgressTracker(supabase, user.id);
        await loadAttachments(supabase, user.id);

        // ---------- Secure Viewer Listeners ----------
        const closeDocViewerModal = document.getElementById('closeDocViewerModal');
        if (closeDocViewerModal) {
            closeDocViewerModal.addEventListener('click', () => {
                document.getElementById('docViewerModal').classList.remove('active');
                clearTimers();
            });
        }

        const sendOtpForDocBtn = document.getElementById('sendOtpForDocBtn');
        if (sendOtpForDocBtn) {
            sendOtpForDocBtn.addEventListener('click', async function() {
                const supabase = window.teraSupabase;
                if (!supabase) return;
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase.auth.signInWithOtp({
                        email: user.email,
                        options: { shouldCreateUser: false }
                    });
                    localStorage.setItem('pendingVerificationEmail', user.email);
                    localStorage.setItem('tera_verify_type', 'document_view');
                    showAlert('تم إرسال رمز التحقق إلى بريدكم الإلكتروني.', 'success');
                    document.getElementById('docViewerStep1').style.display = 'none';
                    document.getElementById('docViewerStep2').style.display = 'block';
                    const docOtpInput = document.getElementById('docOtpInput');
                    if (docOtpInput) docOtpInput.focus();
                } catch (err) { showAlert('حدث خطأ: ' + err.message, 'error'); }
                finally { this.disabled = false; this.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال رمز التحقق'; }
            });
        }

        const verifyDocOtpBtn = document.getElementById('verifyDocOtpBtn');
        if (verifyDocOtpBtn) {
            verifyDocOtpBtn.addEventListener('click', async function() {
                const supabase = window.teraSupabase;
                const otpInput = document.getElementById('docOtpInput');
                const otpValue = otpInput ? otpInput.value.trim() : '';
                const otpError = document.getElementById('docOtpError');
                if (otpValue.length !== 8) {
                    if (otpError) otpError.textContent = 'الرجاء إدخال 8 أرقام';
                    return;
                }
                const email = localStorage.getItem('pendingVerificationEmail');
                if (!email) { showAlert('بيانات الجلسة غير متوفرة.', 'error'); return; }

                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
                try {
                    // ✅ التصحيح: استخدام النوع 'magiclink'
                    const { error } = await supabase.auth.verifyOtp({
                        email,
                        token: otpValue,
                        type: 'magiclink'
                    });
                    if (error) throw error;
                    localStorage.removeItem('pendingVerificationEmail');
                    localStorage.removeItem('tera_verify_type');

                    if (!currentDocPath) throw new Error('مسار المستند غير معروف');
                    const { data, error: signedError } = await supabase.storage
                        .from('attachments')
                        .createSignedUrl(currentDocPath, 120);
                    if (signedError) throw signedError;

                    document.getElementById('signedUrlLink').href = data.signedUrl;
                    document.getElementById('docViewerStep2').style.display = 'none';
                    document.getElementById('docViewerStep3').style.display = 'block';
                    startSignedUrlTimer(120);

                    // تسجيل الدخول
                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase.from('document_access_logs').insert({
                        user_id: user.id,
                        document_name: currentDocName,
                        document_path: currentDocPath,
                        ip_address: '',
                        user_agent: navigator.userAgent
                    });
                } catch (error) {
                    if (otpError) otpError.textContent = error.message.includes('expired') ? 'انتهت صلاحية الرمز' : 'رمز التحقق غير صحيح';
                } finally {
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرمز وعرض المرفق';
                }
            });
        }

        const requestNewLinkBtn = document.getElementById('requestNewLinkBtn');
        if (requestNewLinkBtn) {
            requestNewLinkBtn.addEventListener('click', () => {
                openSecureViewer(currentDocPath, currentDocName);
            });
        }

        // ---------- بقية المستمعات (رفع مرفقات، إضافة) ----------
        const addModal = document.getElementById('addModal');
        if (addModal) {
            document.getElementById('openAddModal')?.addEventListener('click', () => addModal.classList.add('active'));
            document.getElementById('closeModal')?.addEventListener('click', () => addModal.classList.remove('active'));
            document.getElementById('cancelAdd')?.addEventListener('click', () => addModal.classList.remove('active'));
            addModal.addEventListener('click', function(e) { if (e.target === addModal) addModal.classList.remove('active'); });
        }

        const docUploadZone = document.getElementById('docUploadZone');
        if (docUploadZone) {
            docUploadZone.addEventListener('click', function(e) {
                e.stopPropagation();
                document.getElementById('docFile')?.click();
            });
        }

        const docFile = document.getElementById('docFile');
        if (docFile) {
            docFile.addEventListener('change', function(e) {
                e.stopPropagation();
                if (this.files[0]) {
                    const label = document.getElementById('uploadLabel');
                    if (label) {
                        label.textContent = this.files[0].name;
                        label.style.color = '#028090';
                    }
                }
            });
        }

        const addDocumentForm = document.getElementById('addDocumentForm');
        if (addDocumentForm) {
            addDocumentForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const fileInput = document.getElementById('docFile');
                if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                    showAlert('يرجى اختيار ملف للرفع.', 'error');
                    return;
                }

                const docName = document.getElementById('docName')?.value.trim();
                const docType = document.getElementById('docType')?.value;
                if (!docName || !docType) {
                    showAlert('يرجى ملء جميع الحقول الإلزامية.', 'error');
                    return;
                }

                const submitBtn = this.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';
                }

                try {
                    const uploaded = await uploadFile(fileInput.files[0], user.id);
                    await supabase.from('user_attachments').insert({
                        user_id: user.id,
                        file_name: docName,
                        file_path: uploaded.path,
                        file_type: uploaded.type,
                        file_size: uploaded.size,
                        description: docType,
                        uploaded_at: new Date().toISOString()
                    });

                    showAlert('✅ تم رفع المرفق بنجاح.', 'success');
                    addModal?.classList.remove('active');
                    this.reset();
                    const label = document.getElementById('uploadLabel');
                    if (label) { label.textContent = 'اضغط لرفع الملف'; label.style.color = '#0A1B3F'; }
                    loadAttachments(supabase, user.id);

                    await supabase.from('verification_requests').upsert({
                        user_id: user.id,
                        attachments_completed: true,
                        progress: 95,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
                    await updateProgressTracker(supabase, user.id);

                } catch (error) {
                    console.error('فشل الرفع:', error);
                    showAlert('تعذر رفع المرفق: ' + (error.message || 'خطأ غير معروف'), 'error');
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> رفع المرفق'; }
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
