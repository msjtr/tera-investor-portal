// deposit-center.js
// TERA Investor Portal - Deposit Center page logic
(function () {
  'use strict';

  var supabase = window.supabaseClient || (window.Supa && window.Supa.client);
  var currentUser = null;
  var allDeposits = [];
  var filteredDeposits = [];
  var currentPage = 1;
  var pageSize = 10;

  var BANK_INFO = {
    bankName: 'مصرف الراجحي',
    accountName: 'محمد صالح جميعان - إدارة وتنشيط المبيعات',
    accountNumber: '002100010006086045029',
    iban: 'SA1780000001608016045029',
    swift: 'RJHISARI'
  };

  function fmtMoney(n) {
    n = Number(n || 0);
    return n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ر.س';
  }

  function fmtDate(d) {
    if (!d) return '--';
    try { return new Date(d).toLocaleDateString('ar-SA'); } catch (e) { return d; }
  }

  var STATUS_LABELS = {
    pending_receipt: 'بانتظار رفع الإيصال',
    pending_review: 'بانتظار المراجعة',
    verifying: 'جاري التحقق',
    pending_approval: 'بانتظار الاعتماد',
    approved: 'تمت الموافقة',
    credited: 'تمت إضافة الرصيد',
    completed: 'مكتمل',
    rejected: 'مرفوض',
    cancelled: 'ملغي'
  };

  function statusBadge(status) {
    var label = STATUS_LABELS[status] || status;
    return '<span class="status-badge status-' + status + '">' + label + '</span>';
  }

  async function getClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.getSupabaseClient) return await window.getSupabaseClient();
    return null;
  }

  async function loadCurrentUser() {
    var client = await getClient();
    if (!client) return null;
    var res = await client.auth.getUser();
    return res && res.data ? res.data.user : null;
  }

  async function fetchDeposits() {
    var client = await getClient();
    if (!client || !currentUser) return [];
    var { data, error } = await client
      .from('deposit_requests')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (error) { console.error('fetchDeposits error', error); return []; }
    return data || [];
  }

  function computeStats(list) {
    var now = new Date();
    var monthTotal = 0, yearTotal = 0, totalAll = 0, pendingCount = 0, feesTotal = 0;
    var approvedCount = 0, doneCount = 0, approvalDurations = [];
    list.forEach(function (d) {
      var amount = Number(d.amount || 0);
      var created = d.created_at ? new Date(d.created_at) : null;
      if (['completed', 'credited', 'approved'].indexOf(d.status) !== -1) {
        totalAll += amount;
        if (created && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()) monthTotal += amount;
        if (created && created.getFullYear() === now.getFullYear()) yearTotal += amount;
        doneCount++;
        if (d.approved_at && d.created_at) {
          var diffH = (new Date(d.approved_at) - new Date(d.created_at)) / 36e5;
          if (diffH >= 0) approvalDurations.push(diffH);
        }
      }
      if (['pending_receipt', 'pending_review', 'verifying', 'pending_approval'].indexOf(d.status) !== -1) pendingCount++;
      feesTotal += Number(d.fee_amount || 0) + Number(d.vat_amount || 0);
      if (d.status !== 'rejected' && d.status !== 'cancelled') approvedCount++;
    });
    var avgApproval = approvalDurations.length ? (approvalDurations.reduce(function (a, b) { return a + b; }, 0) / approvalDurations.length) : 0;
    var approvalRate = list.length ? Math.round((approvedCount / list.length) * 100) : 0;
    var last = list[0];
    return {
      total: totalAll, count: list.length, monthTotal: monthTotal, yearTotal: yearTotal,
      pending: pendingCount, lastDate: last ? last.created_at : null,
      avgApprovalHours: avgApproval, approvalRate: approvalRate, feesTotal: feesTotal
    };
  }

  function renderStats(stats) {
    var setText = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    setText('statTotalDeposits', fmtMoney(stats.total));
    setText('statDepositCount', stats.count);
    setText('statMonthTotal', fmtMoney(stats.monthTotal));
    setText('statYearTotal', fmtMoney(stats.yearTotal));
    setText('statPending', stats.pending);
    setText('statLastDeposit', stats.lastDate ? fmtDate(stats.lastDate) : '--');
    setText('statAvgApproval', stats.avgApprovalHours ? (Math.round(stats.avgApprovalHours) + ' ساعة') : '--');
    setText('statApprovalRate', stats.approvalRate + '%');
    setText('statTotalFees', fmtMoney(stats.feesTotal));
  }

  function renderTable() {
    var tbody = document.getElementById('depositTableBody');
    if (!tbody) return;
    var start = (currentPage - 1) * pageSize;
    var pageItems = filteredDeposits.slice(start, start + pageSize);
    if (!pageItems.length) {
      tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:30px;color:#9ca3af">لا توجد عمليات إيداع مطابقة</td></tr>';
    } else {
      tbody.innerHTML = pageItems.map(function (d) {
        return '<tr>' +
          '<td>' + (d.id ? d.id.substring(0, 8) : '--') + '</td>' +
          '<td>' + (d.request_number || '--') + '</td>' +
          '<td>' + (d.method === 'bank_transfer' ? 'تحويل بنكي' : 'بوابة دفع') + '</td>' +
          '<td>' + fmtMoney(d.amount) + '</td>' +
          '<td>' + fmtMoney(d.fee_amount) + '</td>' +
          '<td>' + fmtMoney(d.vat_amount) + '</td>' +
          '<td>' + fmtMoney(d.total_amount || d.amount) + '</td>' +
          '<td>' + fmtDate(d.created_at) + '</td>' +
          '<td>' + fmtDate(d.approved_at) + '</td>' +
          '<td>' + statusBadge(d.status) + '</td>' +
          '<td>' + (d.reference_number || '--') + '</td>' +
          '<td><button class="btn-secondary btn-view-deposit" data-id="' + d.id + '"><i class="fas fa-eye"></i></button></td>' +
          '</tr>';
      }).join('');
    }
    renderPagination();
  }

  function renderPagination() {
    var wrap = document.getElementById('depositPagination');
    if (!wrap) return;
    var totalPages = Math.max(1, Math.ceil(filteredDeposits.length / pageSize));
    var html = '';
    for (var i = 1; i <= totalPages; i++) {
      html += '<button class="btn-secondary page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    wrap.innerHTML = html;
    wrap.querySelectorAll('.page-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { currentPage = Number(btn.dataset.page); renderTable(); });
    });
  }

  function applyFilters() {
    var q = (document.getElementById('filterSearch') || {}).value || '';
    var status = (document.getElementById('filterStatus') || {}).value || '';
    var method = (document.getElementById('filterMethod') || {}).value || '';
    var from = (document.getElementById('filterFrom') || {}).value || '';
    var to = (document.getElementById('filterTo') || {}).value || '';
    filteredDeposits = allDeposits.filter(function (d) {
      if (status && d.status !== status) return false;
      if (method && d.method !== method) return false;
      if (from && new Date(d.created_at) < new Date(from)) return false;
      if (to && new Date(d.created_at) > new Date(to + 'T23:59:59')) return false;
      if (q) {
        var s = (d.request_number || '') + ' ' + (d.reference_number || '');
        if (s.indexOf(q) === -1) return false;
      }
      return true;
    });
    currentPage = 1;
    renderTable();
  }

  function calcGatewayFees(amount) {
    amount = Number(amount || 0);
    var serviceFeeRate = 0.03;
    var vatRate = 0.15;
    var serviceFee = amount * serviceFeeRate;
    var vat = serviceFee * vatRate;
    var totalFees = amount * 0.05;
    var grandTotal = amount + totalFees;
    return { amount: amount, serviceFee: serviceFee, vat: vat, totalFees: totalFees, grandTotal: grandTotal };
  }

  function renderGatewayBreakdown() {
    var amountEl = document.getElementById('gwAmount');
    var amount = amountEl ? Number(amountEl.value || 0) : 0;
    var calc = calcGatewayFees(amount);
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = fmtMoney(val); };
    set('gwBaseAmount', calc.amount);
    set('gwServiceFee', calc.serviceFee);
    set('gwVat', calc.vat);
    set('gwTotalFees', calc.totalFees);
    set('gwGrandTotal', calc.grandTotal);
  }

  async function logActivity(action, details, description) {
    try {
      var client = await getClient();
      if (!client || !currentUser) return;
      await client.from('activity_log').insert({
        user_id: currentUser.id,
        event_type: action,
        description: description || action,
        metadata: details || {},
        created_at: new Date().toISOString()
      });
    } catch (e) { console.warn('activity log failed', e); }
  }

  async function createNotification(title, body, category) {
    try {
      var client = await getClient();
      if (!client || !currentUser) return;
      var { data, error } = await client.from('notifications').insert({
        user_id: currentUser.id,
        title: title,
        body: body,
        type: 'deposit',
        category: category || 'deposit',
        priority: 'normal',
        status: 'unread',
        is_read: false,
        created_at: new Date().toISOString()
      }).select().single();
      if (!error && data) {
        try {
          var sessionRes = await client.auth.getSession();
          var token = sessionRes.data.session ? sessionRes.data.session.access_token : null;
          await fetch('https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/notify-dispatch', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: data.id })
          });
        } catch (e2) { console.warn('notify-dispatch failed', e2); }
      }
    } catch (e) { console.warn('createNotification failed', e); }
  }

  async function uploadReceipt(file, depositId) {
    var client = await getClient();
    if (!client || !file) return null;
    var path = currentUser.id + '/deposits/' + depositId + '_' + Date.now() + '_' + file.name;
    var { data, error } = await client.storage.from('attachments').upload(path, file);
    if (error) { console.error('upload error', error); return null; }
    return path;
  }

  async function submitBankDeposit(e) {
    e.preventDefault();
    var btn = document.getElementById('btnSubmitBankDeposit');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارِ الإرسال...'; }
    try {
      var client = await getClient();
      var amount = Number(document.getElementById('bdAmount').value || 0);
      var fromBank = document.getElementById('bdFromBank').value;
      var date = document.getElementById('bdDate').value;
      var time = document.getElementById('bdTime').value;
      var ref = document.getElementById('bdRef').value;
      var notes = document.getElementById('bdNotes').value;
      var fileInput = document.getElementById('bdReceipt');
      var file = fileInput && fileInput.files ? fileInput.files[0] : null;

      var { data: deposit, error } = await client.from('deposit_requests').insert({
        user_id: currentUser.id,
        method: 'bank_transfer',
        amount: amount,
        fee_amount: 0,
        vat_amount: 0,
        total_amount: amount,
        status: 'pending_receipt',
        bank_name: fromBank,
        request_number: 'DEP-' + Date.now(),
        transfer_date: date,
        transfer_time: time || null,
        reference_number: ref || null,
        notes: notes || null,
        created_at: new Date().toISOString()
      }).select().single();

      if (error) throw error;

      if (file) {
        var path = await uploadReceipt(file, deposit.id);
        if (path) {
          await client.from('deposit_requests').update({ receipt_url: path, status: 'pending_review' }).eq('id', deposit.id);
        }
      }

      await client.from('deposit_status_history').insert({
        deposit_id: deposit.id,
        status: 'pending_receipt',
        note: 'تم إنشاء طلب الإيداع',
        created_at: new Date().toISOString()
      });

      await logActivity('deposit_request_created', { deposit_id: deposit.id, amount: amount, method: 'bank_transfer' }, 'تم إنشاء طلب إيداع بنكي بمبلغ ' + fmtMoney(amount));
      await createNotification('تم استلام طلب الإيداع', 'تم استلام طلب إيداعك بمبلغ ' + fmtMoney(amount) + ' وسيتم مراجعته قريباً.', 'deposit');

      alert('تم إرسال طلب الإيداع بنجاح، سيتم مراجعته واعتماده خلال يوم عمل واحد.');
      document.getElementById('bankDepositForm').reset();
      await refreshData();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال طلب الإيداع، يرجى المحاولة مرة أخرى.');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال طلب الإيداع'; }
    }
  }

  function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(function () {
      if (btn) {
        var original = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i> تم النسخ';
        setTimeout(function () { btn.classList.remove('copied'); btn.innerHTML = original; }, 1800);
      }
    });
  }

  function openDetailModal(deposit) {
    var modal = document.getElementById('depositDetailModal');
    var info = document.getElementById('depositDetailInfo');
    var timeline = document.getElementById('depositDetailTimeline');
    if (!modal || !info || !timeline) return;
    info.innerHTML =
      '<div class="detail-row"><span class="label">رقم الطلب</span><span class="value">' + (deposit.request_number || deposit.id.substring(0, 8)) + '</span></div>' +
      '<div class="detail-row"><span class="label">الطريقة</span><span class="value">' + (deposit.method === 'bank_transfer' ? 'تحويل بنكي' : 'بوابة دفع') + '</span></div>' +
      '<div class="detail-row"><span class="label">المبلغ</span><span class="value">' + fmtMoney(deposit.amount) + '</span></div>' +
      '<div class="detail-row"><span class="label">الحالة</span><span class="value">' + statusBadge(deposit.status) + '</span></div>' +
      '<div class="detail-row"><span class="label">تاريخ الإنشاء</span><span class="value">' + fmtDate(deposit.created_at) + '</span></div>';
    timeline.innerHTML = '<div class="t-item"><div class="t-title">تم إنشاء الطلب</div><div class="t-meta">' + fmtDate(deposit.created_at) + '</div></div>';
    modal.classList.add('active');
    getClient().then(function (client) {
      client.from('deposit_status_history').select('*').eq('deposit_id', deposit.id).order('created_at', { ascending: true }).then(function (res) {
        var rows = res.data || [];
        if (rows.length) {
          timeline.innerHTML = rows.map(function (r) {
            return '<div class="t-item"><div class="t-title">' + (STATUS_LABELS[r.status] || r.status) + '</div><div class="t-meta">' + fmtDate(r.created_at) + '</div>' + (r.note ? '<div class="t-note">' + r.note + '</div>' : '') + '</div>';
          }).join('');
        }
      });
    });
  }

  async function refreshData() {
    allDeposits = await fetchDeposits();
    filteredDeposits = allDeposits.slice();
    renderStats(computeStats(allDeposits));
    renderTable();
  }

  function bindEvents() {
    document.querySelectorAll('.copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-copy-target');
        var el = document.getElementById(targetId);
        if (el) copyToClipboard(el.textContent, btn);
      });
    });

    var qrBtn = document.getElementById('btnShowQr');
    if (qrBtn) qrBtn.addEventListener('click', function () {
      var box = document.getElementById('bankQrBox');
      if (box) box.style.display = box.style.display === 'none' ? 'flex' : 'none';
    });

    var shareBtn = document.getElementById('btnShareBankInfo');
    if (shareBtn) shareBtn.addEventListener('click', function () {
      var text = 'اسم البنك: ' + BANK_INFO.bankName + '\nاسم الحساب: ' + BANK_INFO.accountName + '\nرقم الحساب: ' + BANK_INFO.accountNumber + '\nIBAN: ' + BANK_INFO.iban;
      if (navigator.share) { navigator.share({ text: text }).catch(function () {}); }
      else { copyToClipboard(text, shareBtn); }
    });

    var bankForm = document.getElementById('bankDepositForm');
    if (bankForm) bankForm.addEventListener('submit', submitBankDeposit);

    var gwAmount = document.getElementById('gwAmount');
    if (gwAmount) gwAmount.addEventListener('input', renderGatewayBreakdown);

    var gwBtn = document.getElementById('btnGoToGateway');
    if (gwBtn) gwBtn.addEventListener('click', function () {
      alert('بوابة الدفع الإلكتروني قيد التفعيل من قبل الشركة حالياً، سيتم إشعارك فور تفعيلها.');
    });

    ['filterSearch', 'filterStatus', 'filterMethod', 'filterFrom', 'filterTo'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', applyFilters);
    });

    document.addEventListener('click', function (e) {
      var viewBtn = e.target.closest('.btn-view-deposit');
      if (viewBtn) {
        var id = viewBtn.getAttribute('data-id');
        var deposit = allDeposits.find(function (d) { return d.id === id; });
        if (deposit) openDetailModal(deposit);
      }
    });

    var closeModal = document.getElementById('closeDepositModal');
    if (closeModal) closeModal.addEventListener('click', function () {
      document.getElementById('depositDetailModal').classList.remove('active');
    });

    var printBtn = document.getElementById('btnPrintTable');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  }

  async function init() {
    currentUser = await loadCurrentUser();
    if (!currentUser) return;
    bindEvents();
    await refreshData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
