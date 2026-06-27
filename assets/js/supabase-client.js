/**
 * /assets/js/supabase-client.js
 */
(function() {
    'use strict';
    const PROJECT_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXphdnJzZ2tmcHlwZ2V3cGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODkxMDUsImV4cCI6MjA5ODA2NTEwNX0.TzbZvdRnPuDyL5LVmSBLQYpYe7DgSJNtehKz5kE9uzc';

    function init() {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            window.teraSupabase = supabase.createClient(PROJECT_URL, ANON_KEY);
            console.log('✅ [supabase-client.js] تم ربط العميل المركزي.');
        } else {
            console.error('❌ Supabase غير موجود في window.supabase!');
        }
    }
    
    // محاولة فورية
    init();
})();
