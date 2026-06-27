/**
 * منصة تيرا - محرك الاتصال المركزي بـ Supabase
 * (مع إضافة آلية انتظار تحميل المكتبة)
 */
(function() {
    'use strict';

    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXphdnJzZ2tmcHlwZ2V3cGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODkxMDUsImV4cCI6MjA5ODA2NTEwNX0.TzbZvdRnPuDyL5LVmSBLQYpYe7DgSJNtehKz5kE9uzc';

    // دالة محاولة الاتصال
    function initSupabase() {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
            console.log('✅ [supabase-client.js] تم تهيئة العميل المركزي بنجاح.');
            return true;
        }
        return false;
    }

    // إذا لم تكن المكتبة محملة، ننتظر قليلاً ثم نحاول
    if (!initSupabase()) {
        const interval = setInterval(() => {
            if (initSupabase()) {
                clearInterval(interval);
            }
        }, 100); // يحاول كل 100 مللي ثانية
        
        // يتوقف بعد 5 ثواني إذا لم يتم التحميل
        setTimeout(() => clearInterval(interval), 5000);
    }
})();
