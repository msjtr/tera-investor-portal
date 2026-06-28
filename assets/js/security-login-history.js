/**
 * ============================================================
 * سجل عمليات الدخول - Login History (نسخة المؤسسات)
 * ============================================================
 * الموقع: /assets/js/security-login-history.js
 * - جلب البيانات الحقيقية من جدول auth_login عبر Supabase.
 * - دعم الفلاتر (الحالة، التاريخ) والترقيم.
 * - ينتظر حدث 'supabase:ready' لضمان جاهزية العميل.
 * ============================================================
 */

window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['login-history'] = {
    // البيانات القادمة من الخادم
    allEntries: [],
    filteredData: [],
    currentPage: 1,
    pageSize: 10,
    isLoading: false,

    init: async function() {
        console.log('📋 تهيئة صفحة سجل الدخول (Enterprise)...');

        // انتظار جاهزية Supabase
        if (!window.teraSupabase) {
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('انتهت مهلة انتظار Supabase')), 10000);
                    document.addEventListener('supabase:ready', (e) => {
                        clearTimeout(timeout);
                        resolve(e.detail.client);
                    }, { once: true });
                    document.addEventListener('supabase:error', () => {
                        clearTimeout(timeout);
                        reject(new Error('فشل تحميل Supabase'));
                    }, { once: true });
                });
            } catch (err) {
                console.error('❌ تعذر الاتصال بـ Supabase:', err);
                this.showEmptyState('تعذر الاتصال بقاعدة البيانات. تأكد من اتصالك بالإنترنت.');
                return;
            }
        }

        // تهيئة المستمعات
        this.initEventListeners();
        // جلب البيانات وعرضها
        await this.loadData();
    },

    /**
     * جلب جميع سجلات الدخول من قاعدة البيانات
     */
    loadData: async function() {
        const tbody = document.getElementById('loginHistoryBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:48px 20px;">
                <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                <p>جاري تحميل سجل الدخول...</p>
            </td></tr>`;
        }

        try {
            const { data, error } = await window.teraSupabase
                .from('auth_login')
                .select('*')
                .order('login_at', { ascending: false });

            if (error) throw error;

            this.allEntries = data || [];
            this.applyFilters();
        } catch (error) {
            console.error('❌ خطأ في جلب سجل الدخول:', error);
            this.showEmptyState('تعذر تحميل سجل الدخول. ' + (error.message || ''));
        }
    },

    /**
     * تهيئة مستمعات الأحداث (فلاتر، أزرار)
     */
    initEventListeners: function() {
        // فلاتر
        const filterStatus = document.getElementById('filterStatus');
        const filterDateFrom = document.getElementById('filterDateFrom');
        const filterDateTo = document.getElementById('filterDateTo');
        const resetBtn = document.getElementById('resetFiltersBtn');

        if (filterStatus) filterStatus.addEventListener('change', this.applyFilters.bind(this));
        if (filterDateFrom) filterDateFrom.addEventListener('change', this.applyFilters.bind(this));
        if (filterDateTo) filterDateTo.addEventListener('change', this.applyFilters.bind(this));
        if (resetBtn) resetBtn.addEventListener('click', this.resetFilters.bind(this));

        // أزرار الترقيم
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderTable();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderTable();
                }
            });
        }
    },

    /**
     * تطبيق الفلاتر على البيانات المسترجعة
     */
    applyFilters: function() {
        const filterStatus = document.getElementById('filterStatus');
        const filterDateFrom = document.getElementById('filterDateFrom');
        const filterDateTo = document.getElementById('filterDateTo');

        const status = filterStatus ? filterStatus.value : 'all';
        const dateFrom = filterDateFrom ? filterDateFrom.value : '';
        const dateTo = filterDateTo ? filterDateTo.value : '';

        this.filteredData = this.allEntries.filter(entry => {
            // فلتر الحالة
            if (status !== 'all' && entry.login_status !== status) return false;

            // فلتر التاريخ
            if (entry.login_at) {
                const entryDate = entry.login_at.split('T')[0]; // yyyy-mm-dd
                if (dateFrom && entryDate < dateFrom) return false;
                if (dateTo && entryDate > dateTo) return false;
            } else {
                // إذا لم توجد login_at نعرضها أم لا؟ حسب المنطق، لا نفلتر
            }

            return true;
        });

        this.currentPage = 1;
        this.renderTable();
    },

    /**
     * إعادة ضبط الفلاتر
     */
    resetFilters: function() {
        const filterStatus = document.getElementById('filterStatus');
        const filterDateFrom = document.getElementById('filterDateFrom');
        const filterDateTo = document.getElementById('filterDateTo');

        if (filterStatus) filterStatus.value = 'all';
        if (filterDateFrom) filterDateFrom.value = '';
        if (filterDateTo) filterDateTo.value = '';

        this.applyFilters();
    },

    /**
     * عرض الجدول بالبيانات المصفّاة
     */
    renderTable: function() {
        const tbody = document.getElementById('loginHistoryBody');
        const totalCount = document.getElementById('totalEntries');
        const entriesCount = document.getElementById('entriesCount');
        const logCount = document.getElementById('logCount');
        const showingStart = document.getElementById('showingStart');
        const showingEnd = document.getElementById('showingEnd');

        if (!tbody) return;

        const total = this.filteredData.length;
        if (totalCount) totalCount.textContent = total;
        if (entriesCount) entriesCount.textContent = total;
        if (logCount) logCount.textContent = total + ' سجل';

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, total);
        const pageData = this.filteredData.slice(startIndex, endIndex);

        if (showingStart) showingStart.textContent = total > 0 ? startIndex + 1 : 0;
        if (showingEnd) showingEnd.textContent = total > 0 ? endIndex : 0;

        if (pageData.length === 0) {
            this.showEmptyState('لا توجد سجلات تطابق معايير البحث');
            return;
        }

        let html = '';
        pageData.forEach((entry, idx) => {
            const globalIndex = startIndex + idx + 1;
            const loginAt = entry.login_at ? this.formatDate(entry.login_at) : '-';
            const ip = entry.ip_address || '-';
            const device = entry.device_name || entry.browser || '-';
            const os = entry.operating_system || '-';
            const status = entry.login_status || 'unknown';
            const statusBadge = this.getStatusBadge(status);
            const locationText = '-'; // في حال أردت إضافة موقع يمكن استخراجه لاحقاً
            const deviceIcon = this.getDeviceIcon(device);
            const locationIcon = 'fa-map-marker-alt';
            const isCurrent = false; // لا نملك حالياً إشارة للجلسة الحالية

            html += `
                <tr>
                    <td>${globalIndex}</td>
                    <td>${loginAt}</td>
                    <td><span class="ip-address">${ip}</span></td>
                    <td>
                        <span class="device-tag"><i class="fas ${deviceIcon}"></i> ${device}</span>
                        <span style="font-size:12px; color:#94a3b8; display:block; margin-top:2px;">${os}</span>
                    </td>
                    <td><span class="location-text"><i class="fas ${locationIcon}"></i> ${locationText}</span></td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        this.updatePagination();
    },

    showEmptyState: function(message) {
        const tbody = document.getElementById('loginHistoryBody');
        if (!tbody) return;
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:48px 20px; color:#94a3b8;">
                    <i class="fas fa-inbox" style="font-size:32px; display:block; margin-bottom:12px;"></i>
                    ${message}
                </td>
            </tr>
        `;
        // إعادة تعيين الإحصائيات
        const totalCount = document.getElementById('totalEntries');
        const entriesCount = document.getElementById('entriesCount');
        const logCount = document.getElementById('logCount');
        const showingStart = document.getElementById('showingStart');
        const showingEnd = document.getElementById('showingEnd');
        if (totalCount) totalCount.textContent = '0';
        if (entriesCount) entriesCount.textContent = '0';
        if (logCount) logCount.textContent = '0 سجل';
        if (showingStart) showingStart.textContent = '0';
        if (showingEnd) showingEnd.textContent = '0';
    },

    getDeviceIcon: function(device) {
        const d = device.toLowerCase();
        if (d.includes('chrome')) return 'fa-chrome';
        if (d.includes('safari')) return 'fa-safari';
        if (d.includes('edge')) return 'fa-edge';
        if (d.includes('firefox')) return 'fa-firefox';
        return 'fa-globe';
    },

    getStatusBadge: function(status) {
        if (status === 'success') {
            return '<span class="status-badge success"><i class="fas fa-check-circle"></i> ناجحة</span>';
        } else if (status === 'failed') {
            return '<span class="status-badge failed"><i class="fas fa-times-circle"></i> فاشلة</span>';
        } else {
            return '<span class="status-badge pending"><i class="fas fa-clock"></i> ' + status + '</span>';
        }
    },

    formatDate: function(dateStr) {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
        } catch (e) {
            return dateStr;
        }
    },

    /**
     * تحديث أزرار الترقيم
     */
    updatePagination: function() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const paginationContainer = document.getElementById('paginationButtons');
        if (!paginationContainer) return;

        // إزالة أزرار الصفحات القديمة (ماعدا أزرار السابق والتالي)
        paginationContainer.querySelectorAll('.page-btn:not(#prevPage):not(#nextPage)').forEach(btn => btn.remove());

        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            const firstBtn = this.createPageBtn(1);
            paginationContainer.insertBefore(firstBtn, nextBtn);
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '…';
                dots.style.cssText = 'padding:0 4px; color:#94a3b8;';
                paginationContainer.insertBefore(dots, nextBtn);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const btn = this.createPageBtn(i);
            if (i === this.currentPage) btn.classList.add('active');
            paginationContainer.insertBefore(btn, nextBtn);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '…';
                dots.style.cssText = 'padding:0 4px; color:#94a3b8;';
                paginationContainer.insertBefore(dots, nextBtn);
            }
            const lastBtn = this.createPageBtn(totalPages);
            paginationContainer.insertBefore(lastBtn, nextBtn);
        }

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages || totalPages === 0;
    },

    createPageBtn: function(page) {
        const btn = document.createElement('button');
        btn.className = 'page-btn';
        btn.dataset.page = page;
        btn.textContent = page;
        btn.addEventListener('click', this.goToPage.bind(this));
        return btn;
    },

    goToPage: function(e) {
        const page = parseInt(e.target.dataset.page);
        if (!isNaN(page) && page !== this.currentPage) {
            this.currentPage = page;
            this.renderTable();
        }
    }
};
