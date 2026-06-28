/**
 * ============================================================
 * landing.js - الصفحة الرئيسية (Enterprise)
 * ============================================================
 * الموقع: /assets/js/landing.js
 * - يفحص ما إذا كان المستخدم مسجلاً دخول فعلاً.
 * - إن كان مسجلاً، يوجهه إلى لوحة التحكم.
 * - إن لم يكن، يؤمن الصفحة من حلقات التوجيه التلقائي.
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function() {
        // انتظار جاهزية TeraAuth (الذي ينتظر supabase:ready)
        if (!window.TeraAuth) {
            // إذا لم يُحمّل بعد، ننتظر قليلاً
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (window.TeraAuth) {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            });
        }

        // فحص الجلسة عبر Supabase بشكل حقيقي
        try {
            const session = await window.TeraAuth.getCurrentSession();
            if (session) {
                // المستخدم مسجل دخول → توجيه فوري إلى لوحة التحكم
                console.log('🚀 [Landing] مستخدم مسجل، توجيه إلى لوحة التحكم...');
                window.location.replace('/pages/dashboard/index.html');
                return;
            }
        } catch (error) {
            console.warn('⚠️ [Landing] تعذر فحص الجلسة، استمرار كزائر.');
        }

        // تأمين الصفحة: منع أي توجيه تلقائي لاحق
        if (window.TeraAuth) {
            window.TeraAuth.blockCheck();
            window.TeraAuth.disableAutoRedirect();
            console.log('🔓 [Landing] صفحة عامة، تم إلغاء فحص الحماية.');
        }
    });
})();
