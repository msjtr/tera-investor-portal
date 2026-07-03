/**
 * ==========================================================
 * landing.js
 * الصفحة الرئيسية
 * Enterprise Version 2026
 * ==========================================================
 */

'use strict';

(function () {

    const LandingPage = {

        supabase: null,

        session: null,

        user: null,

        loginButtons: [],

        dashboardButtons: [],

        statsElements: {},

        async init() {

            console.log("🏠 Landing Page Initializing...");

            try {

                this.supabase =
                    await waitForSupabase();

                const {
                    data: { session }
                } = await this.supabase.auth.getSession();

                this.session = session;

                this.user =
                    session ? session.user : null;

                this.cacheDom();

                this.bindEvents();

                this.updateHeader();

                await this.loadStatistics();

            }

            catch (error) {

                console.error(
                    "[Landing]",
                    error
                );

            }

        },

        cacheDom() {

            this.loginButtons =
                document.querySelectorAll(
                    ".btn-login"
                );

            this.dashboardButtons =
                document.querySelectorAll(
                    ".btn-dashboard"
                );

            this.statsElements = {

                investors:
                    document.getElementById(
                        "statInvestors"
                    ),

                investments:
                    document.getElementById(
                        "statInvestments"
                    ),

                profits:
                    document.getElementById(
                        "statProfits"
                    )

            };

        },

        bindEvents() {

            window.addEventListener(

                "focus",

                () => this.refreshSession()

            );

        },

                /*
        ==========================================================
        تحديث الجلسة
        ==========================================================
        */

        async refreshSession() {

            try {

                const {
                    data: { session }
                } = await this.supabase.auth.getSession();

                this.session = session;

                this.user =
                    session ? session.user : null;

                this.updateHeader();

            }

            catch (error) {

                console.error(
                    "[Landing] Session Refresh",
                    error
                );

            }

        },

        /*
        ==========================================================
        تحديث واجهة المستخدم
        ==========================================================
        */

        updateHeader() {

            if (this.user) {

                this.loginButtons.forEach(button => {

                    button.style.display = "none";

                });

                this.dashboardButtons.forEach(button => {

                    button.style.display = "";

                });

            }

            else {

                this.loginButtons.forEach(button => {

                    button.style.display = "";

                });

                this.dashboardButtons.forEach(button => {

                    button.style.display = "none";

                });

            }

        },

        /*
        ==========================================================
        الانتقال للوحة التحكم
        ==========================================================
        */

        goToDashboard() {

            window.location.href =
                "/pages/dashboard/index.html";

        },

        /*
        ==========================================================
        الانتقال لتسجيل الدخول
        ==========================================================
        */

        goToLogin() {

            window.location.href =
                "/auth/auth/login/login.html";

        },
                /*
        ==========================================================
        تحميل الإحصائيات
        ==========================================================
        */

        async loadStatistics() {

            try {

                /*
                 * عدد المستثمرين
                 */

                const {

                    count: investorsCount

                } = await this.supabase

                    .from("users")

                    .select("*", {

                        count: "exact",

                        head: true

                    });

                /*
                 * عدد الاستثمارات
                 */

                const {

                    count: investmentsCount

                } = await this.supabase

                    .from("investments")

                    .select("*", {

                        count: "exact",

                        head: true

                    });

                /*
                 * مجموع الأرباح
                 */

                const {

                    data: profitsData

                } = await this.supabase

                    .from("profits")

                    .select("amount");

                let totalProfits = 0;

                if (profitsData) {

                    profitsData.forEach(item => {

                        totalProfits +=
                            Number(item.amount || 0);

                    });

                }

                this.updateStatistics({

                    investors:
                        investorsCount || 0,

                    investments:
                        investmentsCount || 0,

                    profits:
                        totalProfits

                });

            }

            catch (error) {

                console.error(

                    "[Landing Statistics]",

                    error

                );

            }

        },

        /*
        ==========================================================
        تحديث الإحصائيات
        ==========================================================
        */

        updateStatistics(stats) {

            if (this.statsElements.investors) {

                this.statsElements.investors.textContent =
                    Number(
                        stats.investors || 0
                    ).toLocaleString("ar-SA");

            }

            if (this.statsElements.investments) {

                this.statsElements.investments.textContent =
                    Number(
                        stats.investments || 0
                    ).toLocaleString("ar-SA");

            }

            if (this.statsElements.profits) {

                this.statsElements.profits.textContent =
                    Number(
                        stats.profits || 0
                    ).toLocaleString("ar-SA") +
                    " ريال";

            }

        },
                /*
        ==========================================================
        تحريك العدادات
        ==========================================================
        */

        animateCounters() {

            Object.values(this.statsElements).forEach(element => {

                if (!element) return;

                element.classList.remove("counter-updated");

                void element.offsetWidth;

                element.classList.add("counter-updated");

            });

        },

        /*
        ==========================================================
        تنسيق العملة
        ==========================================================
        */

        formatCurrency(value) {

            return Number(value || 0).toLocaleString("ar-SA") + " ريال";

        },

        /*
        ==========================================================
        إعادة تحميل البيانات
        ==========================================================
        */

        async refresh() {

            await this.refreshSession();

            await this.loadStatistics();

            this.animateCounters();

        },

        /*
        ==========================================================
        تنظيف الموارد
        ==========================================================
        */

        destroy() {

            this.session = null;

            this.user = null;

            this.supabase = null;

            this.loginButtons = [];

            this.dashboardButtons = [];

            this.statsElements = {};

        },

            };

    /*
    ==========================================================
    تشغيل الصفحة
    ==========================================================
    */

    document.addEventListener(

        "DOMContentLoaded",

        () => {

            LandingPage.init();

        }

    );

})();
