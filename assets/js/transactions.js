/**
 * transactions.js - سجل المعاملات المالية
 */
(function() {
'use strict';

let supabase = null;
let currentUser = null;
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

function categorize(tx) {
  const desc = (tx.description || '');
  const amount = Number(tx.amount) || 0;
  if (amount < 0) {
    if (desc.indexOf('سحب') !== -1) return { key: 'withdrawal', label: 'سحب', color: '#dc2626' };
    return { key: 'debit', label: 'خصم', color: '#dc2626' };
  }
  if (desc.indexOf('ربح') !== -1 || desc.indexOf('أرباح') !== -1) return { key: 'profit', label: 'أرباح', color: '#10b981' };
  if (desc.indexOf('استثمار') !== -1 || desc.indexOf('مشارك') !== -1) return { key: 'investment', label: 'مشاركة', color: '#2563eb' };
  return { key: 'deposit', label: 'إيداع', color: '#10b981' };
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
    type: document.getElementById('typeFilter').value,
    from: document.getElementById('fromDate').value,
    to: document.getElementById('toDate').value
  };
}

function applyFiltersAndRender() {
  const f = getFilters();
  let list = allTx.slice();

  if (f.search) {
    list = list.filter(function(tx) { return (tx.description || '').toLowerCase().indexOf(f.search) !== -1; });
  }
  if (f.type) {
    list = list.filter(function(tx) { return categorize(tx).key === f.type; });
  }
  if (f.from) {
    const fromTs = new Date(f.from).getTime();
    list = list.filter(function(tx) { return new Date(tx.created_at).getTime() >= fromTs; });
  }
  if (f.to) {
    const toTs = new Date(f.to).getTime() + 86400000;
    list = list.filter(function(tx) { return new Date(tx.created_at).getTime() <= toTs; });
  }

  renderTable(list);
  renderStats(list);
}

function renderStats(list) {
  let credits = 0, debits = 0;
  list.forEach(function(tx) {
    const amt = Number(tx.amount) || 0;
    if (amt >= 0) credits += amt; else debits += Math.abs(amt);
  });
  document.getElementById('statCredits').textContent = fmtMoney(credits);
  document.getElementById('statDebits').textContent = fmtMoney(debits);
  document.getElementById('statNet').textContent = fmtMoney(credits - debits);
  document.getElementById('statCount').textContent = String(list.length);
}

function renderTable(list) {
  const tbody = document.getElementById('txTableBody');
  const empty = document.getElementById('txEmpty');
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(function(tx) {
    const cat = categorize(tx);
    const amt = Number(tx.amount) || 0;
    const sign = amt >= 0 ? '+ ' : '';
    return '<tr>' +
      '<td>' + fmtDate(tx.created_at) + '</td>' +
      '<td><span class="status-badge" style="background:' + cat.color + '22;color:' + cat.color + ';">' + cat.label + '</span></td>' +
      '<td class="text-title">' + (tx.description || '-') + '</td>' +
      '<td class="amount-cell" style="color:' + (amt >= 0 ? '#10b981' : '#dc2626') + ';">' + sign + fmtMoney(amt) + '</td>' +
      '</tr>';
  }).join('');
}

function exportCsv() {
  const f = getFilters();
  let list = allTx.slice();
  if (f.search) list = list.filter(function(tx) { return (tx.description || '').toLowerCase().indexOf(f.search) !== -1; });
  if (f.type) list = list.filter(function(tx) { return categorize(tx).key === f.type; });
  if (f.from) { const fromTs = new Date(f.from).getTime(); list = list.filter(function(tx) { return new Date(tx.created_at).getTime() >= fromTs; }); }
  if (f.to) { const toTs = new Date(f.to).getTime() + 86400000; list = list.filter(function(tx) { return new Date(tx.created_at).getTime() <= toTs; }); }

  let csv = '﻿التاريخ,النوع,الوصف,المبلغ\n';
  list.forEach(function(tx) {
    const cat = categorize(tx);
    const desc = '"' + String(tx.description || '').replace(/"/g, '""') + '"';
    csv += fmtDate(tx.created_at) + ',' + cat.label + ',' + desc + ',' + (Number(tx.amount) || 0) + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function loadTransactions(user) {
  try {
    const { data, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    allTx = data || [];
    applyFiltersAndRender();
  } catch (e) {
    console.warn('transactions load error', e);
    allTx = [];
    applyFiltersAndRender();
  }
}

async function init() {
  const user = await initPageAuthAndHeader();
  if (!user) return;
  currentUser = user;
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
