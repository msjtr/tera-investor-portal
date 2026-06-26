/**
 * ============================================================
 * سجل عمليات الدخول - Login History
 * ============================================================
 * الموقع: /assets/js/security-login-history.js
 * ============================================================
 */

// التأكد من وجود الكائن العام
window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['login-history'] = {
    // بيانات تجريبية لسجل الدخول
    loginEntries: [
        {
            id: 1,
            date: '2026-06-26 09:30:15',
            ip: '192.168.1.100',
            device: 'Chrome 120',
            os: 'macOS Sonoma 14.2',
            location: 'الرياض، المملكة العربية السعودية',
            status: 'success',
            isCurrent: true
        },
        {
            id: 2,
            date: '2026-06-25 22:15:42',
            ip: '192.168.1.101',
            device: 'Safari 17',
            os: 'iOS 17.4',
            location: 'الرياض، المملكة العربية السعودية',
            status: 'success',
            isCurrent: false
        },
        {
            id: 3,
            date: '2026-06-25 14:20:08',
            ip: '10.0.0.5',
            device: 'Edge 124',
            os: 'Windows 11',
            location: 'جدة، المملكة العربية السعودية',
            status: 'failed',
            isCurrent: false
        },
        {
            id: 4,
            date: '2026-06-24 18:45:33',
            ip: '192.168.1.102',
            device: 'Chrome 120',
            os: 'Android 14',
            location: 'الدمام، المملكة العربية السعودية',
            status: 'success',
            isCurrent: false
        },
        {
            id: 5,
            date: '2026-06-24 11:30:21',
            ip: '10.0.0.12',
            device: 'Firefox 125',
            os: 'Ubuntu 24.04',
            location: 'دبي، الإمارات العربية المتحدة',
            status: 'failed',
            isCurrent: false
        },
        {
            id: 6,
            date: '2026-06-23 08:15:50',
            ip: '192.168.1.103',
            device: 'Safari 17',
            os: 'iPadOS 17.4',
            location: 'الرياض، المملكة العربية السعودية',
            status: 'success',
            isCurrent: false
        },
        {
            id: 7,
            date: '2026-06-22 16:40:12',
            ip: '172.16.0.8',
            device: 'Chrome 120',
            os: 'Windows 10',
            location: 'الكويت، دولة الكويت',
            status: 'failed',
            isCurrent: false
        },
        {
            id: 8,
            date: '2026-06-21 12:05:37',
            ip: '192.168.1.104',
            device: 'Edge 123',
            os: 'Windows 11',
            location: 'الرياض، المملكة العربية السعودية',
            status: 'success',
            isCurrent: false
        },
        {
            id: 9,
            date: '2026-06-20 09:55:18',
            ip: '10.0.0.3',
            device: 'Firefox 124',
            os: 'macOS Sonoma 14.1',
            location: 'الدوحة، دولة قطر',
            status: 'failed',
            isCurrent: false
        },
        {
            id: 10,
            date: '2026-06-19 21:20:44',
            ip: '192.168.1.105',
            device: 'Safari 16',
            os: 'iOS 16.7',
            location: 'المنامة، مملكة البحرين',
            status: 'success',
            isCurrent: false
        },
        {
            id: 11,
            date: '2026-06-18 14:10:29',
            ip: '172.16.0.10',
            device: 'Chrome 119',
            os: 'Android 13',
            location: 'مسقط، سلطنة عمان',
            status: 'success',
            isCurrent: false
        },
        {
            id: 12,
            date: '2026-06-17 07:35:52',
            ip: '192.168.1.106',
            device: 'Edge 122',
            os: 'Windows 10',
            location: 'القاهرة، جمهورية مصر العربية',
            status: 'failed',
            isCurrent: false
        },
        {
            id: 13,
            date: '2026-06-16 18:50:11',
            ip: '10.0.0.7',
            device: 'Chrome 120',
            os: 'macOS Ventura 13.6',
            location: 'الرياض، المملكة العربية السعودية',
            status: 'success',
            isCurrent: false
        },
        {
            id: 14,
            date: '2026-06-15 11:25:38',
            ip: '192.168.1.107',
            device: 'Safari 17',
            os: 'iOS 17.3',
            location: 'جدة، المملكة العربية السعودية',
            status: 'success',
            isCurrent: false
        },
        {
            id: 15,
            date: '2026-06-14 16:15:05',
            ip: '172.16.0.15',
            device: 'Firefox 123',
            os: 'Ubuntu 22.04',
            location: 'الخرطوم، جمهورية السودان',
            status: 'failed',
            isCurrent: false
        }
    ],

    // متغيرات الترقيم والفلترة
    currentPage: 1,
    pageSize: 10,
    filteredData: [],

    init: function() {
        console.log('📋 Initializing Login History page...');

        // تهيئة البيانات المفلترة
        this.filteredData = [...this.loginEntries];
        this.applyFilters();

        // تهيئة المستمعات
        this.initEventListeners();

        console.log('✅ Login History page initialized successfully.');
    },

    /**
     * تهيئة مستمعات الأحداث
     */
    initEventListeners: function() {
        // فلاتر
        const filterStatus = document.getElementById('filterStatus');
        const filterDateFrom = document.getElementById('filterDateFrom');
        const filterDateTo = document.getElementById('filterDateTo');
        const resetBtn = document.getElementById('resetFiltersBtn');

        if (filterStatus) {
            filterStatus.addEventListener('change', this.applyFilters.bind(this));
        }
        if (filterDateFrom) {
            filterDateFrom.addEventListener('change', this.applyFilters.bind(this));
        }
        if (filterDateTo) {
            filterDateTo.addEventListener('change', this.applyFilters.bind(this));
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', this.resetFilters.bind(this));
        }

        // أزرار الترقيم
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderTable();
                }
            }.bind(this));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderTable();
                }
            }.bind(this));
        }
    },

    /**
     * تطبيق الفلاتر على البيانات
     */
    applyFilters: function() {
        const filterStatus = document.getElementById('filterStatus');
        const filterDateFrom = document.getElementById('filterDateFrom');
        const filterDateTo = document.getElementById('filterDateTo');

        const status = filterStatus ? filterStatus.value : 'all';
        const dateFrom = filterDateFrom ? filterDateFrom.value : '';
        const dateTo = filterDateTo ? filterDateTo.value : '';

        this.filteredData = this.loginEntries.filter(function(entry) {
            // فلتر الحالة
            if (status !== 'all' && entry.status !== status) {
                return false;
            }

            // فلتر التاريخ من
            if (dateFrom) {
                const entryDate = entry.date.split(' ')[0];
                if (entryDate < dateFrom) {
                    return false;
                }
            }

            // فلتر التاريخ إلى
            if (dateTo) {
                const entryDate = entry.date.split(' ')[0];
                if (entryDate > dateTo) {
                    return false;
                }
            }

            return true;
        });

        // إعادة تعيين الصفحة إلى 1
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
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
     * عرض الجدول مع البيانات المفلترة والمرقمة
     */
    renderTable: function() {
        const tbody = document.getElementById('loginHistoryBody');
        const totalCount = document.getElementById('totalEntries');
        const entriesCount = document.getElementById('entriesCount');
        const logCount = document.getElementById('logCount');

        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredData.length);
        const pageData = this.filteredData.slice(startIndex, endIndex);

        // تحديث الإحصائيات
        const total = this.filteredData.length;
        if (totalCount) totalCount.textContent = total;
        if (entriesCount) entriesCount.textContent = total;
        if (logCount) logCount.textContent = total + ' سجل';

        // تحديث معلومات العرض
        const showingStart = document.getElementById('showingStart');
        const showingEnd = document.getElementById('showingEnd');
        if (showingStart) showingStart.textContent = total > 0 ? startIndex + 1 : 0;
        if (showingEnd) showingEnd.textContent = total > 0 ? endIndex : 0;

        if (pageData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:48px 20px; color:#94a3b8;">
                        <i class="fas fa-inbox" style="font-size:32px; display:block; margin-bottom:12px;"></i>
                        لا توجد سجلات تطابق معايير البحث
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        pageData.forEach(function(entry, index) {
            const globalIndex = startIndex + index + 1;
            const statusBadge = this.getStatusBadge(entry.status);
            const locationIcon = this.getLocationIcon(entry.location);
            const isCurrent = entry.isCurrent ? ' <span class="device-tag" style="background:#D1E7DD;color:#0F5132;"><i class="fas fa-check-circle"></i> الحالي</span>' : '';

            html += `
                <tr>
                    <td>${globalIndex}</td>
                    <td>${this.formatDate(entry.date)}</td>
                    <td><span class="ip-address">${entry.ip}</span></td>
                    <td>
                        <span class="device-tag"><i class="fas ${this.getDeviceIcon(entry.device)}"></i> ${entry.device}</span>
                        <span style="font-size:12px; color:#94a3b8; display:block; margin-top:2px;">${entry.os}${isCurrent}</span>
                    </td>
                    <td><span class="location-text"><i class="fas ${locationIcon}"></i> ${entry.location}</span></td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }.bind(this));

        tbody.innerHTML = html;
        this.updatePagination();
    },

    /**
     * الحصول على أيقونة الجهاز
     */
    getDeviceIcon: function(device) {
        const deviceLower = device.toLowerCase();
        if (deviceLower.includes('chrome')) return 'fa-chrome';
        if (deviceLower.includes('safari')) return 'fa-safari';
        if (deviceLower.includes('edge')) return 'fa-edge';
        if (deviceLower.includes('firefox')) return 'fa-firefox';
        return 'fa-globe';
    },

    /**
     * الحصول على أيقونة الموقع
     */
    getLocationIcon: function(location) {
        if (location.includes('الرياض')) return 'fa-city';
        if (location.includes('جدة')) return 'fa-city';
        if (location.includes('الدمام')) return 'fa-city';
        if (location.includes('دبي')) return 'fa-city';
        if (location.includes('الكويت')) return 'fa-city';
        if (location.includes('الدوحة')) return 'fa-city';
        if (location.includes('المنامة')) return 'fa-city';
        if (location.includes('مسقط')) return 'fa-city';
        if (location.includes('القاهرة')) return 'fa-city';
        if (location.includes('الخرطوم')) return 'fa-city';
        return 'fa-map-marker-alt';
    },

    /**
     * الحصول على حالة الدخول مع البادج المناسب
     */
    getStatusBadge: function(status) {
        if (status === 'success') {
            return '<span class="status-badge success"><i class="fas fa-check-circle"></i> ناجحة</span>';
        } else if (status === 'failed') {
            return '<span class="status-badge failed"><i class="fas fa-times-circle"></i> فاشلة</span>';
        } else {
            return '<span class="status-badge pending"><i class="fas fa-clock"></i> قيد الانتظار</span>';
        }
    },

    /**
     * تنسيق التاريخ
     */
    formatDate: function(dateStr) {
        try {
            const parts = dateStr.split(' ');
            if (parts.length === 2) {
                const dateParts = parts[0].split('-');
                const timeParts = parts[1].split(':');
                const year = dateParts[0];
                const month = dateParts[1];
                const day = dateParts[2];
                const hour = timeParts[0];
                const minute = timeParts[1];
                return `${year}/${month}/${day} ${hour}:${minute}`;
            }
            return dateStr;
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

        // حذف أزرار الصفحات القديمة (مع الاحتفاظ بأزرار السابق والتالي)
        const oldPageBtns = paginationContainer.querySelectorAll('.page-btn:not(#prevPage):not(#nextPage)');
        oldPageBtns.forEach(function(btn) {
            btn.remove();
        });

        // إضافة أزرار الصفحات الجديدة
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // إضافة زر الصفحة الأولى إذا لزم الأمر
        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.className = 'page-btn';
            firstBtn.dataset.page = '1';
            firstBtn.textContent = '1';
            firstBtn.addEventListener('click', this.goToPage.bind(this));
            paginationContainer.insertBefore(firstBtn, nextBtn);

            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '…';
                dots.style.cssText = 'padding:0 4px; color:#94a3b8;';
                paginationContainer.insertBefore(dots, nextBtn);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = 'page-btn' + (i === this.currentPage ? ' active' : '');
            btn.dataset.page = i;
            btn.textContent = i;
            btn.addEventListener('click', this.goToPage.bind(this));
            paginationContainer.insertBefore(btn, nextBtn);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '…';
                dots.style.cssText = 'padding:0 4px; color:#94a3b8;';
                paginationContainer.insertBefore(dots, nextBtn);
            }
            const lastBtn = document.createElement('button');
            lastBtn.className = 'page-btn';
            lastBtn.dataset.page = totalPages;
            lastBtn.textContent = totalPages;
            lastBtn.addEventListener('click', this.goToPage.bind(this));
            paginationContainer.insertBefore(lastBtn, nextBtn);
        }

        // تحديث حالة أزرار السابق والتالي
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages || totalPages === 0;
        }
    },

    /**
     * الانتقال إلى صفحة محددة
     */
    goToPage: function(e) {
        const page = parseInt(e.target.dataset.page);
        if (!isNaN(page) && page !== this.currentPage) {
            this.currentPage = page;
            this.renderTable();
        }
    }
};
