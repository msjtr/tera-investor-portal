/**
 * منصة تيرا - محرك الاتصال المركزي بـ Supabase
 * 
 * الميزات:
 * - يتحقق من وجود مكتبة Supabase، وإذا لم تكن موجودة يحمّلها تلقائياً من unpkg.
 * - ينشئ العميل ويُخزنه في window.teraSupabase.
 * - يُطلق حدث "supabase:ready" لتتمكن بقية الملفات من بدء العمل فور الجاهزية.
 * - في حال تعذّر التحميل يُطلق "supabase:error" لإعلام المستخدم.
 */
(function() {
    'use strict';

    // ========== بيانات مشروع Supabase ==========
    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXphdnJzZ2tmcHlwZ2V3cGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODkxMDUsImV4cCI6MjA5ODA2NTEwNX0.TzbZvdRnPuDyL5LVmSBLQYpYe7DgSJNtehKz5kE9uzc';

    // ========== دوال مساعدة ==========
    /**
     * إنشاء العميل وتخزينه وإطلاق حدث الجاهزية
     */
    function createClientAndNotify() {
        window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
        console.log('✅ [supabase-client.js] تم تهيئة العميل المركزي بنجاح.');

        // إعلام جميع الملفات المنتظرة
        document.dispatchEvent(new CustomEvent('supabase:ready', {
            detail: { client: window.teraSupabase }
        }));
    }

    /**
     * محاولة تحميل المكتبة من رابط معين
     */
    function loadLibrary(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('فشل تحميل السكريبت: ' + src));
            document.head.appendChild(script);
        });
    }

    // ========== المنطق الرئيسي ==========
    async function init() {
        // إذا كانت المكتبة موجودة مسبقاً (تم تحميلها في HTML)
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            createClientAndNotify();
            return;
        }

        console.warn('⚠️ [supabase-client.js] مكتبة Supabase غير موجودة. جاري تحميلها تلقائياً...');

        // روابط CDN المحتملة (نبدأ بالأكثر توافقاً)
        const cdnLinks = [
            'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js',
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
        ];

        let loaded = false;
        for (const link of cdnLinks) {
            try {
                await loadLibrary(link);
                loaded = true;
                console.log('✅ [supabase-client.js] تم تحميل المكتبة من: ' + link);
                break;
            } catch (err) {
                console.warn('⚠️ [supabase-client.js] فشل التحميل من: ' + link);
            }
        }

        if (loaded && window.supabase && typeof window.supabase.createClient === 'function') {
            createClientAndNotify();
        } else {
            console.error('❌ [supabase-client.js] تعذر تحميل مكتبة Supabase من جميع الروابط.');
            document.dispatchEvent(new CustomEvent('supabase:error'));
        }
    }

    // بدء العملية فوراً
    init();
})();
