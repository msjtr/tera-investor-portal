/**
 * ============================================================
 * notification-api.js – الاتصال بـ Edge Functions
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
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (res.status === 401) {
                const token2 = await getAccessToken();
                if (!token2) throw new Error('Session expired');
                const retry = await fetch(`${FUNCTIONS_URL}/get-notifications`, {
                    headers: { 'Authorization': `Bearer ${token2}` }
                });
                if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
                return await retry.json();
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
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
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('❌ updateNotification error:', err);
            throw err;
        }
    }

    window.NotificationAPI = { fetchNotifications, updateNotification, getAccessToken };
    console.log('✅ notification-api.js ready');
})();
