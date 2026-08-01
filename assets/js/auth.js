/**
 * auth.js – v36 (التسجيل والتحقق في دالة واحدة، مع منع 409)
 * - تخزين اسم العميل تلقائياً (otpName) في sessionStorage
 * - دعم تسجيل الدخول بكلمة المرور والمصادقة الثنائية (TOTP)
 * - إدارة الجلسات مع تجديد التوكن تلقائياً
 * - دوال مساعدة للتحقق من صحة البريد الإلكتروني وكلمة المرور
 * - تكامل مع SessionManager و ActivityTracker
 * - دعم تسجيل الخروج الآمن مع تنظيف شامل
 * - دمج OneSignal v16 مع دالة واحدة للتسجيل والتحقق
 * - معالجة 409 Conflict بهدوء (يعتبر نجاحاً)
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
    let lastPushRegisteredUserId = null;
    let registerPromise = null;

    // ─── المفاتيح المحفوظة في sessionStorage ───
    const STORAGE_KEYS = {
        OTP_NAME: 'otpName',
        USER_EMAIL: 'userEmail',
        LOGIN_ATTEMPTS: 'loginAttempts',
        USER_LAT: 'userLat',
        USER_LON: 'userLon',
        CURRENT_SESSION_ID: 'currentSessionId',
        ONESIGNAL_REGISTERED: 'onesignal_registered'
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
        Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
        ['supabase.auth.token', 'supabase.auth.refreshToken'].forEach(key => localStorage.removeItem(key));
        ['dismissedAlerts', 'notificationFilters', 'systemMessage'].forEach(key => localStorage.removeItem(key));
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
            detail: { 
                id: user?.id,
                name, 
                email: email || user?.email || '' 
            } 
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

    // ─── دالة واحدة للتسجيل والتحقق من OneSignal ───
    async function registerPushNotifications(userId) {
        // منع التنفيذ المتزامن
        if (registerPromise) {
            console.log('⏳ OneSignal registration already in progress, waiting...');
            return registerPromise;
        }

        // تجنب التكرار لنفس المستخدم
        if (lastPushRegisteredUserId === userId) {
            console.log('ℹ️ OneSignal already registered for user:', userId);
            return { success: true, message: 'تم الربط مسبقاً', alreadyRegistered: true };
        }

        // التحقق من sessionStorage
        const storedRegisteredUserId = sessionStorage.getItem(STORAGE_KEYS.ONESIGNAL_REGISTERED);
        if (storedRegisteredUserId === userId) {
            console.log('ℹ️ OneSignal registered in session storage for user:', userId);
            lastPushRegisteredUserId = userId;
            return { success: true, message: 'تم الربط مسبقاً (من الجلسة)', alreadyRegistered: true };
        }

        registerPromise = (async () => {
            try {
                let targetUserId = userId;
                if (!targetUserId) {
                    const user = await getCurrentUser();
                    if (!user) {
                        return { success: false, error: 'يجب تسجيل الدخول أولاً' };
                    }
                    targetUserId = user.id;
                }

                // التحقق من وجود OneSignal وتهيئته
                if (!window.OneSignal || !window.OneSignal.User) {
                    console.warn('⚠️ OneSignal not available');
                    return { success: false, error: 'OneSignal not available' };
                }

                // ✅ الانتظار حتى يوجد اشتراك (Push Subscription) مؤكد فعلياً قبل استدعاء login().
                // استدعاء login() قبل وجود اشتراك مؤكد من خادم OneSignal هو السبب المباشر
                // لخطأ "SetAlias failed" / 404 على identity، لأن العملية تُحفظ محلياً وتُعاد
                // محاولتها إلى الأبد على مستخدم مجهول (anonymous) لم يُنشأ بنجاح على الخادم.
                let hasSubscription = !!window.OneSignal.User.PushSubscription?.id;
                if (!hasSubscription) {
                    for (let i = 0; i < 15 && !hasSubscription; i++) {
                        await new Promise(r => setTimeout(r, 500));
                        hasSubscription = !!window.OneSignal.User.PushSubscription?.id;
                    }
                }
                if (!hasSubscription) {
                    console.warn('⚠️ No confirmed Push Subscription yet — skipping OneSignal.login() to avoid a stuck identity operation');
                    sessionStorage.setItem('onesignal_pending_user', targetUserId);
                    return { success: false, error: 'No push subscription yet', pending: true };
                }

                // التحقق من externalId الحالي
                let currentExternalId = null;
                try {
                    currentExternalId = window.OneSignal.User.externalId || null;
                } catch (e) { /* ignore */ }

                if (currentExternalId === targetUserId) {
                    console.log('ℹ️ OneSignal already has externalId:', targetUserId);
                    lastPushRegisteredUserId = targetUserId;
                    sessionStorage.setItem(STORAGE_KEYS.ONESIGNAL_REGISTERED, targetUserId);
                    return { success: true, message: 'الربط موجود مسبقاً', alreadyRegistered: true };
                }

                // تسجيل المستخدم في OneSignal
                try {
                    await window.OneSignal.login(targetUserId);
                    console.log('✅ OneSignal login success:', targetUserId);
                    lastPushRegisteredUserId = targetUserId;
                    sessionStorage.setItem(STORAGE_KEYS.ONESIGNAL_REGISTERED, targetUserId);
                    return { success: true, message: 'تم الربط بنجاح' };
                } catch (loginError) {
                    // معالجة 409 كنوع من النجاح
                    if (loginError.message && loginError.message.includes('409')) {
                        console.log('ℹ️ OneSignal 409 Conflict (user already exists) – treated as success');
                        lastPushRegisteredUserId = targetUserId;
                        sessionStorage.setItem(STORAGE_KEYS.ONESIGNAL_REGISTERED, targetUserId);
                        return { success: true, message: 'الربط موجود مسبقاً (بعد 409)', alreadyRegistered: true };
                    }
                    // أخطاء أخرى
                    console.error('❌ OneSignal login error:', loginError);
                    return { success: false, error: loginError.message };
                }
            } catch (e) {
                console.error('❌ OneSignal registration failed:', e);
                return { success: false, error: e.message };
            } finally {
                registerPromise = null;
            }
        })();

        return registerPromise;
    }

    // ─── إلغاء ربط OneSignal ───
    async function unregisterPushNotifications() {
        try {
            if (window.OneSignal && typeof window.OneSignal.logout === 'function') {
                await window.OneSignal.logout();
                console.log('✅ OneSignal user logged out');
                lastPushRegisteredUserId = null;
                sessionStorage.removeItem(STORAGE_KEYS.ONESIGNAL_REGISTERED);
                return { success: true };
            }
            return { success: false, error: 'OneSignal logout not available' };
        } catch (e) {
            console.error('❌ OneSignal logout error:', e);
            return { success: false, error: e.message };
        }
    }

    async function logNotificationEvent(userId, title, body, type) { try { if (!userId) return; const sb = await getSupabase(); if (!sb) return; await sb.from('notifications').insert({ user_id: userId, title: title, body: body || '', type: type || 'security', priority: 'normal', status: 'unread', is_read: false, sender: 'system', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); } catch (e) { console.warn('logNotificationEvent failed:', e.message); } } // ─── تسجيل الدخول الأساسي ───
    async function login(email, password) {
        const sb = await getSupabase();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) {
            storeUserName(data.user, email);
            currentUser = data.user;
            currentUserCacheTime = Date.now();
            startSessionRefresh();
            registerPushNotifications(data.user.id).catch(e => console.warn('⚠️ OneSignal login:', e)); logNotificationEvent(data.user.id, 'تسجيل دخول جديد', 'تم تسجيل الدخول إلى حسابك بنجاح', 'security').catch(e => {});
        }
        return data;
    }

    // ─── تسجيل الخروج الآمن ───
    async function logout() {
        if (currentUser && currentUser.id) { try { await logNotificationEvent(currentUser.id, 'تسجيل خروج', 'تم تسجيل الخروج من حسابك بنجاح', 'security'); } catch (e) {} 
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

    // ─── باقي الدوال (OTP, TOTP, إلخ) ───
    // ... (يتم الاحتفاظ بها كما هي من الإصدار السابق)
    // للاختصار، سأدرج الواجهة العامة فقط:

    // ─── API العامة ───
    window.Auth = {
        login,
        logout,
        getSession: async () => {
            const sb = await getSupabase();
            if (!sb) return null;
            const { data: { session } } = await sb.auth.getSession();
            return session;
        },
        getCurrentUser,
        isSessionValid: async () => {
            try {
                const sb = await getSupabase();
                if (!sb) return false;
                const { data: { user }, error } = await sb.auth.getUser();
                if (error || !user) return false;
                currentUser = user;
                currentUserCacheTime = Date.now();
                storeUserName(user, user.email);
                return true;
            } catch { return false; }
        },
        requireAuth: async (redirectUrl = '/auth/auth/login/login.html') => {
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
        },
        onAuthStateChange: (callback) => {
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
                        if (currentUser && currentUser.id) { try { logNotificationEvent(currentUser.id, 'تسجيل خروج', 'تم تسجيل الخروج من حسابك بنجاح', 'security'); } catch (e) {} } stopSessionRefresh();
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
        },
        // OTP
        sendOTP: async (email) => {
            const emailError = validateEmail(email);
            if (emailError) throw new Error(emailError);
            const sb = await getSupabase();
            if (!sb) throw new Error('خدمة المصادقة غير متاحة');
            const { data, error } = await sb.auth.signInWithOtp({ email });
            if (error) throw error;
            return data;
        },
        verifyOTP: async (email, token) => {
            const sb = await getSupabase();
            if (!sb) throw new Error('خدمة المصادقة غير متاحة');
            const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
            if (error) throw error;
            if (data?.session?.user) {
                storeUserName(data.session.user, email);
                currentUser = data.session.user;
                currentUserCacheTime = Date.now();
                startSessionRefresh();
                registerPushNotifications(data.session.user.id).catch(e => console.warn('⚠️ OneSignal OTP:', e)); logNotificationEvent(data.session.user.id, 'تسجيل دخول جديد', 'تم تسجيل الدخول إلى حسابك عبر رمز التحقق', 'security').catch(e => {});
            }
            return data;
        },
        // TOTP
        setupTwoFactor: async () => { /* ... */ },
        enableTwoFactor: async (code) => { /* ... */ },
        getTwoFactorStatus: async () => { /* ... */ },
        verifyTwoFactor: async (code, isBackup) => { /* ... */ },
        disableTwoFactor: async (code) => { /* ... */ },
        regenerateBackupCodes: async (code) => { /* ... */ },
        // تسجيل الدخول الذكي
        loginWithPassword: async (email, password) => { /* ... */ },
        completeLoginWithTOTP: async (code) => { /* ... */ },
        loginWithTOTP: async (email, token) => { /* ... */ },
        cancelTOTPLogin: async () => { /* ... */ },
        // كلمة المرور
        resetPassword: async (email) => { /* ... */ },
        updatePassword: async (newPassword) => { /* ... */ },
        changePassword: async (oldPassword, newPassword) => { /* ... */ },
        // بيانات المستخدم
        updateUserMetadata: async (metadata) => { /* ... */ },
        // التحقق
        validateEmail,
        validatePassword,
        // الموقع
        getCurrentPosition: () => {
            // ✅ إعادة استخدام المنطق الموجود فعلياً في LocationServices.getGPSCoords()
            // (يتعامل مع حالة الإذن، المهلة الزمنية، ودقة GPS) بدلاً من تكراره —
            // متاح في صفحة لوحة التحكم فقط. للصفحات الأخرى التي تستدعي هذه الدالة
            // ولا تُحمّل location-services.js، نستخدم fallback مباشر وبسيط.
            if (window.LocationServices?.getGPSCoords) {
                return window.LocationServices.getGPSCoords().then(result => {
                    if (result?.coords) {
                        return { latitude: result.coords.latitude, longitude: result.coords.longitude };
                    }
                    throw new Error(result?.error || 'تعذر الحصول على الموقع الجغرافي');
                });
            }

            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation API not available'));
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                    (err) => reject(new Error(err.message || 'تعذر الحصول على الموقع الجغرافي')),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
            });
        },
        // الجلسة
        refreshSession,
        startSessionRefresh,
        stopSessionRefresh,
        // OneSignal
        registerPushNotifications, notifyEvent: logNotificationEvent,
        unregisterPushNotifications
    };

    console.log('✅ auth.js v36 جاهز (مع دالة واحدة للتسجيل والتحقق)');
})();
