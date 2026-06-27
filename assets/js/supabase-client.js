/**
 * منصة تيرا - محرك الاتصال المركزي بـ Supabase
 * الموقع: /assets/js/supabase-client.js
 */
(function() {
    'use strict';

    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    // ⚠️ ضع مفتاح anon الطويل جداً (JWT) الذي يبدأ بـ eyJ هنا داخل علامات التنصيص:
    const ANON_KEY = 'sb_publishable_QYc4AcGWtJGxalINA_UGZw_fjfVbGqg'; 

    if (window.supabase && typeof window.supabase.createClient === 'function') {
        // حفظ العميل في متغير مركزي آمن دون الكتابة فوق المكتبة الأصلية
        window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
        console.log('✅ [supabase-client.js] تم تهيئة العميل المركزي بنجاح (window.teraSupabase).');

        // اختبار اتصال مباشر كما طلبت للتأكد من عمل القاعدة
        window.addEventListener('load', async () => {
            try {
                // نختبر جلب جلسة كإجراء سريع للتحقق من الاتصال
                const { data, error } = await window.teraSupabase.auth.getSession();
                if (error) {
                    console.error("❌ [اختبار الاتصال] خطأ:", error.message);
                } else {
                    console.log("✅ [اختبار الاتصال] متصل بقاعدة البيانات بنجاح.");
                }
            } catch (err) {
                console.error("❌ [اختبار الاتصال] فشل في جلب البيانات:", err);
            }
        });

    } else {
        console.error('❌ [supabase-client.js] مكتبة Supabase الأصلية غير محملة من الـ CDN.');
    }
})();
