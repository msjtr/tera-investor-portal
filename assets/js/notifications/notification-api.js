/**
 * ============================================================
 * notification-api.js – الاتصال بـ Edge Functions (مُحسّن)
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationApi) return;
    window.__notificationApi = true;

    const FUNCTIONS_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1';

    async function getAccessToken() {
        try {
            const sb = window.teraSupabase || await window.waitForSupabase?.();
            if (!sb) return null;
            const { data: { session }, error } = await sb.auth.getSession();
            if (error || !session) {
                const { data: refreshData, error: refreshError } = await sb.auth.refreshSession();
                if (refreshError || !refreshData.session) return null;
                return refreshData.session.access_token;
            }
            return session.access_token;
        } catch (e) {
            console.warn('⚠️ getAccessToken error:', e);
            return null;
        }
    }

    async function fetchNotifications() {
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('No token');

            const res = await fetch(`${FUNCTIONS_URL}/get-notifications`, {
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                }
            });

            // ✅ قراءة الاستجابة مرة واحدة فقط
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || `HTTP ${res.status}`);
            }

            return result;
        } catch (err) {
            console.error('❌ fetchNotifications error:', err);
            throw err;
        }
    }

    async function updateNotification(id, updates) {
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('No token');

            const res = await fetch(`${FUNCTIONS_URL}/update-notification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, ...updates })
            });

            // ✅ قراءة الاستجابة مرة واحدة فقط
            const result = await res.json();

            if (!res.ok) {
                // استخدام رسالة الخطأ من الخادم إذا كانت موجودة
                const errorMsg = result.error || result.message || `HTTP ${res.status}`;
                throw new Error(errorMsg);
            }

            return result;
        } catch (err) {
            console.error('❌ updateNotification error:', err);
            throw err;
        }
    }

    window.NotificationAPI = { 
        fetchNotifications, 
        updateNotification, 
        getAccessToken 
    };

    console.log('✅ notification-api.js ready');
})();
