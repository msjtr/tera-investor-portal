/**
 * security-change-mobile.js – النسخة المتكاملة (فصل الرقم الحالي، تحقق إجباري، مطابقة)
 */
(function() {
    let supabase, currentUser, requests = [], currentFilter = 'all';
    let otpTimer = null, otpVerified = false, otpAttempts = 0;
    const MAX_OTP_ATTEMPTS = 5;

    const countryPatterns = {
        '+966': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX' },
        '+971': { regex: /^5\d{8}$/, length: 9, placeholder: '5XXXXXXXX' },
        '+965': { regex: /^[5-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '+973': { regex: /^[3-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '+974': { regex: /^[3-7]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '+968': { regex: /^[7-9]\d{7}$/, length: 8, placeholder: 'XXXXXXXX' },
        '+20':  { regex: /^1[0-2]\d{8}$/, length: 10, placeholder: '1XXXXXXXXX' }
    };

    // دالة لاستخراج مفتاح الدولة والرقم من رقم كامل (مثل "966597771565" أو "+966597771565")
    function parseMobile(fullNumber) {
        if (!fullNumber) return null;
        let cleaned = fullNumber.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
        cleaned = cleaned.substring(1); // إزالة +
        for (const code of Object.keys(countryPatterns)) {
            const codeWithoutPlus = code.substring(1);
            if (cleaned.startsWith(codeWithoutPlus)) {
                return { code: code, number: cleaned.substring(codeWithoutPlus.length) };
            }
        }
        return null;
    }

    function getStatusLabel(status) {
        const labels = { new: 'جديد', pending: 'قيد المراجعة', approved: 'تمت الموافقة', completed: 'تم التنفيذ', rejected: 'مرفوض', cancelled: 'ملغي' };
        return labels[status] || status;
    }

    function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleString('ar-SA') : '-'; }

    function showAlert(message, type = 'error') {
        const box = document.getElementById('formAlert');
        if (!box) return;
        box.style.display = 'flex'; box.className = `alert-box show ${type}`;
        document.getElementById('alertIcon').className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        document.getElementById('alertMessage').textContent = message;
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => { box.style.display = 'none'; box.className = 'alert-box'; }, 7000);
    }

    async function init() {
        try {
            supabase = window.teraSupabase || await waitForSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { window.location.replace('/auth/auth/login/login.html'); return; }
            currentUser = user;
            updateHeader(user);
            await fetchRequests();
            bindEvents();
        } catch (e) { console.error(e); showAlert('تعذر تحميل الصفحة.'); }
    }

    function updateHeader(user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم';
        document.getElementById('headerUserName').textContent = name;
        document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
    }

    async function fetchRequests() {
        const { data, error } = await supabase.from('mobile_change_requests').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        if (error) { console.error(error); return; }
        requests = data || [];
        updateStats();
        applyFilter();
        checkPendingRequest();
    }

    function updateStats() {
        const stats = { total:0, new:0, pending:0, approved:0, completed:0, rejected:0, cancelled:0 };
        requests.forEach(r => { stats.total++; stats[r.status] = (stats[r.status]||0)+1; });
        document.getElementById('totalCount').textContent = stats.total;
        document.getElementById('newCount').textContent = stats.new;
        document.getElementById('pendingCount').textContent = stats.pending;
        document.getElementById('approvedCount').textContent = stats.approved;
        document.getElementById('completedCount').textContent = stats.completed;
        document.getElementById('rejectedCount').textContent = stats.rejected;
        document.getElementById('cancelledCount').textContent = stats.cancelled;
    }

    function checkPendingRequest() {
        const hasActive = requests.some(r => r.status === 'new' || r.status === 'pending');
        const btn = document.getElementById('addRequestBtn');
        const notice = document.getElementById('pendingRequestNotice');
        if (btn) btn.disabled = hasActive;
        if (notice) notice.style.display = hasActive ? 'flex' : 'none';
    }

    function applyFilter() {
        const filter = document.getElementById('statusFilter').value;
        currentFilter = filter;
        const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
        renderTable(filtered);
        document.getElementById('filterCount').textContent = `عرض ${filtered.length} طلب`;
    }

    function renderTable(filtered) {
        const tbody = document.getElementById('requestsTableBody');
        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد طلبات</p></td></tr>`;
            return;
        }
        tbody.innerHTML = filtered.map(req => `
            <tr>
                <td>${req.request_number || '-'}</td>
                <td>${req.current_mobile || '-'}</td>
                <td>${req.new_country_code} ${req.new_mobile}</td>
                <td>${req.reason || '-'}</td>
                <td>${formatDate(req.created_at)}</td>
                <td>${formatDate(req.updated_at)}</td>
                <td><span class="status-badge ${req.status}">${getStatusLabel(req.status)}</span></td>
                <td>
                    <button class="btn-icon view-detail" data-id="${req.id}"><i class="fas fa-eye"></i></button>
                    ${(req.status==='new'||req.status==='pending') ? `<button class="btn-icon text-warning edit-request" data-id="${req.id}"><i class="fas fa-edit"></i></button><button class="btn-icon text-danger cancel-request" data-id="${req.id}"><i class="fas fa-times-circle"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
        bindRowEvents();
    }

    function bindRowEvents() {
        document.querySelectorAll('.view-detail').forEach(btn => btn.addEventListener('click', () => showDetail(btn.dataset.id)));
        document.querySelectorAll('.edit-request').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
        document.querySelectorAll('.cancel-request').forEach(btn => btn.addEventListener('click', () => openCancelModal(btn.dataset.id)));
    }

    function showDetail(id) {
        const req = requests.find(r => r.id === id);
        if (!req) return;
        document.getElementById('detailContent').innerHTML = `
            <div class="detail-item"><span>رقم الطلب:</span> <strong>${req.request_number||'-'}</strong></div>
            <div class="detail-item"><span>الجوال الحالي:</span> <strong>${req.current_mobile}</strong></div>
            <div class="detail-item"><span>الجوال الجديد:</span> <strong>${req.new_country_code} ${req.new_mobile}</strong></div>
            <div class="detail-item"><span>السبب:</span> ${req.reason||'-'}</div>
            <div class="detail-item"><span>تاريخ التقديم:</span> ${formatDate(req.created_at)}</div>
            <div class="detail-item"><span>آخر تحديث:</span> ${formatDate(req.updated_at)}</div>
            <div class="detail-item"><span>الحالة:</span> <span class="status-badge ${req.status}">${getStatusLabel(req.status)}</span></div>
        `;
        document.getElementById('detailModal').classList.add('show');
    }

    function openEditModal(id) {
        const req = requests.find(r => r.id === id);
        if (!req) return;
        document.getElementById('editRequestId').value = req.id;
        document.getElementById('editCurrentMobile').value = req.current_mobile;
        document.getElementById('editCountryCode').value = req.new_country_code;
        document.getElementById('editNewMobile').value = req.new_mobile;
        document.getElementById('editReason').value = req.reason || '';
        document.getElementById('editRequestModal').classList.add('show');
    }

    async function saveEdit(e) {
        e.preventDefault();
        const id = document.getElementById('editRequestId').value;
        const { error } = await supabase.from('mobile_change_requests').update({
            new_country_code: document.getElementById('editCountryCode').value,
            new_mobile: document.getElementById('editNewMobile').value,
            reason: document.getElementById('editReason').value,
            updated_at: new Date().toISOString()
        }).eq('id', id);
        if (!error) { showAlert('تم التعديل', 'success'); closeModal('editRequestModal'); fetchRequests(); }
        else showAlert('فشل التعديل');
    }

    function openCancelModal(id) {
        document.getElementById('cancelRequestId').value = id;
        document.getElementById('cancelReasonModal').classList.add('show');
    }

    async function cancelRequest(e) {
        e.preventDefault();
        const id = document.getElementById('cancelRequestId').value;
        const reason = document.getElementById('cancelReasonInput').value;
        if (!reason) return showAlert('أدخل سبب الإلغاء');
        const { error } = await supabase.from('mobile_change_requests').update({
            status: 'cancelled', cancellation_reason: reason, updated_at: new Date().toISOString()
        }).eq('id', id);
        if (!error) { showAlert('تم الإلغاء', 'success'); closeModal('cancelReasonModal'); fetchRequests(); }
    }

    function closeModal(id) { document.getElementById(id).classList.remove('show'); }

    // ===== تجهيز نافذة الطلب الجديد (فصل الرقم الحالي) =====
    function prepareNewRequestModal() {
        // جلب الرقم الحالي من user_metadata
        const fullMobile = currentUser.user_metadata?.mobile_number || '';
        const parsed = parseMobile(fullMobile);

        // عرض الرقم الحالي مفصولاً في الحقل المخصص (يمكن أن يكون حقل مخفي أو نص)
        const currentMobileDisplay = document.getElementById('currentMobileDisplayModal');
        if (currentMobileDisplay) {
            if (parsed) {
                currentMobileDisplay.value = `${parsed.code} ${parsed.number}`;
            } else {
                currentMobileDisplay.value = fullMobile || 'غير مسجل';
            }
        }

        // ضبط الدولة الافتراضية للجوال الجديد لتكون مطابقة للحالي
        const newCountryCode = document.getElementById('newCountryCode');
        if (newCountryCode && parsed) {
            // التأكد من أن القيمة موجودة في القائمة
            if ([...newCountryCode.options].some(opt => opt.value === parsed.code)) {
                newCountryCode.value = parsed.code;
            }
        }

        // إعادة تعيين الحقول الأخرى
        document.getElementById('newMobileNumber').value = '';
        document.getElementById('confirmNewMobile').value = '';
        document.getElementById('reasonInput').value = '';
        resetNewForm();
    }

    function bindEvents() {
        document.getElementById('statusFilter').addEventListener('change', applyFilter);
        document.getElementById('addRequestBtn').addEventListener('click', () => {
            prepareNewRequestModal(); // فصل الرقم الحالي
            document.getElementById('newRequestModal').classList.add('show');
        });
        document.getElementById('closeNewRequestModal').addEventListener('click', () => closeModal('newRequestModal'));
        document.getElementById('cancelNewRequestBtn').addEventListener('click', () => closeModal('newRequestModal'));
        document.getElementById('sendOtpBtnNew').addEventListener('click', sendOtpForNewRequest);
        document.getElementById('newRequestForm').addEventListener('submit', submitNewRequest);
        document.getElementById('editRequestForm').addEventListener('submit', saveEdit);
        document.getElementById('cancelReasonForm').addEventListener('submit', cancelRequest);

        document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => {
            const modal = b.closest('.modal-overlay');
            if (modal) modal.classList.remove('show');
        }));
        ['closeDetailModal','closeDetailBtn','closeEditRequestModal','cancelEditBtn','closeCancelReasonModal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => {
                const modal = el.closest('.modal-overlay');
                if (modal) modal.classList.remove('show');
            });
        });

        // أحداث التحقق الفوري من الرقم الجديد وتأكيده
        document.getElementById('newMobileNumber').addEventListener('input', validateNewMobileInputs);
        document.getElementById('confirmNewMobile').addEventListener('input', validateNewMobileInputs);
        document.getElementById('newCountryCode').addEventListener('change', validateNewMobileInputs);
    }

    // ===== التحقق من صحة الرقم الجديد وتطابقه =====
    function validateNewMobileInputs() {
        const code = document.getElementById('newCountryCode').value;
        const newMobile = document.getElementById('newMobileNumber').value.replace(/\D/g, '');
        const confirmMobile = document.getElementById('confirmNewMobile').value.replace(/\D/g, '');
        const sendBtn = document.getElementById('sendOtpBtnNew');
        const mobileHint = document.getElementById('newMobileNumber').closest('.form-group')?.querySelector('.form-hint') || document.getElementById('otpHintNew');
        const confirmHint = document.getElementById('confirmNewMobile').closest('.form-group')?.querySelector('.form-hint') || document.getElementById('otpHintNew');

        // التحقق من صحة الرقم الجديد
        const pattern = countryPatterns[code];
        let isValid = true;
        if (!pattern) isValid = false;
        else if (newMobile.length !== pattern.length || !pattern.regex.test(newMobile)) {
            isValid = false;
            if (mobileHint) { mobileHint.textContent = pattern.msg; mobileHint.className = 'form-hint error'; }
        } else {
            if (mobileHint) { mobileHint.textContent = '✅ رقم صالح'; mobileHint.className = 'form-hint success'; }
        }

        // التحقق من عدم مطابقة الرقم الحالي
        const currentFullMobile = currentUser.user_metadata?.mobile_number || '';
        const currentParsed = parseMobile(currentFullMobile);
        if (currentParsed && newMobile === currentParsed.number && code === currentParsed.code) {
            isValid = false;
            if (mobileHint) { mobileHint.textContent = '✖ الرقم الجديد مطابق للرقم الحالي'; mobileHint.className = 'form-hint error'; }
        }

        // التحقق من تطابق التأكيد
        if (confirmMobile.length > 0) {
            if (newMobile !== confirmMobile) {
                isValid = false;
                if (confirmHint) { confirmHint.textContent = '✖ الرقم غير متطابق'; confirmHint.className = 'form-hint error'; }
            } else {
                if (confirmHint) { confirmHint.textContent = '✅ الرقم متطابق'; confirmHint.className = 'form-hint success'; }
            }
        } else {
            if (confirmHint) { confirmHint.textContent = ''; confirmHint.className = 'form-hint'; }
        }

        // تعطيل زر الإرسال إذا كانت البيانات غير صحيحة
        if (sendBtn) sendBtn.disabled = !isValid;
    }

    function resetNewForm() {
        otpVerified = false; otpAttempts = 0;
        document.getElementById('otpSectionNew').style.display = 'none';
        document.getElementById('sendOtpBtnNew').style.display = 'block';
        document.getElementById('submitNewRequestBtn').style.display = 'none';
        document.getElementById('otpCodeNew').value = '';
        clearInterval(otpTimer);
        validateNewMobileInputs(); // تحديث حالة الأزرار
    }

    async function sendOtpForNewRequest() {
        const code = document.getElementById('newCountryCode').value;
        const mobile = document.getElementById('newMobileNumber').value.replace(/\D/g, '');
        const pattern = countryPatterns[code];
        if (!pattern || mobile.length !== pattern.length || !pattern.regex.test(mobile)) {
            return showAlert('رقم الجوال غير صحيح.');
        }

        // التحقق مرة أخرى من عدم المطابقة
        const currentParsed = parseMobile(currentUser.user_metadata?.mobile_number || '');
        if (currentParsed && mobile === currentParsed.number && code === currentParsed.code) {
            return showAlert('الرقم الجديد مطابق للحالي.');
        }

        const confirmMobile = document.getElementById('confirmNewMobile').value.replace(/\D/g, '');
        if (mobile !== confirmMobile) {
            return showAlert('رقم التأكيد غير متطابق.');
        }

        const { error } = await supabase.auth.signInWithOtp({ email: currentUser.email, options: { shouldCreateUser: false } });
        if (error) return showAlert('فشل إرسال الرمز');
        showAlert('تم إرسال الرمز إلى بريدك', 'success');
        document.getElementById('otpSectionNew').style.display = 'block';
        document.getElementById('sendOtpBtnNew').style.display = 'none';
        startOtpTimer();
    }

    function startOtpTimer() {
        let sec = 300;
        const btn = document.getElementById('resendOtpBtnNew');
        btn.disabled = true;
        btn.textContent = `إعادة الإرسال (05:00)`;
        clearInterval(otpTimer);
        otpTimer = setInterval(() => {
            sec--;
            const m = Math.floor(sec/60), s = sec%60;
            btn.textContent = `إعادة الإرسال (${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')})`;
            if (sec <= 0) { clearInterval(otpTimer); btn.disabled = false; btn.textContent = 'إعادة الإرسال'; }
        }, 1000);
    }

    async function submitNewRequest(e) {
        e.preventDefault();
        const code = document.getElementById('newCountryCode').value;
        const mobile = document.getElementById('newMobileNumber').value.replace(/\D/g, '');
        const confirmMobile = document.getElementById('confirmNewMobile').value.replace(/\D/g, '');
        const reason = document.getElementById('reasonInput').value.trim();
        const otp = document.getElementById('otpCodeNew').value;

        // التحقق من الحقول الإجبارية
        if (!reason) return showAlert('يرجى إدخال سبب التغيير.');
        if (mobile !== confirmMobile) return showAlert('رقم التأكيد غير متطابق.');
        const pattern = countryPatterns[code];
        if (!pattern || mobile.length !== pattern.length || !pattern.regex.test(mobile)) return showAlert('رقم الجوال غير صحيح.');

        // التحقق من عدم مطابقة الرقم الحالي
        const currentParsed = parseMobile(currentUser.user_metadata?.mobile_number || '');
        if (currentParsed && mobile === currentParsed.number && code === currentParsed.code) {
            return showAlert('الرقم الجديد مطابق للحالي.');
        }

        if (!otpVerified) {
            const { error } = await supabase.auth.verifyOtp({ email: currentUser.email, token: otp, type: 'email' });
            if (error) { otpAttempts++; return showAlert('رمز التحقق غير صحيح'); }
            otpVerified = true;
        }

        const { error } = await supabase.from('mobile_change_requests').insert({
            user_id: currentUser.id,
            current_mobile: currentUser.user_metadata?.mobile_number || '',
            new_country_code: code,
            new_mobile: mobile,
            reason: reason,
            status: 'new'
        });
        if (!error) { showAlert('تم تقديم الطلب', 'success'); closeModal('newRequestModal'); fetchRequests(); }
        else showAlert('فشل تقديم الطلب');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
