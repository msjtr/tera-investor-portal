/**
* ==========================================================
* activity-log.js
* سجل النشاط الزمني الكامل للمستخدم
* Enterprise Version 2026
* ==========================================================
*/

'use strict';

(function () {

var CATEGORY_LABELS = {
general: 'عام', investment: 'استثمار', profit: 'أرباح', financial: 'مالي',
contracts: 'العقود', identity_verification: 'التحقق من الهوية', security: 'الأمان',
portfolio: 'المحافظ', support: 'الدعم الفني', system: 'النظام'
};

var CATEGORY_ICONS = {
general: 'fa-info-circle', investment: 'fa-chart-line', profit: 'fa-coins', financial: 'fa-money-bill-wave',
contracts: 'fa-file-contract', identity_verification: 'fa-id-card', security: 'fa-shield-alt',
portfolio: 'fa-wallet', support: 'fa-headset', system: 'fa-cog'
};

var EVENT_TYPE_LABELS = {
withdrawal_request_created: 'تم إنشاء طلب سحب',
withdrawal_status_changed: 'تحديث حالة طلب السحب',
withdrawal_request_rejected: 'تم رفض طلب السحب',
profit_payout_paid: 'تم صرف الأرباح'
};

var STATUS_LABELS = {
completed: 'مكتمل', approved: 'موافق عليه', paid: 'مدفوع',
pending: 'قيد الانتظار', processing: 'قيد المعالجة',
rejected: 'مرفوض', failed: 'فشل'
};

var state = {
supabase: null, user: null,
page: 1, pageSize: 15, total: 0,
filters: { category: 'all', dateFrom: '', dateTo: '', search: '' }
};

var dom = {};

async function init() {
try {
state.supabase = await waitForSupabase();
var sessionRes = await state.supabase.auth.getSession();
var session = sessionRes.data.session;
if (!session) {
window.location.replace('/auth/auth/login/login.html');
return;
}
state.user = session.user;
if (typeof updateHeader === 'function') updateHeader(state.user);
cacheDom();
bindEvents();
await loadActivity();
} catch (err) {
console.error('[Activity Log] init error', err);
renderError();
}
}

function cacheDom() {
dom.timeline = document.getElementById('activityTimeline');
dom.totalCountBadge = document.getElementById('totalCountBadge');
dom.entriesCountBadge = document.getElementById('entriesCountBadge');
dom.showingStart = document.getElementById('showingStart');
dom.showingEnd = document.getElementById('showingEnd');
dom.totalEntries = document.getElementById('totalEntries');
dom.prevPage = document.getElementById('prevPage');
dom.nextPage = document.getElementById('nextPage');
dom.paginationButtons = document.getElementById('paginationButtons');
dom.filterCategory = document.getElementById('filterCategory');
dom.filterDateFrom = document.getElementById('filterDateFrom');
dom.filterDateTo = document.getElementById('filterDateTo');
dom.filterSearch = document.getElementById('filterSearch');
dom.resetFiltersBtn = document.getElementById('resetFiltersBtn');
}

function bindEvents() {
if (dom.filterCategory) dom.filterCategory.addEventListener('change', function() {
state.filters.category = dom.filterCategory.value;
state.page = 1;
loadActivity();
});
if (dom.filterDateFrom) dom.filterDateFrom.addEventListener('change', function() {
state.filters.dateFrom = dom.filterDateFrom.value;
state.page = 1;
loadActivity();
});
if (dom.filterDateTo) dom.filterDateTo.addEventListener('change', function() {
state.filters.dateTo = dom.filterDateTo.value;
state.page = 1;
loadActivity();
});
var searchTimer = null;
if (dom.filterSearch) dom.filterSearch.addEventListener('input', function() {
clearTimeout(searchTimer);
searchTimer = setTimeout(function() {
state.filters.search = dom.filterSearch.value.trim();
state.page = 1;
loadActivity();
}, 400);
});
if (dom.resetFiltersBtn) dom.resetFiltersBtn.addEventListener('click', function() {
state.filters = { category: 'all', dateFrom: '', dateTo: '', search: '' };
if (dom.filterCategory) dom.filterCategory.value = 'all';
if (dom.filterDateFrom) dom.filterDateFrom.value = '';
if (dom.filterDateTo) dom.filterDateTo.value = '';
if (dom.filterSearch) dom.filterSearch.value = '';
state.page = 1;
loadActivity();
});
if (dom.prevPage) dom.prevPage.addEventListener('click', function() {
if (state.page > 1) { state.page -= 1; loadActivity(); }
});
if (dom.nextPage) dom.nextPage.addEventListener('click', function() {
var maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
if (state.page < maxPage) { state.page += 1; loadActivity(); }
});
}

async function loadActivity() {
try {
setLoading();
var from = (state.page - 1) * state.pageSize;
var to = from + state.pageSize - 1;
var query = state.supabase
.from('activity_log')
.select('*', { count: 'exact' })
.eq('user_id', state.user.id)
.order('created_at', { ascending: false })
.range(from, to);

if (state.filters.category !== 'all') {
query = query.eq('event_category', state.filters.category);
}
if (state.filters.dateFrom) {
query = query.gte('created_at', state.filters.dateFrom + 'T00:00:00');
}
if (state.filters.dateTo) {
query = query.lte('created_at', state.filters.dateTo + 'T23:59:59');
}
if (state.filters.search) {
query = query.ilike('description', '%' + state.filters.search + '%');
}

var res = await query;
if (res.error) throw res.error;

state.total = res.count || 0;
renderTimeline(res.data || []);
renderPagination();
updateBadges();
} catch (err) {
console.error('[Activity Log] load error', err);
renderError();
} finally {
stopLoading();
}
}

function setLoading() {
if (!dom.timeline) return;
dom.timeline.innerHTML = '<div class="activity-empty-state"><i class="fas fa-spinner fa-spin"></i><p>جاري التحميل...</p></div>';
}

function stopLoading() {}

function renderError() {
if (!dom.timeline) return;
dom.timeline.innerHTML = '<div class="activity-empty-state"><i class="fas fa-exclamation-triangle"></i><p>تعذر تحميل سجل النشاط. حاول مرة أخرى لاحقاً.</p></div>';
}

function renderTimeline(rows) {
if (!dom.timeline) return;
if (!rows || rows.length === 0) {
dom.timeline.innerHTML = '<div class="activity-empty-state"><i class="fas fa-inbox"></i><p>لا توجد أحداث مطابقة.</p></div>';
return;
}
var html = '';
rows.forEach(function(row) {
var category = row.event_category || 'system';
var catLabel = CATEGORY_LABELS[category] || category;
var catIcon = CATEGORY_ICONS[category] || 'fa-circle-info';
var title = row.description || EVENT_TYPE_LABELS[row.event_type] || row.event_type || 'حدث غير معروف';
var status = row.status || '';
var statusLabel = STATUS_LABELS[status] || status;
var statusClass = 'status-default';
if (status === 'completed' || status === 'approved' || status === 'paid') statusClass = 'status-completed';
else if (status === 'pending' || status === 'processing') statusClass = 'status-pending';
else if (status === 'rejected' || status === 'failed') statusClass = 'status-rejected';

html += '<div class="timeline-item">';
html += '<div class="timeline-icon cat-' + escapeAttr(category) + '"><i class="fas ' + escapeAttr(catIcon) + '"></i></div>';
html += '<div class="timeline-content">';
html += '<div class="timeline-header"><h4>' + escapeHtml(title) + '</h4><span class="timeline-time">' + formatDate(row.created_at) + '</span></div>';
html += '<div class="timeline-meta">';
if (statusLabel) html += '<span class="badge ' + statusClass + '">' + escapeHtml(statusLabel) + '</span>';
html += '<span class="cat-tag">' + escapeHtml(catLabel) + '</span>';
if (row.actor) html += '<span class="actor-tag"><i class="fas fa-user"></i> ' + escapeHtml(row.actor) + '</span>';
html += '</div></div></div>';
});
dom.timeline.innerHTML = html;
}

function renderPagination() {
var maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
if (dom.prevPage) dom.prevPage.disabled = state.page <= 1;
if (dom.nextPage) dom.nextPage.disabled = state.page >= maxPage;
if (dom.paginationButtons) {
var btns = dom.paginationButtons.querySelectorAll('.page-btn[data-page]');
btns.forEach(function(b) { b.remove(); });
for (var p = 1; p <= maxPage; p++) {
var btn = document.createElement('button');
btn.className = 'page-btn' + (p === state.page ? ' active' : '');
btn.dataset.page = String(p);
btn.textContent = String(p);
btn.addEventListener('click', (function(pg) {
return function() { state.page = pg; loadActivity(); };
})(p));
dom.paginationButtons.insertBefore(btn, dom.nextPage);
}
}
var start = state.total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
var end = Math.min(state.page * state.pageSize, state.total);
if (dom.showingStart) dom.showingStart.textContent = String(start);
if (dom.showingEnd) dom.showingEnd.textContent = String(end);
if (dom.totalEntries) dom.totalEntries.textContent = String(state.total);
}

function updateBadges() {
if (dom.totalCountBadge) dom.totalCountBadge.textContent = state.total + ' حدث';
if (dom.entriesCountBadge) dom.entriesCountBadge.textContent = String(state.total);
}

function formatDate(dateStr) {
if (!dateStr) return '-';
try {
return new Date(dateStr).toLocaleString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
} catch (e) {
return dateStr;
}
}

function escapeHtml(str) {
var div = document.createElement('div');
div.textContent = str == null ? '' : String(str);
return div.innerHTML;
}

function escapeAttr(str) {
return String(str == null ? '' : str).replace(/[^a-zA-Z0-9_-]/g, '');
}

if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', init);
} else {
init();
}

})();
