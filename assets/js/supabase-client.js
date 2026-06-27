/**
 * منصة تيرا - محرك الاتصال المركزي بـ Supabase
 * تم تحديث الملف لضمان التوافر اللحظي لـ window.teraSupabase
 */
(function() {
    'use strict';
    
    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXphdnJzZ2tmcHlwZ2V3cGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODkxMDUsImV4cCI6MjA5ODA2NTEwNX0.TzbZvdRnPuDyL5LVmSBLQYpYe7DgSJNtehKz5kE9uzc';

    // دالة إنشاء العميل
    function createTeraClient() {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
            console.log('✅ [supabase-client.js] تم تهيئة العميل المركزي بنجاح.');
            
            // إطلاق حدث خاص لإبلاغ الملفات الأخرى بأن العميل جاهز
            window.dispatchEvent(new CustomEvent('teraSupabaseReady'));
            return true;
        }
        return false;
    }

    // محاولة فورية
    if (!createTeraClient()) {
        // إذا فشلت، نحاول الانتظار بضع أجزاء من الثانية
        const check = setInterval(() => {
            if (createTeraClient()) {
                clearInterval(check);
            }
        }, 50);
        
        // إيقاف المحاولة بعد 3 ثواني
        setTimeout(() => clearInterval(check), 3000);
    }
})();
