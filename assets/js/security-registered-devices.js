/**
 * ============================================================
 * الأجهزة المصرحة - Registered Devices (نسخة المؤسسات)
 * ============================================================
 * الموقع: /assets/js/security-registered-devices.js
 * - ينتظر جاهزية Supabase عبر 'supabase:ready'.
 * - يجلب الأجهزة من جدول auth_devices المرتبط بالمستخدم الحالي.
 * - يسمح بتوثيق / إلغاء صلاحية الأجهزة مع التحديث الفوري للقاعدة.
 * - خالٍ تماماً من البيانات الثابتة أو المحاكاة.
 * ============================================================
 */

window.SecurityPages = window.SecurityPages || {};

window.SecurityPages['registered-devices'] = {
    devices: [],

    init: async function() {
        console.log('💻 تهيئة صفحة الأجهزة المصرحة (Enterprise)...');

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
                this.showEmptyState('تعذر الاتصال بقاعدة البيانات.');
                return;
            }
        }

        // جلب الأجهزة وعرضها
        await this.loadDevices();
        this.initEventListeners();
        console.log('✅ صفحة الأجهزة المصرحة مهيأة.');
    },

    /**
     * جلب قائمة الأجهزة من جدول auth_devices
     */
    loadDevices: async function() {
        const container = document.getElementById('devicesList');
        const loadingEl = document.getElementById('loadingState') || container;
        if (loadingEl) {
            loadingEl.innerHTML = `<div class="text-center p-4"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>`;
        }

        try {
            // الحصول على معرف المستخدم الحالي
            const { data: { user } } = await window.teraSupabase.auth.getUser();
            if (!user) throw new Error('لا يوجد مستخدم مسجل الدخول');

            const { data, error } = await window.teraSupabase
                .from('auth_devices')
                .select('*')
                .eq('user_id', user.id)
                .order('last_login_at', { ascending: false });

            if (error) throw error;

            this.devices = data || [];
            this.renderDevices();
        } catch (error) {
            console.error('❌ خطأ في جلب الأجهزة:', error);
            this.showEmptyState('تعذر تحميل الأجهزة. ' + (error.message || ''));
        }
    },

    /**
     * عرض الأجهزة في القائمة
     */
    renderDevices: function() {
        const container = document.getElementById('devicesList');
        const emptyState = document.getElementById('emptyState');
        const deviceCount = document.getElementById('deviceCount');

        if (!container) return;

        if (deviceCount) deviceCount.textContent = this.devices.length + ' أجهزة';

        if (this.devices.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        if (emptyState) emptyState.style.display = 'none';

        let html = '';
        this.devices.forEach((device) => {
            const statusBadge = this.getStatusBadge(device);
            const iconClass = this.getDeviceIconClass(device.device_type);
            const name = device.device_name || 'جهاز غير معروف';
            const browser = device.browser || 'غير معروف';
            const os = device.operating_system || 'غير معروف';
            const ip = device.ip_address || '-';
            const lastActive = device.last_login_at ? this.formatDate(device.last_login_at) : '-';

            html += `
                <div class="device-card-item" data-id="${device.id}">
                    <div class="device-icon ${iconClass}">
                        <i class="fas ${this.getDeviceIcon(device.device_type)}"></i>
                    </div>
                    <div class="device-info">
                        <div class="device-name">${name}</div>
                        <div class="device-details">
                            <span class="detail-item"><i class="fas fa-globe"></i> ${browser}</span>
                            <span class="detail-item"><i class="fas fa-desktop"></i> ${os}</span>
                            <span class="detail-item"><i class="fas fa-network-wired"></i> ${ip}</span>
                        </div>
                        <div class="device-last-active">
                            <i class="fas fa-clock"></i> آخر نشاط: ${lastActive}
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
     * عرض حالة فارغة
     */
    showEmptyState: function(message) {
        const container = document.getElementById('devicesList');
        if (container) {
            container.innerHTML = `
                <div class="text-center p-4" style="color:#94a3b8;">
                    <i class="fas fa-inbox" style="font-size:32px; margin-bottom:8px; display:block;"></i>
                    ${message}
                </div>`;
        }
    },

    /**
     * تنسيق التاريخ
     */
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
        } catch {
            return dateStr;
        }
    },

    /**
     * الحصول على أيقونة الجهاز
     */
    getDeviceIcon: function(type) {
        const icons = {
            desktop: 'fa-desktop',
            mobile: 'fa-mobile-alt',
            tablet: 'fa-tablet-alt'
        };
        return icons[type] || 'fa-question-circle';
    },

    /**
     * الحصول على كلاس أيقونة الجهاز
     */
    getDeviceIconClass: function(type) {
        const classes = {
            desktop: 'desktop',
            mobile: 'mobile',
            tablet: 'tablet'
        };
        return classes[type] || 'unknown';
    },

    /**
     * الحصول على بادج الحالة
     */
    getStatusBadge: function(device) {
        if (device.is_trusted) {
            return { class: 'trusted', icon: 'fa-shield-check', text: 'موثوق' };
        } else {
            return { class: 'unknown', icon: 'fa-exclamation-triangle', text: 'غير موثوق' };
        }
    },

    /**
     * أزرار الإجراءات
     */
    getActionButtons: function(device) {
        let buttons = '';
        if (!device.is_trusted) {
            buttons += `
                <button class="btn-sm btn-sm-primary" data-action="trust" data-id="${device.id}">
                    <i class="fas fa-shield-alt"></i> وثّق
                </button>
            `;
        }
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

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'trust') {
                this.trustDevice(id);
            } else if (action === 'revoke') {
                this.revokeDevice(id);
            }
        });
    },

    /**
     * توثيق جهاز
     */
    trustDevice: async function(id) {
        const device = this.devices.find(d => d.id == id);
        if (!device) return;

        if (!confirm(`هل أنت متأكد من توثيق الجهاز "${device.device_name}"؟`)) return;

        try {
            const { error } = await window.teraSupabase
                .from('auth_devices')
                .update({ is_trusted: true, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            device.is_trusted = true;
            this.renderDevices();
            Security.showAlert('✅ تم توثيق الجهاز بنجاح.', 'success');
        } catch (error) {
            console.error('❌ خطأ في توثيق الجهاز:', error);
            Security.showAlert('تعذر توثيق الجهاز.', 'error');
        }
    },

    /**
     * إلغاء صلاحية جهاز (إزالته من القائمة)
     */
    revokeDevice: async function(id) {
        const device = this.devices.find(d => d.id == id);
        if (!device) return;

        if (!confirm(`هل أنت متأكد من إلغاء صلاحية الجهاز "${device.device_name}"؟ سيتم تسجيل الخروج منه.`)) return;

        try {
            const { error } = await window.teraSupabase
                .from('auth_devices')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.devices = this.devices.filter(d => d.id != id);
            this.renderDevices();
            Security.showAlert('✅ تم إلغاء صلاحية الجهاز بنجاح.', 'success');
        } catch (error) {
            console.error('❌ خطأ في إلغاء الجهاز:', error);
            Security.showAlert('تعذر إلغاء صلاحية الجهاز.', 'error');
        }
    }
};
