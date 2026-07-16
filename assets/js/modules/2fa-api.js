/**
 * واجهة API للمصادقة الثنائية (RPC calls)
 * يعتمد على window.supabase من supabase-client.js
 */
(function() {
    'use strict';
    const supabase = window.supabase;

    window.TwoFactorAPI = {
        async fetchStatus() {
            const { data, error } = await supabase.rpc('get_2fa_status');
            if (error) throw error;
            return data;
        },
        async getSetupSecret() {
            const { data, error } = await supabase.rpc('setup_2fa');
            if (error) throw error;
            return data;
        },
        async enable(token) {
            const { data, error } = await supabase.rpc('enable_2fa', { verification_token: token });
            if (error) throw error;
            return data;
        },
        async disable(token) {
            const { data, error } = await supabase.rpc('disable_2fa', { verification_token: token });
            if (error) throw error;
            return data;
        },
        async regenerateCodes(token) {
            const { data, error } = await supabase.rpc('regenerate_backup_codes', { verification_token: token });
            if (error) throw error;
            return data;
        },
        async removeDevice(deviceId) {
            const { data, error } = await supabase.rpc('remove_trusted_device', { device_id: deviceId });
            if (error) throw error;
            return data;
        }
    };
})();
