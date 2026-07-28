/**
 * auth.js – v32 (محسّن للتعامل مع OneSignal v16 وتفادي 409 Conflict)
 * 
 * الميزات:
 * - تخزين اسم العميل تلقائياً (otpName) في sessionStorage
 * - دعم تسجيل الدخول بكلمة المرور والمصادقة الثنائية (TOTP)
 * - إدارة الجلسات مع تجديد التوكن تلقائياً
 * - دوال مساعدة للتحقق من صحة البريد الإلكتروني وكلمة المرور
 * - تكامل مع SessionManager و ActivityTracker
 * - دعم تسجيل الخروج الآمن مع تنظيف شامل
 * - تحسينات الأمان والأداء
 * - دمج OneSignal v16 باستخدام login/logout بدلاً من addAlias
 * - معالجة خطأ 409 Conflict عند تعيين external_id
 */

(function() {
    'use strict';

    // ─── متغيرات خاصة ───
    let supabaseInstance = null;
    let currentUser = null;
    let currentUserCacheTime = 0;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
    let sessionRefreshInterval = null;
    const REFRESH_INTERVAL = 4 * 60 * 1000; // 4 دقائق
    let lastPushRegisteredUserId = null; // منع تكرار تسجيل OneSignal
    let isRegisteringPush = false; // منع التنفيذ المتزامن

    // ─── المفاتيح المحفوظة في sessionStorage ───
    const STORAGE_KEYS = {
        OTP_NAME: 'otpName',
        USER_EMAIL: 'userEmail',
        LOGIN_ATTEMPTS: 'loginAttempts',
        USER_LAT: 'userLat',
        USER_LON: 'userLon',
        CURRENT_SESSION_ID: 'currentSessionId'
    };

    // ─── الحصول على Supabase ───
    async function getSupabase() {
        if (supabaseInstance) return supabaseInstance;
        
        try {
            if (window.teraSupabase) {
                supabaseInstance = window.teraSupabase;
                return supabaseInstance;
            }
            
            if (window.waitForSupabase) {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Supabase initialization timeout')), 10000)
                );
                supabaseInstance = await Promise.race([
                    window.waitForSupabase(),
                    timeoutPromise
                ]);
                return supabaseInstance;
            }
            
            throw new Error('❌ Supabase غير متوفر');
        } catch (e) {
            console.error('❌ فشل في الحصول على Supabase:', e);
            throw e;
        }
    }

    // ─── تنظيف التخزين المحلي ───
    function clearStorage() {
        Object.values(STORAGE_KEYS).forEach(key => {
            sessionStorage.removeItem(key);
        });
        ['supabase.auth.token', 'supabase.auth.refreshToken'].forEach(key => {
            localStorage.removeItem(key);
        });
        const keysToRemove = ['dismissedAlerts', 'notificationFilters', 'systemMessage'];
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        sessionStorage.removeItem('pending_player_id');
        sessionStorage.removeItem('onesignal_pending_user');
    }

    // ─── تخزين اسم العميل ───
    function storeUserName(user, email) {
        if (!user && !email) return null;
        const name = user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     email?.split('@')[0] || 
                     'مستخدم';
        sessionStorage.setItem(STORAGE_KEYS.OTP_NAME, name);
        if (email || user?.email) {
            sessionStorage.setItem(STORAGE_KEYS.USER_EMAIL, email || user?.email || '');
        }
        document.dispatchEvent(new CustomEvent('user:updated', { 
            detail: { name, email: email || user?.email || '' } 
        }));
        return name;
    }

    // ─── التحقق من صحة البريد الإلكتروني ───
    function validateEmail(email) {
        if (!email) return 'البريد الإلكتروني مطلوب';
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!re.test(email)) return 'صيغة البريد الإلكتروني غير صحيحة';
        return null;
    }

    // ─── التحقق من صحة كلمة المرور ───
    function validatePassword(password) {
        if (!password || password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
        if (!/[A-Z]/.test(password)) return 'يجب أن تحتوي كلمة المرور على حرف كبير (A-Z)';
        if (!/[a-z]/.test(password)) return 'يجب أن تحتوي كلمة المرور على حرف صغير (a-z)';
        if (!/[0-9]/.test(password)) return 'يجب أن تحتوي كلمة المرور على رقم (0-9)';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'يجب أن تحتوي كلمة المرور على رمز خاص';
        return null;
    }

    // ─── الحصول على المستخدم الحالي مع تخزين مؤقت ───
    async function getCurrentUser(forceRefresh = false) {
        if (!forceRefresh && currentUser && (Date.now() - currentUserCacheTime) < CACHE_DURATION) {
            return currentUser;
        }

        try {
            const sb = await getSupabase();
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) {
                currentUser = null;
                currentUserCacheTime = 0;
                return null;
            }
            currentUser = user;
            currentUserCacheTime = Date.now();
            storeUserName(user, user.email);
            return user;
        } catch (e) {
            console.warn('⚠️ فشل في جلب المستخدم:', e);
            currentUser = null;
            currentUserCacheTime = 0;
            return null;
        }
    }

    // ─── تجديد الجلسة تلقائياً ───
    async function refreshSession() {
        try {
            const sb = await getSupabase();
            const { data: { session }, error } = await sb.auth.refreshSession();
            if (error || !session) {
                console.warn('⚠️ فشل تجديد الجلسة:', error?.message);
                return false;
            }
            if (session.user) {
                currentUser = session.user;
                currentUserCacheTime = Date.now();
                storeUserName(session.user, session.user.email);
            }
            return true;
        } catch (e) {
            console.warn('⚠️ خطأ في تجديد الجلسة:', e);
            return false;
        }
    }

    // ─── بدء تجديد الجلسة تلقائياً ───
    function startSessionRefresh() {
        if (sessionRefreshInterval) clearInterval(sessionRefreshInterval);
        sessionRefreshInterval = setInterval(async () => {
            const refreshed = await refreshSession();
            if (!refreshed) {
                console.warn('⚠️ فشل تجديد الجلسة، قد تكون منتهية');
                if (window.SessionManager) {
                    try {
                        await window.SessionManager.handleSessionExpired?.();
                    } catch (e) { /* تجاهل */ }
                }
            }
        }, REFRESH_INTERVAL);
    }

    // ─── إيقاف تجديد الجلسة ───
    function stopSessionRefresh() {
        if (sessionRefreshInterval) {
            clearInterval(sessionRefreshInterval);
            sessionRefreshInterval = null;
        }
    }

    // ─── انتظار تهيئة OneSignalManager ───
    async function waitForOneSignalManager(timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (window.OneSignalManager && typeof window.OneSignalManager.setExternalId === 'function') {
                return window.OneSignalManager;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        return null;
    }

    // ─── الحصول على externalId الحالي من OneSignal ───
    function getCurrentExternalId() {
        try {
            if (window.OneSignal && window.OneSignal.User) {
                return window.OneSignal.User.externalId || null;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // ─── ربط OneSignal (محسّن للتعامل مع 409 Conflict) ───
    async function registerPushNotifications(userId) {
        // منع التنفيذ المتزامن
        if (isRegisteringPush) {
            console.log('⏳ OneSignal registration already in progress, waiting...');
            // انتظار حتى انتهاء العملية الحالية
            let retries = 10;
            while (isRegisteringPush && retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
                retries--;
            }
            if (isRegisteringPush) {
                console.warn('⚠️ OneSignal registration timeout, proceeding anyway');
            }
        }

        isRegisteringPush = true;
        try {
            // تجنب التكرار لنفس المستخدم
            if (lastPushRegisteredUserId === userId) {
                console.log('ℹ️ OneSignal already registered for user:', userId);
                return { success: true, message: 'تم الربط مسبقاً' };
            }

            let targetUserId = userId;
            if (!targetUserId) {
                const user = await getCurrentUser();
                if (!user) return { success: false, error: 'يجب تسجيل الدخول أولاً' };
                targetUserId = user.id;
            }

            // التحقق من externalId الحالي
            const currentExternalId = getCurrentExternalId();
            if (currentExternalId === targetUserId) {
                console.log('ℹ️ OneSignal already has externalId:', targetUserId);
                lastPushRegisteredUserId = targetUserId;
                return { success: true, message: 'الربط موجود مسبقاً' };
            }

            // محاولة استخدام OneSignalManager
            const manager = await waitForOneSignalManager(3000);
            if (manager && typeof manager.setExternalId === 'function') {
                try {
                    const result = await manager.setExternalId(targetUserId);
                    if (result) {
                        lastPushRegisteredUserId = targetUserId;
                        return { success: true, message: 'تم ربط الإشعارات الفورية بنجاح' };
                    }
                } catch (e) {
                    // إذا كان الخطأ 409، نتعامل معه بشكل خاص
                    if (e.message && e.message.includes('409')) {
                        console.warn('⚠️ OneSignal 409 Conflict, checking if already assigned to same user');
                        // نتحقق مرة أخرى من externalId بعد قليل
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const newExternalId = getCurrentExternalId();
                        if (newExternalId === targetUserId) {
                            lastPushRegisteredUserId = targetUserId;
                            return { success: true, message: 'الربط موجود بالفعل (بعد 409)' };
                        }
                        // إذا كان مختلفاً، نعيد المحاولة بعد تأخير
                        console.log('🔄 Retrying OneSignal login after 409...');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const retryResult = await manager.setExternalId(targetUserId);
                        if (retryResult) {
                            lastPushRegisteredUserId = targetUserId;
                            return { success: true, message: 'تم الربط بعد إعادة المحاولة' };
                        }
                    }
                    console.warn('⚠️ OneSignalManager.setExternalId error:', e);
                    // نستمر للخطة الاحتياطية
                }
            }

            // خطة احتياطية: استخدام OneSignal.login مباشرة
            if (typeof window.OneSignal === 'undefined' || !window.OneSignal.User) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                if (typeof window.OneSignal === 'undefined' || !window.OneSignal.User) {
                    return { success: false, error: 'OneSignal غير متوفر بعد' };
                }
            }

            // التحقق من externalId قبل login
            const externalIdBefore = getCurrentExternalId();
            if (externalIdBefore === targetUserId) {
                lastPushRegisteredUserId = targetUserId;
                return { success: true, message: 'الربط موجود بالفعل' };
            }

            try {
                await window.OneSignal.login(targetUserId);
                console.log('✅ OneSignal user logged in (login):', targetUserId);
                lastPushRegisteredUserId = targetUserId;
                return { success: true, message: 'تم ربط الإشعارات الفورية بنجاح' };
            } catch (loginError) {
                // معالجة 409 من login أيضاً
                if (loginError.message && loginError.message.includes('409')) {
                    console.warn('⚠️ OneSignal login 409 Conflict, checking externalId again');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const externalIdAfter = getCurrentExternalId();
                    if (externalIdAfter === targetUserId) {
                        lastPushRegisteredUserId = targetUserId;
                        return { success: true, message: 'الربط موجود بالفعل (بعد login 409)' };
                    }
                }
                throw loginError;
            }

        } catch (e) {
            console.error('❌ فشل ربط OneSignal:', e);
            lastPushRegisteredUserId = null;
            return { success: false, error: e.message || 'خطأ في الربط' };
        } finally {
            isRegisteringPush = false;
        }
    }

    // ─── إلغاء ربط OneSignal ───
    async function unregisterPushNotifications() {
        try {
            const manager = await waitForOneSignalManager(2000);
            if (manager && typeof manager.logout === 'function') {
                const result = await manager.logout();
                if (result) {
                    lastPushRegisteredUserId = null;
                    return { success: true, message: 'تم إلغاء ربط الإشعارات الفورية' };
                }
            }

            if (typeof window.OneSignal === 'undefined' || !window.OneSignal.User) {
                return { success: false, error: 'OneSignal غير متوفر' };
            }

            await window.OneSignal.logout();
            console.log('✅ OneSignal user logged out');
            lastPushRegisteredUserId = null;
            return { success: true };
        } catch (e) {
            console.error('❌ فشل إلغاء ربط OneSignal:', e);
            lastPushRegisteredUserId = null;
            return { success: false, error: e.message };
        }
    }

    // ─── تسجيل الدخول الأساسي ───
    async function login(email, password) {
        const sb = await getSupabase();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) {
            storeUserName(data.user, email);
            currentUser = data.user;
            currentUserCacheTime = Date.now();
            startSessionRefresh();
            registerPushNotifications(data.user.id).catch(e => console.warn('⚠️ OneSignal login:', e));
        }
        return data;
    }

    // ─── تسجيل الخروج الآمن ───
    async function logout() {
        stopSessionRefresh();
        await unregisterPushNotifications();

        if (window.SessionManager) {
            try {
                const info = window.SessionManager.getCurrentSessionInfo?.();
                if (info?.userId && info?.sessionId) {
                    await window.SessionManager.terminateSession(info.sessionId, info.userId);
                }
            } catch (e) { /* تجاهل */ }
            try { window.SessionManager.stopSessionGuard?.(); } catch (e) { /* تجاهل */ }
        }

        if (window.ActivityTracker) {
            try { window.ActivityTracker.stopIdleTimer?.(); } catch (e) { /* تجاهل */ }
        }

        const sb = await getSupabase();
        if (sb) {
            try { await sb.auth.signOut(); } catch (e) { /* تجاهل */ }
        }

        clearStorage();
        currentUser = null;
        currentUserCacheTime = 0;

        document.dispatchEvent(new CustomEvent('user:loggedOut'));
        window.location.replace('/auth/auth/login/login.html');
    }

    // ─── الحصول على الجلسة الحالية ───
    async function getSession() {
        const sb = await getSupabase();
        if (!sb) return null;
        const { data: { session } } = await sb.auth.getSession();
        return session;
    }

    // ─── التحقق من صحة الجلسة ───
    async function isSessionValid() {
        try {
            const sb = await getSupabase();
            if (!sb) return false;
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) return false;
            currentUser = user;
            currentUserCacheTime = Date.now();
            storeUserName(user, user.email);
            return true;
        } catch (e) {
            return false;
        }
    }

    // ─── OTP ───
    async function sendOTP(email) {
        const emailError = validateEmail(email);
        if (emailError) throw new Error(emailError);
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.signInWithOtp({ email });
        if (error) throw error;
        return data;
    }

    async function verifyOTP(email, token) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
        if (data?.session?.user) {
            storeUserName(data.session.user, email);
            currentUser = data.session.user;
            currentUserCacheTime = Date.now();
            startSessionRefresh();
            registerPushNotifications(data.session.user.id).catch(e => console.warn('⚠️ OneSignal OTP:', e));
        }
        return data;
    }

    // ─── دوال TOTP ───
    const TOTP_FUNCTION_URL = window._env?.TOTP_FUNCTION_URL || 
        'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/two-factor';

    async function callTOTPFunction(endpoint, body = {}, session = null) {
        const sb = await getSupabase();
        let currentSession = session;
        if (!currentSession) {
            const { data } = await sb.auth.getSession();
            currentSession = data.session;
        }
        if (!currentSession) throw new Error('NO_SESSION');

        const makeRequest = async (sess, retryCount = 0) => {
            const res = await fetch(`${TOTP_FUNCTION_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sess.access_token}`
                },
                body: JSON.stringify(body)
            });
            
            if (res.status === 401) {
                if (retryCount > 1) throw new Error('SESSION_EXPIRED');
                const { data: { session: newSession }, error: refreshError } = await sb.auth.refreshSession();
                if (!refreshError && newSession) {
                    return makeRequest(newSession, retryCount + 1);
                }
                throw new Error('SESSION_EXPIRED');
            }
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'فشل الطلب');
            }
            return res.json();
        };
        return makeRequest(currentSession);
    }

    async function setupTwoFactor() { return await callTOTPFunction('setup', {}); }
    async function enableTwoFactor(code) { return await callTOTPFunction('enable', { code }); }
    async function getTwoFactorStatus() { return await callTOTPFunction('status'); }
    async function verifyTwoFactor(code, isBackup = false) { return await callTOTPFunction('verify', { code, is_backup: isBackup }); }
    async function disableTwoFactor(code) { return await callTOTPFunction('disable', { code }); }
    async function regenerateBackupCodes(code) { return await callTOTPFunction('regenerate-backup-codes', { code }); }

    // ─── تسجيل الدخول الذكي ───
    const MAX_ATTEMPTS = 5;
    function getLoginAttempts() { return parseInt(sessionStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS) || '0'); }
    function incrementLoginAttempts() { sessionStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, getLoginAttempts() + 1); }
    function resetLoginAttempts() { sessionStorage.removeItem(STORAGE_KEYS.LOGIN_ATTEMPTS); }

    async function loginWithPassword(email, password) {
        const sb = await getSupabase();
        if (getLoginAttempts() >= MAX_ATTEMPTS) {
            throw new Error('تم تجاوز عدد المحاولات المسموح بها. يرجى استخدام المصادقة الثنائية.');
        }
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) { 
                incrementLoginAttempts(); 
                throw error; 
            }
            const user = data.user;
            let isTOTPEnabled = false;
            try {
                const status = await callTOTPFunction('status', {}, data.session);
                isTOTPEnabled = status?.is_enabled || false;
            } catch (e) { console.warn('تعذر التحقق من TOTP:', e); }

            if (isTOTPEnabled) {
                storeUserName(user, email);
                currentUser = user;
                currentUserCacheTime = Date.now();
                return { requiresTwoFactor: true, email };
            }
            resetLoginAttempts();
            storeUserName(user, email);
            currentUser = user;
            currentUserCacheTime = Date.now();
            startSessionRefresh();
            registerPushNotifications(user.id).catch(e => console.warn('⚠️ OneSignal loginWithPassword:', e));
            return { success: true, user };
        } catch (e) {
            if (getLoginAttempts() >= MAX_ATTEMPTS) throw new Error('تم تجاوز عدد المحاولات. يرجى استخدام المصادقة الثنائية.');
            throw e;
        }
    }

    async function completeLoginWithTOTP(code) {
        const sb = await getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) throw new Error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');
        await callTOTPFunction('verify', { code }, session);
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error('فشل في استرداد المستخدم بعد التحقق.');
        resetLoginAttempts();
        storeUserName(user, user.email);
        currentUser = user;
        currentUserCacheTime = Date.now();
        startSessionRefresh();
        registerPushNotifications(user.id).catch(e => console.warn('⚠️ OneSignal completeLoginWithTOTP:', e));
        return { success: true, user };
    }

    async function loginWithTOTP(email, token) {
        const res = await fetch(`${TOTP_FUNCTION_URL}/verify-totp-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'فشل التحقق من رمز TOTP');
        }
        const { session } = await res.json();
        if (!session) throw new Error('فشل إنشاء الجلسة');
        const sb = await getSupabase();
        await sb.auth.setSession(session);
        resetLoginAttempts();
        if (session.user) {
            storeUserName(session.user, email);
            currentUser = session.user;
            currentUserCacheTime = Date.now();
            startSessionRefresh();
            registerPushNotifications(session.user.id).catch(e => console.warn('⚠️ OneSignal loginWithTOTP:', e));
        }
        return { success: true };
    }

    async function cancelTOTPLogin() {
        const sb = await getSupabase();
        try { await sb.auth.signOut(); } catch (e) { console.warn('فشل تسجيل الخروج أثناء إلغاء TOTP:', e); }
        stopSessionRefresh();
        currentUser = null;
        currentUserCacheTime = 0;
    }

    // ─── إعادة تعيين كلمة المرور ───
    async function resetPassword(email) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { error } = await sb.auth.resetPasswordForEmail(email);
        if (error) throw error;
        return { success: true, message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' };
    }

    async function updatePassword(newPassword) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const passwordError = validatePassword(newPassword);
        if (passwordError) throw new Error(passwordError);
        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return { success: true };
    }

    async function changePassword(oldPassword, newPassword) {
        const user = await getCurrentUser();
        if (!user) throw new Error('يجب تسجيل الدخول أولاً');
        const passwordError = validatePassword(newPassword);
        if (passwordError) throw new Error(passwordError);
        const sb = await getSupabase();
        try {
            const { error: signError } = await sb.auth.signInWithPassword({
                email: user.email,
                password: oldPassword
            });
            if (signError) throw new Error('كلمة المرور الحالية غير صحيحة');
            const { error } = await sb.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
        } catch (e) {
            throw new Error(e.message || 'فشل تغيير كلمة المرور');
        }
    }

    async function updateUserMetadata(metadata) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.updateUser({ data: metadata });
        if (error) throw error;
        if (data?.user) {
            currentUser = data.user;
            currentUserCacheTime = Date.now();
            storeUserName(data.user, data.user.email);
        }
        return data;
    }

    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') {
        try {
            let user = await getCurrentUser();
            if (user) {
                startSessionRefresh();
                return user;
            }
            const refreshed = await refreshSession();
            if (refreshed) {
                user = await getCurrentUser(true);
                if (user) {
                    startSessionRefresh();
                    return user;
                }
            }
            window.location.replace(redirectUrl);
            return null;
        } catch (e) {
            console.error('❌ فشل في التحقق من المصادقة:', e);
            window.location.replace(redirectUrl);
            return null;
        }
    }

    function onAuthStateChange(callback) {
        getSupabase().then(sb => {
            if (!sb) return;
            sb.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    storeUserName(session.user, session.user.email);
                    currentUser = session.user;
                    currentUserCacheTime = Date.now();
                    startSessionRefresh();
                    registerPushNotifications(session.user.id).catch(e => {
                        console.warn('⚠️ OneSignal onAuthStateChange:', e);
                    });
                }
                if (event === 'SIGNED_OUT') {
                    stopSessionRefresh();
                    currentUser = null;
                    currentUserCacheTime = 0;
                    clearStorage();
                    unregisterPushNotifications().catch(e => {
                        console.warn('⚠️ OneSignal unregister onAuthStateChange:', e);
                    });
                }
                callback(event, session);
            });
        }).catch(console.warn);
    }

    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            const lat = sessionStorage.getItem(STORAGE_KEYS.USER_LAT);
            const lon = sessionStorage.getItem(STORAGE_KEYS.USER_LON);
            if (lat && lon) {
                resolve({ latitude: parseFloat(lat), longitude: parseFloat(lon), fromCache: true });
                return;
            }
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    sessionStorage.setItem(STORAGE_KEYS.USER_LAT, latitude.toString());
                    sessionStorage.setItem(STORAGE_KEYS.USER_LON, longitude.toString());
                    resolve({ latitude, longitude, fromCache: false });
                },
                (error) => reject(error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    }

    // ─── API العامة ───
    window.Auth = {
        login,
        logout,
        getSession,
        getUser: getCurrentUser,
        getCurrentUser,
        isSessionValid,
        requireAuth,
        onAuthStateChange,
        sendOTP,
        verifyOTP,
        setupTwoFactor,
        enableTwoFactor,
        getTwoFactorStatus,
        verifyTwoFactor,
        disableTwoFactor,
        regenerateBackupCodes,
        loginWithPassword,
        completeLoginWithTOTP,
        loginWithTOTP,
        cancelTOTPLogin,
        resetPassword,
        updatePassword,
        changePassword,
        updateUserMetadata,
        validateEmail,
        validatePassword,
        getCurrentPosition,
        refreshSession,
        startSessionRefresh,
        stopSessionRefresh,
        registerPushNotifications,
        unregisterPushNotifications
    };

    console.log('✅ auth.js v32 جاهز (مع دعم 409 Conflict لـ OneSignal)');
})();
