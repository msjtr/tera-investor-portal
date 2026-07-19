/**
 * ============================================================
 * notification-realtime.js – Supabase Realtime
 * ============================================================
 * يستمع لتغييرات الإشعارات في الوقت الفعلي
 */

(function() {
    'use strict';

    if (window.__notificationRealtime) return;
    window.__notificationRealtime = true;

    let channel = null;
    let isConnected = false;

    // ─── الحصول على Supabase ───
    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    // ─── بدء الاستماع ───
    async function startListening(userId, onInsert, onUpdate) {
        try {
            const sb = await getSupabase();
            if (!sb) throw new Error('Supabase not available');

            if (channel) {
                await sb.removeChannel(channel);
                channel = null;
            }

            channel = sb
                .channel('notifications-realtime')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`
                    },
                    (payload) => {
                        if (onInsert && typeof onInsert === 'function') {
                            onInsert(payload.new);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`
                    },
                    (payload) => {
                        if (onUpdate && typeof onUpdate === 'function') {
                            onUpdate(payload.new);
                        }
                    }
                )
                .subscribe((status) => {
                    isConnected = status === 'SUBSCRIBED';
                    console.log(`📡 Realtime status: ${status}`);
                });

            return true;
        } catch (err) {
            console.error('❌ Realtime error:', err);
            return false;
        }
    }

    // ─── إيقاف الاستماع ───
    async function stopListening() {
        try {
            if (channel) {
                const sb = await getSupabase();
                if (sb) {
                    await sb.removeChannel(channel);
                }
                channel = null;
                isConnected = false;
            }
            return true;
        } catch (err) {
            console.warn('⚠️ Realtime stop error:', err);
            return false;
        }
    }

    // ─── API العامة ───
    window.RealtimeManager = {
        start: startListening,
        stop: stopListening,
        isConnected: () => isConnected
    };

    console.log('✅ notification-realtime.js ready');

})();
