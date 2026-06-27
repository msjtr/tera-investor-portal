/**
 * ============================================================
 * supabase-client.js - محرك الاتصال المركزي بـ Supabase
 * ============================================================
 * - يُهيئ عميل Supabase ويُخزنه في window.teraSupabase
 * - يُطلق حدث "supabase:ready" عند الجهوزية
 * - إذا تعذّر تحميل مكتبة Supabase من CDN، يقوم بتحميلها تلقائياً
 * - صُمم ليكون مستقلاً ويعمل في جميع الصفحات
 */
(function() {
    'use strict';

    // ========== بيانات مشروع Supabase ==========
    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXphdnJzZ2tmcHlwZ2V3cGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODkxMDUsImV4cCI6MjA5ODA2NTEwNX0.TzbZvdRnPuDyL5LVmSBLQYpYe7DgSJNtehKz5kE9uzc';

    /**
     * إنشاء العميل وتخزينه في النطاق العام، ثم إطلاق حدث الجاهزية
     */
    function createClientAndNotify() {
        window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
        console.log('✅ [supabase-client] تم تهيئة العميل المركزي بنجاح.');

        // إعلام جميع الملفات المنتظرة بأن العميل أصبح جاهزاً
        document.dispatchEvent(new CustomEvent('supabase:ready', {
            detail: { client: window.teraSupabase }
        }));
    }

    /**
     * محاولة تحميل المكتبة من رابط احتياطي في حالة فشل تحميلها من HTML
     */
    function loadFallbackLibrary() {
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
    // إذا كانت المكتبة محمّلة مسبقاً (من وسم <script> في HTML)
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        createClientAndNotify();
    } else {
        console.warn('⚠️ [supabase-client] مكتبة Supabase غير موجودة. جاري تحميل النسخة الاحتياطية...');
        loadFallbackLibrary();
    }
})();
