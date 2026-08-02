/**
 * withdrawal-history.js - سجل طلبات السحب
 */
(function() {
'use strict';

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
    await sb.from('notifications').insert({
      user_id: user.id,
      title: opts.notifTitle || opts.description,
      body: opts.notifBody || opts.description,
      type: opts.notifType || 'general',
      priority: opts.notifPriority || 'medium',
      status: 'unread',
      action_url: opts.actionUrl || null,
      sender: 'system'
    });
  } catch (e) { console.warn('notifications insert failed', e); }
}

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('active');
}

window.addEventListener('beforeunload', function() { if (updateActivityInterval) clearInterval(updateActivityInterval); });

let __allRequests = [];
const NL = String.fromCharCode(10);
const BOM = String.fromCharCode(0xFEFF);

function maskIban(iban) {
  if (!iban) return '-';
  if (iban.length <= 8) return iban;
  return iban.substring(0,6) + '••••••' + iban.substring(iban.length-4);
}

function printReceipt(r) {
  const w = window.open('', '_blank', 'width=500,height=650');
  if (!w) return;
  w.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>إيصال سحب</title>' +
    '<style>body{font-family:Tajawal,Arial,sans-serif;padding:30px;color:#1e293b;} h2{color:#028090;} table{width:100%;border-collapse:collapse;margin-top:20px;} td{padding:10px;border-bottom:1px solid #e2e8f0;font-size:14px;} td:first-child{font-weight:700;color:#64748b;}</style>' +
    '</head><body>' +
    '<h2>إيصال طلب سحب - تيرا للاستثمار</h2>' +
    '<table>' +
    '<tr><td>رقم المرجع</td><td>' + (r.reference_number || '-') + '</td></tr>' +
    '<tr><td>المبلغ</td><td>' + fmtMoney(r.amount) + '</td></tr>' +
    '<tr><td>البنك</td><td>' + (r.bank_name || '-') + '</td></tr>' +
    '<tr><td>الآيبان</td><td>' + (r.iban || '-') + '</td></tr>' +
    '<tr><td>تاريخ الطلب</td><td>' + fmtDate(r.requested_at || r.created_at) + '</td></tr>' +
    '<tr><td>تاريخ التنفيذ</td><td>' + (r.completed_at ? fmtDate(r.completed_at) : '-') + '</td></tr>' +
    '<tr><td>الحالة</td><td>' + (STATUS_LABELS[r.status] || r.status) + '</td></tr>' +
    '</table>' +
    '<script>window.print();</' + 'script>' +
    '</body></html>');
  w.document.close();
}
window.printReceipt = printReceipt;

function renderTable(list) {
  const tbody = document.getElementById('historyTableBody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">لا توجد طلبات سحب مطابقة</td></tr>'; return; }
  tbody.innerHTML = list.map(function(r, i) {
    const execDate = r.completed_at || r.transferring_at || r.approved_at || '-';
    return '<tr><td class="text-title">' + (r.reference_number || ('#' + r.id)) + '</td><td>' + (r.bank_name||'-') + '</td><td class="mono">' + maskIban(r.iban) + '</td><td class="amount-cell">' + fmtMoney(r.amount) + '</td><td>' + (execDate !== '-' ? fmtDateShort(execDate) : '-') + '</td><td>' + statusBadge(r.status) + '</td><td><button class="btn-table-link" onclick="window.printReceipt(window.__reqData[' + i + '])"><i class="fas fa-print"></i> إيصال</button></td></tr>';
  }).join('');
  window.__reqData = list;
}

function applyFilters() {
  const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const status = document.getElementById('statusFilterSelect').value;
  let list = __allRequests;
  if (status !== 'all') list = list.filter(function(r){ return r.status === status; });
  if (q) list = list.filter(function(r){ return ((r.reference_number||'') + (r.bank_name||'')).toLowerCase().indexOf(q) !== -1; });
  renderTable(list);
}

function exportCsv() {
  const lines = [BOM + 'رقم المرجع,البنك,الآيبان,المبلغ,تاريخ الطلب,الحالة'];
  __allRequests.forEach(function(r) {
    lines.push('"' + (r.reference_number||'') + '","' + (r.bank_name||'') + '","' + (r.iban||'') + '","' + (r.amount||0) + '","' + fmtDateShort(r.requested_at||r.created_at) + '","' + (STATUS_LABELS[r.status]||r.status) + '"');
  });
  const csv = lines.join(NL);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'سجل-السحوبات.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function loadHistory(user) {
  try {
    const { data, error } = await supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    __allRequests = data || [];
    applyFilters();
  } catch (e) { console.warn('history load error', e); renderTable([]); }
}

async function init() {
  const user = await initPageAuthAndHeader();
  if (!user) return;
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('statusFilterSelect').addEventListener('change', applyFilters);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
  await loadHistory(user);
  hideLoading();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
