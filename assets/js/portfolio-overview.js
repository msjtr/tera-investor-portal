/**
 * portfolio-overview.js - صفحة نظرة عامة على المحفظة (بيانات حقيقية)
 * يعرض: إجمالي القيمة، الرصيد المتاح، الرصيد قيد المعالجة، الأرباح المتوقعة،
 * الأرباح القادمة للصرف، الأرباح المحققة، إجمالي العوائد، معدل النمو،
 * الاستثمارات النشطة، الطلبات الحالية، آخر الإشعارات، آخر العمليات، رسم بياني للنمو
 */
(function() {
'use strict';

let supabase = null;
let chartInstance = null;
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

function fmtMoney(v) {
  return (Number(v) || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 }) + ' ر.س';
}
function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return Math.floor(diff / 60) + ' دقيقة';
  if (diff < 86400) return Math.floor(diff / 3600) + ' ساعة';
  if (diff < 604800) return Math.floor(diff / 86400) + ' يوم';
  return fmtDate(iso);
}
function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadStats(user, sb) {
  let history = [];
  try {
    const { data: portfolio } = await sb.from('user_portfolio').select('total_value, available_balance').eq('user_id', user.id).maybeSingle();
    setStat('statTotalValue', fmtMoney(portfolio && portfolio.total_value));
    setStat('statAvailable', fmtMoney(portfolio && portfolio.available_balance));
  } catch (e) { console.warn('user_portfolio error', e); }

  try {
    const { data: wrs } = await sb.from('withdrawal_requests').select('amount, status').eq('user_id', user.id);
    const pendingStatuses = ['pending', 'under_review', 'approved', 'transferring'];
    const list = wrs || [];
    const pendingAmount = list.filter(r => pendingStatuses.indexOf(r.status) !== -1).reduce((s, r) => s + Number(r.amount || 0), 0);
    const activeRequestsCount = list.filter(r => ['completed', 'rejected'].indexOf(r.status) === -1).length;
    setStat('statPending', fmtMoney(pendingAmount));
    setStat('statActiveRequests', activeRequestsCount + ' طلب');
  } catch (e) { console.warn('withdrawal_requests error', e); }

  let totalReturn = 0;
  try {
    const { data: contracts } = await sb.from('investment_contracts').select('status, expected_profit, current_profit').eq('user_id', user.id);
    const list = contracts || [];
    const activeContracts = list.filter(c => c.status === 'active');
    const expectedProfit = activeContracts.reduce((s, c) => s + Number(c.expected_profit || 0), 0);
    totalReturn = list.reduce((s, c) => s + Number(c.current_profit || 0), 0);
    setStat('statExpectedProfit', fmtMoney(expectedProfit));
    setStat('statTotalReturn', fmtMoney(totalReturn));
    setStat('statActiveInvestments', activeContracts.length + ' استثمار');
  } catch (e) { console.warn('investment_contracts error', e); }

  try {
    const { data: payouts } = await sb.from('profit_payouts').select('amount, status').eq('user_id', user.id);
    const list = payouts || [];
    const upcoming = list.filter(p => p.status === 'scheduled').reduce((s, p) => s + Number(p.amount || 0), 0);
    const realized = list.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0);
    setStat('statUpcomingPayout', fmtMoney(upcoming));
    setStat('statRealizedProfit', fmtMoney(realized || totalReturn));
  } catch (e) { console.warn('profit_payouts error', e); }

  try {
    const { data: hist } = await sb.from('portfolio_history').select('month, value').eq('user_id', user.id).order('month', { ascending: true });
    history = hist || [];
    let growthRate = 0;
    if (history.length >= 2) {
      const first = Number(history[0].value) || 0;
      const last = Number(history[history.length - 1].value) || 0;
      if (first > 0) growthRate = ((last - first) / first * 100);
    }
    setStat('statGrowthRate', (growthRate >= 0 ? '+' : '') + growthRate.toFixed(1) + '%');
  } catch (e) { console.warn('portfolio_history error', e); }

  return history;
}

