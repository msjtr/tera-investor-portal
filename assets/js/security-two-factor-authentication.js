/**
 * ==========================================================
 * security-two-factor-authentication.js
 * المصادقة الثنائية
 * Enterprise Version 2026
 * ==========================================================
 */

'use strict';

(function () {

    window.SecurityPages = window.SecurityPages || {};

    window.SecurityPages["two-factor-authentication"] = {

        supabase: null,
        currentUser: null,
        currentSession: null,

        async init() {

            console.log("🔐 [2FA] Initializing...");

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

                this.loadStatus();

                this.bindEvents();

            }

            catch (error) {

                console.error(error);

                showSecurityAlert(
                    "تعذر تحميل الصفحة.",
                    "error"
                );

            }

        },

        cacheDom() {

            this.enableSwitch =
                document.getElementById("enable2FA");

            this.saveButton =
                document.getElementById("save2FA");

            this.statusText =
                document.getElementById("statusText");

            this.password =
                document.getElementById("currentPassword");

        },

        bindEvents() {

            if (this.saveButton) {

                this.saveButton.addEventListener(

                    "click",

                    () => this.save()

                );

            }

        },

        async loadStatus() {

            try {

                const enabled =
                    this.currentUser.user_metadata?.two_factor_enabled || false;

                if (this.enableSwitch) {

                    this.enableSwitch.checked =
                        enabled;

                }

                if (this.statusText) {

                    this.statusText.textContent =
                        enabled
                            ? "المصادقة الثنائية مفعلة"
                            : "المصادقة الثنائية غير مفعلة";

                }

            }

            catch (error) {

                console.error(error);

            }

        },

                async save() {

            const enabled =
                this.enableSwitch.checked;

            const password =
                this.password.value.trim();

            if (!password) {

                showSecurityAlert(

                    "يرجى إدخال كلمة المرور الحالية.",

                    "error"

                );

                return;

            }

            this.setLoading(

                this.saveButton,

                "جاري الحفظ..."

            );

            try {

                /*
                 * التحقق من كلمة المرور
                 */

                const { error: verifyError } =
                    await this.supabase.auth.signInWithPassword({

                        email: this.currentUser.email,

                        password

                    });

                if (verifyError) {

                    throw new Error(
                        "كلمة المرور الحالية غير صحيحة."
                    );

                }

                /*
                 * حفظ حالة المصادقة الثنائية
                 */

                const { error } =
                    await this.supabase.auth.updateUser({

                        data: {

                            two_factor_enabled:
                                enabled

                        }

                    });

                if (error)
                    throw error;

                /*
                 * تحديث المستخدم الحالي
                 */

                const {

                    data: {

                        user

                    }

                } = await this.supabase.auth.getUser();

                if (user) {

                    this.currentUser = user;

                }

                /*
                 * تحديث الواجهة
                 */

                if (this.statusText) {

                    this.statusText.textContent =
                        enabled
                            ? "المصادقة الثنائية مفعلة"
                            : "المصادقة الثنائية غير مفعلة";

                }

                this.password.value = "";

                showSecurityAlert(

                    enabled
                        ? "تم تفعيل المصادقة الثنائية بنجاح."
                        : "تم إيقاف المصادقة الثنائية.",

                    "success"

                );

            }

            catch (err) {

                console.error(
                    "[2FA]",
                    err
                );

                showSecurityAlert(

                    err.message ||

                    "تعذر حفظ الإعدادات.",

                    "error"

                );

            }

            finally {

                this.stopLoading(

                    this.saveButton

                );

            }

        },

                /*
        ==========================================================
        إظهار حالة التحميل
        ==========================================================
        */

        setLoading(button, text) {

            if (!button) return;

            button.disabled = true;

            button.dataset.originalText =
                button.innerHTML;

            button.innerHTML =
                `<i class="fas fa-spinner fa-spin"></i> ${text}`;

        },

        /*
        ==========================================================
        إيقاف حالة التحميل
        ==========================================================
        */

        stopLoading(button) {

            if (!button) return;

            button.disabled = false;

            if (button.dataset.originalText) {

                button.innerHTML =
                    button.dataset.originalText;

            }

        },

        /*
        ==========================================================
        تحديث بيانات المستخدم
        ==========================================================
        */

        async refreshUser() {

            try {

                const {
                    data: { user }
                } = await this.supabase.auth.getUser();

                if (user) {

                    this.currentUser = user;

                    updateHeader(user);

                    await this.loadStatus();

                }

            }

            catch (error) {

                console.warn(
                    "[2FA] Unable to refresh user.",
                    error
                );

            }

        },

        /*
        ==========================================================
        إعادة تعيين النموذج
        ==========================================================
        */

        resetForm() {

            if (this.password) {

                this.password.value = "";

            }

        },

        /*
        ==========================================================
        إعادة تحميل الصفحة
        ==========================================================
        */

        reloadPage() {

            this.resetForm();

            this.refreshUser();

        },
                /*
        ==========================================================
        تنظيف الصفحة قبل الإغلاق
        ==========================================================
        */

        destroy() {

            if (this.password) {

                this.password.value = "";

            }

            this.currentUser = null;
            this.currentSession = null;

        }

    };

})();
