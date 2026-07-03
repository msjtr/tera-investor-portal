/**
 * ==========================================================
 * security-registered-devices.js
 * الأجهزة المصرح بها
 * Enterprise Version 2026
 * ==========================================================
 */

'use strict';

(function () {

    window.SecurityPages = window.SecurityPages || {};

    window.SecurityPages["registered-devices"] = {

        supabase: null,
        currentUser: null,
        currentSession: null,

        devicesContainer: null,
        refreshButton: null,

        async init() {

            console.log("💻 [Registered Devices] Initializing...");

            try {

                this.supabase = await waitForSupabase();

                const {
                    data: { session }
                } = await this.supabase.auth.getSession();

                if (!session) {

                    window.location.replace(
                        "/auth/auth/login/login.html"
                    );

                    return;

                }

                this.currentSession = session;
                this.currentUser = session.user;

                updateHeader(this.currentUser);

                this.cacheDom();

                this.bindEvents();

                await this.loadDevices();

            }

            catch (error) {

                console.error(error);

                showSecurityAlert(
                    "تعذر تحميل الأجهزة.",
                    "error"
                );

            }

        },

        cacheDom() {

            this.devicesContainer =
                document.getElementById("devicesContainer");

            this.refreshButton =
                document.getElementById("refreshDevicesBtn");

        },

        bindEvents() {

            if (this.refreshButton) {

                this.refreshButton.addEventListener(

                    "click",

                    () => this.loadDevices()

                );

            }

        },
                async loadDevices() {

            try {

                this.setLoading();

                const { data, error } =
                    await this.supabase

                        .from("auth_login")

                        .select("*")

                        .eq(
                            "user_id",
                            this.currentUser.id
                        )

                        .order(
                            "created_at",
                            {
                                ascending: false
                            }
                        )

                        .limit(100);

                if (error)
                    throw error;

                if (!this.devicesContainer)
                    return;

                this.devicesContainer.innerHTML = "";

                if (!data || data.length === 0) {

                    this.devicesContainer.innerHTML = `

                        <div class="empty-state">

                            <i class="fas fa-laptop"></i>

                            <p>لا توجد أجهزة مسجلة.</p>

                        </div>

                    `;

                    return;

                }

                /*
                 * إزالة التكرار
                 */

                const devices = [];

                const seen = new Set();

                data.forEach(item => {

                    const key =

                        (item.browser || "") +

                        "|" +

                        (item.operating_system || "") +

                        "|" +

                        (item.device_name || "");

                    if (!seen.has(key)) {

                        seen.add(key);

                        devices.push(item);

                    }

                });

                devices.forEach(device => {

                    this.devicesContainer.appendChild(

                        this.createDeviceCard(device)

                    );

                });

            }

            catch (err) {

                console.error(

                    "[Registered Devices]",

                    err

                );

                showSecurityAlert(

                    "تعذر تحميل الأجهزة.",

                    "error"

                );

            }

            finally {

                this.stopLoading();

            }

        },
                /*
        ==========================================================
        إنشاء بطاقة جهاز
        ==========================================================
        */

        createDeviceCard(device) {

            const card =
                document.createElement("div");

            card.className =
                "device-card";

            const browser =
                device.browser || "غير معروف";

            const os =
                device.operating_system || "غير معروف";

            const ip =
                device.ip_address || "-";

            const deviceName =
                device.device_name || "جهاز غير معروف";

            const loginDate =
                this.formatDate(device.created_at);

            const isCurrent =
                navigator.userAgent === browser;

            card.innerHTML = `

                <div class="device-icon">

                    <i class="${this.getDeviceIcon(os)}"></i>

                </div>

                <div class="device-details">

                    <h4>

                        ${deviceName}

                        ${isCurrent
                            ? '<span class="badge badge-success">الجهاز الحالي</span>'
                            : ''}

                    </h4>

                    <div class="device-meta">

                        <div>

                            <strong>المتصفح:</strong>

                            ${browser}

                        </div>

                        <div>

                            <strong>النظام:</strong>

                            ${os}

                        </div>

                        <div>

                            <strong>IP:</strong>

                            ${ip}

                        </div>

                        <div>

                            <strong>آخر تسجيل:</strong>

                            ${loginDate}

                        </div>

                    </div>

                </div>

            `;

            return card;

        },

        /*
        ==========================================================
        أيقونة الجهاز
        ==========================================================
        */

        getDeviceIcon(os) {

            const value =
                (os || "").toLowerCase();

            if (value.includes("windows"))
                return "fab fa-windows";

            if (value.includes("android"))
                return "fab fa-android";

            if (value.includes("iphone"))
                return "fab fa-apple";

            if (value.includes("ios"))
                return "fab fa-apple";

            if (value.includes("mac"))
                return "fab fa-apple";

            if (value.includes("linux"))
                return "fab fa-linux";

            return "fas fa-laptop";

        },
                /*
        ==========================================================
        تنسيق التاريخ
        ==========================================================
        */

        formatDate(date) {

            if (!date)
                return "-";

            try {

                return new Date(date)
                    .toLocaleString(
                        "ar-SA",
                        {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    );

            }

            catch {

                return date;

            }

        },

        /*
        ==========================================================
        بدء التحميل
        ==========================================================
        */

        setLoading() {

            if (!this.refreshButton)
                return;

            this.refreshButton.disabled = true;

            this.refreshButton.dataset.originalText =
                this.refreshButton.innerHTML;

            this.refreshButton.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                جاري تحميل الأجهزة...
            `;

        },

        /*
        ==========================================================
        إنهاء التحميل
        ==========================================================
        */

        stopLoading() {

            if (!this.refreshButton)
                return;

            this.refreshButton.disabled = false;

            if (this.refreshButton.dataset.originalText) {

                this.refreshButton.innerHTML =
                    this.refreshButton.dataset.originalText;

            }

        },

        /*
        ==========================================================
        إعادة تحميل الأجهزة
        ==========================================================
        */

        async refresh() {

            await this.loadDevices();

        },
                /*
        ==========================================================
        إعادة تحميل الصفحة
        ==========================================================
        */

        async reloadPage() {

            await this.refresh();

        },

        /*
        ==========================================================
        تنظيف الموارد
        ==========================================================
        */

        destroy() {

            if (this.devicesContainer) {

                this.devicesContainer.innerHTML = "";

            }

            if (this.refreshButton) {

                this.refreshButton.disabled = false;

                if (this.refreshButton.dataset.originalText) {

                    this.refreshButton.innerHTML =
                        this.refreshButton.dataset.originalText;

                }

            }

            this.currentUser = null;
            this.currentSession = null;
            this.supabase = null;

        }

    };

})();
