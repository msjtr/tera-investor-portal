/**
 * security-change-mobile.js – النسخة النهائية (توليد رقم طلب، تفاصيل كاملة)
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

    function generateRequestNumber() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const random = Math.floor(Math.random() * 90000) + 10000; // رقم عشوائي 5 خانات
        return `TR-${dateStr}-${random}`;
    }

    function showAlert(message, type = 'error') {
        const box = document.getElementById('formAlert');
        if (!box) return;
        box.style.display = 'flex'; box.className = `alert-box show ${type}`;
        document.getElementById('alertIcon').className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        document.getElementById('alertMessage').textContent = message;
        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => { box.style.display = 'none'; box.className = 'alert-box'; }, 7000);
    }

    function parseMobile(fullNumber) {
        if (!fullNumber) return { code: '+966', number: '' };
        let cleaned = fullNumber.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
        let digits = cleaned.substring(1);
        for (const code of Object.keys(countryPatterns)) {
            const prefix = code.substring(1);
            if (digits.startsWith(prefix)) {
                return { code: code, number: digits.substring(prefix.length) };
            }
        }
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
            ensureDynamicElements();
            bindVerifyOtpButton();
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
            <div class="detail-item"><span class="detail-label">رقم الطلب</span><span class="detail-value">${req.request_number || '-'}</span></div>
            <div class="detail-item"><span class="detail-label">الجوال الحالي</span><span class="detail-value">${req.current_mobile || '-'}</span></div>
            <div class="detail-item"><span class="detail-label">الجوال الجديد</span><span class="detail-value">${req.new_country_code} ${req.new_mobile}</span></div>
            <div class="detail-item"><span class="detail-label">سبب التغيير</span><span class="detail-value">${req.reason || '-'}</span></div>
            <div class="detail-item"><span class="detail-label">تاريخ التقديم</span><span class="detail-value">${formatDate(req.created_at)}</span></div>
            <div class="detail-item"><span class="detail-label">آخر تحديث</span><span class="detail-value">${formatDate(req.updated_at)}</span></div>
            <div class="detail-item"><span class="detail-label">الحالة</span><span class="detail-value"><span class="status-badge ${req.status}">${getStatusLabel(req.status)}</span></span></div>
            <div class="detail-item"><span class="detail-label">ملاحظات الإدارة</span><span class="detail-value">${req.admin_notes || '-'}</span></div>
            <div class="detail-item"><span class="detail-label">سبب الرفض</span><span class="detail-value">${req.rejection_reason || '-'}</span></div>
            <div class="detail-item"><span class="detail-label">سبب الإلغاء</span><span class="detail-value">${req.cancellation_reason || '-'}</span></div>
            <div class="detail-item"><span class="detail-label">تاريخ التنفيذ</span><span class="detail-value">${req.completed_at ? formatDate(req.completed_at) : '-'}</span></div>
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

    function ensureDynamicElements() {
        if (!document.getElementById('currentMobileRow')) {
            const container = document.querySelector('#newRequestModal .modal-box');
            if (container) {
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
            }
        }

        if (!document.getElementById('verifyOtpBtnNew')) {
            const otpSection = document.getElementById('otpSectionNew');
            if (otpSection) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.id = 'verifyOtpBtnNew';
                btn.className = 'btn-primary';
                btn.textContent = 'تحقق من الرمز';
                btn.style.marginTop = '10px';
                btn.style.width = '100%';
                btn.style.display = 'none';
                otpSection.appendChild(btn);
            }
        }
    }

    function bindVerifyOtpButton() {
        const verifyBtn = document.getElementById('verifyOtpBtnNew');
        if (verifyBtn) {
            verifyBtn.removeEventListener('click', verifyOtpCode);
            verifyBtn.addEventListener('click', verifyOtpCode);
        }
    }

    function openNewRequestModal() {
        const currentMobile = currentUser.user_metadata?.mobile_number || '';
        const parsed = parseMobile(currentMobile);

        const currentCountryInput = document.getElementById('currentCountryCodeModal');
        const currentNumberInput = document.getElementById('currentMobileNumberModal');
        if (currentCountryInput) currentCountryInput.value = parsed.code;
        if (currentNumberInput) currentNumberInput.value = parsed.number;

        const oldDisplay = document.getElementById('currentMobileDisplayModal');
        if (oldDisplay) oldDisplay.value = currentMobile;

        document.getElementById('newCountryCode').value = '+966';
        document.getElementById('newMobileNumber').value = '';
        document.getElementById('confirmNewMobile').value = '';
        document.getElementById('reasonInput').value = '';
        document.getElementById('otpSectionNew').style.display = 'none';
        document.getElementById('sendOtpBtnNew').style.display = 'block';
        document.getElementById('sendOtpBtnNew').disabled = true;
        document.getElementById('submitNewRequestBtn').style.display = 'none';
        document.getElementById('otpCodeNew').value = '';

        const hints = document.querySelectorAll('#newRequestForm .form-hint');
        hints.forEach(h => { if (h.id !== 'otpHintNew') h.textContent = ''; });
        document.getElementById('otpHintNew').textContent = 'أدخل الرمز المرسل إلى بريدك الإلكتروني';

        otpVerified = false;
        otpAttempts = 0;
        clearInterval(otpTimer);

        document.getElementById('newRequestModal').classList.add('show');

        attachValidationListeners();
        const verifyBtn = document.getElementById('verifyOtpBtnNew');
        if (verifyBtn) verifyBtn.style.display = 'none';
        document.getElementById('submitNewRequestBtn').style.display = 'none';
    }

    function validateNewMobileField() {
        const code = document.getElementById('newCountryCode').value;
        const mobile = document.getElementById('newMobileNumber').value.replace(/\D/g, '');
        let mobileHint = document.getElementById('newMobileHint');
        if (!mobileHint) {
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
        const newMobileEl = document.getElementById('newMobileNumber');
        const confirmEl = document.getElementById('confirmNewMobile');
        const countryEl = document.getElementById('newCountryCode');
        const sendOtpBtn = document.getElementById('sendOtpBtnNew');

        const update = () => {
            validateNewMobileField();
            validateConfirmField();
            if (sendOtpBtn) sendOtpBtn.disabled = !(validateNewMobileField() && validateConfirmField());
        };

        newMobileEl.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            update();
        });
        confirmEl.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            update();
        });
        countryEl.addEventListener('change', function() {
            newMobileEl.value = '';
            confirmEl.value = '';
            update();
        });

        const otpInput = document.getElementById('otpCodeNew');
        if (otpInput) {
            otpInput.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '');
                if (this.value.length === 8) {
                    verifyOtpCode();
                }
            });
        }

        update();
    }

    async function verifyOtpCode() {
        const otp = document.getElementById('otpCodeNew').value;
        const hint = document.getElementById('otpHintNew');
        const verifyBtn = document.getElementById('verifyOtpBtnNew');
        const submitBtn = document.getElementById('submitNewRequestBtn');

        if (otp.length !== 8) {
            hint.textContent = 'يجب إدخال 8 أرقام';
            hint.className = 'form-hint error';
            return;
        }

        if (otpAttempts >= MAX_OTP_ATTEMPTS) {
            hint.textContent = 'تجاوزت عدد المحاولات. اطلب رمزاً جديداً.';
            hint.className = 'form-hint error';
            return;
        }

        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'جاري التحقق...';
        }

        const { error } = await supabase.auth.verifyOtp({
            email: currentUser.email,
            token: otp,
            type: 'email'
        });

        if (error) {
            otpAttempts++;
            hint.textContent = `رمز التحقق غير صحيح. متبقي ${MAX_OTP_ATTEMPTS - otpAttempts} محاولات`;
            hint.className = 'form-hint error';
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'تحقق من الرمز';
            }
            return;
        }

        otpVerified = true;
        hint.textContent = '✅ تم التحقق بنجاح';
        hint.className = 'form-hint success';
        if (verifyBtn) verifyBtn.style.display = 'none';
        if (submitBtn) {
            submitBtn.style.display = 'block';
            submitBtn.disabled = false;
        }
        document.getElementById('otpCodeNew').disabled = true;
        const resendBtn = document.getElementById('resendOtpBtnNew');
        if (resendBtn) resendBtn.style.display = 'none';
    }

    async function sendOtpForNewRequest() {
        if (!validateNewMobileField() || !validateConfirmField()) {
            return showAlert('يرجى تصحيح رقم الجوال الجديد', 'error');
        }

        const { error } = await supabase.auth.signInWithOtp({
            email: currentUser.email,
            options: { shouldCreateUser: false }
        });
        if (error) {
            showAlert('فشل إرسال الرمز', 'error');
            return;
        }

        document.getElementById('otpSectionNew').style.display = 'block';
        document.getElementById('sendOtpBtnNew').style.display = 'none';
        const verifyBtn = document.getElementById('verifyOtpBtnNew');
        if (verifyBtn) {
            verifyBtn.style.display = 'block';
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'تحقق من الرمز';
        }
        document.getElementById('otpCodeNew').value = '';
        document.getElementById('otpCodeNew').disabled = false;
        document.getElementById('otpHintNew').textContent = 'أدخل الرمز المرسل إلى بريدك الإلكتروني';
        document.getElementById('otpHintNew').className = 'form-hint';
        otpVerified = false;
        otpAttempts = 0;
        startOtpTimer();
    }

    function startOtpTimer() {
        let sec = 300;
        const btn = document.getElementById('resendOtpBtnNew');
        btn.style.display = 'block';
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

        if (!reason) {
            showAlert('أدخل سبب التغيير', 'error');
            return;
        }
        if (!otpVerified) {
            showAlert('يجب التحقق من رمز OTP أولاً', 'error');
            return;
        }

        const { error } = await supabase.from('mobile_change_requests').insert({
            user_id: currentUser.id,
            request_number: generateRequestNumber(),
            current_mobile: currentUser.user_metadata?.mobile_number || '',
            new_country_code: code,
            new_mobile: mobile,
            reason: reason,
            status: 'new'
        });
        if (!error) {
            showAlert('تم تقديم الطلب', 'success');
            closeModal('newRequestModal');
            fetchRequests();
        } else {
            showAlert('فشل تقديم الطلب', 'error');
        }
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
