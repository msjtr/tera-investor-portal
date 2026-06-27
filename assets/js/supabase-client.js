/**
 * منصة تيرا - محرك الاتصال المركزي بـ Supabase
 * يحمّل المكتبة تلقائياً إذا لم تكن موجودة، ثم ينشئ العميل ويُطلق حدث supabase:ready
 */
(function() {
    'use strict';

    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXphdnJzZ2tmcHlwZ2V3cGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODkxMDUsImV4cCI6MjA5ODA2NTEwNX0.TzbZvdRnPuDyL5LVmSBLQYpYe7DgSJNtehKz5kE9uzc';

    function createClientAndNotify() {
        window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
        console.log('✅ [supabase-client] تم تهيئة العميل المركزي.');
        document.dispatchEvent(new CustomEvent('supabase:ready', { detail: { client: window.teraSupabase } }));
    }

    if (window.supabase && typeof window.supabase.createClient === 'function') {
        createClientAndNotify();
    } else {
        console.warn('⚠️ [supabase-client] مكتبة Supabase غير موجودة. جاري تحميلها...');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        script.onload = () => {
            if (window.supabase) createClientAndNotify();
            else document.dispatchEvent(new CustomEvent('supabase:error'));
        };
        script.onerror = () => document.dispatchEvent(new CustomEvent('supabase:error'));
        document.head.appendChild(script);
    }
})();
