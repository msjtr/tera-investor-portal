/**
 * security-email-change-requests.js
 * إدارة طلبات تغيير البريد الإلكتروني – المستخدم
 * - عرض الطلبات السابقة
 * - تقديم طلب جديد (مع قيود)
 * - عرض تفاصيل الطلب
 * - إحصائيات
 */

'use strict';

(function() {
    let supabase = null;
    let currentUser = null;
    let initialized = false;
    let requests = [];
    let stats = { total: 0, pending: 0, approved: 0, completed: 0, rejected: 0 };

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
            'pending': '🟡',
            'approved': '🔵',
            'completed': '🟢',
            'rejected': '🔴',
            'cancelled': '⚫'
        };
        return icons[status] || '';
    }

    // ===== التحقق من البريد في auth.users (عبر Edge Function) =====
    async function checkEmailViaEdge(email) {
        try {
            const { data, error } = await supabase.functions.invoke('check-email-status', {
                body: { email: email.trim().toLowerCase() }
            });
            if (error) {
                console.error('Edge Function error:', error);
                // في حال فشل Edge Function، نرجع نتيجة آمنة (نرفض الاستخدام)
                return { canUse: false, error: true, message: 'تعذر التحقق من البريد، حاول مرة أخرى.' };
            }
            return data;
        } catch (err) {
            console.error('فشل الاتصال بـ Edge Function:', err);
            return { canUse: false, error: true, message: 'تعذر الاتصال بالخادم، حاول مرة أخرى.' };
        }
    }

    // ===== توليد رقم طلب مؤقت (سيتم استبداله من الخادم) =====
    function generateTempRequestNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = String(Math.floor(10000 + Math.random() * 90000));
        return `TR-${year}-${month}-${day}-${random}`;
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

            if (error) {
                console.error('خطأ في جلب الطلبات:', error);
                // عرض رسالة خطأ للمستخدم
                showAlert('تعذر تحميل الطلبات. يرجى تحديث الصفحة.', 'error');
                return;
            }
            requests = data || [];
            renderTable();
            updateStats();
            checkPendingRequest();
        } catch (err) {
            console.error('فشل جلب الطلبات:', err);
            showAlert('تعذر تحميل الطلبات. يرجى تحديث الصفحة.', 'error');
        }
    }

    // ===== تحديث الإحصائيات =====
    function updateStats() {
        stats.total = requests.length;
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

    // ===== التحقق من وجود طلب قائم =====
    function checkPendingRequest() {
        const hasPending = requests.some(r => r.status === 'pending' || r.status === 'approved');
        if (hasPending) {
            addRequestBtn.disabled = true;
            pendingNotice.style.display = 'flex';
        } else {
            addRequestBtn.disabled = false;
            pendingNotice.style.display = 'none';
        }
    }

    // ===== عرض الجدول =====
    function renderTable() {
        if (!tableBody) return;
        if (requests.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد طلبات حتى الآن</p></td></tr>`;
            return;
        }

        let html = '';
        requests.forEach(req => {
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
                        <button class="btn-icon view-detail" data-id="${req.id}" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

        // ربط أحداث عرض التفاصيل
        document.querySelectorAll('.view-detail').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const request = requests.find(r => r.id === id);
                if (request) showDetail(request);
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

    // ===== التحقق من البريد الجديد (فوري) =====
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

        // التحقق من auth.users عبر Edge Function
        const checkResult = await checkEmailViaEdge(email);
        if (checkResult.error) {
            newEmailHint.textContent = checkResult.message || '⚠️ تعذر التحقق من البريد، حاول مرة أخرى.';
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

        // التحقق من السبب
        if (!reason) {
            reasonHint.textContent = '✖ يرجى إدخال سبب تغيير البريد الإلكتروني.';
            reasonHint.className = 'form-hint error';
            reasonInput.classList.add('is-invalid');
            return;
        }
        reasonHint.textContent = '';
        reasonInput.classList.remove('is-invalid');

        // التحقق من البريد
        const isValid = await validateNewEmail();
        if (!isValid) return;

        // تعطيل الزر
        submitRequestBtn.disabled = true;
        submitRequestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            // توليد رقم طلب مبدئي (سيتم استبداله من الخادم)
            const tempNumber = generateTempRequestNumber();

            const { data, error } = await supabase
                .from('email_change_requests')
                .insert({
                    request_number: tempNumber,
                    user_id: currentUser.id,
                    current_email: currentUser.email,
                    new_email: newEmail,
                    reason: reason,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // نجاح الإرسال
            showAlert('✅ تم إرسال طلب تغيير البريد الإلكتروني بنجاح، وسيتم إشعاركم بعد مراجعة الطلب.', 'success');
            newRequestModal.classList.remove('show');
            newRequestModal.style.display = 'none';
            newRequestForm.reset();
            newEmailInput.classList.remove('is-valid', 'is-invalid');
            newEmailHint.textContent = '';
            reasonHint.textContent = '';

            // تحديث الجدول والإحصائيات
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

        // جلب الطلبات
        await fetchRequests();

        // ربط الأحداث
        addRequestBtn.addEventListener('click', function() {
            if (addRequestBtn.disabled) return;
            // تعبئة البريد الحالي في النموذج
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
        // إغلاق عند النقر خارج النافذة
        newRequestModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
                this.style.display = 'none';
            }
        });

        newRequestForm.addEventListener('submit', submitNewRequest);

        // التحقق الفوري من البريد الجديد
        newEmailInput.addEventListener('input', function() {
            validateNewEmail();
        });

        // تفاصيل الطلب
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

        console.log('✅ صفحة طلبات تغيير البريد الإلكتروني جاهزة.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPage);
    } else {
        initPage();
    }

})();
