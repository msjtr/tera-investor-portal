/**
 * profile-attachments.js – المرفقات والوثائق (حقيقي مع Supabase)
 * ============================================================
 * الموقع: /assets/js/profile-attachments.js
 * - ينتظر جاهزية Supabase.
 * - يجلب بيانات المستخدم ويعرض اسمه في الهيدر.
 * - يجلب المرفقات من user_attachments ويعرضها في الجدول.
 * - يدعم رفع مرفقات جديدة وحذف الموجود منها.
 * - يُحدّث الإحصائيات وشريط التقدم.
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
            const publicUrl = doc.file_path ? window.teraSupabase.storage.from('attachments').getPublicUrl(doc.file_path).publicUrl : '#';

            html += `<tr>
                <td>${index + 1}</td>
                <td class="text-title">${doc.file_name || 'بدون اسم'}</td>
                <td>${doc.file_type || '-'}</td>
                <td>${doc.description || '-'}</td>
                <td>${date}</td>
                <td><span class="status-badge ${statusClass}"><i class="fas fa-circle"></i> ${statusText}</span></td>
                <td>
                    <div class="action-btns">
                        <a href="${publicUrl}" target="_blank" class="action-btn view" title="عرض"><i class="fas fa-eye"></i></a>
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

        // المودال
        const modal = document.getElementById('addModal');
        document.getElementById('openAddModal').addEventListener('click', () => modal.classList.add('active'));
        document.getElementById('closeModal').addEventListener('click', () => modal.classList.remove('active'));
        document.getElementById('cancelAdd').addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('active'); });

        // رفع الملف
        document.getElementById('docUploadZone').addEventListener('click', function(e) {
            e.stopPropagation();
            document.getElementById('docFile').click();
        });
        document.getElementById('docFile').addEventListener('change', function(e) {
            e.stopPropagation();
            if (this.files[0]) {
                document.getElementById('uploadLabel').textContent = this.files[0].name;
                document.getElementById('uploadLabel').style.color = '#028090';
            }
        });

        // إضافة مرفق
        document.getElementById('addDocumentForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const fileInput = document.getElementById('docFile');
            if (!fileInput.files || !fileInput.files[0]) {
                showAlert('يرجى اختيار ملف للرفع.', 'error');
                return;
            }

            const docName = document.getElementById('docName').value.trim();
            const docType = document.getElementById('docType').value;
            if (!docName || !docType) {
                showAlert('يرجى ملء جميع الحقول الإلزامية.', 'error');
                return;
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';

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
                modal.classList.remove('active');
                this.reset();
                document.getElementById('uploadLabel').textContent = 'اضغط لرفع الملف';
                document.getElementById('uploadLabel').style.color = '#0A1B3F';
                loadAttachments(supabase, user.id);

                // تحديث تقدم الرحلة
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
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> رفع المرفق';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }
})();
