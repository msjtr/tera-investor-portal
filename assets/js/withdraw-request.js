/**
 * withdraw-request.js - تقديم ومتابعة طلبات السحب
 */
(function() {
'use strict';

const NOTIFY_DISPATCH_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/notify-dispatch';

let supabase = null;
let updateActivityInterval = null;

async function getSupabase() {
  if (supabase) return supabase;
  try {
    if (window.Support && window.Support.getSupabase) supabase = await window.Support.getSupabase();
    else if (window.teraSupabase) supabase = window.teraSupabase;
    else if (window.waitForSupabase) supabase = await window.waitForSupabase();
    return supabase;
  } catch (e) { console.warn('Supabase غير جاهز:', e); return null; }
}

function fmtMoney(v) { return (Number(v) || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 }) + ' ر.س'; }
function fmtDate(iso) { if (!iso) return '-'; return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); }
function fmtDateShort(iso) { if (!iso) return '-'; return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
function fmtDateTime(iso) { if (!iso) return '-'; return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return Math.floor(diff / 60) + ' دقيقة';
  if (diff < 86400) return Math.floor(diff / 3600) + ' ساعة';
  if (diff < 604800) return Math.floor(diff / 86400) + ' يوم';
  return fmtDate(iso);
}
function daysRemaining(endIso) {
  if (!endIso) return null;
  const diff = Math.ceil((new Date(endIso).getTime() - Date.now()) / (1000*60*60*24));
  return diff;
}
const STATUS_LABELS = {
  active: 'نشط', completed: 'مكتمل', cancelled: 'ملغى', extended: 'ممدد',
  pending: 'قيد الإنشاء', under_review: 'قيد المراجعة', approved: 'تمت الموافقة',
  transferring: 'جاري التحويل', rejected: 'مرفوض', scheduled: 'مجدول', paid: 'مدفوع'
};
function statusBadge(status) {
  const label = STATUS_LABELS[status] || status || '-';
  return '<span class="status-badge status-' + (status||'pending') + '">' + label + '</span>';
}

async function initPageAuthAndHeader() {
  if (!window.Auth || typeof window.Auth.requireAuth !== 'function') {
    window.location.replace('/auth/auth/login/login.html');
    return null;
  }
  const user = await window.Auth.requireAuth();
  if (!user) return null;
  supabase = await getSupabase();
  if (!supabase) return null;

  const storedName = sessionStorage.getItem('otpName');
  const displayName = storedName || (user.user_metadata && user.user_metadata.full_name) || user.email || 'مستخدم';
  const nameEl = document.getElementById('headerUserName');
  const avatarEl = document.getElementById('headerAvatar');
  if (nameEl) nameEl.textContent = displayName;
  if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

  if (window.ActivityTracker) {
    try {
      window.ActivityTracker.startIdleTimer(async function() { if (window.Auth && window.Auth.logout) await window.Auth.logout(); }, user.id);
      await window.ActivityTracker.updateLastActivity(user.id);
      updateActivityInterval = setInterval(async function() { try { await window.ActivityTracker.updateLastActivity(user.id); } catch (e) {} }, 60000);
    } catch (e) {}
  }
  return user;
}

// يرسل إشعار Push + بريد إلكتروني فوراً عبر notify-dispatch باستخدام توكن جلسة
// المستخدم نفسه (self-only) - لا حاجة لأي مفتاح سري على العميل.
async function dispatchNotification(notificationId) {
  if (!notificationId) return;
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData && sessionData.session && sessionData.session.access_token;
    if (!token) return;
    await fetch(NOTIFY_DISPATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ notificationId: notificationId })
    });
  } catch (e) { console.warn('[withdraw-request] dispatchNotification failed', e); }
}

