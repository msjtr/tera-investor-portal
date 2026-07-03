/**
 * ==========================================================
 * security-login-history.js
 * سجل عمليات تسجيل الدخول
 * Enterprise Version 2026
 * ==========================================================
 */

'use strict';

(function () {

    window.SecurityPages = window.SecurityPages || {};

    window.SecurityPages["login-history"] = {

        supabase: null,
        currentUser: null,
        currentSession: null,

        tableBody: null,
        refreshButton: null,

        async init() {

            console.log("📋 [Login History] Initializing...");

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

                await this.loadHistory();

            }

            catch (error) {

                console.error(error);

                showSecurityAlert(
                    "تعذر تحميل سجل تسجيل الدخول.",
                    "error"
                );

            }

        },

        cacheDom() {

            this.tableBody =
                document.getElementById("loginHistoryBody");

            this.refreshButton =
                document.getElementById("refreshHistoryBtn");

        },

        bindEvents() {

            if (this.refreshButton) {

                this.refreshButton.addEventListener(

                    "click",

                    () => this.loadHistory()

                );

            }

        },
                async loadHistory() {

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

                if (!this.tableBody)
                    return;

                this.tableBody.innerHTML = "";

                if (!data || data.length === 0) {

                    this.tableBody.innerHTML = `

                        <tr>

                            <td colspan="6" class="text-center">

                                لا يوجد سجل دخول.

                            </td>

                        </tr>

                    `;

                    return;

                }

                data.forEach(row => {

                    const tr =
                        document.createElement("tr");

                    tr.innerHTML = `

                        <td>

                            ${this.formatDate(
                                row.created_at
                            )}

                        </td>

                        <td>

                            ${row.email || "-"}

                        </td>

                        <td>

                            ${row.browser || "-"}

                        </td>

                        <td>

                            ${row.operating_system || "-"}

                        </td>

                        <td>

                            ${row.ip_address || "-"}

                        </td>

                        <td>

                            ${this.renderStatus(
                                row.login_status
                            )}

                        </td>

                    `;

                    this.tableBody.appendChild(tr);

                });

            }

            catch (err) {

                console.error(
                    "[Login History]",
                    err
                );

                showSecurityAlert(

                    "تعذر تحميل سجل تسجيل الدخول.",

                    "error"

                );

            }

            finally {

                this.stopLoading();

            }

        },

                /*
        ==========================================================
        عرض حالة تسجيل الدخول
        ==========================================================
        */

        renderStatus(status) {

            switch (status) {

                case "success":

                    return `
                        <span class="badge badge-success">
                            <i class="fas fa-check-circle"></i>
                            ناجح
                        </span>
                    `;

                case "failed":

                    return `
                        <span class="badge badge-danger">
                            <i class="fas fa-times-circle"></i>
                            فشل
                        </span>
                    `;

                case "blocked":

                    return `
                        <span class="badge badge-warning">
                            <i class="fas fa-ban"></i>
                            محظور
                        </span>
                    `;

                default:

                    return `
                        <span class="badge badge-secondary">
                            ${status || "-"}
                        </span>
                    `;

            }

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
                جاري التحميل...
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
        تحديث السجل
        ==========================================================
        */

        async refresh() {

            await this.loadHistory();

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

            if (this.tableBody) {

                this.tableBody.innerHTML = "";

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
