/**
 * ============================================================
 * supabase-client.js - محرك الاتصال المركزي بـ Supabase (Enterprise v3.1)
 * ============================================================
 * - يُهيئ عميل Supabase ويُخزنه في window.teraSupabase
 * - يُطلق حدث "supabase:ready" عند الجهوزية
 * - يوفر دالة window.getTeraSupabase() لضمان جلب العميل بأمان
 * - يتضمن مفاتيح الوصول والربط المباشر مع خوادم المنصة
 * - يحدد schema: 'public' بشكل افتراضي لجميع الاستعلامات
 */
(function() {
    'use strict';

    // ========== بيانات مشروع Supabase ==========
    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXphdnJzZ2tmcHlwZ2V3cGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODkxMDUsImV4cCI6MjA5ODA2NTEwNX0.TzbZvdRnPuDyL5LVmSBLQYpYe7DgSJNtehKz5kE9uzc';
    
    // مفتاح النشر السري المعتمد
    const PUBLISHABLE_SECRET = 'sb_publishable_QYc4AcGWtJGxalINA_UGZw_fjfVbGqg';

    // منع تكرار التهيئة إذا تم استدعاء الملف أكثر من مرة
    if (window.teraSupabase) return;

    let isInitializing = false;

    /**
     * دالة مساعدة لضمان الحصول على العميل (Client) بشكل آمن من أي ملف آخر
     */
    window.getTeraSupabase = function() {
        return new Promise((resolve, reject) => {
            if (window.teraSupabase) {
                resolve(window.teraSupabase);
                return;
            }

            const onReady = (e) => {
                document.removeEventListener('supabase:ready', onReady);
                document.removeEventListener('supabase:error', onError);
                resolve(e.detail.client);
            };

            const onError = () => {
                document.removeEventListener('supabase:ready', onReady);
                document.removeEventListener('supabase:error', onError);
                reject(new Error('فشل تهيئة Supabase'));
            };

            document.addEventListener('supabase:ready', onReady);
            document.addEventListener('supabase:error', onError);
        });
    };

    /**
     * إنشاء العميل وتخزينه في النطاق العام، ثم إطلاق حدث الجاهزية
     */
    function createClientAndNotify() {
        window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY, {
            db: {
                schema: 'public'  // يضمن استهداف سكيما public تلقائياً
            },
            global: {
                headers: {
                    'x-publishable-key': PUBLISHABLE_SECRET
                }
            }
        });
        
        console.log('✅ [supabase-client] تم تهيئة العميل المركزي بنجاح.');

        document.dispatchEvent(new CustomEvent('supabase:ready', {
            detail: { client: window.teraSupabase }
        }));
    }

    /**
     * محاولة تحميل المكتبة من رابط احتياطي في حالة فشل تحميلها من HTML
     */
    function loadFallbackLibrary() {
        if (isInitializing) return;
        isInitializing = true;

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        script.onload = () => {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                createClientAndNotify();
            } else {
                console.error('❌ [supabase-client] تم تحميل المكتبة الاحتياطية ولكن دون وظيفة createClient');
                document.dispatchEvent(new CustomEvent('supabase:error'));
            }
        };
        script.onerror = () => {
            console.error('❌ [supabase-client] فشل تحميل المكتبة الاحتياطية');
            document.dispatchEvent(new CustomEvent('supabase:error'));
        };
        document.head.appendChild(script);
    }

    // ========== المنطق الرئيسي ==========
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        createClientAndNotify();
    } else {
        console.warn('⚠️ [supabase-client] مكتبة Supabase غير موجودة. جاري تحميل النسخة الاحتياطية...');
        loadFallbackLibrary();
    }
})();