async function logActivityAndNotify(user, opts) {
  try {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.from('activity_log').insert({
      user_id: user.id,
      event_type: opts.eventType,
      event_category: opts.eventCategory || 'general',
      description: opts.description,
      actor: 'user',
      status: opts.status || 'completed',
      related_id: opts.relatedId || null,
      related_type: opts.relatedType || null,
      metadata: opts.metadata || null
    });
  } catch (e) { console.warn('activity_log insert failed', e); }
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const { data: notif, error } = await sb.from('notifications').insert({
      user_id: user.id,
      title: opts.notifTitle || opts.description,
      body: opts.notifBody || opts.description,
      type: opts.notifType || 'general',
      priority: opts.notifPriority || 'medium',
      status: 'unread',
      action_url: opts.actionUrl || null,
      sender: 'system'
    }).select().maybeSingle();
    if (!error && notif && notif.id) {
      dispatchNotification(notif.id);
    }
  } catch (e) { console.warn('notifications insert failed', e); }
}

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('active');
}

window.addEventListener('beforeunload', function() { if (updateActivityInterval) clearInterval(updateActivityInterval); });

let __availableBalance = 0;

function ibanValid(iban) {
  const clean = (iban || '').replace(/\s/g, '').toUpperCase();
  return /^SA[0-9]{22}$/.test(clean);
}

function generateReference() {
  const now = new Date();
  return 'WD-' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + Math.floor(Math.random()*9000+1000);
}

function buildTimeline(req) {
  const stages = [
    { key: 'pending', label: 'تم إنشاء الطلب', icon: 'fa-file-alt' },
    { key: 'under_review', label: 'جاري المراجعة', icon: 'fa-search' },
    { key: 'approved', label: 'تمت الموافقة', icon: 'fa-check' },
    { key: 'transferring', label: 'جاري التحويل', icon: 'fa-exchange-alt' },
    { key: 'completed', label: 'مكتمل', icon: 'fa-check-double' }
  ];
  if (req.status === 'rejected') {
    let html = '<div class="timeline-track">';
    html += '<div class="timeline-step done"><div class="timeline-dot"><i class="fas fa-file-alt"></i></div><div class="timeline-label">تم إنشاء الطلب</div></div>';
    html += '<div class="timeline-step done"><div class="timeline-dot"><i class="fas fa-search"></i></div><div class="timeline-label">جاري المراجعة</div></div>';
    html += '<div class="timeline-step rejected"><div class="timeline-dot"><i class="fas fa-times"></i></div><div class="timeline-label">مرفوض</div></div>';
    html += '</div>';
    if (req.rejection_reason) {
      html += '<div class="form-error" style="display:block;margin-top:8px;"><i class="fas fa-exclamation-circle"></i> سبب الرفض: ' + req.rejection_reason + '</div>';
    }
    return html;
  }
  const idx = stages.findIndex(function(s){ return s.key === req.status; });
  let html = '<div class="timeline-track">';
  stages.forEach(function(s, i) {
    let cls = '';
    if (i < idx) cls = 'done';
    else if (i === idx) cls = 'current';
    html += '<div class="timeline-step ' + cls + '"><div class="timeline-dot"><i class="fas ' + s.icon + '"></i></div><div class="timeline-label">' + s.label + '</div></div>';
  });
  html += '</div>';
  return html;
}

