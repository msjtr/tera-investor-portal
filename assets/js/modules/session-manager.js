/**
 * modules/session-manager.js - إدارة جلسات المستخدم (محسّن)
 * - إنهاء آمن مع رسائل خطأ
 * - دالة لإنهاء جميع الجلسات الأخرى عند إنشاء جلسة جديدة (اختياري)
 */
(function() {
    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    async function fetchSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return [];
        const { data, error } = await sb.from('user_login_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('login_at', { ascending: false });
        if (error) { console.error('فشل جلب الجلسات:', error); return []; }
        return data || [];
    }

    /**
     * إنهاء جلسة محددة
     * @returns {object} { success: boolean, error?: string }
     */
    async function terminateSession(sessionId, userId) {
        const sb = await getSupabase();
        if (!sb) return { success: false, error: 'Supabase غير متوفر' };
        const { error } = await sb.from('user_login_sessions')
            .update({ status: 'terminated_by_user', logout_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', userId);
        if (error) {
            console.error('فشل إنهاء الجلسة:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    /**
     * إنهاء جميع الجلسات النشطة للمستخدم ما عدا الجلسة المحددة (أو كلها إذا omitId=null)
     * @param {string} userId
     * @param {string?} omitSessionId - جلسة نستثنيها من الإنهاء (مثلاً الجلسة الحالية)
     */
    async function deactivateOtherSessions(userId, omitSessionId = null) {
        const sb = await getSupabase();
        if (!sb) return false;
        let query = sb.from('user_login_sessions')
            .update({ status: 'terminated_by_system', logout_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active');
        if (omitSessionId) {
            query = query.neq('id', omitSessionId);
        }
        const { error } = await query;
        if (error) {
            console.error('فشل إنهاء الجلسات الأخرى:', error);
            return false;
        }
        return true;
    }

    async function createSessionRecord(userId, extraData = {}) {
        const sb = await getSupabase();
        if (!sb) return false;
        const deviceInfo = window.DeviceInfo?.getDeviceAndBrowserInfo() || {};
        const geo = extraData.geo || {};
        const loc = extraData.locationIQ || {};
        const gps = extraData.gps || {};

        const finalCity = loc.city || geo.city || null;
        const finalCountry = geo.country || null;
        const finalLat = gps.latitude || geo.lat || null;
        const finalLon = gps.longitude || geo.lon || null;

        const record = {
            user_id: userId,
            session_number: 'SES-' + Date.now().toString(36).toUpperCase(),
            login_at: new Date().toISOString(),
            status: 'active',
            ip_address: geo.ip || extraData.ip || 'غير معروف',
            isp: geo.isp || null,
            country: finalCountry,
            country_code: geo.country_code || null,
            city: finalCity,
            district: loc.neighbourhood || loc.district || null,
            neighbourhood: loc.neighbourhood || null,
            province: loc.province || null,
            state: loc.state || null,
            postal_code: loc.postal_code || null,
            display_name: loc.display_name || null,
            latitude: finalLat,
            longitude: finalLon,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
            vpn_detected: geo.proxy || false,
            proxy_detected: geo.proxy || false,
            hosting_detected: geo.hosting || false,
            device_type: deviceInfo.device_type,
            browser_name: deviceInfo.browser_name,
            browser_version: deviceInfo.browser_version,
            user_agent: deviceInfo.user_agent,
            operating_system: deviceInfo.operating_system,
            os_version: deviceInfo.os_version,
            platform: deviceInfo.platform,
            language: deviceInfo.language,
            screen_resolution: deviceInfo.screen_resolution,
            pixel_ratio: deviceInfo.pixel_ratio,
            color_depth: deviceInfo.color_depth,
            cpu_architecture: deviceInfo.cpu_cores || null,
            device_memory: deviceInfo.device_memory,
            touch_supported: deviceInfo.touch_supported,
            cookies_enabled: deviceInfo.cookies_enabled,
            local_storage: deviceInfo.local_storage,
            session_storage: deviceInfo.session_storage,
            indexed_db: deviceInfo.indexed_db,
            webgl_supported: deviceInfo.webgl_supported,
            fingerprint: deviceInfo.fingerprint,
            network_type: deviceInfo.network_type || null,
            is_current_session: true
        };

        const { error } = await sb.from('user_login_sessions').insert(record);
        if (error) { console.error('❌ فشل تسجيل الجلسة:', error); return false; }
        console.log('✅ تم تسجيل الجلسة بنجاح');
        return true;
    }

    window.SessionManager = {
        fetchSessions,
        terminateSession,
        deactivateOtherSessions,   // ← الجديد
        createSessionRecord
    };
})();
