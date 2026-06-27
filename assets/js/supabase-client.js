/**
 * منصة تيرا - محرك الاتصال المركزي بـ Supabase
 * تم تحديث المفتاح وتفعيل الاتصال المركزي مع انتظار تحميل المكتبة
 */
(function() {
    'use strict';
    
    // عنوان المشروع المعتمد
    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    
    // مفتاح الوصول العام (تم تحديثه)
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXphdnJzZ2tmcHlwZ2V3cGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODkxMDUsImV4cCI6MjA5ODA2NTEwNX0.TzbZvdRnPuDyL5LVmSBLQYpYe7DgSJNtehKz5kE9uzc';

    /**
     * محاولة تهيئة العميل بعد التأكد من تحميل مكتبة Supabase
     */
    function initSupabaseClient() {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            window.teraSupabase = window.supabase.createClient(PROJECT_URL, ANON_KEY);
            console.log('✅ [supabase-client.js] تم تهيئة العميل المركزي بنجاح.');
            return true;
        }
        return false;
    }

    // إذا كانت المكتبة محملة مسبقاً، قم بالتهيئة فوراً
    if (initSupabaseClient()) {
        return;
    }

    // وإلا ننتظرها حتى تصبح جاهزة (بحد أقصى 10 ثوانٍ)
    let attempts = 0;
    const maxAttempts = 20; // 20 * 500ms = 10 ثوانٍ
    const interval = setInterval(function() {
        attempts++;
        if (initSupabaseClient()) {
            clearInterval(interval);
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.error('❌ [supabase-client.js] فشل تحميل مكتبة Supabase بعد عدة محاولات. تأكد من اتصال الإنترنت وصحة رابط CDN.');
        }
    }, 500);
})();
