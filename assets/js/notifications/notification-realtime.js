/**
 * ============================================================
 * notification-realtime.js – Supabase Realtime
 * ============================================================
 */

(function() {
    'use strict';

    if (window.__notificationRealtime) return;
    window.__notificationRealtime = true;

    let channel = null;

    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    async function start(userId, onInsert, onUpdate) {
        try {
            const sb = await getSupabase();
            if (!sb) throw new Error('Supabase not available');

            if (channel) {
                try { await sb.removeChannel(channel); } catch (e) { /* ignore */ }
                channel = null;
            }

            channel = sb
                .channel('notifications-realtime')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    if (onInsert && typeof onInsert === 'function') onInsert(payload.new);
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    if (onUpdate && typeof onUpdate === 'function') onUpdate(payload.new);
                })
                .subscribe((status) => {
                    console.log(`📡 Realtime status: ${status}`);
                });

            return true;
        } catch (err) {
            console.warn('⚠️ Realtime start error:', err);
            return false;
        }
    }

    async function stop() {
        try {
            if (channel) {
                const sb = await getSupabase();
                if (sb) await sb.removeChannel(channel);
                channel = null;
            }
            return true;
        } catch (err) {
            console.warn('⚠️ Realtime stop error:', err);
            return false;
        }
    }

    window.RealtimeManager = { start, stop };
    console.log('✅ notification-realtime.js ready');
})();
