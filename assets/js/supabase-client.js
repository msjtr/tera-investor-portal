/**
 * ==========================================================
 * Tera Investor Portal
 * Supabase Client – v2.1 (منع تعارض waitForSupabase)
 * ==========================================================
 */
(function () {
    'use strict';

    // منع إنشاء العميل أكثر من مرة
    if (window.teraSupabase) {
        console.log('✅ [supabase-client] العميل موجود مسبقاً.');
        return;
    }

    const SUPABASE_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_QYc4AcGWtJGxalINA_UGZw_fjfVbGqg';

    /**
     * انتظار تحميل مكتبة Supabase من CDN
     */
    function waitForLibrary(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                return resolve();
            }
            const start = Date.now();
            const timer = setInterval(() => {
                if (window.supabase && typeof window.supabase.createClient === 'function') {
                    clearInterval(timer);
                    resolve();
                    return;
                }
                if (Date.now() - start > timeout) {
                    clearInterval(timer);
                    reject(new Error('Supabase JS Library timeout.'));
                }
            }, 100);
        });
    }

    /**
     * إنشاء العميل وإطلاق الحدث
     */
    async function initSupabase() {
        try {
            await waitForLibrary();
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    flowType: 'pkce'
                }
            });

            window.teraSupabase = client;
            console.log('✅ [supabase-client] تم إنشاء العميل بنجاح.');

            document.dispatchEvent(
                new CustomEvent('supabase:ready', { detail: { client } })
            );
        } catch (error) {
            console.error('❌ [supabase-client]', error);
            document.dispatchEvent(
                new CustomEvent('supabase:error', { detail: error })
            );
        }
    }

    // بدء التهيئة فوراً
    initSupabase();
})();
