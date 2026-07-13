/**
 * modules/session-manager.js – آمن (يُدرج الحقول الموجودة فقط)
 * - إنهاء الجلسات القديمة واحدة تلو الأخرى لتجنب مشاكل RLS
 * - تخزين بيانات الموقع الأساسية + الجهاز + المتصفح
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
     * إنهاء جميع الجلسات النشطة السابقة (باستثناء الجلسة الحالية)
     * تُنفذ واحدة تلو الأخرى لتفادي مشاكل RLS الجماعية.
     */
    async function deactivateAllActiveSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return false;

        // جلب الجلسات النشطة أولاً
        const { data: activeSessions, error } = await sb.from('user_login_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (error) {
            console.error('فشل جلب الجلسات النشطة:', error);
            return false;
        }

        if (!activeSessions || activeSessions.length === 0) return true;

        // إنهاء كل واحدة على حدة (أكثر أمانًا مع RLS)
        let allTerminated = true;
        for (const session of activeSessions) {
            const { error: updateError } = await sb.from('user_login_sessions')
                .update({ status: 'terminated_by_system', logout_at: new Date().toISOString() })
                .eq('id', session.id)
                .eq('user_id', userId);

            if (updateError) {
                console.error('فشل إنهاء الجلسة:', session.id, updateError);
                allTerminated = false;
                // نستمر رغم الخطأ لإنهاء البقية
            }
        }

        if (allTerminated) {
            console.log('✅ تم إنهاء جميع الجلسات النشطة السابقة');
        } else {
            console.warn('⚠️ بعض الجلسات القديمة لم تُنهَ بنجاح');
        }

        return allTerminated;
    }

    /**
     * إنشاء سجل جلسة – يُدرج الحقول الموجودة في قاعدة البيانات فقط
     */
    async function createSessionRecord(userId, extraData = {}) {
        const sb = await getSupabase();
        if (!sb) return false;

        // 1. إنهاء الجلسات القديمة
        await deactivateAllActiveSessions(userId);

        // 2. معلومات الجهاز
        let deviceInfo = {};
        try {
            deviceInfo = (window.DeviceInfo && window.DeviceInfo.getDeviceAndBrowserInfo) ?
                window.DeviceInfo.getDeviceAndBrowserInfo() : {};
        } catch (e) {}

        const geo = extraData.geo || {};
        const full = extraData.locationIQ || {};
        const gps = extraData.gps || {};

        const finalCity = full.city || geo.city || null;
        const finalCountry = full.country || geo.country || null;
        const finalLat = full.latitude || gps.latitude || geo.lat || null;
        const finalLon = full.longitude || gps.longitude || geo.lon || null;

        // سجل أساسي (يحتوي فقط على الأعمدة المضمونة في جدولك الحالي)
        const record = {
            user_id: userId,
            session_number: 'SES-' + Date.now().toString(36).toUpperCase(),
            login_at: new Date().toISOString(),
            status: 'active',
            ip_address: geo.ip || extraData.ip || null,
            isp: geo.isp || null,
            country: finalCountry,
            country_code: full.country_code || geo.country_code || null,
            city: finalCity,
            district: full.district || null,
            neighbourhood: full.neighbourhood || null,
            province: full.province || null,
            state: full.state || null,
            postal_code: full.postcode || null,
            display_name: full.display_name || null,
            latitude: finalLat,
            longitude: finalLon,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
            vpn_detected: geo.proxy || false,
            proxy_detected: geo.proxy || false,
            hosting_detected: geo.hosting || false,

            // الجهاز والمتصفح
            device_type: deviceInfo.device_type || null,
            browser_name: deviceInfo.browser_name || null,
            browser_version: deviceInfo.browser_version || null,
            user_agent: deviceInfo.user_agent || null,
            operating_system: deviceInfo.operating_system || null,
            os_version: deviceInfo.os_version || null,
            platform: deviceInfo.platform || null,
            language: deviceInfo.language || null,
            screen_resolution: deviceInfo.screen_resolution || null,
            pixel_ratio: deviceInfo.pixel_ratio || null,
            color_depth: deviceInfo.color_depth || null,
            cpu_architecture: deviceInfo.cpu_cores || null,
            device_memory: deviceInfo.device_memory || null,
            touch_supported: deviceInfo.touch_supported || null,
            cookies_enabled: deviceInfo.cookies_enabled || null,
            local_storage: deviceInfo.local_storage || null,
            session_storage: deviceInfo.session_storage || null,
            indexed_db: deviceInfo.indexed_db || null,
            webgl_supported: deviceInfo.webgl_supported || null,
            fingerprint: deviceInfo.fingerprint || null,
            network_type: deviceInfo.network_type || null,
            is_current_session: true
        };

        const { error } = await sb.from('user_login_sessions').insert(record);
        if (error) {
            console.error('❌ فشل تسجيل الجلسة:', error);
            return false;
        }
        console.log('✅ تم تسجيل الجلسة بنجاح');
        return true;
    }

    window.SessionManager = {
        fetchSessions,
        terminateSession,
        deactivateOtherSessions: deactivateAllActiveSessions,
        createSessionRecord
    };
})();
