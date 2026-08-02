/**
 * investments-list.js - قائمة عقود الاستثمار (نشط/مكتمل/ملغى/ممدد)
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

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('active');
}

window.addEventListener('beforeunload', function() { if (updateActivityInterval) clearInterval(updateActivityInterval); });

let __allContracts = [];

function computeCompletion(c) {
  if (c.completion_percentage !== null && c.completion_percentage !== undefined) return Math.min(100, Math.max(0, Number(c.completion_percentage)));
  if (!c.start_date || !c.end_date) return 0;
  const start = new Date(c.start_date).getTime();
  const end = new Date(c.end_date).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, Math.round((now - start) / (end - start) * 100)));
}

function renderContracts(list) {
  const container = document.getElementById('contractsContainer');
  const emptyState = document.getElementById('emptyState');
  if (!container) return;
  if (!list || list.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';
  container.innerHTML = list.map(function(c) {
    const pct = computeCompletion(c);
    const dr = daysRemaining(c.end_date);
    const drText = dr === null ? '-' : (dr < 0 ? 'انتهت المدة' : dr + ' يوم');
    return '<div class="contract-card">' +
      '<div class="contract-card-top">' +
        '<div class="contract-card-title"><i class="fas fa-file-contract" style="color:var(--primary);margin-left:8px;"></i>' + (c.title || 'استثمار بدون عنوان') + '</div>' +
        statusBadge(c.status) +
      '</div>' +
      '<div class="contract-card-grid">' +
        '<div><div class="contract-metric-label">قيمة الاستثمار</div><div class="contract-metric-value">' + fmtMoney(c.amount) + '</div></div>' +
        '<div><div class="contract-metric-label">تاريخ البداية</div><div class="contract-metric-value" style="font-size:13px;">' + fmtDateShort(c.start_date) + '</div></div>' +
        '<div><div class="contract-metric-label">تاريخ النهاية</div><div class="contract-metric-value" style="font-size:13px;">' + fmtDateShort(c.end_date) + '</div></div>' +
        '<div><div class="contract-metric-label">العائد السنوي</div><div class="contract-metric-value">' + (c.annual_return != null ? c.annual_return + '%' : '-') + '</div></div>' +
        '<div><div class="contract-metric-label">الأرباح الحالية</div><div class="contract-metric-value">' + fmtMoney(c.current_profit) + '</div></div>' +
        '<div><div class="contract-metric-label">الأرباح المتوقعة</div><div class="contract-metric-value">' + fmtMoney(c.expected_profit) + '</div></div>' +
        '<div><div class="contract-metric-label">الأيام المتبقية</div><div class="contract-metric-value" style="font-size:13px;">' + drText + '</div></div>' +
      '</div>' +
      '<div style="margin-top:14px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray-500);font-weight:700;margin-bottom:6px;"><span>نسبة الإنجاز</span><span>' + pct + '%</span></div>' +
        '<div class="mini-progress-outer"><div class="mini-progress-inner" style="width:' + pct + '%;"></div></div>' +
      '</div>' +
      '<div style="margin-top:14px;text-align:left;"><a href="/pages/investments/investment-details.html?id=' + encodeURIComponent(c.id) + '" class="btn-table-link"><i class="fas fa-eye"></i> عرض التفاصيل</a></div>' +
    '</div>';
  }).join('');
}

function applyFilters() {
  const searchEl = document.getElementById('searchInput');
  const statusEl = document.getElementById('statusFilterSelect');
  const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const statusVal = statusEl ? statusEl.value : (window.__investmentsStatusFilter || 'all');
  let list = __allContracts;
  if (statusVal && statusVal !== 'all') list = list.filter(function(c) { return c.status === statusVal; });
  if (q) list = list.filter(function(c) { return (c.title || '').toLowerCase().indexOf(q) !== -1; });
  renderContracts(list);
}

async function loadContracts(user) {
  try {
    const { data, error } = await supabase.from('investment_contracts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;
    __allContracts = data || [];

    const totalCount = __allContracts.length;
    const totalValue = __allContracts.reduce(function(s,c){ return s + Number(c.amount||0); }, 0);
    const totalCurrentProfit = __allContracts.reduce(function(s,c){ return s + Number(c.current_profit||0); }, 0);
    const el1 = document.getElementById('statContractsCount'); if (el1) el1.textContent = totalCount + ' عقد';
    const el2 = document.getElementById('statTotalValue'); if (el2) el2.textContent = fmtMoney(totalValue);
    const el3 = document.getElementById('statTotalProfit'); if (el3) el3.textContent = fmtMoney(totalCurrentProfit);

    applyFilters();
  } catch (e) {
    console.warn('loadContracts error', e);
    renderContracts([]);
  }
}

async function init() {
  const user = await initPageAuthAndHeader();
  if (!user) return;

  const statusEl = document.getElementById('statusFilterSelect');
  if (statusEl) {
    if (window.__investmentsStatusFilter && window.__investmentsStatusFilter !== 'all') {
      statusEl.value = window.__investmentsStatusFilter;
      statusEl.disabled = true;
    }
    statusEl.addEventListener('change', applyFilters);
  }
  const searchEl = document.getElementById('searchInput');
  if (searchEl) searchEl.addEventListener('input', applyFilters);

  await loadContracts(user);
  hideLoading();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
