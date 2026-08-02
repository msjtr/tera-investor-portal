/**
 * account-statement.js - كشف الحساب الموثق
 */
(function() {
'use strict';

let supabase = null;
let allTx = [];

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

  const stmtNameEl = document.getElementById('stmtUserName');
  if (stmtNameEl) stmtNameEl.textContent = displayName;
  const stmtIssueEl = document.getElementById('stmtIssueDate');
  if (stmtIssueEl) stmtIssueEl.textContent = fmtDate(new Date().toISOString());

  if (window.ActivityTracker) {
    try {
      window.ActivityTracker.startIdleTimer(async function() { if (window.Auth && window.Auth.logout) await window.Auth.logout(); }, user.id);
      await window.ActivityTracker.updateLastActivity(user.id);
    } catch (e) {}
  }
  return user;
}

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('active');
}

function getFilters() {
  return {
    search: (document.getElementById('searchInput').value || '').trim().toLowerCase(),
    from: document.getElementById('fromDate').value,
    to: document.getElementById('toDate').value
  };
}

// يبني قائمة مرتبة تصاعدياً مع رصيد تراكمي بعد كل عملية،
// ثم يطبق التصفية، ثم يعرضها تنازلياً (الأحدث أولاً) كما في كشف حساب البنك.
function buildLedger(list) {
  const asc = list.slice().sort(function(a, b) { return new Date(a.created_at) - new Date(b.created_at); });
  let running = 0;
  const withBalance = asc.map(function(tx) {
    running += Number(tx.amount) || 0;
    return Object.assign({}, tx, { runningBalance: running });
  });
  return withBalance;
}

function applyFiltersAndRender() {
  const f = getFilters();
  const ledger = buildLedger(allTx);
  let list = ledger.slice();

  if (f.search) list = list.filter(function(tx) { return (tx.description || '').toLowerCase().indexOf(f.search) !== -1; });
  if (f.from) { const fromTs = new Date(f.from).getTime(); list = list.filter(function(tx) { return new Date(tx.created_at).getTime() >= fromTs; }); }
  if (f.to) { const toTs = new Date(f.to).getTime() + 86400000; list = list.filter(function(tx) { return new Date(tx.created_at).getTime() <= toTs; }); }

  const closing = ledger.length ? ledger[ledger.length - 1].runningBalance : 0;
  document.getElementById('stmtClosingBalance').textContent = fmtMoney(closing);

  renderTable(list.slice().reverse());
}

function renderTable(list) {
  const tbody = document.getElementById('stmtTableBody');
  const empty = document.getElementById('stmtEmpty');
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(function(tx) {
    const amt = Number(tx.amount) || 0;
    const debit = amt < 0 ? fmtMoney(Math.abs(amt)) : '-';
    const credit = amt >= 0 ? fmtMoney(amt) : '-';
    return '<tr>' +
      '<td>' + fmtDate(tx.created_at) + '</td>' +
      '<td class="text-title">' + (tx.description || '-') + '</td>' +
      '<td class="amount-cell" style="color:#dc2626;">' + debit + '</td>' +
      '<td class="amount-cell" style="color:#10b981;">' + credit + '</td>' +
      '<td class="amount-cell">' + fmtMoney(tx.runningBalance) + '</td>' +
      '</tr>';
  }).join('');
}

function exportCsv() {
  const f = getFilters();
  const ledger = buildLedger(allTx);
  let list = ledger.slice();
  if (f.search) list = list.filter(function(tx) { return (tx.description || '').toLowerCase().indexOf(f.search) !== -1; });
  if (f.from) { const fromTs = new Date(f.from).getTime(); list = list.filter(function(tx) { return new Date(tx.created_at).getTime() >= fromTs; }); }
  if (f.to) { const toTs = new Date(f.to).getTime() + 86400000; list = list.filter(function(tx) { return new Date(tx.created_at).getTime() <= toTs; }); }

  let csv = '﻿التاريخ,الوصف,مدين,دائن,الرصيد بعد العملية\n';
  list.forEach(function(tx) {
    const amt = Number(tx.amount) || 0;
    const debit = amt < 0 ? Math.abs(amt) : '';
    const credit = amt >= 0 ? amt : '';
    const desc = '"' + String(tx.description || '').replace(/"/g, '""') + '"';
    csv += fmtDate(tx.created_at) + ',' + desc + ',' + debit + ',' + credit + ',' + tx.runningBalance + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'account-statement-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function loadTransactions(user) {
  try {
    const { data, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    if (error) throw error;
    allTx = data || [];
    applyFiltersAndRender();
  } catch (e) {
    console.warn('account-statement load error', e);
    allTx = [];
    applyFiltersAndRender();
  }
}

async function init() {
  const user = await initPageAuthAndHeader();
  if (!user) return;
  await loadTransactions(user);

  document.getElementById('applyFiltersBtn').addEventListener('click', applyFiltersAndRender);
  document.getElementById('searchInput').addEventListener('keyup', function(e) { if (e.key === 'Enter') applyFiltersAndRender(); });
  document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
  document.getElementById('printBtn').addEventListener('click', function() { window.print(); });

  hideLoading();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
