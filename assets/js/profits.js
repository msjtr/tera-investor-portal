/**
 * profits.js - صفحة الأرباح الدورية (متوقعة / قادمة للصرف / سابقة)
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

let __allPayouts = [];
const NL = String.fromCharCode(10);
const BOM = String.fromCharCode(0xFEFF);

function renderExpected(contracts) {
  const container = document.getElementById('expectedContainer');
  const empty = document.getElementById('expectedEmpty');
  const active = contracts.filter(function(c){ return c.status === 'active'; });
  if (!active.length) { container.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  container.innerHTML = active.map(function(c) {
    const dr = daysRemaining(c.end_date);
    const monthsLeft = dr && dr > 0 ? Math.max(1, Math.ceil(dr/30)) : 1;
    const monthlyEstimate = Number(c.expected_profit || 0) / monthsLeft;
    return '<div class="contract-card">' +
      '<div class="contract-card-top"><div class="contract-card-title"><i class="fas fa-chart-line" style="color:var(--primary);margin-left:8px;"></i>' + (c.title || 'استثمار') + '</div>' + statusBadge(c.status) + '</div>' +
      '<div class="contract-card-grid">' +
        '<div><div class="contract-metric-label">إجمالي الأرباح المتوقعة</div><div class="contract-metric-value">' + fmtMoney(c.expected_profit) + '</div></div>' +
        '<div><div class="contract-metric-label">تقدير شهري</div><div class="contract-metric-value">' + fmtMoney(monthlyEstimate) + '</div></div>' +
        '<div><div class="contract-metric-label">العائد السنوي</div><div class="contract-metric-value">' + (c.annual_return != null ? c.annual_return + '%' : '-') + '</div></div>' +
        '<div><div class="contract-metric-label">تاريخ الاستحقاق</div><div class="contract-metric-value" style="font-size:13px;">' + fmtDateShort(c.end_date) + '</div></div>' +
      '</div></div>';
  }).join('');
}

function renderUpcoming(payouts) {
  const container = document.getElementById('upcomingContainer');
  const empty = document.getElementById('upcomingEmpty');
  const upcoming = payouts.filter(function(p){ return p.status === 'scheduled'; }).sort(function(a,b){ return new Date(a.payout_date) - new Date(b.payout_date); });
  if (!upcoming.length) { container.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  container.innerHTML = upcoming.map(function(p) {
    const dr = daysRemaining(p.payout_date);
    const drText = dr === null ? '-' : (dr < 0 ? 'مستحق الآن' : dr + ' يوم متبقي');
    return '<div class="contract-card">' +
      '<div class="contract-card-top"><div class="contract-card-title"><i class="fas fa-calendar-check" style="color:var(--primary);margin-left:8px;"></i>' + (p.period_label || 'دفعة أرباح') + '</div>' + statusBadge(p.status) + '</div>' +
      '<div class="contract-card-grid">' +
        '<div><div class="contract-metric-label">المبلغ</div><div class="contract-metric-value">' + fmtMoney(p.amount) + '</div></div>' +
        '<div><div class="contract-metric-label">تاريخ الصرف</div><div class="contract-metric-value" style="font-size:13px;">' + fmtDateShort(p.payout_date) + '</div></div>' +
        '<div><div class="contract-metric-label">العد التنازلي</div><div class="contract-metric-value" style="font-size:13px;">' + drText + '</div></div>' +
      '</div></div>';
  }).join('');
}

function renderHistory() {
  const tbody = document.getElementById('historyTableBody');
  const q = (document.getElementById('historySearchInput').value || '').trim().toLowerCase();
  const fromV = document.getElementById('historyFromDate').value;
  const toV = document.getElementById('historyToDate').value;
  let list = __allPayouts.filter(function(p){ return p.status === 'paid'; });
  if (q) list = list.filter(function(p){ return (p.period_label||'').toLowerCase().indexOf(q) !== -1; });
  if (fromV) list = list.filter(function(p){ return new Date(p.payout_date) >= new Date(fromV); });
  if (toV) list = list.filter(function(p){ return new Date(p.payout_date) <= new Date(toV); });
  list = list.sort(function(a,b){ return new Date(b.payout_date) - new Date(a.payout_date); });
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">لا توجد أرباح سابقة مطابقة</td></tr>'; return; }
  tbody.innerHTML = list.map(function(p) {
    return '<tr><td class="text-title">' + (p.period_label || '-') + '</td><td class="amount-cell">' + fmtMoney(p.amount) + '</td><td>' + fmtDateShort(p.payout_date) + '</td><td>' + statusBadge(p.status) + '</td></tr>';
  }).join('');
}

function exportHistoryCsv() {
  const rows = __allPayouts.filter(function(p){ return p.status === 'paid'; });
  const lines = [BOM + 'الفترة,المبلغ,تاريخ الصرف,الحالة'];
  rows.forEach(function(p) {
    lines.push('"' + (p.period_label||'') + '","' + (p.amount||0) + '","' + fmtDateShort(p.payout_date) + '","' + (STATUS_LABELS[p.status]||p.status) + '"');
  });
  const csv = lines.join(NL);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'الأرباح-السابقة.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      ['expected','upcoming','history'].forEach(function(t) {
        const panel = document.getElementById('tabPanel-' + t);
        if (panel) panel.style.display = (t === tab) ? 'block' : 'none';
      });
    });
  });
}

async function loadProfitsData(user) {
  try {
    const { data: contracts, error: cErr } = await supabase.from('investment_contracts').select('*').eq('user_id', user.id);
    if (cErr) throw cErr;
    const activeContracts = (contracts || []);
    const expectedTotal = activeContracts.filter(function(c){ return c.status==='active'; }).reduce(function(s,c){ return s + Number(c.expected_profit||0); }, 0);
    document.getElementById('statExpectedTotal').textContent = fmtMoney(expectedTotal);
    renderExpected(activeContracts);
  } catch (e) { console.warn('contracts load error', e); }

  try {
    const { data: payouts, error: pErr } = await supabase.from('profit_payouts').select('*').eq('user_id', user.id);
    if (pErr) throw pErr;
    __allPayouts = payouts || [];
    const upcomingTotal = __allPayouts.filter(function(p){ return p.status==='scheduled'; }).reduce(function(s,p){ return s + Number(p.amount||0); }, 0);
    const paidTotal = __allPayouts.filter(function(p){ return p.status==='paid'; }).reduce(function(s,p){ return s + Number(p.amount||0); }, 0);
    document.getElementById('statUpcomingTotal').textContent = fmtMoney(upcomingTotal);
    document.getElementById('statPaidTotal').textContent = fmtMoney(paidTotal);
    renderUpcoming(__allPayouts);
    renderHistory();
  } catch (e) { console.warn('payouts load error', e); }
}

async function init() {
  const user = await initPageAuthAndHeader();
  if (!user) return;
  setupTabs();
  document.getElementById('historySearchInput').addEventListener('input', renderHistory);
  document.getElementById('historyFromDate').addEventListener('change', renderHistory);
  document.getElementById('historyToDate').addEventListener('change', renderHistory);
  document.getElementById('exportCsvBtn').addEventListener('click', exportHistoryCsv);
  document.getElementById('printBtn').addEventListener('click', function(){ window.print(); });
  await loadProfitsData(user);
  hideLoading();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
/**
 * profits.js - صفحة الأرباح الدورية (متوقعة / قادمة للصرف / سابقة)
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

let __allPayouts = [];

function renderExpected(contracts) {
  const container = document.getElementById('expectedContainer');
  const empty = document.getElementById('expectedEmpty');
  const active = contracts.filter(function(c){ return c.status === 'active'; });
  if (!active.length) { container.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  container.innerHTML = active.map(function(c) {
    const dr = daysRemaining(c.end_date);
    const monthsLeft = dr && dr > 0 ? Math.max(1, Math.ceil(dr/30)) : 1;
    const monthlyEstimate = Number(c.expected_profit || 0) / monthsLeft;
    return '<div class="contract-card">' +
      '<div class="contract-card-top"><div class="contract-card-title"><i class="fas fa-chart-line" style="color:var(--primary);margin-left:8px;"></i>' + (c.title || 'استثمار') + '</div>' + statusBadge(c.status) + '</div>' +
      '<div class="contract-card-grid">' +
        '<div><div class="contract-metric-label">إجمالي الأرباح المتوقعة</div><div class="contract-metric-value">' + fmtMoney(c.expected_profit) + '</div></div>' +
        '<div><div class="contract-metric-label">تقدير شهري</div><div class="contract-metric-value">' + fmtMoney(monthlyEstimate) + '</div></div>' +
        '<div><div class="contract-metric-label">العائد السنوي</div><div class="contract-metric-value">' + (c.annual_return != null ? c.annual_return + '%' : '-') + '</div></div>' +
        '<div><div class="contract-metric-label">تاريخ الاستحقاق</div><div class="contract-metric-value" style="font-size:13px;">' + fmtDateShort(c.end_date) + '</div></div>' +
      '</div></div>';
  }).join('');
}

function renderUpcoming(payouts) {
  const container = document.getElementById('upcomingContainer');
  const empty = document.getElementById('upcomingEmpty');
  const upcoming = payouts.filter(function(p){ return p.status === 'scheduled'; }).sort(function(a,b){ return new Date(a.payout_date) - new Date(b.payout_date); });
  if (!upcoming.length) { container.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  container.innerHTML = upcoming.map(function(p) {
    const dr = daysRemaining(p.payout_date);
    const drText = dr === null ? '-' : (dr < 0 ? 'مستحق الآن' : dr + ' يوم متبقي');
    return '<div class="contract-card">' +
      '<div class="contract-card-top"><div class="contract-card-title"><i class="fas fa-calendar-check" style="color:var(--primary);margin-left:8px;"></i>' + (p.period_label || 'دفعة أرباح') + '</div>' + statusBadge(p.status) + '</div>' +
      '<div class="contract-card-grid">' +
        '<div><div class="contract-metric-label">المبلغ</div><div class="contract-metric-value">' + fmtMoney(p.amount) + '</div></div>' +
        '<div><div class="contract-metric-label">تاريخ الصرف</div><div class="contract-metric-value" style="font-size:13px;">' + fmtDateShort(p.payout_date) + '</div></div>' +
        '<div><div class="contract-metric-label">العد التنازلي</div><div class="contract-metric-value" style="font-size:13px;">' + drText + '</div></div>' +
      '</div></div>';
  }).join('');
}

function renderHistory() {
  const tbody = document.getElementById('historyTableBody');
  const q = (document.getElementById('historySearchInput').value || '').trim().toLowerCase();
  const fromV = document.getElementById('historyFromDate').value;
  const toV = document.getElementById('historyToDate').value;
  let list = __allPayouts.filter(function(p){ return p.status === 'paid'; });
  if (q) list = list.filter(function(p){ return (p.period_label||'').toLowerCase().indexOf(q) !== -1; });
  if (fromV) list = list.filter(function(p){ return new Date(p.payout_date) >= new Date(fromV); });
  if (toV) list = list.filter(function(p){ return new Date(p.payout_date) <= new Date(toV); });
  list = list.sort(function(a,b){ return new Date(b.payout_date) - new Date(a.payout_date); });
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">لا توجد أرباح سابقة مطابقة</td></tr>'; return; }
  tbody.innerHTML = list.map(function(p) {
    return '<tr><td class="text-title">' + (p.period_label || '-') + '</td><td class="amount-cell">' + fmtMoney(p.amount) + '</td><td>' + fmtDateShort(p.payout_date) + '</td><td>' + statusBadge(p.status) + '</td></tr>';
  }).join('');
}

function exportHistoryCsv() {
  const rows = __allPayouts.filter(function(p){ return p.status === 'paid'; });
  let csv = '﻿' + 'الفترة,المبلغ,تاريخ الصرف,الحالة
';
  rows.forEach(function(p) {
    csv += '"' + (p.period_label||'') + '","' + (p.amount||0) + '","' + fmtDateShort(p.payout_date) + '","' + (STATUS_LABELS[p.status]||p.status) + '"
';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'الأرباح-السابقة.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      ['expected','upcoming','history'].forEach(function(t) {
        const panel = document.getElementById('tabPanel-' + t);
        if (panel) panel.style.display = (t === tab) ? 'block' : 'none';
      });
    });
  });
}

async function loadProfitsData(user) {
  try {
    const { data: contracts, error: cErr } = await supabase.from('investment_contracts').select('*').eq('user_id', user.id);
    if (cErr) throw cErr;
    const activeContracts = (contracts || []);
    const expectedTotal = activeContracts.filter(function(c){ return c.status==='active'; }).reduce(function(s,c){ return s + Number(c.expected_profit||0); }, 0);
    document.getElementById('statExpectedTotal').textContent = fmtMoney(expectedTotal);
    renderExpected(activeContracts);
  } catch (e) { console.warn('contracts load error', e); }

  try {
    const { data: payouts, error: pErr } = await supabase.from('profit_payouts').select('*').eq('user_id', user.id);
    if (pErr) throw pErr;
    __allPayouts = payouts || [];
    const upcomingTotal = __allPayouts.filter(function(p){ return p.status==='scheduled'; }).reduce(function(s,p){ return s + Number(p.amount||0); }, 0);
    const paidTotal = __allPayouts.filter(function(p){ return p.status==='paid'; }).reduce(function(s,p){ return s + Number(p.amount||0); }, 0);
    document.getElementById('statUpcomingTotal').textContent = fmtMoney(upcomingTotal);
    document.getElementById('statPaidTotal').textContent = fmtMoney(paidTotal);
    renderUpcoming(__allPayouts);
    renderHistory();
  } catch (e) { console.warn('payouts load error', e); }
}

async function init() {
  const user = await initPageAuthAndHeader();
  if (!user) return;
  setupTabs();
  document.getElementById('historySearchInput').addEventListener('input', renderHistory);
  document.getElementById('historyFromDate').addEventListener('change', renderHistory);
  document.getElementById('historyToDate').addEventListener('change', renderHistory);
  document.getElementById('exportCsvBtn').addEventListener('click', exportHistoryCsv);
  document.getElementById('printBtn').addEventListener('click', function(){ window.print(); });
  await loadProfitsData(user);
  hideLoading();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
