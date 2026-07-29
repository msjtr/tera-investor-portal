/**
 * ============================================================
 * notification-api.js – الاتصال بـ Edge Functions (مُحسّن)
 * متوافق مع نظام المصادقة الموحد using withAuth
 * ============================================================
 * 
 * ✅ يستخدم withAuth لتوحيد المصادقة
 * ✅ يعود تلقائياً إلى REST API إذا فشلت Edge Functions
 * ✅ معالجة أخطاء محسّنة
 */

(function() {
    'use strict';

    if (window.__notificationApi) return;
    window.__notificationApi = true;

    const FUNCTIONS_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1';

    // ─── دالة مساعدة للحصول على Supabase Client ───
    function getSupabaseClient() {
        if (window.teraSupabase) return window.teraSupabase;
        if (window.Support?.getSupabase) return window.Support.getSupabase();
        if (window.waitForSupabase) return window.waitForSupabase();
        if (window.supabase) return window.supabase;
        return null;
    }

    // ─── دالة withAuth الموحدة ───
    async function withAuth(callback) {
        const sb = getSupabaseClient();
        if (!sb) {
            console.warn('⚠️ [NotificationAPI] Supabase client not available');
            return null;
        }

        try {
            const { data: { session }, error } = await sb.auth.getSession();
            if (error || !session) {
                console.log('⏳ [NotificationAPI] No active session, skipping request');
                return null;
            }
            return await callback(session);
        } catch (e) {
            console.warn('⚠️ [NotificationAPI] withAuth error:', e.message);
            return null;
        }
    }

    // ─── الحصول على Access Token (للـ Edge Functions) ───
    async function getAccessToken() {
        const result = await withAuth(async (session) => {
            return session.access_token;
        });
        return result;
    }

    // ─── التحقق من وجود Edge Function ───
    async function isEdgeFunctionAvailable(functionName) {
        try {
            const token = await getAccessToken();
            if (!token) return false;
            
            const res = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
                method: 'HEAD',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // إذا كان 404، الدالة غير موجودة
            return res.status !== 404;
        } catch {
            return false;
        }
    }

    // ─── جلب الإشعارات عبر Edge Function ───
    async function fetchNotifications() {
        try {
            // التحقق من وجود الدالة أولاً (اختياري، يمكن تعطيله لتوفير طلب إضافي)
            // const available = await isEdgeFunctionAvailable('get-notifications');
            // if (!available) {
            //     console.log('ℹ️ [NotificationAPI] Edge Function not available, using REST API');
            //     return await fetchNotificationsDirect();
            // }

            const token = await getAccessToken();
            if (!token) {
                console.warn('⚠️ [NotificationAPI] No access token available');
                return null;
            }

            const res = await fetch(`${FUNCTIONS_URL}/get-notifications`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                }
            });

            // إذا كانت الدالة غير موجودة (404)، نعود مباشرة إلى REST API
            if (res.status === 404) {
                console.log('ℹ️ [NotificationAPI] Edge Function not found (404), using REST API');
                return await fetchNotificationsDirect();
            }

            const result = await res.json();

            if (!res.ok) {
                const errorMsg = result.error || result.message || `HTTP ${res.status}`;
                throw new Error(errorMsg);
            }

            return result;
        } catch (err) {
            console.error('❌ [NotificationAPI] fetchNotifications error:', err);
            console.warn('⚠️ [NotificationAPI] Falling back to direct REST API...');
            return await fetchNotificationsDirect();
        }
    }

    // ─── جلب الإشعارات مباشرة عبر REST API (بديل احتياطي) ───
    async function fetchNotificationsDirect() {
        return withAuth(async (session) => {
            const sb = getSupabaseClient();
            if (!sb) throw new Error('Supabase client not available');

            const { data, error } = await sb
                .from('notifications')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data;
        });
    }

    // ─── تحديث إشعار عبر Edge Function ───
    async function updateNotification(id, updates) {
        try {
            const token = await getAccessToken();
            if (!token) {
                console.warn('⚠️ [NotificationAPI] No access token available');
                return null;
            }

            const res = await fetch(`${FUNCTIONS_URL}/update-notification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, ...updates })
            });

            // إذا كانت الدالة غير موجودة (404)، نعود مباشرة إلى REST API
            if (res.status === 404) {
                console.log('ℹ️ [NotificationAPI] Edge Function not found (404), using REST API');
                return await updateNotificationDirect(id, updates);
            }

            const result = await res.json();

            if (!res.ok) {
                const errorMsg = result.error || result.message || `HTTP ${res.status}`;
                throw new Error(errorMsg);
            }

            return result;
        } catch (err) {
            console.error('❌ [NotificationAPI] updateNotification error:', err);
            console.warn('⚠️ [NotificationAPI] Falling back to direct REST API for update...');
            return await updateNotificationDirect(id, updates);
        }
    }

    // ─── تحديث إشعار مباشرة عبر REST API (بديل احتياطي) ───
    async function updateNotificationDirect(id, updates) {
        return withAuth(async (session) => {
            const sb = getSupabaseClient();
            if (!sb) throw new Error('Supabase client not available');

            // إزالة id من updates لأنه لا يجب تحديثه
            const { id: _, ...updateData } = updates;

            const { data, error } = await sb
                .from('notifications')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', session.user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        });
    }

    // ─── تصدير الكائن العام ───
    window.NotificationAPI = { 
        fetchNotifications,
        updateNotification,
        getAccessToken,
        fetchNotificationsDirect,
        updateNotificationDirect,
        isEdgeFunctionAvailable // للاستخدام الاختياري
    };

    console.log('✅ notification-api.js ready (with fallback to REST API)');
})();
