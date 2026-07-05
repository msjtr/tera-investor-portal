/**
 * security-email-change-requests.js
 * إدارة طلبات تغيير البريد الإلكتروني – المستخدم
 * الحالة الأولية للطلب: "جديد" (new)
 * - يمكن للمستخدم تعديل أو إلغاء أو حذف الطلبات ذات الحالة "جديد" فقط
 * - عند بدء مراجعة الطلب من الإدارة، تتغير الحالة إلى "قيد المراجعة" (pending)
 * - الطلبات التي تحت المراجعة أو الموافق عليها أو المنفذة لا يمكن تعديلها
 */

'use strict';

(function() {
    let supabase = null;
    let currentUser = null;
    let initialized = false;
    let requests = [];
    let stats = { total: 0, new: 0, pending: 0, approved: 0, completed: 0, rejected: 0 };

    // ===== عناصر DOM =====
    const addRequestBtn = document.getElementById('addRequestBtn');
    const pendingNotice = document.getElementById('pendingRequestNotice');
    const tableBody = document.getElementById('requestsTableBody');

    // نافذة الطلب الجديد
    const newRequestModal = document.getElementById('newRequestModal');
    const closeNewRequestModal = document.getElementById('closeNewRequestModal');
    const cancelRequestBtn = document.getElementById('cancelRequestBtn');
    const newRequestForm = document.getElementById('newRequestForm');
    const currentEmailDisplayModal = document.getElementById('currentEmailDisplayModal');
    const newEmailInput = document.getElementById('newEmailInput');
    const newEmailHint = document.getElementById('newEmailHint');
    const reasonInput = document.getElementById('reasonInput');
    const reasonHint = document.getElementById('reasonHint');
    const submitRequestBtn = document.getElementById('submitRequestBtn');

    // نافذة تعديل الطلب
    const editRequestModal = document.getElementById('editRequestModal');
    const closeEditRequestModal = document.getElementById('closeEditRequestModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editRequestForm = document.getElementById('editRequestForm');
    const editRequestId = document.getElementById('editRequestId');
    const editCurrentEmail = document.getElementById('editCurrentEmail');
    const editNewEmail = document.getElementById('editNewEmail');
    const editNewEmailHint = document.getElementById('editNewEmailHint');
    const editReason = document.getElementById('editReason');
    const editReasonHint = document.getElementById('editReasonHint');
    const saveEditBtn = document.getElementById('saveEditBtn');

    // نافذة التفاصيل
    const detailModal = document.getElementById('detailModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    const detailRequestNumber = document.getElementById('detailRequestNumber');
    const detailCurrentEmail = document.getElementById('detailCurrentEmail');
    const detailNewEmail = document.getElementById('detailNewEmail');
    const detailReason = document.getElementById('detailReason');
    const detailCreatedAt = document.getElementById('detailCreatedAt');
    const detailUpdatedAt = document.getElementById('detailUpdatedAt');
    const detailStatus = document.getElementById('detailStatus');
    const detailAdminNotes = document.getElementById('detailAdminNotes');
    const detailRejectionReason = document.getElementById('detailRejectionReason');
    const detailCompletedAt = document.getElementById('detailCompletedAt');

    // الإحصائيات
    const totalCount = document.getElementById('totalCount');
    const pendingCount = document.getElementById('pendingCount');
    const approvedCount = document.getElementById('approvedCount');
    const completedCount = document.getElementById('completedCount');
    const rejectedCount = document.getElementById('rejectedCount');

    // ===== دوال مساعدة =====
    async function initSupabase() {
        if (window.SecurityCore && window.SecurityCore.supabase) {
            supabase = window.SecurityCore.supabase;
            currentUser = window.SecurityCore.currentUser;
            return true;
        }
        if (window.teraSupabase) {
            supabase = window.teraSupabase;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
                return true;
            } catch (e) { return false; }
        }
        if (typeof waitForSupabase === 'function') {
            try {
                supabase = await waitForSupabase();
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
                return true;
            } catch (e) { return false; }
        }
        return false;
    }

    function updateHeaderUI(user) {
        const nameEl = document.getElementById('headerUserName');
        const avatarEl = document.getElementById('headerAvatar');
        if (!user) return;
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم';
        if (nameEl) nameEl.textContent = fullName;
        if (avatarEl) avatarEl.textContent = fullName.charAt(0).toUpperCase();
    }

    function showAlert(message, type = 'error') {
        const alertBox = document.getElementById('formAlert');
        if (!alertBox) {
            alert(message);
            return;
        }
        const alertIcon = document.getElementById('alertIcon');
        const alertMessage = document.getElementById('alertMessage');
        alertBox.className = `alert-box show ${type}`;
        alertIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        alertMessage.textContent = message;
        alertBox.style.display = 'flex';
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            alertBox.style.display = 'none';
            alertBox.className = 'alert-box';
        }, 7000);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('ar-SA', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function getStatusBadge(status) {
        const labels = {
            'new': 'جديد',
            'pending': 'قيد المراجعة',
            'approved': 'تمت الموافقة',
            'completed': 'تم التنفيذ',
            'rejected': 'مرفوض',
            'cancelled': 'ملغي'
        };
        return `<span class="status-badge ${status}">${labels[status] || status}</span>`;
    }

    function getStatusIcon(status) {
        const icons = {
            'new': '🟢',
            'pending': '🟡',
            'approved': '🔵',
            'completed': '🟢',
            'rejected': '🔴',
            'cancelled': '⚫'
        };
        return icons[status] || '';
    }

    function isEditable(status) {
        return status === 'new';
    }

    function isCancellable(status) {
        return status === 'new' || status === 'pending';
    }

    function isDeletable(status) {
        return status === 'new';
    }

    // ===== التحقق من البريد (مع Fallback) =====
    async function checkEmailAvailability(email) {
        try {
            const { data, error } = await supabase.functions.invoke('check-email-status', {
                body: { email: email.trim().toLowerCase() }
            });
            if (error) {
                console.warn('Edge Function error, using fallback:', error);
                return await checkEmailFallback(email);
            }
            return data;
        } catch (err) {
            console.warn('Edge Function failed, using fallback:', err);
            return await checkEmailFallback(email);
        }
    }

    // ===== Fallback: التحقق من auth_register =====
    async function checkEmailFallback(email) {
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const { data, error } = await supabase
                .from('auth_register')
                .select('status')
                .eq('email', normalizedEmail)
                .maybeSingle();

            if (error) {
                console.error('Fallback error:', error);
                return { canUse: false, error: true, message: 'تعذر التحقق من البريد' };
            }

            if (data) {
                return {
                    exists: true,
                    active: (data.status === 'active' || data.status === 'Active'),
                    canUse: false,
                    message: '✖ هذا البريد الإلكتروني مرتبط بحساب آخر ولا يمكن استخدامه.'
                };
            }

            return {
                exists: false,
                active: false,
                canUse: true,
                message: '✅ البريد الإلكتروني متاح للاستخدام.'
            };
        } catch (err) {
            console.error('Fallback error:', err);
            return { canUse: false, error: true, message: 'تعذر التحقق من البريد' };
        }
    }

    // ===== جلب الطلبات =====
    async function fetchRequests() {
        if (!supabase || !currentUser) return;
        try {
            const { data, error } = await supabase
                .from('email_change_requests')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            requests = data || [];
            renderTable();
            updateStats();
            checkPendingRequest();
        } catch (err) {
            console.error('فشل جلب الطلبات:', err);
            showAlert('تعذر تحميل الطلبات. يرجى تحديث الصفحة.', 'error');
        }
    }

    function updateStats() {
        stats.total = requests.length;
        stats.new = requests.filter(r => r.status === 'new').length;
        stats.pending = requests.filter(r => r.status === 'pending').length;
        stats.approved = requests.filter(r => r.status === 'approved').length;
        stats.completed = requests.filter(r => r.status === 'completed').length;
        stats.rejected = requests.filter(r => r.status === 'rejected' || r.status === 'cancelled').length;

        totalCount.textContent = stats.total;
        pendingCount.textContent = stats.pending;
        approvedCount.textContent = stats.approved;
        completedCount.textContent = stats.completed;
        rejectedCount.textContent = stats.rejected;
    }

    function checkPendingRequest() {
        const hasActive = requests.some(r => r.status === 'new' || r.status === 'pending' || r.status === 'approved');
        if (hasActive) {
            addRequestBtn.disabled = true;
            pendingNotice.style.display = 'flex';
            const noticeSpan = pendingNotice.querySelector('span');
            if (noticeSpan) {
                noticeSpan.textContent = '⚠️ لديكم طلب تغيير بريد إلكتروني قيد المعالجة (جديد أو قيد المراجعة أو موافق عليه)، ولا يمكن تقديم طلب جديد حتى يتم الانتهاء من الطلب الحالي.';
            }
        } else {
            addRequestBtn.disabled = false;
            pendingNotice.style.display = 'none';
        }
    }

    function renderTable() {
        if (!tableBody) return;
        if (requests.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد طلبات حتى الآن</p></td></tr>`;
            return;
        }

        let html = '';
        requests.forEach(req => {
            const editable = isEditable(req.status);
            const cancellable = isCancellable(req.status);
            const deletable = isDeletable(req.status);

            html += `
                <tr>
                    <td><strong>${req.request_number || '-'}</strong></td>
                    <td>${req.current_email}</td>
                    <td>${req.new_email}</td>
                    <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${req.reason || ''}">${req.reason || '-'}</td>
                    <td>${formatDate(req.created_at)}</td>
                    <td>${formatDate(req.updated_at)}</td>
                    <td>${getStatusBadge(req.status)}</td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon view-detail" data-id="${req.id}" title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${editable ? `<button class="btn-icon text-warning edit-request" data-id="${req.id}" title="تعديل الطلب">
                                <i class="fas fa-edit"></i>
                            </button>` : ''}
                            ${cancellable ? `<button class="btn-icon text-danger cancel-request" data-id="${req.id}" title="إلغاء الطلب">
                                <i class="fas fa-times-circle"></i>
                            </button>` : ''}
                            ${deletable ? `<button class="btn-icon text-danger delete-request" data-id="${req.id}" title="حذف الطلب">
                                <i class="fas fa-trash-alt"></i>
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

        // ربط أحداث الأزرار
        document.querySelectorAll('.view-detail').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const request = requests.find(r => r.id === id);
                if (request) showDetail(request);
            });
        });

        document.querySelectorAll('.edit-request').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const request = requests.find(r => r.id === id);
                if (request) openEditModal(request);
            });
        });

        document.querySelectorAll('.cancel-request').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const request = requests.find(r => r.id === id);
                if (request) confirmCancelRequest(request);
            });
        });

        document.querySelectorAll('.delete-request').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const request = requests.find(r => r.id === id);
                if (request) confirmDeleteRequest(request);
            });
        });
    }

    // ===== عرض التفاصيل =====
    function showDetail(request) {
        detailRequestNumber.textContent = request.request_number || '-';
        detailCurrentEmail.textContent = request.current_email || '-';
        detailNewEmail.textContent = request.new_email || '-';
        detailReason.textContent = request.reason || '-';
        detailCreatedAt.textContent = formatDate(request.created_at);
        detailUpdatedAt.textContent = formatDate(request.updated_at);
        detailStatus.innerHTML = getStatusBadge(request.status) + ' ' + getStatusIcon(request.status);
        detailAdminNotes.textContent = request.admin_notes || '-';
        detailRejectionReason.textContent = request.rejection_reason || '-';
        detailCompletedAt.textContent = request.completed_at ? formatDate(request.completed_at) : '-';
        detailModal.classList.add('show');
        detailModal.style.display = 'flex';
    }

    // ===== فتح نافذة التعديل =====
    function openEditModal(request) {
        editRequestId.value = request.id;
        editCurrentEmail.value = request.current_email;
        editNewEmail.value = request.new_email;
        editReason.value = request.reason || '';
        editNewEmailHint.textContent = '';
        editReasonHint.textContent = '';
        editNewEmail.classList.remove('is-valid', 'is-invalid');
        editRequestModal.classList.add('show');
        editRequestModal.style.display = 'flex';
    }

    // ===== التحقق من البريد الجديد في نافذة التعديل =====
    async function validateEditEmail() {
        const email = editNewEmail.value.trim();
        const currentEmail = currentUser?.email || '';
        const originalEmail = editCurrentEmail.value.trim();

        if (!email) {
            editNewEmailHint.textContent = '';
            editNewEmailHint.className = 'form-hint';
            editNewEmail.classList.remove('is-invalid', 'is-valid');
            return false;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            editNewEmailHint.textContent = '✖ صيغة البريد الإلكتروني غير صحيحة.';
            editNewEmailHint.className = 'form-hint error';
            editNewEmail.classList.remove('is-valid');
            editNewEmail.classList.add('is-invalid');
            return false;
        }

        if (email.toLowerCase() === currentEmail.toLowerCase()) {
            editNewEmailHint.textContent = '✖ البريد الإلكتروني الجديد مطابق للبريد الإلكتروني الحالي.';
            editNewEmailHint.className = 'form-hint error';
            editNewEmail.classList.remove('is-valid');
            editNewEmail.classList.add('is-invalid');
            return false;
        }

        if (email.toLowerCase() === originalEmail.toLowerCase()) {
            editNewEmailHint.textContent = '✅ نفس البريد الإلكتروني المطلوب سابقاً.';
            editNewEmailHint.className = 'form-hint success';
            editNewEmail.classList.remove('is-invalid');
            editNewEmail.classList.add('is-valid');
            return true;
        }

        const checkResult = await checkEmailAvailability(email);
        if (checkResult.error) {
            editNewEmailHint.textContent = '⚠️ تعذر التحقق من البريد، حاول مرة أخرى.';
            editNewEmailHint.className = 'form-hint error';
            editNewEmail.classList.remove('is-valid');
            editNewEmail.classList.add('is-invalid');
            return false;
        }

        if (!checkResult.canUse) {
            editNewEmailHint.textContent = '✖ هذا البريد الإلكتروني مرتبط بحساب آخر ولا يمكن استخدامه.';
            editNewEmailHint.className = 'form-hint error';
            editNewEmail.classList.remove('is-valid');
            editNewEmail.classList.add('is-invalid');
            return false;
        }

        editNewEmailHint.textContent = '✅ البريد الإلكتروني متاح للاستخدام.';
        editNewEmailHint.className = 'form-hint success';
        editNewEmail.classList.remove('is-invalid');
        editNewEmail.classList.add('is-valid');
        return true;
    }

    // ===== حفظ التعديلات =====
    async function saveEditRequest(e) {
        e.preventDefault();

        const id = editRequestId.value;
        const newEmail = editNewEmail.value.trim();
        const reason = editReason.value.trim();

        if (!reason) {
            editReasonHint.textContent = '✖ يرجى إدخال سبب تغيير البريد الإلكتروني.';
            editReasonHint.className = 'form-hint error';
            editReason.classList.add('is-invalid');
            return;
        }
        editReasonHint.textContent = '';
        editReason.classList.remove('is-invalid');

        const isValid = await validateEditEmail();
        if (!isValid) return;

        saveEditBtn.disabled = true;
        saveEditBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            const { error } = await supabase
                .from('email_change_requests')
                .update({
                    new_email: newEmail,
                    reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            showAlert('✅ تم تعديل الطلب بنجاح.', 'success');
            editRequestModal.classList.remove('show');
            editRequestModal.style.display = 'none';
            await fetchRequests();

        } catch (err) {
            console.error('فشل تعديل الطلب:', err);
            showAlert('⚠️ تعذر تعديل الطلب حالياً، يرجى المحاولة مرة أخرى لاحقاً.', 'error');
        } finally {
            saveEditBtn.disabled = false;
            saveEditBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
        }
    }

    // ===== تأكيد إلغاء الطلب =====
    function confirmCancelRequest(request) {
        if (confirm(`هل أنت متأكد من إلغاء الطلب رقم ${request.request_number}؟`)) {
            cancelRequest(request.id);
        }
    }

    async function cancelRequest(id) {
        try {
            const { error } = await supabase
                .from('email_change_requests')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            showAlert('✅ تم إلغاء الطلب بنجاح.', 'success');
            await fetchRequests();
        } catch (err) {
            console.error('فشل إلغاء الطلب:', err);
            showAlert('⚠️ تعذر إلغاء الطلب حالياً، يرجى المحاولة مرة أخرى لاحقاً.', 'error');
        }
    }

    // ===== تأكيد حذف الطلب =====
    function confirmDeleteRequest(request) {
        if (confirm(`هل أنت متأكد من حذف الطلب رقم ${request.request_number}؟ لا يمكن التراجع عن هذا الإجراء.`)) {
            deleteRequest(request.id);
        }
    }

    async function deleteRequest(id) {
        try {
            const { error } = await supabase
                .from('email_change_requests')
                .delete()
                .eq('id', id)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            showAlert('✅ تم حذف الطلب بنجاح.', 'success');
            await fetchRequests();
        } catch (err) {
            console.error('فشل حذف الطلب:', err);
            showAlert('⚠️ تعذر حذف الطلب حالياً، يرجى المحاولة مرة أخرى لاحقاً.', 'error');
        }
    }

    // ===== التحقق من البريد الجديد (لنافذة الإضافة) =====
    async function validateNewEmail() {
        const email = newEmailInput.value.trim();
        const currentEmail = currentUser?.email || '';

        if (!email) {
            newEmailHint.textContent = '';
            newEmailHint.className = 'form-hint';
            newEmailInput.classList.remove('is-invalid', 'is-valid');
            return false;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            newEmailHint.textContent = '✖ صيغة البريد الإلكتروني غير صحيحة.';
            newEmailHint.className = 'form-hint error';
            newEmailInput.classList.remove('is-valid');
            newEmailInput.classList.add('is-invalid');
            return false;
        }

        if (email.toLowerCase() === currentEmail.toLowerCase()) {
            newEmailHint.textContent = '✖ البريد الإلكتروني الجديد مطابق للبريد الإلكتروني الحالي.';
            newEmailHint.className = 'form-hint error';
            newEmailInput.classList.remove('is-valid');
            newEmailInput.classList.add('is-invalid');
            return false;
        }

        const checkResult = await checkEmailAvailability(email);
        if (checkResult.error) {
            newEmailHint.textContent = '⚠️ تعذر التحقق من البريد، حاول مرة أخرى.';
            newEmailHint.className = 'form-hint error';
            newEmailInput.classList.remove('is-valid');
            newEmailInput.classList.add('is-invalid');
            return false;
        }

        if (!checkResult.canUse) {
            newEmailHint.textContent = '✖ هذا البريد الإلكتروني مرتبط بحساب آخر ولا يمكن استخدامه.';
            newEmailHint.className = 'form-hint error';
            newEmailInput.classList.remove('is-valid');
            newEmailInput.classList.add('is-invalid');
            return false;
        }

        newEmailHint.textContent = '✅ البريد الإلكتروني متاح للاستخدام.';
        newEmailHint.className = 'form-hint success';
        newEmailInput.classList.remove('is-invalid');
        newEmailInput.classList.add('is-valid');
        return true;
    }

    // ===== تقديم طلب جديد =====
    async function submitNewRequest(e) {
        e.preventDefault();

        const newEmail = newEmailInput.value.trim();
        const reason = reasonInput.value.trim();

        if (!reason) {
            reasonHint.textContent = '✖ يرجى إدخال سبب تغيير البريد الإلكتروني.';
            reasonHint.className = 'form-hint error';
            reasonInput.classList.add('is-invalid');
            return;
        }
        reasonHint.textContent = '';
        reasonInput.classList.remove('is-invalid');

        const isValid = await validateNewEmail();
        if (!isValid) return;

        submitRequestBtn.disabled = true;
        submitRequestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            const { data, error } = await supabase
                .from('email_change_requests')
                .insert({
                    user_id: currentUser.id,
                    current_email: currentUser.email,
                    new_email: newEmail,
                    reason: reason,
                    status: 'new'  // الحالة الأولية: جديد
                })
                .select()
                .single();

            if (error) throw error;

            showAlert('✅ تم إرسال طلب تغيير البريد الإلكتروني بنجاح، وسيتم مراجعته قريباً.', 'success');
            newRequestModal.classList.remove('show');
            newRequestModal.style.display = 'none';
            newRequestForm.reset();
            newEmailInput.classList.remove('is-valid', 'is-invalid');
            newEmailHint.textContent = '';
            reasonHint.textContent = '';

            await fetchRequests();

        } catch (err) {
            console.error('فشل إرسال الطلب:', err);
            showAlert('⚠️ تعذر إرسال الطلب حالياً، يرجى المحاولة مرة أخرى لاحقاً.', 'error');
        } finally {
            submitRequestBtn.disabled = false;
            submitRequestBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
        }
    }

    // ===== تهيئة الصفحة =====
    async function initPage() {
        if (initialized) return;
        initialized = true;

        const success = await initSupabase();
        if (!success || !currentUser) {
            showAlert('لم يتم التعرف على جلسة المستخدم أو تعذر الاتصال بالخادم. يرجى تسجيل الدخول مرة أخرى.', 'error');
            return;
        }

        updateHeaderUI(currentUser);

        await fetchRequests();

        // ربط أحداث نافذة الطلب الجديد
        addRequestBtn.addEventListener('click', function() {
            if (addRequestBtn.disabled) return;
            currentEmailDisplayModal.value = currentUser.email || '';
            newEmailInput.value = '';
            newEmailInput.classList.remove('is-valid', 'is-invalid');
            newEmailHint.textContent = '';
            reasonInput.value = '';
            reasonHint.textContent = '';
            reasonInput.classList.remove('is-invalid');
            newRequestModal.classList.add('show');
            newRequestModal.style.display = 'flex';
        });

        closeNewRequestModal.addEventListener('click', function() {
            newRequestModal.classList.remove('show');
            newRequestModal.style.display = 'none';
        });
        cancelRequestBtn.addEventListener('click', function() {
            newRequestModal.classList.remove('show');
            newRequestModal.style.display = 'none';
        });
        newRequestModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
                this.style.display = 'none';
            }
        });

        newRequestForm.addEventListener('submit', submitNewRequest);
        newEmailInput.addEventListener('input', function() {
            validateNewEmail();
        });

        // ربط أحداث نافذة التعديل
        closeEditRequestModal.addEventListener('click', function() {
            editRequestModal.classList.remove('show');
            editRequestModal.style.display = 'none';
        });
        cancelEditBtn.addEventListener('click', function() {
            editRequestModal.classList.remove('show');
            editRequestModal.style.display = 'none';
        });
        editRequestModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
                this.style.display = 'none';
            }
        });
        editRequestForm.addEventListener('submit', saveEditRequest);
        editNewEmail.addEventListener('input', function() {
            validateEditEmail();
        });

        // ربط أحداث نافذة التفاصيل
        closeDetailModal.addEventListener('click', function() {
            detailModal.classList.remove('show');
            detailModal.style.display = 'none';
        });
        closeDetailBtn.addEventListener('click', function() {
            detailModal.classList.remove('show');
            detailModal.style.display = 'none';
        });
        detailModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
                this.style.display = 'none';
            }
        });

        console.log('✅ صفحة طلبات تغيير البريد الإلكتروني جاهزة (مع حالة "جديد").');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }

})();
