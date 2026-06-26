/**
 * ============================================================
 * الأجهزة المصرحة - Registered Devices
 * ============================================================
 * الموقع: /assets/js/security-registered-devices.js
 * ============================================================
 */

// التأكد من وجود الكائن العام
window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['registered-devices'] = {
    // بيانات الأجهزة التجريبية
    devices: [
        {
            id: 1,
            name: 'MacBook Pro - العمل',
            browser: 'Chrome 120',
            os: 'macOS Sonoma 14.2',
            ip: '192.168.1.100',
            lastActive: '2026-06-26 09:30',
            status: 'current',
            type: 'desktop',
            trusted: true
        },
        {
            id: 2,
            name: 'iPhone 15 Pro',
            browser: 'Safari 17',
            os: 'iOS 17.4',
            ip: '192.168.1.101',
            lastActive: '2026-06-25 22:15',
            status: 'trusted',
            type: 'mobile',
            trusted: true
        },
        {
            id: 3,
            name: 'iPad Air',
            browser: 'Safari 17',
            os: 'iPadOS 17.4',
            ip: '192.168.1.102',
            lastActive: '2026-06-24 14:20',
            status: 'trusted',
            type: 'tablet',
            trusted: true
        },
        {
            id: 4,
            name: 'Windows Laptop - المنزل',
            browser: 'Edge 124',
            os: 'Windows 11',
            ip: '192.168.1.103',
            lastActive: '2026-06-20 18:45',
            status: 'unknown',
            type: 'desktop',
            trusted: false
        },
        {
            id: 5,
            name: 'Google Pixel 8',
            browser: 'Chrome 120',
            os: 'Android 14',
            ip: '192.168.1.104',
            lastActive: '2026-06-18 11:30',
            status: 'unknown',
            type: 'mobile',
            trusted: false
        }
    ],

    init: function() {
        console.log('💻 Initializing Registered Devices page...');

        const container = document.getElementById('devicesList');
        if (!container) {
            console.warn('⚠️ Devices list container not found.');
            return;
        }

        this.renderDevices();
        this.initEventListeners();

        console.log('✅ Registered Devices page initialized successfully.');
    },

    /**
     * عرض الأجهزة في القائمة
     */
    renderDevices: function() {
        const container = document.getElementById('devicesList');
        const emptyState = document.getElementById('emptyState');
        const deviceCount = document.getElementById('deviceCount');

        if (!container) return;

        // تحديث عدد الأجهزة
        if (deviceCount) {
            deviceCount.textContent = this.devices.length + ' أجهزة';
        }

        // إذا لم توجد أجهزة
        if (this.devices.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        if (emptyState) emptyState.style.display = 'none';

        // بناء قائمة الأجهزة
        let html = '';
        this.devices.forEach((device, index) => {
            const statusBadge = this.getStatusBadge(device);
            const iconClass = this.getDeviceIconClass(device.type);
            const statusText = this.getStatusText(device);

            html += `
                <div class="device-card-item" data-id="${device.id}">
                    <div class="device-icon ${iconClass}">
                        <i class="fas ${this.getDeviceIcon(device.type)}"></i>
                    </div>
                    <div class="device-info">
                        <div class="device-name">${device.name}</div>
                        <div class="device-details">
                            <span class="detail-item"><i class="fas fa-globe"></i> ${device.browser}</span>
                            <span class="detail-item"><i class="fas fa-desktop"></i> ${device.os}</span>
                            <span class="detail-item"><i class="fas fa-network-wired"></i> ${device.ip}</span>
                        </div>
                        <div class="device-last-active">
                            <i class="fas fa-clock"></i> آخر نشاط: ${device.lastActive}
                        </div>
                    </div>
                    <div class="device-status-badge ${statusBadge.class}">
                        <i class="fas ${statusBadge.icon}"></i>
                        ${statusBadge.text}
                    </div>
                    <div class="device-actions">
                        ${this.getActionButtons(device)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    /**
     * الحصول على أيقونة الجهاز
     */
    getDeviceIcon: function(type) {
        const icons = {
            desktop: 'fa-desktop',
            mobile: 'fa-mobile-alt',
            tablet: 'fa-tablet-alt',
            unknown: 'fa-question-circle'
        };
        return icons[type] || icons.unknown;
    },

    /**
     * الحصول على كلاس أيقونة الجهاز
     */
    getDeviceIconClass: function(type) {
        const classes = {
            desktop: 'desktop',
            mobile: 'mobile',
            tablet: 'tablet',
            unknown: 'unknown'
        };
        return classes[type] || classes.unknown;
    },

    /**
     * الحصول على حالة الجهاز
     */
    getStatusBadge: function(device) {
        if (device.status === 'current') {
            return { class: 'current', icon: 'fa-check-circle', text: 'الجهاز الحالي' };
        } else if (device.status === 'trusted' || device.trusted) {
            return { class: 'trusted', icon: 'fa-shield-check', text: 'موثوق' };
        } else {
            return { class: 'unknown', icon: 'fa-exclamation-triangle', text: 'غير موثوق' };
        }
    },

    /**
     * الحصول على النص المعروض للحالة (للوصول السريع)
     */
    getStatusText: function(device) {
        if (device.status === 'current') return 'الجهاز الحالي';
        if (device.status === 'trusted' || device.trusted) return 'موثوق';
        return 'غير موثوق';
    },

    /**
     * الحصول على أزرار الإجراءات المناسبة للجهاز
     */
    getActionButtons: function(device) {
        let buttons = '';

        // الجهاز الحالي لا يمكن إلغاء صلاحيته
        if (device.status === 'current') {
            buttons += `
                <button class="btn-sm btn-sm-outline" disabled>
                    <i class="fas fa-check"></i> نشط
                </button>
            `;
            return buttons;
        }

        // زر "وثّق" للجهاز غير الموثوق
        if (!device.trusted && device.status !== 'current') {
            buttons += `
                <button class="btn-sm btn-sm-primary" data-action="trust" data-id="${device.id}">
                    <i class="fas fa-shield-alt"></i> وثّق
                </button>
            `;
        }

        // زر "إلغاء الصلاحية" لجميع الأجهزة غير الحالية
        buttons += `
            <button class="btn-sm btn-sm-danger" data-action="revoke" data-id="${device.id}">
                <i class="fas fa-times"></i> إلغاء الصلاحية
            </button>
        `;

        return buttons;
    },

    /**
     * تهيئة مستمعات الأحداث
     */
    initEventListeners: function() {
        const container = document.getElementById('devicesList');
        if (!container) return;

        // استخدام Event Delegation للاستماع على الأزرار
        container.addEventListener('click', function(e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = parseInt(btn.dataset.id);

            if (action === 'trust') {
                this.trustDevice(id);
            } else if (action === 'revoke') {
                this.revokeDevice(id);
            }
        }.bind(this));
    },

    /**
     * توثيق جهاز (جعله موثوقاً)
     */
    trustDevice: function(id) {
        const device = this.devices.find(d => d.id === id);
        if (!device) return;

        if (device.status === 'current') {
            Security.showAlert('لا يمكن تغيير حالة الجهاز الحالي.', 'error');
            return;
        }

        if (confirm(`هل أنت متأكد من رغبتك في توثيق الجهاز "${device.name}"؟`)) {
            device.trusted = true;
            device.status = 'trusted';
            this.renderDevices();
            Security.showAlert(`✅ تم توثيق الجهاز "${device.name}" بنجاح.`, 'success');
        }
    },

    /**
     * إلغاء صلاحية جهاز
     */
    revokeDevice: function(id) {
        const device = this.devices.find(d => d.id === id);
        if (!device) return;

        if (device.status === 'current') {
            Security.showAlert('لا يمكن إلغاء صلاحية الجهاز الحالي.', 'error');
            return;
        }

        if (confirm(`هل أنت متأكد من إلغاء صلاحية الجهاز "${device.name}"؟ سيتم تسجيل الخروج من هذا الجهاز.`)) {
            // حذف الجهاز من القائمة
            this.devices = this.devices.filter(d => d.id !== id);
            this.renderDevices();
            Security.showAlert(`✅ تم إلغاء صلاحية الجهاز "${device.name}" بنجاح.`, 'success');
        }
    },

    /**
     * إضافة جهاز جديد (محاكاة)
     */
    addDevice: function(deviceData) {
        const newDevice = {
            id: this.devices.length > 0 ? Math.max(...this.devices.map(d => d.id)) + 1 : 1,
            name: deviceData.name || 'جهاز جديد',
            browser: deviceData.browser || 'متصفح غير معروف',
            os: deviceData.os || 'نظام تشغيل غير معروف',
            ip: deviceData.ip || '0.0.0.0',
            lastActive: new Date().toLocaleString('ar-SA', { hour12: false }).replace('،', ''),
            status: 'unknown',
            type: deviceData.type || 'unknown',
            trusted: false
        };

        this.devices.unshift(newDevice);
        this.renderDevices();
        Security.showAlert(`✅ تم إضافة الجهاز "${newDevice.name}" بنجاح.`, 'success');
    }
};
