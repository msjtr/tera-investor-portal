/**
 * ============================================================
 * notification-api.js – الاتصال بـ Edge Functions (مُحسّن)
 * ============================================================
 * هذا الملف سليم ولا يحتاج إلى تغيير، المشكلة في الدالة نفسها
 * ولكن تم تحسين معالجة الأخطاء هنا أيضاً
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationApi) return;
    window.__notificationApi = true;

    const FUNCTIONS_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1';

    // ─── الحصول على التوكن مع إعادة المحاولة ───
    async function getAccessToken(retries = 2) {
        try {
            const sb = window.teraSupabase || await window.waitForSupabase?.();
            if (!sb) return null;
            
            const { data: { session }, error } = await sb.auth.getSession();
            if (error || !session) {
                // محاولة تجديد الجلسة
                const { data: refreshData, error: refreshError } = await sb.auth.refreshSession();
                if (refreshError || !refreshData.session) {
                    if (retries > 0) {
                        console.warn(`⚠️ Retrying getAccessToken (${retries} attempts left)`);
                        await new Promise(r => setTimeout(r, 500));
                        return getAccessToken(retries - 1);
                    }
                    return null;
                }
                return refreshData.session.access_token;
            }
            return session.access_token;
        } catch (e) {
            console.warn('⚠️ getAccessToken error:', e);
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 500));
                return getAccessToken(retries - 1);
            }
            return null;
        }
    }

    // ─── جلب الإشعارات ───
    async function fetchNotifications() {
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('No token available');

            const res = await fetch(`${FUNCTIONS_URL}/get-notifications`, {
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                }
            });

            if (res.status === 401) {
                // محاولة تجديد التوكن وإعادة المحاولة مرة واحدة
                const token2 = await getAccessToken(3);
                if (!token2) throw new Error('Session expired');
                const retry = await fetch(`${FUNCTIONS_URL}/get-notifications`, {
                    headers: { 'Authorization': `Bearer ${token2}` }
                });
                if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
                return await retry.json();
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            return await res.json();
        } catch (err) {
            console.error('❌ fetchNotifications error:', err);
            throw err;
        }
    }

    // ─── تحديث إشعار ───
    async function updateNotification(id, updates) {
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('No token available');

            const res = await fetch(`${FUNCTIONS_URL}/update-notification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, ...updates })
            });

            // محاولة قراءة رسالة الخطأ من الخادم
            let errorMessage = `HTTP ${res.status}`;
            try {
                const errData = await res.json();
                if (errData.error) errorMessage = errData.error;
            } catch (e) { /* ignore */ }

            if (!res.ok) {
                console.error(`❌ updateNotification failed (${res.status}):`, errorMessage);
                throw new Error(errorMessage);
            }

            return await res.json();
        } catch (err) {
            console.error('❌ updateNotification error:', err);
            throw err;
        }
    }

    // ─── API العامة ───
    window.NotificationAPI = { 
        fetchNotifications, 
        updateNotification, 
        getAccessToken 
    };

    console.log('✅ notification-api.js ready');
})();
