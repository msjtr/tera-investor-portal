/**
 * منصة تيرا - محرك الاتصال المركزي بـ Supabase
 * تم تحديث المفتاح بتاريخ 2026-06-27
 */
(function() {
    'use strict';
    
    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXphdnJzZ2tmcHlwZ2V3cGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODkxMDUsImV4cCI6MjA5ODA2NTEwNX0.TzbZvdRnPuDyL5LVmSBLQYpYe7DgSJNtehKz5kE9uzc';

    if (window.supabase && typeof window.supabase.createClient === 'function') {
        window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
        console.log('✅ [supabase-client.js] تم تهيئة العميل المركزي بنجاح.');
    } else {
        console.error('❌ [supabase-client.js] مكتبة Supabase لم يتم تحميلها بعد.');
    }
})();
