/**
 * ============================================================
 * notification-api.js – الاتصال بـ Edge Functions فقط
 * ============================================================
 * جميع الاستعلامات تمر عبر Edge Functions
 */

(function() {
    'use strict';

    if (window.__notificationApi) return;
    window.__notificationApi = true;

    const SUPABASE_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co';
    const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

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
            console.warn('⚠️ فشل جلب التوكن:', e);
            return null;
        }
    }

    async function fetchNotifications() {
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('لا يوجد توكن صالح');

            const response = await fetch(`${FUNCTIONS_URL}/get-notifications`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                const token2 = await getAccessToken();
                if (!token2) throw new Error('انتهت الجلسة');
                const retryResponse = await fetch(`${FUNCTIONS_URL}/get-notifications`, {
                    headers: { 'Authorization': `Bearer ${token2}` }
                });
                if (!retryResponse.ok) {
                    const err = await retryResponse.json().catch(() => ({}));
                    throw new Error(err.error || `HTTP ${retryResponse.status}`);
                }
                return await retryResponse.json();
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            console.error('❌ فشل جلب الإشعارات:', err);
            throw err;
        }
    }

    async function updateNotification(id, updates) {
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('لا يوجد توكن صالح');

            const response = await fetch(`${FUNCTIONS_URL}/update-notification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, ...updates })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            console.error('❌ فشل تحديث الإشعار:', err);
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