function loadChart(history) {
  const ctx = document.getElementById('growthChart');
  if (!ctx || typeof Chart === 'undefined') return;
  let labels = [], values = [];
  if (history && history.length) { labels = history.map(r => r.month); values = history.map(r => r.value); }
  else { labels = ['لا توجد بيانات']; values = [0]; }
  try {
    const existing = Chart.getChart('growthChart');
    if (existing) existing.destroy();
  } catch (e) {}
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: [{ label: 'نمو المحفظة (ر.س)', data: values, borderColor: '#028090', backgroundColor: 'rgba(2,128,144,0.1)', tension: 0.3, fill: true, pointBackgroundColor: '#028090' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'Tajawal' } } } } }
  });
}

async function loadNotifications(user, sb) {
  const list = document.getElementById('notifList');
  const countEl = document.getElementById('notifCount');
  if (!list) return;
  try {
    const { data, error } = await sb.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
    if (error) throw error;
    if (countEl) countEl.textContent = (data || []).length;
    if (!data || data.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:var(--gray-400);padding:20px 0;">لا توجد إشعارات حالياً</div>';
      return;
    }
    list.innerHTML = data.map(function(n) {
      return '<div class="notif-item"><div class="notif-icon"><i class="fas fa-bell"></i></div><div class="notif-body"><strong>' +
        (n.title || 'إشعار') + '</strong><p>' + (n.body || '') + '</p><span class="notif-time">' + timeAgo(n.created_at) + '</span></div></div>';
    }).join('');
  } catch (e) { console.warn('loadNotifications error', e); }
}

async function loadTransactions(user, sb) {
  const tbody = document.getElementById('transactionsTableBody');
  if (!tbody) return;
  try {
    const { data, error } = await sb.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
    if (error) throw error;
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--gray-400);">لا توجد عمليات مالية</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(function(t) {
      return '<tr><td class="text-title">' + (t.description || '-') + '</td><td class="amount-cell">' + fmtMoney(t.amount) + '</td><td>' + fmtDate(t.created_at) + '</td></tr>';
    }).join('');
  } catch (e) { console.warn('loadTransactions error', e); }
}

async function init() {
  if (!window.Auth || typeof window.Auth.requireAuth !== 'function') {
    window.location.replace('/auth/auth/login/login.html');
    return;
  }
  const user = await window.Auth.requireAuth();
  if (!user) return;

  supabase = await getSupabase();
  if (!supabase) return;

  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) loadingOverlay.classList.add('active');

  const storedName = sessionStorage.getItem('otpName');
  const displayName = storedName || (user.user_metadata && user.user_metadata.full_name) || user.email || 'مستخدم';
  const nameEl = document.getElementById('headerUserName');
  const avatarEl = document.getElementById('headerAvatar');
  if (nameEl) nameEl.textContent = displayName;
  if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

  document.title = 'نظرة عامة على المحفظة | Tera Investor Portal';

  if (window.ActivityTracker) {
    try {
      window.ActivityTracker.startIdleTimer(async function() { if (window.Auth && window.Auth.logout) await window.Auth.logout(); }, user.id);
      await window.ActivityTracker.updateLastActivity(user.id);
      updateActivityInterval = setInterval(async function() { try { await window.ActivityTracker.updateLastActivity(user.id); } catch (e) {} }, 60000);
    } catch (e) {}
  }

  try {
    const history = await loadStats(user, supabase);
    loadChart(history);
    await Promise.all([ loadNotifications(user, supabase), loadTransactions(user, supabase) ]);
  } catch (e) { console.warn('init load error', e); }

  if (loadingOverlay) loadingOverlay.classList.remove('active');
}

window.addEventListener('beforeunload', function() { if (updateActivityInterval) clearInterval(updateActivityInterval); });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
