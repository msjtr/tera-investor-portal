/**
 * security-change-mobile.js – النسخة المتكاملة مع فصل الرقم الحالي داخل النافذة
 * يعمل مع صفحة change-mobile.html التي تحتوي على table و stats و filter
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

    // دالة تحليل رقم الجوال إلى كود الدولة والرقم
    function parseMobile(fullNumber) {
        if (!fullNumber) return { code: '+966', number: '' };
        let cleaned = fullNumber.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
        // إزالة + للبحث
        let digits = cleaned.substring(1);
        // البحث عن أطول كود دولة متطابق
        for (const code of Object.keys(countryPatterns)) {
            const prefix = code.substring(1); // إزالة +
            if (digits.startsWith(prefix)) {
                return { code: code, number: digits.substring(prefix.length) };
            }
        }
        // إذا لم يطابق، افترض السعودية
        return { code: '+966', number: digits };
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

    // ========== وظائف النافذة الجديدة ==========

    // فتح النافذة مع تهيئة الحقول
    function openNewRequestModal() {
        // الحصول على الرقم الحالي وتحليله
        const currentMobile = currentUser.user_metadata?.mobile_number || '';
        const parsed = parseMobile(currentMobile);

        // تعبئة حقل مفتاح الدولة الحالي (قراءة فقط) وحقل الرقم الحالي (قراءة فقط)
        document.getElementById('currentMobileDisplayModal').value = currentMobile; // يمكن أن يظل النص الكامل أو نستخدمه للعرض
        // لكننا سنستخدم حقلين منفصلين للعرض فقط، بفرض أن HTML يحتوي على:
        // <input id="currentCountryCode" disabled> و <input id="currentMobileNumber" disabled>
        // إذا كانت الصفحة لا تحتوي عليهما، سنقوم بإنشائهما ديناميكياً داخل النافذة.
        const currentCountryInput = document.getElementById('currentCountryCodeModal');
        const currentNumberInput = document.getElementById('currentMobileNumberModal');
        if (currentCountryInput && currentNumberInput) {
            currentCountryInput.value = parsed.code;
            currentNumberInput.value = parsed.number;
        } else {
            // إذا لم تكن موجودة، نقوم بإنشائها داخل الـ modal قبل الحقول الأخرى
            const container = document.querySelector('#newRequestModal .modal-box');
            if (container && !document.getElementById('currentMobileRow')) {
                const row = document.createElement('div');
                row.id = 'currentMobileRow';
                row.style.display = 'grid';
                row.style.gridTemplateColumns = '1fr 2fr';
                row.style.gap = '12px';
                row.style.marginBottom = '12px';
                row.innerHTML = `
                    <div class="form-group">
                        <label>مفتاح الدولة الحالي</label>
                        <input class="form-control" id="currentCountryCodeModal" disabled>
                    </div>
                    <div class="form-group">
                        <label>رقم الجوال الحالي</label>
                        <input class="form-control" id="currentMobileNumberModal" disabled>
                    </div>
                `;
                const firstFormGroup = document.querySelector('#newRequestForm .form-group');
                if (firstFormGroup) {
                    firstFormGroup.parentNode.insertBefore(row, firstFormGroup);
                }
                // بعد الإدراج، نملأ القيم
                document.getElementById('currentCountryCodeModal').value = parsed.code;
                document.getElementById('currentMobileNumberModal').value = parsed.number;
            }
        }

        // إعادة تعيين باقي الحقول
        document.getElementById('newCountryCode').value = '+966';
        document.getElementById('newMobileNumber').value = '';
        document.getElementById('confirmNewMobile').value = '';
        document.getElementById('reasonInput').value = '';
        document.getElementById('otpSectionNew').style.display = 'none';
        document.getElementById('sendOtpBtnNew').style.display = 'block';
        document.getElementById('submitNewRequestBtn').style.display = 'none';
        document.getElementById('otpCodeNew').value = '';

        // إخفاء رسائل التلميح
        const hints = document.querySelectorAll('#newRequestForm .form-hint');
        hints.forEach(h => h.textContent = '');

        otpVerified = false;
        otpAttempts = 0;
        clearInterval(otpTimer);

        document.getElementById('newRequestModal').classList.add('show');

        // ربط التحقق الفوري
        attachValidationListeners();
    }

    // التحقق من صحة الرقم الجديد
    function validateNewMobileField() {
        const code = document.getElementById('newCountryCode').value;
        const mobile = document.getElementById('newMobileNumber').value.replace(/\D/g, '');
        const hint = document.getElementById('newMobileHintModal') || document.getElementById('otpHintNew'); // استخدم أي حقل تلميح
        // لنفترض أن لدينا عنصر تلميح خاص بالرقم الجديد، إن لم يوجد ننشئه
        let mobileHint = document.getElementById('newMobileHint');
        if (!mobileHint) {
            // ننشئه أسفل حقل الرقم الجديد
            const input = document.getElementById('newMobileNumber');
            mobileHint = document.createElement('div');
            mobileHint.id = 'newMobileHint';
            mobileHint.className = 'form-hint';
            input.parentNode.appendChild(mobileHint);
        }

        const pattern = countryPatterns[code];
        if (!pattern) {
            mobileHint.textContent = 'الدولة غير مدعومة';
            mobileHint.className = 'form-hint error';
            return false;
        }
        if (mobile.length === 0) {
            mobileHint.textContent = '';
            mobileHint.className = 'form-hint';
            return false;
        }
        if (mobile.length !== pattern.length || !pattern.regex.test(mobile)) {
            mobileHint.textContent = pattern.msg || 'رقم غير صحيح';
            mobileHint.className = 'form-hint error';
            return false;
        }
        // التحقق من عدم مطابقة الرقم الحالي
        const currentFull = (currentUser.user_metadata?.mobile_number || '').replace(/\D/g, '');
        const newFull = (code + mobile).replace(/\D/g, '');
        if (currentFull && newFull === currentFull) {
            mobileHint.textContent = 'الرقم الجديد مطابق للحالي';
            mobileHint.className = 'form-hint error';
            return false;
        }
        mobileHint.textContent = 'رقم صالح';
        mobileHint.className = 'form-hint success';
        return true;
    }

    function validateConfirmField() {
        const newMobile = document.getElementById('newMobileNumber').value.replace(/\D/g, '');
        const confirmMobile = document.getElementById('confirmNewMobile').value.replace(/\D/g, '');
        let confirmHint = document.getElementById('confirmMobileHint');
        if (!confirmHint) {
            const input = document.getElementById('confirmNewMobile');
            confirmHint = document.createElement('div');
            confirmHint.id = 'confirmMobileHint';
            confirmHint.className = 'form-hint';
            input.parentNode.appendChild(confirmHint);
        }
        if (!confirmMobile) {
            confirmHint.textContent = '';
            confirmHint.className = 'form-hint';
            return false;
        }
        if (newMobile !== confirmMobile) {
            confirmHint.textContent = 'الرقم غير متطابق';
            confirmHint.className = 'form-hint error';
            return false;
        }
        confirmHint.textContent = 'الرقم متطابق';
        confirmHint.className = 'form-hint success';
        return true;
    }

    function attachValidationListeners() {
        document.getElementById('newMobileNumber').addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            validateNewMobileField();
            validateConfirmField();
            toggleSendOtpButton();
        });
        document.getElementById('confirmNewMobile').addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            validateConfirmField();
            toggleSendOtpButton();
        });
        document.getElementById('newCountryCode').addEventListener('change', function() {
            document.getElementById('newMobileNumber').value = '';
            document.getElementById('confirmNewMobile').value = '';
            validateNewMobileField();
            validateConfirmField();
            toggleSendOtpButton();
        });
        // تشغيل التحقق مرة واحدة
        validateNewMobileField();
        validateConfirmField();
        toggleSendOtpButton();
    }

    function toggleSendOtpButton() {
        const isValid = validateNewMobileField() && validateConfirmField();
        document.getElementById('sendOtpBtnNew').disabled = !isValid;
    }

    async function sendOtpForNewRequest() {
        if (!validateNewMobileField() || !validateConfirmField()) {
            return showAlert('يرجى تصحيح رقم الجوال الجديد', 'error');
        }

        const code = document.getElementById('newCountryCode').value;
        const mobile = document.getElementById('newMobileNumber').value.replace(/\D/g, '');

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
        const reason = document.getElementById('reasonInput').value;
        const otp = document.getElementById('otpCodeNew').value;

        if (!reason) return showAlert('أدخل سبب التغيير');
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

    function bindEvents() {
        document.getElementById('statusFilter').addEventListener('change', applyFilter);
        document.getElementById('addRequestBtn').addEventListener('click', openNewRequestModal);
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
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
