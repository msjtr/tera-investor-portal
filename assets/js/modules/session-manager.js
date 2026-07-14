/**
 * modules/session-manager.js – إدارة جلسات متكاملة وآمنة
 * - إنهاء الجلسات القديمة واحدة تلو الأخرى لتفادي مشاكل RLS
 * - تخزين بيانات الموقع كاملة (من LocationIQ) + الجهاز + المتصفح
 * - دعم أقسام core / address_components / additional
 */
(function() {
    'use strict';

    async function getSupabase() {
        return window.teraSupabase || await window.waitForSupabase?.();
    }

    // ───────────────────────────────────────
    // 1. جلب جميع جلسات المستخدم
    // ───────────────────────────────────────
    async function fetchSessions(userId) {
        const sb = await getSupabase();
        if (!sb) return [];
        const { data, error } = await sb.from('user_login_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('login_at', { ascending: false });
        if (error) {
            console.error('فشل جلب الجلسات:', error);
            return [];
        }
        return data || [];
    }

    // ───────────────────────────────────────
    // 2. إنهاء جلسة واحدة (يدوياً)
    // ───────────────────────────────────────
    async function terminateSession(sessionId, userId) {
        const sb = await getSupabase();
        if (!sb) return { success: false, error: 'Supabase غير متوفر' };
        const { error } = await sb.from('user_login_sessions')
            .update({
                status: 'terminated_by_user',
                logout_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .eq('user_id', userId);
        if (error) {
            console.error('فشل إنهاء الجلسة:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    // ───────────────────────────────────────
    // 3. إنهاء جميع الجلسات النشطة السابقة (ما عدا الحالية)
    //    تُنفذ واحدة تلو الأخرى لتجنب مشاكل RLS الجماعية
    // ───────────────────────────────────────
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

        let allTerminated = true;
        for (const session of activeSessions) {
            const { error: updateError } = await sb.from('user_login_sessions')
                .update({
                    status: 'terminated_by_system',
                    logout_at: new Date().toISOString()
                })
                .eq('id', session.id)
                .eq('user_id', userId);
            if (updateError) {
                console.error('فشل إنهاء الجلسة:', session.id, updateError);
                allTerminated = false;
            }
        }
        return allTerminated;
    }

    // ───────────────────────────────────────
    // 4. إنشاء سجل جلسة جديد (الوظيفة الرئيسية)
    // ───────────────────────────────────────
    async function createSessionRecord(userId, extraData = {}) {
        const sb = await getSupabase();
        if (!sb) return false;

        // 4.1 إنهاء الجلسات القديمة النشطة
        await deactivateAllActiveSessions(userId);

        // 4.2 جمع معلومات الجهاز والمتصفح
        let deviceInfo = {};
        try {
            if (window.DeviceInfo && window.DeviceInfo.getDeviceAndBrowserInfo) {
                deviceInfo = window.DeviceInfo.getDeviceAndBrowserInfo();
            }
        } catch (e) {
            console.warn('تعذر جمع معلومات الجهاز:', e);
        }

        // 4.3 استخراج بيانات الموقع (من Geo IP و LocationIQ و GPS)
        const geo = extraData.geo || {};
        const full = extraData.locationIQ || {};   // كائن fetchLocationIQFull
        const gps = extraData.gps || {};

        // استخدام الأقسام الجديدة من location-services إن وجدت
        const core = full.core || {};
        const addrComp = full.address_components || {};
        const addl = full.additional || {};

        // تجميع الحقول النهائية (مع أفضل بيانات متاحة)
        const finalLat = full.latitude || full.lat || gps.latitude || geo.lat || null;
        const finalLon = full.longitude || full.lon || gps.longitude || geo.lon || null;
        const finalCity = addrComp.city || full.city || geo.city || null;
        const finalCountry = addrComp.country || full.country || geo.country || null;
        const finalState = addrComp.state || full.state || null;
        const finalPostcode = addrComp.postcode || full.postcode || null;
        const finalRoad = addrComp.road || full.road || null;
        const finalHouseNumber = addrComp.house_number || full.house_number || null;
        const finalSuburb = addrComp.suburb || full.suburb || null;
        const finalQuarter = addrComp.quarter || full.quarter || null;
        const finalGovernment = addrComp.government || full.government || null;
        const finalDistrict = full.district || addrComp.suburb || addrComp.quarter || null;
        const finalNeighbourhood = full.neighbourhood || addrComp.suburb || null;
        const finalProvince = full.province || full.state || null;
        const finalDisplayName = core.display_name || full.display_name || null;

        // 4.4 بناء كائن الجلسة (يحتوي فقط على الأعمدة الموجودة في الجدول)
        const record = {
            user_id: userId,
            session_number: generateSessionNumber(),
            login_at: new Date().toISOString(),
            status: 'active',
            is_current_session: true,

            // معلومات IP والموقع الجغرافي
            ip_address: geo.ip || extraData.ip || null,
            isp: geo.isp || null,
            country: finalCountry,
            country_code: full.country_code || geo.country_code || null,
            city: finalCity,
            state: finalState,
            postal_code: finalPostcode,
            province: finalProvince,
            district: finalDistrict,
            neighbourhood: finalNeighbourhood,
            road: finalRoad,
            house_number: finalHouseNumber,
            quarter: finalQuarter,
            government: finalGovernment,
            display_name: finalDisplayName,
            latitude: finalLat,
            longitude: finalLon,

            // الحقول الإضافية من LocationIQ (إن كانت أعمدتها موجودة)
            place_id: core.place_id || full.place_id || null,
            licence: core.licence || full.licence || null,
            osm_type: core.osm_type || full.osm_type || null,
            osm_id: core.osm_id || full.osm_id || null,
            match_code: full.match_code || (addl.matchquality ? addl.matchquality.matchcode : null) || null,
            match_type: full.match_type || (addl.matchquality ? addl.matchquality.matchtype : null) || null,
            match_level: full.match_level || (addl.matchquality ? addl.matchquality.matchlevel : null) || null,
            boundingbox: full.boundingbox || (addl.boundingbox) || null, // قد يكون مصفوفة، يمكن تحويلها إلى نص

            // الوقت والمنطقة الزمنية
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,

            // علامات الأمان
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
            cpu_architecture: deviceInfo.cpu_cores || null,   // ملاحظة: نستخدم cpu_cores من DeviceInfo كمقاربة
            device_memory: deviceInfo.device_memory || null,
            touch_supported: deviceInfo.touch_supported || null,
            cookies_enabled: deviceInfo.cookies_enabled || null,
            local_storage: deviceInfo.local_storage || null,
            session_storage: deviceInfo.session_storage || null,
            indexed_db: deviceInfo.indexed_db || null,
            webgl_supported: deviceInfo.webgl_supported || null,
            fingerprint: deviceInfo.fingerprint || null,
            network_type: deviceInfo.network_type || null
        };

        // 4.5 إزالة أي حقول قيمتها `undefined` قبل الإدراج (Supabase يرفضها)
        Object.keys(record).forEach(key => {
            if (record[key] === undefined) {
                delete record[key];
            }
        });

        // 4.6 تحويل boundingbox من مصفوفة إلى نص إذا لزم (حسب نوع العمود)
        if (Array.isArray(record.boundingbox)) {
            record.boundingbox = record.boundingbox.join(',');
        }

        // 4.7 الإدراج في قاعدة البيانات
        const { error } = await sb.from('user_login_sessions').insert(record);
        if (error) {
            console.error('❌ فشل تسجيل الجلسة:', error);
            return false;
        }
        console.log('✅ تم تسجيل الجلسة بنجاح');
        return true;
    }

    // ───────────────────────────────────────
    // 5. توليد رقم جلسة فريد (مثال: SES-A7X9K2)
    // ───────────────────────────────────────
    function generateSessionNumber() {
        const timestamp = Date.now().toString(36).toUpperCase(); // تحويل الوقت إلى قاعدة 36
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 أحرف عشوائية
        return `SES-${timestamp}-${randomPart}`;
    }

    // ───────────────────────────────────────
    // 6. واجهة عامة (باسمين متناسقين)
    // ───────────────────────────────────────
    window.SessionManager = {
        fetchSessions,
        terminateSession,
        deactivateOtherSessions: deactivateAllActiveSessions,   // الإسم المستخدم خارجياً
        createSessionRecord
    };
})();
