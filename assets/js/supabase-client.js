/**
 * منصة تيرا - محرك الاتصال المركزي بـ Supabase
 */
(function() {
    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const ANON_KEY = 'YOUR_ACTUAL_LONG_JWT_KEY_HERE'; // ⚠️ ضع المفتاح الحقيقي هنا

    if (window.supabase && typeof window.supabase.createClient === 'function') {
        window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
        console.log('✅ [supabase-client.js] تم تهيئة العميل المركزي بنجاح.');
    } else {
        console.error('❌ [supabase-client.js] مكتبة Supabase غير محملة.');
    }
})();
