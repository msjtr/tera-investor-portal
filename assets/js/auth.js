/**
 * auth.js – v29 (متوافق مع OneSignal، إدارة جلسات متقدمة، دعم كامل لـ TOTP)
 * 
 * الميزات:
 * - تخزين اسم العميل تلقائياً (otpName) في sessionStorage
 * - دعم تسجيل الدخول بكلمة المرور والمصادقة الثنائية (TOTP)
 * - إدارة الجلسات مع تجديد التوكن تلقائياً
 * - دوال مساعدة للتحقق من صحة البريد الإلكتروني وكلمة المرور
 * - تكامل مع SessionManager و ActivityTracker
 * - دعم تسجيل الخروج الآمن مع تنظيف شامل
 */

(function() {
    'use strict';

    // ─── متغيرات خاصة ───
    let supabaseInstance = null;
    let currentUser = null;
    let sessionRefreshInterval = null;
    const REFRESH_INTERVAL = 4 * 60 * 1000; // 4 دقائق

    // ─── الحصول على Supabase ───
    async function getSupabase() {
        if (supabaseInstance) return supabaseInstance;
        supabaseInstance = window.teraSupabase || await window.waitForSupabase?.();
        if (!supabaseInstance) throw new Error('❌ Supabase غير متوفر');
        return supabaseInstance;
    }

    // ─── تخزين اسم العميل ───
    function storeUserName(user, email) {
        if (!user && !email) return null;
        const name = user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     email?.split('@')[0] || 
                     'مستخدم';
        sessionStorage.setItem('otpName', name);
        sessionStorage.setItem('userEmail', email || user?.email || '');
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

    // ─── الحصول على المستخدم الحالي مع تخزين الاسم ───
    async function getCurrentUser() {
        try {
            const sb = await getSupabase();
            const { data: { user }, error } = await sb.auth.getUser();
            if (error || !user) return null;
            currentUser = user;
            storeUserName(user, user.email);
            return user;
        } catch (e) {
            console.warn('⚠️ فشل في جلب المستخدم:', e);
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
                // إذا فشل التجديد، قد تكون الجلسة منتهية
                console.warn('⚠️ فشل تجديد الجلسة، قد تكون منتهية');
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

    // ─── تسجيل الدخول الأساسي ───
    async function login(email, password) {
        const sb = await getSupabase();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) {
            storeUserName(data.user, email);
            currentUser = data.user;
            startSessionRefresh();
        }
        return data;
    }

    // ─── تسجيل الخروج الآمن ───
    async function logout() {
        // إيقاف المؤقتات
        stopSessionRefresh();

        // إنهاء الجلسة عبر SessionManager إذا كان متاحاً
        if (window.SessionManager) {
            try {
                const info = window.SessionManager.getCurrentSessionInfo?.();
                if (info?.userId && info?.sessionId) {
                    await window.SessionManager.terminateSession(info.sessionId, info.userId);
                }
            } catch (e) { /* تجاهل */ }
            try { window.SessionManager.stopSessionGuard?.(); } catch (e) { /* تجاهل */ }
        }

        // إيقاف تتبع النشاط
        if (window.ActivityTracker) {
            try { window.ActivityTracker.stopIdleTimer?.(); } catch (e) { /* تجاهل */ }
        }

        // تسجيل الخروج من Supabase
        const sb = await getSupabase();
        if (sb) {
            try { await sb.auth.signOut(); } catch (e) { /* تجاهل */ }
        }

        // تنظيف التخزين المحلي
        localStorage.clear();
        sessionStorage.clear();
        currentUser = null;

        // إعادة التوجيه إلى صفحة تسجيل الدخول
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
            storeUserName(user, user.email);
            return true;
        } catch (e) {
            return false;
        }
    }

    // ─── طلب التحقق من البريد الإلكتروني (OTP) ───
    async function sendOTP(email) {
        const emailError = validateEmail(email);
        if (emailError) throw new Error(emailError);
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.signInWithOtp({ email });
        if (error) throw error;
        return data;
    }

    // ─── التحقق من رمز OTP ───
    async function verifyOTP(email, token) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
        if (data?.session?.user) {
            storeUserName(data.session.user, email);
            currentUser = data.session.user;
            startSessionRefresh();
        }
        return data;
    }

    // ─── دوال TOTP (المصادقة الثنائية) ───
    const TOTP_FUNCTION_URL = 'https://ucmzavrsgkfpypgewpbd.supabase.co/functions/v1/two-factor';

    async function callTOTPFunction(endpoint, body = {}, session = null) {
        const sb = await getSupabase();
        let currentSession = session;
        if (!currentSession) {
            const { data } = await sb.auth.getSession();
            currentSession = data.session;
        }
        if (!currentSession) throw new Error('NO_SESSION');

        const makeRequest = async (sess) => {
            const res = await fetch(`${TOTP_FUNCTION_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sess.access_token}`
                },
                body: JSON.stringify(body)
            });
            if (res.status === 401) {
                const { data: { session: newSession }, error: refreshError } = await sb.auth.refreshSession();
                if (!refreshError && newSession) return makeRequest(newSession);
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
    function getLoginAttempts() { return parseInt(sessionStorage.getItem('loginAttempts') || '0'); }
    function incrementLoginAttempts() { sessionStorage.setItem('loginAttempts', getLoginAttempts() + 1); }
    function resetLoginAttempts() { sessionStorage.setItem('loginAttempts', '0'); }

    async function loginWithPassword(email, password) {
        const sb = await getSupabase();
        if (getLoginAttempts() >= MAX_ATTEMPTS) {
            throw new Error('تم تجاوز عدد المحاولات المسموح بها. يرجى استخدام المصادقة الثنائية.');
        }
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) { incrementLoginAttempts(); throw error; }
            const user = data.user;
            let isTOTPEnabled = false;
            try {
                const status = await callTOTPFunction('status', {}, data.session);
                isTOTPEnabled = status?.is_enabled || false;
            } catch (e) { console.warn('تعذر التحقق من TOTP:', e); }

            if (isTOTPEnabled) {
                storeUserName(user, email);
                currentUser = user;
                return { requiresTwoFactor: true, email };
            }
            resetLoginAttempts();
            storeUserName(user, email);
            currentUser = user;
            startSessionRefresh();
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
        startSessionRefresh();
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
            startSessionRefresh();
        }
        return { success: true };
    }

    async function cancelTOTPLogin() {
        const sb = await getSupabase();
        try { await sb.auth.signOut(); } catch (e) { console.warn('فشل تسجيل الخروج أثناء إلغاء TOTP:', e); }
        stopSessionRefresh();
        currentUser = null;
    }

    // ─── إعادة تعيين كلمة المرور ───
    async function resetPassword(email) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { error } = await sb.auth.resetPasswordForEmail(email);
        if (error) throw error;
    }

    async function updatePassword(newPassword) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const passwordError = validatePassword(newPassword);
        if (passwordError) throw new Error(passwordError);
        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) throw error;
    }

    // ─── تحديث بيانات المستخدم ───
    async function updateUserMetadata(metadata) {
        const sb = await getSupabase();
        if (!sb) throw new Error('خدمة المصادقة غير متاحة');
        const { data, error } = await sb.auth.updateUser({ data: metadata });
        if (error) throw error;
        if (data?.user) {
            currentUser = data.user;
            storeUserName(data.user, data.user.email);
        }
        return data;
    }

    // ─── طلب المصادقة الإلزامية ───
    async function requireAuth(redirectUrl = '/auth/auth/login/login.html') {
        try {
            const user = await getCurrentUser();
            if (user) {
                startSessionRefresh();
                return user;
            }
            // محاولة تجديد الجلسة
            const refreshed = await refreshSession();
            if (refreshed) {
                const userAgain = await getCurrentUser();
                if (userAgain) {
                    startSessionRefresh();
                    return userAgain;
                }
            }
            // إذا فشل كل شيء، إعادة التوجيه
            window.location.replace(redirectUrl);
            return null;
        } catch (e) {
            console.error('❌ فشل في التحقق من المصادقة:', e);
            window.location.replace(redirectUrl);
            return null;
        }
    }

    // ─── مراقبة تغييرات حالة المصادقة ───
    function onAuthStateChange(callback) {
        getSupabase().then(sb => {
            if (!sb) return;
            sb.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    storeUserName(session.user, session.user.email);
                    currentUser = session.user;
                    startSessionRefresh();
                }
                if (event === 'SIGNED_OUT') {
                    stopSessionRefresh();
                    currentUser = null;
                }
                callback(event, session);
            });
        }).catch(console.warn);
    }

    // ─── الحصول على موقع المستخدم ───
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => reject(error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    }

    // ─── API العامة ───
    window.Auth = {
        // الأساسيات
        login,
        logout,
        getSession,
        getUser: getCurrentUser,
        getCurrentUser,
        isSessionValid,
        requireAuth,
        onAuthStateChange,

        // OTP
        sendOTP,
        verifyOTP,

        // TOTP
        setupTwoFactor,
        enableTwoFactor,
        getTwoFactorStatus,
        verifyTwoFactor,
        disableTwoFactor,
        regenerateBackupCodes,

        // تسجيل الدخول الذكي
        loginWithPassword,
        completeLoginWithTOTP,
        loginWithTOTP,
        cancelTOTPLogin,

        // كلمة المرور
        resetPassword,
        updatePassword,

        // بيانات المستخدم
        updateUserMetadata,

        // التحقق
        validateEmail,
        validatePassword,

        // الموقع
        getCurrentPosition,

        // الجلسة
        refreshSession,
        startSessionRefresh,
        stopSessionRefresh
    };

    console.log('✅ auth.js v29 جاهز (دعم كامل للجلسات و TOTP و OneSignal)');
})();