function renderRequests(list) {
  const container = document.getElementById('requestsContainer');
  const empty = document.getElementById('requestsEmpty');
  if (!list || !list.length) { container.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  container.innerHTML = list.map(function(r) {
    return '<div class="contract-card">' +
      '<div class="contract-card-top"><div class="contract-card-title"><i class="fas fa-receipt" style="color:var(--primary);margin-left:8px;"></i>' + (r.reference_number || ('#' + r.id)) + '</div>' + statusBadge(r.status) + '</div>' +
      '<div class="contract-card-grid" style="margin-bottom:16px;">' +
      '<div><div class="contract-metric-label">المبلغ</div><div class="contract-metric-value">' + fmtMoney(r.amount) + '</div></div>' +
      '<div><div class="contract-metric-label">البنك</div><div class="contract-metric-value" style="font-size:13px;">' + (r.bank_name||'-') + '</div></div>' +
      '<div><div class="contract-metric-label">تاريخ الطلب</div><div class="contract-metric-value" style="font-size:13px;">' + fmtDateShort(r.requested_at || r.created_at) + '</div></div>' +
      '</div>' +
      buildTimeline(r) +
      '</div>';
  }).join('');
}

async function loadBalance(user) {
  try {
    const { data, error } = await supabase.from('user_portfolio').select('available_balance').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    __availableBalance = Number((data && data.available_balance) || 0);
    document.getElementById('statAvailableBalance').textContent = fmtMoney(__availableBalance);
  } catch (e) { console.warn('balance load error', e); }
}

async function loadRequests(user) {
  try {
    const { data, error } = await supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    const list = data || [];
    const pendingCount = list.filter(function(r){ return ['pending','under_review','approved','transferring'].indexOf(r.status) !== -1; }).length;
    document.getElementById('statPendingCount').textContent = pendingCount + ' طلب';
    renderRequests(list);
  } catch (e) { console.warn('requests load error', e); renderRequests([]); }
}

async function handleSubmit(e, user) {
  e.preventDefault();
  const amountEl = document.getElementById('amountInput');
  const bankEl = document.getElementById('bankInput');
  const ibanEl = document.getElementById('ibanInput');
  const notesEl = document.getElementById('notesInput');
  const amountError = document.getElementById('amountError');
  const ibanError = document.getElementById('ibanError');
  const submitBtn = document.getElementById('submitWithdrawBtn');

  const amount = parseFloat(amountEl.value);
  const bank = bankEl.value.trim();
  const iban = ibanEl.value.trim().toUpperCase();
  const notes = notesEl.value.trim();

  let valid = true;
  if (!amount || amount <= 0 || amount > __availableBalance) { amountError.style.display = 'block'; valid = false; } else { amountError.style.display = 'none'; }
  if (!ibanValid(iban)) { ibanError.style.display = 'block'; valid = false; } else { ibanError.style.display = 'none'; }
  if (!bank) { valid = false; }
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
  try {
    const reference = generateReference();
    const { data, error } = await supabase.from('withdrawal_requests').insert({
      user_id: user.id,
      amount: amount,
      bank_name: bank,
      iban: iban,
      notes: notes || null,
      status: 'pending',
      reference_number: reference,
      requested_at: new Date().toISOString()
    }).select().maybeSingle();
    if (error) throw error;

    await logActivityAndNotify(user, {
      eventType: 'withdrawal_request_created',
      eventCategory: 'financial',
      description: 'تم إنشاء طلب سحب بمبلغ ' + fmtMoney(amount) + ' برقم مرجعي ' + reference,
      status: 'completed',
      relatedId: data ? data.id : null,
      relatedType: 'withdrawal_request',
      notifTitle: 'تم استلام طلب السحب',
      notifBody: 'تم استلام طلب سحبك بمبلغ ' + fmtMoney(amount) + ' وهو الآن قيد المراجعة. الرقم المرجعي: ' + reference,
      notifType: 'financial',
      notifPriority: 'medium',
      actionUrl: '/pages/portfolio/withdraw-request.html'
    });

    document.getElementById('withdrawForm').reset();
    await Promise.all([loadBalance(user), loadRequests(user)]);
    alert('تم تقديم طلب السحب بنجاح. الرقم المرجعي: ' + reference);
  } catch (err) {
    console.error('withdraw submit error', err);
    alert('حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> تقديم الطلب';
  }
}

async function init() {
  const user = await initPageAuthAndHeader();
  if (!user) return;
  await Promise.all([loadBalance(user), loadRequests(user)]);
  document.getElementById('withdrawForm').addEventListener('submit', function(e){ handleSubmit(e, user); });
  hideLoading();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
